import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling, { 
  DrawType, 
  TypeNumber, 
  Mode, 
  ErrorCorrectionLevel, 
  DotType, 
  CornerSquareType, 
  CornerDotType 
} from 'qr-code-styling';
import { cn } from '../lib/utils';
import { buildStandaloneSvg, svgDownloadFilename } from '../lib/svgDownload';

interface QRPreviewProps {
  value: string;
  design?: {
    fgColor?: string;
    bgColor?: string;
    eyeFrameColor?: string;
    eyeInnerColor?: string;
    matrixStyle?: string;
    eyeFrameStyle?: string;
    eyeInnerStyle?: string;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    fgGradient?: {
      type: 'linear' | 'radial';
      rotation: number;
      colorStops: string[];
    };
    bgGradient?: {
      type: 'linear' | 'radial';
      rotation: number;
      colorStops: string[];
    };
    logoUrl?: string;
    logoSize?: number;
    logoMargin?: number;
    logoBackground?: boolean;
    logoBackgroundColor?: string;
    logoBackgroundShape?: 'square' | 'rounded';
    frame?: {
      type: string;
      text: string;
      color: string;
      textColor: string;
    };
  };
  size?: number;
  className?: string;
}

export interface QRPreviewHandle {
  download: (extension: 'png' | 'svg', options?: { hideBackground?: boolean }) => Promise<void>;
}

