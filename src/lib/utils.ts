import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export interface LogoValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

export async function validateLogo(file: File): Promise<LogoValidationResult> {
  // Check file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only PNG, JPEG, and SVG are allowed.' };
  }

  // Check file size (max 1MB for logos)
  if (file.size > 1024 * 1024) {
    return { valid: false, error: 'File too large. Maximum size is 1MB.' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const aspectRatio = width / height;

        // Check dimensions (max 2048x2048 for initial upload)
        if (width > 2048 || height > 2048) {
          resolve({ valid: false, error: 'Dimensions too large. Maximum is 2048x2048px.', width, height });
          return;
        }

        // Check aspect ratio (must be square-ish, e.g., 0.5 to 2.0)
        if (aspectRatio < 0.5 || aspectRatio > 2.0) {
          resolve({ valid: false, error: 'Invalid aspect ratio. Logo should be approximately square.', width, height });
          return;
        }

        resolve({ valid: true, width, height });
      };
      img.onerror = () => {
        resolve({ valid: false, error: 'Failed to load image.' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function crc16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
