import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

interface NativeSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const NativeSelect: React.FC<NativeSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  label, 
  placeholder = "Select an option",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg border bg-background transition-all text-left group",
          isOpen ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-muted-foreground/30"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && (
            <div className="text-brand-700 group-hover:scale-110 transition-transform">
              {React.isValidElement(selectedOption.icon) ? React.cloneElement(selectedOption.icon as React.ReactElement<any>, { className: 'w-3 h-3' }) : selectedOption.icon}
            </div>
          )}
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            selectedOption ? "text-foreground" : "text-muted-foreground"
          )}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-3 h-3 text-muted-foreground transition-transform duration-300",
          isOpen && "rotate-180 text-brand-700"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="absolute z-[100] w-full mt-1 native-dropdown-content"
          >
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full native-dropdown-item justify-between",
                    value === option.id && "bg-primary/5 text-brand-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {option.icon && (
                      <div className={cn(
                        "transition-transform group-hover:scale-110",
                        value === option.id ? "text-brand-700" : "text-muted-foreground"
                      )}>
                        {React.isValidElement(option.icon) ? React.cloneElement(option.icon as React.ReactElement<any>, { className: 'w-3 h-3' }) : option.icon}
                      </div>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{option.name}</span>
                  </div>
                  {value === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="w-3 h-3" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
