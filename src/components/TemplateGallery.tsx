import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Search, Sparkles, Crown, Lock, Check, Palette,
  LayoutGrid, Smartphone, Briefcase, Users, Calendar,
  User, ChevronRight
} from 'lucide-react';
import { QR_TEMPLATES, QRTemplate } from '../constants/templates';
import { cn } from '../lib/utils';

interface TemplateGalleryProps {
  onSelect: (template: QRTemplate) => void;
  onClose: () => void;
  isPro?: boolean;
}

const CATEGORIES = [
  { id: 'all' as const, label: 'All', icon: LayoutGrid },
  { id: 'business' as const, label: 'Business', icon: Briefcase },
  { id: 'social' as const, label: 'Social', icon: Users },
  { id: 'event' as const, label: 'Event', icon: Calendar },
  { id: 'personal' as const, label: 'Personal', icon: User },
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelect, onClose, isPro }) => {
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return QR_TEMPLATES.filter(t => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [category, search]);

  const handleApply = (template: QRTemplate) => {
    if (template.isPro && !isPro) return;
    onSelect(template);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Template Gallery</h2>
              <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-widest">Choose a design to start</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search + Categories */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/30 rounded-lg border border-border/30">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[8px] font-bold uppercase tracking-widest flex-1"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                  category === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <cat.icon className="w-2.5 h-2.5" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredTemplates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
              <Palette className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredTemplates.map(template => {
                const isLocked = template.isPro && !isPro;
                const isSelected = selectedId === template.id;

                return (
                  <motion.button
                    key={template.id}
                    layout
                    onClick={() => {
                      if (isLocked) return;
                      setSelectedId(template.id);
                    }}
                    className={cn(
                      "relative bg-card border rounded-xl p-2 text-left transition-all text-[8px]",
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : isLocked
                          ? "border-border/40 opacity-60"
                          : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Badges */}
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      {isLocked && (
                        <div className="px-1 py-0.5 bg-brand-500/10 text-brand-500 rounded-full text-[5px] font-black uppercase tracking-widest flex items-center gap-0.5">
                          <Crown className="w-2 h-2" />
                          Pro
                        </div>
                      )}
                      {isSelected && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Mini QR Preview */}
                    <div className="aspect-square mb-1.5 bg-secondary/30 rounded-lg flex items-center justify-center overflow-hidden">
                      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                        {(() => {
                          const fg = template.design.fgColor || '#000';
                          const bg = template.design.bgColor || '#FFF';
                          const cells = [];
                          const size = 25;
                          for (let r = 0; r < size; r++) {
                            for (let c = 0; c < size; c++) {
                              const isBlack = (
                                (r < 7 && c < 7) ||
                                (r < 7 && c >= size - 7) ||
                                (r >= size - 7 && c < 7) ||
                                (r >= 10 && r <= 14 && c >= 10 && c <= 14) ||
                                (r % 2 === 0 && c % 3 === 0) ||
                                (r % 3 === 0 && c % 2 === 0)
                              );
                              if (isBlack) {
                                const x = (c / size) * 100;
                                const y = (r / size) * 100;
                                const cellSize = 100 / size;
                                cells.push(
                                  <rect key={`${r}-${c}`} x={x} y={y} width={cellSize} height={cellSize} fill={fg} rx="2" />
                                );
                              }
                            }
                          }
                          return (
                            <>
                              <rect x="0" y="0" width="100" height="100" fill={bg} rx="8" />
                              {cells}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    <h4 className="font-black uppercase tracking-tight truncate">{template.name}</h4>
                    <p className="text-[6px] text-muted-foreground font-medium leading-tight mt-0.5 line-clamp-2">{template.description}</p>

                    {/* Apply button */}
                    {isSelected && (
                      <motion.button
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={(e) => { e.stopPropagation(); handleApply(template); }}
                        className="mt-2 w-full py-1 bg-primary text-primary-foreground rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
                      >
                        Apply Template
                        <ChevronRight className="w-2 h-2" />
                      </motion.button>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
