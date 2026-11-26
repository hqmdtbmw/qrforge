import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Check, 
  ChevronRight,
  Search,
  BookOpen,
  Key,
  Globe,
  Webhook,
  Layers,
  ArrowLeft,
  Menu,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

const DocsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('getting-started');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(null), 2000);
  };

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'authentication', title: 'Authentication', icon: <Key className="w-4 h-4" /> },
    { id: 'qr-generation', title: 'QR Generation', icon: <Zap className="w-4 h-4" /> },
    { id: 'webhooks', title: 'Webhooks', icon: <Webhook className="w-4 h-4" /> },
    { id: 'rate-limits', title: 'Rate Limits', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'changelog', title: 'Changelog', icon: <Layers className="w-4 h-4" /> },
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-secondary rounded-xl transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-black uppercase tracking-tight text-xs">Dev Center</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-secondary/50 hover:bg-secondary rounded-xl transition-all active:scale-90"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-0 z-40 md:relative md:z-0 md:w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full space-y-8 overflow-y-auto custom-scrollbar">
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2.5 hover:bg-secondary rounded-xl transition-all group active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xs font-black uppercase tracking-widest leading-none">Dev Center</h1>
                <p className="text-[6px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Documentation</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <nav className="space-y-1">
            {filteredSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveTab(section.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === section.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {section.icon}
                {section.title}
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-border mt-auto">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-4">Resources</p>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/api-docs')}
                className="w-full flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-brand-700 transition-colors"
              >
                API Reference <ChevronRight className="w-3 h-3" />
              </button>
              <a href="https://postman.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-brand-700 transition-colors">
                Postman Collection <ExternalLink className="w-3 h-3" />
              </a>
              <button 
                onClick={() => setActiveTab('changelog')}
                className="w-full flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-brand-700 transition-colors"
              >
                Changelog <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto p-6 md:p-12 space-y-12 w-full overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'getting-started' && (
            <motion.div 
              key="getting-started"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-brand-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Zap className="w-3 h-3" />
                  V2.0.0 Stable
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">Build with QRForge API</h2>
                <p className="text-base md:text-lg text-muted-foreground font-medium leading-relaxed">
                  Integrate professional QR generation directly into your application. Our REST API allows you to create, manage, and track QR codes with full design control.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card rounded-3xl border border-border shadow-sm space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">RESTful Design</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">Standard HTTP methods and JSON responses for seamless integration with any stack.</p>
                </div>
                <div className="p-6 bg-card rounded-3xl border border-border shadow-sm space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Secure by Default</h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">Enterprise-grade security with API key rotation and granular permission scopes.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-black tracking-tight">Quick Install</h3>
                <div className="relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => copyToClipboard('npm install @qrforge/sdk', 'install')}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      {copied === 'install' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-50 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-white/10 shadow-2xl">
                    <code>npm install @qrforge/sdk</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'authentication' && (
            <motion.div 
              key="authentication"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Authentication</h2>
                <p className="text-muted-foreground font-medium">
                  QRForge uses API keys to authenticate requests. You can view and manage your API keys in the <span className="text-brand-700 font-bold">Settings &gt; Developer API</span> section of your dashboard.
                </p>
              </div>

              <div className="p-6 bg-brand-500/5 border border-brand-500/20 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-brand-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Security Warning</span>
                </div>
                <p className="text-xs text-brand-700/80 font-medium leading-relaxed">
                  Your API keys carry significant privileges. Keep them secure and never expose them in client-side code or public repositories.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Header Example</h3>
                <div className="relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY', 'auth')}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      {copied === 'auth' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-50 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-white/10 shadow-2xl">
                    <code>{`Authorization: Bearer YOUR_API_KEY\nX-QRForge-Organization: org_123`}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'qr-generation' && (
            <motion.div 
              key="qr-generation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Generate QR Code</h2>
                <p className="text-muted-foreground font-medium">
                  Create a new QR code with custom design parameters.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-green-500 text-white rounded text-[10px] font-black uppercase">POST</span>
                  <code className="text-xs font-bold text-muted-foreground">/v1/qr/generate</code>
                </div>

                <div className="relative group">
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => copyToClipboard(`fetch('${window.location.origin}/api/qr/generate', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({\n    name: 'My Campaign',\n    content: 'https://example.com',\n    design: {\n      matrixStyle: 'dots',\n      primaryColor: '#ff5c00'\n    }\n  })\n})`, 'code')}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      {copied === 'code' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-50 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-white/10 shadow-2xl">
                    <code>{`fetch('${window.location.origin}/api/qr/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Campaign',
    content: 'https://example.com',
    design: {
      matrixStyle: 'dots',
      primaryColor: '#ff5c00'
    }
  })
})`}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'webhooks' && (
            <motion.div 
              key="webhooks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Webhooks</h2>
                <p className="text-muted-foreground font-medium">
                  Receive real-time notifications when your QR codes are scanned.
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-card rounded-3xl border border-border space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest">Event Types</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-3 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <code>qr.scanned</code> - Triggered on every scan
                    </li>
                    <li className="flex items-center gap-3 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <code>qr.created</code> - Triggered when a new QR is generated
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Payload Example</h3>
                  <pre className="bg-slate-950 text-slate-50 p-6 rounded-2xl font-mono text-xs overflow-x-auto border border-white/10 shadow-2xl">
                    <code>{`{
  "id": "evt_123",
  "type": "qr.scanned",
  "data": {
    "qrId": "qr_abc",
    "timestamp": "2024-04-11T12:00:00Z",
    "location": {
      "city": "Lagos",
      "country": "Nigeria"
    }
  }
}`}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rate-limits' && (
            <motion.div 
              key="rate-limits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Rate Limits</h2>
                <p className="text-muted-foreground font-medium">
                  To ensure stability, we enforce rate limits on all API requests.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { plan: 'Free', limit: '100 req/day', color: 'bg-slate-500' },
                  { plan: 'Pro', limit: '10,000 req/day', color: 'bg-primary' },
                  { plan: 'Enterprise', limit: 'Unlimited', color: 'bg-purple-500' }
                ].map((item) => (
                  <div key={item.plan} className="p-4 bg-card rounded-2xl border border-border text-center space-y-2">
                    <div className={cn("w-2 h-2 rounded-full mx-auto", item.color)} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{item.plan}</p>
                    <p className="text-xs font-bold">{item.limit}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-secondary/30 rounded-3xl">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  If you exceed your rate limit, the API will return a <code>429 Too Many Requests</code> response. Headers will include <code>X-RateLimit-Reset</code> to indicate when you can resume requests.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'changelog' && (
            <motion.div 
              key="changelog"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-black tracking-tight">Changelog</h2>
                <p className="text-muted-foreground font-medium">
                  Stay up to date with the latest improvements and features.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    version: 'v2.0.0',
                    date: 'April 11, 2026',
                    title: 'The Intelligence Update',
                    changes: [
                      'Introduced Smart Pulse real-time notifications',
                      'New Social Studio for professional profile gateways',
                      'Enhanced bulk actions and folder management',
                      'Improved MetaMask integration for crypto payments',
                      'Complete UI/UX overhaul for mobile responsiveness'
                    ]
                  },
                  {
                    version: 'v1.5.0',
                    date: 'March 20, 2026',
                    title: 'Analytics & Brands',
                    changes: [
                      'Advanced location-based scan analytics',
                      'Brand partnership program launch',
                      'Custom domain support for Pro users',
                      'New API endpoints for batch generation'
                    ]
                  }
                ].map((release, i) => (
                  <div key={release.version} className="relative pl-8 border-l-2 border-primary/20 space-y-3">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-[8px] font-black uppercase">{release.version}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{release.date}</span>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight">{release.title}</h3>
                    <ul className="space-y-2">
                      {release.changes.map((change, j) => (
                        <li key={j} className="flex items-start gap-3 text-xs text-muted-foreground font-medium">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default DocsPage;
