import React from 'react';
import { motion } from 'motion/react';
import { QrCode, Sparkles, BarChart3, Globe, Zap, CheckCircle2, Layers, Palette, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export const HeroAnimation: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[16/10] md:aspect-[21/9] group perspective-2000">
      {/* Ambient Glow */}
      <div className="absolute -inset-20 bg-primary/5 blur-[120px] rounded-full opacity-50 animate-pulse pointer-events-none" />
      
      {/* Laptop Base/Body */}
      <motion.div 
        initial={{ rotateX: 15, y: 40, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full h-full bg-[#0A0A0A] rounded-[2rem] border-[1px] border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-1 ring-white/5"
      >
        {/* Screen Header/Toolbar */}
        <div className="h-8 border-b border-white/5 bg-white/5 flex items-center px-4 justify-between">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/40" />
            <div className="w-2 h-2 rounded-full bg-brand-500/20 border border-brand-500/40" />
            <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-1/2 h-full bg-primary/40"
              />
            </div>
            <div className="w-3 h-3 rounded-full border border-white/10 animate-spin" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/5" />
            <div className="w-4 h-4 rounded bg-white/5" />
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Technical Rail */}
          <div className="w-14 md:w-16 border-r border-white/5 bg-black/40 p-3 flex flex-col gap-4">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mx-auto shadow-lg shadow-primary/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="space-y-4 mt-4">
              {[BarChart3, Globe, Zap, Sparkles, Layers, Palette].map((Icon, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-white/40" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Area - The Forge Workspace */}
          <div className="flex-1 p-6 md:p-8 space-y-6 overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_rgba(249,115,22,0.03)_0%,_transparent_100%)]">
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <div className="w-24 h-3 bg-white/10 rounded-full" />
                </div>
                <div className="w-40 h-2 bg-white/5 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-widest">Draft</div>
                <div className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-lg text-[8px] font-black text-brand-700 uppercase tracking-widest">Live</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Left: Controls Simulation */}
              <div className="col-span-12 md:col-span-7 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="w-12 h-2 bg-white/10 rounded-full" />
                        <div className="w-4 h-4 rounded-full bg-white/5" />
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.random() * 60 + 20}%` }}
                          transition={{ duration: 2, delay: i * 0.2 }}
                          className="h-full bg-primary/40"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time Design Feed */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-brand-700" />
                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">AI Design Assistant</span>
                  </div>
                  <div className="flex gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex-1 aspect-square bg-white/5 rounded-xl border border-white/10 flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-all">
                        <QrCode className="w-6 h-6 text-white/10 group-hover:text-brand-700/50 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Preview Simulation */}
              <div className="col-span-12 md:col-span-5">
                <motion.div 
                  animate={{ 
                    y: [0, -10, 0],
                    rotateY: [0, 5, 0]
                  }}
                  transition={{ 
                    duration: 6, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="relative group/qr"
                >
                  <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                  <div className="relative bg-white p-6 rounded-3xl shadow-2xl shadow-primary/20 border-4 border-primary/10">
                    <div className="aspect-square bg-white flex items-center justify-center relative">
                      <QrCode className="w-full h-full text-[#141414]" />
                      <motion.div 
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-primary/5"
                      />
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="w-20 h-2 bg-[#141414]/10 rounded-full" />
                        <div className="w-12 h-1.5 bg-[#141414]/5 rounded-full" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-brand-700" />
                      </div>
                    </div>
                  </div>

                  {/* Floating Interaction Elements */}
                  <motion.div 
                    animate={{ x: [0, 15, 0], y: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-6 -right-6 p-3 bg-[#141414] text-white rounded-2xl shadow-xl border border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Scan Detected</span>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ x: [0, -12, 0], y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute -bottom-4 -left-8 p-3 bg-primary text-primary-foreground rounded-2xl shadow-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Analytics Live</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Laptop Hinge/Shadow Detail */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[95%] h-8 bg-black/40 blur-2xl rounded-full" />
    </div>
  );
};
