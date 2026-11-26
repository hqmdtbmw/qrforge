import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { 
  QrCode, FileText, Building2, Users, Plus, 
  LayoutGrid, Folder, ShieldCheck, ChevronUp, Layers, Globe,
  Activity, Settings, HelpCircle, Bell, Home, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Drawer } from './Drawer';

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  mouseX: any;
  isCenter?: boolean;
}

const DockItem = ({ icon, label, onClick, active, mouseX, isCenter }: DockItemProps) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-100, 0, 100], [36, 52, 36]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 200, damping: 15 });

  const handleClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onClick();
  };

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onClick={handleClick}
      className={cn(
        "group relative aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90",
        isCenter 
          ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(var(--primary-rgb),0.3)] scale-110 z-10" 
          : cn(
              "bg-secondary/20 text-muted-foreground hover:bg-secondary hover:text-foreground backdrop-blur-xl border border-white/5",
              active && "bg-primary/10 text-brand-700 border border-primary/20"
            )
      )}
    >
      <div className="flex items-center justify-center">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { 
          className: cn("w-3.5 h-3.5 sm:w-5 sm:h-5", isCenter && "w-4.5 h-4.5 sm:w-6 sm:h-6", (icon.props as any).className) 
        }) : icon}
      </div>
      
      {/* Tooltip - Desktop only */}
      <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[8px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </div>

      {/* Active Indicator */}
      {active && !isCenter && (
        <motion.div 
          layoutId="dock-active"
          className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
        />
      )}
    </motion.div>
  );
};

interface DockProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onCreateNew?: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenDashboard?: () => void;
  onOpenSettings?: () => void;
  onOpenGuide?: () => void;
  isSettings?: boolean;
  hideOnScroll?: boolean;
  forceHide?: boolean;
}

