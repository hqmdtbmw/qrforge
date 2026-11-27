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

// The size and shape checks for a logo, kept separate from validateLogo so
// they can be tested without a browser. A logo has to be 2048px or smaller
// on each side and roughly square, between a 1:2 and a 2:1 ratio. Anything
// that is not a real size at all, like zero or a negative number, is
// treated the same as an image that failed to load.
export function checkLogoDimensions(width: number, height: number): LogoValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { valid: false, error: 'Failed to load image.', width, height };
  }

  if (width > 2048 || height > 2048) {
    return { valid: false, error: 'Dimensions too large. Maximum is 2048x2048px.', width, height };
  }

  const aspectRatio = width / height;
  if (aspectRatio < 0.5 || aspectRatio > 2.0) {
    return { valid: false, error: 'Invalid aspect ratio. Logo should be approximately square.', width, height };
  }

  return { valid: true, width, height };
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
        resolve(checkLogoDimensions(img.width, img.height));
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
