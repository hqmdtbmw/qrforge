import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Zap, Shield, BarChart3, Globe, 
  ArrowRight, CheckCircle2, Twitter, Instagram, 
  Linkedin, Github, Quote, Sparkles, Smartphone,
  Wifi, User, ShoppingBag, MapPin, Mail,
  ArrowUpRight, MousePointer2, Lock, Cpu,
  Activity, ShieldCheck, Play, Menu, X,
  ChevronRight, Star, Users, Rocket, Layers,
  Palette, FileText, Info, Download
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { subscribeToSystemPublicConfig, subscribeToPlans, subscribeToBrands, subscribeToPublicActivity } from './services/db';
import { cn } from './lib/utils';
import { ThemeToggle } from './components/ThemeToggle';
import { HeroAnimation } from './components/HeroAnimation';
import { QRPreview } from './components/QRPreview';
import { useToast } from './components/Toast';
import { AuthModal } from './components/AuthModal';

export const LandingPage: React.FC<{ 
  onOpenStatic: (type: 'about' | 'privacy' | 'terms') => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  isInstalled?: boolean;
}> = ({ onOpenStatic, deferredPrompt, onInstall, isInstalled }) => {
  const navigate = useNavigate();
  const { login, enterDemoMode } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [publicConfig, setPublicConfig] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [publicActivity, setPublicActivity] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [showMarquee, setShowMarquee] = useState(false);
  const [demoUrl, setDemoUrl] = useState('https://qrforge.app');
  const [demoType, setDemoType] = useState<'url' | 'wifi' | 'vcard' | 'text'>('url');
  const [demoFields, setDemoFields] = useState({
    url: 'https://qrforge.app',
    ssid: 'Home_WiFi',
    password: 'securepassword',
    text: 'Hello from QRForge!',
    name: 'Daniel',
    phone: ''
  });

  const getDemoValue = () => {
    switch (demoType) {
      case 'wifi': return `WIFI:S:${demoFields.ssid};T:WPA;P:${demoFields.password};;`;
      case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nN:${demoFields.name}\nTEL:${demoFields.phone}\nEND:VCARD`;
      case 'text': return demoFields.text;
      default: return demoFields.url;
    }
  };

  useEffect(() => {
    const unsubscribeConfig = subscribeToSystemPublicConfig((config) => {
      setPublicConfig(config);
      setShowMarquee(config?.showBrandMarquee || false);
    });

    const unsubscribePlans = subscribeToPlans((data) => {
      setPlans(data.sort((a, b) => a.price - b.price));
    });

    const unsubscribeBrands = subscribeToBrands((data) => {
      setBrands(data.filter(b => b.status === 'approved' && b.showOnLanding));
    });

    const unsubscribeActivity = subscribeToPublicActivity((data) => {
      setPublicActivity(data);
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => {
      unsubscribeConfig();
      unsubscribePlans();
      unsubscribeBrands();
      unsubscribeActivity();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const landing = publicConfig?.landingPage || {
    hero: {
      badge: "Free QR code studio",
      title: "QR codes, made properly",
      subtitle: "Make branded QR codes, track every scan, and keep your data yours. Free to use, no account needed to start.",
      ctaText: "Make a QR code"
    },
    features: {
      title: "Everything in one place",
      subtitle: "Everything you need to make and manage QR codes."
    },
    stats: []
  };

  const daniel = publicConfig?.danielProfile || {
    name: "Daniel",
    bio: "I built QRForge because I couldn't find a good, trackable QR generator that was actually free. I wanted a tool that didn't compromise on design or data, so I made my own.",
    photoUrl: "",
    socials: {
      twitter: "https://twitter.com/mdtbmw",
      instagram: "https://instagram.com/mdtbmw",
      linkedin: "https://linkedin.com/in/mdtbmw",
      github: "https://github.com/mdtbmw"
    }
  };

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Guide', href: '/guide' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', onClick: () => onOpenStatic('about') }
  ];

  const useCases = [
    { icon: <Wifi className="w-6 h-6" />, title: "WiFi Access", desc: "Scan to join networks instantly.", color: "bg-blue-500" },
    { icon: <User className="w-6 h-6" />, title: "Digital vCard", desc: "Share contact info with a tap.", color: "bg-purple-500" },
    { icon: <ShoppingBag className="w-6 h-6" />, title: "Product Tags", desc: "Link to shop or product details.", color: "bg-green-500" },
    { icon: <MapPin className="w-6 h-6" />, title: "Location", desc: "Open maps for your business.", color: "bg-red-500" },
    { icon: <Mail className="w-6 h-6" />, title: "Email/SMS", desc: "Pre-fill messages for customers.", color: "bg-brand-500" },
    { icon: <Layers className="w-6 h-6" />, title: "App Links", desc: "Smart routing to App Stores.", color: "bg-indigo-500" },
  ];

  const qrRef = useRef<any>(null);

  const handleDownloadDemo = async () => {
    // Fraud Prevention: Check local storage and device ID
    const downloads = parseInt(localStorage.getItem('qrforge_demo_downloads') || '0');
    const deviceId = localStorage.getItem('qrforge_device_id') || 'unknown';
    
    if (downloads >= 1) {
      toast('Demo download limit reached (1 per device). Sign up for more!', 'error');
      return;
    }

    if (qrRef.current) {
      try {
        await qrRef.current.download('png');
        localStorage.setItem('qrforge_demo_downloads', (downloads + 1).toString());
        toast('Demo QR Code downloaded!', 'success');
      } catch (error) {
        toast('Failed to download demo QR', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-4 left-0 right-0 z-[100] transition-all duration-500 px-4 sm:px-6 pointer-events-none",
        scrolled ? "top-2" : "top-4"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Group */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto"
          >
            <div 
              onClick={() => navigate('/')}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 hover:rotate-12 transition-transform cursor-pointer"
            >
              <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="hidden xs:block">
              <span className="text-[9px] sm:text-xs font-black tracking-tighter uppercase leading-none">QRForge</span>
              <p className="text-[4px] sm:text-[6px] opacity-40 uppercase tracking-[0.3em] mt-0.5">Intelligence</p>
            </div>
          </motion.div>

          {/* Nav Links - Desktop */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto"
          >
            {navLinks.map((link) => (
              <button 
                key={link.name} 
                onClick={link.onClick || (() => {
                  if (link.href?.startsWith('/')) {
                    navigate(link.href);
                  } else {
                    const el = document.querySelector(link.href!);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                })}
                className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-700 transition-colors"
              >
                {link.name}
              </button>
            ))}
          </motion.div>

          {/* Actions Group */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1.5 px-1.5 py-1 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto"
          >
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/10" />
            <button 
              onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
              className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-700 transition-colors"
            >
              Sign In
            </button>
            <div className="hidden sm:block w-px h-4 bg-white/10" />
            {deferredPrompt && !isInstalled && (
              <button 
                onClick={onInstall}
                className="px-3 sm:px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                INSTALL
              </button>
            )}
            <button 
              onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
              className="px-3 sm:px-4 py-1.5 bg-foreground text-background rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              FORGE
            </button>
            <button className="md:hidden p-1 text-foreground" onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[200] bg-background p-6 flex flex-col"
          >
            <div className="flex justify-end">
              <button onClick={() => setIsMenuOpen(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-6">
              {navLinks.map((link) => (
                <button 
                  key={link.name} 
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (link.onClick) {
                      link.onClick();
                    } else {
                      const el = document.querySelector(link.href!);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-lg font-bold tracking-tight uppercase hover:text-brand-700 transition-colors text-left"
                >
                  {link.name}
                </button>
              ))}
              <button 
                onClick={() => { setIsMenuOpen(false); setAuthMode('login'); setIsAuthModalOpen(true); }}
                className="w-full py-3 bg-muted/50 rounded-xl text-xs font-bold uppercase tracking-wide"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setIsMenuOpen(false); setAuthMode('signup'); setIsAuthModalOpen(true); }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wide"
              >
                Start Forging
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Demo Section */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden bg-background">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-brand-700 text-[10px] font-black uppercase tracking-widest"
                >
                  <Zap className="w-3 h-3" />
                  Free QR code studio
                </motion.div>
                
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.85]">
                  QR codes, <br />
                  <span className="text-brand-700">made properly.</span>
                </h1>
                
                <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md opacity-80">
                  Make branded QR codes, track every scan, and keep your data yours. Free to use, no account needed to start.
                </p>
              </div>

              <div className="space-y-4">
                {/* Type Switches */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'url', icon: <Globe className="w-3 h-3" />, label: 'URL' },
                    { id: 'wifi', icon: <Wifi className="w-3 h-3" />, label: 'WiFi' },
                    { id: 'vcard', icon: <User className="w-3 h-3" />, label: 'vCard' },
                    { id: 'text', icon: <FileText className="w-3 h-3" />, label: 'Text' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setDemoType(type.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        demoType === type.id 
                          ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" 
                          : "bg-secondary/50 text-muted-foreground hover:bg-border"
                      )}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-brand-700 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition-opacity" />
                    
                    {demoType === 'url' && (
                      <input 
                        type="url" 
                        value={demoFields.url}
                        onChange={(e) => setDemoFields({ ...demoFields, url: e.target.value })}
                        placeholder="ENTER TARGET URL..."
                        className="relative w-full bg-card border border-border p-3.5 rounded-2xl outline-none text-xs font-black uppercase tracking-widest focus:border-primary/40 transition-all"
                      />
                    )}

                    {demoType === 'wifi' && (
                      <div className="relative flex flex-col sm:flex-row gap-1.5 bg-card border border-border p-1.5 rounded-2xl">
                        <input 
                          type="text" 
                          value={demoFields.ssid}
                          onChange={(e) => setDemoFields({ ...demoFields, ssid: e.target.value })}
                          placeholder="SSID"
                          className="flex-1 bg-transparent px-3 py-2 outline-none text-xs font-black uppercase tracking-widest"
                        />
                        <input 
                          type="password" 
                          value={demoFields.password}
                          onChange={(e) => setDemoFields({ ...demoFields, password: e.target.value })}
                          placeholder="PASSWORD"
                          className="flex-1 bg-transparent px-3 py-2 outline-none text-xs font-black uppercase tracking-widest border-t sm:border-t-0 sm:border-l border-border"
                        />
                      </div>
                    )}

                    {demoType === 'vcard' && (
                      <div className="relative flex flex-col sm:flex-row gap-1.5 bg-card border border-border p-1.5 rounded-2xl">
                        <input 
                          type="text" 
                          value={demoFields.name}
                          onChange={(e) => setDemoFields({ ...demoFields, name: e.target.value })}
                          placeholder="FULL NAME"
                          className="flex-1 bg-transparent px-3 py-2 outline-none text-xs font-black uppercase tracking-widest"
                        />
                        <input 
                          type="tel" 
                          value={demoFields.phone}
                          onChange={(e) => setDemoFields({ ...demoFields, phone: e.target.value })}
                          placeholder="PHONE"
                          className="flex-1 bg-transparent px-3 py-2 outline-none text-xs font-black uppercase tracking-widest border-t sm:border-t-0 sm:border-l border-border"
                        />
                      </div>
                    )}

                    {demoType === 'text' && (
                      <textarea 
                        value={demoFields.text}
                        onChange={(e) => setDemoFields({ ...demoFields, text: e.target.value })}
                        placeholder="ENTER MESSAGE..."
                        className="relative w-full bg-card border border-border p-3.5 rounded-2xl outline-none text-xs font-black uppercase tracking-widest focus:border-primary/40 transition-all min-h-[60px] resize-none"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                    <Info className="w-3 h-3" />
                    <span>Login to save, customize design, and track analytics</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
                  className="px-8 py-4 bg-foreground text-background font-black uppercase tracking-widest text-xs rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-2xl active:scale-95"
                >
                  Start Forging Now
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDownloadDemo}
                  className="px-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-2xl border border-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download QR
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative aspect-square max-w-[320px] mx-auto w-full lg:ml-auto"
            >
              <div className="absolute inset-0 bg-primary/5 blur-[60px] rounded-full animate-pulse" />
              <div className="relative z-10 bg-card border border-border rounded-[3rem] shadow-2xl flex items-center justify-center group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-full aspect-square flex items-center justify-center p-8">
                  <QRPreview 
                    ref={qrRef}
                    value={getDemoValue()} 
                    size={220}
                    className="shadow-2xl rounded-2xl max-w-full h-auto"
                    design={{
                      fgColor: '#000000',
                      bgColor: '#FFFFFF',
                      matrixStyle: 'rounded',
                      eyeFrameStyle: 'rounded',
                      eyeInnerStyle: 'dot',
                      margin: 2
                    }}
                  />
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-3 -right-3 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-[3rem]" />
                <div className="absolute -bottom-3 -left-3 w-16 h-16 border-b-2 border-l-2 border-primary/20 rounded-bl-[3rem]" />
                
                {/* Floating Badge */}
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-foreground text-background rounded-full text-[8px] font-black uppercase tracking-widest shadow-2xl border border-white/10"
                >
                  Live Preview Engine
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Forge: Interactive Types */}
      <section className="px-6 py-20 bg-secondary/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">The Forge</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">One place. <span className="text-brand-700">Every kind</span> of QR code.</h2>
            <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-2xl mx-auto opacity-80">
              From simple links to digital business cards, pick the type that fits and make it yours.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'Dynamic Links', icon: <Zap className="w-5 h-5" />, desc: 'Change destinations anytime.', badge: 'Popular' },
              { title: 'Digital vCards', icon: <User className="w-5 h-5" />, desc: 'Professional networking.', badge: 'Pro' },
              { title: 'WiFi Access', icon: <Wifi className="w-5 h-5" />, desc: 'Instant secure joining.', badge: 'Utility' },
              { title: 'App Store', icon: <Smartphone className="w-5 h-5" />, desc: 'Smart device routing.', badge: 'Growth' }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-primary/10 text-brand-700 rounded-full text-[7px] font-black uppercase tracking-widest">
                  {item.badge}
                </div>
                <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center text-brand-700 mb-4 group-hover:scale-110 transition-transform border border-border/50">
                  {item.icon}
                </div>
                <h3 className="text-xs font-black uppercase tracking-tight mb-1">{item.title}</h3>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight opacity-70">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Global Activity Section */}
      <section className="px-6 py-8 bg-secondary/5 border-y border-border overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Activity className="w-4 h-4 text-brand-700" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-primary rounded-full"
              />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide">Live Activity</p>
              <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">Real-time global engagement</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl overflow-hidden relative">
            <div className="flex gap-3 animate-marquee whitespace-nowrap">
              {(publicActivity.length > 0 ? publicActivity : [
                { city: 'Lagos', type: 'WiFi', timestamp: { toDate: () => new Date() } },
                { city: 'New York', type: 'vCard', timestamp: { toDate: () => new Date() } },
                { city: 'London', type: 'URL', timestamp: { toDate: () => new Date() } },
                { city: 'Tokyo', type: 'App', timestamp: { toDate: () => new Date() } },
                { city: 'Berlin', type: 'WiFi', timestamp: { toDate: () => new Date() } },
                { city: 'Paris', type: 'vCard', timestamp: { toDate: () => new Date() } },
              ]).map((scan, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-full shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                  <span className="text-[7px] font-black uppercase tracking-wide">{scan.city}</span>
                  <span className="text-[7px] opacity-50 font-black uppercase tracking-widest">{scan.type}</span>
                  <span className="text-[7px] text-brand-700 font-black">
                    {scan.timestamp?.toDate ? `${Math.floor((Date.now() - scan.timestamp.toDate().getTime()) / 1000)}s ago` : 'Just now'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Logo Marquee */}
      {showMarquee && (
        <section className="py-8 border-y border-border bg-secondary/5 overflow-hidden">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Global Adoption</p>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Trusted by teams everywhere</h2>
          </div>
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-8 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img src={brand.logoUrl} className="max-w-full max-h-full object-contain" alt={brand.brandName} referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-lg font-black uppercase tracking-tighter">{brand.brandName}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {brands.map((brand) => (
              <div key={`dup-${brand.id}`} className="flex items-center gap-8 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img src={brand.logoUrl} className="max-w-full max-h-full object-contain" alt={brand.brandName} referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-lg font-black uppercase tracking-tighter">{brand.brandName}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Use Cases Section */}
      <section className="px-6 py-20 bg-secondary/10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Versatility</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">Infinite <span className="text-brand-700">Possibilities.</span></h2>
            <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-2xl mx-auto opacity-80">
              Deploy your intelligence across any physical surface. From retail to networking, we bridge the gap.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {useCases.map((useCase, i) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="p-5 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors group"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-sm", useCase.color)}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    {useCase.icon}
                  </div>
                </div>
                <h3 className="text-xs font-black uppercase tracking-tight mb-1">{useCase.title}</h3>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight opacity-70">{useCase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Feed Section */}
      {landing.community?.show && (
        <section className="px-6 py-10 bg-background">
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-brand-700" />
                <span className="text-[10px] font-black uppercase tracking-widest">{landing.community?.title || 'Community Forge'}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Live Updates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { user: 'Alex M.', action: 'Forged a WiFi QR', time: 'Just now' },
                { user: 'Sarah K.', action: 'Updated a Dynamic Link', time: '2m ago' },
                { user: 'James W.', action: 'Generated 50 vCards', time: '5m ago' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-secondary/10 border border-border/50 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-brand-700 text-[8px] font-bold">
                      {item.user[0]}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold uppercase tracking-tight">{item.user}</p>
                      <p className="text-[6px] text-muted-foreground font-medium">{item.action}</p>
                    </div>
                  </div>
                  <span className="text-[6px] font-bold opacity-40">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Social Studio Feature */}
      <section className="px-6 py-24 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-[3rem] p-8 shadow-2xl relative z-10 max-w-[320px] mx-auto"
            >
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center overflow-hidden">
                    <span className="text-3xl font-black text-primary-foreground">D</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight">Daniel</h4>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em]">Product Designer</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[Twitter, Instagram, Linkedin].map((Icon, i) => (
                    <div key={i} className="aspect-square bg-secondary/50 rounded-xl flex items-center justify-center text-brand-700 border border-border/50">
                      <Icon className="w-5 h-5" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-primary/20">Connect Now</div>
                  <div className="w-full py-3 bg-secondary text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest text-center">Save Contact</div>
                </div>
              </div>
            </motion.div>
            <div className="absolute -inset-10 bg-primary/5 blur-[120px] rounded-full -z-10" />
          </div>
          
          <div className="order-1 lg:order-2 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Social Studio</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">Your Digital <br /><span className="text-brand-700">Identity</span>, in one scan.</h2>
              <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto md:mx-0 opacity-80">
                Make a social profile people can save with one scan. Your links, your contact details, your rules.
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {['Custom Themes', 'Link Analytics', 'vCard Export', 'Lead Capture'].map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-secondary/50 border border-border rounded-xl text-[8px] font-black uppercase tracking-widest opacity-60">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Task & Org Feature */}
      <section className="px-6 py-24 bg-secondary/5 border-y border-border relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Intelligence & Scale</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">Manage <span className="text-brand-700">it all</span> <br />in one place.</h2>
              <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto md:mx-0 opacity-80">
                Tasks, teams and organisations in one dashboard. Less jumping between tools.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-3 p-6 bg-card border border-border rounded-3xl text-left">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-brand-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight">Task Manager</h4>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-tight opacity-70">Track every scan, lead, and deployment with precision.</p>
              </div>
              <div className="space-y-3 p-6 bg-card border border-border rounded-3xl text-left">
                <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-700">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight">Organizations</h4>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-tight opacity-70">Collaborate with teams and manage multiple brands seamlessly.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-[3rem] p-8 shadow-2xl relative z-10"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                      <Rocket className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Campaigns</span>
                  </div>
                  <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[8px] font-black uppercase tracking-widest">Live</div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Summer Launch', progress: 85, status: 'On Track' },
                    { label: 'Global vCards', progress: 42, status: 'Scaling' },
                    { label: 'WiFi Rollout', progress: 100, status: 'Complete' }
                  ].map((task, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-tight">{task.label}</span>
                        <span className="text-[8px] opacity-50 font-black uppercase tracking-widest">{task.status}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${task.progress}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            <div className="absolute -inset-10 bg-brand-500/10 blur-[120px] rounded-full -z-10" />
          </div>
        </div>
      </section>

      {/* Stats Section - Compact */}
      {landing.stats.length > 0 && (
      <section className="px-6 py-10 bg-foreground text-background border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-around gap-8">
          {landing.stats.map((stat: any) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <span className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{stat.value}</span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Smart Tracking Section */}
      <section className="px-6 py-24 bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Intelligence</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                Smart <span className="text-brand-700">Tracking</span>
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto md:mx-0 opacity-80">
                Real-time insights into who, where, and how your codes are being engaged. Every scan is a data point for your growth.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
              {[
                "Heatmaps",
                "Device Info",
                "Time Analysis",
                "Funnels",
                "Referrer Data",
                "Export PDF/CSV"
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-brand-700" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <motion.div 
              initial={{ x: 30, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-700" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Live Analytics</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[8px] font-bold uppercase tracking-wide opacity-50">Active</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { label: 'Lagos, NG', value: '84%', color: 'bg-primary' },
                  { label: 'London, UK', value: '62%', color: 'bg-blue-500' },
                  { label: 'New York, US', value: '45%', color: 'bg-purple-500' }
                ].map(item => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wide">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: item.value }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={cn("h-full rounded-full", item.color)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full -z-10" />
          </div>
        </div>
      </section>

      {/* Smart Notifications Section */}
      <section className="px-6 py-24 bg-primary/5 border-y border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-8 text-center md:text-left"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-brand-700 text-[8px] font-black uppercase tracking-widest mx-auto md:mx-0">
                <Zap className="w-3 h-3" />
                NEW: Smart Pulse Notifications
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                Stay Connected. <br />
                <span className="text-brand-700">Even Offline.</span>
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto md:mx-0 opacity-80">
                Our new Smart Pulse engine keeps you updated on your asset performance in real-time. Get instant push notifications on your phone when your QR codes are scanned.
              </p>
            </div>
            <div className="space-y-4 max-w-md mx-auto md:mx-0">
              {[
                { icon: <Zap className="w-5 h-5" />, title: "Real-Time Scan Alerts", desc: "Know exactly when your audience engages." },
                { icon: <ShieldCheck className="w-5 h-5" />, title: "Offline Delivery", desc: "Notifications delivered via Firebase Cloud Messaging." },
                { icon: <Activity className="w-5 h-5" />, title: "Performance Insights", desc: "Weekly summaries of your digital gateway reach." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-card border border-border rounded-2xl text-left">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-brand-700 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">{item.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium opacity-70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="relative z-10 bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight">QRForge System</h4>
                      <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Notification Center</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>

                <div className="space-y-3">
                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 bg-secondary/50 backdrop-blur-xl border border-border rounded-2xl flex items-center gap-4"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-brand-700">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-tight">New Scan Detected!</p>
                      <p className="text-[8px] text-muted-foreground font-medium">Your "Summer Campaign" QR was scanned in Lagos, NG.</p>
                    </div>
                    <span className="text-[7px] font-black opacity-30">NOW</span>
                  </motion.div>

                  <motion.div 
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-4 bg-secondary/30 backdrop-blur-xl border border-border rounded-2xl flex items-center gap-4 opacity-60"
                  >
                    <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-tight">Weekly Report Ready</p>
                      <p className="text-[8px] text-muted-foreground font-medium">Your assets reached 1,240 new users this week.</p>
                    </div>
                    <span className="text-[7px] font-black opacity-30">2H AGO</span>
                  </motion.div>
                </div>

                <div className="pt-4 flex justify-center">
                  <button 
                    onClick={login}
                    className="px-8 py-3 bg-foreground text-background rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                  >
                    Enable Smart Pulse
                  </button>
                </div>
              </div>
            </div>
            
            {/* Decorative Rings */}
            <div className="absolute -inset-8 border border-primary/10 rounded-full -z-10 animate-ping [animation-duration:4s]" />
            <div className="absolute -inset-16 border border-primary/5 rounded-full -z-10 animate-ping [animation-duration:6s]" />
          </motion.div>
        </div>
      </section>

      {/* Security & Trust */}
      {landing.security?.show && (
        <section className="px-6 py-24 bg-foreground text-background relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: 'Enterprise Security', icon: <ShieldCheck className="w-6 h-6" />, desc: 'Bank-grade encryption for all your assets and data.' },
              { title: '99.9% Uptime', icon: <Zap className="w-6 h-6" />, desc: 'Your gateways are always open, no matter the traffic.' },
              { title: 'Privacy First', icon: <Lock className="w-6 h-6" />, desc: 'GDPR compliant tracking that respects user privacy.' }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="space-y-4 text-center md:text-left"
              >
                <div className="w-12 h-12 bg-primary/20 text-brand-700 rounded-xl flex items-center justify-center mx-auto md:mx-0">
                  {item.icon}
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight">{item.title}</h3>
                <p className="text-[10px] opacity-70 font-medium leading-relaxed uppercase tracking-widest">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Offers Section */}
      {landing.offer?.show && (
        <section className="px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              className="bg-primary rounded-[2rem] p-8 md:p-12 text-primary-foreground relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="relative z-10 space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 mx-auto md:mx-0">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Limited Offer</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                  {landing.offer?.title || 'Premium Journey'}
                </h2>
                <p className="text-xs md:text-sm opacity-80 font-black uppercase tracking-widest max-w-md">
                  {landing.offer?.description || 'Get 1 month of Pro features for free. Experience the full power of QRForge today.'}
                </p>
              </div>

              <div className="relative z-10">
                <button 
                  onClick={login}
                  className="px-8 py-4 bg-white text-brand-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl flex items-center gap-3 group"
                >
                  {landing.offer?.ctaText || 'Claim Free Month'} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Features - Bento Grid */}
      <section id="features" className="px-6 py-24 bg-background relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Capabilities</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                {landing.features.title.split(' ').map((word: string, i: number) => (
                  <span key={i} className={i === 1 ? 'text-brand-700' : ''}>
                    {word}{' '}
                  </span>
                ))}
              </h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md font-black uppercase tracking-widest leading-relaxed opacity-80">
              {landing.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Main Feature */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="md:col-span-8 p-6 bg-card border border-border rounded-2xl relative overflow-hidden group"
            >
              <div className="relative z-10 space-y-3 max-w-[200px]">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-md shadow-primary/10">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold tracking-tight uppercase">Intelligence</h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Track every scan with surgical precision in real-time.
                </p>
              </div>
            </motion.div>

            {/* Side Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 }}
              className="md:col-span-4 p-6 bg-foreground text-background rounded-2xl flex flex-col justify-between"
            >
              <Zap className="w-6 h-6 text-brand-700" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-tight uppercase">Dynamic</h3>
                <p className="text-[8px] opacity-70 font-medium">Change destinations instantly.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="px-6 py-24 bg-foreground text-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Process</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
              Forge. Deploy. <span className="text-brand-700">Conquer.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Design", icon: <Palette className="w-6 h-6" /> },
              { step: "02", title: "Deploy", icon: <Rocket className="w-6 h-6" /> },
              { step: "03", title: "Track", icon: <Cpu className="w-6 h-6" /> }
            ].map((item, i) => (
              <motion.div 
                key={item.step}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-2xl group hover:rotate-6 transition-transform">
                  {item.icon}
                </div>
                <div className="space-y-2">
                  <div className="text-[8px] font-black text-brand-700 uppercase tracking-[0.3em]">{item.step}</div>
                  <h3 className="text-sm font-black tracking-tight uppercase">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PWA Installation Section */}
      <section className="px-6 py-24 bg-primary/5 border-y border-primary/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center md:text-left"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-brand-700 text-[8px] font-black uppercase tracking-widest mx-auto md:mx-0">
                  <Smartphone className="w-3 h-3" />
                  {isInstalled ? 'App Installed' : 'PWA Enabled'}
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                  {isInstalled ? (
                    <>
                      QRForge is <br />
                      <span className="text-brand-700">Ready to Go.</span>
                    </>
                  ) : (
                    <>
                      Take QRForge <br />
                      <span className="text-brand-700">Everywhere.</span>
                    </>
                  )}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto md:mx-0 opacity-80">
                  {isInstalled 
                    ? "You've successfully installed QRForge. Launch it from your home screen for the best experience, including offline access and real-time notifications."
                    : "Install our Progressive Web App for a faster, more integrated experience. Get the power of QRForge directly on your home screen."
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto md:mx-0">
                {[
                  { icon: <Wifi className="w-5 h-5" />, title: "Offline Access", desc: "Manage assets without connection." },
                  { icon: <Zap className="w-5 h-5" />, title: "Push Alerts", desc: "Real-time scan notifications." },
                  { icon: <Layers className="w-5 h-5" />, title: "Home Screen", desc: "Launch instantly like a native app." },
                  { icon: <ShieldCheck className="w-5 h-5" />, title: "Secure & Fast", desc: "Optimized for speed and safety." }
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-card border border-border rounded-2xl text-left">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-brand-700 shrink-0">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight">{benefit.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium opacity-70">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!isInstalled && (
                <div className="pt-4">
                  <button 
                    onClick={onInstall}
                    className="px-10 py-4 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-primary/20 flex items-center gap-3 group"
                  >
                    <Download className="w-5 h-5 group-hover:bounce" />
                    {deferredPrompt ? 'Install QRForge App' : 'Get Native App'}
                  </button>
                </div>
              )}
              
              {isInstalled && (
                <div className="flex items-center gap-2 text-green-500 font-black uppercase tracking-widest text-[10px] pt-4">
                  <CheckCircle2 className="w-4 h-4" />
                  App Successfully Installed
                </div>
              )}
            </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="relative flex justify-center"
              >
                <div className="w-[280px] h-[560px] bg-foreground rounded-[3rem] border-[8px] border-foreground shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground rounded-b-2xl z-20" />
                  <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/40 animate-bounce">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-tight">QRForge</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Ready to Install</p>
                    </div>
                    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ x: [-100, 100] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-1/2 h-full bg-primary"
                      />
                    </div>
                  </div>
                </div>
                {/* Decorative floating icons */}
                <motion.div 
                  animate={{ y: [0, -20, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute -top-4 -right-4 p-4 bg-card border border-border rounded-2xl shadow-xl"
                >
                  <Zap className="w-6 h-6 text-brand-700" />
                </motion.div>
                <motion.div 
                  animate={{ y: [0, 20, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute -bottom-4 -left-4 p-4 bg-card border border-border rounded-2xl shadow-xl"
                >
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

      {/* Pricing Section */}
      {plans.length > 0 && (
        <section id="pricing" className="px-6 py-24 bg-background">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">Simple Pricing. <span className="text-brand-700">No Hidden</span> Fees.</h2>
              <p className="text-xs md:text-sm text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-2xl mx-auto opacity-80">
                Choose the plan that fits your ambition. From personal projects to enterprise scale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={cn(
                    "p-8 rounded-[2.5rem] border flex flex-col space-y-6 relative overflow-hidden transition-all hover:scale-[1.02]",
                    plan.id === 'pro' ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" : "border-border bg-card"
                  )}
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-tight">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter">${plan.price}</span>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-700" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{plan.qrLimit === 1000000 ? 'Unlimited' : plan.qrLimit} QRs</span>
                    </div>
                    {plan.dynamicAllowed && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Dynamic Links</span>
                      </div>
                    )}
                    {plan.analyticsAllowed && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Advanced Analytics</span>
                      </div>
                    )}
                    {plan.customBrandingAllowed && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-700" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Custom Branding</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={login}
                    className={cn(
                      "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      plan.id === 'pro' ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "bg-foreground text-background"
                    )}
                  >
                    {plan.price === 0 ? 'Get Started' : 'Go ' + plan.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 py-10 bg-foreground text-background">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-bold tracking-tight uppercase">QRForge</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium max-w-md leading-relaxed">
                A free, open source QR code studio. Make a code, track the scans, keep your data yours.
              </p>
              <div className="flex items-center gap-3">
                <a href={daniel.socials.twitter} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-700 transition-colors"><Twitter className="w-3.5 h-3.5" /></a>
                <a href={daniel.socials.instagram} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-700 transition-colors"><Instagram className="w-3.5 h-3.5" /></a>
                <a href={daniel.socials.linkedin} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-700 transition-colors"><Linkedin className="w-3.5 h-3.5" /></a>
                <a href={daniel.socials.github} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-700 transition-colors"><Github className="w-3.5 h-3.5" /></a>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[7px] font-bold uppercase tracking-wide text-brand-700">Platform</p>
              <ul className="space-y-1.5">
                {[
                  { name: 'Features', href: '#features' },
                  { name: 'Analytics', href: '#features' },
                  { name: 'A/B Testing', href: '#features' },
                  { name: 'How it Works', href: '#how-it-works' }
                ].map(item => (
                  <li key={item.name}>
                    <button 
                      onClick={() => {
                        const el = document.querySelector(item.href);
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }} 
                      className="text-[9px] font-bold hover:text-brand-700 transition-colors"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-[7px] font-bold uppercase tracking-wide text-brand-700">Company</p>
              <ul className="space-y-1.5">
                <li><button onClick={() => onOpenStatic('about')} className="text-[9px] font-bold hover:text-brand-700 transition-colors">About</button></li>
                <li><button onClick={() => onOpenStatic('privacy')} className="text-[9px] font-bold hover:text-brand-700 transition-colors">Privacy</button></li>
                <li><button onClick={() => onOpenStatic('terms')} className="text-[9px] font-bold hover:text-brand-700 transition-colors">Terms</button></li>
                <li><a href="mailto:intuitionbetsdevelopers@gmail.com" className="text-[9px] font-bold hover:text-brand-700 transition-colors">Contact</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-[7px] font-bold uppercase tracking-wide text-brand-700">Developers</p>
              <ul className="space-y-1.5">
                <li><button onClick={() => window.location.href = '/docs'} className="text-[9px] font-bold hover:text-brand-700 transition-colors">Documentation</button></li>
                <li><button onClick={() => window.location.href = '/api-docs'} className="text-[9px] font-bold hover:text-brand-700 transition-colors">API Reference</button></li>
                <li><a href="https://postman.com" target="_blank" rel="noreferrer" className="text-[9px] font-bold hover:text-brand-700 transition-colors">Postman Collection</a></li>
                <li><button onClick={() => window.location.href = '/docs'} className="text-[9px] font-bold hover:text-brand-700 transition-colors">Changelog</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[9px] font-bold text-muted-foreground">© 2026 QRForge. Built by {daniel.name}</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onOpenStatic('privacy')} className="text-[9px] font-bold text-muted-foreground hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => onOpenStatic('terms')} className="text-[9px] font-bold text-muted-foreground hover:text-white transition-colors">Terms of Service</button>
              <button onClick={() => onOpenStatic('privacy')} className="text-[9px] font-bold text-muted-foreground hover:text-white transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </footer>
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
      />
    </div>
  );
};

