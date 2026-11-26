import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider, useToast } from './components/Toast';
import { NotificationProvider } from './NotificationContext';
import { LandingPage } from './LandingPage';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSettings } from './components/AdminSettings';
import { SettingsPage } from './components/SettingsPage';
import { StaticPage } from './components/StaticPages';
import { DynamicView } from './components/DynamicView';
import { ApiDocs } from './components/ApiDocs';
import DocsPage from './components/DocsPage';
import SocialStudio from './components/SocialStudio';
import { WelcomeModal } from './components/WelcomeModal';
import { PricingModal } from './components/PricingModal';
import { GuidePage } from './components/GuidePage';
import { SplashScreen } from './components/SplashScreen';
import { Loader2, AlertCircle, ShieldCheck, WifiOff, Crown, Lock, QrCode, Smartphone, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { isFirebaseConfigured } from './firebase';
import { cn } from './lib/utils';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-sm w-full bg-card p-5 rounded-xl border border-border shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black tracking-tight uppercase">System Error</h2>
              <p className="text-[10px] text-muted-foreground font-medium">Something went wrong. Please try refreshing the application.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-foreground text-background rounded-lg font-black uppercase tracking-widest hover:opacity-90 transition-all text-[8px]"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DemoBanner = () => {
  const { isDemoMode } = useAuth();

  if (!isDemoMode) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="bg-brand-500/10 border-b border-brand-500/20 py-1.5 flex items-center justify-center gap-2 text-brand-600 font-black text-[8px] uppercase tracking-[0.2em]"
    >
      <AlertCircle className="w-3 h-3" />
      <span>Running in local demo mode. Your data stays on this device.</span>
    </motion.div>
  );
};

