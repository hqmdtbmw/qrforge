import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, messaging } from './firebase';
import { useAuth } from './AuthContext';
import { saveFCMToken } from './services/db';

type NotificationType = 'error' | 'success' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read?: boolean;
  createdAt?: any;
}

interface NotificationContextType {
  notify: (type: NotificationType, title: string, message?: string) => void;
  unreadCount: number;
  notifications: Notification[];
  requestPermission: () => Promise<boolean>;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const isInitialLoad = React.useRef(true);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted' && user) {
        const msg = await messaging();
        if (msg) {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!vapidKey) {
            console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set');
            return false;
          }
          const token = await getToken(msg, { vapidKey });
          if (token) {
            await saveFCMToken(user.uid, token);
          }
        }
      }
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!user) {
      setDbNotifications([]);
      setUnreadCount(0);
      return;
    }

    // No backend configured, so there is no notification stream to listen to.
    if (!db) return;

    // FCM Setup
    const setupFCM = async () => {
      try {
        const msg = await messaging();
        if (!msg) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!vapidKey) {
            console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set, so push notifications disabled');
            return;
          }
          const token = await getToken(msg, { vapidKey });
          
          if (token) {
            await saveFCMToken(user.uid, token);
          }
        }

        // Handle foreground messages
        onMessage(msg, (payload) => {
          console.log('Foreground message received:', payload);
          if (payload.notification) {
            notify(
              'info', 
              payload.notification.title || 'Notification', 
              payload.notification.body || ''
            );
          }
        });
      } catch (error) {
        console.error('FCM Setup error:', error);
      }
    };

    setupFCM();

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setDbNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      
      // Show toast for new unread notifications only after initial load
      if (!isInitialLoad.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' && !change.doc.data().read) {
            const data = change.doc.data();
            notify(data.type as NotificationType, data.title, data.message);
          }
        });
      }
      isInitialLoad.current = false;
    }, (error) => {
      console.error('Notification subscription error:', error);
    });

    return unsubscribe;
  }, [user]);

  const notify = useCallback((type: NotificationType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setLocalNotifications(prev => [...prev, { id, type, title, message: message || '' }]);
    
    setTimeout(() => {
      setLocalNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeLocal = (id: string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify, unreadCount, notifications: dbNotifications, requestPermission, permission }}>
      {children}
      <div className="fixed top-6 right-6 z-[200] space-y-4 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {localNotifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border p-4 flex gap-4 overflow-hidden relative group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                n.type === 'error' ? 'bg-red-50 text-red-500' :
                n.type === 'success' ? 'bg-green-50 text-green-500' :
                n.type === 'warning' ? 'bg-yellow-50 text-yellow-500' :
                'bg-blue-50 text-blue-500'
              }`}>
                {n.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {n.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {n.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                {n.type === 'info' && <Info className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm uppercase tracking-tight">{n.title}</h4>
                {n.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{n.message}</p>}
              </div>

              <button 
                onClick={() => removeLocal(n.id)}
                className="p-1 text-gray-300 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-1 ${
                  n.type === 'error' ? 'bg-red-500' :
                  n.type === 'success' ? 'bg-green-500' :
                  n.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  return context;
};