export const Dock: React.FC<DockProps> = ({ 
  activeTab, 
  onTabChange, 
  onCreateNew, 
  isAdmin, 
  onOpenAdmin,
  onOpenDashboard,
  onOpenSettings,
  onOpenGuide,
  isSettings,
  hideOnScroll = true,
  forceHide = false
}) => {
  const { profile, user, updateShortcuts } = useAuth();
  const navigate = useNavigate();
  const mouseX = useMotionValue(Infinity);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts = profile?.shortcuts || ['qr'];

  const handleShortcutAction = (id: string) => {
    setShowShortcuts(false);
    switch (id) {
      case 'qr':
        if (onCreateNew) onCreateNew();
        break;
      case 'social':
        navigate('/social-studio');
        break;
      case 'org':
        onTabChange('organization');
        break;
      case 'task':
        onTabChange('tasks');
        // We might want to trigger the "Create Task" modal directly here
        // For now, switching to tasks tab is a good start
        break;
      case 'folder':
        onTabChange('folders');
        break;
      case 'analytics':
        onTabChange('analytics');
        break;
      default:
        if (onCreateNew) onCreateNew();
    }
  };

  const handlePlusClick = () => {
    if (shortcuts.length === 1) {
      handleShortcutAction(shortcuts[0]);
    } else {
      setShowShortcuts(!showShortcuts);
    }
  };

  const shortcutIcons: Record<string, { icon: any, label: string }> = {
    qr: { icon: QrCode, label: 'QR' },
    social: { icon: Globe, label: 'Social' },
    org: { icon: Building2, label: 'Org' },
    task: { icon: CheckCircle2, label: 'Task' },
    folder: { icon: Folder, label: 'Folder' },
    analytics: { icon: Activity, label: 'Stats' }
  };

  useEffect(() => {
    if (!hideOnScroll || forceHide) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hideOnScroll]);

  return (
    <AnimatePresence>
      {!forceHide && (
        <div className="fixed bottom-4 left-0 right-0 z-[9999] px-4 flex justify-center pointer-events-none">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ 
                y: isVisible ? 0 : 80, 
                opacity: isVisible ? 1 : 0.4,
                scale: isVisible ? 1 : 0.9
              }}
              exit={{ y: 100, opacity: 0 }}
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
              "flex items-end gap-0.5 sm:gap-2 px-1.5 py-1.5 bg-background/40 backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-500",
              !isVisible && "hover:opacity-100 hover:translate-y-0 hover:scale-100 cursor-pointer"
            )}
            onClick={() => !isVisible && setIsVisible(true)}
          >
            {!onOpenDashboard ? (
              <>
                <DockItem 
                  icon={<Home />} 
                  label="Home" 
                  onClick={() => onTabChange('assets')} 
                  active={activeTab === 'assets'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Globe />} 
                  label="Social" 
                  onClick={() => {
                    const isDemoUser = user?.uid === 'demo-user-123';
                    const isPro = !isDemoUser && (profile?.role === 'pro' || profile?.role === 'enterprise' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing');
                    if (isDemoUser || !isPro) {
                      navigate('/social-studio'); // ProGuard will handle the UI
                    } else {
                      navigate('/social-studio');
                    }
                  }} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Folder />} 
                  label="Folders" 
                  onClick={() => onTabChange('folders')} 
                  active={activeTab === 'folders'} 
                  mouseX={mouseX} 
                />
                
                {onCreateNew && (
                  <>
                    <div className="w-px h-6 bg-white/5 mx-0.5 self-center flex-shrink-0" />
                    <div className="relative">
                      <AnimatePresence>
                        {showShortcuts && (
                          <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                              visible: {
                                transition: {
                                  staggerChildren: 0.05
                                }
                              }
                            }}
                            className="absolute left-1/2 -translate-x-1/2 -top-16 hidden sm:flex gap-2.5 p-2 bg-background/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/20 z-[10000]"
                          >
                            {shortcuts.map((id) => {
                              const item = shortcutIcons[id];
                              if (!item) return null;
                              const Icon = item.icon;
                              return (
                                <motion.button
                                  key={id}
                                  variants={{
                                    hidden: { opacity: 0, y: 20, scale: 0.5 },
                                    visible: { opacity: 1, y: 0, scale: 1 }
                                  }}
                                  whileHover={{ scale: 1.1, y: -5 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleShortcutAction(id)}
                                  className="group relative w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-primary text-primary-foreground rounded-xl transition-colors shadow-lg"
                                >
                                  <Icon className="w-5 h-5" />
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-foreground text-background text-[7px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                                    {item.label}
                                  </div>
                                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Mobile Drawer for Shortcuts */}
                      <Drawer 
                        isOpen={showShortcuts && window.innerWidth < 640} 
                        onClose={() => setShowShortcuts(false)}
                        title="Quick Actions"
                      >
                        <div className="grid grid-cols-3 gap-4 p-2">
                          {shortcuts.map((id) => {
                            const item = shortcutIcons[id];
                            if (!item) return null;
                            const Icon = item.icon;
                            return (
                              <button
                                key={id}
                                onClick={() => handleShortcutAction(id)}
                                className="flex flex-col items-center gap-2 p-4 bg-secondary/30 rounded-2xl active:scale-95 transition-all"
                              >
                                <div className="w-12 h-12 bg-primary/10 text-brand-700 rounded-xl flex items-center justify-center">
                                  <Icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </Drawer>

                      <DockItem 
                        icon={<Plus className={cn("transition-transform duration-300", showShortcuts && "rotate-45")} />} 
                        label="Quick Action" 
                        onClick={handlePlusClick} 
                        isCenter 
                        mouseX={mouseX} 
                      />
                    </div>
                    <div className="w-px h-6 bg-white/5 mx-0.5 self-center flex-shrink-0" />
                  </>
                )}
                
                <DockItem 
                  icon={<Building2 />} 
                  label="Org" 
                  onClick={() => onTabChange('organization')} 
                  active={activeTab === 'organization'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Activity />} 
                  label="Stats" 
                  onClick={() => onTabChange('analytics')} 
                  active={activeTab === 'analytics'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<CheckCircle2 />} 
                  label="Tasks" 
                  onClick={() => onTabChange('tasks')} 
                  active={activeTab === 'tasks'} 
                  mouseX={mouseX} 
                />
              </>
            ) : (
              <>
                <DockItem 
                  icon={<LayoutGrid />} 
                  label="Home" 
                  onClick={onOpenDashboard} 
                  mouseX={mouseX} 
                />
                <div className="w-px h-6 bg-white/5 mx-0.5 self-center" />
                <DockItem 
                  icon={<Users />} 
                  label="Users" 
                  onClick={() => onTabChange('users')} 
                  active={activeTab === 'users'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<QrCode />} 
                  label="Assets" 
                  onClick={() => onTabChange('qrcodes')} 
                  active={activeTab === 'qrcodes'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Building2 />} 
                  label="Brands" 
                  onClick={() => onTabChange('brands')} 
                  active={activeTab === 'brands'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Layers />} 
                  label="Plans" 
                  onClick={() => onTabChange('plans')} 
                  active={activeTab === 'plans'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<Globe />} 
                  label="Network" 
                  onClick={() => onTabChange('referrals')} 
                  active={activeTab === 'referrals'} 
                  mouseX={mouseX} 
                />
                <DockItem 
                  icon={<ShieldCheck />} 
                  label="System" 
                  onClick={() => onTabChange('admin-settings')} 
                  active={activeTab === 'admin-settings'} 
                  mouseX={mouseX} 
                />
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
