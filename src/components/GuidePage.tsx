import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Zap, BarChart3, Globe, ShieldCheck, 
  Palette, Download, Smartphone, LayoutGrid, 
  Plus, ArrowRight, ChevronRight, Play, 
  Sparkles, Layers, Users, Folder as FolderIcon, Trash2,
  X, Info, BookOpen, MousePointer2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { QRPreview } from './QRPreview';

const GUIDE_SECTIONS = [
  {
    id: 'intro',
    title: 'Welcome to QRForge',
    icon: Sparkles,
    content: 'QRForge is a high-performance QR intelligence platform designed for modern brands. From static codes to dynamic A/B testing, we provide the tools to forge, manage, and analyze your digital assets.',
    color: 'text-brand-700'
  },
  {
    id: 'forge',
    title: 'Forging Assets',
    icon: Plus,
    content: 'Create static or dynamic QR codes with our advanced Forge Studio. Choose from 20+ content types including vCards, WiFi, Crypto, and more.',
    steps: [
      'Click the center FORGE button in your dock.',
      'Select between Static (permanent) or Dynamic (editable) assets.',
      'Choose your content type and fill in the details.',
      'Use AI Suggestions to generate content ideas.'
    ],
    color: 'text-brand-500'
  },
  {
    id: 'design',
    title: 'Design Studio',
    icon: Palette,
    content: 'Customize every pixel of your QR code. Change matrix styles, eye shapes, and apply your brand colors or logos.',
    steps: [
      'Open the Design Studio in the Forge modal.',
      'Choose from 10+ matrix styles like Dots, Liquid, or Classy.',
      'Upload your brand logo and enable "Clear Background" for a professional look.',
      'Use AI Design Forge to generate unique styles from a text prompt.'
    ],
    color: 'text-blue-500'
  },
  {
    id: 'intelligence',
    title: 'Intelligence & Analytics',
    icon: BarChart3,
    content: 'Track every scan in real-time. Monitor location, device types, and browser data to optimize your campaigns.',
    steps: [
      'Click the "Intelligence" icon on any saved asset.',
      'View real-time scan trends and growth charts.',
      'Analyze geographic distribution and device usage.',
      'Export reports for your team or clients.'
    ],
    color: 'text-purple-500'
  },
  {
    id: 'organization',
    title: 'Organization',
    icon: FolderIcon,
    content: 'Keep your assets organized with folders and bulk actions. Manage large-scale deployments with ease.',
    steps: [
      'Create custom folders with unique colors.',
      'Use Bulk Actions to move or delete multiple assets at once.',
      'Search and filter your library by tags or categories.'
    ],
    color: 'text-green-500'
  }
];

