import { 
  Type, MessageSquare, Wifi, User, Calendar, Link as LinkIcon, 
  Mail, Phone, Smartphone, File as FileIcon, MessageCircle, 
  Coins, Landmark, UtensilsCrossed, Workflow, CreditCard, Globe
} from 'lucide-react';

export type QRCategory = 'static' | 'dynamic';

export type QRType = 
  | 'text' | 'sms' | 'wifi' | 'vcard' | 'event' | 'link' 
  | 'email' | 'phone' | 'app' | 'file' | 'whatsapp' 
  | 'instagram' | 'twitter' | 'linkedin'
  | 'crypto' | 'bank' | 'menu' | 'flow' | 'social';

export interface QRTypeDefinition {
  id: QRType;
  label: string;
  icon: any;
  description: string;
  isPro?: boolean;
  category: QRCategory[];
}

export const QR_TYPES: QRTypeDefinition[] = [
  { id: 'text', label: 'Text', icon: Type, description: 'Plain text message', category: ['static'] },
  { id: 'sms', label: 'SMS', icon: MessageSquare, description: 'Pre-filled SMS message', category: ['static', 'dynamic'] },
  { id: 'wifi', label: 'WiFi', icon: Wifi, description: 'Connect to WiFi network', category: ['static'] },
  { id: 'vcard', label: 'vCard', icon: User, description: 'Digital business card', category: ['static', 'dynamic'] },
  { id: 'event', label: 'Event', icon: Calendar, description: 'Calendar event details', category: ['static'] },
  { id: 'link', label: 'Link', icon: LinkIcon, description: 'Website or URL', category: ['dynamic'] },
  { id: 'email', label: 'Email', icon: Mail, description: 'Pre-filled email message', category: ['dynamic'] },
  { id: 'phone', label: 'Phone', icon: Phone, description: 'Call a phone number', category: ['dynamic'] },
  { id: 'app', label: 'App', icon: Smartphone, description: 'App Store or Play Store link', category: ['dynamic'] },
  { id: 'file', label: 'File', icon: FileIcon, description: 'PDF, Image, or Document', category: ['dynamic'], isPro: true },
  { id: 'social', label: 'Social Link', icon: Globe, description: 'Multi-link social profile', category: ['dynamic'], isPro: true },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'Direct WhatsApp chat', category: ['dynamic'] },
  { id: 'instagram', label: 'Instagram', icon: Globe, description: 'Instagram profile or post', category: ['dynamic'] },
  { id: 'twitter', label: 'Twitter', icon: Globe, description: 'Twitter profile or tweet', category: ['dynamic'] },
  { id: 'linkedin', label: 'LinkedIn', icon: Globe, description: 'LinkedIn profile or company', category: ['dynamic'] },
  { id: 'crypto', label: 'Crypto', icon: Coins, description: 'Cryptocurrency payment', category: ['dynamic'] },
  { id: 'bank', label: 'Bank Pay', icon: Landmark, description: 'Global bank transfer QR', category: ['dynamic', 'static'], isPro: true },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, description: 'Digital menu or price list', category: ['dynamic'], isPro: true },
  { id: 'flow', label: 'QR Flow', icon: Workflow, description: 'Multi-step interactive flow', category: ['dynamic'], isPro: true },
];

export const BANK_STANDARDS = [
  { id: 'sepa', name: 'SEPA (Europe)', countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI'] },
  { id: 'upi', name: 'UPI (India)', countries: ['IN'] },
  { id: 'pix', name: 'Pix (Brazil)', countries: ['BR'] },
  { id: 'paynow', name: 'PayNow (Singapore)', countries: ['SG'] },
  { id: 'promptpay', name: 'PromptPay (Thailand)', countries: ['TH'] },
  { id: 'nqr', name: 'NQR (Nigeria)', countries: ['NG'] },
  { id: 'generic', name: 'Generic Transfer', countries: [] },
];

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
];

export const NIGERIA_BANKS = [
  { id: 'access', name: 'Access Bank' },
  { id: 'gtb', name: 'GTBank' },
  { id: 'zenith', name: 'Zenith Bank' },
  { id: 'firstbank', name: 'First Bank' },
  { id: 'uba', name: 'UBA' },
  { id: 'kuda', name: 'Kuda Bank' },
  { id: 'opay', name: 'OPay' },
  { id: 'palmpay', name: 'PalmPay' },
  { id: 'moniepoint', name: 'Moniepoint' },
  { id: 'stanbic', name: 'Stanbic IBTC' },
  { id: 'fidelity', name: 'Fidelity Bank' },
  { id: 'wema', name: 'Wema Bank' },
  { id: 'vfd', name: 'VFD Microfinance' },
];
