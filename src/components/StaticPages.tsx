import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Shield, FileText, Info, Globe, Mail, MapPin, Loader2, Zap } from 'lucide-react';
import { getStaticPage } from '../services/db';
import Markdown from 'react-markdown';

interface StaticPageProps {
  onClose: () => void;
  type: 'about' | 'privacy' | 'terms';
}

export const StaticPage: React.FC<StaticPageProps> = ({ onClose, type }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      const data = await getStaticPage(type);
      setPageData(data);
      setLoading(false);
    };
    fetchPage();
  }, [type]);

  const defaultContent = {
    about: {
      title: 'About QRForge',
      icon: <Info className="w-8 h-8 text-brand-700" />,
      body: `
# The Motivation Behind QRForge

QRForge was born out of a simple, yet frustrating realization. I wanted a high-quality, customizable, and trackable QR code generator for my projects, but I couldn't find a single one that was truly free and didn't lock essential features behind a paywall or clutter the experience with ads.

So, I decided to build my own.

What started as a personal tool has evolved into a powerful platform for innovators, designers, and businesses who demand excellence without the unnecessary friction.

## Our Vision
To provide the world with the most elegant, secure, and data-intelligent QR technology, accessible to everyone who wants to bridge the physical and digital worlds.

## Built for You
Whether you're a creator launching a new brand or an enterprise managing thousands of assets, QRForge is engineered to scale with your ambition.
      `
    },
    privacy: {
      title: 'Privacy Policy',
      icon: <Shield className="w-8 h-8 text-brand-700" />,
      body: `
# Privacy Policy
*Last Updated: April 09, 2026*

## 1. Data Collection
We collect minimal data necessary to provide our services. This includes your email, display name, and scan analytics for your QR codes (location, device type, timestamp).

## 2. Use of Data
Your data is used solely to manage your account and provide you with analytics. We never sell your personal information to third parties.

## 3. Security
We use industry-standard encryption and Firebase security protocols to ensure your data remains private and secure.
      `
    },
    terms: {
      title: 'Terms of Service',
      icon: <FileText className="w-8 h-8 text-brand-700" />,
      body: `
# Terms of Service
*Last Updated: April 09, 2026*

## 1. Acceptance
By using QRForge, you agree to these terms. If you do not agree, please do not use our services.

## 2. Usage Limits
Free accounts are limited to 5 assets and 1,000 scans per month. Pro accounts enjoy unlimited assets and advanced analytics.

## 3. Prohibited Content
You may not use QRForge to link to illegal, harmful, or malicious content. We reserve the right to terminate accounts that violate these rules.
      `,
      illustrative: [
        { icon: <Shield className="w-5 h-5" />, title: "Secure Forge", desc: "All QR codes are generated with industry-standard encryption." },
        { icon: <Globe className="w-5 h-5" />, title: "Global Access", desc: "Your dynamic links are accessible from anywhere in the world." },
        { icon: <Zap className="w-5 h-5" />, title: "Fair Usage", desc: "We maintain a strict policy against spam and malicious redirects." }
      ]
    }
  };

  const active = pageData || defaultContent[type];
  const icon = defaultContent[type].icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-[3rem] border border-border shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between bg-secondary/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center shadow-sm">
              {icon}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">{active.title}</h2>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Legal & Information</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 prose prose-orange dark:prose-invert max-w-none prose-sm">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-brand-700 animate-spin" />
                </div>
              ) : (
                <div className="markdown-body">
                  <Markdown>{active.body || active.content}</Markdown>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rules of Engagement</h4>
              <div className="space-y-3">
                {(active.illustrative || defaultContent.terms.illustrative).map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-secondary/30 rounded-2xl border border-border/50 space-y-2">
                    <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-brand-700 shadow-sm">
                      {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="text-[9px] font-black uppercase tracking-widest">{item.title}</h5>
                      <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-brand-700">Compliance</h5>
                </div>
                <p className="text-[9px] text-brand-700/80 font-black leading-relaxed uppercase tracking-tight">
                  QRForge is fully compliant with GDPR and international data protection standards.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border bg-secondary/10 flex justify-between items-center">
          <div className="flex gap-3">
            <div className="w-7 h-7 bg-background rounded-lg flex items-center justify-center border border-border">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="w-7 h-7 bg-background rounded-lg flex items-center justify-center border border-border">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">© 2026 QRForge. Built by Daniel Innocent @mdtbmw</p>
        </div>
      </motion.div>
    </div>
  );
};

