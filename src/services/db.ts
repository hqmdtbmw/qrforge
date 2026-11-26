import { nanoid } from 'nanoid';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
  getDocFromServer,
  arrayUnion,
  increment,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Role } from '../lib/permissions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

let isDemoModeActive = false;

export function setDemoMode(active: boolean) {
  isDemoModeActive = active;
}

const getMockData = (key: string) => {
  const data = localStorage.getItem(`qrforge_mock_${key}`);
  return data ? JSON.parse(data) : [];
};

const saveMockData = (key: string, data: any) => {
  localStorage.setItem(`qrforge_mock_${key}`, JSON.stringify(data));
};

function cleanData(data: any) {
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });
  return cleaned;
}

export function clearUserCache(userId: string) {
  localStorage.removeItem(`cache_profile_${userId}`);
  localStorage.removeItem(`cache_qrs_${userId}`);
  localStorage.removeItem(`cache_folders_${userId}`);
  localStorage.removeItem(`cache_notifications_${userId}`);
  localStorage.removeItem(`cache_analytics_${userId}`);
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null, silent: boolean = false) {
  // No Firebase configured means no backend to report about. Fail quietly
  // so the app keeps running in local demo mode.
  if (!db) return;

  const errorCode = error?.code || '';
  const errorMessage = error?.message || String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  const isPermissionError = errorCode === 'permission-denied' || 
                            errorMessage.toLowerCase().includes('permission') || 
                            errorMessage.toLowerCase().includes('denied');
                            
  const isNetworkError = errorCode.includes('offline') || 
                         errorMessage.toLowerCase().includes('offline') || 
                         errorMessage.toLowerCase().includes('network');
                         
  const isReadOp = operationType === OperationType.LIST || operationType === OperationType.GET;

  if (isNetworkError && !isDemoModeActive) {
    console.warn('[Firestore] Network/Connection issue detected. Activating local fallback.');
    window.dispatchEvent(new CustomEvent('firestore-connection-error'));
  }

  if (isPermissionError && isReadOp) {
    // SILENT for read operations to prevent app crash in restricted environments
    console.debug('[Firestore] Permission denied for read operation (Silenced):', path);
    return; 
  }

  if (isPermissionError && !isReadOp) {
    // For write operations, we still want to know but maybe not crash if it's a best-effort write
    if (path?.includes('ScanEvent') || path?.includes('activity') || path?.includes('notifications')) {
      console.warn('[Firestore] Permission denied for best-effort write (Silenced):', path);
      return;
    }
  }

  if (!silent) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Error (Silenced): ', JSON.stringify(errInfo));
  }
}

export async function saveFCMToken(uid: string, token: string) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      fcmTokens: arrayUnion(token),
      lastTokenAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// User Profile
