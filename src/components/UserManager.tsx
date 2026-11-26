import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Search, Filter, MoreVertical, Shield, 
  ShieldAlert, ShieldCheck, Mail, Calendar, 
  ArrowUpRight, Loader2, Trash2, UserPlus,
  Crown, Zap, CheckCircle2, X
} from 'lucide-react';
import { subscribeToAllUsers, updateUserRole, deleteUser } from '../services/db';
import { useToast } from './Toast';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { format } from 'date-fns';
import { Role } from '../lib/permissions';

export const UserManager: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllUsers((data) => {
      setUsers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole as Role);
      toast(`User role updated to ${newRole}`, 'success');
    } catch (error) {
      toast('Failed to update role', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      toast('User deleted successfully', 'success');
      setSelectedUser(null);
    } catch (error) {
      toast('Failed to delete user', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Decrypting User Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-700" />
            Operative Directory
          </h2>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">
            Total Intelligence Assets: {users.length}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search operatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all w-full md:w-64"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32 h-10 bg-secondary/30 border-border text-[10px] font-black uppercase tracking-widest rounded-xl">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <motion.div
            key={u.id}
            layoutId={u.id}
            onClick={() => setSelectedUser(u)}
            className="bg-card border border-border rounded-2xl p-4 space-y-4 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-black uppercase tracking-tight truncate">{u.displayName || 'Anonymous'}</h3>
                <p className="text-[9px] text-muted-foreground font-medium truncate">{u.email}</p>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest",
                u.role === 'admin' ? "bg-rose-500/10 text-rose-500" :
                u.role === 'business' ? "bg-purple-500/10 text-purple-500" :
                u.role === 'pro' ? "bg-primary/10 text-brand-700" : "bg-secondary text-muted-foreground"
              )}>
                {u.role}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50 relative z-10">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                  Joined {u.createdAt ? format(u.createdAt.toDate(), 'MMM yyyy') : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-brand-700" />
                <span className="text-[8px] font-black text-brand-700 uppercase tracking-widest">
                  {u.stats?.totalScans || 0} Scans
                </span>
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="w-4 h-4 text-brand-700" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="relative h-32 bg-secondary/30">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-md rounded-xl hover:bg-background transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-8 pb-8 -mt-12 relative z-10 space-y-6">
                <div className="flex items-end gap-4">
                  <div className="w-24 h-24 rounded-3xl bg-card border-4 border-card shadow-xl overflow-hidden">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Users className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="pb-2">
                    <h2 className="text-xl font-black uppercase tracking-tight">{selectedUser.displayName || 'Anonymous'}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/20 rounded-2xl border border-border/50">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Subscription Status</p>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-brand-700" />
                      <span className="text-sm font-black uppercase tracking-tight">{selectedUser.subscription?.planId || 'Free'}</span>
                    </div>
                    <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                      {selectedUser.subscription?.status || 'Active'}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/20 rounded-2xl border border-border/50">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Engagement</p>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-brand-500" />
                      <span className="text-sm font-black uppercase tracking-tight">{selectedUser.stats?.totalScans || 0} Total Scans</span>
                    </div>
                    <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                      {selectedUser.stats?.qrCount || 0} Active Assets
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Administrative Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleRoleUpdate(selectedUser.id, 'admin')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        selectedUser.role === 'admin' ? "bg-rose-500 text-white" : "bg-secondary hover:bg-border"
                      )}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Admin Access
                    </button>
                    <button 
                      onClick={() => handleRoleUpdate(selectedUser.id, 'business')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        selectedUser.role === 'business' ? "bg-purple-500 text-white" : "bg-secondary hover:bg-border"
                      )}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Business Tier
                    </button>
                    <button 
                      onClick={() => handleRoleUpdate(selectedUser.id, 'pro')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        selectedUser.role === 'pro' ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-border"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Pro Access
                    </button>
                    <button 
                      onClick={() => handleRoleUpdate(selectedUser.id, 'free')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        selectedUser.role === 'free' ? "bg-foreground text-background" : "bg-secondary hover:bg-border"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Free Plan
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">User Verified</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Terminate Account
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
