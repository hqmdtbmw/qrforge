import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layout, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Save, 
  Sparkles, 
  Eye, 
  ChevronLeft,
  Palette,
  Share2,
  Smartphone,
  Monitor,
  Heart,
  BarChart3,
  Globe,
  Lock,
  Crown
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useToast } from './Toast';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { createQRCode, updateQRCode, subscribeToUserOrganizations } from '../services/db';
import { SOCIAL_TEMPLATES } from '../constants/socialTemplates';
import { SocialProfileLanding } from './SocialProfileLanding';
import { NativeColorPicker } from './ui/NativeColorPicker';
import { cn } from '../lib/utils';
import { PricingModal } from './PricingModal';

interface SocialStudioProps {
  initialData?: any;
  onClose?: () => void;
  orgId?: string;
}

const SocialStudio: React.FC<SocialStudioProps> = ({ initialData, onClose, orgId }) => {
  const { user, profile: userProfile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isDemoUser = user?.uid === 'demo-user-123';
  const isPro = !isDemoUser && (['pro', 'business', 'admin'].includes(userProfile?.role || '') || userProfile?.subscription?.status === 'trialing');
  const [isSaving, setIsSaving] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgId || location.state?.orgId || initialData?.orgId || '');
  const [userOrgs, setUserOrgs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserOrganizations(user.uid, setUserOrgs);
      return () => unsubscribe();
    }
  }, [user]);
  
  const [profile, setProfile] = useState({
    name: initialData?.fields?.profileName || initialData?.name || '',
    bio: initialData?.fields?.profileBio || initialData?.bio || '',
    image: initialData?.fields?.profileImage || initialData?.image || '',
    templateId: initialData?.fields?.templateId || initialData?.templateId || 'modern-dark',
    links: initialData?.fields?.links || initialData?.links || [
      { id: nanoid(4), title: 'My Website', url: 'https://example.com', icon: 'Globe' },
      { id: nanoid(4), title: 'Instagram', url: 'https://instagram.com', icon: 'Instagram' }
    ],
    socials: initialData?.fields?.socials || initialData?.socials || {
      instagram: '',
      twitter: '',
      linkedin: '',
      github: '',
      youtube: ''
    },
    branding: initialData?.fields?.branding || initialData?.branding || {
      primaryColor: '#ff5c00',
      fontFamily: 'font-sans',
      buttonStyle: 'rounded-xl',
      customDomain: initialData?.fields?.branding?.customDomain || ''
    }
  });

  const handleAddLink = () => {
    setProfile(prev => ({
      ...prev,
      links: [...prev.links, { id: nanoid(4), title: 'New Link', url: '', icon: 'Link' }]
    }));
  };

  const handleRemoveLink = (id: string) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.filter((l: any) => l.id !== id)
    }));
  };

  const handleUpdateLink = (id: string, updates: any) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.map((l: any) => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const handleSave = async (isDraft = false) => {
    if (!user) return;
    if (!profile.name) {
      toast('Please enter a profile name', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: profile.name,
        qrType: 'social',
        type: 'dynamic',
        status: isDraft ? 'draft' : 'active',
        orgId: selectedOrgId || null,
        fields: {
          profileName: profile.name,
          profileBio: profile.bio,
          profileImage: profile.image,
          templateId: profile.templateId,
          links: profile.links,
          socials: profile.socials,
          branding: profile.branding
        },
        updatedAt: Timestamp.now(),
      };

      if (initialData?.id) {
        await updateQRCode(initialData.id, data);
        toast(isDraft ? 'Draft updated' : 'Profile updated', 'success');
      } else {
        const shortId = nanoid(8);
        await createQRCode(user.uid, {
          ...data,
          shortId,
          createdAt: Timestamp.now(),
          stats: { totalScans: 0, likes: 0 }
        });
        toast(isDraft ? 'Draft saved' : 'Profile created', 'success');
      }
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving social profile:', error);
      toast('Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Controls */}
      <div className={cn(
        "w-full md:w-[400px] h-full border-r border-border bg-card flex flex-col overflow-hidden transition-all duration-500",
        showMobilePreview ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-xl transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">Social Studio</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Award-Winning Profiles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {initialData?.shortId && (
              <button 
                onClick={() => {
                  const link = `${window.location.origin}/view/${initialData.shortId}`;
                  navigator.clipboard.writeText(link);
                  toast('Profile link copied!', 'success');
                }}
                className="p-2 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-all"
                title="Copy Profile Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-3 py-2 bg-secondary text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              DRAFT
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Save className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              PUBLISH
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Profile Info */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Layout className="w-3 h-3" />
              Profile Identity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary/50 transition-all overflow-hidden">
                    {profile.image ? (
                      <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Image URL"
                    value={profile.image}
                    onChange={(e) => setProfile({ ...profile, image: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Display Name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <select 
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase tracking-widest"
                    >
                      <option value="">Personal</option>
                      {userOrgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Short Bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-xl text-[10px] font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Branding & Style */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Palette className="w-3 h-3" />
              Branding & Style
            </h3>
            <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-4">
              <NativeColorPicker
                label="Primary Accent Color"
                value={profile.branding.primaryColor}
                onChange={(val) => setProfile({ 
                  ...profile, 
                  branding: { ...profile.branding, primaryColor: val } 
                })}
              />

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Button Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['rounded-none', 'rounded-xl', 'rounded-full'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setProfile({ 
                        ...profile, 
                        branding: { ...profile.branding, buttonStyle: style } 
                      })}
                      className={cn(
                        "py-2 px-1 border text-[8px] font-bold uppercase transition-all",
                        style,
                        profile.branding.buttonStyle === style ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                      )}
                    >
                      {style.split('-')[1]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Custom Domain (Pro)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="links.yourdomain.com"
                    value={profile.branding.customDomain}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      branding: { ...profile.branding, customDomain: e.target.value } 
                    })}
                    disabled={!isPro}
                    className="flex-1 px-4 py-2 bg-secondary/50 border border-border rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                  />
                  {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
              </div>
            </div>
          </section>

          {/* Template Selection */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Palette className="w-3 h-3" />
              Premium Templates
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SOCIAL_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setProfile({ ...profile, templateId: template.id })}
                  className={cn(
                    "p-3 rounded-2xl border transition-all text-left relative group overflow-hidden",
                    profile.templateId === template.id 
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
                      : "border-border bg-secondary/20 hover:bg-secondary/40"
                  )}
                >
                  <p className="text-[10px] font-black uppercase tracking-tight truncate">{template.name}</p>
                  <p className="text-[8px] text-muted-foreground mt-1 font-medium">Template</p>
                  {profile.templateId === template.id && (
                    <div className="absolute top-2 right-2">
                      <Sparkles className="w-3 h-3 text-brand-700" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Links Management */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <LinkIcon className="w-3 h-3" />
                Smart Links
              </h3>
              <button 
                onClick={handleAddLink}
                className="text-[10px] font-black text-brand-700 uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Link
              </button>
            </div>
            <div className="space-y-3">
              {profile.links.map((link: any) => (
                <motion.div 
                  layout
                  key={link.id} 
                  className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-3 relative group"
                >
                  <button 
                    onClick={() => handleRemoveLink(link.id)}
                    className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Link Title"
                    value={link.title}
                    onChange={(e) => handleUpdateLink(link.id, { title: e.target.value })}
                    className="w-full bg-transparent text-xs font-bold outline-none focus:text-brand-700 transition-colors"
                  />
                  <input 
                    type="text" 
                    placeholder="URL (https://...)"
                    value={link.url}
                    onChange={(e) => handleUpdateLink(link.id, { url: e.target.value })}
                    className="w-full bg-transparent text-[10px] text-muted-foreground outline-none focus:text-foreground transition-colors"
                  />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Social Icons */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Share2 className="w-3 h-3" />
              Social Presence
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {Object.keys(profile.socials).map((platform) => (
                <div key={platform} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl border border-border">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20">{platform}</span>
                  <input 
                    type="text" 
                    placeholder={`@username or URL`}
                    value={profile.socials[platform as keyof typeof profile.socials]}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      socials: { ...profile.socials, [platform]: e.target.value } 
                    })}
                    className="flex-1 bg-transparent text-[10px] font-bold outline-none focus:text-brand-700"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Preview Area */}
      <div className={cn(
        "flex-1 bg-secondary/30 flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden transition-all duration-500",
        !showMobilePreview ? "hidden md:flex" : "flex"
      )}>
        {/* Mobile Back to Edit Button */}
        <button 
          onClick={() => setShowMobilePreview(false)}
          className="absolute top-6 left-6 z-[110] md:hidden p-3 bg-card border border-border rounded-2xl shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" />
          Edit
        </button>

        {/* Preview Controls */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border shadow-xl z-20">
          <button 
            onClick={() => setPreviewMode('mobile')}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
              previewMode === 'mobile' ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
            )}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </button>
          <button 
            onClick={() => setPreviewMode('desktop')}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
              previewMode === 'desktop' ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
            )}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </button>
        </div>

        {/* Device Frame */}
        <div className={cn(
          "transition-all duration-500 ease-out relative",
          previewMode === 'mobile' 
            ? "w-[320px] h-[640px] rounded-[1.5rem] border-[8px] border-foreground shadow-2xl overflow-hidden" 
            : "w-full max-w-5xl h-[700px] rounded-2xl border border-border shadow-2xl overflow-hidden"
        )}>
          {/* Mock Browser/Device Header */}
          <div className="h-12 bg-card border-b border-border flex items-center px-6 gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
            <div className="flex-1 bg-secondary/50 rounded-lg h-6 flex items-center px-3">
              <Globe className="w-3 h-3 text-muted-foreground mr-2" />
              <span className="text-[10px] text-muted-foreground font-medium truncate">qrforge.app/{profile.name.toLowerCase().replace(/\s+/g, '-')}</span>
            </div>
          </div>

          <div className="absolute inset-0 top-12 overflow-y-auto custom-scrollbar bg-background">
            <SocialProfileLanding 
              isPreview={true}
              data={{
                id: initialData?.id,
                fields: {
                  ...profile,
                  profileName: profile.name,
                  profileBio: profile.bio,
                  profileImage: profile.image,
                  socialLinks: profile.links.map((l: any) => ({
                    id: l.id,
                    platform: l.icon,
                    url: l.url,
                    label: l.title
                  }))
                }
              }} 
              views={1240}
            />
          </div>
        </div>

        {/* Floating Stats Indicator */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-3">
          <div className="p-4 bg-card rounded-2xl border border-border shadow-xl flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Heart className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Likes</p>
                <p className="text-sm font-bold">85</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Views</p>
                <p className="text-sm font-bold">1.2k</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[120] md:hidden">
        <button 
          onClick={() => setShowMobilePreview(!showMobilePreview)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all"
        >
          {showMobilePreview ? <Layout className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
        </button>
      </div>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
};

export default SocialStudio;
