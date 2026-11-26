import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'loading' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 5000);
    }
    
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="fixed bottom-6 inset-x-0 z-[100] flex flex-col items-center gap-3 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-background/95 backdrop-blur-xl border border-primary/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl px-4 py-2.5 flex items-center gap-3 max-w-[90vw] sm:max-w-md"
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                t.type === 'success' ? 'bg-green-500/10 text-green-500' :
                t.type === 'error' ? 'bg-destructive/10 text-destructive' :
                t.type === 'loading' ? 'bg-primary/10 text-brand-700' :
                t.type === 'warning' ? 'bg-brand-500/10 text-brand-500' :
                'bg-primary/10 text-brand-700'
              )}>
                {t.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                {t.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                {t.type === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t.type === 'warning' && <AlertCircle className="w-3.5 h-3.5" />}
                {t.type === 'info' && <Info className="w-3.5 h-3.5" />}
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-foreground leading-tight">{t.message}</p>
              <button 
                onClick={() => removeToast(t.id)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
