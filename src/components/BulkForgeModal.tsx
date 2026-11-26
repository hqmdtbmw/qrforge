import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, FileText, CheckCircle2, Loader2, 
  AlertCircle, Sparkles, Download, Plus, Trash2,
  Lock, Crown
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { createQRCode } from '../services/db';
import { useToast } from './Toast';
import { nanoid } from 'nanoid';
import { cn } from '../lib/utils';

interface BulkForgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onShowPricing: () => void;
}

export const BulkForgeModal: React.FC<BulkForgeModalProps> = ({ 
  isOpen, 
  onClose, 
  isPro,
  onShowPricing 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inputMode, setInputMode] = useState<'text' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);

  const handleBulkForge = async () => {
    if (!isPro) {
      onShowPricing();
      return;
    }

    if (!user) return;

    const lines = textInput.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      toast('Please enter some content to forge', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const forged: any[] = [];
    const total = lines.length;

    for (let i = 0; i < total; i++) {
      const line = lines[i].trim();
      try {
        const name = `Bulk QR ${i + 1}`;
        const content = line;
        const isUrl = line.startsWith('http');
        const qrType = isUrl ? 'link' : 'text';
        
        await createQRCode(user.uid, {
          name,
          content,
          type: 'static',
          qrType,
          fields: isUrl ? { url: line } : { text: line },
          design: {
            fgColor: '#000000',
            bgColor: '#ffffff',
            matrixStyle: 'square',
            eyeFrameStyle: 'square',
            eyeInnerStyle: 'square',
            errorCorrectionLevel: 'M',
            margin: 10
          }
        });

        forged.push({ content: line, status: 'success' });
      } catch (err) {
        forged.push({ content: line, status: 'error', error: 'Failed to save' });
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setResults(forged);
    setIsProcessing(false);
    toast(`Successfully forged ${forged.filter(r => r.status === 'success').length} QR codes!`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-700" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Bulk Forge</h2>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Generate hundreds of QRs in seconds</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {!isPro && (
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col items-center text-center space-y-3">
              <Crown className="w-8 h-8 text-brand-700" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-tight">Pro Feature</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Bulk generation is only available for Pro users.</p>
              </div>
              <button 
                onClick={onShowPricing}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Upgrade Now
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex gap-1.5 p-1 bg-secondary/30 rounded-xl w-fit">
              <button 
                onClick={() => setInputMode('text')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  inputMode === 'text' ? "bg-card text-brand-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Text List
              </button>
              <button 
                onClick={() => setInputMode('csv')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  inputMode === 'csv' ? "bg-card text-brand-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                CSV Upload
              </button>
            </div>

            {inputMode === 'text' ? (
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Paste URLs or Text (One per line)</label>
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="https://google.com&#10;https://apple.com&#10;My Secret Message"
                  className="w-full h-48 px-4 py-3 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-secondary/10 text-xs font-medium resize-none custom-scrollbar"
                />
              </div>
            ) : (
              <div className="h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-3 hover:border-primary/30 transition-all group cursor-pointer">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">Upload CSV File</p>
                  <p className="text-[9px] text-muted-foreground font-medium">First column should contain the content</p>
                </div>
                <input type="file" className="hidden" accept=".csv" />
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-brand-700 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Forging Assets...
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Results</h3>
              <div className="space-y-2">
                {results.slice(-5).map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border">
                    <span className="text-[10px] font-bold truncate max-w-[200px]">{res.content}</span>
                    {res.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                ))}
                {results.length > 5 && (
                  <p className="text-center text-[10px] text-muted-foreground font-bold">...and {results.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/5 flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-secondary/80 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleBulkForge}
            disabled={isProcessing || !textInput.trim() || !isPro}
            className="flex-[2] py-3 bg-foreground text-background rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2 group"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>FORGE ALL</span>
                <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