export const GuidePage: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('intro');
  const [isAnimating, setIsAnimating] = useState(false);

  const activeSection = GUIDE_SECTIONS.find(s => s.id === activeTab) || GUIDE_SECTIONS[0];

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-10 border-b border-border flex items-center justify-between px-3 bg-card/50 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <BookOpen className="w-2.5 h-2.5" />
          </div>
          <div>
            <h1 className="text-[9px] font-black uppercase tracking-tighter">Forge Guide</h1>
            <p className="text-[5px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Master the platform</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-all active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Horizontal Navigation for Mobile/Desktop */}
        <nav className="border-b border-border bg-card/30 overflow-x-auto flex-shrink-0 no-scrollbar">
          <div className="p-1.5 flex gap-1 min-w-max">
            {GUIDE_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all group",
                  activeTab === section.id 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <section.icon className={cn("w-2.5 h-2.5", activeTab === section.id ? "text-white" : section.color)} />
                <span className="text-[7px] font-black uppercase tracking-widest">{section.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-1.5 sm:p-3 custom-scrollbar bg-gradient-to-br from-background via-background to-primary/5 ios-momentum-scroll">
          <div className="max-w-xl mx-auto space-y-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-2"
              >
                {/* Section Hero */}
                <div className="flex items-center gap-2 bg-card/50 p-1.5 rounded-xl border border-border">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0", activeSection.color.replace('text-', 'bg-').replace('500', '500/10'))}>
                    <activeSection.icon className={cn("w-3.5 h-3.5", activeSection.color)} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[9px] font-black tracking-tighter uppercase truncate">{activeSection.title}</h2>
                    <p className="text-[6px] text-muted-foreground font-medium leading-tight">
                      {activeSection.content}
                    </p>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Steps */}
                  <div className="space-y-1.5">
                    <h3 className="text-[7px] font-black uppercase tracking-[0.2em] text-brand-700 px-1">Instructions</h3>
                    <div className="grid gap-1">
                      {activeSection.steps?.map((step, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          key={i} 
                          className="flex items-start gap-2 p-1.5 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group"
                        >
                          <div className="w-3 h-3 rounded-md bg-secondary flex items-center justify-center text-[5px] font-black text-brand-700 group-hover:bg-primary group-hover:text-primary-foreground transition-all flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-[7px] font-bold text-foreground/80 leading-tight">{step}</p>
                        </motion.div>
                      )) || (
                        <div className="p-1.5 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-[7px] font-medium text-muted-foreground leading-relaxed">
                            Welcome to the future of QR intelligence. Explore the sections to learn how to master every part of our ecosystem.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Demo */}
                  <div className="relative aspect-video bg-card rounded-xl border border-border shadow-md overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
                    <div className="absolute inset-0 flex items-center justify-center p-1.5">
                      {/* Animated Demo Elements */}
                      {activeTab === 'intro' && (
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.02, 1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <QRPreview 
                            value="https://qrforge.ai" 
                            design={{ matrixStyle: 'liquid', fgColor: '#FF6B00', eyeFrameStyle: 'leaf' }} 
                            size={80} 
                          />
                        </motion.div>
                      )}
                      {activeTab === 'forge' && (
                        <div className="w-full max-w-[100px] space-y-1">
                          <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                            <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity }} className="h-full w-1/2 bg-primary" />
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="aspect-square bg-secondary/50 rounded-lg border border-border" />)}
                          </div>
                          <div className="h-5 bg-primary rounded-lg flex items-center justify-center text-[6px] font-black text-primary-foreground uppercase tracking-widest">FORGE</div>
                        </div>
                      )}
                      {activeTab === 'design' && (
                        <div className="flex gap-1.5 items-center">
                          <div className="grid grid-cols-2 gap-0.5">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-3 h-3 rounded-md border border-border bg-secondary/30" />)}
                          </div>
                          <QRPreview value="D" design={{ matrixStyle: 'dots', fgColor: '#00C2FF' }} size={35} />
                        </div>
                      )}
                      {activeTab === 'intelligence' && (
                        <div className="w-full max-w-[100px] flex items-end gap-0.5 h-12">
                          {[30, 60, 40, 80, 50, 70, 90].map((h, i) => (
                            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} className="flex-1 bg-primary/30 rounded-t-sm" />
                          ))}
                        </div>
                      )}
                      {activeTab === 'organization' && (
                        <div className="flex gap-1">
                          <FolderIcon className="w-5 h-5 text-brand-500 animate-bounce" />
                          <FolderIcon className="w-5 h-5 text-blue-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                      <span className="px-1 py-0.5 bg-background/80 backdrop-blur-md rounded-full text-[4px] font-black uppercase tracking-widest">Live Demo</span>
                    </div>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-card border border-border rounded-xl p-1.5 relative overflow-hidden">
                  <div className="relative z-10 space-y-0.5">
                    <h4 className="text-[6px] font-black uppercase tracking-widest text-brand-700">Pro Tip</h4>
                    <p className="text-[7px] font-bold tracking-tight leading-tight">
                      Dynamic QR codes allow you to change the destination URL even after the code is printed, saving you time and costs.
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="p-2 border-t border-border bg-card/50 backdrop-blur-xl flex items-center justify-between gap-2 flex-shrink-0">
        <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest hidden sm:block">Need help? Contact support.</p>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab(GUIDE_SECTIONS[(GUIDE_SECTIONS.findIndex(s => s.id === activeTab) + 1) % GUIDE_SECTIONS.length].id)}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-secondary text-foreground rounded-lg font-black uppercase tracking-widest text-[7px] hover:bg-border transition-all"
          >
            Next
          </button>
          <button 
            onClick={onClose}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-black uppercase tracking-widest text-[7px] shadow-lg shadow-primary/20 transition-all"
          >
            Finish
          </button>
        </div>
      </footer>
    </div>
  );
};
