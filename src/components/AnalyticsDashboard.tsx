import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, BarChart3, TrendingUp, Globe, Smartphone,
  Calendar, ArrowLeft, Loader2, MapPin, Monitor,
  Smartphone as PhoneIcon, Tablet, Globe2, QrCode, Heart,
  Download, FileSpreadsheet, FileJson, FileBarChart, ChevronDown, FileText,
  GitCompare, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  Legend
} from 'recharts';
import { format, startOfDay, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { subscribeToQRAnalytics, subscribeToCampaignVariations } from '../services/db';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface AnalyticsDashboardProps {
  qrId: string;
  qrName: string;
  qrType?: string;
  campaignId?: string;
  onClose: () => void;
}

const COLORS = ['#FF6B00', '#00C2FF', '#8E44AD', '#27AE60', '#F1C40F', '#E74C3C'];

const COUNTRY_COORDS: Record<string, [number, number]> = {
  Nigeria: [8, 10], US: [37, -95], USA: [37, -95], UK: [55, -3],
  Germany: [51, 9], France: [46, 2], Canada: [56, -106],
  Australia: [-25, 134], India: [20, 78], Brazil: [-14, -51],
  SouthAfrica: [-30, 25], Kenya: [-1, 38], Ghana: [8, -2],
  Egypt: [27, 30], UAE: [24, 54], China: [35, 105],
  Japan: [36, 138], Singapore: [1.3, 103.8], Netherlands: [52, 5],
  Spain: [40, -4], Italy: [42, 12],
};

const SVG_WORLD =
  `M10,80 Q30,30 80,40 Q120,45 150,35 Q200,25 280,30 Q320,32 360,40 ` +
  `Q420,50 480,45 Q540,35 580,50 Q620,60 640,80 Q660,100 680,120 ` +
  `Q690,140 670,160 Q640,180 600,175 Q560,170 520,165 Q480,160 440,170 ` +
  `Q400,180 360,175 Q320,170 280,165 Q240,160 200,165 Q160,170 120,160 ` +
  `Q80,150 50,130 Q20,110 10,80Z`;

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ qrId, qrName, qrType, campaignId, onClose }) => {
  const [scans, setScans] = useState<any[]>([]);
  const [variations, setVariations] = useState<any[]>([]);
  const [qrStats, setQrStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [compareMode, setCompareMode] = useState(false);
  const [comparison, setComparison] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'geo' | 'export'>('charts');
  const [geoData, setGeoData] = useState<any>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | 'xlsx' | 'report' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const unsubscribeScans = subscribeToQRAnalytics(qrId, (data) => {
      setScans(data);
      setIsLoading(false);
    });

    const qrRef = doc(db, 'qrcodes', qrId);
    const unsubscribeStats = onSnapshot(qrRef, (doc) => {
      if (doc.exists()) {
        setQrStats(doc.data().stats);
      }
    });

    let unsubscribeVariations = () => {};
    if (campaignId) {
      unsubscribeVariations = subscribeToCampaignVariations(campaignId, (data) => {
        setVariations(data);
      });
    }

    return () => {
      unsubscribeScans();
      unsubscribeStats();
      unsubscribeVariations();
    };
  }, [qrId, campaignId]);

  const filteredScans = scans.filter(scan => {
    const scanDate = scan.timestamp?.toDate();
    if (!scanDate) return true;
    const start = dateRange.start ? parseISO(dateRange.start) : subDays(new Date(), 30);
    const end = dateRange.end ? parseISO(dateRange.end) : new Date();
    return scanDate >= start && scanDate <= end;
  });

  const fetchComparison = useCallback(async () => {
    setIsComparing(true);
    try {
      const days = Math.max(
        Math.ceil((parseISO(dateRange.end).getTime() - parseISO(dateRange.start).getTime()) / 86400000),
        3
      );
      const prevEnd = parseISO(dateRange.start);
      const prevStart = subDays(prevEnd, days);

      const currentScans = filteredScans.filter(s => {
        const d = s.timestamp?.toDate();
        return d && d >= parseISO(dateRange.start) && d <= parseISO(dateRange.end);
      });
      const prevScans = scans.filter(s => {
        const d = s.timestamp?.toDate();
        return d && d >= prevStart && d < prevEnd;
      });

      const aggCurrent = currentScans.length;
      const aggPrev = prevScans.length;
      const growth = aggPrev > 0 ? ((aggCurrent - aggPrev) / aggPrev) * 100 : null;

      setComparison({
        current: aggCurrent,
        previous: aggPrev,
        growth: growth ? Math.round(growth * 10) / 10 : null,
        dailyCurrent: currentScans,
        dailyPrevious: prevScans,
      });
    } finally {
      setIsComparing(false);
    }
  }, [filteredScans, scans, dateRange]);

  useEffect(() => {
    if (compareMode) {
      fetchComparison();
    } else {
      setComparison(null);
    }
  }, [compareMode, fetchComparison]);

  const fetchGeoData = useCallback(async () => {
    setIsGeoLoading(true);
    try {
      const locations: Record<string, { count: number; lat: number; lng: number }> = {};
      filteredScans.forEach(scan => {
        const country = scan.location?.country || 'Unknown';
        const lat = COUNTRY_COORDS[country]?.[0] || 0;
        const lng = COUNTRY_COORDS[country]?.[1] || 0;
        if (!locations[country]) locations[country] = { count: 0, lat, lng };
        locations[country].count++;
      });
      setGeoData(locations);
    } finally {
      setIsGeoLoading(false);
    }
  }, [filteredScans]);

  useEffect(() => {
    if (activeTab === 'geo' && !geoData) {
      fetchGeoData();
    }
  }, [activeTab, geoData, fetchGeoData]);

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    setIsExporting(format);
    try {
      const payload = filteredScans.map(s => ({
        timestamp: s.timestamp?.toDate()?.toISOString() || '',
        city: s.location?.city || '',
        country: s.location?.country || '',
        device: s.device?.type || '',
        browser: s.device?.browser || '',
        os: s.device?.os || '',
        referrer: s.referrer || '',
        ip: s.ip || '',
      }));
      const resp = await fetch('/api/py/scans/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: payload, format }),
      });
      const data = await resp.json();
      const blob = new Blob(
        [Uint8Array.from(atob(data.data), c => c.charCodeAt(0))],
        { type: format === 'csv' ? 'text/csv' : format === 'json' ? 'application/json' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `scan_export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadReport = async () => {
    setIsExporting('report');
    try {
      const locations = Object.entries(
        filteredScans.reduce((acc: Record<string, number>, s) => {
          const key = `${s.location?.city || ''}|${s.location?.country || ''}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).slice(0, 10).map(([k, v]) => {
        const [city, country] = k.split('|');
        return { city, country, scans: v };
      });

      const browsers: Record<string, number> = {};
      const devices: Record<string, number> = {};
      filteredScans.forEach(s => {
        const b = s.device?.browser || 'Unknown';
        browsers[b] = (browsers[b] || 0) + 1;
        const d = s.device?.type || 'Unknown';
        devices[d] = (devices[d] || 0) + 1;
      });

      const dailyMap: Record<string, number> = {};
      filteredScans.forEach(s => {
        const d = s.timestamp?.toDate();
        if (d) {
          const key = format(d, 'yyyy-MM-dd');
          dailyMap[key] = (dailyMap[key] || 0) + 1;
        }
      });
      const dailyTrend = Object.entries(dailyMap)
        .map(([date, scans]) => ({ date, scans }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const countryCounts: Record<string, number> = {};
      filteredScans.forEach(s => {
        const c = s.location?.country || 'N/A';
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
      const topCountry = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const resp = await fetch('/api/py/docs/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `QR Scan Report - ${qrName}`,
          brand_name: 'QRForge',
          period_label: `${dateRange.start} to ${dateRange.end}`,
          total_scans: filteredScans.length,
          total_qrs: 1,
          top_country: topCountry,
          daily_trend: dailyTrend,
          top_locations: locations,
          top_browsers: browsers,
          top_devices: devices,
        }),
      });
      const data = await resp.json();
      const blob = new Blob(
        [Uint8Array.from(atob(data.data), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `scan_report_${format(new Date(), 'yyyyMMdd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const processTrendData = () => {
    if (dateRange.start && dateRange.end) {
      const days = eachDayOfInterval({
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end),
      });
      return days.map(day => {
        const count = filteredScans.filter(scan => {
          const scanDate = scan.timestamp?.toDate();
          return scanDate && isSameDay(scanDate, day);
        }).length;
        return { date: format(day, 'MMM dd'), scans: count };
      });
    }
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });
    return last7Days.map(day => {
      const count = filteredScans.filter(scan => {
        const scanDate = scan.timestamp?.toDate();
        return scanDate && isSameDay(scanDate, day);
      }).length;
      return { date: format(day, 'MMM dd'), scans: count };
    });
  };

  const processDeviceData = () => {
    const devices: Record<string, number> = {};
    filteredScans.forEach(scan => {
      const type = scan.device?.type || 'desktop';
      devices[type] = (devices[type] || 0) + 1;
    });
    return Object.entries(devices).map(([name, value]) => ({ name, value }));
  };

  const processLocationData = () => {
    const locations: Record<string, number> = {};
    filteredScans.forEach(scan => {
      const country = scan.location?.country || 'Unknown';
      locations[country] = (locations[country] || 0) + 1;
    });
    return Object.entries(locations)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const processBrowserData = () => {
    const browsers: Record<string, number> = {};
    filteredScans.forEach(scan => {
      const browser = scan.device?.browser || 'Unknown';
      browsers[browser] = (browsers[browser] || 0) + 1;
    });
    return Object.entries(browsers)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const processHourlyData = () => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    filteredScans.forEach(scan => {
      const date = scan.timestamp?.toDate();
      if (date) {
        const hour = date.getHours();
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour}:00`,
      scans: count
    }));
  };

  const processOSData = () => {
    const os: Record<string, number> = {};
    filteredScans.forEach(scan => {
      const name = scan.device?.os || 'Unknown';
      os[name] = (os[name] || 0) + 1;
    });
    return Object.entries(os).map(([name, value]) => ({ name, value }));
  };

  const trendData = processTrendData();
  const deviceData = processDeviceData();
  const locationData = processLocationData();
  const browserData = processBrowserData();
  const hourlyData = processHourlyData();
  const osData = processOSData();

  const maxScan = Math.max(...trendData.map(d => d.scans), 1);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-card p-2 rounded-lg border border-border shadow-sm space-y-0.5">
      <div className="flex items-center justify-between">
        <div className={cn("p-0.5 rounded-md", color)}>
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-[6px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
      </div>
      <div>
        <h4 className="text-base font-black tracking-tight">{value}</h4>
        <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-tighter">{title}</p>
        {subtitle && <p className="text-[6px] text-muted-foreground/60">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-xl flex items-center justify-center p-1.5 sm:p-4 md:p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card w-full max-w-6xl h-[92vh] md:h-[88vh] rounded-xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-1.5 md:p-2.5 border-b border-border flex items-center justify-between bg-card/50">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-1 hover:bg-secondary rounded-lg transition-all active:scale-90"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
            <div>
              <h2 className="text-xs md:text-sm font-black tracking-tight flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-brand-700" />
                {qrName}
              </h2>
              <p className="text-[7px] md:text-[8px] text-muted-foreground font-medium uppercase tracking-widest">Real-time performance</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1 px-1.5 py-1 text-[7px] font-black uppercase tracking-widest bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Calendar className="w-2.5 h-2.5" />
              {dateRange.start === format(subDays(new Date(), 6), 'yyyy-MM-dd') ? 'Last 7 days' : `${dateRange.start} - ${dateRange.end}`}
              <ChevronDown className="w-2 h-2" />
            </button>
            <button
              onClick={() => { setCompareMode(!compareMode); }}
              className={cn(
                "p-1 rounded-lg transition-colors",
                compareMode ? "bg-primary/10 text-brand-700" : "text-muted-foreground hover:bg-secondary"
              )}
              title="Compare with previous period"
            >
              <GitCompare className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-secondary rounded-lg transition-all active:scale-90 hidden md:block"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="p-2 flex items-center gap-2 bg-secondary/20">
                <label className="text-[7px] font-black uppercase tracking-widest">From:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px] font-bold"
                />
                <label className="text-[7px] font-black uppercase tracking-widest">To:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-card border border-border rounded px-1.5 py-0.5 text-[10px] font-bold"
                />
                <div className="flex gap-1 ml-auto">
                  {[
                    { label: '7D', days: 6 },
                    { label: '30D', days: 29 },
                    { label: '90D', days: 89 },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => setDateRange({
                        start: format(subDays(new Date(), p.days), 'yyyy-MM-dd'),
                        end: format(new Date(), 'yyyy-MM-dd'),
                      })}
                      className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest bg-secondary rounded hover:bg-secondary/80"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Banner */}
        <AnimatePresence>
          {compareMode && comparison && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border bg-primary/5"
            >
              <div className="p-2 flex items-center gap-3 text-[8px] font-bold">
                <GitCompare className="w-3 h-3 text-brand-700" />
                <span>Current: <strong>{comparison.current}</strong> scans</span>
                <span className="text-muted-foreground">|</span>
                <span>Previous: <strong>{comparison.previous}</strong> scans</span>
                <span className="text-muted-foreground">|</span>
                <span className={comparison.growth !== null && comparison.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.growth !== null ? `${comparison.growth >= 0 ? '+' : ''}${comparison.growth}%` : 'N/A'}
                </span>
                {isComparing && <Loader2 className="w-2.5 h-2.5 animate-spin ml-1" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-secondary/10">
          {[
            { id: 'charts' as const, label: 'Charts', icon: BarChart3 },
            { id: 'geo' as const, label: 'Geo Map', icon: Globe },
            { id: 'export' as const, label: 'Export', icon: Download },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-[7px] font-black uppercase tracking-widest border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-brand-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-2.5 h-2.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-brand-700" />
              <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">Gathering scan data...</p>
            </div>
          ) : scans.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center max-w-xs mx-auto">
              <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center">
                <Globe2 className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight">No Scans Yet</h3>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Share your QR code to start collecting analytics.
                </p>
              </div>
            </div>
          ) : activeTab === 'charts' ? (
            <>
              {/* Top Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <StatCard
                  title="Total Scans"
                  value={filteredScans.length}
                  icon={TrendingUp}
                  color="bg-brand-500"
                  subtitle={scans.length !== filteredScans.length ? `${scans.length - filteredScans.length} filtered out` : undefined}
                />
                {qrType === 'social' && (
                  <StatCard
                    title="Total Likes"
                    value={qrStats?.likes || 0}
                    icon={Heart}
                    color="bg-red-500"
                  />
                )}
                <StatCard
                  title="Locations"
                  value={new Set(filteredScans.map(s => s.location?.city).filter(Boolean)).size}
                  icon={Globe}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Mobile"
                  value={filteredScans.filter(s => s.device?.type === 'mobile').length}
                  icon={Smartphone}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Unique Visitors"
                  value={new Set(filteredScans.map(s => s.visitorId || s.ip)).size}
                  icon={BarChart3}
                  color="bg-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trend Chart */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <TrendingUp className="w-2 h-2 md:w-2.5 md:h-2.5 text-brand-500" />
                    Scan Trends
                    <span className="text-[6px] text-muted-foreground font-medium normal-case ml-1">
                      ({dateRange.start} to {dateRange.end})
                    </span>
                  </h3>
                  <div className="h-[120px] md:h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#94A3B8' }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#94A3B8' }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="scans"
                          stroke="#FF6B00"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#FF6B00', strokeWidth: 1.5, stroke: '#fff' }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <Calendar className="w-2 h-2 md:w-2.5 md:h-2.5 text-blue-500" />
                    Hourly Distribution
                  </h3>
                  <div className="h-[120px] md:h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="hour"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 7, fontWeight: 700, fill: '#94A3B8' }}
                        />
                        <YAxis axisLine={false} tickLine={false} hide />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Bar dataKey="scans" fill="#00C2FF" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Device Distribution */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1 md:space-y-2">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <Smartphone className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                    Device Distribution
                  </h3>
                  <div className="h-[120px] md:h-[180px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {deviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* OS Distribution */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1 md:space-y-2">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <Monitor className="w-2.5 h-2.5 md:w-3 md:h-3 text-indigo-500" />
                    Operating Systems
                  </h3>
                  <div className="h-[120px] md:h-[180px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={osData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {osData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 700 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Locations */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1.5">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 text-purple-500" />
                    Top Countries
                  </h3>
                  <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#64748B' }}
                          width={60}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#8E44AD"
                          radius={[0, 6, 6, 0]}
                          barSize={18}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Browsers */}
                <div className="bg-card p-2 md:p-2.5 rounded-lg border border-border shadow-sm space-y-1.5">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                    <Monitor className="w-2.5 h-2.5 md:w-3 md:h-3 text-green-500" />
                    Top Browsers
                  </h3>
                  <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={browserData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#64748B' }}
                        />
                        <YAxis axisLine={false} tickLine={false} hide />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#27AE60"
                          radius={[6, 6, 0, 0]}
                          barSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* A/B Testing Variations Performance */}
              {campaignId && variations.length > 0 && (
                <div className="bg-card p-2 md:p-3 rounded-lg border border-border shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                      <BarChart3 className="w-2.5 h-2.5 md:w-3 md:h-3 text-brand-700" />
                      A/B Test Performance
                    </h3>
                    <span className="text-[6px] font-black bg-primary/10 text-brand-700 px-1 py-0.5 rounded-full uppercase tracking-widest">
                      {variations.length} Variations
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {variations.map((v, i) => (
                      <div key={v.id} className="p-2 bg-secondary/20 rounded-lg border border-border space-y-1.5 relative overflow-hidden group">
                        {v.id === qrId && (
                          <div className="absolute top-1.5 right-1.5 px-1 py-0.5 bg-primary text-primary-foreground text-[5px] font-black uppercase rounded-full">
                            Current
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-card flex items-center justify-center shadow-sm">
                            <QrCode className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase truncate max-w-[70px]">{v.name}</p>
                            <p className="text-[6px] text-muted-foreground font-medium">Variation {i + 1}</p>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-end">
                            <p className="text-base font-black">{v.stats?.totalScans || 0}</p>
                            <p className="text-[6px] font-black text-muted-foreground uppercase">Scans</p>
                          </div>
                          <div className="w-full h-0.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-1000"
                              style={{ width: `${Math.min(((v.stats?.totalScans || 0) / Math.max(...variations.map(varItem => varItem.stats?.totalScans || 1))) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Scans Table */}
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="p-2 md:p-3 border-b border-border">
                  <h3 className="text-[8px] md:text-[10px] font-black tracking-tight uppercase tracking-widest">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-secondary/30">
                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground">Time</th>
                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground">Location</th>
                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground">Device</th>
                        <th className="px-2 py-1.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground">Browser</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredScans.slice(0, 10).map((scan) => (
                        <tr key={scan.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="px-2 py-1.5 text-[8px] font-black">
                            {scan.timestamp ? format(scan.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                          </td>
                          <td className="px-2 py-1.5 text-[8px] font-bold">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-2 h-2 text-muted-foreground" />
                              {scan.location?.city}, {scan.location?.country}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-[8px] font-bold capitalize">
                            <div className="flex items-center gap-1">
                              {scan.device?.type === 'mobile' ? <PhoneIcon className="w-2 h-2" /> :
                               scan.device?.type === 'tablet' ? <Tablet className="w-2 h-2" /> :
                               <Monitor className="w-2 h-2" />}
                              {scan.device?.os}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-[8px] font-bold">
                            {scan.device?.browser}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'geo' ? (
            /* Geo Map Tab */
            <div className="bg-card rounded-lg border border-border shadow-sm p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                  <Globe className="w-2.5 h-2.5 text-purple-500" />
                  Geographic Distribution
                </h3>
                <button
                  onClick={fetchGeoData}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest bg-secondary rounded-lg hover:bg-secondary/80"
                >
                  <RefreshCw className="w-2 h-2" />
                  Refresh
                </button>
              </div>

              {isGeoLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
                </div>
              ) : geoData && Object.keys(geoData).length > 0 ? (
                <>
                  {/* SVG World Map with markers */}
                  <div className="relative w-full h-[200px] md:h-[280px] bg-secondary/10 rounded-lg overflow-hidden">
                    <svg viewBox="0 0 700 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      <path d={SVG_WORLD} fill="var(--secondary)" stroke="var(--border)" strokeWidth="0.5" opacity="0.6" />
                      {Object.entries(geoData).map(([country, data]) => {
                        const [lat, lng] = [(data as any).lat, (data as any).lng];
                        const x = ((lng + 180) / 360) * 700;
                        const y = ((90 - lat) / 180) * 200;
                        const count = (data as any).count;
                        const radius = Math.min(5 + count * 0.3, 20);
                        return (
                                          <g key={country}>
                          <circle
                            cx={x}
                            cy={y}
                            r={radius}
                            fill="rgba(249, 115, 22, 0.3)"
                            stroke="#f97316"
                            strokeWidth="1"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r={Math.max(radius * 0.3, 3)}
                            fill="#f97316"
                          >
                            <title>{country}: {count} scans</title>
                          </circle>
                        </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Location table */}
                  <div className="space-y-1">
                    <h4 className="text-[8px] font-black uppercase tracking-widest">All Locations</h4>
                    <div className="grid gap-1">
                      {Object.entries(geoData)
                        .sort(([, a], [, b]) => (b as any).count - (a as any).count)
                        .map(([country, data]) => (
                          <div key={country} className="flex items-center justify-between p-1.5 bg-secondary/10 rounded-lg">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-2 h-2 text-muted-foreground" />
                              <span className="text-[8px] font-bold">{country}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${((data as any).count / Math.max(...Object.values(geoData).map((d: any) => d.count))) * 100}%` }}
                                />
                              </div>
                              <span className="text-[8px] font-black min-w-[2ch] text-right">{(data as any).count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center">
                  <Globe2 className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-[10px] font-black">No location data available</p>
                  <p className="text-[8px] text-muted-foreground">Scans will appear here once they include geographic information.</p>
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div className="bg-card rounded-lg border border-border shadow-sm p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[8px] md:text-[10px] font-black tracking-tight flex items-center gap-1 uppercase tracking-widest">
                  <Download className="w-2.5 h-2.5 text-green-500" />
                  Export Data
                </h3>
                <span className="text-[7px] text-muted-foreground">{filteredScans.length} scans selected</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting === 'csv'}
                  className="flex flex-col items-center gap-1.5 p-3 bg-secondary/20 rounded-lg border border-border hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {isExporting === 'csv' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  )}
                  <span className="text-[8px] font-black uppercase">CSV</span>
                  <span className="text-[6px] text-muted-foreground">Spreadsheet format</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting === 'json'}
                  className="flex flex-col items-center gap-1.5 p-3 bg-secondary/20 rounded-lg border border-border hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {isExporting === 'json' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                  ) : (
                    <FileJson className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="text-[8px] font-black uppercase">JSON</span>
                  <span className="text-[6px] text-muted-foreground">Raw data format</span>
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  disabled={isExporting === 'xlsx'}
                  className="flex flex-col items-center gap-1.5 p-3 bg-secondary/20 rounded-lg border border-border hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {isExporting === 'xlsx' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                  ) : (
                    <FileBarChart className="w-5 h-5 text-indigo-600" />
                  )}
                  <span className="text-[8px] font-black uppercase">Excel</span>
                  <span className="text-[6px] text-muted-foreground">XLSX format</span>
                </button>
                <button
                  onClick={handleDownloadReport}
                  disabled={isExporting === 'report'}
                  className="flex flex-col items-center gap-1.5 p-3 bg-secondary/20 rounded-lg border border-border hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {isExporting === 'report' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                  ) : (
                    <FileText className="w-5 h-5 text-brand-600" />
                  )}
                  <span className="text-[8px] font-black uppercase">PDF Report</span>
                  <span className="text-[6px] text-muted-foreground">Branded report</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