function ProGuard({ children }: { children: React.ReactNode }) {
  const { profile, user, isDemoMode } = useAuth();
  const [showPricing, setShowPricing] = useState(false);

  const isTrialing = profile?.subscription?.status === 'trialing';
  const isPro = ['pro', 'business', 'admin'].includes(profile?.role || '') || isTrialing;
  const isDemoUser = user?.uid === 'demo-user-123';

  if (isDemoUser || !isPro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full bg-card p-8 rounded-3xl border border-border shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-brand-500 to-primary" />
          
          <div className="w-20 h-20 bg-primary/10 text-brand-700 rounded-2xl flex items-center justify-center mx-auto rotate-3">
            <Crown className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Pro Feature</h2>
            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
              Social Studio is reserved for our Pro members. {isDemoUser ? "Demo accounts cannot access Pro features." : "Upgrade your plan to unlock advanced social profile management."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {!isDemoUser && (
              <button 
                onClick={() => setShowPricing(true)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all text-[10px] shadow-lg shadow-primary/20"
              >
                Upgrade to Pro
              </button>
            )}
            <button 
              onClick={() => window.history.back()}
              className="w-full py-3 bg-secondary text-foreground rounded-xl font-black uppercase tracking-widest hover:bg-secondary/80 transition-all text-[10px]"
            >
              Go Back
            </button>
          </div>

          {showPricing && <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, profile, loading, isAuthReady, login, setRole } = useAuth();
  const { toast } = useToast();

  const [currentView, setCurrentView] = useState<'main' | 'admin' | 'settings' | 'admin-settings'>(() => {
    return (localStorage.getItem('qrforge_last_view') as any) || 'main';
  });
  const [activeStatic, setActiveStatic] = useState<'about' | 'privacy' | 'terms' | null>(() => {
    return (localStorage.getItem('qrforge_static_active') as any) || null;
  });
  const [showAdminSignup, setShowAdminSignup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide splash after 2.5 seconds
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && profile) {
      const sessionWelcomeKey = `qrforge_welcome_session_${user.uid}`;
      const hasSeenWelcomeThisSession = sessionStorage.getItem(sessionWelcomeKey);
      const hasSeenWelcomeEver = localStorage.getItem(`qrforge_welcome_seen_${user.uid}`);
      
      if (!hasSeenWelcomeEver && !hasSeenWelcomeThisSession) {
        setShowWelcome(true);
      }
    }
  }, [user, profile]);

  const handleCloseWelcome = () => {
    if (user) {
      localStorage.setItem(`qrforge_welcome_seen_${user.uid}`, 'true');
      sessionStorage.setItem(`qrforge_welcome_session_${user.uid}`, 'true');
    }
    setShowWelcome(false);
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem('qrforge_last_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (activeStatic) {
      localStorage.setItem('qrforge_static_active', activeStatic);
    } else {
      localStorage.removeItem('qrforge_static_active');
    }
  }, [activeStatic]);

  // Hidden admin signup trigger: Press 'Shift + Alt + A'
  useEffect(() => {
    if (profile?.role === 'admin') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key === 'A') {
        setShowAdminSignup(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.role]);

  const [publicConfig, setPublicConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { getSystemPublicConfig } = await import('./services/db');
        const config = await getSystemPublicConfig();
        setPublicConfig(config);
      } catch {
        setPublicConfig(null);
      }
    };
    fetchConfig();
  }, []);

  // Maintenance Mode Check
  if (publicConfig?.maintenanceMode && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full bg-card p-6 rounded-xl border border-border shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 text-brand-700 rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black tracking-tighter uppercase">Maintenance</h2>
            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
              QRForge is currently undergoing scheduled maintenance. We'll be back shortly.
            </p>
          </div>
          <div className="pt-1">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estimated Uptime: 15 Minutes</p>
          </div>
        </div>
      </div>
    );
  }

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      // Check if already in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
        setIsInstalled(true);
      }
    };
    checkInstalled();
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    if (deferredPrompt && !isInstalled) {
      // Show prompt after a short delay if not installed
      const timer = setTimeout(() => setShowInstallPrompt(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isInstalled]);

  const handleInstallApp = async () => {
    if (isIframe) {
      window.open(window.location.href, '_blank');
      return;
    }
    if (!deferredPrompt) {
      toast('To install, use your browser menu and select "Add to Home Screen"', 'info');
      return;
    }
    setShowInstallPrompt(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-brand-700 animate-spin" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Forging Experience...</p>
            <p className="text-[7px] font-bold uppercase tracking-widest opacity-40">Starting QRForge</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 8 }}
            className="flex flex-col items-center gap-3 pt-4"
          >
            <p className="text-[8px] text-muted-foreground font-medium max-w-[200px] text-center">
              Taking longer than expected? This might be due to a slow connection or blocked scripts.
            </p>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[8px] font-black uppercase tracking-widest text-brand-700 hover:underline px-4 py-2 bg-primary/5 rounded-xl border border-primary/10 transition-all active:scale-95"
                >
                  Refresh
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('qrforge_force_demo', 'true');
                    window.location.reload();
                  }}
                  className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:underline px-4 py-2 bg-secondary rounded-xl transition-all active:scale-95"
                >
                  Offline Mode
                </button>
              </div>
              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="text-[8px] font-black uppercase tracking-widest text-destructive hover:underline px-4 py-2 bg-destructive/5 rounded-xl border border-destructive/10 transition-all active:scale-95"
              >
                Flush System Cache & Reset
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SplashScreen isVisible={showSplash} />
      {/* PWA Install Prompt Overlay */}
      <AnimatePresence>
        {showInstallPrompt && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-center">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/40 animate-bounce">
                    <QrCode className="w-7 h-7" />
                  </div>
                </div>
                
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {isIframe ? 'Open Web App' : 'Install App'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed px-4">
                    {isIframe 
                      ? 'Open in a new tab to enable full PWA features and installation.'
                      : 'Add to home screen for a faster experience and offline access.'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-secondary/30 rounded-xl border border-border/50 flex flex-col items-center gap-1">
                    {isIframe ? <Smartphone className="w-3.5 h-3.5 text-brand-700" /> : <WifiOff className="w-3.5 h-3.5 text-brand-700" />}
                    <span className="text-[7px] font-black uppercase tracking-widest">{isIframe ? 'Native' : 'Offline'}</span>
                  </div>
                  <div className="p-2 bg-secondary/30 rounded-xl border border-border/50 flex flex-col items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Secure</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    onClick={() => setShowInstallPrompt(false)}
                    className="py-3 bg-secondary text-foreground rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-border transition-all"
                  >
                    Later
                  </button>
                  <button 
                    onClick={handleInstallApp}
                    className="py-3 bg-primary text-primary-foreground rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {isIframe ? 'Open' : 'Install'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Routes>
      <Route path="/guide" element={<GuidePage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/api-docs" element={<ApiDocs />} />
      <Route path="/social-studio" element={
        <ProGuard>
          <SocialStudio onClose={() => window.history.back()} />
        </ProGuard>
      } />
      <Route path="/view/:shortId" element={<DynamicView />} />
      <Route path="/view/p/:previewId" element={<DynamicView isPreview={true} />} />
      <Route path="/r/:shortId" element={<DynamicView />} />
      <Route path="/" element={
        !user ? (
          <>
            <LandingPage 
              onOpenStatic={(type) => setActiveStatic(type)} 
              deferredPrompt={deferredPrompt}
              onInstall={() => setShowInstallPrompt(true)}
              isInstalled={isInstalled}
            />
            <AnimatePresence>
              {activeStatic && (
                <StaticPage type={activeStatic} onClose={() => setActiveStatic(null)} />
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="relative min-h-screen bg-background">
            <AnimatePresence mode="wait">
              {showGuide ? (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-[200] bg-background"
                >
                  <GuidePage onClose={() => setShowGuide(false)} />
                </motion.div>
              ) : currentView === 'admin' && profile?.role === 'admin' ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AdminDashboard 
                    onClose={() => setCurrentView('main')} 
                  />
                </motion.div>
              ) : currentView === 'admin-settings' && profile?.role === 'admin' ? (
                <motion.div
                  key="admin-settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <AdminSettings />
                </motion.div>
              ) : currentView === 'settings' ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SettingsPage 
                    onClose={() => setCurrentView('main')} 
                    onOpenGuide={() => setShowGuide(true)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Dashboard 
                    onOpenSettings={() => setCurrentView('settings')} 
                    onOpenAdmin={() => setCurrentView('admin')}
                    onOpenGuide={() => setShowGuide(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Global Overlays */}
            <AnimatePresence>
              {showWelcome && (
                <WelcomeModal 
                  key="welcome-modal"
                  isOpen={showWelcome} 
                  onClose={handleCloseWelcome} 
                  userName={profile?.displayName || user?.displayName || 'User'} 
                />
              )}
              {activeStatic && (
                <StaticPage key={`static-${activeStatic}`} type={activeStatic} onClose={() => setActiveStatic(null)} />
              )}
              {showAdminSignup && (
                <div key="admin-signup-overlay" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-border p-6 rounded-2xl max-w-md w-full space-y-4 text-center"
                  >
                    <ShieldCheck className="w-12 h-12 text-brand-700 mx-auto" />
                    <h2 className="text-xl font-black uppercase tracking-tight">Admin Access</h2>
                    <p className="text-xs text-muted-foreground">
                      You have discovered the hidden gateway. 
                      {user ? `Upgrade your account to administrative status.` : 'Sign in to claim administrative privileges.'}
                    </p>
                    <button 
                      onClick={async () => {
                        if (!user) {
                          await login();
                        } else {
                          await setRole('admin');
                          setShowAdminSignup(false);
                        }
                      }}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all text-[9px]"
                    >
                      {user ? 'Claim Admin Status' : 'Sign in as Admin'}
                    </button>
                    <button onClick={() => setShowAdminSignup(false)} className="text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100">Cancel</button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Admin Toggle (Floating for Admins) */}
            {profile?.role === 'admin' && (
              <button 
                onClick={() => setCurrentView(currentView === 'main' ? 'admin' : 'main')}
                className="fixed bottom-4 right-4 z-[150] px-4 py-2 bg-foreground text-background rounded-full font-black uppercase tracking-widest text-[8px] shadow-2xl hover:scale-105 transition-all active:scale-95 border border-white/10"
              >
                {currentView === 'main' ? 'Switch to Admin' : 'Switch to Dashboard'}
              </button>
            )}
          </div>
        )
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <NotificationProvider>
                <DemoBanner />
                <AppContent />
              </NotificationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
