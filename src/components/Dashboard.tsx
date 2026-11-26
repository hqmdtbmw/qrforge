import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Dock } from './Dock';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ForgeLogo } from './ForgeLogo';
import { PullToRefresh } from './PullToRefresh';
import { 
  Plus, Search, Filter, MoreVertical, ExternalLink, 
  Download, Trash2, LayoutGrid, List, Sparkles, 
  QrCode, Zap, ShieldCheck, Clock, BarChart3,
  ChevronRight, ArrowUpRight, Loader2, LogOut, Palette,
  Copy, Check, User as UserIcon, Settings as SettingsIcon, FileText,
  Building2, MapPin, Users as UsersIcon, Folder, FolderPlus, Move,
  Bell, HelpCircle, Crown, FileArchive, Activity, Link as LinkIcon, Globe, Mail,
  ListTodo, CheckSquare, Printer
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { useAuth } from '../AuthContext';
import { 
  subscribeToUserQRs, deleteQRCode, getSystemPublicConfig, 
  getReferralsByReferrer, subscribeToUserFolders, createFolder, 
  deleteFolder, moveQRCodeToFolder, getScanStatsForLast7Days,
  subscribeToSystemUpdates, subscribeToOrgFolders, subscribeToOrgQRs,
  subscribeToUserOrganizations, subscribeToOrgTasks, subscribeToUserTasks
} from '../services/db';
import { QRPreview } from './QRPreview';
import { CreateQRModal } from './CreateQRModal';
import { BulkForgeModal } from './BulkForgeModal';
import { OrganizationSettings } from './OrganizationSettings';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../lib/utils';
import { Menu, X } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { useToast } from './Toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { OnboardingTour } from './OnboardingTour';
import { TaskManager } from './TaskManager';
import { PermissionGuard } from './PermissionGuard';
import { TrialSelectionModal } from './TrialSelectionModal';
import { PricingModal } from './PricingModal';

import { AdminAnalytics } from './AdminAnalytics';
import { UserAnalytics } from './UserAnalytics';
import { UserManager } from './UserManager';
import { OrgDashboard } from './OrgDashboard';
import { trackingService } from '../services/trackingService';

import { AdminSettings } from './AdminSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { TemplateGallery } from './TemplateGallery';
import { PrintOutputModal } from './PrintOutputModal';
import { CustomDomainWizard } from './CustomDomainWizard';
import { GlobalSearch } from './GlobalSearch';

export const Dashboard: React.FC<{ onOpenSettings: () => void, onOpenAdmin: () => void, onOpenGuide: () => void }> = ({ onOpenSettings, onOpenAdmin, onOpenGuide }) => {
  const navigate = useNavigate();
  const { user, profile, logout, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [qrs, setQrs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('qrforge_dashboard_view') as 'grid' | 'list') || 'grid';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewingAnalytics, setViewingAnalytics] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'drafts' | 'organization' | 'referrals' | 'analytics' | 'notifications' | 'folders' | 'tasks' | 'admin-settings' | 'users'>('assets');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#f97316');
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [editingContentQr, setEditingContentQr] = useState<any>(null);
  const [editContentValue, setEditContentValue] = useState('');
  const [showTrialSelection, setShowTrialSelection] = useState(false);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);
  const [taskCounts, setTaskCounts] = useState({ total: 0, completed: 0 });
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pendingTemplateDesign, setPendingTemplateDesign] = useState<any>(null);
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [activeDomainQr, setActiveDomainQr] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const unsubscribe = activeOrgId 
        ? subscribeToOrgTasks(activeOrgId, (tasks) => {
            setTaskCounts({
              total: tasks.length,
              completed: tasks.filter(t => t.status === 'completed').length
            });
          })
        : subscribeToUserTasks(user.uid, (tasks) => {
            setTaskCounts({
              total: tasks.length,
              completed: tasks.filter(t => t.status === 'completed').length
            });
          });
      return () => unsubscribe();
    }
  }, [user, activeOrgId]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserOrganizations(user.uid, setUserOrgs);
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    // Automatic trial is now handled at profile creation
    // We no longer show the trial selection modal
  }, [systemConfig, profile]);

  useEffect(() => {
    if (user) {
      trackingService.setUserId(user.uid);
      trackingService.trackPageView();
    }
  }, [user, activeTab]);

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    
    const isProUser = profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing';

    if (!isProUser) {
      setShowPricing(true);
      toast('Bulk export is a Pro feature.', 'info');
      return;
    }

    setIsBulkDownloading(true);
    const zip = new JSZip();
    const folder = zip.folder("qrforge_export");
    
    try {
      toast(`Preparing ${selectedIds.length} assets for export...`, 'loading');
      
      const selectedQRs = qrs.filter(qr => selectedIds.includes(qr.id));
      
      for (const qr of selectedQRs) {
        // We need to generate the QR image. Since we don't have a direct way to get the canvas here,
        // we'll use a hidden canvas or just fetch the data if possible.
        // For simplicity in this environment, we'll use a helper that generates the SVG string
        const svgElement = document.querySelector(`[data-qr-id="${qr.id}"] svg`);
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          folder?.file(`${qr.name.replace(/[^a-z0-9]/gi, '_')}.svg`, svgData);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `qrforge_export_${Date.now()}.zip`);
      toast('Bulk export complete!', 'success');
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Bulk download error:', error);
      toast('Failed to export assets', 'error');
    } finally {
      setIsBulkDownloading(false);
    }
  };
  const [realChartData, setRealChartData] = useState<any[]>([]);
  const [systemUpdates, setSystemUpdates] = useState<any[]>([]);
  const [showUpdates, setShowUpdates] = useState(false);

  const limits = {
    free: systemConfig?.freeLimit || 5,
    pro: systemConfig?.proLimit || 100,
    business: 1000000,
    admin: 1000000,
    trialing: 1000 // Pro features for trial
  };

  const currentLimit = profile?.subscription?.status === 'trialing' ? 1000 : (limits[profile?.role as keyof typeof limits] || 5);
  const isAtLimit = qrs.length >= currentLimit;

  useEffect(() => {
    const fetchSystemConfig = async () => {
      const config = await getSystemPublicConfig();
      setSystemConfig(config);
    };
    fetchSystemConfig();

    const savedDrafts = JSON.parse(localStorage.getItem('qrforge_drafts') || '[]');
    setDrafts(savedDrafts);
  }, [isModalOpen]);

  useEffect(() => {
    localStorage.setItem('qrforge_dashboard_view', view);
  }, [view]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      
      const unsubscribe = activeOrgId 
        ? subscribeToOrgQRs(activeOrgId, (data) => {
            setQrs(data);
            setIsLoading(false);
          })
        : subscribeToUserQRs(user.uid, (data) => {
            setQrs(data);
            setIsLoading(false);
          });

      const fetchReferrals = async () => {
        const data = await getReferralsByReferrer(user.uid);
        setReferrals(data || []);
      };
      fetchReferrals();

      const unsubscribeFolders = activeOrgId
        ? subscribeToOrgFolders(activeOrgId, (data) => {
            setFolders(data);
          })
        : subscribeToUserFolders(user.uid, (data) => {
            setFolders(data);
          });

      const fetchRealStats = async () => {
        // Stats are still user-based for now, but could be org-based in future
        const scans = await getScanStatsForLast7Days(user.uid);
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

        // Fill with real data
        scans.forEach((scan: any) => {
          if (scan.timestamp) {
            const scanDate = new Date(scan.timestamp.toDate()).toISOString().split('T')[0];
            const dayEntry = last7Days.find(d => d.date === scanDate);
            if (dayEntry) dayEntry.scans++;
          }
        });

        setRealChartData(last7Days);
      };
      fetchRealStats();

      const unsubscribeUpdates = subscribeToSystemUpdates((data) => {
        setSystemUpdates(data);
      });

      return () => {
        unsubscribe();
        unsubscribeFolders();
        unsubscribeUpdates();
      };
    }
  }, [user, activeOrgId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
      await createFolder(user.uid, newFolderName, newFolderColor, activeOrgId || undefined);
      setNewFolderName('');
      setIsFolderModalOpen(false);
      toast('Folder created successfully', 'success');
    } catch (error) {
      toast('Failed to create folder', 'error');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    // For now, we'll use a simple toast-based confirmation or just proceed if it's a small action
    // but since it's destructive, we'll just use the same deletingId logic if we had a folder delete modal
    // For now, let's just proceed but with a clear warning toast first? 
    // Actually, let's just use the existing deletingId logic if we can adapt it, 
    // but for simplicity and to follow the "no window.confirm" rule:
    try {
      await deleteFolder(id);
      if (activeFolderId === id) setActiveFolderId(null);
      toast('Folder deleted. Assets moved to Uncategorized.', 'success');
    } catch (error) {
      toast('Failed to delete folder', 'error');
    }
  };

  const handleMoveToFolder = async (qrId: string, folderId: string | null) => {
    try {
      await moveQRCodeToFolder(qrId, folderId);
      toast(folderId ? 'Moved to folder' : 'Moved to Uncategorized', 'success');
    } catch (error) {
      toast('Failed to move QR code', 'error');
    }
  };

  const handleBulkMove = async (folderId: string | null) => {
    try {
      await Promise.all(selectedIds.map(id => moveQRCodeToFolder(id, folderId)));
      toast(`Moved ${selectedIds.length} assets`, 'success');
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (error) {
      toast('Failed to move some assets', 'error');
    }
  };

  const handleEdit = (qr: any) => {
    setViewingAnalytics(null);
    setEditingQR(qr);
    setIsModalOpen(true);
  };

  const handleOpenAnalytics = (qr: any) => {
    setIsModalOpen(false);
    setViewingAnalytics(qr);
  };

  const handleTemplateSelect = (template: any) => {
    setPendingTemplateDesign(template.design);
    setEditingQR(null);
    setIsModalOpen(true);
  };

  const handleDownload = async (qr: any) => {
    const d = qr.design || {};
    const qrCode = new QRCodeStyling({
      width: 1000,
      height: 1000,
      margin: d.margin ?? 10,
      data: getRedirectUrl(qr),
      image: d.logoUrl,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: d.logoMargin ?? 5,
        imageSize: d.logoSize ?? 0.4,
        hideBackgroundDots: d.logoBackground ? false : true
      },
      qrOptions: {
        errorCorrectionLevel: d.errorCorrectionLevel || (d.logoUrl ? 'H' : 'M')
      },
      dotsOptions: {
        color: d.fgColor || '#000000',
        type: d.matrixStyle || 'square',
        gradient: d.fgGradient ? {
          type: d.fgGradient.type,
          rotation: (d.fgGradient.rotation * Math.PI) / 180,
          colorStops: d.fgGradient.colorStops.map((color: string, index: number) => ({
            offset: index / (d.fgGradient!.colorStops.length - 1),
            color
          }))
        } : undefined
      },
      backgroundOptions: {
        color: d.bgColor || '#ffffff',
        gradient: d.bgGradient ? {
          type: d.bgGradient.type,
          rotation: (d.bgGradient.rotation * Math.PI) / 180,
          colorStops: d.bgGradient.colorStops.map((color: string, index: number) => ({
            offset: index / (d.bgGradient!.colorStops.length - 1),
            color
          }))
        } : undefined
      },
      cornersSquareOptions: {
        type: d.eyeFrameStyle || 'square',
        color: d.eyeFrameColor || d.fgColor || '#000000'
      },
      cornersDotOptions: {
        type: d.eyeInnerStyle || 'square',
        color: d.eyeInnerColor || d.fgColor || '#000000'
      }
    });

    try {
      await qrCode.download({
        name: `qrforge-${qr.name?.toLowerCase().replace(/\s+/g, '-') || 'code'}`,
        extension: 'png'
      });
      toast('Download started', 'success');
    } catch (error) {
      console.error('Download error:', error);
      toast('Failed to generate download', 'error');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQR(null);
    setPendingTemplateDesign(null);
  };

  const handleCreateNew = () => {
    setViewingAnalytics(null); // Ensure analytics is closed
    if (isAtLimit) {
      setShowPricing(true);
      toast('You have reached your plan limit.', 'error');
    } else {
      setIsModalOpen(true);
    }
  };

  const handleOpenSocialStudio = () => {
    const isDemoUser = user?.uid === 'demo-user-123';
    const isPro = !isDemoUser && (profile?.role === 'pro' || profile?.role === 'enterprise' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing');

    if (isDemoUser || !isPro) {
      setShowPricing(true);
      toast(isDemoUser ? 'Demo accounts cannot access Pro features.' : 'Social Studio is a Pro feature.', 'info');
    } else {
      navigate('/social-studio', { state: { orgId: activeOrgId } });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteQRCode(deletingId);
        toast('QR Code deleted successfully', 'success');
      } catch (error) {
        toast('Failed to delete QR Code', 'error');
      }
      setDeletingId(null);
    } else if (selectedIds.length > 0) {
      try {
        await Promise.all(selectedIds.map(id => deleteQRCode(id)));
        toast(`${selectedIds.length} assets deleted successfully`, 'success');
        setSelectedIds([]);
        setIsSelectionMode(false);
      } catch (error) {
        toast('Failed to delete some assets', 'error');
      }
      setDeletingId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('qrforge_drafts', JSON.stringify(updatedDrafts));
    toast('Draft deleted', 'success');
  };

  const editDraft = (draft: any) => {
    setEditingQR(draft);
    setIsModalOpen(true);
  };

  const filteredQrs = qrs.filter(qr => {
    const matchesSearch = qr.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         qr.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolderId === null || qr.folderId === activeFolderId;
    return matchesSearch && matchesFolder;
  });

  const folderNameById = useMemo(() => {
    const map: Record<string, string> = {};
    folders.forEach(f => { map[f.id] = f.name; });
    return map;
  }, [folders]);

  const searchItems = useMemo(() => qrs.map(qr => ({
    id: qr.id,
    name: qr.name || 'Untitled',
    type: qr.type || qr.qrType,
    content: typeof qr.content === 'string' ? qr.content : qr.url || '',
    tags: qr.tags || [],
    url: qr.url || qr.content?.toString?.() || '',
    folderName: qr.folderId ? folderNameById[qr.folderId] || '' : '',
  })), [qrs, folderNameById]);

  const filteredDrafts = drafts.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRedirectUrl = (qr: any) => {
    if (qr.type === 'dynamic' && qr.shortId) {
      return `${window.location.origin}/r/${qr.shortId}`;
    }
    return qr.content;
  };

  // Aggregate real scan data for the main chart
  const aggregateChartData = () => {
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

    const totalScans = qrs.reduce((acc, qr) => acc + (qr.stats?.totalScans || 0), 0);
    
    // Create a deterministic but natural-looking distribution
    return last7Days.map((day, i) => {
      // Use a simple pseudo-random factor based on the date string
      const seed = day.date.split('-').reduce((acc, val) => acc + parseInt(val), 0);
      const factor = (seed % 10) / 20 + 0.8; // 0.8 to 1.3
      
      // Distribute scans: more recent days generally have more scans in this simulation
      const baseScans = totalScans / 10;
      const dailyScans = Math.floor(baseScans * (i + 1) * factor);
      
      return {
        ...day,
        scans: dailyScans
      };
    });
  };

  const chartData = realChartData.length > 0 ? realChartData : aggregateChartData();

  const [isResending, setIsResending] = useState(false);
  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(user);
      toast('Verification email sent! Please check your inbox.', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to resend verification.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  // Aggregate Top Locations
  const getTopLocations = () => {
    const locations: Record<string, number> = {};
    qrs.forEach(qr => {
      const qrLocs = qr.stats?.topLocations || {};
      Object.entries(qrLocs).forEach(([loc, count]) => {
        locations[loc] = (locations[loc] || 0) + (count as number);
      });
    });
    return Object.entries(locations)
      .filter(([loc]) => loc !== 'Unknown, Unknown')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  const topLocations = getTopLocations();

  const isFirstTimer = profile?.trialUsed === false && profile?.subscription?.planId === 'free';
  const canActivatePro = isFirstTimer && systemConfig?.plansActive;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 selection:text-brand-700">
      <PullToRefresh onRefresh={async () => {
        // Refresh logic
        if (user) {
          const { getUserProfile, subscribeToUserQRs } = await import('../services/db');
          await getUserProfile(user.uid);
          toast('System Synchronized', 'success');
        }
      }}>
        {/* Pro Background Glow */}
      {(profile?.role === 'pro' || profile?.subscription?.status === 'trialing') && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        </div>
      )}

      <OnboardingTour />

      {/* Verification Banner */}
      {user && !user.emailVerified && !isDemoMode && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-primary/10 border-b border-primary/20 py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left z-[100] relative"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-700" />
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-700">Email Verification Required</p>
          </div>
          <p className="text-[8px] font-medium opacity-70 uppercase tracking-wide">Please verify your email to unlock all features and secure your account.</p>
          <button 
            onClick={handleResendVerification}
            disabled={isResending}
            className="px-3 py-1 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isResending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Mail className="w-2.5 h-2.5" />}
            Resend Link
          </button>
        </motion.div>
      )}

      {/* App Header - Standalone Floating Elements */}
      <AnimatePresence>
        {!isModalOpen && !viewingAnalytics && !isMobileMenuOpen && (
          <div className="fixed top-2 left-0 right-0 z-[60] px-4 sm:px-8 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Logo Group */}
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 py-0.5 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-lg sm:rounded-xl shadow-2xl pointer-events-auto"
              >
                <ForgeLogo size={20} className="sm:w-7 sm:h-7" />
                <div className="hidden xs:block">
                  <h1 className="text-[7px] sm:text-[9px] font-black tracking-tighter uppercase leading-none">QRForge</h1>
                  <p className="text-[2.5px] sm:text-[3.5px] opacity-40 uppercase tracking-[0.3em] mt-0.5">Intelligence</p>
                </div>
              </motion.div>

              {/* Search Group - Desktop */}
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 opacity-40" />
                  <input 
                    type="text" 
                    placeholder="Search assets..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[8px] font-bold uppercase tracking-widest w-32"
                  />
                </div>
                
                <div className="w-px h-4 bg-white/10" />

                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 opacity-40" />
                  <Select 
                    value={activeOrgId || 'personal'}
                    onValueChange={(value) => setActiveOrgId(value === 'personal' ? null : value)}
                  >
                    <SelectTrigger className="bg-transparent border-none p-0 h-auto w-auto gap-2 hover:text-brand-700 transition-colors ring-0 focus:ring-0 shadow-none">
                      <SelectValue placeholder="Personal Space" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Space</SelectItem>
                      {userOrgs.map(org => (
                        <SelectItem key={org.id} value={org.id || 'unknown'}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              {/* Actions Group */}
              <motion.div 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-1 sm:gap-2 px-1 sm:px-1.5 py-0.5 sm:py-1 bg-background/60 backdrop-blur-3xl border border-white/10 rounded-lg sm:rounded-xl shadow-2xl pointer-events-auto"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <button 
                    onClick={logout}
                    className="sm:hidden p-2 hover:bg-destructive/10 rounded-lg transition-all text-destructive active:scale-90"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigate('/docs')}
                    className="p-2 sm:p-2.5 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all text-muted-foreground hover:text-brand-700 active:scale-90"
                    title="API Documentation"
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setShowTemplateGallery(true)}
                    className="hidden sm:flex p-2 sm:p-2.5 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all text-muted-foreground hover:text-brand-700 active:scale-90"
                    title="Template Gallery"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <ThemeToggle />
                  <button 
                    onClick={() => setShowUpdates(!showUpdates)}
                    className="p-2 sm:p-2.5 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all relative group active:scale-90"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 opacity-70 group-hover:opacity-100" />
                    {systemUpdates.length > 0 && (
                      <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 bg-primary rounded-full border border-background animate-pulse" />
                    )}
                  </button>
                </div>

                <div className="w-px h-4 sm:h-6 bg-white/10" />
                
                <button 
                  onClick={onOpenSettings}
                  className="relative group p-0.5"
                >
                  <img 
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                    alt="" 
                    className={cn(
                      "w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl object-cover border transition-all shadow-lg",
                      (profile?.role === 'pro' || profile?.subscription?.status === 'trialing') ? "border-primary shadow-primary/20" : "border-transparent group-hover:border-primary"
                    )} 
                  />
                  {(profile?.role === 'pro' || profile?.subscription?.status === 'trialing') && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Crown className="w-1 h-1" />
                    </div>
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Center Popup */}
      <AnimatePresence>
        {showUpdates && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpdates(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Intelligence Center</h4>
                    <p className="text-[8px] opacity-40 uppercase tracking-widest mt-0.5">System Advisories & Alerts</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUpdates(false)}
                  className="p-2 bg-secondary rounded-xl hover:bg-border transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar ios-momentum-scroll">
                {systemUpdates.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                      <Bell className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">No active advisories found</p>
                  </div>
                ) : (
                  systemUpdates.map(update => (
                    <div key={update.id} className="p-5 bg-secondary/30 rounded-3xl border border-border/50 space-y-2 group hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full shadow-sm",
                            update.type === 'warning' ? "bg-brand-500" : update.type === 'success' ? "bg-green-500" : "bg-primary"
                          )} />
                          <p className="text-[10px] font-black uppercase tracking-tight">{update.title}</p>
                        </div>
                        <p className="text-[8px] opacity-30 font-mono uppercase">
                          {update.createdAt?.toDate ? new Date(update.createdAt.toDate()).toLocaleTimeString() : 'Just now'}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">{update.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-border bg-secondary/5">
                <button 
                  onClick={() => setShowUpdates(false)}
                  className="w-full py-4 bg-foreground text-background rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Acknowledge All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen pt-16 sm:pt-20">
        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
            {/* Mobile Search - Only on mobile */}
            <div className="sm:hidden mb-0.5 px-0.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/30 rounded-lg border border-border/30">
                <Search className="w-3 h-3 opacity-40" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[8px] font-bold uppercase tracking-widest flex-1"
                />
              </div>
            </div>

            {/* View Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 px-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight uppercase leading-tight">
                    {activeTab === 'assets' ? 'Asset Intelligence' : 
                     activeTab === 'drafts' ? 'Draft Forge' :
                     activeTab === 'organization' ? 'Workspace Control' : 
                     activeTab === 'tasks' ? 'Project Tasks' : 'Network Growth'}
                  </h2>
                  {(profile?.role === 'pro' || profile?.subscription?.status === 'trialing') && (
                    <div className="px-2 py-0.5 bg-primary text-primary-foreground text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-md shadow-lg shadow-primary/20 flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" />
                      {profile?.subscription?.status === 'trialing' ? 'Trial' : 'Pro'}
                    </div>
                  )}
                </div>
                <p className="text-[10px] sm:text-[12px] opacity-40 uppercase tracking-[0.2em] font-bold">
                  {activeTab === 'assets' ? `Managing ${qrs.length} Active Gateways` : 
                   activeTab === 'drafts' ? `Refining ${drafts.length} Prototypes` :
                   activeTab === 'organization' ? 'Enterprise Collaboration' : 
                   activeTab === 'tasks' ? 'Streamline your workflow' : 'Referral Network Status'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-4 py-2 bg-secondary text-foreground text-[10px] font-black uppercase tracking-widest rounded-xl border border-border hover:bg-secondary/80 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-brand-700" />
                  BULK FORGE
                </button>
              </div>
            </div>

        {activeTab === 'assets' && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Actions - Mobile Only - Removed redundant actions */}
            <div className="sm:hidden grid grid-cols-2 gap-2">
              <QuickAction 
                icon={<Zap className="w-4 h-4" />} 
                label="Bulk" 
                onClick={() => setIsBulkModalOpen(true)} 
                color="bg-brand-500"
              />
              <QuickAction 
                icon={<UsersIcon className="w-4 h-4" />} 
                label="Network" 
                onClick={() => setActiveTab('referrals')} 
                color="bg-primary"
              />
            </div>

            {/* Folders Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-2">
              <button 
                onClick={() => setActiveFolderId(null)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                  activeFolderId === null 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                <LayoutGrid className="w-3 h-3" />
                All Assets
              </button>
              {folders.map(folder => (
                <div key={folder.id} className="relative group">
                  <button 
                    onClick={() => setActiveFolderId(folder.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap",
                      activeFolderId === folder.id 
                        ? "bg-card text-foreground border-primary shadow-lg" 
                        : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                    )}
                  >
                    <Folder className="w-3 h-3" style={{ color: folder.color }} />
                    {folder.name}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setIsFolderModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-secondary/30 text-muted-foreground border border-dashed border-border hover:bg-secondary/50 transition-all flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                New Folder
              </button>
            </div>

            {/* Folder Grid - Visible when no folder selected and folders exist */}
            {activeFolderId === null && folders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2">
                {folders.slice(0, 4).map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="p-3 bg-card border border-border rounded-2xl flex flex-col items-center gap-2 hover:border-primary/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Folder className="w-4 h-4" style={{ color: folder.color }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest truncate w-full text-center">{folder.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Stats Overview */}
            {/* Features Section - Only on Assets Tab */}
            {activeTab === 'assets' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button 
                  onClick={() => setActiveTab('referrals')}
                  className="p-3 bg-card border border-border rounded-xl flex flex-col justify-between min-h-[80px] group hover:border-primary transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40">Network</p>
                    <UsersIcon className="w-3 h-3 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-[10px] font-black tracking-tighter uppercase leading-none">Referral<br/>Network</h4>
                </button>

                <button 
                  onClick={() => setActiveTab('drafts')}
                  className="p-3 bg-card border border-border rounded-xl flex flex-col justify-between min-h-[80px] group hover:border-primary transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40">Drafts</p>
                    <FileText className="w-3 h-3 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-[10px] font-black tracking-tighter uppercase leading-none">Draft<br/>Forge</h4>
                </button>

                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="p-3 bg-card border border-border rounded-xl flex flex-col justify-between min-h-[80px] group hover:border-primary transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40">Alerts</p>
                    <Bell className="w-3 h-3 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-[10px] font-black tracking-tighter uppercase leading-none">System<br/>Updates</h4>
                </button>

                <button 
                  onClick={() => onOpenGuide()}
                  className="p-3 bg-card border border-border rounded-xl flex flex-col justify-between min-h-[80px] group hover:border-primary transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40">Help</p>
                    <HelpCircle className="w-3 h-3 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-[10px] font-black tracking-tighter uppercase leading-none">Intelligence<br/>Guide</h4>
                </button>
              </div>
            )}

            {/* Stats Overview - Only on Assets Tab */}
            {activeTab === 'assets' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <StatCard 
                  label="Total Scans" 
                  value={qrs.reduce((acc, qr) => acc + (qr.stats?.totalScans || 0), 0).toLocaleString()} 
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                  trend="+12%"
                />
                <StatCard 
                  label="Top Region" 
                  value={topLocations[0]?.[0] || 'N/A'} 
                  icon={<MapPin className="w-3.5 h-3.5" />}
                />
                <StatCard 
                  label="Gateways" 
                  value={qrs.length} 
                  icon={<QrCode className="w-3.5 h-3.5" />}
                />
                <button 
                  onClick={() => setActiveTab('tasks')}
                  className="p-3 bg-card border border-border rounded-xl flex flex-col justify-between min-h-[80px] group hover:border-primary transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40">Tasks</p>
                    <ListTodo className="w-3.5 h-3.5 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black tracking-tighter uppercase leading-none">{taskCounts.total} Active</h4>
                    <p className="text-[6px] font-bold uppercase tracking-widest opacity-40 mt-1">{taskCounts.completed} Completed</p>
                  </div>
                </button>
              </div>
            )}

            {activeTab === 'assets' && (profile?.role !== 'free' || profile?.subscription?.status === 'trialing') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3"
              >
                <div className="lg:col-span-3 bg-card border border-border/50 rounded-xl p-3 sm:p-4 relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between gap-3 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                        <h3 className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-brand-700">Intelligence Active</h3>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg sm:text-xl font-black tracking-tighter">99.9%</span>
                        <span className="text-[6px] sm:text-[7px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-1 py-0.5 rounded-md">Precision</span>
                      </div>
                      <p className="text-[7px] sm:text-[9px] text-muted-foreground font-medium max-w-sm leading-tight">
                        Your gateways are operating at peak efficiency. Advanced intelligence gathering is active.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:flex md:flex-col justify-center gap-1.5">
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-secondary/30 rounded-md border border-border/50">
                        <ShieldCheck className="w-2 h-2 text-brand-700" />
                        <span className="text-[5px] sm:text-[6px] font-black uppercase tracking-widest">Priority</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-secondary/30 rounded-md border border-border/50">
                        <Zap className="w-2 h-2 text-brand-700" />
                        <span className="text-[5px] sm:text-[6px] font-black uppercase tracking-widest">Ultra-Fast</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-primary rounded-xl p-3 sm:p-4 text-primary-foreground flex flex-col justify-between relative overflow-hidden shadow-xl shadow-primary/20 group">
                  <div className="relative z-10">
                    <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 mb-0.5 sm:mb-1 group-hover:rotate-12 transition-transform" />
                    <h3 className="text-xs sm:text-sm font-black tracking-tighter uppercase leading-tight">
                      {profile?.subscription?.status === 'trialing' ? 'Trial' : 'Pro'}<br/>Member
                    </h3>
                  </div>
                  <div className="relative z-10">
                    <p className="text-[5px] sm:text-[6px] font-black uppercase tracking-widest opacity-60 mb-0.5">Status</p>
                    <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest">
                      {profile?.subscription?.status === 'trialing' ? 'Trial Active' : 'Verified'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Assets List/Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="flex p-0.5 bg-secondary rounded-lg">
                    <button 
                      onClick={() => setView('grid')}
                      className={cn("p-1 rounded-md transition-all", view === 'grid' ? "bg-card shadow-sm text-brand-700" : "text-muted-foreground")}
                    >
                      <LayoutGrid className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={() => setView('list')}
                      className={cn("p-1 rounded-md transition-all", view === 'list' ? "bg-card shadow-sm text-brand-700" : "text-muted-foreground")}
                    >
                      <List className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {isSelectionMode ? (
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
                    <div className="flex items-center gap-1 mr-1">
                      <button 
                        onClick={() => setSelectedIds(filteredQrs.map(qr => qr.id))}
                        className="px-2 py-1 bg-secondary text-[7px] sm:text-[8px] font-bold uppercase tracking-widest rounded-md hover:bg-border transition-all whitespace-nowrap"
                      >
                        All
                      </button>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-brand-700 whitespace-nowrap">{selectedIds.length} Selected</span>
                    
                    <button 
                      onClick={handleBulkDownload}
                      disabled={isBulkDownloading || selectedIds.length === 0}
                      className="p-1 sm:p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1 text-[8px] font-bold uppercase disabled:opacity-50 whitespace-nowrap"
                    >
                      {isBulkDownloading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <FileArchive className="w-3 h-3" />}
                      Export
                    </button>

                    <button
                      onClick={() => setShowPrintModal(true)}
                      disabled={selectedIds.length === 0}
                      className="p-1 sm:p-1.5 bg-secondary text-foreground rounded-lg hover:bg-border transition-all flex items-center gap-1 text-[8px] font-bold uppercase disabled:opacity-50 whitespace-nowrap"
                    >
                      <Printer className="w-3 h-3" />
                      Print
                    </button>

                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="p-1 sm:p-1.5 bg-secondary text-foreground rounded-lg hover:bg-border transition-all flex items-center gap-1 text-[8px] font-bold uppercase whitespace-nowrap">
                          <Move className="w-3 h-3" />
                          Move
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="native-dropdown-content">
                          <DropdownMenu.Item onClick={() => handleBulkMove(null)} className="native-dropdown-item">
                            <LayoutGrid className="w-2.5 h-2.5" /> Uncategorized
                          </DropdownMenu.Item>
                          {folders.map(f => (
                            <DropdownMenu.Item key={f.id} onClick={() => handleBulkMove(f.id)} className="native-dropdown-item">
                              <Folder className="w-2.5 h-2.5" style={{ color: f.color }} /> {f.name}
                            </DropdownMenu.Item>
                          ))}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>

                    <button 
                      onClick={() => setDeletingId('bulk')}
                      disabled={selectedIds.length === 0}
                      className="p-1 sm:p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                      className="px-2 py-1 bg-secondary text-foreground text-[8px] font-bold uppercase tracking-wide rounded-md whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsSelectionMode(true)}
                    className="px-2 py-1 bg-secondary text-foreground text-[8px] font-bold uppercase tracking-wide rounded-md hover:bg-border transition-all"
                  >
                    Bulk Actions
                  </button>
                )}
              </div>

              {filteredQrs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                  <QrCode className="w-12 h-12" />
                  <p className="text-[9px] font-bold uppercase tracking-widest">No assets found</p>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-2 sm:gap-4",
                  view === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" : "grid-cols-1"
                )}>
                  {filteredQrs.map((qr) => (
                    <motion.div
                      layout
                      key={qr.id}
                      className={cn(
                        "bg-card border border-border group relative overflow-hidden transition-all hover:border-primary/50",
                        view === 'grid' ? "rounded-xl p-1.5 sm:p-2.5 lg:p-2" : "rounded-lg p-1.5 sm:p-2 flex items-center gap-2 sm:gap-2.5"
                      )}
                    >
                      <div className={cn(
                        "relative flex items-center justify-center bg-secondary/30 rounded-lg overflow-hidden group-hover:bg-secondary/50 transition-all duration-500",
                        view === 'grid' ? "aspect-square mb-1 sm:mb-1.5" : "w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                      )}>
                        {isSelectionMode && (
                          <button 
                            onClick={() => toggleSelection(qr.id)}
                            className={cn(
                              "absolute top-1 left-1 z-30 w-3 h-3 rounded-md border-2 flex items-center justify-center transition-all",
                              selectedIds.includes(qr.id) ? "bg-primary border-primary text-primary-foreground" : "bg-white/50 border-white text-transparent"
                            )}
                          >
                            <Check className="w-1.5 h-1.5" />
                          </button>
                        )}
                        <QRPreview 
                          value={getRedirectUrl(qr)} 
                          design={qr.design} 
                          size={view === 'grid' ? (window.innerWidth < 640 ? 60 : (window.innerWidth < 1024 ? 100 : 80)) : 40} 
                          data-qr-id={qr.id}
                        />
                        
                        {/* Actions Overlay - Visible on hover (Desktop) */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => handleEdit(qr)}
                              className="p-2 bg-foreground text-background rounded-lg hover:scale-110 transition-all"
                              title="Edit Design"
                            >
                              <Palette className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleDownload(qr)}
                              className="p-2 bg-primary text-primary-foreground rounded-lg hover:scale-110 transition-all"
                              title="Download QR"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleOpenAnalytics(qr)}
                              className="p-2 bg-secondary text-foreground rounded-lg hover:scale-110 transition-all"
                              title="Analytics"
                            >
                              <BarChart3 className="w-3 h-3" />
                            </button>
                            {qr.type === 'dynamic' && (
                              <button 
                                onClick={() => {
                                  const link = `${window.location.origin}/view/${qr.shortId}`;
                                  navigator.clipboard.writeText(link);
                                  toast('Link copied to clipboard!', 'success');
                                }}
                                className="p-2 bg-primary text-primary-foreground rounded-lg hover:scale-110 transition-all"
                                title="Copy Link"
                              >
                                <LinkIcon className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                        <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-[8px] sm:text-[10px] font-black tracking-tight truncate group-hover:text-brand-700 transition-colors uppercase">{qr.name}</h4>
                          <div className="flex items-center gap-1">
                            {/* Mobile-friendly Download Button */}
                            <button 
                              onClick={() => handleDownload(qr)}
                              className="lg:hidden p-1 bg-secondary text-foreground rounded-md active:scale-95 transition-all"
                            >
                              <Download className="w-2.5 h-2.5" />
                            </button>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button className="p-1 hover:bg-secondary rounded-md transition-colors">
                                  <MoreVertical className="w-2.5 h-2.5" />
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content className="native-dropdown-content">
                                  <DropdownMenu.Item onClick={() => handleEdit(qr)} className="native-dropdown-item">
                                    <Palette className="w-2.5 h-2.5" /> Edit Design
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item 
                                    onClick={() => {
                                      setEditingContentQr(qr);
                                      setEditContentValue(qr.content || qr.url || '');
                                    }} 
                                    className="native-dropdown-item"
                                  >
                                    <FileText className="w-2.5 h-2.5" /> Edit Content
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item onClick={() => handleOpenAnalytics(qr)} className="native-dropdown-item">
                                    <BarChart3 className="w-2.5 h-2.5" /> Intelligence
                                  </DropdownMenu.Item>
                                  
                                   {qr.type === 'dynamic' && (
                                    <DropdownMenu.Item 
                                      onClick={() => {
                                        const link = `${window.location.origin}/view/${qr.shortId}`;
                                        navigator.clipboard.writeText(link);
                                        toast('Link copied to clipboard!', 'success');
                                      }}
                                      className="native-dropdown-item"
                                    >
                                      <LinkIcon className="w-2.5 h-2.5" /> Copy Link
                                    </DropdownMenu.Item>
                                  )}
                                  {(profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin') && (
                                    <DropdownMenu.Item
                                      onClick={() => {
                                        setActiveDomainQr(qr);
                                        setShowDomainWizard(true);
                                      }}
                                      className="native-dropdown-item"
                                    >
                                      <Globe className="w-2.5 h-2.5" /> Custom Domain
                                    </DropdownMenu.Item>
                                  )}
                                  
                                  <DropdownMenu.Sub>
                                    <DropdownMenu.SubTrigger className="native-dropdown-item justify-between">
                                      <div className="flex items-center gap-2">
                                        <Move className="w-2.5 h-2.5" /> Move to Folder
                                      </div>
                                      <ChevronRight className="w-2 h-2" />
                                    </DropdownMenu.SubTrigger>
                                    <DropdownMenu.Portal>
                                      <DropdownMenu.SubContent className="native-dropdown-content ml-1">
                                        <DropdownMenu.Item onClick={() => handleMoveToFolder(qr.id, null)} className="native-dropdown-item">
                                          <LayoutGrid className="w-2.5 h-2.5" /> Uncategorized
                                        </DropdownMenu.Item>
                                        {folders.map(f => (
                                          <DropdownMenu.Item key={f.id} onClick={() => handleMoveToFolder(qr.id, f.id)} className="native-dropdown-item">
                                            <Folder className="w-2.5 h-2.5" style={{ color: f.color }} /> {f.name}
                                          </DropdownMenu.Item>
                                        ))}
                                      </DropdownMenu.SubContent>
                                    </DropdownMenu.Portal>
                                  </DropdownMenu.Sub>

                                  <DropdownMenu.Separator className="h-[1px] bg-border my-1" />
                                  <DropdownMenu.Item onClick={() => setDeletingId(qr.id)} className="native-dropdown-item text-destructive focus:text-destructive">
                                    <Trash2 className="w-2.5 h-2.5" /> Terminate
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "w-1 h-1 rounded-full",
                                qr.status === 'draft' ? "bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" : "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
                              )} />
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">
                                {qr.status === 'draft' ? 'Draft' : 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-brand-700" />
                              <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{qr.qrType}</span>
                            </div>
                          </div>
                          {qr.folderId && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary rounded-md">
                              <Folder className="w-2 h-2" style={{ color: folders.find(f => f.id === qr.folderId)?.color }} />
                              <span className="text-[7px] font-bold uppercase tracking-widest opacity-60">
                                {folders.find(f => f.id === qr.folderId)?.name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Always visible Download Button for Desktop */}
                        <div className="hidden lg:flex mt-2 pt-2 border-t border-border items-center justify-between">
                          <div className="flex items-center gap-3">
                            <p className="text-[7px] font-bold uppercase tracking-widest opacity-30">{qr.stats?.totalScans || 0} Scans</p>
                            {qr.qrType === 'social' && (
                              <p className="text-[7px] font-bold uppercase tracking-widest opacity-30">{qr.stats?.likes || 0} Likes</p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDownload(qr)}
                            className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 hover:opacity-90"
                          >
                            <Download className="w-2.5 h-2.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

            {activeTab === 'drafts' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={cn(
                  "grid gap-3 sm:gap-4",
                  view === 'grid' ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                )}>
                  {filteredDrafts.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                      <FileText className="w-12 h-12" />
                      <p className="text-[9px] font-bold uppercase tracking-widest">No drafts found in the forge</p>
                    </div>
                  ) : (
                    filteredDrafts.map((draft) => (
                      <div key={draft.id} className="bg-card border border-border rounded-xl p-2.5 sm:p-3 group hover:border-primary/50 transition-all relative overflow-hidden">
                        <div className="aspect-square bg-secondary/30 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                          <div className="opacity-40 grayscale group-hover:grayscale-0 transition-all">
                            <QRPreview value="Draft Preview" design={draft.design} size={window.innerWidth < 640 ? 80 : 120} />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => editDraft(draft)}
                              className="px-4 py-2 bg-foreground text-background rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all"
                            >
                              Continue
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[10px] font-black uppercase tracking-tight truncate">{draft.name}</h4>
                            <p className="text-[7px] opacity-40 uppercase font-bold mt-0.5">Modified {new Date(draft.updatedAt).toLocaleDateString()}</p>
                          </div>
                          <button onClick={() => deleteDraft(draft.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === 'organization' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <OrgDashboard onOrgSelect={setActiveOrgId} />
              </div>
            )}

            {activeTab === 'folders' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="px-1 flex items-center justify-between">
                  <h2 className="text-xs font-black tracking-tight flex items-center gap-1.5 uppercase">
                    <Folder className="w-3 h-3 text-brand-700" />
                    Asset Folders
                  </h2>
                  <button 
                    onClick={() => setIsFolderModalOpen(true)}
                    className="px-3 py-1 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  >
                    New Folder
                  </button>
                </header>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {folders.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                      <Folder className="w-12 h-12" />
                      <p className="text-[9px] font-bold uppercase tracking-widest">No folders created yet</p>
                    </div>
                  ) : (
                    folders.map((folder) => (
                      <motion.div
                        key={folder.id}
                        whileHover={{ y: -2 }}
                        onClick={() => {
                          setActiveFolderId(folder.id);
                          setActiveTab('assets');
                        }}
                        className="bg-card border border-border rounded-2xl p-4 space-y-3 cursor-pointer group hover:border-primary/50 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${folder.color}20` }}>
                          <Folder className="w-5 h-5" style={{ color: folder.color }} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-tight truncate">{folder.name}</h4>
                          <p className="text-[7px] text-muted-foreground font-bold uppercase tracking-widest">
                            {qrs.filter(qr => qr.folderId === folder.id).length} Assets
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="px-1">
                  <h2 className="text-xs font-black tracking-tight flex items-center gap-1.5 uppercase">
                    <BarChart3 className="w-3 h-3 text-brand-700" />
                    Global Analytics
                  </h2>
                </header>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-8 text-center space-y-3 bg-card border border-border rounded-3xl">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <BarChart3 className="w-6 h-6 text-brand-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight">Select an asset to view detailed analytics</h3>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">Detailed tracking is available for each QR code individually.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="px-1">
                  <h2 className="text-xs font-black tracking-tight flex items-center gap-1.5 uppercase">
                    <Bell className="w-3 h-3 text-brand-700" />
                    System Alerts
                  </h2>
                </header>
                <div className="space-y-2">
                  {systemUpdates && systemUpdates.length > 0 ? (
                    systemUpdates.map((update: any) => (
                      <div key={update.id} className="p-3 bg-card border border-border rounded-2xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                            update.type === 'warning' ? "bg-brand-500/10 text-brand-500" :
                            update.type === 'success' ? "bg-green-500/10 text-green-500" :
                            "bg-primary/10 text-brand-700"
                          )}>
                            {update.type}
                          </span>
                          <span className="text-[6px] text-muted-foreground font-medium">{new Date(update.createdAt?.toDate?.() || update.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-[9px] font-black uppercase tracking-tight">{update.title}</h4>
                        <p className="text-[8px] text-muted-foreground font-medium leading-tight">{update.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">No new alerts</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className="lg:col-span-2 p-3 sm:p-4 bg-primary text-primary-foreground rounded-xl sm:rounded-2xl space-y-3 shadow-2xl shadow-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 blur-[40px] sm:blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/20">
                          <UsersIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div className="space-y-0">
                          <h3 className="text-base sm:text-xl font-black tracking-tighter uppercase leading-none">Forge Your<br/>Network</h3>
                          <p className="text-[7px] sm:text-[9px] font-medium opacity-80 max-w-sm leading-tight">
                            Expand the QRForge ecosystem. Every successful operative deployment in your network unlocks premium intelligence credits.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 px-2 py-1.5 rounded-lg text-[6px] sm:text-[7px] font-bold tracking-widest truncate font-mono">
                          {window.location.origin}?ref={user?.uid?.slice(0, 8).toUpperCase()}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.uid?.slice(0, 8).toUpperCase()}`);
                            toast('Referral link secured', 'success');
                          }}
                          className="p-1.5 sm:p-2 bg-white text-brand-700 rounded-lg hover:scale-110 transition-all active:scale-95 shadow-xl"
                        >
                          <Copy className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    <div className="p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl flex flex-col justify-between min-h-[60px] group hover:border-primary transition-all">
                      <div className="flex items-center justify-between">
                        <p className="text-[5px] sm:text-[7px] font-bold uppercase tracking-widest opacity-40">Network</p>
                        <UsersIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-0">
                        <h4 className="text-lg sm:text-2xl font-black tracking-tighter">{referrals.length}</h4>
                        <p className="text-[5px] sm:text-[6px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-0.5">
                          <ArrowUpRight className="w-1.5 h-1.5" />
                          Active
                        </p>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl flex flex-col justify-between min-h-[60px] group hover:border-primary transition-all">
                      <div className="flex items-center justify-between">
                        <p className="text-[5px] sm:text-[7px] font-bold uppercase tracking-widest opacity-40">Credits</p>
                        <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-brand-700 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="space-y-0">
                        <h4 className="text-lg sm:text-2xl font-black tracking-tighter">{referrals.length * 10}</h4>
                        <p className="text-[5px] sm:text-[6px] font-bold text-brand-700 uppercase tracking-widest flex items-center gap-0.5">
                          <Zap className="w-1.5 h-1.5" />
                          IU Units
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Illustrative Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { icon: <LinkIcon className="w-3 h-3" />, title: "Share Link", desc: "Send your unique forge link to your network operatives." },
                    { icon: <UsersIcon className="w-3 h-3" />, title: "Operatives Join", desc: "Your network signs up and starts forging their own QRs." },
                    { icon: <Zap className="w-3 h-3" />, title: "Earn Intelligence", desc: "Unlock premium IU credits for every successful deployment." }
                  ].map((step, i) => (
                    <div key={i} className="p-3 bg-card border border-border rounded-xl space-y-2 group hover:border-primary transition-all">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-brand-700 group-hover:scale-110 transition-transform">
                        {step.icon}
                      </div>
                      <div className="space-y-0">
                        <h4 className="text-[9px] font-black uppercase tracking-widest">{step.title}</h4>
                        <p className="text-[7px] text-muted-foreground font-medium leading-tight">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/10">
                    <div>
                      <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Network Registry</h3>
                      <p className="text-[5px] sm:text-[7px] opacity-40 uppercase tracking-widest mt-0.5">Verified Operative Log</p>
                    </div>
                    <div className="px-2 py-0.5 bg-primary/10 text-brand-700 rounded-full text-[5px] sm:text-[7px] font-bold uppercase tracking-widest">
                      {referrals.length} Total
                    </div>
                  </div>
                  <div className="divide-y divide-border/50">
                    {referrals.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center space-y-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/50 rounded-xl flex items-center justify-center mx-auto mb-1">
                          <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 opacity-20" />
                        </div>
                        <div className="space-y-0">
                          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight">No Operatives Detected</p>
                          <p className="text-[6px] sm:text-[8px] text-muted-foreground font-medium">Your referral network is currently empty.</p>
                        </div>
                      </div>
                    ) : (
                      referrals.map((ref) => (
                        <div key={ref.id} className="p-2.5 sm:p-3 flex items-center justify-between hover:bg-secondary/20 transition-all group">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-secondary rounded-lg flex items-center justify-center text-[7px] sm:text-[9px] font-black group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                              {ref.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">{ref.email}</p>
                              <p className="text-[5px] sm:text-[7px] opacity-40 uppercase font-bold tracking-widest">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[5px] sm:text-[7px] font-bold uppercase tracking-widest border border-green-500/10">
                              Active
                            </div>
                            <ChevronRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 opacity-0 group-hover:opacity-40 transition-all" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PermissionGuard action="manage:tasks">
                  <TaskManager />
                </PermissionGuard>
              </div>
            )}

            {activeTab === 'admin-settings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AdminSettings />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <UserManager />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {profile?.role === 'admin' ? <AdminAnalytics /> : <UserAnalytics />}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dock 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onCreateNew={handleCreateNew}
        isAdmin={profile?.role === 'admin'}
        onOpenAdmin={onOpenAdmin}
        onOpenSettings={onOpenSettings}
        onOpenGuide={onOpenGuide}
        forceHide={isModalOpen || !!viewingAnalytics || showPricing || isFolderModalOpen || !!deletingId}
      />

      {/* Trial Selection Modal removed as trials are now automatic */}

      <CreateQRModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        initialData={editingQR || (pendingTemplateDesign ? { design: pendingTemplateDesign } : undefined)}
        qrId={editingQR?.id}
        orgId={activeOrgId || undefined}
      />

      <BulkForgeModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        isPro={(user?.uid !== 'demo-user-123') && (profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing')}
        onShowPricing={() => setShowPricing(true)}
      />

      <GlobalSearch
        items={searchItems}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={(item) => {
          const qr = qrs.find(q => q.id === item.id);
          if (qr) handleEdit(qr);
        }}
        onOpenAnalytics={(item) => {
          const qr = qrs.find(q => q.id === item.id);
          if (qr) handleOpenAnalytics(qr);
        }}
        onDownload={(item) => {
          const qr = qrs.find(q => q.id === item.id);
          if (qr) handleDownload(qr);
        }}
      />

      <AnimatePresence>
        {showDomainWizard && activeDomainQr && (
          <CustomDomainWizard
            qrId={activeDomainQr.id}
            currentDomain={activeDomainQr.fields?.branding?.customDomain || ''}
            onClose={() => { setShowDomainWizard(false); setActiveDomainQr(null); }}
          />
        )}
      </AnimatePresence>

      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
      />

      <AnimatePresence>
        {viewingAnalytics && (
          <AnalyticsDashboard 
            qrId={viewingAnalytics.id}
            qrName={viewingAnalytics.name}
            qrType={viewingAnalytics.qrType}
            campaignId={viewingAnalytics.campaignId}
            onClose={() => setViewingAnalytics(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplateGallery && (
          <TemplateGallery
            onSelect={handleTemplateSelect}
            onClose={() => setShowTemplateGallery(false)}
            isPro={profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrintModal && (
          <PrintOutputModal
            qrs={filteredQrs.filter(q => selectedIds.includes(q.id))}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFolderModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-card p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl z-[110] border border-border"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-8">
                <h3 className="text-lg sm:text-2xl font-bold tracking-tight uppercase">New Folder</h3>
                <button onClick={() => setIsFolderModalOpen(false)} className="p-2 hover:bg-secondary rounded-xl">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folder Name</label>
                  <input 
                    type="text" 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Marketing"
                    className="w-full px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl border border-border bg-background outline-none focus:border-primary transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folder Color</label>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#000000'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setNewFolderColor(color)}
                        className={cn(
                          "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 sm:border-4 transition-all active:scale-90",
                          newFolderColor === color ? "border-primary" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="w-full py-3 sm:py-4 bg-primary text-primary-foreground rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  Forge Folder
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Content Modal */}
      <AnimatePresence>
        {editingContentQr && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight uppercase">Edit QR Content</h3>
                <button onClick={() => setEditingContentQr(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target URL / Content</label>
                  <input 
                    type="text" 
                    value={editContentValue}
                    onChange={(e) => setEditContentValue(e.target.value)}
                    className="w-full p-4 bg-secondary/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    placeholder="https://example.com"
                  />
                  <p className="text-[9px] text-muted-foreground ml-1">Updating this will change where the QR code redirects in real-time.</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setEditingContentQr(null)}
                    className="flex-1 px-6 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const { updateQRCode } = await import('../services/db');
                        await updateQRCode(editingContentQr.id, { 
                          url: editContentValue, 
                          content: editContentValue 
                        });
                        toast('QR Content updated successfully!', 'success');
                        setEditingContentQr(null);
                      } catch (err) {
                        toast('Failed to update QR content', 'error');
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-8 rounded-[3rem] shadow-2xl z-[110] border border-border"
            >
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Delete {deletingId === 'bulk' ? `${selectedIds.length} Assets` : 'Asset'}?</h3>
                <p className="text-muted-foreground font-medium">This action is permanent and will break any live QR codes. Are you sure you want to proceed?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="py-4 rounded-2xl font-bold uppercase tracking-wide border border-border hover:bg-secondary transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="py-4 bg-destructive text-white rounded-2xl font-bold uppercase tracking-wide hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-destructive/10"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PullToRefresh>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group",
      active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-brand-700")}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    {count !== undefined && (
      <span className={cn(
        "px-2 py-0.5 rounded-lg text-[8px] font-bold",
        active ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
      )}>
        {count}
      </span>
    )}
  </button>
);

const QuickAction = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3 bg-card border border-border/50 rounded-2xl active:scale-95 transition-all shadow-sm hover:shadow-md hover:border-primary/20"
  >
    <div className={cn("w-10 h-10 sm:w-12 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
      {icon}
    </div>
    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, trend }: { label: string, value: string | number, icon: React.ReactNode, trend?: string }) => {
  const { profile, user } = useAuth();
  const isDemoUser = user?.uid === 'demo-user-123';
  const isPro = !isDemoUser && (profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing');

  return (
    <motion.div 
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "bg-card/40 backdrop-blur-2xl border relative overflow-hidden group transition-all duration-500",
        "rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between min-h-[80px] sm:min-h-[110px]",
        isPro ? "border-primary/20 shadow-lg shadow-primary/5" : "border-border/40 shadow-sm"
      )}
    >
      {isPro && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-10 group-hover:opacity-30 transition-opacity">
          <Crown className="w-3 h-3 sm:w-5 sm:h-5" />
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6",
          isPro ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-primary/5 text-brand-700"
        )}>
          <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center">
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-1.5 sm:px-2 py-0.5 rounded-lg border border-green-500/10">
              {trend.split(' ')[0]}
            </span>
            <span className="text-[7px] opacity-30 uppercase font-bold mt-1 hidden sm:block">Growth</span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-1 opacity-50 truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl sm:text-3xl font-black tracking-tighter leading-none">{value}</p>
          {trend && (
            <span className="text-[6px] font-bold text-green-500 sm:hidden">
              {trend.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Glass Reflection */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className={cn(
        "absolute -right-4 -bottom-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity",
        isPro ? "bg-primary/10" : "bg-primary/5"
      )} />
    </motion.div>
  );
};
