import React from 'react';
import { useAuth } from '../AuthContext';
import { Action, hasPermission, Role, ROLE_PERMISSIONS } from '../lib/permissions';
import { motion } from 'motion/react';
import { Lock, Crown, Loader2 } from 'lucide-react';
import { TrialFeatureBlock } from './TrialFeatureBlock';

interface PermissionGuardProps {
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLock?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  action, 
  children, 
  fallback,
  showLock = true
}) => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center opacity-50">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const role = (profile?.role || 'free') as Role;
  const isTrial = profile?.subscription?.status === 'trialing';
  const allowed = hasPermission(role, action, profile?.subscription?.status);

  if (allowed) {
    return (
      <div className="relative group/guard">
        {children}
        {isTrial && (
          <div className="absolute top-1 left-1 z-50 pointer-events-none">
            <div className="px-1 py-0.5 bg-primary/80 text-primary-foreground text-[5px] font-black uppercase tracking-widest rounded-sm shadow-sm backdrop-blur-sm flex items-center gap-0.5">
              <Crown className="w-1.5 h-1.5" />
              Trial
            </div>
          </div>
        )}
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showLock) {
    return null;
  }

  // General rule: If not permitted, show a badge and restrict clicking
  return (
    <div className="relative group/locked cursor-not-allowed">
      <div className="opacity-40 grayscale pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background/80 backdrop-blur-md border border-primary/20 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 text-center max-w-[200px]"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Lock className="w-4 h-4 text-brand-700" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-brand-700">Access Restricted</p>
            <p className="text-[7px] text-muted-foreground font-bold uppercase tracking-tight mt-0.5">
              Upgrade to Pro to unlock this feature
            </p>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-billing'))}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-[7px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Unlock Now
          </button>
        </motion.div>
      </div>
    </div>
  );
};
