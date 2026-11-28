import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Printer, LayoutGrid, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import {
  PRINT_PAGE_SIZES,
  PRINT_SHEET_LAYOUTS,
  PRINT_SHEET_MARGIN_MM,
  fitSheetLabel,
  printSheetPlan,
  type PrintPageSizeId,
  type PrintSheetLayoutId,
  type PrintSheetPlan,
} from '../lib/printSheet';

// A sheet of QR codes you can print straight from the browser, no server
// needed. The old print path sent the codes to the Python label service,
// which is optional and often not running, so printing did nothing in
// demo mode. This one draws the codes on the page and uses the browser
// print dialog. Pick a page size and a layout, check the preview, print.

interface PrintSheetModalProps {
  qrs: Array<{
    id: string;
    name: string;
    content?: string;
    url?: string;
    type?: string;
  }>;
  onClose: () => void;
}

const MM_TO_PX = 96 / 25.4;

function PrintSheetPage({ plan, pageIndex }: { plan: PrintSheetPlan; pageIndex: number }) {
  const page = PRINT_PAGE_SIZES[plan.grid.pageSizeId];
  const codes = plan.pages[pageIndex];
  return (
    <div
      className="print-sheet-page bg-white text-black mx-auto"
      style={{
        width: `${page.widthMm}mm`,
        height: `${page.heightMm}mm`,
        padding: `${PRINT_SHEET_MARGIN_MM}mm`,
      }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${plan.grid.cols}, 1fr)`,
          gridTemplateRows: `repeat(${plan.grid.rows}, 1fr)`,
        }}
      >
        {codes.map((code, i) => (
          <div
            key={`${code.id}-${i}`}
            className="flex flex-col items-center justify-center overflow-hidden"
            style={{ padding: '3mm' }}
          >
            <QRCodeSVG
              value={code.content}
              size={Math.round(plan.grid.codeSizeMm * MM_TO_PX)}
              level="M"
              includeMargin={false}
            />
            <p
              className="mt-1 text-center font-bold leading-tight break-words"
              style={{
                fontSize: '11pt',
                maxWidth: '100%',
                display: '-webkit-box',
                WebkitLineClamp: plan.grid.labelLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {fitSheetLabel(code.name, plan.grid.labelMaxChars)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PrintSheetModal: React.FC<PrintSheetModalProps> = ({ qrs, onClose }) => {
  const [pageSize, setPageSize] = useState<PrintPageSizeId>('a4');
  const [layout, setLayout] = useState<PrintSheetLayoutId>('medium');
  const [repeatSingle, setRepeatSingle] = useState(false);

  const printable = useMemo(
    () =>
      qrs
        .map((q) => ({
          id: q.id,
          name: q.name,
          content: (q.content || q.url || '').trim(),
        }))
        .filter((q) => q.content.length > 0),
    [qrs]
  );
  const skipped = qrs.length - printable.length;

  const plan = useMemo(
    () => printSheetPlan(printable, pageSize, layout, repeatSingle),
    [printable, pageSize, layout, repeatSingle]
  );
  const page = PRINT_PAGE_SIZES[pageSize];

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-brand-700" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">Print Sheet</h2>
              <p className="text-[7px] text-muted-foreground font-medium uppercase tracking-widest">
                {plan.totalCodes} code{plan.totalCodes !== 1 ? 's' : ''} · {plan.pageCount} page
                {plan.pageCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h3 className="text-[8px] font-black uppercase tracking-widest mb-1.5">Page size</h3>
              <div className="flex gap-1">
                {(Object.keys(PRINT_PAGE_SIZES) as PrintPageSizeId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setPageSize(id)}
                    className={cn(
                      'px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all',
                      pageSize === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {PRINT_PAGE_SIZES[id].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[8px] font-black uppercase tracking-widest mb-1.5">Code size</h3>
              <div className="flex gap-1">
                {(Object.keys(PRINT_SHEET_LAYOUTS) as PrintSheetLayoutId[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setLayout(id)}
                    title={PRINT_SHEET_LAYOUTS[id].description}
                    className={cn(
                      'px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1',
                      layout === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <LayoutGrid className="w-2.5 h-2.5" />
                    {PRINT_SHEET_LAYOUTS[id].label}
                  </button>
                ))}
              </div>
            </div>
            {printable.length === 1 && (
              <label className="flex items-center gap-2 ml-auto cursor-pointer">
                <span className="text-[8px] font-black uppercase tracking-widest">
                  Fill the page with this code
                </span>
                <button
                  onClick={() => setRepeatSingle(!repeatSingle)}
                  className={cn(
                    'w-8 h-4 rounded-full relative transition-all',
                    repeatSingle ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all',
                      repeatSingle ? 'left-4' : 'left-0.5'
                    )}
                  />
                </button>
              </label>
            )}
          </div>

          {skipped > 0 && (
            <p className="text-[8px] font-bold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {skipped} selected code{skipped !== 1 ? 's' : ''} had nothing to print and
              {skipped !== 1 ? ' were' : ' was'} left out.
            </p>
          )}

          {plan.pageCount === 0 ? (
            <p className="text-xs font-bold text-muted-foreground text-center py-8">
              Nothing to print yet. Pick a code with a link or some text in it.
            </p>
          ) : (
            <div className="space-y-4 overflow-x-auto pb-2">
              {plan.pages.map((_, i) => (
                <div key={i}>
                  <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                    Page {i + 1} of {plan.pageCount}
                  </p>
                  <div className="border border-border rounded-lg overflow-hidden w-fit">
                    <PrintSheetPage plan={plan} pageIndex={i} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={handlePrint}
            disabled={plan.pageCount === 0}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-3 h-3" />
            Print {plan.pageCount} page{plan.pageCount !== 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>

      {createPortal(
        <div className="print-sheet-root hidden print:block" aria-hidden="true">
          <style>{`@page { size: ${page.label}; margin: 0; }`}</style>
          {plan.pages.map((_, i) => (
            <PrintSheetPage key={i} plan={plan} pageIndex={i} />
          ))}
        </div>,
        document.body
      )}
    </motion.div>
  );
};
