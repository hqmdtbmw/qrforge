import { QrCode } from 'lucide-react';

export interface QRTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'social' | 'event' | 'personal';
  design: any;
  isPro?: boolean;
}

export const QR_TEMPLATES: QRTemplate[] = [
  {
    id: 'biz-minimal',
    name: 'Corporate Minimal',
    description: 'Ultra-clean aesthetic for high-end corporate identity.',
    category: 'business',
    design: {
      fgColor: '#0F172A',
      bgColor: '#FFFFFF',
      matrixStyle: 'square',
      eyeFrameStyle: 'square',
      eyeInnerStyle: 'square',
      margin: 4,
      errorCorrectionLevel: 'M'
    }
  },
  {
    id: 'biz-luxury',
    name: 'Midnight Gold',
    description: 'Premium luxury feel with gold accents on dark background.',
    category: 'business',
    isPro: true,
    design: {
      fgColor: '#D4AF37',
      bgColor: '#0A0A0A',
      eyeFrameColor: '#D4AF37',
      eyeInnerColor: '#FFFFFF',
      matrixStyle: 'classy',
      eyeFrameStyle: 'shield',
      eyeInnerStyle: 'diamond',
      margin: 6,
      errorCorrectionLevel: 'H'
    }
  },
  {
    id: 'social-neon',
    name: 'Cyber Pulse',
    description: 'Electric blue for a futuristic social vibe.',
    category: 'social',
    isPro: true,
    design: {
      fgColor: '#00F2FE',
      bgColor: '#000000',
      matrixStyle: 'liquid',
      eyeFrameColor: '#00F2FE',
      eyeInnerColor: '#FFFFFF',
      eyeFrameStyle: 'extra-rounded',
      eyeInnerStyle: 'dot',
      margin: 4,
      errorCorrectionLevel: 'Q'
    }
  },
  {
    id: 'social-sunset',
    name: 'Vibrant Social',
    description: 'High-visibility solid colors optimized for engagement.',
    category: 'social',
    design: {
      fgColor: '#FD1D1D',
      bgColor: '#FFFFFF',
      matrixStyle: 'rounded',
      eyeFrameStyle: 'rounded',
      eyeInnerStyle: 'rounded',
      margin: 4,
      errorCorrectionLevel: 'H'
    }
  },
  {
    id: 'event-vibrant',
    name: 'Electric Event',
    description: 'High-visibility design for festivals and conferences.',
    category: 'event',
    isPro: true,
    design: {
      fgColor: '#FFFFFF',
      bgColor: '#7C3AED',
      matrixStyle: 'dots',
      eyeFrameStyle: 'leaf',
      eyeInnerStyle: 'star',
      margin: 8,
      errorCorrectionLevel: 'H'
    }
  },
  {
    id: 'personal-eco',
    name: 'Eco Nature',
    description: 'Soft greens and organic shapes for sustainable brands.',
    category: 'personal',
    design: {
      fgColor: '#065F46',
      bgColor: '#F0FDF4',
      matrixStyle: 'classy-rounded',
      eyeFrameStyle: 'leaf',
      eyeInnerStyle: 'dot',
      margin: 4,
      errorCorrectionLevel: 'Q'
    }
  },
  {
    id: 'tech-brutalist',
    name: 'Tech Brutalist',
    description: 'Raw, high-contrast aesthetic for developers and tech.',
    category: 'personal',
    design: {
      fgColor: '#000000',
      bgColor: '#FACC15',
      matrixStyle: 'square',
      eyeFrameStyle: 'square',
      eyeInnerStyle: 'square',
      margin: 2,
      errorCorrectionLevel: 'L'
    }
  },
  {
    id: 'stealth-black',
    name: 'Stealth Matte',
    description: 'Subtle, sophisticated matte black on dark grey.',
    category: 'business',
    isPro: true,
    design: {
      fgColor: '#1A1A1A',
      bgColor: '#121212',
      eyeFrameColor: '#333333',
      eyeInnerColor: '#000000',
      matrixStyle: 'extra-rounded',
      eyeFrameStyle: 'shield',
      eyeInnerStyle: 'rounded',
      margin: 10,
      errorCorrectionLevel: 'H'
    }
  },
  {
    id: 'royal-velvet',
    name: 'Royal Velvet',
    description: 'Deep purple and silver for an elite, regal look.',
    category: 'event',
    isPro: true,
    design: {
      fgColor: '#E2E8F0',
      bgColor: '#4C1D95',
      eyeFrameColor: '#CBD5E1',
      eyeInnerColor: '#FFFFFF',
      matrixStyle: 'classy',
      eyeFrameStyle: 'classy',
      eyeInnerStyle: 'diamond',
      margin: 5,
      errorCorrectionLevel: 'Q'
    }
  },
  {
    id: 'industrial-steel',
    name: 'Industrial Steel',
    description: 'Rugged, metallic aesthetic for engineering and construction.',
    category: 'business',
    isPro: true,
    design: {
      fgColor: '#475569',
      bgColor: '#F1F5F9',
      eyeFrameColor: '#1E293B',
      eyeInnerColor: '#64748B',
      matrixStyle: 'square',
      eyeFrameStyle: 'shield',
      eyeInnerStyle: 'square',
      margin: 4,
      errorCorrectionLevel: 'H'
    }
  },
  {
    id: 'oceanic-depth',
    name: 'Oceanic Depth',
    description: 'Deep sea blues and fluid shapes for a calm, professional feel.',
    category: 'personal',
    isPro: true,
    design: {
      fgColor: '#0C4A6E',
      bgColor: '#F0F9FF',
      eyeFrameColor: '#075985',
      eyeInnerColor: '#0EA5E9',
      matrixStyle: 'liquid',
      eyeFrameStyle: 'leaf',
      eyeInnerStyle: 'dot',
      margin: 6,
      errorCorrectionLevel: 'Q'
    }
  },
  {
    id: 'brutalist-mono',
    name: 'Brutalist Mono',
    description: 'High-contrast, raw aesthetic with sharp edges and bold blocks.',
    category: 'business',
    isPro: true,
    design: {
      fgColor: '#000000',
      bgColor: '#FFFFFF',
      eyeFrameColor: '#000000',
      eyeInnerColor: '#000000',
      matrixStyle: 'square',
      eyeFrameStyle: 'square',
      eyeInnerStyle: 'square',
      margin: 0,
      errorCorrectionLevel: 'H',
      frame: {
        type: 'label-bottom',
        text: 'AUTHENTIC',
        color: '#000000',
        textColor: '#FFFFFF'
      }
    }
  }
];
