import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Shield, Crown, Check, ArrowRight, Loader2, Star, PartyPopper } from 'lucide-react';
import { cn } from '../lib/utils';
import { startFreeTrial, PLANS } from '../services/db';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

interface TrialSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const TrialSelectionModal: React.FC<TrialSelectionModalProps> = ({ isOpen, onClose, userId }) => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStartTrial = async () => {
    if (!selectedPlan || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!userId) {
        throw new Error('User identity not found. Please refresh and try again.');
      }
      await startFreeTrial(userId, selectedPlan);
      
      // Success sequence
      setIsSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ffffff', '#000000']
      });

      toast(`Welcome to the ${selectedPlan.toUpperCase()} trial!`, 'success');
      
      // Delay closing to show success state
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (error: any) {
      console.error('Trial Activation Error:', error);
      toast(error.message || 'Failed to start trial', 'error');
      setIsSubmitting(false);
    }
  };

  const trialPlans = PLANS.filter(p => p.id !== 'basic');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            onClick={() => {}} // Prevent closing by clicking outside to force selection
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-6 sm:p-10 space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-brand-700 rounded-full border border-primary/20 mb-4">
                  <Star className="w-3 h-3 fill-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Limited Time Offer</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-none">
                  Activate Your<br/><span className="text-brand-700">Intelligence Trial</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium max-w-md mx-auto">
                  Administrator has activated the system. Select your preferred tier to begin your 14-day full-access trial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trialPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative p-6 rounded-3xl border-2 transition-all text-left group",
                      selectedPlan === plan.id 
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" 
                        : "bg-secondary/20 border-border hover:border-primary/30"
                    )}
                  >
                    {selectedPlan === plan.id && (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        plan.id === 'pro' ? "bg-brand-500/10 text-brand-500" : "bg-primary/10 text-brand-700"
                      )}>
                        {plan.id === 'pro' ? <Zap className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">{plan.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">14 Days Free</p>
                      </div>

                      <ul className="space-y-2">
                        {plan.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleStartTrial}
                  disabled={!selectedPlan || isSubmitting || isSuccess}
                  className={cn(
                    "w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2",
                    isSuccess 
                      ? "bg-green-500 text-white shadow-green-500/20" 
                      : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isSuccess ? (
                    <>
                      <PartyPopper className="w-4 h-4" />
                      Intelligence Activated
                    </>
                  ) : (
                    <>
                      Initialize {selectedPlan?.toUpperCase() || 'Trial'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[8px] text-center text-muted-foreground font-medium uppercase tracking-widest">
                  No credit card required for trial activation. Reverts to basic after 14 days.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
