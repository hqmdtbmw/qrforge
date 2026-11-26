import React from 'react';
import { motion } from 'motion/react';
import { Code, Terminal, Zap, Shield, Key, Copy, Check, ArrowLeft, Book, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

export const ApiDocs: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast('Copied to clipboard!', 'success');
  };

  const sections = [
    {
      title: "Authentication",
      icon: <Shield className="w-5 h-5" />,
      content: "All API requests must include your API key in the `X-API-Key` header. Keep your API key secure and never expose it in client-side code.",
      code: `curl -H "X-API-Key: YOUR_API_KEY" ${window.location.origin}/api/qrcodes`
    },
    {
      title: "Create QR Code",
      icon: <Zap className="w-5 h-5" />,
      content: "Generate a new QR code by sending a POST request with the required parameters.",
      code: `curl -X POST ${window.location.origin}/api/qrcodes \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My API QR",
    "type": "dynamic",
    "qrType": "url",
    "content": "https://example.com"
  }'`
    },
    {
      title: "Get Analytics",
      icon: <Cpu className="w-5 h-5" />,
      content: "Retrieve scan statistics and location data for a specific QR code.",
      code: `curl -H "X-API-Key: YOUR_API_KEY" ${window.location.origin}/api/qrcodes/{id}/analytics`
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-xl transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-brand-700">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Developer API</h1>
                <p className="text-muted-foreground font-medium">Build powerful integrations with QRForge</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-foreground">
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{section.title}</h2>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>

                <div className="relative group">
                  <pre className="bg-zinc-950 text-zinc-300 p-6 rounded-2xl text-xs font-mono overflow-x-auto border border-white/5">
                    {section.code}
                  </pre>
                  <button
                    onClick={() => handleCopy(section.code, `code-${idx}`)}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    {copied === `code-${idx}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="pt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Need help? Contact our developer support at <span className="text-brand-700 font-bold">dev@qrforge.com</span>
          </p>
        </footer>
      </div>
    </div>
  );
};
