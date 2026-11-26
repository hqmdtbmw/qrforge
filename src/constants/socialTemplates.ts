import React from 'react';
import { 
  Instagram, Twitter, Linkedin, Facebook, Github, 
  Youtube, Music, MessageCircle, Mail, MapPin, Globe,
  ExternalLink, Share2, User, Heart, Sparkles, Zap,
  Camera, Coffee, Palette, Code, Briefcase, GraduationCap
} from 'lucide-react';

export interface SocialTemplate {
  id: string;
  name: string;
  className: string;
  buttonClass: string;
  iconClass: string;
  bgClass: string;
  fontClass: string;
}

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    className: 'bg-[#0a0a0a] text-white',
    buttonClass: 'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-xl',
    iconClass: 'text-white',
    bgClass: 'bg-gradient-to-br from-zinc-900 to-black',
    fontClass: 'font-sans'
  },
  {
    id: 'editorial-light',
    name: 'Editorial Light',
    className: 'bg-[#f5f5f0] text-[#1a1a1a]',
    buttonClass: 'bg-white border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white',
    iconClass: 'text-[#1a1a1a]',
    bgClass: 'bg-[#f5f5f0]',
    fontClass: 'font-serif'
  },
  {
    id: 'vibrant-neon',
    name: 'Vibrant Neon',
    className: 'bg-[#000] text-white',
    buttonClass: 'bg-transparent border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]',
    iconClass: 'text-[#00ff00]',
    bgClass: 'bg-black',
    fontClass: 'font-mono'
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    className: 'bg-[#0f172a] text-[#fbbf24]',
    buttonClass: 'bg-transparent border border-[#fbbf24]/30 text-[#fbbf24] hover:bg-[#fbbf24]/10 backdrop-blur-sm',
    iconClass: 'text-[#fbbf24]',
    bgClass: 'bg-[#0f172a]',
    fontClass: 'font-serif'
  },
  {
    id: 'soft-pastel',
    name: 'Soft Pastel',
    className: 'bg-[#fff5f5] text-[#7c3aed]',
    buttonClass: 'bg-white border-2 border-[#7c3aed]/10 text-[#7c3aed] hover:border-[#7c3aed] hover:bg-[#7c3aed]/5 shadow-sm',
    iconClass: 'text-[#7c3aed]',
    bgClass: 'bg-gradient-to-tr from-[#fff5f5] to-[#f5f3ff]',
    fontClass: 'font-sans'
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    className: 'bg-white text-black',
    buttonClass: 'bg-white border-4 border-black text-black hover:translate-x-1 hover:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1',
    iconClass: 'text-black',
    bgClass: 'bg-[#ffde03]',
    fontClass: 'font-black'
  }
];
