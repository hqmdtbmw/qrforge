import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, X, QrCode, Palette, BarChart3, Zap, Crown, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface Step {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
}

const steps: Step[] = [
  {
    title: "Welcome to QRForge",
    description: "Your all-in-one platform for creating branded, dynamic QR experiences. Let's get you started.",
    icon: QrCode,
    iconColor: "text-brand-700"
  },
  {
    title: "Daniel's Gift",
    description: "Daniel Innocent is giving you a 1-month free trial of our Pro features! Explore everything without limits.",
    icon: Crown,
    iconColor: "text-yellow-500"
  },
  {
    title: "Dynamic Control",
    description: "Dynamic QRs allow you to change the destination URL even after printing, and track every single scan.",
    icon: Zap,
    iconColor: "text-brand-500"
  },
  {
    title: "Forge with AI",
    description: "Describe your brand vibe and let Gemini AI generate stunning designs that match your identity automatically.",
    icon: Sparkles,
    iconColor: "text-blue-500"
  },
  {
    title: "Live Analytics",
    description: "Track scans in real-time. See location, device, and time data to optimize your campaigns.",
    icon: BarChart3,
    iconColor: "text-purple-500"
  },
  {
    title: "Data Transparency",
    description: "We value your privacy. You have full control over your data, and we are transparent about what we collect and why.",
    icon: Shield,
    iconColor: "text-green-500"
  }
];

export const OnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('qrforge_onboarding_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('qrforge_onboarding_completed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-card rounded-[1.5rem] p-5 md:p-8 max-w-md w-full shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] border border-border relative overflow-hidden"
          >
            {/* Background Glows */}
            <div className="absolute -top-24 -right-24 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
            
            <button 
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 relative z-10">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center shadow-inner"
              >
                {React.createElement(steps[currentStep].icon, { 
                  className: cn("w-6 h-6", steps[currentStep].iconColor) 
                })}
              </motion.div>

              <div className="space-y-1">
                <motion.h3 
                  key={`title-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-black tracking-tight text-foreground"
                >
                  {steps[currentStep].title}
                </motion.h3>
                <motion.p 
                  key={`desc-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-[13px] text-muted-foreground font-medium leading-relaxed"
                >
                  {steps[currentStep].description}
                </motion.p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(i)}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === currentStep ? "w-6 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "w-1 bg-border hover:bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleClose}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-[2] sm:flex-none px-4 py-2 bg-foreground text-background rounded-lg font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-foreground/10 text-[8px]"
                  >
                    <span>{currentStep === steps.length - 1 ? "Start Forging" : "Next"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
