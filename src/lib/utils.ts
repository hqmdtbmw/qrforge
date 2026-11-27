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

// An SVG does not always carry a real size, so read it straight from the
// file text instead of trusting what the browser guesses when it loads one.
// Width and height attributes win, the viewBox is the next best thing, and
// when neither is there I return null so the caller can fall back to
// loading the image the normal way. Only plain numbers and px counts,
// a percentage like 100% is not a size I can check.
export function svgDimensions(text: string): { width: number; height: number } | null {
  const openTag = text.match(/<svg\b[^>]*>/i);
  if (!openTag) return null;
  const tag = openTag[0];

  const parseLength = (value: string | undefined): number | null => {
    if (value === undefined) return null;
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(px)?$/i);
    if (!match) return null;
    const size = Number(match[1]);
    return size > 0 ? size : null;
  };

  const widthAttr = tag.match(/\swidth\s*=\s*["']([^"']*)["']/i)?.[1];
  const heightAttr = tag.match(/\sheight\s*=\s*["']([^"']*)["']/i)?.[1];
  const width = parseLength(widthAttr);
  const height = parseLength(heightAttr);
  if (width !== null && height !== null) {
    return { width, height };
  }

  const viewBox = tag.match(/\sviewBox\s*=\s*["']([^"']*)["']/i)?.[1];
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const viewWidth = parts[2];
      const viewHeight = parts[3];
      if (viewWidth > 0 && viewHeight > 0) {
        return { width: viewWidth, height: viewHeight };
      }
    }
  }

  return null;
}

// The raster path, loading the file through an Image to measure it. Kept
// separate so the SVG path can fall back to it when the file text has no
// usable size, and so the whole thing stays testable in a plain Node run,
// where FileReader and Image do not exist.
function loadImageDimensions(file: File): Promise<LogoValidationResult> {
  if (typeof FileReader === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve({ valid: false, error: 'Failed to load image.' });
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

  // SVG logos get their size read from the file itself. Browsers report a
  // default size when an SVG has no width or height, so loading it through
  // an Image can let a huge logo through or misread a good one. When the
  // file text has no size to read, fall back to the Image path.
  if (file.type === 'image/svg+xml') {
    const dims = svgDimensions(await file.text());
    if (dims) {
      return checkLogoDimensions(dims.width, dims.height);
    }
  }

  return loadImageDimensions(file);
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
