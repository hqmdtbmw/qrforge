import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NativeDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const NativeDatePicker: React.FC<NativeDatePickerProps> = ({
  value,
  onChange,
  label,
  className
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <CalendarIcon className="w-3 h-3" />
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full px-2 py-1.5 rounded-lg border border-border focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-card text-[10px] font-bold uppercase tracking-widest appearance-none cursor-pointer",
            "relative z-10 bg-transparent",
            !value && "text-muted-foreground"
          )}
        />
        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none z-0">
          <CalendarIcon className="w-3 h-3 text-brand-700 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {/* Custom styling for the date picker icon/trigger area */}
        <style dangerouslySetInnerHTML={{ __html: `
          input[type="date"]::-webkit-calendar-picker-indicator {
            background: transparent;
            bottom: 0;
            color: transparent;
            cursor: pointer;
            height: auto;
            left: 0;
            position: absolute;
            right: 0;
            top: 0;
            width: auto;
            z-index: 20;
          }
        `}} />
      </div>
    </div>
  );
};
