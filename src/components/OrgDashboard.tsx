import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Users, Settings, LayoutDashboard, CheckSquare, 
  Plus, Search, Filter, MoreVertical, 
  Building2, Shield, Globe, Crown, Trash2, UserPlus,
  Activity, BarChart3, Loader2, Clock, ChevronRight, ChevronLeft,
  Lightbulb, FolderOpen, QrCode, Share2, MessageSquare,
  History, TrendingUp, Calendar, ArrowUpRight, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskManager } from './TaskManager';
import { OrganizationSettings } from './OrganizationSettings';
import { 
  subscribeToUserOrganizations, 
  subscribeToOrgMembers, 
  subscribeToOrgTasks,
  subscribeToOrgActivityLogs,
  subscribeToOrgIdeas,
  subscribeToOrgAssets,
  createIdea,
  voteIdea,
  logActivity
} from '../services/db';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

interface OrgDashboardProps {
  onOrgSelect?: (orgId: string | null) => void;
}

export const OrgDashboard: React.FC<OrgDashboardProps> = ({ onOrgSelect }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members' | 'ideas' | 'assets' | 'settings'>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [assets, setAssets] = useState<{ qrs: any[], socials: any[], folders: any[] }>({ qrs: [], socials: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [isCreatingIdea, setIsCreatingIdea] = useState(false);

  useEffect(() => {
    if (onOrgSelect) {
      onOrgSelect(selectedOrg?.id || null);
    }
  }, [selectedOrg?.id, onOrgSelect]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserOrganizations(user.uid, (orgData) => {
      setOrgs(orgData);
      
      if (orgData.length > 0) {
        const stillExists = selectedOrg && orgData.find(o => o.id === selectedOrg.id);
        if (stillExists) {
          setSelectedOrg(orgData.find(o => o.id === selectedOrg.id));
        } else if (orgData.length === 1) {
          setSelectedOrg(orgData[0]);
          setViewMode('dashboard');
        }
      } else {
        setSelectedOrg(null);
        setViewMode('list');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedOrg) {
      setMembers([]);
      setTasks([]);
      setActivityLogs([]);
      setIdeas([]);
      setAssets({ qrs: [], socials: [], folders: [] });
      return;
    }

    const unsubMembers = subscribeToOrgMembers(selectedOrg.id, setMembers);
    const unsubTasks = subscribeToOrgTasks(selectedOrg.id, setTasks);
    const unsubLogs = subscribeToOrgActivityLogs(selectedOrg.id, setActivityLogs);
    const unsubIdeas = subscribeToOrgIdeas(selectedOrg.id, setIdeas);
    const unsubAssets = subscribeToOrgAssets(selectedOrg.id, setAssets);

    return () => {
      unsubMembers();
      unsubTasks();
      unsubLogs();
      unsubIdeas();
      unsubAssets();
    };
  }, [selectedOrg?.id]);

  const handleCreateIdea = async () => {
    if (!newIdeaTitle.trim() || !selectedOrg || !user) return;
    setIsCreatingIdea(true);
    try {
      await createIdea(user.uid, selectedOrg.id, newIdeaTitle, '');
      await logActivity(user.uid, selectedOrg.id, 'IDEA_CREATED', `Proposed a new idea: ${newIdeaTitle}`);
      setNewIdeaTitle('');
      toast('Idea forged successfully!', 'success');
    } catch (error) {
      toast('Failed to forge idea', 'error');
    } finally {
      setIsCreatingIdea(false);
    }
  };

  const handleVoteIdea = async (ideaId: string) => {
    try {
      await voteIdea(ideaId, 1);
    } catch (error) {
      toast('Failed to vote', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
        <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Workspace...</p>
      </div>
    );
  }

  if (orgs.length === 0) {
    return <OrganizationSettings />;
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex items-center justify-between px-1">
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tighter uppercase">Your Workspaces</h2>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Select an organization to manage</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {orgs.map((org) => (
            <motion.div
              key={org.id}
              whileHover={{ y: -2 }}
              onClick={() => {
                setSelectedOrg(org);
                setViewMode('dashboard');
              }}
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer group hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-primary/10 text-brand-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="px-1.5 py-0.5 bg-secondary/50 rounded-md text-[7px] font-black uppercase tracking-widest opacity-40">
                  {org.ownerId === user?.uid ? 'Owner' : 'Member'}
                </div>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black uppercase tracking-tight truncate">{org.name}</h3>
                <p className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest">{org.industry || 'Enterprise Workspace'}</p>
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-brand-700 opacity-40" />
                    <span className="text-[8px] font-black opacity-40">Active</span>
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-brand-700 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
              </div>
            </motion.div>
          ))}
          
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => {
              setSelectedOrg(null);
              setViewMode('dashboard');
            }}
            className="bg-secondary/10 border border-dashed border-border rounded-2xl p-4 cursor-pointer group hover:border-primary/50 transition-all flex flex-col items-center justify-center text-center space-y-2 min-h-[120px]"
          >
            <div className="w-8 h-8 bg-background border border-border rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-brand-700 group-hover:border-primary/50 transition-all">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-tight">Create New</h3>
              <p className="text-[6px] text-muted-foreground font-bold uppercase tracking-widest">Forge Workspace</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return <OrganizationSettings onBack={() => setViewMode('list')} />;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'assets', label: 'Assets', icon: FolderOpen },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Org Header & Tab Switcher */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode('list')}
              className="w-10 h-10 bg-secondary hover:bg-border rounded-xl flex items-center justify-center transition-all active:scale-95 group"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-brand-700 transition-colors" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-tight">{selectedOrg?.name}</h2>
                <span className="px-1.5 py-0.5 bg-primary/10 text-brand-700 text-[6px] font-black uppercase tracking-widest rounded-md border border-primary/10">
                  {profile?.role === 'admin' ? 'ADMIN_VIEW' : 'ENTERPRISE'}
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em]">{selectedOrg.industry || 'Organization Control Center'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-secondary text-foreground rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-border transition-all flex items-center gap-2"
            >
              <Building2 className="w-3 h-3" />
              Switch Workspace
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? 'bg-background text-brand-700 shadow-sm border border-border/50' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-card border border-border rounded-2xl shadow-sm group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Total Tasks</p>
                    <CheckSquare className="w-3 h-3 text-brand-700 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xl font-black tracking-tighter">{tasks.length}</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-2xl shadow-sm group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Team Members</p>
                    <Users className="w-3 h-3 text-brand-700 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xl font-black tracking-tighter">{members.length}</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-2xl shadow-sm group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Assets Linked</p>
                    <FolderOpen className="w-3 h-3 text-brand-700 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xl font-black tracking-tighter">{assets.qrs.length + assets.socials.length + assets.folders.length}</p>
                </div>
                <div className="p-4 bg-card border border-border rounded-2xl shadow-sm group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Active Ideas</p>
                    <Lightbulb className="w-3 h-3 text-brand-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xl font-black tracking-tighter">{ideas.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Activity Feed */}
                  <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10">
                      <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3 text-brand-700" />
                        Live Activity Feed
                      </h3>
                      <TrendingUp className="w-3 h-3 text-green-500 animate-pulse" />
                    </div>
                    <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                      <div className="space-y-1">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-secondary/30 rounded-xl transition-all group">
                            <div className="w-8 h-8 bg-background border border-border rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-all">
                              <Activity className="w-4 h-4 text-brand-700 opacity-40" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black uppercase tracking-tight truncate">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                <span className="text-[7px] font-black uppercase tracking-widest opacity-30 whitespace-nowrap">
                                  {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{log.details}</p>
                            </div>
                          </div>
                        ))}
                        {activityLogs.length === 0 && (
                          <div className="text-center py-12 opacity-30">
                            <Activity className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-[8px] font-black uppercase tracking-widest">No activity recorded yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ideas Section */}
                  <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10">
                      <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Lightbulb className="w-3 h-3 text-brand-500" />
                        Brainstorming Board
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newIdeaTitle}
                          onChange={(e) => setNewIdeaTitle(e.target.value)}
                          placeholder="What's your next big idea?"
                          className="flex-1 px-4 py-2 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateIdea()}
                        />
                        <button 
                          onClick={handleCreateIdea}
                          disabled={isCreatingIdea || !newIdeaTitle.trim()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isCreatingIdea ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ideas.map((idea) => (
                          <div key={idea.id} className="p-4 bg-secondary/20 border border-border/50 rounded-2xl group hover:border-brand-500/30 transition-all">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-[10px] font-black uppercase tracking-tight">{idea.title}</h4>
                              <button 
                                onClick={() => handleVoteIdea(idea.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-lg hover:border-brand-500/50 transition-all"
                              >
                                <ThumbsUp className="w-2.5 h-2.5 text-brand-500" />
                                <span className="text-[8px] font-black">{idea.votes || 0}</span>
                              </button>
                            </div>
                            <p className="text-[8px] text-muted-foreground font-medium line-clamp-2">{idea.content || 'No description provided.'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                  {/* Team Roster */}
                  <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3 text-brand-700" />
                        Team Roster
                      </h3>
                      <button onClick={() => setActiveTab('members')} className="text-[7px] font-black uppercase tracking-widest text-brand-700 hover:underline">Manage</button>
                    </div>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-secondary/20 rounded-xl border border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary/10 text-brand-700 rounded-lg flex items-center justify-center text-[8px] font-black">
                              {member.email?.[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-tight truncate max-w-[100px]">{member.email}</p>
                              <p className="text-[6px] font-black uppercase tracking-widest opacity-40">{member.role}</p>
                            </div>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked Assets Summary */}
                  <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Globe className="w-3 h-3 text-brand-700" />
                        Linked Assets
                      </h3>
                      <button onClick={() => setActiveTab('assets')} className="text-[7px] font-black uppercase tracking-widest text-brand-700 hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-3 h-3 text-brand-700 opacity-40" />
                          <span className="text-[8px] font-black uppercase tracking-widest">QR Codes</span>
                        </div>
                        <span className="text-[8px] font-black">{assets.qrs.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-3 h-3 text-brand-700 opacity-40" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Socials</span>
                        </div>
                        <span className="text-[8px] font-black">{assets.socials.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3 h-3 text-brand-700 opacity-40" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Folders</span>
                        </div>
                        <span className="text-[8px] font-black">{assets.folders.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TaskManager orgId={selectedOrg.id} />
            </motion.div>
          )}

          {activeTab === 'assets' && (
            <motion.div 
              key="assets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* QR Codes Section */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-2">
                    <QrCode className="w-3 h-3 text-brand-700" />
                    QR Codes
                  </h3>
                  <div className="space-y-2">
                    {assets.qrs.map(qr => (
                      <div key={qr.id} className="p-3 bg-card border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <QrCode className="w-4 h-4 opacity-40" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-tight truncate max-w-[120px]">{qr.name || 'Untitled QR'}</p>
                            <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">{qr.qrType}</p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {assets.qrs.length === 0 && <p className="text-[8px] text-center py-8 text-muted-foreground">No QRs linked</p>}
                  </div>
                </div>

                {/* Socials Section */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-2">
                    <Share2 className="w-3 h-3 text-brand-700" />
                    Social Profiles
                  </h3>
                  <div className="space-y-2">
                    {assets.socials.map(social => (
                      <div key={social.id} className="p-3 bg-card border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                            <Share2 className="w-4 h-4 opacity-40" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-tight truncate max-w-[120px]">{social.name || 'Untitled Social'}</p>
                            <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">Social Profile</p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {assets.socials.length === 0 && <p className="text-[8px] text-center py-8 text-muted-foreground">No socials linked</p>}
                  </div>
                </div>

                {/* Folders Section */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 px-2">
                    <FolderOpen className="w-3 h-3 text-brand-700" />
                    Asset Folders
                  </h3>
                  <div className="space-y-2">
                    {assets.folders.map(folder => (
                      <div key={folder.id} className="p-3 bg-card border border-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center" style={{ color: folder.color }}>
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-tight truncate max-w-[120px]">{folder.name}</p>
                            <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">Collection</p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {assets.folders.length === 0 && <p className="text-[8px] text-center py-8 text-muted-foreground">No folders linked</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ideas' && (
            <motion.div 
              key="ideas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight">Brainstorming Board</h2>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Collaborate on new project concepts</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                    placeholder="Describe your idea..."
                    className="flex-1 px-4 py-3 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <button 
                    onClick={handleCreateIdea}
                    disabled={isCreatingIdea || !newIdeaTitle.trim()}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreatingIdea ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    FORGE IDEA
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ideas.map((idea) => (
                    <div key={idea.id} className="p-6 bg-secondary/20 border border-border/50 rounded-3xl group hover:border-brand-500/30 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <button 
                          onClick={() => handleVoteIdea(idea.id)}
                          className="flex flex-col items-center gap-1 p-2 bg-background border border-border rounded-xl hover:border-brand-500/50 transition-all"
                        >
                          <ThumbsUp className="w-4 h-4 text-brand-500" />
                          <span className="text-[10px] font-black">{idea.votes || 0}</span>
                        </button>
                      </div>
                      <div className="pr-12">
                        <h4 className="text-sm font-black uppercase tracking-tight mb-2">{idea.title}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">{idea.content || 'No detailed description yet. Start the conversation!'}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-primary/10 rounded-md flex items-center justify-center text-[7px] font-black">
                            {idea.ownerId?.[0].toUpperCase()}
                          </div>
                          <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Proposed by Team</span>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-widest opacity-40">
                          {idea.createdAt?.toDate ? new Date(idea.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div 
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OrganizationSettings orgId={selectedOrg.id} view="members" />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OrganizationSettings orgId={selectedOrg.id} view="settings" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
