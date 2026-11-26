import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, TrendingUp, Globe, Smartphone, 
  Zap, QrCode, ArrowUpRight, Loader2, Clock,
  MousePointer2, Target, Users
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useAuth } from '../AuthContext';
import { getScanStatsForLast7Days, subscribeToUserQRs } from '../services/db';
import { cn } from '../lib/utils';

export const UserAnalytics: React.FC = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [qrs, setQrs] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalScans: 0,
    activeAssets: 0,
    conversionRate: 0,
    topCountry: 'N/A'
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const scanData = await getScanStatsForLast7Days(user.uid);
        
        // Group by day
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(now.getDate() - (6 - i));
          return {
            name: days[d.getDay()],
            date: d.toISOString().split('T')[0],
            scans: 0
          };
        });

        let total = 0;
        const countries: Record<string, number> = {};

        scanData.forEach((scan: any) => {
          total++;
          if (scan.timestamp) {
            const scanDate = new Date(scan.timestamp.toDate()).toISOString().split('T')[0];
            const dayEntry = last7Days.find(d => d.date === scanDate);
            if (dayEntry) dayEntry.scans++;
          }
          if (scan.location?.country) {
            countries[scan.location.country] = (countries[scan.location.country] || 0) + 1;
          }
        });

        const topCountry = Object.entries(countries).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        setStats(last7Days);
        setSummary(prev => ({
          ...prev,
          totalScans: total,
          topCountry
        }));
      } catch (error) {
        console.error('Error fetching user analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const unsubscribe = subscribeToUserQRs(user.uid, (data) => {
      setQrs(data);
      setSummary(prev => ({
        ...prev,
        activeAssets: data.filter(q => q.isActive).length
      }));
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Engagement', value: summary.totalScans, icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Active Assets', value: summary.activeAssets, icon: QrCode, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Top Territory', value: summary.topCountry, icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Avg. Conversion', value: '12.4%', icon: Target, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-30" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <h3 className="text-xl font-black tracking-tight">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">Performance Matrix</h3>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">7-Day Engagement Velocity</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[8px] font-black uppercase tracking-widest">Scans</span>
              </div>
            </div>
          </div>
          
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94A3B8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#94A3B8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '10px',
                    fontWeight: 800
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScans)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Assets */}
        <div className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-tight">Top Assets</h3>
            <MousePointer2 className="w-4 h-4 text-brand-700" />
          </div>
          
          <div className="space-y-4">
            {qrs.slice(0, 5).sort((a, b) => (b.stats?.totalScans || 0) - (a.stats?.totalScans || 0)).map((qr, i) => (
              <div key={qr.id} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/50 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <QrCode className="w-5 h-5 text-muted-foreground group-hover:text-brand-700 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight truncate max-w-[100px]">{qr.name}</p>
                    <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-widest">{qr.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black">{qr.stats?.totalScans || 0}</p>
                  <p className="text-[7px] text-muted-foreground font-black uppercase tracking-widest">Scans</p>
                </div>
              </div>
            ))}
            {qrs.length === 0 && (
              <div className="text-center py-8 opacity-30">
                <p className="text-[10px] font-black uppercase tracking-widest">No assets deployed</p>
              </div>
            )}
          </div>

          <button className="w-full py-3 bg-secondary hover:bg-border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
            View Full Inventory
          </button>
        </div>
      </div>

      {/* Real-time Feed Teaser */}
      <div className="bg-foreground text-background rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Users className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-black uppercase tracking-tight">Live Intelligence Feed</h3>
          </div>
          <p className="text-[10px] opacity-60 font-medium max-w-md">
            Watch your assets perform in real-time. Every scan, every location, every device captured instantly.
          </p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse">
            Live Now
          </div>
        </div>
      </div>
    </div>
  );
};
