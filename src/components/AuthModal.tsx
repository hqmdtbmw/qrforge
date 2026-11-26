import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, ArrowRight, Loader2, Github, Chrome, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, loginWithEmail, signupWithEmail, resetPassword, enterDemoMode, networkError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeError = error || networkError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (!name) throw new Error('Please enter your name');
        await signupWithEmail(email, password, name);
        onClose();
      } else {
        await resetPassword(email);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await login();
      onClose();
    } catch (err: any) {
      console.error('Google login error in modal:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network blocked. Please disable ad-blockers or check your connection.');
      } else {
        setError(err.message || 'Google Sign-In failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/40 backdrop-blur-md"
          />
          
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[300px] bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden sm:mb-0 mb-safe"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-full transition-all z-10 active:scale-90"
            >
              <X className="w-4 h-4 opacity-30" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <motion.div 
                  layout
                  key="auth-icon"
                  className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"
                >
                  <Lock className="w-6 h-6 text-brand-700" />
                </motion.div>
                <motion.h2 layout key="auth-title" className="text-xl font-black tracking-tighter uppercase leading-none">
                  {mode === 'login' ? 'Access' : mode === 'signup' ? 'Join' : 'Reset'}
                </motion.h2>
                <motion.p layout key="auth-subtitle" className="text-[8px] text-muted-foreground mt-2 font-bold uppercase tracking-widest opacity-60">
                  {mode === 'login' ? 'Sign in to your forge' : mode === 'signup' ? 'Start your pro trial' : 'Check your inbox'}
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {activeError && (
                    <motion.div
                      key="auth-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-[8px] font-bold uppercase tracking-wide">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                        {activeError}
                      </div>
                      {activeError.toLowerCase().includes('network') && (
                        <button
                          type="button"
                          onClick={() => {
                            enterDemoMode();
                            onClose();
                          }}
                          className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-[8px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                        >
                          Bypass Login (Enter Demo Mode)
                        </button>
                      )}
                    </motion.div>
                  )}

                  {mode === 'signup' && (
                    <motion.div 
                      key="signup-fields"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-1"
                    >
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground group-focus-within:text-brand-700 transition-colors" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-transparent focus:border-primary/20 rounded-lg focus:outline-none transition-all text-[10px] font-medium"
                          placeholder="FULL NAME"
                        />
                      </div>
                    </motion.div>
                  )}

                  <motion.div layout key="email-field" className="space-y-1">
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground group-focus-within:text-brand-700 transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-transparent focus:border-primary/20 rounded-lg focus:outline-none transition-all text-[10px] font-medium"
                        placeholder="EMAIL ADDRESS"
                      />
                    </div>
                  </motion.div>

                  {mode !== 'reset' && (
                    <motion.div layout key="password-field" className="space-y-1">
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground group-focus-within:text-brand-700 transition-colors" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-transparent focus:border-primary/20 rounded-lg focus:outline-none transition-all text-[10px] font-medium"
                          placeholder="PASSWORD"
                        />
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => setMode('reset')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[6px] font-black uppercase tracking-widest text-brand-700 hover:opacity-70 transition-opacity"
                          >
                            FORGOT?
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-foreground text-background rounded-lg font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[8px] mt-1 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'SIGN IN' : mode === 'signup' ? 'CREATE' : 'RESET'}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50"></div>
                </div>
                <div className="relative flex justify-center text-[6px] uppercase font-black tracking-[0.3em]">
                  <span className="bg-card px-2 text-muted-foreground/40">OR</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full py-2 bg-secondary/30 border border-transparent hover:border-primary/20 rounded-lg font-bold text-[9px] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" className="w-3 h-3 grayscale opacity-60" alt="Google" />
                <span className="opacity-60 uppercase tracking-widest">Google</span>
              </button>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest hover:text-brand-700 transition-colors"
                >
                  {mode === 'login' ? "New here? Create Account" : "Back to Sign In"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
