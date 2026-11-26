import React from 'react';
import { motion } from 'motion/react';
import { Crown, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface TrialFeatureBlockProps {
  feature: string;
  onUpgrade?: () => void;
}

export const TrialFeatureBlock: React.FC<TrialFeatureBlockProps> = ({ feature, onUpgrade }) => {
  const { profile } = useAuth();
  const isTrial = profile?.subscription?.status === 'trialing';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-card border border-border rounded-xl shadow-lg text-center space-y-3 max-w-[240px] mx-auto"
    >
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
        <Crown className="w-4 h-4 text-brand-700" />
      </div>
      
      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-tight">Access Restricted</h3>
        <p className="text-[8px] text-muted-foreground font-medium leading-relaxed">
          {isTrial 
            ? `Your current plan is ${profile?.role?.toUpperCase()} but not the Pro that gives you this. Upgrade to unlock permanently.`
            : `"${feature}" requires a Pro subscription. Join our elite operatives.`}
        </p>
      </div>

      <button 
        onClick={onUpgrade}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all"
      >
        <Zap className="w-2.5 h-2.5" />
        Upgrade Now
        <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  );
};
