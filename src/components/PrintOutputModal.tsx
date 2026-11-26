import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Printer, Download, Loader2, Check, ChevronRight,
  LayoutGrid, Rows, FileText, AlertCircle, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PrintOutputModalProps {
  qrs: Array<{
    id: string;
    name: string;
    content: string;
    type?: string;
  }>;
  onClose: () => void;
}

const LAYOUTS = [
  {
    id: 'avery_5160',
    name: 'Avery 5160',
    description: '3×10 address labels',
    cols: 3,
    rows: 10,
    size: '2.625" × 1"',
    preview: 'grid-cols-3 grid-rows-10',
  },
  {
    id: 'avery_8460',
    name: 'Avery 8460',
    description: '2×5 shipping labels',
    cols: 2,
    rows: 5,
    size: '4" × 1"',
    preview: 'grid-cols-2 grid-rows-5',
  },
  {
    id: 'roll_40x30',
    name: 'Roll 40×30mm',
    description: 'Thermal receipt roll',
    cols: 2,
    rows: 5,
    size: '40mm × 30mm',
    preview: 'grid-cols-2 grid-rows-5',
  },
] as const;

export const PrintOutputModal: React.FC<PrintOutputModalProps> = ({ qrs, onClose }) => {
  const [layout, setLayout] = useState<string>('avery_5160');
  const [selectedQrs, setSelectedQrs] = useState<Set<string>>(new Set(qrs.map(q => q.id)));
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [includeText, setIncludeText] = useState(true);

  const activeLayout = LAYOUTS.find(l => l.id === layout)!;
  const targets = qrs.filter(q => selectedQrs.has(q.id));
  const labelsPerPage = activeLayout.cols * activeLayout.rows;
  const numPages = Math.ceil(targets.length / labelsPerPage);

  const toggleAll = () => {
    if (selectedQrs.size === qrs.length) {
      setSelectedQrs(new Set());
    } else {
      setSelectedQrs(new Set(qrs.map(q => q.id)));
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const resp = await fetch('/api/py/docs/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_codes: targets.map(q => ({
            id: q.id,
            label: q.name,
            data: q.content,
            content: q.content,
          })),
          layout,
          include_text: includeText,
        }),
      });
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      console.error('Label generation failed:', err);
      setResult({ error: true });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPage = (b64: string, index: number) => {
    const blob = new Blob(
      [Uint8Array.from(atob(b64), c => c.charCodeAt(0))],
      { type: 'image/png' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labels_${layout}_page_${index + 1}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    if (!result?.pages) return;
    result.pages.forEach((b64: string, i: number) => downloadPage(b64, i));
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
        className="bg-card w-full max-w-3xl max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Print-Ready Labels</h2>
              <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-widest">
                {targets.length} QR codes · {numPages} page{numPages !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Layout Selection */}
          <div>
            <h3 className="text-[8px] font-black uppercase tracking-widest mb-1.5">Label Layout</h3>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all",
                    layout === l.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="aspect-[3/2] bg-secondary/20 rounded-lg mb-1 p-1">
                    <div className={cn("grid gap-0.5 h-full", l.preview)}>
                      {Array.from({ length: l.cols * l.rows }).map((_, i) => (
                        <div key={i} className={cn("rounded-sm", layout === l.id ? "bg-primary/20" : "bg-secondary/40")} />
                      ))}
                    </div>
                  </div>
                  <h4 className="text-[8px] font-black uppercase">{l.name}</h4>
                  <p className="text-[6px] text-muted-foreground">{l.size}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between p-2 bg-secondary/20 rounded-lg">
            <span className="text-[8px] font-black uppercase tracking-widest">Include label text</span>
            <button
              onClick={() => setIncludeText(!includeText)}
              className={cn(
                "w-8 h-4 rounded-full relative transition-all",
                includeText ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                includeText ? "left-4" : "left-0.5"
              )} />
            </button>
          </div>

          {/* QR Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[8px] font-black uppercase tracking-widest">Select QR Codes</h3>
              <button
                onClick={toggleAll}
                className="text-[6px] font-black uppercase tracking-widest text-brand-700"
              >
                {selectedQrs.size === qrs.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-[180px] overflow-y-auto space-y-0.5">
              {qrs.map(qr => {
                const isSelected = selectedQrs.has(qr.id);
                return (
                  <button
                    key={qr.id}
                    onClick={() => {
                      const next = new Set(selectedQrs);
                      if (isSelected) next.delete(qr.id);
                      else next.add(qr.id);
                      setSelectedQrs(next);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 p-1.5 rounded-lg transition-all text-left",
                      isSelected ? "bg-primary/5 border border-primary/20" : "bg-secondary/10 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border transition-all flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="w-6 h-6 bg-secondary/30 rounded flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" className="w-4 h-4">
                        <rect x="0" y="0" width="20" height="20" fill="var(--secondary)" rx="2" />
                        {[1, 4, 7, 10, 13, 16].map((v, i) => (
                          <rect key={i} x={v % 20} y={i * 3} width="3" height="3" fill="currentColor" rx="0.5" opacity="0.6" />
                        ))}
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-bold truncate">{qr.name}</p>
                      <p className="text-[6px] text-muted-foreground truncate">{qr.type || 'dynamic'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || targets.length === 0}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Generate Print Labels
                <ChevronRight className="w-3 h-3" />
              </>
            )}
          </button>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {result.error ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-[8px] font-bold">Generation failed. Check Python service.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[8px] font-black uppercase tracking-widest">
                        Generated {result.total_labels} labels ({result.num_pages} pages)
                      </h3>
                      <button
                        onClick={downloadAll}
                        className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg text-[7px] font-black uppercase tracking-widest hover:bg-secondary/80"
                      >
                        <Download className="w-2.5 h-2.5" />
                        Download All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {result.pages?.map((page: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => downloadPage(page, i)}
                          className="relative bg-secondary/20 rounded-lg border border-border overflow-hidden group aspect-[3/4]"
                        >
                          <img
                            src={`data:image/png;base64,${page}`}
                            alt={`Page ${i + 1}`}
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Download className="w-4 h-4" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-background/80 to-transparent">
                            <span className="text-[6px] font-black">Page {i + 1}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