export const QRPreview = React.memo(forwardRef<QRPreviewHandle, QRPreviewProps>(({ 
  value, 
  design = {}, 
  size = 256,
  className 
}, forwardedRef) => {
  const ref = useRef<HTMLDivElement>(null);
  const d = (design || {}) as any;
  const qrCode = useRef<QRCodeStyling | null>(null);

  useImperativeHandle(forwardedRef, () => ({
    download: async (extension: 'png' | 'svg', options?: { hideBackground?: boolean }) => {
      if (!qrCode.current) return;

      const originalBgColor = d.bgColor;
      const originalBgGradient = d.bgGradient;

      if (options?.hideBackground) {
        qrCode.current.update({
          backgroundOptions: {
            color: 'transparent',
            gradient: undefined
          }
        });
      }

      try {
        if (extension === 'svg') {
          // update() above redraws the code in the background, so wait for
          // the new drawing to finish before reading the svg out of the
          // page. Without the wait the download came out blank whenever
          // the background was hidden, because the fresh svg had no shapes
          // in it yet. getRawData waits on the drawing promise, and the
          // extra tick lets the logo touch-ups land too.
          await qrCode.current.getRawData('svg');
          await new Promise((resolve) => setTimeout(resolve, 0));
          const svgElement = ref.current?.querySelector('svg');
          if (svgElement) {
            const svgData = buildStandaloneSvg(new XMLSerializer().serializeToString(svgElement));
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = svgUrl;
            downloadLink.download = svgDownloadFilename();
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(svgUrl);
          }
        } else {
          await qrCode.current.download({
            name: `qr-code-${Date.now()}`,
            extension
          });
        }
      } finally {
        if (options?.hideBackground) {
          qrCode.current.update({
            backgroundOptions: {
              color: originalBgColor || '#ffffff',
              gradient: originalBgGradient ? {
                type: originalBgGradient.type,
                rotation: (originalBgGradient.rotation * Math.PI) / 180,
                colorStops: originalBgGradient.colorStops.map((color: string, index: number) => ({
                  offset: index / (originalBgGradient!.colorStops.length - 1),
                  color
                }))
              } : undefined
            }
          });
        }
      }
    }
  }));

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      margin: d.margin ?? 10,
      type: 'svg' as DrawType,
      data: value || "https://qrforge.app",
      image: d.logoUrl,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: d.logoMargin ?? 5,
        imageSize: d.logoSize ?? 0.4,
        hideBackgroundDots: d.logoBackground ? false : true
      },
      qrOptions: {
        errorCorrectionLevel: d.errorCorrectionLevel || 'M'
      },
      dotsOptions: {
        color: d.fgColor || '#000000',
        type: (d.matrixStyle as DotType) || 'square',
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
        type: (d.eyeFrameStyle as CornerSquareType) || 'square',
        color: d.eyeFrameColor || d.fgColor || '#000000'
      },
      cornersDotOptions: {
        type: (d.eyeInnerStyle as CornerDotType) || 'square',
        color: d.eyeInnerColor || d.fgColor || '#000000'
      }
    });

    if (ref.current) {
      qrCode.current.append(ref.current);
    }

    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, []);

  const designRef = useRef(design);
  useEffect(() => {
    designRef.current = design;
  }, [design]);

  useEffect(() => {
    if (!ref.current) return;

    const processSvg = () => {
      const d = (designRef.current || {}) as any;
      if (!ref.current || !d.logoUrl) return;
      
      const svg = ref.current.querySelector('svg');
      if (!svg) return;

      const image = svg.querySelector('image');
      if (!image) return;

      // Disconnect to avoid infinite loop while we mutate the SVG
      observer.disconnect();

      // Remove existing background and clipPath if any
      const existingBg = svg.querySelector('.logo-bg');
      if (existingBg) existingBg.remove();
      const existingClip = svg.querySelector('#logo-clip');
      if (existingClip) existingClip.remove();

      const x = parseFloat(image.getAttribute('x') || '0');
      const y = parseFloat(image.getAttribute('y') || '0');
      const width = parseFloat(image.getAttribute('width') || '0');
      const height = parseFloat(image.getAttribute('height') || '0');
      const margin = d.logoMargin ?? 5;

      // Create ClipPath for the image
      const defs = svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      if (!svg.querySelector('defs')) svg.prepend(defs);

      const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clipPath.setAttribute('id', 'logo-clip');
      const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      clipRect.setAttribute('x', x.toString());
      clipRect.setAttribute('y', y.toString());
      clipRect.setAttribute('width', width.toString());
      clipRect.setAttribute('height', height.toString());
      
      // Always apply some rounding to the logo itself as requested
      const logoRadius = Math.min(width, height) * 0.2;
      clipRect.setAttribute('rx', logoRadius.toString());
      clipRect.setAttribute('ry', logoRadius.toString());
      clipPath.appendChild(clipRect);
      defs.appendChild(clipPath);

      image.setAttribute('clip-path', 'url(#logo-clip)');

      // Handle Background
      if (d.logoBackground) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'logo-bg');
        rect.setAttribute('x', (x - margin).toString());
        rect.setAttribute('y', (y - margin).toString());
        rect.setAttribute('width', (width + margin * 2).toString());
        rect.setAttribute('height', (height + margin * 2).toString());
        rect.setAttribute('fill', d.logoBackgroundColor || '#ffffff');
        rect.setAttribute('fill-opacity', (d.logoBackgroundOpacity ?? 1).toString());
        
        // Always use some rounding for the background too if it's enabled, 
        // but respect the 'rounded' shape for more pronounced rounding
        const radius = d.logoBackgroundShape === 'rounded' 
          ? Math.min(width, height) * 0.25 
          : Math.min(width, height) * 0.1;
        rect.setAttribute('rx', radius.toString());
        rect.setAttribute('ry', radius.toString());

        image.parentNode?.insertBefore(rect, image);
      }

      // Reconnect after mutation
      observer.observe(ref.current, { childList: true, subtree: true });
    };

    const observer = new MutationObserver(processSvg);
    observer.observe(ref.current, { childList: true, subtree: true });
    
    // Initial process
    processSvg();

    return () => observer.disconnect();
  }, []); // Run once on mount

  useEffect(() => {
    if (!qrCode.current) return;
    const d = (design || {}) as any;
    
    const timer = setTimeout(() => {
      const updateOptions: any = {
        data: value || "https://qrforge.app",
        image: d.logoUrl || undefined,
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: d.logoMargin ?? 5,
          imageSize: d.logoSize ?? 0.4,
          hideBackgroundDots: d.logoBackground ? false : true
        },
        margin: d.margin ?? 10,
        qrOptions: {
          errorCorrectionLevel: d.errorCorrectionLevel || (d.logoUrl ? 'H' : 'M')
        },
        dotsOptions: {
          color: d.fgColor || '#000000',
          type: (d.matrixStyle as DotType) || 'square',
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
          type: (d.eyeFrameStyle as CornerSquareType) || 'square',
          color: d.eyeFrameColor || d.fgColor || '#000000'
        },
        cornersDotOptions: {
          type: (d.eyeInnerStyle as CornerDotType) || 'square',
          color: d.eyeInnerColor || d.fgColor || '#000000'
        }
      };

      qrCode.current?.update(updateOptions);
    }, 50); // Small debounce to prevent unresponsiveness during rapid slider moves

    return () => clearTimeout(timer);
  }, [value, design]);

  const frame = d.frame;

  return (
    <div className={cn("relative block group", className)}>
      {frame && frame.type !== 'none' && (
        <div 
          className="absolute inset-0 -m-4 rounded-2xl border-4 flex flex-col items-center justify-end pb-1"
          style={{ 
            borderColor: frame.color || '#000000',
            backgroundColor: frame.color || '#000000'
          }}
        >
          <span 
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: frame.textColor || '#ffffff' }}
          >
            {frame.text}
          </span>
        </div>
      )}
      <div 
        className={cn(
          "bg-white rounded-xl shadow-sm overflow-hidden relative z-10 flex items-center justify-center",
          frame && frame.type !== 'none' ? "p-2" : "p-4"
        )}
      >
        <div ref={ref} className="[&>svg]:max-w-full [&>svg]:h-auto" />
      </div>
    </div>
  );
}));
