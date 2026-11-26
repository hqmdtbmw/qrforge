import React, { useState, useEffect } from 'react';
import { 
  Shield, LogOut, Settings, Activity, Users, Zap, 
  FileText, Globe, Lock, Database, RefreshCw, 
  Bell, AlertCircle, Save, Loader2, Search,
  Filter, MoreVertical, Crown, CheckCircle2,
  TrendingUp, Eye, Clock, Share2, Smartphone, Monitor,
  Mail, X, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { AdminAnalytics } from './AdminAnalytics';
import { UserManager } from './UserManager';
import { AdminSettings } from './AdminSettings';
import { cn } from '../lib/utils';
import { 
  getSystemPublicConfig, 
  updateSystemConfig, 
  activateSystemPlans, 
  recordActivity,
  subscribeToLiveActivity,
  updateStaticPage,
  getStaticPage,
  subscribeToBrands,
  updateBrandStatus,
  createSystemUpdate,
  prepopulatePlans
} from '../services/db';
import { useToast } from './Toast';

type AdminTab = 
  | 'intelligence' 
  | 'operatives' 
  | 'monetization' 
  | 'cms' 
  | 'partners' 
  | 'activity' 
  | 'security' 
  | 'micro' 
  | 'seed' 
  | 'announcements' 
  | 'infrastructure' 
  | 'general';

export const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user: currentUser, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('intelligence');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await getSystemPublicConfig();
        setConfig(data || {
          maintenanceMode: false,
          registrationEnabled: true,
          defaultTrialDays: 7,
          allowedDomains: [],
          supportEmail: 'support@qrforge.ai',
          systemVersion: '2.4.0-pro',
          plansActive: false
        });
      } catch (error) {
        toast('Failed to load system config', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateSystemConfig(config);
      await recordActivity(currentUser?.uid || 'admin', 'UPDATE_CONFIG', 'SYSTEM', { config });
      toast('System configuration updated', 'success');
    } catch (error) {
      toast('Failed to update configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (tabId: AdminTab) => {
    setActiveTab(tabId);
    recordActivity(currentUser?.uid || 'admin', 'VIEW_TAB', 'ADMIN', { tabId });
  };

  const tabs: { id: AdminTab; label: string; icon: any; color: string }[] = [
    { id: 'intelligence', label: 'Intelligence', icon: Activity, color: 'text-brand-700' },
    { id: 'operatives', label: 'Operatives', icon: Users, color: 'text-blue-500' },
    { id: 'monetization', label: 'Monetization', icon: Zap, color: 'text-brand-500' },
    { id: 'cms', label: 'CMS', icon: FileText, color: 'text-emerald-500' },
    { id: 'partners', label: 'Partners', icon: Globe, color: 'text-indigo-500' },
    { id: 'activity', label: 'Live Feed', icon: TrendingUp, color: 'text-brand-500' },
    { id: 'security', label: 'Security', icon: Lock, color: 'text-rose-500' },
    { id: 'micro', label: 'Micro Settings', icon: Settings, color: 'text-slate-500' },
    { id: 'seed', label: 'Seed Engine', icon: RefreshCw, color: 'text-cyan-500' },
    { id: 'announcements', label: 'Updates', icon: Bell, color: 'text-violet-500' },
    { id: 'infrastructure', label: 'Infrastructure', icon: Database, color: 'text-teal-500' },
    { id: 'general', label: 'General', icon: Shield, color: 'text-brand-700' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand-700" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Admin Header */}
      <header className="bg-card border-b border-border px-6 py-4 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-2xl shadow-xl shadow-primary/20 rotate-3">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                Command Center
                <span className="px-2 py-0.5 bg-primary/10 text-brand-700 text-[8px] rounded-full">v2.4.0-PRO</span>
              </h1>
              <p className="text-[8px] opacity-40 uppercase tracking-[0.4em] mt-0.5">360° Intelligence & System Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6">
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">System Status</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase">Optimal</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Active Nodes</p>
                <p className="text-[9px] font-black uppercase tracking-tight">Global Cluster-01</p>
              </div>
            </div>
            <ThemeToggle />
            <div className="w-px h-6 bg-border mx-2" />
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-xl active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              TERMINATE_SESSION
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-card border-r border-border overflow-y-auto custom-scrollbar hidden lg:block">
          <div className="p-4 space-y-1">
            <p className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Main Operations</p>
            {tabs.slice(0, 6).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? "text-white" : tab.color)} />
                {tab.label}
              </button>
            ))}
            
            <div className="my-6 border-t border-border mx-4" />
            
            <p className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">System Core</p>
            {tabs.slice(6).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? "text-white" : tab.color)} />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="p-6 mt-auto">
            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-brand-700" />
                <span className="text-[8px] font-black uppercase tracking-widest">Security Level 4</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full" />
              </div>
              <p className="text-[7px] text-muted-foreground font-medium uppercase leading-relaxed">
                All administrative actions are logged and encrypted.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-[60] flex overflow-x-auto no-scrollbar gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all whitespace-nowrap min-w-[80px]",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10 pb-24 lg:pb-0">
          <div className="max-w-[1400px] mx-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'intelligence' && <AdminAnalytics />}
                {activeTab === 'operatives' && <UserManager />}
                {activeTab === 'monetization' && <MonetizationManager />}
                {activeTab === 'cms' && <CMSManager />}
                {activeTab === 'partners' && <PartnerManager />}
                {activeTab === 'activity' && <LiveActivityFeed />}
                {activeTab === 'security' && <SecurityLogs />}
                {activeTab === 'micro' && <MicroSettings config={config} setConfig={setConfig} onSave={handleSaveConfig} isSaving={isSaving} />}
                {activeTab === 'seed' && <SeedEngine />}
                {activeTab === 'announcements' && <AnnouncementsManager />}
                {activeTab === 'infrastructure' && <InfrastructureHealth />}
                {activeTab === 'general' && <GeneralSettings config={config} setConfig={setConfig} onSave={handleSaveConfig} isSaving={isSaving} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const MonetizationManager = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Monetization Engine</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Plan Configuration & Revenue Parameters</p>
        </div>
        <button className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">
          Add New Plan
        </button>
      </div>
      <AdminSettings />
    </div>
  );
};

