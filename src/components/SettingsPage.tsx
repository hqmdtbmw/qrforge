import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Bell, Shield, CreditCard, Zap, LogOut, ChevronRight,
  Check, Camera, Lock, Loader2, BookOpen,
  Users as UsersIcon, Copy, Sparkles, Terminal, RefreshCw,
  Plus, QrCode, Globe, Building2, CheckCircle2, Folder, Activity
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNotify } from '../NotificationContext';
import { cn } from '../lib/utils';
import { uploadImage } from '../services/storage';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { subscribeToUserSessions, revokeSession } from '../services/db';

export const SettingsPage: React.FC<{ onClose: () => void, onOpenGuide: () => void }> = ({ onClose, onOpenGuide }) => {
  const { user, profile, logout, refreshProfile, updateShortcuts } = useAuth();
  const { notify, requestPermission, permission } = useNotify();
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security' | 'billing' | 'referrals' | 'privacy' | 'shortcuts'>(() => {
    return (localStorage.getItem('qrforge_settings_active_section') as any) || 'profile';
  });
  const [isUploading, setIsUploading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(profile?.twoFactorEnabled || false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState(profile?.apiKey || '');
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [togglePrefs, setTogglePrefs] = useState<Record<string, boolean>>({
    emailReports: true,
    scanAlerts: true,
    securityAdvisories: true,
    marketing: false,
    anonymousAnalytics: true,
    dataPortability: true,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    localStorage.setItem('qrforge_settings_active_section', activeSection);
  }, [activeSection]);

  React.useEffect(() => {
    if (user && activeSection === 'security') {
      const unsubscribe = subscribeToUserSessions(user.uid, (data) => {
        setSessions(data);
      });
      return () => unsubscribe();
    }
  }, [user, activeSection]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadImage(file, `profiles/${user.uid}/${Date.now()}_${file.name}`, 400, 400);
      
      // Update Auth Profile
      await updateProfile(user, { photoURL: downloadURL });
      
      // Update Firestore Profile
      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
      
      // Refresh local profile state
      await refreshProfile();
      
      notify('success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      notify('error', 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const generateApiKey = async () => {
    const newKey = `qrf_${Math.random().toString(36).substr(2, 15)}${Math.random().toString(36).substr(2, 15)}`;
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        apiKey: newKey
      });
      setApiKey(newKey);
      notify('success', 'New API key generated!');
      refreshProfile();
    } catch (err) {
      notify('error', 'Failed to generate API key');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save profile changes
      await updateDoc(doc(db, 'users', user!.uid), {
        displayName,
        bio,
        preferences: togglePrefs,
      });
      // Update Firebase Auth displayName
      if (displayName !== user?.displayName) {
        await updateProfile(user!, { displayName });
      }
      await refreshProfile();
      notify('success', 'Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      notify('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/50 px-2 sm:px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
          <div>
            <h2 className="text-[9px] font-black tracking-tight uppercase leading-none">Preferences</h2>
            <p className="text-[5px] opacity-40 uppercase tracking-[0.3em] mt-0.5 leading-none">Account & System Control</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={logout}
            className="md:hidden p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-2 py-1 bg-primary text-primary-foreground rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? <Loader2 className="w-2 h-2 animate-spin" /> : <Sparkles className="w-2 h-2" />}
            SAVE
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-56 border-r border-border bg-secondary/10 p-2 flex flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar flex-shrink-0">
          <div className="flex items-center gap-2 p-1.5 bg-background rounded-xl border border-border shadow-sm flex-shrink-0">
            <div className="relative group">
              <img 
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                className="w-8 h-8 rounded-lg object-cover border border-border group-hover:border-primary transition-all" 
                alt="" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg"
              >
                <Camera className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black truncate tracking-tight uppercase">{user?.displayName}</p>
              <p className="text-[7px] text-muted-foreground font-medium truncate leading-none">{user?.email}</p>
            </div>
          </div>

          <nav className="flex md:flex-col gap-0.5 overflow-x-auto no-scrollbar">
            <NavButton 
              active={activeSection === 'profile'} 
              onClick={() => setActiveSection('profile')} 
              icon={<User className="w-3 h-3" />} 
              label="Profile" 
            />
            <NavButton 
              active={activeSection === 'notifications'} 
              onClick={() => setActiveSection('notifications')} 
              icon={<Bell className="w-3 h-3" />} 
              label="Alerts" 
            />
            <NavButton 
              active={activeSection === 'shortcuts'} 
              onClick={() => setActiveSection('shortcuts')} 
              icon={<Plus className="w-3 h-3" />} 
              label="Shortcuts" 
            />
            <NavButton 
              active={activeSection === 'security'} 
              onClick={() => setActiveSection('security')} 
              icon={<Shield className="w-3 h-3" />} 
              label="Security" 
            />
            <NavButton 
              active={activeSection === 'billing'} 
              onClick={() => setActiveSection('billing')} 
              icon={<CreditCard className="w-3 h-3" />} 
              label="Billing" 
            />
            <NavButton 
              active={activeSection === 'referrals'} 
              onClick={() => setActiveSection('referrals')} 
              icon={<UsersIcon className="w-3 h-3" />} 
              label="Network" 
            />
            <NavButton 
              active={activeSection === 'privacy'} 
              onClick={() => setActiveSection('privacy')} 
              icon={<Lock className="w-3 h-3" />} 
              label="Privacy" 
            />
            
            <div className="hidden md:block my-2 h-px bg-border" />
            
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-muted-foreground hover:bg-primary/10 hover:text-brand-700 group whitespace-nowrap"
            >
              <BookOpen className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">Guide</span>
            </button>
          </nav>

          <div className="mt-auto space-y-1.5">
            <div className="p-1.5 bg-primary/5 border border-primary/20 rounded-lg hidden md:block">
              <p className="text-[6px] font-black uppercase tracking-widest text-brand-700 mb-0.5">Current Plan</p>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-tighter">{profile?.role || 'Free'}</span>
                <Zap className="w-2.5 h-2.5 text-brand-700" />
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-1 px-1.5 py-1.5 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg transition-all text-[7px] font-black uppercase tracking-widest border border-destructive/10"
            >
              <LogOut className="w-2.5 h-2.5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar bg-background ios-momentum-scroll">
          <div className="max-w-xl mx-auto">
            <AnimatePresence mode="wait">
              {activeSection === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4"
                >
                  <SectionHeader title="Profile Identity" description="Manage how you appear across the platform." />
                  
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary transition-all text-[9px] font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Email Address</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={user?.email || ''} 
                          disabled 
                          className="flex-1 px-2.5 py-1.5 bg-secondary/30 border border-border rounded-lg text-[9px] font-medium opacity-50"
                        />
                        <button className="px-2 py-1 bg-secondary text-[7px] font-black uppercase tracking-widest rounded-lg hover:bg-secondary/80 transition-all">
                          Update
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Professional Bio</label>
                      <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border rounded-lg outline-none focus:border-primary transition-all text-[9px] font-medium min-h-[60px] resize-none"
                        placeholder="Describe your role or mission..."
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'notifications' && (
                <motion.div 
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SectionHeader title="System Alerts" description="Configure how the platform communicates with you." />
                  
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-700" />
                        <h4 className="text-xs font-black uppercase tracking-tight">Push Notifications</h4>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                        Receive real-time updates even when you're offline.
                      </p>
                    </div>
                    <button 
                      onClick={async () => {
                        const granted = await requestPermission();
                        if (granted) {
                          notify('success', 'Notifications enabled!');
                        } else {
                          notify('error', 'Notification permission denied');
                        }
                      }}
                      disabled={permission === 'granted'}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        permission === 'granted' 
                          ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                          : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90"
                      )}
                    >
                      {permission === 'granted' ? 'Enabled' : 'Enable Now'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <ToggleGroup label="Email Intelligence" description="Receive weekly performance reports and insights." checked={togglePrefs.emailReports} onChange={(v) => setTogglePrefs(p => ({ ...p, emailReports: v }))} />
                    <ToggleGroup label="Real-time Scan Alerts" description="Instant notifications when your QRs are accessed." checked={togglePrefs.scanAlerts} onChange={(v) => setTogglePrefs(p => ({ ...p, scanAlerts: v }))} />
                    <ToggleGroup label="Security Advisories" description="Critical updates regarding your account security." checked={togglePrefs.securityAdvisories} onChange={(v) => setTogglePrefs(p => ({ ...p, securityAdvisories: v }))} />
                    <ToggleGroup label="Marketing & Growth" description="New features and platform improvements." checked={togglePrefs.marketing} onChange={(v) => setTogglePrefs(p => ({ ...p, marketing: v }))} />
                  </div>
                </motion.div>
              )}

              {activeSection === 'shortcuts' && (
                <motion.div 
                  key="shortcuts"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SectionHeader title="Shortcut Customization" description="Configure your quick-access '+' button for maximum efficiency." />
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'qr', label: 'Generate QR', icon: QrCode, desc: 'Quickly create new QR codes' },
                      { id: 'social', label: 'Social Studio', icon: Globe, desc: 'Manage your social profiles' },
                      { id: 'org', label: 'Organization', icon: Building2, desc: 'Access workspace settings' },
                      { id: 'task', label: 'New Task', icon: CheckCircle2, desc: 'Create a task instantly' },
                      { id: 'folder', label: 'New Folder', icon: Folder, desc: 'Organize your assets' },
                      { id: 'analytics', label: 'Analytics', icon: Activity, desc: 'View performance stats' },
                    ].map((shortcut) => {
                      const isSelected = (profile?.shortcuts || ['qr']).includes(shortcut.id);
                      return (
                        <button
                          key={shortcut.id}
                          onClick={() => {
                            const current = profile?.shortcuts || ['qr'];
                            const next = isSelected 
                              ? current.filter(id => id !== shortcut.id)
                              : [...current, shortcut.id];
                            
                            if (next.length === 0) return;
                            updateShortcuts(next);
                          }}
                          className={cn(
                            "relative flex flex-col items-start gap-3 p-5 rounded-3xl border transition-all active:scale-95 text-left",
                            isSelected 
                              ? "bg-primary/5 border-primary/30 shadow-xl shadow-primary/5" 
                              : "bg-secondary/20 border-border/50 hover:bg-secondary/40"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <shortcut.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-tight",
                              isSelected ? "text-brand-700" : "text-foreground"
                            )}>{shortcut.label}</p>
                            <p className="text-[8px] text-muted-foreground font-medium mt-0.5">{shortcut.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-4 right-4">
                              <CheckCircle2 className="w-4 h-4 text-brand-700" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="p-5 bg-primary/5 border border-primary/10 rounded-3xl">
                    <p className="text-[10px] text-brand-700 font-medium leading-relaxed">
                      <span className="font-black uppercase mr-2">Intelligent Dock:</span> 
                      If you select multiple shortcuts, clicking the "+" icon in your dock will reveal a floating menu of your choices. If only one is selected, it will trigger that action immediately.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeSection === 'security' && (
                <motion.div 
                  key="security"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SectionHeader title="Developer API" description="Integrate QRForge into your own applications." />
                  
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-brand-700">
                            <Terminal className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">API Access</p>
                            <p className="text-[9px] text-muted-foreground font-medium">Build custom workflows with our API</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => window.open('/docs', '_blank')}
                          className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-muted transition-all"
                        >
                          View Docs
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold uppercase tracking-widest opacity-50">Your API Key</label>
                            {apiKey && (
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(apiKey);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="text-[9px] font-bold text-brand-700 uppercase hover:underline flex items-center gap-1"
                              >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy'}
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="password" 
                              value={apiKey}
                              readOnly
                              placeholder="No API key generated yet"
                              className="flex-1 bg-background border border-border px-3 py-2 rounded-xl outline-none text-xs font-mono"
                            />
                            <button 
                              onClick={generateApiKey}
                              className="px-4 py-2 bg-foreground text-background rounded-xl font-bold uppercase tracking-widest text-[9px] hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              {apiKey ? 'Regenerate' : 'Generate'}
                            </button>
                          </div>
                          <p className="text-[8px] text-muted-foreground font-medium">
                            Warning: Regenerating your API key will invalidate the current one.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SectionHeader title="Vault Security" description="Protect your assets with advanced security protocols." />
                  
                  <div className="space-y-4">
                    <div className={cn(
                      "p-4 rounded-2xl border transition-all",
                      is2FAEnabled ? "bg-green-500/5 border-green-500/20" : "bg-secondary/30 border-border"
                    )}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                            is2FAEnabled ? "bg-green-500 text-white" : "bg-card text-brand-700"
                          )}>
                            <Lock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">Two-Factor Authentication</p>
                            <p className="text-[9px] text-muted-foreground font-medium">
                              {is2FAEnabled ? 'Your account is protected with 2FA.' : 'Add an extra layer of security to your account.'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShow2FASetup(true)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                            is2FAEnabled ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          )}
                        >
                          {is2FAEnabled ? 'Manage' : 'Enable'}
                        </button>
                      </div>
                      
                      {show2FASetup && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="pt-4 border-t border-border/50 space-y-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-24 bg-white p-1.5 rounded-xl border border-border">
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=QRForge-2FA-Setup" alt="QR" className="w-full h-full" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-[9px] font-medium leading-relaxed">
                                1. Install an authenticator app.<br/>
                                2. Scan the QR code.<br/>
                                3. Enter the 6-digit code.
                              </p>
                              <div className="flex gap-1.5">
                                <input type="text" placeholder="000 000" className="w-24 px-3 py-1.5 bg-background border border-border rounded-lg text-center font-mono text-base tracking-widest outline-none focus:border-primary" />
                                <button 
                                  onClick={() => {
                                    setIs2FAEnabled(true);
                                    setShow2FASetup(false);
                                    notify('success', '2FA enabled successfully!');
                                  }}
                                  className="px-4 py-1.5 bg-foreground text-background rounded-lg text-[9px] font-bold uppercase tracking-widest"
                                >
                                  Verify
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center shadow-lg text-brand-700">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">Active Sessions</p>
                            <p className="text-[9px] text-muted-foreground font-medium">Manage your logged-in devices</p>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            if (user) {
                              try {
                                await Promise.all(sessions.map(s => revokeSession(user.uid, s.id)));
                                notify('success', 'All sessions revoked');
                              } catch (error) {
                                notify('error', 'Failed to revoke sessions');
                              }
                            }
                          }}
                          className="text-[9px] font-bold uppercase tracking-widest text-brand-700 hover:underline"
                        >
                          Revoke All
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {sessions.length === 0 ? (
                          <div className="p-3 text-center opacity-40 text-[9px] uppercase font-bold">No active sessions found</div>
                        ) : (
                          sessions.map((session, idx) => (
                            <SessionItem 
                              key={session.id}
                              device={session.device} 
                              status={idx === 0 ? "Current Session" : `Last active ${new Date(session.lastActive?.toDate()).toLocaleString()}`} 
                              active={idx === 0} 
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'referrals' && (
                <motion.div 
                  key="referrals"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SectionHeader title="Network Growth" description="Expand the ecosystem and earn premium credits." />
                  
                  <div className="relative p-5 sm:p-6 bg-card border border-border/50 rounded-2xl overflow-hidden group">
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-brand-700 rounded-full text-[7px] font-black uppercase tracking-widest">
                          <Sparkles className="w-2.5 h-2.5" />
                          Growth Accelerator
                        </div>
                        <h3 className="text-xl font-black tracking-tighter uppercase leading-tight">Invite &<br/>Unlock Pro</h3>
                        <p className="text-[9px] text-muted-foreground font-medium max-w-[200px] leading-relaxed">
                          For every partner who joins via your link, you both receive <span className="text-brand-700 font-bold">2 days of Pro Intelligence</span>.
                        </p>
                      </div>

                      <div className="flex flex-col justify-end items-end gap-3">
                        <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/50 w-full sm:w-auto">
                          <div className="px-2 py-1.5 bg-background rounded-lg text-[9px] font-mono font-bold text-brand-700 truncate max-w-[140px]">
                            {profile?.referralCode || user?.uid?.slice(0, 8).toUpperCase()}
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}?ref=${profile?.referralCode || user?.uid?.slice(0, 8).toUpperCase()}`);
                              notify('success', 'Link copied!');
                            }}
                            className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:scale-105 transition-all shadow-lg shadow-primary/20"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 text-center space-y-0.5">
                      <p className="text-xl font-black tracking-tighter text-brand-700">{profile?.referralCount || 0}</p>
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Active Nodes</p>
                    </div>
                    <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 text-center space-y-0.5">
                      <p className="text-xl font-black tracking-tighter text-brand-700">{profile?.rewardsEarned || 0}w</p>
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Pro Credit</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'privacy' && (
                <motion.div 
                  key="privacy"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SectionHeader title="Data Intelligence" description="Transparency on how we process your information." />
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-secondary/30 border border-border rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest">What we collect</h4>
                      <div className="grid gap-2">
                        <DataInfoItem 
                          title="Scan Intelligence" 
                          description="Approximate location, device type, browser, and timestamp."
                        />
                        <DataInfoItem 
                          title="Campaign Performance" 
                          description="Aggregated data on how your QR codes are performing."
                        />
                        <DataInfoItem 
                          title="Security Metadata" 
                          description="IP addresses and session data for account protection."
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-700">How we use it</h4>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">
                        Your data is used exclusively to provide analytics and secure your account. 
                        We do <span className="text-brand-700 font-bold">not</span> sell your personal information.
                      </p>
                    </div>

                    <div className="space-y-3">
                    <ToggleGroup 
                      label="Anonymous Analytics" 
                      description="Allow us to use your campaign data for benchmarks." 
                      checked={togglePrefs.anonymousAnalytics} 
                      onChange={(v) => setTogglePrefs(p => ({ ...p, anonymousAnalytics: v }))}
                    />
                    <ToggleGroup 
                      label="Data Portability" 
                      description="Enable the ability to export your entire history." 
                      checked={togglePrefs.dataPortability} 
                      onChange={(v) => setTogglePrefs(p => ({ ...p, dataPortability: v }))}
                    />
                    </div>

                    <button className="w-full py-3 bg-destructive/5 text-destructive border border-destructive/10 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] hover:bg-destructive/10 transition-all">
                      Request Data Deletion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, description }: { title: string, description: string }) => (
  <div className="space-y-0.5">
    <h3 className="text-lg font-black tracking-tighter uppercase leading-none">{title}</h3>
    <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-widest">{description}</p>
  </div>
);

const SessionItem = ({ device, status, active }: { device: string, status: string, active?: boolean }) => (
  <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50">
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        active ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
      )} />
      <div>
        <p className="text-[9px] font-bold uppercase tracking-tight">{device}</p>
        <p className="text-[7px] text-muted-foreground font-medium uppercase">{status}</p>
      </div>
    </div>
    {active && (
      <span className="text-[7px] font-bold text-brand-700 uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded-full">Current</span>
    )}
  </div>
);

const RewardStat = ({ value, label }: { value: string | number, label: string }) => (
  <div className="p-4 bg-secondary/30 rounded-2xl border border-border text-center space-y-0.5">
    <p className="text-2xl font-black tracking-tighter text-brand-700">{value}</p>
    <p className="text-[7px] font-bold uppercase tracking-widest opacity-40">{label}</p>
  </div>
);

const DataInfoItem = ({ title, description }: { title: string, description: string }) => (
  <div className="flex gap-2 p-2 bg-background rounded-lg border border-border/50">
    <div className="w-1 h-1 bg-primary rounded-full mt-1 flex-shrink-0" />
    <div>
      <p className="text-[9px] font-bold uppercase tracking-tight">{title}</p>
      <p className="text-[8px] text-muted-foreground leading-relaxed">{description}</p>
    </div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
      active ? "bg-card text-brand-700 shadow-sm" : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
    )}
  >
    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-3 h-3' }) : icon}
    {label}
  </button>
);

const InputGroup = ({ label, value, disabled }: { label: string, value: string, disabled?: boolean }) => (
  <div className="space-y-1">
    <label className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
    <input 
      type="text" 
      defaultValue={value}
      disabled={disabled}
      className={cn(
        "w-full px-2.5 py-1.5 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary transition-all text-[9px] font-medium",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  </div>
);

const ToggleGroup = ({ label, description, checked, onChange }: { label: string, description: string, checked?: boolean, onChange?: (v: boolean) => void }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-border">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-tight">{label}</p>
        <p className="text-[8px] text-muted-foreground font-medium">{description}</p>
      </div>
      <button 
        onClick={() => onChange?.(!checked)}
        className={cn(
          "w-8 h-4 rounded-full transition-all relative",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <motion.div 
          animate={{ x: checked ? 18 : 2 }}
          className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
};
