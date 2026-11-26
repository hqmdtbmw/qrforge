import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Resistance calculation
      const distance = Math.pow(diff, 0.85);
      setPullDistance(distance);
      
      // Prevent default scrolling when pulling down at the top
      if (e.cancelable) e.preventDefault();
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto no-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden z-50 pointer-events-none"
        style={{ height: pullDistance }}
      >
        <div className="flex flex-col items-center gap-1">
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : { rotate: (pullDistance / PULL_THRESHOLD) * 180 }}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { type: 'spring', damping: 20 }}
            className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          </motion.div>
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: pullDistance > 40 ? 1 : 0 }}
            className="text-[8px] font-black uppercase tracking-widest text-brand-700"
          >
            {isRefreshing ? 'Forging Updates...' : pullDistance >= PULL_THRESHOLD ? 'Release to Refresh' : 'Pull to Refresh'}
          </motion.span>
        </div>
      </motion.div>

      <motion.div
        style={{ y: pullDistance }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {children}
      </motion.div>
    </div>
  );
};
