import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ForgeLogo } from './ForgeLogo';

interface SplashScreenProps {
  isVisible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: Math.random() * 1000,
                  y: Math.random() * 1000 
                }}
                animate={{ 
                  opacity: [0, 0.3, 0],
                  scale: [0, 1, 0],
                  y: [null, Math.random() * -200]
                }}
                transition={{ 
                  duration: 3 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
                className="absolute w-1 h-1 bg-primary/40 rounded-full blur-[1px]"
              />
            ))}
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [-100, 100, -100],
                y: [-100, 100, -100]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full"
            />
            <motion.div 
              animate={{ 
                scale: [1.5, 1, 1.5],
                opacity: [0.4, 0.2, 0.4],
                x: [100, -100, 100],
                y: [100, -100, 100]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full"
            />
            
            {/* Particle Grid */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-20">
              {Array.from({ length: 64 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ 
                    duration: Math.random() * 3 + 2, 
                    repeat: Infinity, 
                    delay: Math.random() * 5 
                  }}
                  className="border-[0.5px] border-primary/20"
                />
              ))}
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.2 
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
              <ForgeLogo size={80} className="relative z-10" />
            </motion.div>

            <div className="text-center space-y-3">
              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl font-black tracking-tighter uppercase flex items-center justify-center gap-2"
                >
                  QR<span className="text-brand-700">Forge</span>
                </motion.h1>
              </div>
              
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 1.2, ease: "circOut" }}
                className="h-[1.5px] w-32 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"
              />
              
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 0.6, letterSpacing: "0.4em" }}
                transition={{ delay: 1.2, duration: 1 }}
                className="text-[8px] font-black uppercase"
              >
                Forging Digital Gateways
              </motion.p>
            </div>
          </div>

          {/* Loading Indicator */}
          <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