export async function createUserProfile(uid: string, email: string, displayName: string, photoURL: string, referredBy?: string) {
  if (isDemoModeActive) return;
  const path = `users/${uid}`;

  try {
    const deviceId = localStorage.getItem('qrforge_device_id') || 'unknown';
    
    // Check if deviceId already has an account (Fraud Prevention)
    const q = query(collection(db, 'users'), where('deviceId', '==', deviceId), limit(1));
    const snap = await getDocs(q);
    
    const isFraudulent = !snap.empty && snap.docs[0].id !== uid;

    // AUTOMATIC 30-DAY TRIAL FOR ALL NEW USERS
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await setDoc(doc(db, 'users', uid), cleanData({
      uid,
      email,
      displayName,
      photoURL,
      role: 'pro', // Start as Pro
      deviceId,
      isFraudulent,
      referredBy: referredBy || null,
      referralCode: uid.slice(0, 8).toUpperCase(),
      referralTermsMet: false,
      subscription: {
        status: 'trialing',
        planId: 'pro',
        trialEnd: Timestamp.fromDate(trialEnd),
        currentPeriodEnd: Timestamp.fromDate(trialEnd)
      },
      trialUsed: true,
      createdAt: Timestamp.now(),
      lastLoginAt: serverTimestamp()
    }));

    await recordSession(uid);

    await createNotification(
      uid, 
      'success', 
      'Welcome to QR Forge! 🚀', 
      'Your 30-day Pro trial has been activated automatically. Enjoy full access!'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function startFreeTrial(userId: string, planId: string) {
  if (isDemoModeActive) {
    console.log('[Demo] Starting free trial for:', planId);
    return;
  }
  const path = `users/${userId}`;
  try {
    console.log('[Firestore] Starting free trial activation for user:', userId, 'plan:', planId);
    const config = await getSystemPublicConfig();
    if (!config?.plansActive) {
      console.warn('[Firestore] Trial activation failed: Plans not active in system config');
      throw new Error('System plans are not yet activated by administrator.');
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 day trial

    await updateDoc(doc(db, 'users', userId), {
      role: planId,
      trialUsed: true,
      subscription: {
        status: 'trialing',
        planId: planId,
        trialEnd: Timestamp.fromDate(trialEnd),
        currentPeriodEnd: Timestamp.fromDate(trialEnd)
      }
    });

    console.log('[Firestore] Trial activated successfully for:', userId);

    await createNotification(
      userId,
      'success',
      'Trial Activated! ⚡',
      `You now have 30 days of ${planId.toUpperCase()} access. Enjoy the power of QR Forge.`
    );
  } catch (error) {
    console.error('[Firestore] Trial activation error:', error);
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function extendSubscription(userId: string, days: number) {
  if (isDemoModeActive) return;
  const path = `users/${userId}`;
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const currentEnd = userData.subscription?.currentPeriodEnd?.toDate() || new Date();
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    await updateDoc(doc(db, 'users', userId), {
      'subscription.currentPeriodEnd': Timestamp.fromDate(newEnd),
      'subscription.trialEnd': userData.subscription?.status === 'trialing' ? Timestamp.fromDate(newEnd) : userData.subscription?.trialEnd
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUserProfile(uid: string) {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// QR Codes
export async function createQRCode(ownerId: string, data: any) {
  if (isDemoModeActive) {
    const qrs = getMockData('qrcodes');
    const newQR = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      ownerId,
      shortId: nanoid(10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      stats: { totalScans: 0, uniqueScans: 0 }
    };
    saveMockData('qrcodes', [newQR, ...qrs]);
    return newQR.id;
  }
  const path = 'qrcodes';
  try {
    const docRef = await addDoc(collection(db, 'qrcodes'), cleanData({
      ...data,
      ownerId,
      shortId: nanoid(10),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      stats: { totalScans: 0, uniqueScans: 0 }
    }));

    // Check if this is the first QR and if terms need to be met for referral
    const userRef = doc(db, 'users', ownerId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.referredBy && !userData.referralTermsMet) {
        await completeReferral(ownerId, userData.email, userData.referredBy);
        await updateDoc(userRef, { referralTermsMet: true });
        // Grant 2 days extension to referrer
        await extendSubscription(userData.referredBy, 2);
      }
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToOrgQRs(orgId: string, callback: (qrs: any[]) => void) {
  if (isDemoModeActive) {
    callback(getMockData('qrcodes').filter((q: any) => q.orgId === orgId));
    return () => {};
  }
  const path = 'qrcodes';
  const q = query(
    collection(db, 'qrcodes'), 
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export function subscribeToUserQRs(userId: string, callback: (qrs: any[]) => void) {
  if (isDemoModeActive) {
    callback(getMockData('qrcodes'));
    return () => {};
  }
  const path = 'qrcodes';
  const q = query(
    collection(db, 'qrcodes'), 
    where('ownerId', '==', userId), 
    where('orgId', '==', null),
    orderBy('createdAt', 'desc')
  );

  // Load from cache first
  const cached = localStorage.getItem(`cache_qrs_${userId}`);
  if (cached) {
    try {
      callback(JSON.parse(cached));
    } catch (e) {
      console.error("Failed to parse cached QRs", e);
    }
  }

  return onSnapshot(q, (snap) => {
    const qrs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Update cache
    localStorage.setItem(`cache_qrs_${userId}`, JSON.stringify(qrs));
    callback(qrs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    // If offline, the cache is already served, but we call callback to ensure loading stops
    console.warn("Firestore subscription error (possibly offline):", error);
    callback([]); 
  });
}

export async function updateQRCode(qrId: string, data: any) {
  if (isDemoModeActive) {
    const qrs = getMockData('qrcodes');
    const index = qrs.findIndex((q: any) => q.id === qrId);
    if (index !== -1) {
      qrs[index] = { ...qrs[index], ...data, updatedAt: new Date().toISOString() };
      saveMockData('qrcodes', qrs);
    }
    return;
  }
  const path = `qrcodes/${qrId}`;
  try {
    await updateDoc(doc(db, 'qrcodes', qrId), cleanData({
      ...data,
      updatedAt: Timestamp.now()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQRCode(qrId: string) {
  if (isDemoModeActive) {
    const qrs = getMockData('qrcodes');
    const filtered = qrs.filter((q: any) => q.id !== qrId);
    saveMockData('qrcodes', filtered);
    return;
  }
  const path = `qrcodes/${qrId}`;
  try {
    await deleteDoc(doc(db, 'qrcodes', qrId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function moveQRCodeToFolder(qrId: string, folderId: string | null) {
  if (isDemoModeActive) {
    const qrs = getMockData('qrcodes');
    const index = qrs.findIndex((q: any) => q.id === qrId);
    if (index !== -1) {
      qrs[index] = { ...qrs[index], folderId, updatedAt: new Date().toISOString() };
      saveMockData('qrcodes', qrs);
    }
    return;
  }
  const path = `qrcodes/${qrId}`;
  try {
    await updateDoc(doc(db, 'qrcodes', qrId), { folderId });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Analytics
export async function recordScan(qrId: string, metadata: any = {}) {
  if (isDemoModeActive) return;
  const path = `qrcodes/${qrId}/ScanEvent`;
  try {
    const qrRef = doc(db, 'qrcodes', qrId);
    const qrSnap = await getDoc(qrRef);
    
    if (!qrSnap.exists()) return;

    const qrData = qrSnap.data();

    // Add scan event
    await addDoc(collection(db, 'qrcodes', qrId, 'ScanEvent'), {
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      vendor: navigator.vendor,
      ...metadata
    });

    // Update aggregate stats
    const city = metadata.city || 'Unknown';
    const country = metadata.country || 'Unknown';
    const region = metadata.region || 'Unknown';
    const locationKey = `${city}, ${country}`;
    
    const statsUpdate: any = {
      'stats.lastScanAt': serverTimestamp(),
      [`stats.topLocations.${locationKey.replace(/\./g, '_')}`]: increment(1),
      [`stats.countries.${country.replace(/\./g, '_')}`]: increment(1),
      [`stats.browsers.${metadata.browser?.replace(/\./g, '_') || 'Unknown'}`]: increment(1),
      [`stats.os.${metadata.os?.replace(/\./g, '_') || 'Unknown'}`]: increment(1),
      [`stats.devices.${metadata.device?.replace(/\./g, '_') || 'Unknown'}`]: increment(1)
    };

    if (metadata.isSocialView) {
      statsUpdate['stats.profileViews'] = increment(1);
    } else {
      statsUpdate['stats.totalScans'] = increment(1);
    }

    await updateDoc(qrRef, statsUpdate);

    // Trigger Notification for Owner (Best effort)
    try {
      const ownerId = qrData.ownerId;
      const qrName = qrData.name || "Your QR Code";
      const locationStr = `${city}, ${country}`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: ownerId,
        type: 'info',
        title: 'New Scan! 🎯',
        message: `"${qrName}" was just scanned in ${locationStr}.`,
        read: false,
        createdAt: serverTimestamp(),
        metadata: {
          qrId,
          location: { city, country, region },
          device: metadata.device || 'Unknown'
        }
      });
    } catch (notifErr) {
      // Silently fail if permissions don't allow (e.g. unauthenticated scanner)
      console.debug('Could not create scan notification from client side:', notifErr);
    }

    // Log to public activity for landing page (non-sensitive)
    await addDoc(collection(db, 'system', 'public', 'activity'), {
      city,
      country,
      type: qrData.qrType || 'URL',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record scan:', error);
  }
}

export async function checkScanLimit(qrId: string) {
  try {
    const qrSnap = await getDoc(doc(db, 'qrcodes', qrId));
    if (!qrSnap.exists()) return true;
    const data = qrSnap.data();
    if (!data.scanLimit) return true;
    return (data.stats?.totalScans || 0) < data.scanLimit;
  } catch (error) {
    return true;
  }
}

export async function recordDownload(type: string) {
  if (!db) return;
  const deviceId = localStorage.getItem('qrforge_device_id') || 'unknown';
  const path = `system/security/downloads/${deviceId}`;
  
  try {
    const docRef = doc(db, 'system', 'security', 'downloads', deviceId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data();
      if (data.downloads && data.downloads[type] >= 1) {
        return false; // Limit reached
      }
      await updateDoc(docRef, {
        [`downloads.${type}`]: increment(1),
        lastDownloadAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        deviceId,
        downloads: { [type]: 1 },
        lastDownloadAt: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to record download:', error);
    return true; // Fail open for UX, but log error
  }
}

export async function checkDownloadLimit(type: string) {
  const deviceId = localStorage.getItem('qrforge_device_id') || 'unknown';
  try {
    const snap = await getDoc(doc(db, 'system', 'security', 'downloads', deviceId));
    if (!snap.exists()) return true;
    const data = snap.data();
    return !(data.downloads && data.downloads[type] >= 1);
  } catch (error) {
    return true;
  }
}

export function subscribeToQRAnalytics(qrId: string, callback: (scans: any[]) => void) {
  const path = `qrcodes/${qrId}/ScanEvent`;
  const q = query(collection(db, 'qrcodes', qrId, 'ScanEvent'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    const scans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(scans);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

// Campaign Services (A/B Testing)
export async function createCampaign(data: any) {
  if (isDemoModeActive) return 'demo-campaign-' + Math.random().toString(36).substr(2, 9);
  const path = 'campaigns';
  try {
    const docRef = await addDoc(collection(db, 'campaigns'), {
      ...data,
      status: 'active',
      createdAt: serverTimestamp(),
      variations: []
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function addVariationToCampaign(campaignId: string, qrId: string) {
  if (isDemoModeActive) return;
  const path = `campaigns/${campaignId}`;
  try {
    await updateDoc(doc(db, 'campaigns', campaignId), {
      variations: arrayUnion(qrId)
    });
    await updateDoc(doc(db, 'qrcodes', qrId), {
      campaignId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToCampaigns(userId: string, callback: (campaigns: any[]) => void) {
  const path = 'campaigns';
  const q = query(collection(db, 'campaigns'), where('ownerId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

export async function getCampaign(campaignId: string) {
  const path = `campaigns/${campaignId}`;
  try {
    const docSnap = await getDoc(doc(db, 'campaigns', campaignId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeToCampaignVariations(campaignId: string, callback: (variations: any[]) => void) {
  const path = `qrcodes`;
  const q = query(collection(db, 'qrcodes'), where('campaignId', '==', campaignId));
  return onSnapshot(q, (snap) => {
    const variations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(variations);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

// Admin Services
export async function getAllUsers() {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToAllUsers(callback: (users: any[]) => void) {
  const path = 'users';
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

export async function deleteUser(uid: string) {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function getAllQRCodes() {
  const path = 'qrcodes';
  try {
    const snap = await getDocs(collection(db, 'qrcodes'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateUserSubscription(uid: string, planId: string, interval: 'month' | 'year' = 'month', status: 'active' | 'trialing' = 'active') {
  const path = `users/${uid}`;
  try {
    const now = new Date();
    const endDate = new Date();
    if (interval === 'month') {
      endDate.setMonth(now.getMonth() + 1);
    } else {
      endDate.setFullYear(now.getFullYear() + 1);
    }

    await updateDoc(doc(db, 'users', uid), {
      role: planId === 'free' ? 'free' : (planId === 'trial' ? 'pro' : planId),
      subscription: {
        planId: planId === 'trial' ? 'pro' : planId,
        status,
        currentPeriodStart: Timestamp.fromDate(now),
        currentPeriodEnd: Timestamp.fromDate(endDate),
        trialEnd: status === 'trialing' ? Timestamp.fromDate(endDate) : null,
        interval
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export function subscribeToPublicActivity(callback: (activity: any[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const path = 'system/public/activity';
  const q = query(collection(db, 'system', 'public', 'activity'), orderBy('timestamp', 'desc'), limit(10));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.debug('Public activity subscription restricted or empty');
    callback([]);
  });
}

// Organization Services
export async function createOrganization(ownerId: string, name: string) {
  if (isDemoModeActive) {
    const mockOrgs = getMockData('organizations');
    const mockMembers = getMockData('org_members');
    const newOrg = {
      id: nanoid(),
      name,
      ownerId,
      branding: {
        primaryColor: '#f97316',
        logoUrl: ''
      },
      createdAt: new Date().toISOString()
    };
    saveMockData('organizations', [...mockOrgs, newOrg]);
    saveMockData('org_members', [...mockMembers, {
      id: nanoid(),
      orgId: newOrg.id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date().toISOString()
    }]);
    
    // Update user orgIds in mock
    const mockUsers = getMockData('users');
    const userIndex = mockUsers.findIndex((u: any) => u.uid === ownerId);
    if (userIndex !== -1) {
      mockUsers[userIndex].orgIds = [...(mockUsers[userIndex].orgIds || []), newOrg.id];
      saveMockData('users', mockUsers);
    }
    
    return newOrg.id;
  }

  const path = 'organizations';
  try {
    const docRef = await addDoc(collection(db, 'organizations'), {
      name,
      ownerId,
      branding: {
        primaryColor: '#f97316',
        logoUrl: ''
      },
      createdAt: serverTimestamp()
    });
    
    // Add owner as first member
    await setDoc(doc(db, 'organizations', docRef.id, 'members', ownerId), {
      orgId: docRef.id,
      userId: ownerId,
      role: 'owner',
      joinedAt: serverTimestamp()
    });

    // Update user profile with orgId for easier querying without collectionGroup index
    await updateDoc(doc(db, 'users', ownerId), {
      orgIds: arrayUnion(docRef.id)
    });
    
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToUserOrganizations(userId: string, callback: (orgs: any[]) => void) {
  if (isDemoModeActive) {
    const mockMembers = getMockData('org_members').filter((m: any) => m.userId === userId);
    const orgIds = mockMembers.map((m: any) => m.orgId);
    const mockOrgs = getMockData('organizations').filter((o: any) => orgIds.includes(o.id));
    callback(mockOrgs);
    return () => {};
  }

  const path = 'organizations';
  
  // Use the user's orgIds array if available, otherwise fallback to collectionGroup (which might fail without index)
  return onSnapshot(doc(db, 'users', userId), async (userSnap) => {
    if (!userSnap.exists()) {
      callback([]);
      return;
    }

    const userData = userSnap.data();
    const orgIds = userData.orgIds || [];

    if (orgIds.length === 0) {
      // Fallback to collectionGroup if array is empty (might be a new user or legacy data)
      const q = query(collectionGroup(db, 'members'), where('userId', '==', userId));
      onSnapshot(q, async (snap) => {
        const ids = snap.docs.map(d => d.data().orgId).filter(Boolean) as string[];
        if (ids.length === 0) {
          callback([]);
          return;
        }
        try {
          const orgs: any[] = [];
          for (let i = 0; i < ids.length; i += 10) {
            const chunk = ids.slice(i, i + 10);
            const orgsQuery = query(collection(db, 'organizations'), where('__name__', 'in', chunk));
            const orgsSnap = await getDocs(orgsQuery);
            orgs.push(...orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
          callback(orgs);
        } catch (e) {
          console.error("Fallback org fetch failed:", e);
          callback([]);
        }
      }, (err) => {
        console.warn("Org members subscription failed:", err);
        callback([]);
      });
      return;
    }

    // Fetch the actual organization documents in chunks of 10 (Firestore 'in' limit)
    try {
      const orgs: any[] = [];
      for (let i = 0; i < orgIds.length; i += 10) {
        const chunk = orgIds.slice(i, i + 10);
        const q = query(collection(db, 'organizations'), where('__name__', 'in', chunk));
        const snap = await getDocs(q);
        orgs.push(...snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      callback(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      callback([]);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

export function subscribeToOrgMembers(orgId: string, callback: (members: any[]) => void) {
  if (isDemoModeActive) {
    const mockMembers = getMockData('org_members').filter((m: any) => m.orgId === orgId);
    callback(mockMembers);
    return () => {};
  }

  const path = `organizations/${orgId}/members`;
  return onSnapshot(collection(db, 'organizations', orgId, 'members'), (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

export async function addOrgMember(orgId: string, email: string, role: string = 'editor') {
  const path = `organizations/${orgId}/members`;
  try {
    // In a real app, we'd look up the user by email first
    // For this demo, we'll just add a placeholder or assume the user exists
    const userQuery = query(collection(db, 'users'), where('email', '==', email));
    const userSnap = await getDocs(userQuery);
    
    if (userSnap.empty) {
      throw new Error('User not found. They must sign up first.');
    }
    
    const userData = userSnap.docs[0].data();
    await setDoc(doc(db, 'organizations', orgId, 'members', userData.uid), {
      orgId,
      userId: userData.uid,
      email: userData.email,
      role,
      joinedAt: serverTimestamp()
    });

    // Update user profile with orgId
    await updateDoc(doc(db, 'users', userData.uid), {
      orgIds: arrayUnion(orgId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateOrganization(orgId: string, data: any) {
  if (isDemoModeActive) {
    const mockOrgs = getMockData('organizations');
    const index = mockOrgs.findIndex((o: any) => o.id === orgId);
    if (index !== -1) {
      mockOrgs[index] = { ...mockOrgs[index], ...data };
      saveMockData('organizations', mockOrgs);
    }
    return;
  }
  const path = `organizations/${orgId}`;
  try {
    await updateDoc(doc(db, 'organizations', orgId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrgBranding(orgId: string, branding: any) {
  return updateOrganization(orgId, { branding });
}

export async function logActivity(userId: string, orgId: string, action: string, details: string) {
  if (isDemoModeActive) {
    const logs = getMockData('org_activity_logs');
    saveMockData('org_activity_logs', [{
      id: nanoid(),
      userId,
      orgId,
      action,
      details,
      timestamp: new Date().toISOString()
    }, ...logs]);
    return;
  }
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      orgId,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function subscribeToOrgActivityLogs(orgId: string, callback: (logs: any[]) => void) {
  if (isDemoModeActive) {
    const logs = getMockData('org_activity_logs').filter((l: any) => l.orgId === orgId);
    callback(logs);
    return () => {};
  }
  const q = query(
    collection(db, 'activity_logs'),
    where('orgId', '==', orgId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

export async function createIdea(ownerId: string, orgId: string, title: string, content: string) {
  if (isDemoModeActive) {
    const ideas = getMockData('ideas');
    const newIdea = {
      id: nanoid(),
      ownerId,
      orgId,
      title,
      content,
      votes: 0,
      createdAt: new Date().toISOString()
    };
    saveMockData('ideas', [newIdea, ...ideas]);
    return newIdea.id;
  }
  try {
    const docRef = await addDoc(collection(db, 'ideas'), {
      ownerId,
      orgId,
      title,
      content,
      votes: 0,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'ideas');
  }
}

export function subscribeToOrgIdeas(orgId: string, callback: (ideas: any[]) => void) {
  if (isDemoModeActive) {
    const ideas = getMockData('ideas').filter((i: any) => i.orgId === orgId);
    callback(ideas);
    return () => {};
  }
  const q = query(
    collection(db, 'ideas'),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

export async function voteIdea(ideaId: string, incrementValue: number = 1) {
  if (isDemoModeActive) {
    const ideas = getMockData('ideas');
    const index = ideas.findIndex((i: any) => i.id === ideaId);
    if (index !== -1) {
      ideas[index].votes += incrementValue;
      saveMockData('ideas', ideas);
    }
    return;
  }
  try {
    await updateDoc(doc(db, 'ideas', ideaId), {
      votes: increment(incrementValue)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `ideas/${ideaId}`);
  }
}

export function subscribeToOrgAssets(orgId: string, callback: (assets: { qrs: any[], socials: any[], folders: any[] }) => void) {
  const unsubQRs = onSnapshot(query(collection(db, 'qrcodes'), where('orgId', '==', orgId)), (snap) => {
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const qrs = all.filter((a: any) => a.qrType !== 'social');
    const socials = all.filter((a: any) => a.qrType === 'social');
    
    onSnapshot(query(collection(db, 'folders'), where('orgId', '==', orgId)), (folderSnap) => {
      const folders = folderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback({ qrs, socials, folders });
    });
  });

  return unsubQRs;
}

export const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9,
    interval: 'month',
    features: ['10 Dynamic QRs', 'Basic Analytics', 'Standard Support']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    features: ['50 Dynamic QRs', 'Advanced Analytics', 'Custom Domains', 'Priority Support']
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    interval: 'month',
    features: ['Unlimited QRs', 'White-labeling', 'API Access', 'Dedicated Manager', 'Team Collaboration']
  }
];

export async function prepopulatePlans() {
  if (isDemoModeActive) return;
  try {
    for (const plan of PLANS) {
      await setDoc(doc(db, 'plans', plan.id), plan);
    }
  } catch (error) {
    console.error('Failed to prepopulate plans:', error);
  }
}

export async function activateSystemPlans() {
  if (isDemoModeActive) return;
  try {
    await updateSystemPublicConfig({ plansActive: true });
    await prepopulatePlans();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'system/public');
  }
}
export async function getSystemPublicConfig() {
  if (!db) return null;
  const path = 'system/public';
  try {
    const snap = await getDoc(doc(db, 'system', 'public'));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getSystemPrivateConfig() {
  if (!db) return null;
  const path = 'system/private';
  try {
    const snap = await getDoc(doc(db, 'system', 'private'));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

const DEFAULT_SYSTEM_CONFIG = {
  maintenanceMode: false,
  landingPage: {
    hero: {
      badge: "Free QR code studio",
      title: "QR codes, made properly",
      subtitle: "Make branded QR codes, track every scan, and keep your data yours. Free to use, no account needed to start.",
      ctaText: "Make a QR code"
    },
    features: {
      title: "Everything in one place",
      subtitle: "Everything you need to make and manage QR codes."
    },
    stats: []
  },
  showBrandMarquee: false
};

export function subscribeToSystemPublicConfig(callback: (config: any) => void) {
  if (!db) {
    callback(DEFAULT_SYSTEM_CONFIG);
    return () => {};
  }
  const path = 'system/public';
  return onSnapshot(doc(db, 'system', 'public'), (snap) => {
    callback(snap.exists() ? snap.data() : DEFAULT_SYSTEM_CONFIG);
  }, (error) => {
    // Silencing noisy permission error since we have a fallback
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      console.debug('Using fallback system config due to permission restrictions');
    } else {
      console.warn('Failed to fetch system config from Firestore:', error);
    }
    callback(DEFAULT_SYSTEM_CONFIG);
  });
}

export async function updateSystemPublicConfig(data: any) {
  const path = 'system/public';
  try {
    await setDoc(doc(db, 'system', 'public'), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSystemPrivateConfig(data: any) {
  const path = 'system/private';
  try {
    await setDoc(doc(db, 'system', 'private'), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Static Pages
export async function getStaticPage(slug: string) {
  const path = 'pages';
  try {
    const q = query(collection(db, 'pages'), where('slug', '==', slug));
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updateStaticPage(slug: string, data: any) {
  const path = 'pages';
  try {
    const q = query(collection(db, 'pages'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, 'pages'), {
        slug,
        ...data,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'pages', snap.docs[0].id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Referrals
export async function createReferral(referrerId: string, referredEmail: string) {
  const path = 'referrals';
  try {
    await addDoc(collection(db, 'referrals'), {
      referrerId,
      referredEmail,
      status: 'pending',
      rewardGranted: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getReferralsByReferrer(referrerId: string) {
  const path = 'referrals';
  try {
    const q = query(collection(db, 'referrals'), where('referrerId', '==', referrerId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function completeReferral(referredUid: string, email: string, referrerId: string) {
  const path = 'referrals';
  try {
    // Check if a pending referral exists for this email and referrer
    const q = query(
      collection(db, 'referrals'), 
      where('referredEmail', '==', email),
      where('referrerId', '==', referrerId),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    
    let referralId: string;

    if (!snap.empty) {
      const referralDoc = snap.docs[0];
      referralId = referralDoc.id;
      await updateDoc(doc(db, 'referrals', referralId), {
        referredUid,
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } else {
      // Create a new completed referral for direct signups
      const docRef = await addDoc(collection(db, 'referrals'), {
        referrerId,
        referredEmail: email,
        referredUid,
        status: 'completed',
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        rewardGranted: false
      });
      referralId = docRef.id;
    }

    // Grant reward to referrer (extra week of Pro)
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnap = await getDoc(referrerRef);
    if (referrerSnap.exists()) {
      const data = referrerSnap.data();
      const currentEnd = data.subscription?.currentPeriodEnd?.toDate() || new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + 2); // 2 days extra (updated from 7)

      await updateDoc(referrerRef, {
        'subscription.currentPeriodEnd': Timestamp.fromDate(newEnd),
        'subscription.rewardGranted': true
      });

      await createNotification(
        referrerId,
        'success',
        'Referral Reward! 🎁',
        `Thanks for inviting a friend! We've added 2 days of Pro features to your account.`
      );

      await updateDoc(doc(db, 'referrals', referralId), {
        rewardGranted: true
      });
    }
  } catch (error) {
    console.error('Failed to complete referral:', error);
  }
}

export async function getAllReferrals() {
  const path = 'referrals';
  try {
    const snap = await getDocs(collection(db, 'referrals'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Plans
export async function getPlans() {
  const path = 'plans';
  try {
    const snap = await getDocs(collection(db, 'plans'));
    if (snap.empty) return isDemoModeActive ? DEFAULT_PLANS : [];
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return isDemoModeActive ? DEFAULT_PLANS : [];
  }
}

export const DEFAULT_PLANS = [
  { 
    id: 'free', 
    name: 'Free', 
    price: 0, 
    interval: 'month',
    features: ['5 QR Assets', 'Basic Analytics', 'Standard Support', 'Static QRs Only'],
    qrLimit: 5,
    dynamicAllowed: false,
    analyticsAllowed: true,
    abTestingAllowed: false,
    customBrandingAllowed: false,
    bulkAllowed: false,
    passwordProtectionAllowed: false,
    flowAllowed: false,
    menuAllowed: false,
    bankAllowed: false
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: 19, 
    interval: 'month',
    features: ['1,000 QR Assets', 'Advanced Analytics', 'Priority Support', 'Custom Branding', 'Dynamic QRs', 'Password Protection'],
    qrLimit: 1000,
    dynamicAllowed: true,
    analyticsAllowed: true,
    abTestingAllowed: true,
    customBrandingAllowed: true,
    bulkAllowed: true,
    passwordProtectionAllowed: true,
    flowAllowed: true,
    menuAllowed: true,
    bankAllowed: true
  },
  { 
    id: 'business', 
    name: 'Business', 
    price: 49, 
    interval: 'month',
    features: ['Unlimited QR Assets', 'Team Collaboration', 'API Access', 'White Labeling', 'Dedicated Manager', 'Multi-user Access'],
    qrLimit: 999999,
    dynamicAllowed: true,
    analyticsAllowed: true,
    abTestingAllowed: true,
    customBrandingAllowed: true,
    bulkAllowed: true,
    passwordProtectionAllowed: true,
    flowAllowed: true,
    menuAllowed: true,
    bankAllowed: true,
    whiteLabelAllowed: true
  }
];

export function subscribeToPlans(callback: (data: any[]) => void) {
  if (!db) {
    callback(DEFAULT_PLANS);
    return () => {};
  }
  const path = 'plans';
  
  // Load from cache first for offline support
  const cached = localStorage.getItem('qrforge_plans_cache');
  if (cached) {
    try {
      callback(JSON.parse(cached));
    } catch (e) {
      console.error('Failed to parse cached plans');
    }
  }

  return onSnapshot(collection(db, 'plans'), (snap) => {
    if (snap.empty) {
      const plans = isDemoModeActive ? DEFAULT_PLANS : [];
      localStorage.setItem('qrforge_plans_cache', JSON.stringify(plans));
      callback(plans);
    } else {
      const plans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('qrforge_plans_cache', JSON.stringify(plans));
      callback(plans);
    }
  }, (error) => {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      console.debug('Using fallback plans due to permission restrictions');
    } else {
      console.warn('Failed to fetch plans from Firestore:', error);
    }
    const plans = isDemoModeActive ? DEFAULT_PLANS : [];
    callback(plans);
  });
}

export async function updatePlan(planId: string, data: any) {
  const path = `plans/${planId}`;
  try {
    await setDoc(doc(db, 'plans', planId), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addPlan(data: any) {
  const path = 'plans';
  try {
    await setDoc(doc(db, 'plans', data.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deletePlan(planId: string) {
  const path = `plans/${planId}`;
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  color: string;
  createdAt: any;
}

// Folders
export async function createFolder(ownerId: string, name: string, color: string = '#f97316', orgId?: string) {
  if (isDemoModeActive) {
    const folders = getMockData('folders');
    const newFolder = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      ownerId,
      color,
      orgId,
      createdAt: new Date().toISOString()
    };
    saveMockData('folders', [newFolder, ...folders]);
    return newFolder.id;
  }
  const path = 'folders';
  try {
    const docRef = await addDoc(collection(db, 'folders'), {
      name,
      ownerId,
      color,
      orgId: orgId || null,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToUserFolders(userId: string, callback: (folders: Folder[]) => void) {
  if (isDemoModeActive) {
    callback(getMockData('folders'));
    return () => {};
  }
  const path = 'folders';
  const q = query(
    collection(db, 'folders'), 
    where('ownerId', '==', userId), 
    where('orgId', '==', null),
    orderBy('createdAt', 'desc')
  );

  // Load from cache first
  const cached = localStorage.getItem(`cache_folders_${userId}`);
  if (cached) {
    try {
      callback(JSON.parse(cached));
    } catch (e) {
      console.error("Failed to parse cached folders", e);
    }
  }

  return onSnapshot(q, (snap) => {
    const folders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
    // Update cache
    localStorage.setItem(`cache_folders_${userId}`, JSON.stringify(folders));
    callback(folders);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    console.warn("Firestore subscription error (possibly offline):", error);
  });
}

export function subscribeToOrgFolders(orgId: string, callback: (folders: Folder[]) => void) {
  if (isDemoModeActive) {
    callback(getMockData('folders').filter((f: any) => f.orgId === orgId));
    return () => {};
  }
  const path = 'folders';
  const q = query(
    collection(db, 'folders'), 
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function deleteFolder(folderId: string) {
  if (isDemoModeActive) {
    const folders = getMockData('folders');
    const filtered = folders.filter((f: any) => f.id !== folderId);
    saveMockData('folders', filtered);
    return;
  }
  const path = `folders/${folderId}`;
  try {
    // Also need to unassign QRs from this folder
    const q = query(collection(db, 'qrcodes'), where('folderId', '==', folderId));
    const snap = await getDocs(q);
    const batchPromises = snap.docs.map(d => updateDoc(doc(db, 'qrcodes', d.id), { folderId: null }));
    await Promise.all(batchPromises);
    
    await deleteDoc(doc(db, 'folders', folderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Brands
export async function submitBrandLogo(userId: string, brandName: string, logoUrl: string, website: string) {
  const path = 'brands';
  try {
    await addDoc(collection(db, 'brands'), {
      userId,
      brandName,
      logoUrl,
      website,
      status: 'pending',
      showOnLanding: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToBrands(callback: (brands: any[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const path = 'brands';
  return onSnapshot(collection(db, 'brands'), (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function updateBrandStatus(brandId: string, status: 'approved' | 'rejected' | 'pending', showOnLanding: boolean) {
  const path = `brands/${brandId}`;
  try {
    await updateDoc(doc(db, 'brands', brandId), { status, showOnLanding });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Activity Tracking
export async function recordActivity(userId: string, action: string, module: string, metadata: any = {}) {
  if (isDemoModeActive || (userId && userId.startsWith('demo-'))) return;
  try {
    await addDoc(collection(db, 'system', 'admin', 'activity'), {
      userId,
      action,
      module,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to record activity:', error);
  }
}

export async function updateSystemConfig(config: any) {
  if (isDemoModeActive) return;
  const path = 'system/public';
  try {
    await setDoc(doc(db, 'system', 'public'), {
      ...config,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToLiveActivity(callback: (activity: any[]) => void) {
  const q = query(
    collection(db, 'system', 'admin', 'activity'), 
    orderBy('timestamp', 'desc'), 
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Live activity subscription failed:', error);
    callback([]);
  });
}

// Sessions
export async function recordSession(uid: string) {
  if (isDemoModeActive || uid.startsWith('demo-')) return;
  const path = `users/${uid}/sessions`;
  try {
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const platform = (navigator as any).platform || 'Unknown';
    
    // Simple device detection
    let device = 'Desktop';
    if (/Mobi|Android/i.test(userAgent)) device = 'Mobile';
    if (/Tablet|iPad/i.test(userAgent)) device = 'Tablet';

    await addDoc(collection(db, 'users', uid, 'sessions'), {
      device: `${device} (${platform})`,
      userAgent,
      language,
      lastActive: serverTimestamp(),
      createdAt: serverTimestamp(),
      ip: 'Hidden for Privacy'
    });

    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: serverTimestamp(),
      'stats.totalLogins': increment(1)
    });

    await recordActivity(uid, 'SESSION_START', 'AUTH');
  } catch (error) {
    console.error('Failed to record session:', error);
  }
}

export function subscribeToUserSessions(uid: string, callback: (sessions: any[]) => void) {
  const path = `users/${uid}/sessions`;
  const q = query(collection(db, 'users', uid, 'sessions'), orderBy('lastActive', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function revokeSession(uid: string, sessionId: string) {
  const path = `users/${uid}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Notifications
export async function createNotification(userId: string, type: 'info' | 'warning' | 'success' | 'error', title: string, message: string = '') {
  const path = 'notifications';
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// System Updates (Admin to User)
export async function createSystemUpdate(adminId: string, title: string, content: string, type: 'info' | 'warning' | 'success' = 'info') {
  const path = 'system_updates';
  try {
    await addDoc(collection(db, 'system_updates'), {
      adminId,
      title,
      content,
      type,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToSystemUpdates(callback: (updates: any[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  const path = 'system_updates';
  const q = query(collection(db, 'system_updates'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    callback([]);
  });
}

// Real Analytics Aggregation
export async function getScanStatsForLast7Days(userId: string) {
  if (!db) return [];
  const path = 'qrcodes';
  try {
    // This is a complex query in Firestore. For a real app, we'd use a cloud function 
    // to aggregate this into a dailyStats collection.
    // For now, we'll fetch all ScanEvents for all user's QRs in the last 7 days.
    
    const qrQuery = query(collection(db, 'qrcodes'), where('ownerId', '==', userId));
    const qrSnap = await getDocs(qrQuery);
    const qrIds = qrSnap.docs.map(d => d.id);
    
    if (qrIds.length === 0) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allScans: any[] = [];
    
    // We have to do this per QR because Firestore doesn't support collection group queries 
    // with filters on parent fields easily without specific indexes.
    await Promise.all(qrIds.map(async (qrId) => {
      const scanQuery = query(
        collection(db, 'qrcodes', qrId, 'ScanEvent'),
        where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      const scanSnap = await getDocs(scanQuery);
      scanSnap.docs.forEach(d => allScans.push(d.data()));
    }));

    return allScans;
  } catch (error) {
    console.error('Failed to fetch scan stats:', error);
    return [];
  }
}

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'public'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export async function savePreview(data: any) {
  if (!db) return null;
  try {
    const previewId = nanoid(12);
    await setDoc(doc(db, 'previews', previewId), {
      ...data,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    return previewId;
  } catch (error) {
    console.error('Failed to save preview:', error);
    return null;
  }
}

export async function getPreview(previewId: string) {
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'previews', previewId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Failed to get preview:', error);
    return null;
  }
}

// --- TASK MANAGEMENT ---

export async function activateTrial(uid: string, planId: string) {
  const path = `users/${uid}`;
  try {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    
    await updateDoc(doc(db, 'users', uid), {
      role: planId === 'business' ? 'business' : 'pro',
      trialUsed: true,
      subscription: {
        status: 'trialing',
        planId: planId,
        trialEnd: Timestamp.fromDate(trialEnd),
        currentPeriodEnd: Timestamp.fromDate(trialEnd)
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserRole(userId: string, role: Role) {
  if (isDemoModeActive) {
    const mockUsers = getMockData('users');
    const index = mockUsers.findIndex((u: any) => u.id === userId);
    if (index !== -1) {
      mockUsers[index].role = role;
      saveMockData('users', mockUsers);
    }
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

export function subscribeToUserTasks(userId: string, callback: (tasks: any[]) => void) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks').filter((t: any) => t.ownerId === userId);
    callback(mockTasks.sort((a: any, b: any) => a.order - b.order));
    return () => {};
  }

  const q = query(
    collection(db, 'tasks'),
    where('ownerId', '==', userId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'tasks');
  });
}

export function subscribeToOrgTasks(orgId: string, callback: (tasks: any[]) => void) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks').filter((t: any) => t.orgId === orgId);
    callback(mockTasks.sort((a: any, b: any) => a.order - b.order));
    return () => {};
  }

  const q = query(
    collection(db, 'tasks'),
    where('orgId', '==', orgId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'tasks');
  });
}

export async function createTask(taskData: any) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks');
    const newTask = { id: nanoid(), ...taskData, createdAt: new Date().toISOString() };
    saveMockData('tasks', [...mockTasks, newTask]);
    return newTask.id;
  }

  try {
    const docRef = await addDoc(collection(db, 'tasks'), cleanData({
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));

    // Notify assignee if assigned to someone else
    if (taskData.assigneeId && taskData.assigneeId !== taskData.ownerId) {
      await createNotification(
        taskData.assigneeId,
        'info',
        'New Task Assigned! 📋',
        `You have been assigned to: ${taskData.title}`
      );
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tasks');
    throw error;
  }
}

export async function updateTask(taskId: string, taskData: any) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks');
    const updatedTasks = mockTasks.map((t: any) => t.id === taskId ? { ...t, ...taskData } : t);
    saveMockData('tasks', updatedTasks);
    return;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    const oldTaskSnap = await getDoc(taskRef);
    const oldTask = oldTaskSnap.exists() ? oldTaskSnap.data() : null;

    await updateDoc(taskRef, cleanData({
      ...taskData,
      updatedAt: serverTimestamp()
    }));

    // Notify if assignee changed or status updated
    if (oldTask) {
      if (taskData.assigneeId && taskData.assigneeId !== oldTask.assigneeId && taskData.assigneeId !== taskData.ownerId) {
        await createNotification(
          taskData.assigneeId,
          'info',
          'Task Assigned to You! 📋',
          `You are now responsible for: ${taskData.title || oldTask.title}`
        );
      }

      if (taskData.status && taskData.status !== oldTask.status && oldTask.ownerId) {
        await createNotification(
          oldTask.ownerId,
          taskData.status === 'completed' ? 'success' : 'info',
          'Task Status Updated! ⚡',
          `Task "${taskData.title || oldTask.title}" is now ${taskData.status.toUpperCase()}`
        );
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    throw error;
  }
}

export async function deleteTask(taskId: string) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks');
    saveMockData('tasks', mockTasks.filter((t: any) => t.id !== taskId));
    return;
  }

  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
    throw error;
  }
}

export async function reorderTasks(tasks: any[]) {
  if (isDemoModeActive) {
    const mockTasks = getMockData('tasks');
    const otherTasks = mockTasks.filter((t: any) => !tasks.find(nt => nt.id === t.id));
    saveMockData('tasks', [...otherTasks, ...tasks]);
    return;
  }

  try {
    const promises = tasks.map(task => 
      updateDoc(doc(db, 'tasks', task.id), { order: task.order })
    );
    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'tasks/reorder');
    throw error;
  }
}

// --- PROJECT MANAGEMENT ---

export async function createProject(projectData: any) {
  if (isDemoModeActive) {
    const mockProjects = getMockData('projects');
    const newProject = { id: nanoid(), ...projectData, createdAt: new Date().toISOString() };
    saveMockData('projects', [...mockProjects, newProject]);
    return newProject.id;
  }

  try {
    const docRef = await addDoc(collection(db, 'projects'), cleanData({
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'projects');
    throw error;
  }
}

export function subscribeToUserProjects(userId: string, callback: (projects: any[]) => void) {
  if (isDemoModeActive) {
    const mockProjects = getMockData('projects').filter((p: any) => p.ownerId === userId);
    callback(mockProjects);
    return () => {};
  }

  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  });
}

export function subscribeToOrgProjects(orgId: string, callback: (projects: any[]) => void) {
  if (isDemoModeActive) {
    const mockProjects = getMockData('projects').filter((p: any) => p.orgId === orgId);
    callback(mockProjects);
    return () => {};
  }

  const q = query(
    collection(db, 'projects'),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  });
}

export async function updateProject(projectId: string, projectData: any) {
  if (isDemoModeActive) {
    const mockProjects = getMockData('projects');
    const updated = mockProjects.map((p: any) => p.id === projectId ? { ...p, ...projectData } : p);
    saveMockData('projects', updated);
    return;
  }

  try {
    await updateDoc(doc(db, 'projects', projectId), cleanData({
      ...projectData,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    throw error;
  }
}

export async function deleteProject(projectId: string) {
  if (isDemoModeActive) {
    const mockProjects = getMockData('projects');
    saveMockData('projects', mockProjects.filter((p: any) => p.id !== projectId));
    return;
  }

  try {
    await deleteDoc(doc(db, 'projects', projectId));
    // Optionally delete or unassign tasks
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}`);
    throw error;
  }
}

// --- ADVANCED TASK ANALYTICS FOR ADMIN ---

export async function getGlobalTaskStats() {
  if (isDemoModeActive) {
    return {
      totalTasks: 150,
      completedTasks: 85,
      activeUsers: 12,
      tasksByPriority: { urgent: 5, high: 20, medium: 80, low: 45 },
      tasksByStatus: { todo: 40, 'in-progress': 20, review: 5, completed: 85 }
    };
  }

  try {
    const snap = await getDocs(collection(db, 'tasks'));
    const tasks = snap.docs.map(d => d.data());
    
    const stats = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      activeUsers: new Set(tasks.map(t => t.ownerId)).size,
      tasksByPriority: tasks.reduce((acc: any, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {}),
      tasksByStatus: tasks.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    return stats;
  } catch (error) {
    console.error('Failed to get global task stats:', error);
    return null;
  }
}

export async function registerFCMToken(userId: string, token: string) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayUnion(token),
      lastTokenAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/fcm`);
  }
}
