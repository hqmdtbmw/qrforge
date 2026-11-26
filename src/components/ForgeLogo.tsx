import React from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '../lib/utils';

interface ForgeLogoProps {
  className?: string;
  size?: number;
}

export const ForgeLogo: React.FC<ForgeLogoProps> = ({ className, size = 48 }) => {
  return (
    <div className={cn("flex items-center justify-center text-brand-700", className)}>
      <QrCode size={size} strokeWidth={2.5} />
    </div>
  );
};
