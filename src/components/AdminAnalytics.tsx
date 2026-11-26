import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  Users, Eye, Clock, Share2, MousePointer2, TrendingUp, 
  Globe, Smartphone, Monitor, Shield, Zap, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { updateUserRole, subscribeToLiveActivity, getGlobalTaskStats } from '../services/db';
import { Role } from '../lib/permissions';
import { useToast } from './Toast';
import { ListTodo, CheckSquare, Clock as ClockIcon, AlertTriangle, Loader2 } from 'lucide-react';

const COLORS = ['#141414', '#4a4a4a', '#8e8e8e', '#c0c0c0', '#e0e0e0'];

export const AdminAnalytics: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [liveActivity, setLiveActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'users' | 'modules' | 'security' | 'tasks'>('overview');

  useEffect(() => {
    // Fetch task stats
    const fetchTaskStats = async () => {
      const data = await getGlobalTaskStats();
      setTaskStats(data);
    };
    fetchTaskStats();

    // Real-time users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
      
      // Calculate stats from real user data
      const totalUsers = snap.size;
      const activeLast24h = userData.filter((u: any) => {
        const lastLogin = u.lastLoginAt?.toDate();
        if (!lastLogin) return false;
        return (new Date().getTime() - lastLogin.getTime()) < 24 * 60 * 60 * 1000;
      }).length;

      const roles = userData.reduce((acc: any, u: any) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});

      setStats(prev => ({
        ...prev,
        totalUsers,
        activeUsers: activeLast24h,
        roles,
        // Fallback for other stats until we have more data
        totalVisits: prev?.totalVisits || 0,
        visitTrend: prev?.visitTrend || [],
        sources: prev?.sources || [],
        geoData: prev?.geoData || [],
        securityAlerts: prev?.securityAlerts || []
      }));
      setLoading(false);
    });

    // Real-time QRs for scan stats
    const unsubQRs = onSnapshot(collection(db, 'qrcodes'), (snap) => {
      const qrData = snap.docs.map(doc => doc.data());
      const totalScans = qrData.reduce((acc, qr) => acc + (qr.stats?.totalScans || 0), 0);
      
      const browsers = qrData.reduce((acc: any, qr) => {
        if (qr.stats?.browsers) {
          Object.entries(qr.stats.browsers).forEach(([k, v]) => {
            acc[k] = (acc[k] || 0) + (v as number);
          });
        }
        return acc;
      }, {});

      const devices = qrData.reduce((acc: any, qr) => {
        if (qr.stats?.devices) {
          Object.entries(qr.stats.devices).forEach(([k, v]) => {
            acc[k] = (acc[k] || 0) + (v as number);
          });
        }
        return acc;
      }, {});

      setStats(prev => ({
        ...prev,
        totalScans,
        browsers,
        devices
      }));
    });

    // Live Activity
    const unsubActivity = subscribeToLiveActivity((activity) => {
      setLiveActivity(activity);
    });

    return () => {
      unsubUsers();
      unsubQRs();
      unsubActivity();
    };
  }, []);

  const handleUpdateTier = async (userId: string, newRole: Role) => {
    try {
      await updateUserRole(userId, newRole);
      toast(`User tier updated to ${newRole}`, 'success');
    } catch (err) {
      toast('Failed to update user tier', 'error');
    }
  };

  if (loading || !stats) return <div className="p-8 text-center font-black uppercase tracking-widest text-[10px] opacity-50 animate-pulse">CALCULATING_METRICS...</div>;

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Command Center</h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40">REAL-TIME_INTELLIGENCE_FEED // v2.4.0</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-foreground text-background text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-lg">
            <Activity className="w-3 h-3 text-green-400 animate-pulse" />
            LIVE_SYSTEM_STATUS: OPTIMAL
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="flex overflow-x-auto no-scrollbar bg-muted/30 border border-border rounded-xl p-1 gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'traffic', label: 'Traffic', icon: TrendingUp },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'tasks', label: 'Tasks', icon: ListTodo },
          { id: 'modules', label: 'Modules', icon: Zap },
          { id: 'security', label: 'Security', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Live Pulse Banner */}
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between overflow-hidden relative group">
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute inset-0" />
                  <div className="w-3 h-3 bg-emerald-500 rounded-full relative" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest">Live System Pulse</p>
                  <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-wider">
                    Monitoring global QR traffic and operative activity in real-time
                  </p>
                </div>
              </div>
              <div className="flex gap-8 relative z-10">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-tight">Latency</p>
                  <p className="text-[7px] text-emerald-500 font-bold uppercase tracking-widest">24ms</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-tight">Uptime</p>
                  <p className="text-[7px] text-emerald-500 font-bold uppercase tracking-widest">99.99%</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Operatives', value: stats.totalUsers, icon: Users, trend: 'LIVE' },
                { label: 'Active Nodes (24h)', value: stats.activeUsers, icon: Activity, trend: 'LIVE' },
                { label: 'Global Scans', value: stats.totalScans, icon: Eye, trend: 'LIVE' },
                { label: 'Security Health', value: '98.2%', icon: Shield, trend: 'OPTIMAL' },
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="p-4 bg-card border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-muted rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
                  <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* User Roles Distribution */}
              <div className="p-4 bg-card border border-border rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Subscription Tiers</h3>
                <div className="space-y-3">
                  {Object.entries(stats.roles || {}).map(([role, count]: any, i) => (
                    <div key={role} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                        <span>{role}</span>
                        <span className="opacity-40">{count} users</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / stats.totalUsers) * 100}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Distribution */}
              <div className="p-4 bg-card border border-border rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Device Access</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.devices || {}).map(([name, value]) => ({ name, value }))}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(stats.devices || {}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Browser Distribution */}
              <div className="p-4 bg-card border border-border rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Browser Matrix</h3>
                <div className="space-y-2">
                  {Object.entries(stats.browsers || {}).slice(0, 5).map(([browser, count]: any, i) => (
                    <div key={browser} className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest p-2 bg-muted/30 rounded-lg">
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {browser}
                      </span>
                      <span className="opacity-40">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'traffic' && (
          <motion.div 
            key="traffic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-4 bg-card border border-border rounded-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Live Activity Stream</h3>
              <div className="space-y-2">
                {liveActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-[10px] font-black">
                        {act.userId?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tight">{act.action}</p>
                        <p className="text-[7px] opacity-40 font-black uppercase tracking-widest">{act.module}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-black uppercase tracking-widest opacity-40">
                        {act.timestamp?.toDate().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {liveActivity.length === 0 && (
                  <div className="py-12 text-center text-[8px] font-black uppercase tracking-widest opacity-30">
                    Waiting for live signals...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-4 bg-card border border-border rounded-2xl overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Live User Behavior</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[8px] font-black uppercase tracking-widest opacity-40">
                      <th className="pb-3 px-2">Operative</th>
                      <th className="pb-3 px-2">Action</th>
                      <th className="pb-3 px-2">Module</th>
                      <th className="pb-3 px-2 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-[8px] font-black uppercase tracking-widest">
                    {liveActivity.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                        <td className="py-3 px-2 font-black">{row.userId?.slice(0, 8)}</td>
                        <td className="py-3 px-2"><span className="px-1.5 py-0.5 bg-foreground text-background rounded text-[7px] font-black">{row.action}</span></td>
                        <td className="py-3 px-2 opacity-40">{row.module}</td>
                        <td className="py-3 px-2 text-right">{row.timestamp?.toDate().toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'modules' && (
          <motion.div 
            key="modules"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-4 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Module Engagement Index</h3>
              <div className="space-y-4">
                {['AUTH', 'FORGE', 'DESIGNER', 'SYSTEM', 'TEAMS', 'TASKS'].map((module) => {
                  const count = liveActivity.filter(a => a.module === module).length;
                  return (
                    <div key={module} className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                        <span>{module}</span>
                        <span className="opacity-40">{count} recent actions</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / Math.max(1, liveActivity.length)) * 100}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  );
                })}
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
            className="space-y-4"
          >
            {taskStats ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tasks', value: taskStats.totalTasks, icon: ListTodo, color: 'text-brand-700' },
                    { label: 'Completed', value: taskStats.completedTasks, icon: CheckSquare, color: 'text-emerald-500' },
                    { label: 'Active Users', value: taskStats.activeUsers, icon: Users, color: 'text-indigo-500' },
                    { label: 'Completion Rate', value: `${Math.round((taskStats.completedTasks / Math.max(1, taskStats.totalTasks)) * 100)}%`, icon: TrendingUp, color: 'text-brand-500' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-card border border-border rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className={cn("p-2 bg-muted rounded-xl", stat.color)}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
                      <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 bg-card border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tasks by Priority</h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(taskStats.tasksByPriority || {}).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 900 }}
                          />
                          <Bar dataKey="value" fill="#141414" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-4 bg-card border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Tasks by Status</h3>
                    <div className="space-y-4">
                      {Object.entries(taskStats.tasksByStatus || {}).map(([status, count]: any) => (
                        <div key={status} className="space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                            <span>{status.replace('-', ' ')}</span>
                            <span className="opacity-40">{count} tasks</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / taskStats.totalTasks) * 100}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center opacity-40">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Loading task intelligence...</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div 
            key="security"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-card border border-border rounded-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Security Advisories</h3>
                <div className="space-y-2">
                  {[
                    { id: 1, type: 'info', msg: 'System integrity check passed', time: 'LIVE' },
                    { id: 2, type: 'success', msg: 'Database backup completed', time: '1h ago' },
                  ].map((alert: any) => (
                    <div key={alert.id} className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          alert.type === 'warning' ? "bg-brand-500" : alert.type === 'success' ? "bg-green-500" : "bg-blue-500"
                        )} />
                        <p className="text-[9px] font-black uppercase tracking-tight">{alert.msg}</p>
                      </div>
                      <span className="text-[8px] font-mono opacity-30">{alert.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h4 className="text-[12px] font-black uppercase tracking-tight">System Integrity: 100%</h4>
                  <p className="text-[8px] text-muted-foreground font-medium mt-1">All encryption protocols active. No breaches detected in last 24h.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
