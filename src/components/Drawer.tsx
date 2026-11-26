import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, className }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm md:hidden"
          />
          
          {/* Drawer Content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[10001] bg-card rounded-t-2xl p-4 shadow-2xl md:hidden max-h-[90vh] overflow-y-auto custom-scrollbar",
              className
            )}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4">
              {title && <h2 className="text-lg font-black tracking-tight uppercase">{title}</h2>}
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
