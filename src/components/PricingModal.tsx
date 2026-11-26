import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, X, Zap, Shield, Globe, 
  ArrowRight, Loader2, Star, Sparkles,
  Building2, Rocket, Heart, Info,
  ChevronRight, Gift
} from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../AuthContext';
import { useNotify } from '../NotificationContext';
import { cn } from '../lib/utils';
import { subscribeToPlans, updateUserRole, submitBrandLogo } from '../services/db';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, isDemoMode } = useAuth();
  const { notify } = useNotify();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [brandData, setBrandData] = useState({
    name: '',
    logoUrl: '',
    website: ''
  });

  useEffect(() => {
    const unsubscribe = subscribeToPlans((data) => {
      setPlans(data.sort((a, b) => a.price - b.price));
    });
    return () => unsubscribe();
  }, []);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || '',
    amount: (selectedPlan?.price || 0) * 100, // Paystack amount is in kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  };

  const onSuccess = async (reference: any) => {
    setIsLoading(true);
    try {
      await updateUserRole(user!.uid, selectedPlan.id);
      notify('success', 'Upgrade Successful', `Successfully upgraded to ${selectedPlan.name}!`);
      onClose();
    } catch (error) {
      notify('error', 'Upgrade Failed', 'Payment was successful but we couldn\'t update your profile. Please contact support.');
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  const onClosePayment = () => {
    notify('info', 'Payment Cancelled', 'You cancelled the payment process.');
    setIsLoading(false);
    setSelectedPlan(null);
  };

  const initializePayment = usePaystackPayment(config);

  const handleUpgrade = async (plan: any) => {
    if (!user) {
      notify('error', 'Authentication Required', 'Please login to upgrade');
      return;
    }

    // Upgrade Logic
    if (plan.price === 0) {
      setIsLoading(true);
      try {
        await updateUserRole(user.uid, plan.id);
        notify('success', 'Plan Updated', `Successfully switched to ${plan.name}!`);
        onClose();
      } catch (error) {
        notify('error', 'Update Failed', 'Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isDemoMode) {
      setIsLoading(true);
      notify('info', 'Demo Mode', 'Simulating payment success in demo mode...');
      setTimeout(async () => {
        try {
          await updateUserRole(user.uid, plan.id);
          notify('success', 'Upgrade Successful', `Successfully upgraded to ${plan.name} (Demo)!`);
          onClose();
        } catch (error) {
          notify('error', 'Upgrade Failed', 'Demo upgrade failed.');
        } finally {
          setIsLoading(false);
        }
      }, 1500);
      return;
    }

    if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY === 'pk_test_your_public_key') {
      notify('error', 'Configuration Missing', 'Paystack API key is not configured. Please contact the administrator.');
      return;
    }

    setSelectedPlan(plan);
  };

  // Trigger payment when selectedPlan is set
  useEffect(() => {
    if (selectedPlan && selectedPlan.price > 0 && !isDemoMode) {
      try {
        initializePayment({ onSuccess, onClose: onClosePayment });
      } catch (error) {
        console.error('Paystack initialization error:', error);
        notify('error', 'Payment Error', 'Failed to initialize payment gateway.');
        setSelectedPlan(null);
      }
    }
  }, [selectedPlan]);

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await submitBrandLogo(user.uid, brandData.name, brandData.logoUrl, brandData.website);
      notify('success', 'Submission Received', 'Brand submitted for review!');
      setShowBrandForm(false);
    } catch (error) {
      notify('error', 'Submission Failed', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-700" />
                <h2 className="text-lg md:text-xl font-black tracking-tight uppercase">Forge Your Potential</h2>
              </div>
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em]">
                Select the engine that powers your digital legacy
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
            {profile?.subscription?.status === 'trialing' && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-brand-700">Trial Active</h4>
                  <p className="text-[8px] font-medium text-muted-foreground uppercase tracking-tight">
                    Enjoying {profile.subscription.planId} trial until {profile.subscription.trialEnd?.toDate().toLocaleDateString()}. Subscribe now to lock in your assets.
                  </p>
                </div>
              </div>
            )}
            {!showBrandForm ? (
              <>
                {/* Mobile Scroll Indicator */}
                <div className="md:hidden flex items-center justify-center gap-2 mb-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <div className="w-1 h-1 rounded-full bg-muted" />
                  <div className="w-1 h-1 rounded-full bg-muted" />
                  <span className="text-[8px] font-bold uppercase tracking-widest ml-2">Swipe for plans</span>
                </div>

                {/* Plans Grid/Scroll */}
                <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 snap-x snap-mandatory no-scrollbar">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      className={cn(
                        "min-w-[260px] md:min-w-0 snap-center p-5 rounded-2xl border transition-all flex flex-col space-y-5 relative group",
                        plan.id === 'pro' 
                          ? "bg-foreground text-background border-primary shadow-xl shadow-primary/10 md:scale-105 z-10" 
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      {plan.id === 'pro' && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-primary text-primary-foreground text-[7px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Most Powerful
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-black uppercase tracking-tight">{plan.name}</h3>
                          {plan.id === 'business' && <Building2 className="w-4 h-4 text-brand-700" />}
                          {plan.id === 'pro' && <Zap className="w-4 h-4 text-brand-700" />}
                          {plan.id === 'free' && <Heart className="w-4 h-4 text-brand-700" />}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black">${plan.price}</span>
                          <span className="text-[9px] opacity-60 font-black uppercase tracking-widest">/{plan.interval || 'mo'}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 flex-1">
                        {plan.features?.map((feature: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-full flex items-center justify-center",
                              plan.id === 'pro' ? "bg-primary/20" : "bg-primary/10"
                            )}>
                              <Check className={cn("w-2 h-2", plan.id === 'pro' ? "text-brand-700" : "text-brand-700")} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wide opacity-80 leading-none">{feature}</span>
                          </div>
                        ))}
                        
                        {/* Dynamic Feature Badges */}
                        <div className="pt-3 grid grid-cols-2 gap-1.5">
                          {plan.dynamicAllowed && (
                            <div className="px-1.5 py-0.5 bg-primary/10 rounded-md text-[6px] font-black uppercase tracking-widest text-brand-700 text-center">Dynamic</div>
                          )}
                          {plan.analyticsAllowed && (
                            <div className="px-1.5 py-0.5 bg-primary/10 rounded-md text-[6px] font-black uppercase tracking-widest text-brand-700 text-center">Analytics</div>
                          )}
                          {plan.customBrandingAllowed && (
                            <div className="px-1.5 py-0.5 bg-primary/10 rounded-md text-[6px] font-black uppercase tracking-widest text-brand-700 text-center">Branding</div>
                          )}
                          {plan.bulkAllowed && (
                            <div className="px-1.5 py-0.5 bg-primary/10 rounded-md text-[6px] font-black uppercase tracking-widest text-brand-700 text-center">Bulk</div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpgrade(plan)}
                        disabled={isLoading || profile?.role === plan.id}
                        className={cn(
                          "w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 flex items-center justify-center gap-1.5",
                          plan.id === 'pro'
                            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                            : "bg-secondary text-foreground hover:bg-border"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : profile?.role === plan.id && profile?.subscription?.status === 'active' ? (
                          'Current Plan'
                        ) : (
                          <>
                            {profile?.subscription?.status === 'trialing' && profile?.role === plan.id ? 'Subscribe & Continue' : 'Upgrade Now'}
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Brand Collection Teaser */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Globe className="w-4 h-4 text-brand-700" />
                      <h4 className="text-xs font-black uppercase tracking-tight">Showcase Your Brand</h4>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider max-w-md leading-relaxed">
                      Join the elite circle of brands powered by QRForge. Submit your logo to be featured on our global landing page.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowBrandForm(true)}
                    className="px-5 py-2.5 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/10 w-full md:w-auto"
                  >
                    Submit Brand Logo
                  </button>
                </div>
              </>
            ) : (
              <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleBrandSubmit}
                className="space-y-6 max-w-md mx-auto py-4"
              >
                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-xl font-bold uppercase tracking-tight">Brand Submission</h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Help us build the most powerful QR OS by showcasing your brand
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest opacity-50">Brand Name</label>
                    <input 
                      required
                      type="text" 
                      value={brandData.name}
                      onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl outline-none focus:border-primary transition-all text-xs font-bold"
                      placeholder="e.g. Apple Inc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest opacity-50">Logo URL (SVG/PNG)</label>
                    <input 
                      required
                      type="url" 
                      value={brandData.logoUrl}
                      onChange={(e) => setBrandData({ ...brandData, logoUrl: e.target.value })}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl outline-none focus:border-primary transition-all text-xs font-bold"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest opacity-50">Website</label>
                    <input 
                      required
                      type="url" 
                      value={brandData.website}
                      onChange={(e) => setBrandData({ ...brandData, website: e.target.value })}
                      className="w-full bg-muted/30 border border-border p-3 rounded-xl outline-none focus:border-primary transition-all text-xs font-bold"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowBrandForm(false)}
                    className="flex-1 py-3 bg-secondary text-foreground text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-border transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Brand'}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <Info className="w-4 h-4 text-brand-700 shrink-0" />
                  <p className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
                    By submitting, you permit QRForge to display your logo on our landing page and marketing materials.
                  </p>
                </div>
              </motion.form>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 md:p-5 bg-muted/30 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-60">
                Free to start. No card needed.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-brand-700" />
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Secure SSL Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