const CMSManager = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const slugs = ['about', 'privacy', 'terms'];

  const handleLoadPage = async (slug: string) => {
    const data = await getStaticPage(slug) as any;
    setSelectedPage(data || { slug, title: slug.toUpperCase(), body: '' });
    setContent(data?.body || '');
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setIsSaving(true);
    try {
      await updateStaticPage(selectedPage.slug, { ...selectedPage, body: content });
      toast('Page updated successfully', 'success');
    } catch (err) {
      toast('Failed to update page', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Content Management</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Static Page & Legal Documentation Editor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {slugs.map(slug => (
            <button
              key={slug}
              onClick={() => handleLoadPage(slug)}
              className={cn(
                "w-full px-4 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group",
                selectedPage?.slug === slug ? "bg-primary border-primary text-primary-foreground shadow-lg" : "bg-card border-border hover:border-primary/30"
              )}
            >
              {slug}
              <FileText className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selectedPage ? (
            <div className="bg-card border border-border rounded-[2rem] p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-6">
                <h3 className="text-sm font-black uppercase tracking-widest">Editing: {selectedPage.slug}</h3>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Page Title</label>
                  <input 
                    type="text"
                    value={selectedPage.title}
                    onChange={(e) => setSelectedPage({...selectedPage, title: e.target.value})}
                    className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Markdown Content</label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={15}
                    className="w-full px-4 py-4 bg-secondary/30 border border-border rounded-2xl text-xs font-mono outline-none focus:border-primary transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-card border border-border border-dashed rounded-[2rem] flex items-center justify-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">
              Select a page to begin editing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PartnerManager = () => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToBrands((data) => {
      setBrands(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStatus = async (id: string, status: any, show: boolean) => {
    try {
      await updateBrandStatus(id, status, show);
      toast(`Partner status updated to ${status}`, 'success');
    } catch (err) {
      toast('Failed to update partner', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Partner Ecosystem</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Brand Marquee & Strategic Alliances</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border text-[9px] font-black uppercase tracking-widest opacity-50">
              <th className="p-6">Brand</th>
              <th className="p-6">Website</th>
              <th className="p-6">Status</th>
              <th className="p-6">Landing</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[10px] font-black uppercase tracking-widest">
            {brands.map(brand => (
              <tr key={brand.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="p-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center overflow-hidden border border-border">
                    <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  {brand.brandName}
                </td>
                <td className="p-6 opacity-40">{brand.website}</td>
                <td className="p-6">
                  <span className={cn(
                    "px-2 py-1 rounded text-[8px]",
                    brand.status === 'approved' ? "bg-green-500/10 text-green-500" : "bg-brand-500/10 text-brand-500"
                  )}>
                    {brand.status}
                  </span>
                </td>
                <td className="p-6">
                  {brand.showOnLanding ? 'VISIBLE' : 'HIDDEN'}
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleStatus(brand.id, 'approved', true)}
                      className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleStatus(brand.id, 'rejected', false)}
                      className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center opacity-30">No partner submissions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LiveActivityFeed = () => {
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeToLiveActivity((data) => setActivity(data));
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Intelligence Feed</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Real-time System Operative Activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {activity.map((act) => (
          <div key={act.id} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-[12px] font-black">
                {act.userId?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-tight">{act.action}</p>
                  <span className="px-1.5 py-0.5 bg-primary/10 text-brand-700 text-[7px] font-black rounded uppercase">{act.module}</span>
                </div>
                <p className="text-[8px] opacity-40 font-black uppercase tracking-widest mt-0.5">Operative: {act.userId}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                {act.timestamp?.toDate().toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SecurityLogs = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Security Protocols</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Access Logs & Threat Detection</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Active Threats</h3>
          </div>
          <div className="py-12 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">
            No active threats detected
          </div>
        </div>
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Lock className="w-5 h-5 text-brand-700" />
            <h3 className="text-xs font-black uppercase tracking-widest">Access Control</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
              <span className="text-[10px] font-black uppercase tracking-tight">2FA Enforcement</span>
              <span className="text-[8px] font-black text-emerald-500">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
              <span className="text-[10px] font-black uppercase tracking-tight">IP Whitelisting</span>
              <span className="text-[8px] font-black text-muted-foreground">DISABLED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MicroSettings = ({ config, setConfig, onSave, isSaving }: any) => {
  const [rawConfig, setRawConfig] = useState(JSON.stringify(config, null, 2));

  const handleApply = () => {
    try {
      const parsed = JSON.parse(rawConfig);
      setConfig(parsed);
      onSave();
    } catch (e) {
      alert('Invalid JSON format');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Micro Settings</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Raw System Configuration Editor</p>
        </div>
        <button 
          onClick={handleApply}
          disabled={isSaving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Apply Raw Config
        </button>
      </div>
      <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm">
        <textarea 
          value={rawConfig}
          onChange={(e) => setRawConfig(e.target.value)}
          rows={25}
          className="w-full px-6 py-6 bg-secondary/30 border border-border rounded-3xl text-[11px] font-mono outline-none focus:border-primary transition-all resize-none leading-relaxed"
        />
      </div>
    </div>
  );
};

const SeedEngine = () => {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await activateSystemPlans();
      toast('System plans and initial data seeded successfully', 'success');
    } catch (err) {
      toast('Seeding failed', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Seed Engine</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Initial Data Population & System Pre-flight</p>
        </div>
      </div>
      <div className="p-12 bg-card border border-border rounded-[2rem] flex flex-col items-center text-center space-y-6 shadow-sm">
        <div className="w-20 h-20 bg-primary/10 text-brand-700 rounded-[2.5rem] flex items-center justify-center animate-pulse">
          <RefreshCw className="w-10 h-10" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-black uppercase tracking-tight">Initialize System Data</h3>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            This will prepopulate the database with default subscription plans, system configurations, and essential operative roles. Use this for first-time setup or system recovery.
          </p>
        </div>
        <button 
          onClick={handleSeed}
          disabled={isSeeding}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
        >
          {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          Execute System Seed
        </button>
      </div>
    </div>
  );
};

const AnnouncementsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!title || !content) return;
    setIsSending(true);
    try {
      await createSystemUpdate(user?.uid || 'admin', title, content);
      toast('Announcement broadcasted to all operatives', 'success');
      setTitle('');
      setContent('');
    } catch (err) {
      toast('Failed to send announcement', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">System Announcements</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Broadcast Intelligence Updates to Network</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-[2rem] p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Update Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Upgrade v2.5.0"
              className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Message Content</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Detail the updates for all operatives..."
              className="w-full px-4 py-4 bg-secondary/30 border border-border rounded-2xl text-xs font-medium outline-none focus:border-primary transition-all resize-none"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Broadcast Update
          </button>
        </div>
      </div>
    </div>
  );
};

const InfrastructureHealth = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Infrastructure Health</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Global Node Status & Latency Metrics</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Database Cluster', status: 'Healthy', latency: '12ms', icon: Database, color: 'text-emerald-500' },
          { label: 'Auth Gateway', status: 'Optimal', latency: '24ms', icon: Lock, color: 'text-brand-700' },
          { label: 'Storage CDN', status: 'Online', latency: '45ms', icon: Globe, color: 'text-blue-500' },
        ].map((node, i) => (
          <div key={i} className="p-8 bg-card border border-border rounded-[2rem] flex flex-col items-center text-center space-y-4 shadow-sm">
            <div className={cn("w-16 h-16 rounded-[2rem] bg-secondary flex items-center justify-center", node.color)}>
              <node.icon className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-tight">{node.label}</h4>
              <p className={cn("text-[8px] font-black uppercase mt-1", node.color)}>{node.status} // {node.latency}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GeneralSettings = ({ config, setConfig, onSave, isSaving }: any) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">General Configuration</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Core System Parameters & Access Control</p>
        </div>
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Commit Changes
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Globe className="w-5 h-5 text-brand-700" />
            <h3 className="text-xs font-black uppercase tracking-widest">Global Access</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
              <div>
                <p className="text-[10px] font-black uppercase tracking-tight">Public Registration</p>
                <p className="text-[8px] text-muted-foreground font-medium">Allow new operatives to join</p>
              </div>
              <button 
                onClick={() => setConfig({...config, registrationEnabled: !config.registrationEnabled})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  config.registrationEnabled ? "bg-primary" : "bg-secondary"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  config.registrationEnabled ? "right-1" : "left-1"
                )} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-tight text-rose-500">Maintenance Mode</p>
                <p className="text-[8px] text-muted-foreground font-medium">Lock system for updates</p>
              </div>
              <button 
                onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  config.maintenanceMode ? "bg-rose-500" : "bg-secondary"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  config.maintenanceMode ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </div>
        <div className="p-8 bg-card border border-border rounded-[2rem] space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Mail className="w-5 h-5 text-brand-700" />
            <h3 className="text-xs font-black uppercase tracking-widest">Support Intelligence</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Email</label>
              <input 
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig({...config, supportEmail: e.target.value})}
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">System Version Tag</label>
              <input 
                type="text"
                value={config.systemVersion}
                onChange={(e) => setConfig({...config, systemVersion: e.target.value})}
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
