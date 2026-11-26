import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Crown, Zap, Rocket, Shield, Gift, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            key="welcome-modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            className={cn(
              "bg-card border border-white/10 shadow-2xl relative overflow-hidden",
              "w-full sm:max-w-lg sm:rounded-[2.5rem]",
              "fixed bottom-0 sm:relative sm:bottom-auto rounded-t-[2rem] sm:rounded-b-[2.5rem] p-5 sm:p-8"
            )}
          >
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-brand-500 to-primary animate-gradient-x" />
            
            {/* Mobile Handle */}
            <div className="w-10 h-1 bg-muted/20 rounded-full mx-auto mb-4 sm:hidden" />

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
            </button>

            <div className="relative z-10 space-y-5 sm:space-y-8">
              <div className="space-y-1.5 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-12 h-12 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-3 sm:mb-6"
                >
                  <Rocket className="w-6 h-6 sm:w-10 sm:h-10 text-brand-700" />
                </motion.div>
                <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-tight">Welcome, {userName.split(' ')[0]}!</h2>
                <p className="text-[9px] sm:text-sm text-muted-foreground font-medium uppercase tracking-wider">Your journey starts now.</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:gap-4">
                <div className="p-3 sm:p-5 bg-primary/5 border border-primary/20 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-5 group hover:bg-primary/10 transition-all">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                    <Gift className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-brand-700">Exclusive Gift</h4>
                    <p className="text-[9px] sm:text-[11px] font-bold mt-0.5">1-Month Free Pro Activated!</p>
                  </div>
                </div>

                <div className="p-3 sm:p-5 bg-secondary/30 border border-border rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-5">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-secondary rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-brand-500" />
                  </div>
                  <div>
                    <h4 className="text-[9px] sm:text-xs font-black uppercase tracking-widest">Real-Time Power</h4>
                    <p className="text-[9px] sm:text-[11px] font-bold mt-0.5">Smart Notifications Enabled</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-4 sm:py-5 bg-foreground text-background rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-[9px] sm:text-[10px]"
              >
                Start Forging
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[7px] sm:text-[8px] text-center opacity-40 font-black uppercase tracking-widest pb-1 sm:pb-0">
                No credit card required • Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
