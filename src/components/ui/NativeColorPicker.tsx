import React, { useRef } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NativeColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const NativeColorPicker: React.FC<NativeColorPickerProps> = ({ 
  value, 
  onChange, 
  label,
  className 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 p-2 bg-background border border-border rounded-xl cursor-pointer hover:border-primary transition-all group shadow-sm"
      >
        <div 
          className="w-10 h-10 rounded-lg border-2 border-card shadow-inner flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Pipette className="w-4 h-4 text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{value}</p>
          <p className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Tap to change</p>
        </div>
        <input 
          ref={inputRef}
          type="color" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
};
