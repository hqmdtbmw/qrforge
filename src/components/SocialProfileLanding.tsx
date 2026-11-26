import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Twitter, Linkedin, Facebook, Github, 
  Youtube, Music, MessageCircle, Mail, MapPin, Globe,
  ExternalLink, Share2, User, Heart, Sparkles, Zap,
  Eye, MessageSquare, Send
} from 'lucide-react';
import { SOCIAL_TEMPLATES } from '../constants/socialTemplates';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

interface SocialProfileLandingProps {
  data: any;
  views?: number;
  isPreview?: boolean;
}

export const SocialProfileLanding: React.FC<SocialProfileLandingProps> = ({ data, views: initialViews = 0, isPreview = false }) => {
  if (!data || !data.fields) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Profile Not Found</h2>
          <p className="text-muted-foreground text-sm">The requested social profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const { fields } = data;
  const { toast } = useToast();
  const templateId = fields.templateId || 'modern-dark';
  const template = SOCIAL_TEMPLATES.find(t => t.id === templateId) || SOCIAL_TEMPLATES[0];
  const branding = fields.branding || { primaryColor: '#ff5c00', buttonStyle: 'rounded-xl' };
  const [liked, setLiked] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [realStats, setRealStats] = useState({ views: initialViews, likes: 0 });

  // Handle data mismatch: SocialStudio saves 'links', but we might have 'socialLinks' from elsewhere
  const links = fields.links || fields.socialLinks || [];
  const socials = fields.socials || {};

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }
    return `https://${url}`;
  };

  const getSocialUrl = (platform: string, value: string) => {
    if (!value) return '';
    if (value.startsWith('http')) return value;
    
    switch (platform.toLowerCase()) {
      case 'instagram': return `https://instagram.com/${value.replace('@', '')}`;
      case 'twitter': return `https://twitter.com/${value.replace('@', '')}`;
      case 'linkedin': return `https://linkedin.com/in/${value.replace('@', '')}`;
      case 'github': return `https://github.com/${value.replace('@', '')}`;
      case 'youtube': return `https://youtube.com/@${value.replace('@', '')}`;
      default: return ensureAbsoluteUrl(value);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isPreview || !data?.id) return;

    // Subscribe to real-time stats (view count is managed by DynamicView/recordScan)
    const qrRef = doc(db, 'qrcodes', data.id);
    const unsub = onSnapshot(qrRef, (doc) => {
      if (doc.exists()) {
        const stats = doc.data().stats || {};
        setRealStats({
          views: stats.totalScans || 0,
          likes: stats.likes || 0
        });
      }
    });

    return () => unsub();
  }, [data?.id, isPreview]);

  const handleLike = async () => {
    if (isPreview || !data?.id) {
      setLiked(!liked);
      return;
    }

    const qrRef = doc(db, 'qrcodes', data.id);
    try {
      if (!liked) {
        await updateDoc(qrRef, {
          'stats.likes': increment(1)
        });
        setLiked(true);
        toast('Thanks for the love!', 'success');
      } else {
        await updateDoc(qrRef, {
          'stats.likes': increment(-1)
        });
        setLiked(false);
      }
    } catch (err) {
      console.error('Failed to update like:', err);
    }
  };

  const getSocialIcon = (platform: string) => {
    if (!platform) return <Globe className="w-5 h-5" />;
    const p = platform.toLowerCase();
    switch (p) {
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'github': return <Github className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'tiktok': return <Music className="w-5 h-5" />;
      case 'whatsapp': return <MessageCircle className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: fields.profileName || 'Social Profile',
        text: fields.profileBio || 'Check out my links!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard!', 'success');
    }
  };

  return (
    <div className={cn("min-h-screen w-full flex flex-col items-center py-12 px-4 relative overflow-hidden", template.className, template.bgClass, template.fontClass)}>
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse" 
          style={{ backgroundColor: `${branding.primaryColor}1a` }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full animate-pulse delay-1000" 
          style={{ backgroundColor: `${branding.primaryColor}0d` }}
        />
      </div>

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-8 z-50 bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full shadow-2xl"
          >
            <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-700" />
              Welcome to my profile
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md w-full relative z-10 space-y-10">
        {/* Profile Header */}
        <header className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative inline-block"
          >
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-2xl group cursor-pointer">
              {fields.profileImage ? (
                <img src={fields.profileImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -bottom-2 -right-2 text-white p-2 rounded-2xl shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Zap className="w-4 h-4 fill-current" />
            </motion.div>
          </motion.div>

          <div className="space-y-3">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-black uppercase tracking-tight"
            >
              {fields.profileName || 'Your Name'}
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm opacity-70 font-medium leading-relaxed max-w-[280px] mx-auto"
            >
              {fields.profileBio || 'Tell the world who you are and what you do.'}
            </motion.p>
          </div>

          {/* Public Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-6"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 opacity-60">
                <Eye className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Views</span>
              </div>
              <span className="text-sm font-black">{realStats.views.toLocaleString()}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 opacity-60">
                <Heart className={cn("w-3 h-3 transition-colors", liked ? "fill-current" : "")} style={{ color: liked ? branding.primaryColor : undefined }} />
                <span className="text-[10px] font-black uppercase tracking-widest">Likes</span>
              </div>
              <span className="text-sm font-black">{realStats.likes.toLocaleString()}</span>
            </div>
          </motion.div>

          {/* Social Icons Row */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-4"
          >
            {Object.entries(socials).map(([platform, value]) => {
              const url = getSocialUrl(platform, value as string);
              if (!url) return null;
              return (
                <a 
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-90 border border-white/5"
                  style={{ color: branding.primaryColor }}
                >
                  {getSocialIcon(platform)}
                </a>
              );
            })}
          </motion.div>
        </header>

        {/* Links Section */}
        <div className="space-y-3">
          {links.map((link: any, idx: number) => (
            <motion.a
              key={link.id || idx}
              href={ensureAbsoluteUrl(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className={cn(
                "w-full p-4 flex items-center justify-between group transition-all duration-300",
                template.buttonClass,
                branding.buttonStyle
              )}
              style={{ borderLeft: `4px solid ${branding.primaryColor}` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/5", template.iconClass)}>
                  {getSocialIcon(link.platform || link.icon)}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">{link.label || link.title || link.platform || 'Link'}</span>
              </div>
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          ))}
        </div>

        {/* Footer Actions */}
        <footer className="pt-12 flex items-center justify-center gap-4">
          <button 
            onClick={handleLike}
            className={cn("w-12 h-12 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90", branding.buttonStyle)}
          >
            <Heart className={cn("w-5 h-5", liked ? "fill-current" : "")} style={{ color: liked ? branding.primaryColor : undefined }} />
          </button>
          <button 
            onClick={handleShare}
            className={cn("flex-1 h-12 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-primary/20", branding.buttonStyle)}
            style={{ backgroundColor: branding.primaryColor }}
          >
            <Share2 className="w-4 h-4" />
            Share Profile
          </button>
          <button 
            onClick={() => toast('Messaging feature coming soon!', 'info')}
            className={cn("w-12 h-12 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90", branding.buttonStyle)}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </footer>

        <div className="pt-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">Powered by QRForge</p>
        </div>
      </div>
    </div>
  );
};
