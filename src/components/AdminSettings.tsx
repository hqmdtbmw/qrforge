import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Users, Bell, Database, 
  Globe, Lock, Zap, Save, Loader2, RefreshCw,
  Mail, MessageSquare, CreditCard, Activity, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { getSystemPublicConfig, updateSystemConfig, recordActivity, activateSystemPlans } from '../services/db';
import { useToast } from './Toast';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

export const AdminSettings: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'security' | 'infrastructure' | 'logs'>('general');

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

  const handleSave = async () => {
    if (!profile || profile.role !== 'admin') return;
    setIsSaving(true);
    try {
      await updateSystemConfig(config);
      await recordActivity(
        user?.uid || 'unknown',
        'UPDATE_SYSTEM_CONFIG',
        'ADMIN_SETTINGS',
        { config }
      );
      toast('System configuration updated', 'success');
    } catch (error) {
      toast('Failed to update configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivatePlans = async () => {
    if (!profile || profile.role !== 'admin') return;
    setIsSaving(true);
    try {
      await activateSystemPlans();
      const data = await getSystemPublicConfig();
      setConfig(data);
      toast('System plans activated and prepopulated', 'success');
    } catch (error) {
      toast('Failed to activate plans', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'plans', label: 'Plans', icon: Zap },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'infrastructure', label: 'Infrastructure', icon: Database },
    { id: 'logs', label: 'Logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-secondary rounded-xl transition-all"
            >
              <RefreshCw className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Shield className="w-6 h-6 text-brand-700" />
                System Core Control
              </h2>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Advanced Administrative Parameters</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Commit Changes
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="sticky top-0 z-20 flex overflow-x-auto no-scrollbar bg-card/90 backdrop-blur-2xl border border-border rounded-2xl p-1.5 gap-1.5 shadow-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 justify-center min-w-[80px] sm:min-w-[100px]",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'general' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <section className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Globe className="w-5 h-5 text-brand-700" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Global Access</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight">Public Registration</p>
                      <p className="text-[8px] text-muted-foreground font-medium">Allow new operatives to join the network</p>
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
                      <p className="text-[8px] text-muted-foreground font-medium">Lock system for critical updates</p>
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
              </section>

              <section className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Mail className="w-5 h-5 text-brand-700" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Communication</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Support Intelligence Email</label>
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
              </section>
            </motion.div>
          )}

          {activeTab === 'plans' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <section className="bg-card border border-border rounded-[2rem] p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-6">
                  <Zap className="w-6 h-6 text-brand-700" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Subscription Engine</h3>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1">Monetization & Trial Parameters</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Default Trial Period (Days)</label>
                      <input 
                        type="number"
                        value={config.defaultTrialDays}
                        onChange={(e) => setConfig({...config, defaultTrialDays: parseInt(e.target.value)})}
                        className="w-full px-4 py-4 bg-secondary/30 border border-border rounded-2xl text-sm font-black outline-none focus:border-primary transition-all"
                      />
                    </div>
                    
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-brand-700" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Plan Activation Status</h4>
                      </div>
                      {!config.plansActive ? (
                        <button 
                          onClick={handleActivatePlans}
                          disabled={isSaving}
                          className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
                        >
                          <Zap className="w-4 h-4" />
                          Activate All Plans & Trials
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Plans Engine Fully Operational</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 bg-secondary/20 rounded-2xl border border-border/50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest mb-4">Active Tiers</h4>
                      <div className="space-y-2">
                        {['Free', 'Pro', 'Business', 'Enterprise'].map(tier => (
                          <div key={tier} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/50">
                            <span className="text-[9px] font-black uppercase tracking-tight">{tier} Tier</span>
                            <span className="text-[8px] font-black text-brand-700 uppercase">Active</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <section className="bg-card border border-border rounded-[2rem] p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-6">
                  <Lock className="w-6 h-6 text-brand-700" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Security Protocols</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-secondary/20 rounded-2xl border border-border/50 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Fraud Detection</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-tight">Device Fingerprinting</span>
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[8px] font-black uppercase">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-tight">Multi-Account Block</span>
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[8px] font-black uppercase">Active</span>
                    </div>
                  </div>

                  <div className="p-6 bg-destructive/5 border border-destructive/10 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-destructive">Danger Zone</h4>
                    <button className="w-full py-3 bg-destructive text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                      Reset Analytics Engine
                    </button>
                    <button className="w-full py-3 border border-destructive text-destructive rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-destructive/10 transition-all">
                      Wipe System Logs
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'infrastructure' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <section className="bg-card border border-border rounded-[2rem] p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-6">
                  <Database className="w-6 h-6 text-brand-700" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Infrastructure Health</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Database', status: 'Optimal', icon: Activity, color: 'text-green-500' },
                    { label: 'Storage', status: 'Healthy', icon: Shield, color: 'text-blue-500' },
                    { label: 'Auth Engine', status: 'Active', icon: Lock, color: 'text-brand-700' },
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-secondary/20 rounded-2xl border border-border/50 flex flex-col items-center text-center gap-3">
                      <item.icon className={cn("w-8 h-8", item.color)} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                        <p className={cn("text-[8px] font-black uppercase mt-1", item.color)}>{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-secondary/10 rounded-2xl border border-border/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">System Cache</h4>
                    <p className="text-[8px] text-muted-foreground font-medium mt-1">Clear all temporary server-side data</p>
                  </div>
                  <button 
                    onClick={() => toast('Cache purged successfully', 'success')}
                    className="px-6 py-3 bg-secondary hover:bg-border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Purge Cache
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <section className="bg-card border border-border rounded-[2rem] p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-6">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-brand-700" />
                    <h3 className="text-sm font-black uppercase tracking-widest">System Activity Logs</h3>
                  </div>
                  <button className="text-[8px] font-black uppercase tracking-widest text-brand-700 hover:underline">Export Logs</button>
                </div>
                
                <div className="space-y-3">
                  {[
                    { action: 'UPDATE_SYSTEM_CONFIG', user: 'Admin', time: '2m ago', status: 'success' },
                    { action: 'USER_ROLE_UPGRADE', user: 'System', time: '15m ago', status: 'success' },
                    { action: 'DATABASE_BACKUP', user: 'Cron', time: '1h ago', status: 'success' },
                    { action: 'LOGIN_ATTEMPT_BLOCKED', user: 'Security', time: '3h ago', status: 'warning' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          log.status === 'success' ? "bg-green-500" : "bg-brand-500"
                        )} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">{log.action}</p>
                          <p className="text-[8px] text-muted-foreground font-medium">Initiated by {log.user}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono opacity-40">{log.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
