import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { getUserProfile, createUserProfile, recordSession, setDemoMode, registerFCMToken } from './services/db';
import { useToast } from './components/Toast';
import { notificationService } from './services/notificationService';
import { engagementService } from './services/engagementService';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging as getMessagingInstance } from './firebase';
import { UAParser } from 'ua-parser-js';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAuthReady: boolean;
  isDemoMode: boolean;
  networkError: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  setRole: (role: string) => Promise<void>;
  updateShortcuts: (shortcuts: string[]) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const { toast } = useToast();

  const enterDemoMode = () => {
    setLoading(false); // Ensure we stop loading when entering demo mode
    setIsAuthReady(true);
    if (user && !isDemoMode) {
      // If already logged in, just mark as offline but keep identity
      setIsDemoMode(true);
      setDemoMode(true);
      toast('Connection lost. Running in Offline Mode. Your data is saved locally.', 'warning');
      return;
    }

    setIsDemoMode(true);
    setDemoMode(true);
    const mockUser = {
      uid: 'demo-user-123',
      email: 'demo@qrforge.com',
      displayName: 'Demo User',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    } as any;
    setUser(mockUser);
    setProfile({
      uid: mockUser.uid,
      email: mockUser.email,
      displayName: mockUser.displayName,
      photoURL: mockUser.photoURL,
      role: 'free',
      subscription: { status: 'active', planId: 'free' }
    });
    toast('Running in Offline Demo Mode. Basic features are available locally.', 'info');
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
    }
  };

  const setupMessaging = async (uid: string) => {
    try {
      if (typeof window === 'undefined') return;
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });
        
        if (token) {
          await registerFCMToken(uid, token);
        }
      }

      onMessage(messaging, (payload) => {
        toast(payload.notification?.title || 'New Notification', 'info');
      });
    } catch (error) {
      console.error("FCM Setup Error:", error);
    }
  };

  useEffect(() => {
    if (user && profile && !isDemoMode) {
      setupMessaging(user.uid);
    }
  }, [user, profile, isDemoMode]);

  useEffect(() => {
    const handleConnectionError = (e: any) => {
      const msg = e.detail?.message || 'Network connection failed';
      setNetworkError(msg);
      
      // On mobile/slow networks, connection might fail initially.
      // We wait longer before falling back to demo mode to give it a chance.
      setTimeout(() => {
        if (!isDemoMode && !auth.currentUser && !localStorage.getItem('qrforge_demo_mode')) {
          // Check if we are actually offline
          if (!navigator.onLine) {
            console.warn('Network offline. Entering demo mode fallback.');
            enterDemoMode();
          } else {
            console.warn('Firestore connection failed but network is online. Retrying...');
          }
        }
      }, 10000);
    };
    window.addEventListener('firestore-connection-error', handleConnectionError);
    return () => window.removeEventListener('firestore-connection-error', handleConnectionError);
  }, [isDemoMode]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // No backend configured, so the app runs in local demo mode. The
      // full studio still works, data just stays on this device.
      enterDemoMode();
      return;
    }

    // Check for force demo flag
    if (localStorage.getItem('qrforge_force_demo') === 'true') {
      localStorage.removeItem('qrforge_force_demo');
      enterDemoMode();
      return;
    }

    // Ensure persistence is set to local
    setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));

    // Check for redirect result (for mobile)
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setUser(result.user);
          toast('Signed in successfully!', 'success');
        }
      } catch (err: any) {
        console.error("Redirect result error:", err);
        if (err.code === 'auth/unauthorized-domain') {
          const domain = window.location.hostname;
          toast(`Login failed: Domain "${domain}" is not authorized. Please add it to Firebase Console.`, 'error');
        } else if (err.code === 'auth/internal-error' || err.code === 'auth/network-request-failed') {
          toast('Auth error. This often happens if the domain is not authorized or network is blocked.', 'error');
        }
      } finally {
        setIsAuthReady(true);
      }
    };
    checkRedirect();

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        
        // Clean up previous profile listener if any
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (firebaseUser) {
          // Disable demo mode when real user logs in
          setDemoMode(false);
          setIsDemoMode(false);
          
          // Start engagement service
          engagementService.start(firebaseUser.uid);

          // Load from cache first
          const cachedProfile = localStorage.getItem(`cache_profile_${firebaseUser.uid}`);
          if (cachedProfile) {
            try {
              setProfile(JSON.parse(cachedProfile));
            } catch (e) {
              console.error("Failed to parse cached profile", e);
            }
          }

          // Check if profile exists, create if not
          try {
            const existingProfile = await getUserProfile(firebaseUser.uid);
            if (!existingProfile) {
              const urlParams = new URLSearchParams(window.location.search);
              const referredBy = urlParams.get('ref');
              
              await createUserProfile(
                firebaseUser.uid, 
                firebaseUser.email || '', 
                firebaseUser.displayName || '', 
                firebaseUser.photoURL || '',
                referredBy || undefined
              );

              // Trigger Welcome Notification
              if (firebaseUser.email) {
                notificationService.sendWelcome(
                  firebaseUser.email,
                  undefined,
                  firebaseUser.displayName || undefined
                ).catch(e => console.error("Welcome notification failed:", e));
              }
            } else {
              await recordSession(firebaseUser.uid);
              
              // AUTOMATIC TRIAL FOR EXISTING USERS WHO MISSED IT
              if (!existingProfile.trialUsed && existingProfile.role === 'free') {
                const { startFreeTrial } = await import('./services/db');
                // We use a simplified version of startFreeTrial or just update directly
                // Since startFreeTrial checks systemConfig, we'll use it to be safe
                startFreeTrial(firebaseUser.uid, 'pro').catch(e => console.error("Auto-trial grant failed:", e));
              }
            }

            // Real-time listener for profile
            const { onSnapshot, doc } = await import('firebase/firestore');
            const { db } = await import('./firebase');
            unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
              if (snap.exists()) {
                let data = snap.data();
                
                // Admin is highest pro by default
                if (data.role === 'admin') {
                  data = {
                    ...data,
                    subscription: {
                      ...data.subscription,
                      planId: 'business',
                      status: 'active'
                    }
                  };
                }
                
                setProfile(data);
                localStorage.setItem(`cache_profile_${firebaseUser.uid}`, JSON.stringify(data));
              }
            }, (error) => {
              console.error("Profile subscription error:", error);
            });
          } catch (profileError) {
            console.error("Error fetching/creating profile:", profileError);
            // If profile fetch fails, we still want to let the user in if they are authenticated
            // They might just have limited functionality
          }
        } else {
          setProfile(null);
        }
      } catch (authError) {
        console.error("Auth state change error:", authError);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const parser = new UAParser();
      const result = parser.getResult();
      const isMobile = result.device.type === 'mobile' || result.device.type === 'tablet';
      const isIframe = window.self !== window.top;
      
      if (isIframe) {
        console.info('Login might be restricted inside an iframe. If it fails, try opening the app in a new tab.');
      }

      // ALWAYS TRY POPUP FIRST as recommended for this environment
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        console.warn('Popup login failed, attempting redirect...', popupError.code);
        
        // Only fallback to redirect if popup is blocked or explicitly failed
        if (
          popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/cancelled-query-confirmation' ||
          isMobile // On mobile, if popup fails, redirect is often better
        ) {
          toast('Redirecting to Google Sign-In...', 'info');
          await signInWithRedirect(auth, provider);
        } else if (popupError.code === 'auth/unauthorized-domain') {
          const domain = window.location.hostname;
          toast(`Domain "${domain}" is not authorized. Please add it to "Authorized Domains" in Firebase Console.`, 'error');
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        toast(`Login failed: Domain "${domain}" is not authorized.`, 'error');
      } else if (error.code === 'auth/network-request-failed') {
        toast('Network error: Firebase Auth is blocked. Check your connection or disable ad-blockers.', 'error');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Silent
      } else {
        toast(`Login failed: ${error.message || 'Please try again.'}`, 'error');
      }
      throw error; // Rethrow so the modal can handle loading state
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, pass);
      if (!firebaseUser.emailVerified) {
        // We still let them in, but we'll show a persistent warning in the UI
        // or we can force them to verify. The user said "users are not asked to verify email", 
        // so let's show a clear message.
        toast('Please verify your email address. Check your inbox for the verification link.', 'warning');
      }
    } catch (error: any) {
      console.error('Email login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast('Invalid email or password.', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        toast('Too many failed attempts. Please try again later.', 'error');
      } else {
        toast(error.message || 'Login failed.', 'error');
      }
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Update profile immediately so onAuthStateChanged sees the name
      await updateProfile(newUser, { displayName: name });
      
      // Manually trigger profile creation to ensure name is captured
      await createUserProfile(
        newUser.uid,
        email,
        name,
        '',
        new URLSearchParams(window.location.search).get('ref') || undefined
      );

      await sendEmailVerification(newUser);
      toast('Account created! Please check your email to verify your account.', 'success');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast('This email is already registered.', 'error');
      } else if (error.code === 'auth/weak-password') {
        toast('Password is too weak. Please use at least 6 characters.', 'error');
      } else {
        toast(error.message || 'Signup failed.', 'error');
      }
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast('Password reset email sent!', 'success');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast(error.message || 'Failed to send reset email.', 'error');
      throw error;
    }
  };

  const setRole = async (newRole: string) => {
    if (!user) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { role: newRole });
      setProfile((prev: any) => prev ? { ...prev, role: newRole } : null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const updateShortcuts = async (shortcuts: string[]) => {
    if (!user) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { shortcuts });
      setProfile((prev: any) => prev ? { ...prev, shortcuts } : null);
      toast('Shortcuts updated successfully', 'success');
    } catch (error) {
      console.error('Error updating shortcuts:', error);
      toast('Failed to update shortcuts', 'error');
    }
  };

  const logout = async () => {
    const uid = user?.uid;
    if (uid) {
      engagementService.stop();
    }
    if (isDemoMode) {
      setIsDemoMode(false);
      setDemoMode(false);
      setUser(null);
      setProfile(null);
    } else {
      await signOut(auth);
    }
    if (uid) {
      const { clearUserCache } = await import('./services/db');
      clearUserCache(uid);
    }
    toast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAuthReady,
      isDemoMode,
      networkError,
      login, 
      loginWithEmail,
      signupWithEmail,
      resetPassword,
      logout, 
      enterDemoMode, 
      setRole, 
      updateShortcuts,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
