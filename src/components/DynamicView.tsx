import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UtensilsCrossed, ChevronRight, CreditCard, Info, 
  CheckCircle2, Loader2, ArrowLeft, ShoppingBag,
  PlusCircle, Landmark, Coins, Instagram, Twitter, 
  Linkedin, ExternalLink, Copy, Check, Globe, Smartphone, Phone, QrCode,
  Lock, ShieldCheck, Zap, FileText, Download, AlertTriangle, Clock,
  Facebook, Github, Youtube, Music, MessageCircle, Mail, MapPin,
  Share2, User, Crown
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { recordScan, checkScanLimit, getUserProfile } from '../services/db';
import { SocialProfileLanding } from './SocialProfileLanding';
import { UAParser } from 'ua-parser-js';
import { useToast } from './Toast';
import { QRCodeSVG } from 'qrcode.react';

interface DynamicViewProps {
  isPreview?: boolean;
}

export const DynamicView: React.FC<DynamicViewProps> = ({ isPreview = false }) => {
  const { shortId, previewId } = useParams<{ shortId?: string; previewId?: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isFromQR = searchParams.get('src') === 'qr' || searchParams.get('ref') === 'qr' || searchParams.get('source') === 'qr';
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const fields = qrData?.fields || {};
  const isMenu = qrData?.qrType === 'menu';
  const isFlow = qrData?.qrType === 'flow';
  const [currentStep, setCurrentStep] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [analyticsRecorded, setAnalyticsRecorded] = useState(false);
  const [isProLocked, setIsProLocked] = useState(false);

  const [copied, setCopied] = useState(false);

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (typeof ethereum !== 'undefined') {
      setIsConnecting(true);
      try {
        // Check if already connected
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          // Request connection
          const newAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
          setWalletAddress(newAccounts[0]);
        }
      } catch (err: any) {
        console.error('MetaMask connection error:', err);
        const isIframe = window.self !== window.top;
        
        if (err.code === 4001) {
          toast('Connection rejected by user', 'warning');
        } else if (err.code === -32002) {
          toast('Connection request already pending in MetaMask. Please check your wallet.', 'info');
        } else if (isIframe) {
          toast('MetaMask connection is often blocked in previews. Please open the app in a new tab to connect your wallet.', 'warning');
        } else {
          toast(`Wallet Error: ${err.message || 'Failed to connect'}. Ensure MetaMask is unlocked.`, 'error');
        }
      } finally {
        setIsConnecting(false);
      }
    } else {
      toast('MetaMask not detected. Please install it or use a Web3 browser.', 'info');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

  const [paystackConfig, setPaystackConfig] = useState<any>({
    reference: (new Date()).getTime().toString(),
    email: customerEmail || "customer@example.com",
    amount: 0,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  });

  useEffect(() => {
    const amount = qrData?.qrType === 'bank' 
      ? Math.round((parseFloat(fields.amount) || 0) * 100) 
      : Math.round(totalAmount * 100 * 1600);

    setPaystackConfig({
      reference: (new Date()).getTime().toString(),
      email: customerEmail || "customer@example.com",
      amount: amount > 0 ? amount : 100, // Fallback to 100 kobo if 0
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });
  }, [customerEmail, totalAmount, fields.amount, qrData?.qrType]);

  const initializePayment = usePaystackPayment(paystackConfig);

  const onSuccess = (reference: any) => {
    alert("Payment successful! Reference: " + reference.reference);
    setCart([]);
    setShowCheckout(false);
  };

  const onClosePaystack = () => {
    console.log('closed');
  };

  useEffect(() => {
    const fetchPreview = async () => {
      if (isPreview && previewId) {
        const { getPreview } = await import('../services/db');
        const data = await getPreview(previewId);
        if (data) {
          setQrData(data);
        } else {
          setError('Preview expired or not found');
        }
        setLoading(false);
      }
    };
    fetchPreview();
  }, [isPreview, previewId]);

  useEffect(() => {
    if (isPreview || !shortId) return;

    if (shortId === 'preview') {
      const draft = localStorage.getItem('qrforge_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setQrData(parsed);
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'qrcodes'), where('shortId', '==', shortId), limit(1));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setError('QR Code not found');
        setLoading(false);
        return;
      }

      const docData = snapshot.docs[0].data();
      const docId = snapshot.docs[0].id;

      if (!analyticsRecorded) {
        const ownerProfile = await getUserProfile(docData.ownerId);
        const isTrialing = ownerProfile?.subscription?.status === 'trialing';
        const isProPlan = ['pro', 'business', 'admin'].includes(ownerProfile?.role) || isTrialing;
        const usesProFeatures = docData.isABTest || docData.password || ['bank', 'menu', 'flow', 'file'].includes(docData.qrType);
        if (usesProFeatures && !isProPlan) {
          setIsProLocked(true);
        }

        if (docData.expiresAt) {
          const expiryDate = new Date(docData.expiresAt);
          if (expiryDate < new Date()) setIsExpired(true);
        }

        if (docData.scanLimit) {
          const currentScans = docData.stats?.totalScans || 0;
          if (currentScans >= docData.scanLimit) setIsLimitReached(true);
        }

        const parser = new UAParser();
        const result = parser.getResult();
        let locationData = { city: 'Unknown', country: 'Unknown', region: 'Unknown' };
        try {
          const services = ['https://ipapi.co/json/', 'https://ip-api.com/json'];
          for (const service of services) {
            try {
              const res = await fetch(service);
              if (res.ok) {
                const geo = await res.json();
                if (geo && (geo.city || geo.country_name || geo.country)) {
                  locationData = {
                    city: geo.city || geo.city || 'Unknown',
                    country: geo.country_name || geo.country || 'Unknown',
                    region: geo.region_name || geo.region || 'Unknown'
                  };
                  break;
                }
              }
            } catch (e) { /* skip */ }
          }
        } catch (e) { /* skip */ }

        await recordScan(docId, {
          ...locationData,
          browser: result.browser.name,
          os: result.os.name,
          device: result.device.type || 'desktop',
          isSocialView: docData.qrType === 'social' && !isFromQR
        });
        setAnalyticsRecorded(true);
      }

      setQrData(docData);
      setQrId(docId);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load content');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shortId, analyticsRecorded, isPreview, previewId, isFromQR]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-brand-700 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Loading Experience...</p>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Oops!</h1>
        <p className="text-muted-foreground font-medium mb-8">{error || 'Something went wrong'}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-foreground text-background rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (isProLocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Crown className="w-10 h-10 text-brand-700" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Pro Feature Locked</h1>
        <p className="text-muted-foreground font-medium mb-8">This experience requires an active Pro subscription to view.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-foreground text-background rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-brand-500" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Expired</h1>
        <p className="text-muted-foreground font-medium mb-8">This QR code has reached its expiration date.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-foreground text-background rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (isLimitReached) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Limit Reached</h1>
        <p className="text-muted-foreground font-medium mb-8">This QR code has reached its maximum scan limit.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-foreground text-background rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (qrData.password && !isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-brand-700" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Protected Content</h1>
        <p className="text-muted-foreground font-medium mb-8">This QR code is password protected.</p>
        <div className="w-full max-w-xs space-y-4">
          <input 
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter Password"
            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-card text-center font-bold"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && passwordInput === qrData.password) {
                setIsUnlocked(true);
              }
            }}
          />
          <button 
            onClick={() => {
              if (passwordInput === qrData.password) {
                setIsUnlocked(true);
              } else {
                alert('Incorrect password');
              }
            }}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const renderBank = () => {
    const isNigeria = fields.bankCountry === 'NG' || fields.bankStandard === 'nqr';
    
    const nigerianBanks = [
      { id: 'gtb', name: 'GTBank', app: 'gtworld://', ussd: '*737*' },
      { id: 'access', name: 'Access Bank', app: 'accessmore://', ussd: '*901*' },
      { id: 'zenith', name: 'Zenith Bank', app: 'zenithbank://', ussd: '*966*' },
      { id: 'uba', name: 'UBA', app: 'ubamobile://', ussd: '*919*' },
      { id: 'kuda', name: 'Kuda', app: 'kuda://', ussd: null },
      { id: 'opay', name: 'OPay', app: 'opay://', ussd: null },
      { id: 'palmpay', name: 'PalmPay', app: 'palmpay://', ussd: null },
      { id: 'moniepoint', name: 'Moniepoint', app: 'moniepoint://', ussd: null },
    ];

    const handleUssd = (ussd: string) => {
      const code = `${ussd}${fields.amount}*${fields.bankAccount}#`;
      window.location.href = `tel:${encodeURIComponent(code)}`;
    };

    return (
      <div className="max-w-md mx-auto w-full space-y-8 py-12">
        <header className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/5">
            <Landmark className="w-10 h-10 text-brand-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Payment Details</h1>
            <p className="text-muted-foreground font-medium">{qrData.name}</p>
          </div>
        </header>

        <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-secondary/20 rounded-2xl space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Recipient Bank</p>
              <p className="text-lg font-bold">{fields.bankName}</p>
            </div>

            {fields.bankAccount && (
              <div className="p-4 bg-secondary/20 rounded-2xl space-y-1 relative group">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Account Number</p>
                <p className="text-lg font-mono font-bold tracking-wider">{fields.bankAccount}</p>
                <button 
                  onClick={() => handleCopy(fields.bankAccount)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-xl transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            )}

            {fields.amount && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-700/60">Amount to Pay</p>
                  <p className="text-2xl font-black text-brand-700">{fields.amount} {fields.currency || 'NGN'}</p>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-50">Direct Payment</p>
                  <div className="space-y-3">
                    <input 
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter your email for receipt"
                      className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-card text-sm font-bold"
                    />
                    <button 
                      onClick={() => {
                        if (!customerEmail) {
                          alert('Please enter your email for the receipt');
                          return;
                        }
                        // @ts-ignore
                        initializePayment(onSuccess, onClosePaystack);
                      }}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
                    >
                      <Zap className="w-5 h-5 fill-current" />
                      Pay Now with Card/Transfer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isNigeria && (
            <div className="space-y-6">
              {fields.bankStandard === 'nqr' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-50">Scan NQR to Pay</p>
                  <div className="flex justify-center p-4 bg-white rounded-2xl border border-border shadow-sm">
                    <QRCodeSVG 
                      value={fields.nqrPayload || `nqr://pay?acc=${fields.bankAccount}&bank=${fields.bankName}&am=${fields.amount}`}
                      size={180}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="text-[8px] text-center text-muted-foreground font-medium">Scan this with your bank's mobile app to complete the transfer.</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-50">Pay with Bank App</p>
                <div className="grid grid-cols-4 gap-3">
                  {nigerianBanks.map(bank => (
                    <button
                      key={bank.id}
                      onClick={() => {
                        if (bank.app) {
                          window.location.href = bank.app;
                          // Fallback to NQR if app doesn't open
                          setTimeout(() => {
                            if (fields.bankStandard === 'nqr') {
                              window.location.href = `nqr://pay?acc=${fields.bankAccount}&bank=${fields.bankName}&am=${fields.amount}`;
                            }
                          }, 1000);
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Smartphone className="w-5 h-5 text-muted-foreground group-hover:text-brand-700" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-center">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {fields.bankStandard === 'nqr' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-50">Scan NQR to Pay</p>
                  <div className="flex justify-center p-4 bg-white rounded-2xl border border-border shadow-sm">
                    <QRCodeSVG 
                      value={fields.nqrPayload || `nqr://pay?acc=${fields.bankAccount}&bank=${fields.bankName}&am=${fields.amount}`}
                      size={180}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="text-[8px] text-center text-muted-foreground font-medium">Scan this with your bank's mobile app to complete the transfer.</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-50">USSD Transfer</p>
                <div className="grid grid-cols-2 gap-3">
                  {nigerianBanks.filter(b => b.ussd).slice(0, 4).map(bank => (
                    <button
                      key={`ussd-${bank.id}`}
                      onClick={() => handleUssd(bank.ussd!)}
                      className="py-3 bg-secondary/50 border border-border rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-3 h-3" />
                      {bank.name} USSD
                    </button>
                  ))}
                </div>
              </div>

              {fields.bankStandard === 'nqr' && (
                <button 
                  onClick={() => window.location.href = fields.nqrPayload || `nqr://pay?acc=${fields.bankAccount}&bank=${fields.bankName}&am=${fields.amount}`}
                  className="w-full py-5 bg-foreground text-background rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                  <QrCode className="w-5 h-5" />
                  Open NQR App
                </button>
              )}
            </div>
          )}

          {fields.bankStandard === 'upi' && (
            <a 
              href={`upi://pay?pa=${fields.bankUpiId}&pn=${encodeURIComponent(fields.bankName)}&am=${fields.amount}&cu=INR`}
              className="w-full py-5 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
            >
              Pay with UPI App
              <ExternalLink className="w-5 h-5" />
            </a>
          )}

          {!isNigeria && fields.bankStandard !== 'upi' && (
            <div className="text-center space-y-4">
              <p className="text-xs text-muted-foreground font-medium">Please use your bank app to transfer to the account details above.</p>
              <div className="p-4 bg-secondary/10 rounded-2xl border border-dashed border-border">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Reference</p>
                <p className="font-bold font-mono">{fields.bankReference || 'QRFORGE-PAY'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSocial = () => {
    const getIcon = () => {
      if (qrData.qrType === 'instagram') return <Instagram className="w-10 h-10 text-pink-500" />;
      if (qrData.qrType === 'twitter') return <Twitter className="w-10 h-10 text-blue-400" />;
      if (qrData.qrType === 'linkedin') return <Linkedin className="w-10 h-10 text-blue-700" />;
      return <Globe className="w-10 h-10 text-brand-700" />;
    };

    const getUrl = () => {
      if (qrData.qrType === 'instagram') return `https://instagram.com/${fields.text.replace('@', '')}`;
      if (qrData.qrType === 'twitter') return `https://twitter.com/${fields.text.replace('@', '')}`;
      if (qrData.qrType === 'linkedin') return `https://linkedin.com/in/${fields.text}`;
      return fields.url || fields.text;
    };

    if (qrData.qrType === 'social') {
      return <SocialProfileLanding data={{ ...qrData, id: qrId }} views={qrData.stats?.totalScans || 0} isPreview={false} />;
    }

    return (
      <div className="max-w-md mx-auto w-full py-20 text-center space-y-8">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto"
        >
          {getIcon()}
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">{qrData.name}</h1>
          <p className="text-muted-foreground font-medium">Connect with me on {qrData.qrType}</p>
        </div>

        <a 
          href={getUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-10 py-5 bg-foreground text-background rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl"
        >
          View Profile
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
    );
  };

  const renderCrypto = () => (
    <div className="max-w-md mx-auto w-full space-y-8 py-12">
      <header className="text-center space-y-4">
        <div className="w-20 h-20 bg-brand-500/10 rounded-3xl flex items-center justify-center mx-auto">
          <Coins className="w-10 h-10 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Crypto Payment</h1>
          <p className="text-muted-foreground font-medium">{fields.currency} Transfer</p>
        </div>
      </header>

      <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-2xl space-y-6 text-center">
        <div className="space-y-4">
          <div className="p-6 bg-secondary/20 rounded-3xl space-y-2 relative group">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Recipient Address</p>
            <p className="text-sm font-mono font-bold break-all">{fields.address}</p>
            <button 
              onClick={() => handleCopy(fields.address)}
              className="mt-4 px-4 py-2 bg-card rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all flex items-center gap-2 mx-auto"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>

          {fields.amount && (
            <div className="p-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-600/60">Requested Amount</p>
              <p className="text-2xl font-black text-brand-600">{fields.amount} {fields.currency}</p>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Web3 Actions</p>
            {walletAddress ? (
              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-bold font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
                <span className="text-[10px] font-black text-green-500 uppercase">Connected</span>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full py-4 bg-brand-500 text-white rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-3"
              >
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                Connect MetaMask
              </button>
            )}
            
            {walletAddress && (
              <button 
                onClick={async () => {
                  try {
                    const transactionParameters = {
                      to: fields.address,
                      from: walletAddress,
                      value: '0x' + (Math.round(parseFloat(fields.amount || '0') * 1e18)).toString(16), // Basic ETH conversion
                    };
                    await (window as any).ethereum.request({
                      method: 'eth_sendTransaction',
                      params: [transactionParameters],
                    });
                    alert('Transaction sent!');
                  } catch (err) {
                    console.error(err);
                    alert('Transaction failed');
                  }
                }}
                className="w-full py-4 bg-foreground text-background rounded-2xl font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl"
              >
                Pay with Wallet
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
          Please send only {fields.currency} to this address. Sending any other coin may result in permanent loss.
        </p>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="max-w-2xl mx-auto w-full space-y-8 pb-32">
      <header className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/5">
          <UtensilsCrossed className="w-10 h-10 text-brand-700" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{qrData.name}</h1>
          <p className="text-muted-foreground font-medium">Digital Menu & Ordering</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {(Array.isArray(fields.menuItems) ? fields.menuItems : [])?.map((item: any) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-5 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all flex justify-between items-start gap-4"
          >
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              <p className="text-brand-700 font-black text-lg mt-2">${item.price}</p>
            </div>
            <button 
              onClick={() => setCart([...cart, item])}
              className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all active:scale-90"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </motion.div>
        ))}
      </div>

      {cart.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-8 left-4 right-4 max-w-lg mx-auto bg-foreground text-background p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between z-50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center relative">
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-foreground">
                {cart.length}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Amount</p>
              <p className="text-xl font-black">${totalAmount.toFixed(2)}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCheckout(true)}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Checkout
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-md p-8 rounded-[2.5rem] border border-border shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight">Complete Order</h2>
                <p className="text-muted-foreground font-medium">Total: ${totalAmount.toFixed(2)}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Email Address</label>
                  <input 
                    type="email" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-muted/30 border border-border p-4 rounded-2xl outline-none focus:border-primary transition-all"
                  />
                </div>

                <button 
                  onClick={() => {
                    if (!customerEmail) {
                      alert("Please enter your email");
                      return;
                    }
                    // @ts-ignore - react-paystack types can be tricky
                    initializePayment(onSuccess, onClosePaystack);
                  }}
                  className="w-full py-5 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay Now
                </button>
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="w-full py-4 text-muted-foreground font-bold uppercase tracking-widest hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderFlow = () => {
    const steps = Array.isArray(fields.flowSteps) ? fields.flowSteps : [];
    const currentStepData = steps[currentStep];

    if (!currentStepData) return null;

    return (
      <div className="max-w-2xl mx-auto w-full min-h-[80vh] flex flex-col justify-center py-12">
        <div className="mb-12 flex justify-center gap-2">
          {steps.map((_: any, idx: number) => (
            <div 
              key={idx} 
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                idx === currentStep ? "w-12 bg-primary" : idx < currentStep ? "w-6 bg-primary/40" : "w-6 bg-secondary"
              )} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card p-8 md:p-12 rounded-[3rem] border border-border shadow-2xl space-y-8"
          >
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                {currentStepData.type === 'info' && <Info className="w-8 h-8 text-brand-700" />}
                {currentStepData.type === 'menu' && <UtensilsCrossed className="w-8 h-8 text-brand-700" />}
                {currentStepData.type === 'payment' && <CreditCard className="w-8 h-8 text-brand-700" />}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight">{currentStepData.title}</h2>
              <p className="text-muted-foreground font-medium leading-relaxed">{currentStepData.content}</p>
            </div>

            <div className="pt-8 flex flex-col gap-3">
              {currentStep < steps.length - 1 ? (
                <button 
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="w-full py-5 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full py-5 bg-foreground text-background rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                  Complete Flow
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="w-full py-4 text-muted-foreground font-bold uppercase tracking-widest hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderFile = () => (
    <div className="max-w-md mx-auto w-full py-20 text-center space-y-8">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-primary/10 rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto"
      >
        <FileText className="w-10 h-10 text-brand-700" />
      </motion.div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tight">{qrData.name}</h1>
        <p className="text-muted-foreground font-medium">Download your file securely.</p>
      </div>

      <a 
        href={fields.fileUrl}
        download
        className="inline-flex items-center gap-3 px-10 py-5 bg-foreground text-background rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl"
      >
        Download File
        <Download className="w-5 h-5" />
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] p-4 md:p-8 flex flex-col">
      <div className="flex-1">
        {isMenu && renderMenu()}
        {isFlow && renderFlow()}
        {qrData.qrType === 'bank' && renderBank()}
        {qrData.qrType === 'file' && renderFile()}
        {qrData.qrType === 'social' && <SocialProfileLanding data={qrData} views={qrData.stats?.totalScans || 0} />}
        {['instagram', 'twitter', 'linkedin'].includes(qrData.qrType) && renderSocial()}
        {qrData.qrType === 'crypto' && renderCrypto()}
        {!isMenu && !isFlow && !['bank', 'instagram', 'twitter', 'linkedin', 'crypto', 'file', 'social'].includes(qrData.qrType) && (
          <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
            <h1 className="text-4xl font-black uppercase tracking-tight">{qrData.name}</h1>
            <p className="text-xl text-muted-foreground font-medium">{qrData.content}</p>
            {qrData.qrType === 'link' && (
              <a 
                href={qrData.content}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl"
              >
                Visit Website
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </div>
      
      <footer className="py-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Powered by</span>
          <span className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
            <div className="w-4 h-4 bg-primary rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-sm rotate-45" />
            </div>
            QRForge
          </span>
        </div>
      </footer>
    </div>
  );
};
