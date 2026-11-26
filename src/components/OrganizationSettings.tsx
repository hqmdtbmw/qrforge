import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Palette, Plus, Trash2, 
  Mail, Settings, Check, X, Loader2,
  Building2, UserPlus, Crown, Globe
} from 'lucide-react';
import { NativeColorPicker } from './ui/NativeColorPicker';
import { useAuth } from '../AuthContext';
import { useToast } from './Toast';
import { 
  subscribeToUserOrganizations, 
  subscribeToOrgMembers, 
  addOrgMember, 
  updateOrgBranding,
  createOrganization,
  updateOrganization
} from '../services/db';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { PermissionGuard } from './PermissionGuard';
import { hasPermission } from '../lib/permissions';

interface OrganizationSettingsProps {
  orgId?: string | null;
  onBack?: () => void;
  view?: 'members' | 'settings' | 'all';
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ orgId, onBack, view = 'all' }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(orgId || null);

  const currentOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

  useEffect(() => {
    if (orgId) {
      setActiveOrgId(orgId);
    }
  }, [orgId]);

  useEffect(() => {
    if (organizations.length > 0 && !activeOrgId) {
      setActiveOrgId(organizations[0].id);
    }
  }, [organizations]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeOrgs = subscribeToUserOrganizations(user.uid, (orgs) => {
      setOrganizations(orgs);
      setIsLoading(false);
      
      // If orgId is provided, ensure it's the active one
      if (orgId) {
        setActiveOrgId(orgId);
      } else if (orgs.length > 0 && !activeOrgId) {
        setActiveOrgId(orgs[0].id);
      }
    });

    return () => unsubscribeOrgs();
  }, [user, orgId]);

  useEffect(() => {
    if (!currentOrg) return;

    const unsubscribeMembers = subscribeToOrgMembers(currentOrg.id, (data) => {
      setMembers(data);
    });

    return () => unsubscribeMembers();
  }, [currentOrg?.id]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOrgName) return;

    // Check limits
    const orgLimit = profile?.role === 'business' || profile?.role === 'admin' ? 1000 : (profile?.role === 'pro' ? 5 : 1);
    if (organizations.length >= orgLimit) {
      toast(`Plan limit reached. Your plan allows up to ${orgLimit} organization${orgLimit > 1 ? 's' : ''}.`, 'error');
      return;
    }

    try {
      const newOrgId = await createOrganization(user.uid, newOrgName);
      toast('Organization created successfully!', 'success');
      setIsCreatingOrg(false);
      setNewOrgName('');
      if (onBack) {
        onBack();
      } else if (newOrgId) {
        setActiveOrgId(newOrgId);
      }
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !newMemberEmail) return;

    try {
      await addOrgMember(currentOrg.id, newMemberEmail, newMemberRole);
      toast('Member added successfully!', 'success');
      setIsAddingMember(false);
      setNewMemberEmail('');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const handleUpdateBranding = async (branding: any) => {
    if (!currentOrg) return;
    try {
      await updateOrganization(currentOrg.id, { branding });
      toast('Branding updated!', 'success');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const handleRenameOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !newOrgName.trim()) return;
    try {
      await updateOrganization(currentOrg.id, { name: newOrgName });
      toast('Organization renamed!', 'success');
      setIsCreatingOrg(false);
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    );
  }

  if (organizations.length === 0 && !isCreatingOrg) {
    return (
      <div className="max-w-md mx-auto py-10 text-center space-y-4 sm:space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 text-brand-700 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary/10">
          <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Forge Workspace</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Collaborate with your team and manage assets together.</p>
        </div>
        
        <div className="space-y-4">
          <form onSubmit={handleCreateOrg} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto p-2 bg-secondary/30 rounded-2xl border border-border/50">
            <input 
              type="text"
              placeholder="Organization Name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-xs font-bold uppercase tracking-widest"
              required
            />
            <button 
              type="submit"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 text-[10px]"
            >
              Create
            </button>
          </form>

          {onBack && (
            <button 
              onClick={onBack}
              className="text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <X className="w-3 h-3" />
              Cancel & Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Organization Switcher */}
      {view === 'all' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => setActiveOrgId(org.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap",
                activeOrgId === org.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
              )}
            >
              <Building2 className="w-3 h-3" />
              {org.name}
            </button>
          ))}
          <button 
            onClick={() => setIsCreatingOrg(true)}
            className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-secondary/30 text-muted-foreground border border-dashed border-border hover:bg-secondary/50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            New Org
          </button>
        </div>
      )}

      <header className="flex items-center justify-between px-1 py-1">
        <div className="space-y-0">
          <h2 className="text-[10px] sm:text-xs font-black tracking-tight flex items-center gap-1 uppercase">
            <Shield className="w-3 h-3 text-brand-700" />
            {currentOrg.name}
          </h2>
          <p className="text-muted-foreground font-black uppercase text-[6px] tracking-[0.2em] leading-none">
            {view === 'members' ? 'Team Management' : view === 'settings' ? 'Workspace Settings' : 'Management'}
          </p>
        </div>
        
        {view !== 'settings' && (
          <button 
            onClick={() => setIsAddingMember(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-1.5 text-[7px]"
          >
            <UserPlus className="w-3 h-3" />
            Invite Member
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Team Members Section */}
        {(view === 'members' || view === 'all') && (
          <div className={cn(
            "space-y-4",
            view === 'members' ? "lg:col-span-12" : "lg:col-span-8"
          )}>
            <div className="native-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/5">
                <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                  <Users className="w-4 h-4 text-brand-700" />
                  Team Roster
                </h3>
                <span className="px-2 py-0.5 bg-primary/10 text-brand-700 text-[8px] font-black uppercase tracking-widest rounded-full">
                  {members.length} Active
                </span>
              </div>
              
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scrollbar">
                {members.map((member) => (
                  <div key={member.userId} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-brand-700 flex items-center justify-center font-black text-xs shadow-inner">
                        {member.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground text-[10px] sm:text-xs truncate max-w-[200px] uppercase tracking-tight">{member.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                            member.role === 'owner' ? "bg-brand-500/10 text-brand-500 border-brand-500/20" :
                            member.role === 'admin' ? "bg-primary/10 text-brand-700 border-primary/20" :
                            "bg-secondary text-muted-foreground border-border"
                          )}>
                            {member.role}
                          </span>
                          <span className="text-[6px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Added {member.joinedAt?.toDate ? new Date(member.joinedAt.toDate()).toLocaleDateString() : 'Recently'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {member.role !== 'owner' && (
                        <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {(view === 'settings' || view === 'all') && (
          <div className={cn(
            "space-y-4",
            view === 'settings' ? "lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4" : "lg:col-span-4"
          )}>
            <div className="native-card p-5 space-y-4">
              <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                <Building2 className="w-4 h-4 text-brand-700" />
                Workspace Identity
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workspace Name</label>
                  <input 
                    type="text"
                    placeholder="New Name"
                    defaultValue={currentOrg.name}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== currentOrg.name) {
                        updateOrganization(currentOrg.id, { name: e.target.value });
                        toast('Name updated', 'success');
                      }
                    }}
                    className="native-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industry Sector</label>
                  <Select 
                    value={currentOrg.industry || 'other'}
                    onValueChange={(val) => {
                      updateOrganization(currentOrg.id, { industry: val });
                      toast('Industry updated', 'success');
                    }}
                  >
                    <SelectTrigger className="h-10 bg-secondary/50 border-none text-[10px] font-bold uppercase tracking-widest rounded-2xl">
                      <SelectValue placeholder="Select Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                      <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                      <SelectItem value="Web Development">Web Development</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="native-card p-5 space-y-4">
              <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                <Palette className="w-4 h-4 text-brand-700" />
                Visual Branding
              </h3>
              
              <div className="space-y-4">
                <NativeColorPicker
                  label="Primary Brand Color"
                  value={currentOrg.branding?.primaryColor || '#f97316'}
                  onChange={(val) => handleUpdateBranding({ ...currentOrg.branding, primaryColor: val })}
                />

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Branded Logo URL</label>
                  <input 
                    type="text"
                    placeholder="https://..."
                    value={currentOrg.branding?.logoUrl || ''}
                    onChange={(e) => handleUpdateBranding({ ...currentOrg.branding, logoUrl: e.target.value })}
                    className="native-input"
                  />
                </div>
              </div>
            </div>

            <div className="native-card p-5 space-y-4">
              <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                <Shield className="w-4 h-4 text-brand-700" />
                Access Controls
              </h3>
              
              <div className="space-y-3">
                {[
                  { label: 'Allow Member Deletion', enabled: true },
                  { label: 'Asset Approval Required', enabled: false },
                  { label: 'Public Analytics Access', enabled: false }
                ].map((perm) => (
                  <div key={perm.label} className="flex items-center justify-between p-3 bg-secondary/30 rounded-2xl border border-border/50">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{perm.label}</span>
                    <div className={cn(
                      "w-8 h-4 rounded-full transition-colors relative cursor-pointer",
                      perm.enabled ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-2 h-2 bg-white rounded-full transition-all",
                        perm.enabled ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="native-card p-5 space-y-4">
              <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                <Globe className="w-4 h-4 text-brand-700" />
                Enterprise Domains
              </h3>
              
              <PermissionGuard action="whitelabel">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Custom Tracking Domain</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="qr.yourbrand.com"
                        value={currentOrg.customDomain || ''}
                        onChange={(e) => handleUpdateBranding({ ...currentOrg.branding, customDomain: e.target.value })}
                        className="native-input flex-1"
                      />
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Verify</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase tracking-tight">Whitelabel Experience</p>
                      <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-widest">Hide "Powered by QRForge"</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateBranding({ ...currentOrg.branding, hideBranding: !currentOrg.branding?.hideBranding })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        currentOrg.branding?.hideBranding ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                        currentOrg.branding?.hideBranding ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
              </PermissionGuard>

              {!hasPermission(profile?.role, 'whitelabel', profile?.subscription?.status) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-[2rem] text-center space-y-2">
                  <Crown className="w-6 h-6 text-brand-700 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-tight">Business Feature</p>
                  <button className="text-[8px] font-black uppercase tracking-widest text-brand-700 hover:underline">Upgrade to Unlock Whitelabeling</button>
                </div>
              )}
            </div>

            <div className="native-card p-5 space-y-4">
              <h3 className="text-[10px] font-black tracking-tight flex items-center gap-2 uppercase tracking-widest">
                <Settings className="w-4 h-4 text-brand-700" />
                System Maintenance
              </h3>
              <button 
                onClick={async () => {
                  if (user) {
                    const { clearUserCache } = await import('../services/db');
                    clearUserCache(user.uid);
                    toast('System cache cleared. Reloading...', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                  }
                }}
                className="w-full py-3 bg-secondary text-foreground rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all active:scale-[0.98]"
              >
                Flush Workspace Cache
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Org Modal */}
      <AnimatePresence>
        {isCreatingOrg && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingOrg(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-card p-6 rounded-3xl shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black tracking-tight uppercase">New Organization</h3>
                <button onClick={() => setIsCreatingOrg(false)} className="p-1.5 bg-secondary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Org Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-xs"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]"
                >
                  Create Organization
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {isAddingMember && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingMember(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">Invite Member</h3>
                <button onClick={() => setIsAddingMember(false)} className="p-1.5 bg-secondary rounded-lg hover:bg-border transition-all">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddMember} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input 
                      type="email"
                      placeholder="colleague@company.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-medium text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Role</label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {['admin', 'editor', 'viewer'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewMemberRole(role)}
                        className={cn(
                          "py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                          newMemberRole === role ? "border-primary bg-primary/5 text-brand-700" : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 text-[9px] sm:text-[10px]"
                >
                  Send Invitation
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
