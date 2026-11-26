import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, QrCode, ArrowUpDown, ExternalLink, BarChart3,
  Palette, Download, Tag, Folder, Globe, Command, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface SearchableItem {
  id: string;
  name: string;
  type?: string;
  content?: string;
  tags?: string[];
  url?: string;
  folderName?: string;
  icon?: React.ReactNode;
}

interface GlobalSearchProps {
  items: SearchableItem[];
  onSelect: (item: SearchableItem) => void;
  onOpenAnalytics?: (item: SearchableItem) => void;
  onDownload?: (item: SearchableItem) => void;
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  items, onSelect, onOpenAnalytics, onDownload,
  isOpen, onClose, placeholder = 'Search assets, tags, URLs...'
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const scored = items.map(item => {
      let score = 0;
      if (item.name?.toLowerCase().includes(q)) score += 10;
      if (item.name?.toLowerCase() === q) score += 20;
      if (item.content?.toLowerCase().includes(q)) score += 5;
      if (item.tags?.some(t => t.toLowerCase().includes(q))) score += 8;
      if (item.url?.toLowerCase().includes(q)) score += 3;
      if (item.folderName?.toLowerCase().includes(q)) score += 4;
      if (item.type?.toLowerCase().includes(q)) score += 2;
      return { item, score };
    })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.item);
    return scored;
  }, [query, items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelect(results[selectedIndex]);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const typeIcon = (type?: string) => {
    switch (type) {
      case 'link': return <ExternalLink className="w-2.5 h-2.5" />;
      case 'social': return <Globe className="w-2.5 h-2.5" />;
      case 'vcard': return <Tag className="w-2.5 h-2.5" />;
      default: return <QrCode className="w-2.5 h-2.5" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none text-[10px] font-bold flex-1"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-0.5 hover:bg-secondary rounded transition-all">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary rounded text-[6px] font-black uppercase tracking-widest text-muted-foreground">
                <Command className="w-2 h-2" />
                K
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1.5 space-y-0.5">
              {results.length > 0 ? (
                results.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => { onSelect(item); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-xl transition-all text-left",
                      i === selectedIndex ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <div className="w-7 h-7 bg-secondary/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      {typeIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black truncate">{item.name}</span>
                        {item.type && (
                          <span className="text-[5px] font-black uppercase tracking-widest px-1 py-0.5 bg-secondary/50 rounded-full text-muted-foreground flex-shrink-0">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <p className="text-[6px] text-muted-foreground truncate">
                        {item.content || item.url || item.folderName || ''}
                      </p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {onOpenAnalytics && (
                        <span
                          onClick={e => { e.stopPropagation(); onOpenAnalytics(item); onClose(); }}
                          className="p-1 hover:bg-secondary rounded-lg transition-all"
                          title="Analytics"
                        >
                          <BarChart3 className="w-2.5 h-2.5 text-muted-foreground" />
                        </span>
                      )}
                      {onDownload && (
                        <span
                          onClick={e => { e.stopPropagation(); onDownload(item); }}
                          className="p-1 hover:bg-secondary rounded-lg transition-all"
                          title="Download"
                        >
                          <Download className="w-2.5 h-2.5 text-muted-foreground" />
                        </span>
                      )}
                      <span className="p-1 hover:bg-secondary rounded-lg transition-all" title="Open">
                        <ArrowUpDown className="w-2.5 h-2.5 text-muted-foreground rotate-45" />
                      </span>
                    </div>
                  </button>
                ))
              ) : query.trim() ? (
                <div className="p-6 text-center space-y-1">
                  <Search className="w-6 h-6 text-muted-foreground/30 mx-auto" />
                  <p className="text-[8px] font-bold text-muted-foreground">No results for "{query}"</p>
                  <p className="text-[6px] text-muted-foreground">Try a different search term</p>
                </div>
              ) : (
                <div className="p-6 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground/30">
                    <Search className="w-4 h-4" />
                    <span className="text-[10px] font-black">Search</span>
                  </div>
                  <p className="text-[6px] text-muted-foreground">Type to search across your assets</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-1.5 border-t border-border flex items-center gap-2 text-[6px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><kbd className="px-0.5 bg-secondary rounded font-bold">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-0.5"><kbd className="px-0.5 bg-secondary rounded font-bold">↵</kbd> Open</span>
              <span className="flex items-center gap-0.5"><kbd className="px-0.5 bg-secondary rounded font-bold">Esc</kbd> Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
