import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NativeColorPicker } from './ui/NativeColorPicker';
import { 
  Plus, X, Sparkles, Loader2, Upload, Palette, Type, 
  Frame as FrameIcon, Zap, Link as LinkIcon, Mail, Phone, 
  MessageSquare, Wifi, User, Calendar, FileText, Smartphone, 
  File as FileIcon, MessageCircle, Coins, Info, Settings,
  Maximize, Minimize, ShieldCheck, LayoutGrid, Save, Clock, Check, Copy,
  Split, Crown, RotateCcw, Landmark, UtensilsCrossed, Workflow,
  PlusCircle, Trash2, GripVertical, CreditCard, Globe, Folder as FolderIcon,
  Lock, Instagram, Twitter, Linkedin, Facebook, Github
} from 'lucide-react';
import { QR_TYPES, BANK_STANDARDS, COUNTRIES, QRType, NIGERIA_BANKS } from '../constants/qrTypes';
import { generateQRDesignSuggestions, suggestQRContent } from '../lib/gemini';
import { buildQrPayload } from '../lib/qrPayload';
import { createQRCode, updateQRCode, createCampaign, addVariationToCampaign, subscribeToUserFolders, Folder, subscribeToPlans, recordDownload, checkDownloadLimit, subscribeToUserOrganizations } from '../services/db';
import { useAuth } from '../AuthContext';
import { QRPreview, QRPreviewHandle } from './QRPreview';
import { cn, validateLogo } from '../lib/utils';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from './Toast';
import { QR_TEMPLATES } from '../constants/templates';
import { SOCIAL_TEMPLATES } from '../constants/socialTemplates';
import { uploadImage } from '../services/storage';

import { nanoid } from 'nanoid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { PricingModal } from './PricingModal';
import { Download, ChevronDown, Image as ImageIcon, FileCode, ChevronLeft, Palette as PaletteIcon, Save as SaveIcon } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { NativeSelect } from './ui/NativeSelect';
import { NativeDatePicker } from './ui/NativeDatePicker';

interface CreateQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  qrId?: string;
  orgId?: string;
}

type QRCategory = 'static' | 'dynamic';

const SortableItem = ({ id, children, handle = false }: { id: string; children: React.ReactNode; handle?: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  if (handle) {
    return (
      <div ref={setNodeRef} style={style} className="group">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && (child.type as any).displayName === 'SortableHandle') {
            return React.cloneElement(child as React.ReactElement<any>, { ...attributes, ...listeners });
          }
          return child;
        })}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const SortableHandle = ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};
SortableHandle.displayName = 'SortableHandle';

export const CreateQRModal: React.FC<CreateQRModalProps> = ({ isOpen, onClose, initialData, qrId, orgId }) => {
  const { user, profile } = useAuth();
  const { toast, removeToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrPreviewRef = useRef<QRPreviewHandle>(null);
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState<QRCategory>(initialData?.type || 'static');
  const [qrType, setQrType] = useState<QRType>(initialData?.qrType || 'text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingContent, setIsSuggestingContent] = useState(false);
  const [contentSuggestions, setContentSuggestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedShortId, setSavedShortId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg'>('png');
  const [hideBackground, setHideBackground] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [svgCode, setSvgCode] = useState('');
  const [showSvgPaste, setShowSvgPaste] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initialData?.expiresAt || '');
  const [scanLimit, setScanLimit] = useState<number | ''>(initialData?.scanLimit || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const [isABTest, setIsABTest] = useState(initialData?.isABTest || false);
  const [campaignName, setCampaignName] = useState(initialData?.campaignName || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgId || initialData?.orgId || '');
  const [userOrgs, setUserOrgs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserOrganizations(user.uid, setUserOrgs);
      return () => unsubscribe();
    }
  }, [user]);

  // Reset transient state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsGenerating(false);
      setIsSuggestingContent(false);
      setIsSaving(false);
      setIsDownloading(false);
      setShowDownloadOptions(false);
      setShowMobileSettings(false);
      setShowSvgPaste(false);
      setPrompt('');
      setAiSuggestions([]);
      setContentSuggestions([]);
      setSelectedSuggestionIndex(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setIsInputFocused(true);
      }
    };
    const handleBlur = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setIsInputFocused(false);
      }
    };

    window.addEventListener('focusin', handleFocus as any);
    window.addEventListener('focusout', handleBlur as any);
    return () => {
      window.removeEventListener('focusin', handleFocus as any);
      window.removeEventListener('focusout', handleBlur as any);
    };
  }, []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(initialData?.folderId || null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToPlans(setPlans);
    return () => unsubscribe();
  }, []);

  const currentPlan = plans.find(p => p.id === profile?.role) || plans.find(p => p.id === 'free');
  const isDemoUser = user?.uid === 'demo-user-123';
  const isPro = !isDemoUser && (profile?.role === 'pro' || profile?.role === 'business' || profile?.role === 'admin' || profile?.subscription?.status === 'trialing');

  // Feature checks based on plan
  const canUseDynamic = currentPlan?.dynamicAllowed || isPro;
  const canUseFlow = currentPlan?.flowAllowed || isPro;
  const canUseMenu = currentPlan?.menuAllowed || isPro;
  const canUseBank = currentPlan?.bankAllowed || isPro;
  const canUseABTest = currentPlan?.abTestingAllowed || isPro;
  const canUseBulk = currentPlan?.bulkAllowed || isPro;
  const canUsePassword = currentPlan?.passwordProtectionAllowed || isPro;

  // Content Fields
  const getMergedFields = (initialFields: any = {}) => {
    const defaults = {
      text: '',
      url: '',
      phone: '',
      message: '',
      email: '',
      subject: '',
      body: '',
      ssid: '',
      password: '',
      encryption: 'WPA',
      firstName: '',
      lastName: '',
      org: '',
      title: '',
      eventTitle: '',
      address: '',
      description: '',
      amount: '',
      currency: 'BTC',
      // Bank Fields
      bankCountry: 'US',
      bankStandard: 'generic',
      bankAccount: '',
      bankName: '',
      nqrPayload: '',
      bankIban: '',
      bankBic: '',
      bankUpiId: '',
      bankPixKey: '',
      bankPaynowProxyType: '0',
      bankPaynowProxy: '',
      bankPromptpayProxyType: '01',
      bankPromptpayProxy: '',
      bankReference: '',
      bankCity: 'CITY',
      // Menu Fields
      menuItems: [{ id: nanoid(4), name: '', price: '', description: '' }],
      // Flow Fields
      flowSteps: [{ id: nanoid(4), type: 'info', title: '', content: '' }],
      // Social Links Fields
      profileName: '',
      profileBio: '',
      profileImage: '',
      templateId: 'modern-dark',
      socialLinks: [{ id: nanoid(4), platform: 'instagram', url: '', label: '' }],
      // File Fields
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      // vCard Extra
      jobTitle: '',
      website: '',
      notes: '',
      socials: {
        twitter: '',
        linkedin: '',
        instagram: ''
      }
    };

    if (typeof initialFields !== 'object' || initialFields === null) {
      return defaults;
    }

    const merged = { ...defaults };
    Object.keys(initialFields).forEach(key => {
      if (initialFields[key] !== undefined && initialFields[key] !== null) {
        merged[key] = initialFields[key];
      }
    });
    
    // Ensure arrays are actually arrays
    if (!Array.isArray(merged.menuItems)) merged.menuItems = defaults.menuItems;
    if (!Array.isArray(merged.flowSteps)) merged.flowSteps = defaults.flowSteps;
    
    return merged;
  };

  const [fields, setFields] = useState<any>(() => getMergedFields(initialData?.fields));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, listType: 'socialLinks' | 'menuItems' | 'flowSteps') => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields[listType].findIndex((item: any) => item.id === active.id);
      const newIndex = fields[listType].findIndex((item: any) => item.id === over.id);

      setFields({
        ...fields,
        [listType]: arrayMove(fields[listType], oldIndex, newIndex),
      });
    }
  };

  const DEFAULT_DESIGN = {
    fgColor: '#000000',
    bgColor: '#ffffff',
    eyeFrameColor: '#000000',
    eyeInnerColor: '#000000',
    matrixStyle: 'square',
    eyeFrameStyle: 'square',
    eyeInnerStyle: 'square',
    margin: 10,
    errorCorrectionLevel: 'M',
    logoUrl: '',
    logoSize: 0.4,
    logoMargin: 5,
    logoBackground: true,
    logoBackgroundShape: 'rounded',
    logoBackgroundColor: '#ffffff',
    frame: {
      type: 'none',
      text: 'SCAN ME',
      color: '#000000',
      textColor: '#ffffff'
    },
    fgGradient: null,
    bgGradient: null
  };

  const [design, setDesign] = useState<any>(initialData?.design || DEFAULT_DESIGN);

  // Cloud Preview Sync
  useEffect(() => {
    if (!isOpen || initialData) return;

    const syncPreview = async () => {
      const { savePreview } = await import('../services/db');
      const id = await savePreview({
        name: name || 'Preview',
        type: category,
        qrType,
        fields,
        design,
        ownerId: user?.uid
      });
      if (id) setPreviewId(id);
    };

    const timer = setTimeout(syncPreview, 2000); // Debounce 2s
    return () => clearTimeout(timer);
  }, [name, category, qrType, fields, design, isOpen, initialData, user?.uid]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserFolders(user.uid, (data) => {
        setFolders(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.type || 'static');
      setQrType(initialData.qrType || (initialData.type === 'static' ? 'text' : 'link'));
      setFields(getMergedFields(initialData.fields || { text: initialData.content }));
      setDesign(initialData.design || design);
      setExpiresAt(initialData.expiresAt || '');
      setScanLimit(initialData.scanLimit || '');
      setTags(initialData.tags || []);
      setIsABTest(initialData.isABTest || false);
      setCampaignName(initialData.campaignName || '');
      setPassword(initialData.password || '');
    } else if (isOpen) {
      // Load draft if creating new
      const draft = localStorage.getItem('qrforge_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setName(parsed.name || '');
          setCategory(parsed.category || 'static');
          setQrType(parsed.qrType || 'text');
          setFields(getMergedFields(parsed.fields));
          setDesign(parsed.design || design);
          setExpiresAt(parsed.expiresAt || '');
          setTags(parsed.tags || []);
          setIsABTest(parsed.isABTest || false);
          setCampaignName(parsed.campaignName || '');
          setPassword(parsed.password || '');
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      }
    }
  }, [initialData, isOpen]);

  // Save draft on change
  useEffect(() => {
    if (isOpen && !initialData) {
      const draft = { name, category, qrType, fields, design, expiresAt, scanLimit, tags, isABTest, campaignName, password };
      localStorage.setItem('qrforge_draft', JSON.stringify(draft));
    }
  }, [name, category, qrType, fields, design, expiresAt, scanLimit, tags, isABTest, campaignName, password, isOpen, initialData]);

  useEffect(() => {
    if (qrType === 'bank' || qrType === 'menu' || qrType === 'flow' || qrType === 'file' || qrType === 'social') {
      setCategory('dynamic');
    }
  }, [qrType]);

  const [content, setContent] = useState('');

  const previewValue = category === 'dynamic' 
    ? (previewId ? `${window.location.origin}/view/p/${previewId}` : (initialData?.shortId ? `${window.location.origin}/view/${initialData.shortId}` : `${window.location.origin}/view/preview`))
    : content;

  useEffect(() => {
    setContent(buildQrPayload(qrType, fields) || '');
  }, [fields, qrType]);

  const handleAISuggest = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setAiSuggestions([]);
    setSelectedSuggestionIndex(null);
    try {
      const suggestions = await generateQRDesignSuggestions(prompt);
      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
        // Apply the first one by default
        applySuggestion(suggestions[0], 0);
        toast('AI forged 3 unique designs for you!', 'success');
      }
    } catch (error) {
      toast('Failed to get AI suggestions. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestContent = async () => {
    setIsSuggestingContent(true);
    setContentSuggestions([]);
    try {
      // Use the name or a brief context as input
      const context = name || prompt || 'General use';
      const suggestions = await suggestQRContent(qrType, context);
      if (suggestions && suggestions.length > 0) {
        setContentSuggestions(suggestions);
        toast('AI suggested 3 content options!', 'success');
      }
    } catch (error) {
      toast('Failed to get content suggestions.', 'error');
    } finally {
      setIsSuggestingContent(false);
    }
  };

  const applyContentSuggestion = (suggestion: any) => {
    if (qrType === 'text') setFields({ ...fields, text: suggestion.content });
    else if (qrType === 'link') setFields({ ...fields, url: suggestion.content });
    else if (qrType === 'vcard') {
      // If AI returns a vcard string, we might need to parse it or just set it if we support raw vcard
      // For now, let's assume it returns the primary field or we just use the suggestion title as name
      setFields({ ...fields, firstName: suggestion.title, text: suggestion.content });
    } else {
      setFields({ ...fields, text: suggestion.content });
    }
    setContentSuggestions([]);
  };

  const applySuggestion = (suggestion: any, index: number) => {
    setDesign({
      ...design,
      fgColor: suggestion.fgColor,
      bgColor: suggestion.bgColor,
      eyeFrameColor: suggestion.eyeFrameColor,
      eyeInnerColor: suggestion.eyeInnerColor,
      matrixStyle: suggestion.matrixStyle,
      eyeFrameStyle: suggestion.eyeFrameStyle,
      eyeInnerStyle: suggestion.eyeInnerStyle,
      margin: suggestion.margin || design.margin
    });
    setSelectedSuggestionIndex(index);
  };

  const handleSaveDraft = () => {
    if (!name) {
      toast('Please give your campaign a name first', 'error');
      return;
    }
    const drafts = JSON.parse(localStorage.getItem('qrforge_drafts') || '[]');
    const newDraft = {
      id: qrId || `draft_${Date.now()}`,
      name,
      category,
      qrType,
      fields,
      design,
      expiresAt,
      tags,
      isABTest,
      campaignName,
      password,
      updatedAt: new Date().toISOString(),
      isDraft: true
    };
    
    const existingIndex = drafts.findIndex((d: any) => d.id === newDraft.id);
    if (existingIndex >= 0) {
      drafts[existingIndex] = newDraft;
    } else {
      drafts.push(newDraft);
    }
    
    localStorage.setItem('qrforge_drafts', JSON.stringify(drafts));
    toast('Draft saved successfully!', 'success');
    onClose();
  };

  const [isLogoUploading, setIsLogoUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = await validateLogo(file);
    if (!validation.valid) {
      toast(validation.error || 'Invalid logo file', 'error');
      return;
    }

    setIsLogoUploading(true);
    try {
      const downloadURL = await uploadImage(file, `logos/${user.uid}/${Date.now()}_${file.name}`, 400, 400);
      setDesign((prev: any) => ({ ...prev, logoUrl: downloadURL }));
      toast('Logo optimized and uploaded successfully!', 'success');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast('Failed to upload logo. Please try again.', 'error');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleSvgPaste = () => {
    if (svgCode.trim()) {
      // For SVG paste, we'll keep it as a data URL or blob for preview
      // In a real production app, you might want to sanitize this
      const blob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      setDesign({ ...design, logoUrl: url });
      setShowSvgPaste(false);
      setSvgCode('');
      toast('SVG logo applied!', 'success');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast('You must be logged in to save QR codes.', 'error');
      return;
    }
    if (!name.trim()) {
      toast('Please enter a campaign name.', 'error');
      return;
    }
    if (!content.trim()) {
      toast('Please enter the QR content.', 'error');
      return;
    }

    if ((category === 'dynamic' && !canUseDynamic) || (isABTest && !canUseABTest)) {
      setShowPricing(true);
      return;
    }
    
    if (isABTest && !campaignName.trim()) {
      toast('Please enter a campaign name for A/B testing.', 'error');
      return;
    }

    setIsSaving(true);
    const loadingToastId = toast(qrId ? 'Updating QR code...' : 'Creating QR code...', 'loading');
    
    try {
      const isDynamic = category === 'dynamic';
      const shortId = isDynamic ? (qrId ? undefined : nanoid(8)) : null;

      // Final content check
      if (!content || content.trim() === '') {
        throw new Error('QR content is empty. Please check your inputs.');
      }

      if (qrId) {
        await updateQRCode(qrId, {
          name: name.trim(),
          content: content.trim(),
          type: category,
          qrType,
          fields,
          design,
          expiresAt: expiresAt || null,
          scanLimit: scanLimit || null,
          tags,
          folderId,
          orgId: selectedOrgId || null,
          isABTest,
          campaignName: campaignName.trim(),
          password
        });
        setSavedShortId(initialData?.shortId || null);
        setIsSuccess(true);
        removeToast(loadingToastId);
        toast('QR code updated successfully!', 'success');
      } else {
        const newQrId = await createQRCode(user.uid, {
          name: name.trim(),
          content: content.trim(),
          type: category,
          qrType,
          shortId,
          fields,
          design,
          expiresAt: expiresAt || null,
          scanLimit: scanLimit || null,
          tags,
          folderId,
          orgId: selectedOrgId || null,
          isABTest,
          campaignName: campaignName.trim(),
          password
        });

        if (isABTest && campaignName) {
          const campaignId = await createCampaign({
            ownerId: user.uid,
            name: campaignName,
            description: `A/B test for ${name}`
          });
          if (campaignId && newQrId) {
            await addVariationToCampaign(campaignId, newQrId);
          }
        }

        setSavedShortId(shortId);
        setIsSuccess(true);
        localStorage.removeItem('qrforge_draft');
        removeToast(loadingToastId);
        toast('QR code created successfully!', 'success');
      }
    } catch (error: any) {
      console.error(error);
      removeToast(loadingToastId);
      toast(error.message || 'Failed to save QR code. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (format?: 'png' | 'svg') => {
    if (!qrPreviewRef.current) return;
    
    // Enforce download limits for free users (Fraud Prevention)
    if (!isPro) {
      const canDownload = await checkDownloadLimit('qr_demo');
      if (!canDownload) {
        toast('Demo download limit reached. Upgrade to Pro for unlimited downloads.', 'error');
        setShowPricing(true);
        return;
      }
    }

    setIsDownloading(true);
    const targetFormat = format || downloadFormat;
    
    try {
      await qrPreviewRef.current.download(targetFormat, { hideBackground });
      
      if (!isPro) {
        await recordDownload('qr_demo');
      }
      
      toast(`QR Code downloaded as ${targetFormat.toUpperCase()}`, 'success');
      setShowDownloadOptions(false);
    } catch (error) {
      toast('Failed to download QR Code', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const matrixStyles = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded', 'liquid'];
  const premiumMatrixStyles = ['classy', 'classy-rounded', 'liquid'];
  const eyeFrameStyles = ['square', 'rounded', 'extra-rounded', 'classy', 'leaf', 'shield'];
  const premiumEyeFrameStyles = ['classy', 'leaf', 'shield'];
  const eyeInnerStyles = ['square', 'dot', 'rounded', 'extra-rounded', 'diamond', 'star'];
  const premiumEyeInnerStyles = ['diamond', 'star'];

  const categories = [
    { id: 'static', label: 'Static QR', icon: ShieldCheck, info: 'Data is encoded directly. Pattern grows with content.' },
    { id: 'dynamic', label: 'Dynamic QR', icon: Zap, info: 'Short URL redirect. Pattern stays simple and scan-friendly.' }
  ];

  const types = {
    static: QR_TYPES.filter(t => t.category.includes('static')),
    dynamic: QR_TYPES.filter(t => t.category.includes('dynamic'))
  };

  const renderDesignSettings = () => (
    <div className="space-y-6">
      {/* Matrix Style Selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Matrix Style</label>
          <span className="text-[8px] text-muted-foreground/40 font-medium">Pattern dots</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {matrixStyles.map((s) => {
            const isPremium = premiumMatrixStyles.includes(s);
            const isLocked = isPremium && !isPro;
            
            return (
              <button
                key={s}
                onClick={() => {
                  if (isLocked) {
                    setShowPricing(true);
                    return;
                  }
                  setDesign({ ...design, matrixStyle: s });
                }}
                className={cn(
                  "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all relative group",
                  design.matrixStyle === s ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-muted-foreground/20"
                )}
              >
                <div className={cn("w-4 h-4 bg-foreground", 
                  s === 'dots' ? 'rounded-full' : 
                  s === 'rounded' ? 'rounded-sm' : 
                  s === 'extra-rounded' ? 'rounded-md' : 
                  s === 'classy' ? 'rounded-tr-lg rounded-bl-lg' :
                  s === 'classy-rounded' ? 'rounded-tr-xl rounded-bl-xl' : ''
                )} />
                {isLocked && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-sm">
                    <Crown className="w-1.5 h-1.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eye Styles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Eye Frame</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {eyeFrameStyles.map((s) => {
              const isPremium = premiumEyeFrameStyles.includes(s);
              const isLocked = isPremium && !isPro;
              
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (isLocked) {
                      setShowPricing(true);
                      return;
                    }
                    setDesign({ ...design, eyeFrameStyle: s });
                  }}
                  className={cn(
                    "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 relative",
                    design.eyeFrameStyle === s ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <div className={cn("w-3 h-3 border-2 border-foreground", 
                    s === 'rounded' ? 'rounded-sm' : 
                    s === 'extra-rounded' ? 'rounded-md' : 
                    s === 'classy' ? 'rounded-tr-lg rounded-bl-lg' : ''
                  )} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-sm">
                      <Crown className="w-1.5 h-1.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Eye Inner</label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {eyeInnerStyles.map((s) => {
              const isPremium = premiumEyeInnerStyles.includes(s);
              const isLocked = isPremium && !isPro;
              
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (isLocked) {
                      setShowPricing(true);
                      return;
                    }
                    setDesign({ ...design, eyeInnerStyle: s });
                  }}
                  className={cn(
                    "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 relative",
                    design.eyeInnerStyle === s ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <div className={cn("w-2 h-2 bg-foreground", 
                    s === 'dot' ? 'rounded-full' : 
                    s === 'rounded' ? 'rounded-sm' : 
                    s === 'extra-rounded' ? 'rounded-md' : ''
                  )} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-sm">
                      <Crown className="w-1.5 h-1.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Colors & Gradients */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <NativeColorPicker
            label="Foreground"
            value={design.fgColor}
            onChange={(val) => setDesign({ ...design, fgColor: val })}
          />
          <NativeColorPicker
            label="Background"
            value={design.bgColor}
            onChange={(val) => setDesign({ ...design, bgColor: val })}
          />
          <NativeColorPicker
            label="Eye Frame"
            value={design.eyeFrameColor}
            onChange={(val) => setDesign({ ...design, eyeFrameColor: val })}
          />
          <NativeColorPicker
            label="Eye Inner"
            value={design.eyeInnerColor}
            onChange={(val) => setDesign({ ...design, eyeInnerColor: val })}
          />
        </div>

        {/* Gradient Controls */}
        <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-700" />
              <span className="text-[10px] font-black uppercase tracking-widest">Foreground Gradient</span>
            </div>
            <button 
              onClick={() => {
                if (!isPro) {
                  setShowPricing(true);
                  return;
                }
                setDesign({ 
                  ...design, 
                  fgGradient: design.fgGradient ? null : { type: 'linear', rotation: 0, colorStops: [design.fgColor, '#ff6b00'] } 
                });
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                design.fgGradient ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {design.fgGradient ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {design.fgGradient && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <NativeColorPicker
                  label="Start Color"
                  value={design.fgGradient.colorStops[0]}
                  onChange={(val) => {
                    const newStops = [...design.fgGradient.colorStops];
                    newStops[0] = val;
                    setDesign({ ...design, fgGradient: { ...design.fgGradient, colorStops: newStops } });
                  }}
                />
                <NativeColorPicker
                  label="End Color"
                  value={design.fgGradient.colorStops[1]}
                  onChange={(val) => {
                    const newStops = [...design.fgGradient.colorStops];
                    newStops[1] = val;
                    setDesign({ ...design, fgGradient: { ...design.fgGradient, colorStops: newStops } });
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Rotation ({design.fgGradient.rotation}°)</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={design.fgGradient.rotation}
                  onChange={(e) => setDesign({ ...design, fgGradient: { ...design.fgGradient, rotation: parseInt(e.target.value) } })}
                  className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Background Gradient Controls */}
        <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-700" />
              <span className="text-[10px] font-black uppercase tracking-widest">Background Gradient</span>
            </div>
            <button 
              onClick={() => {
                if (!isPro) {
                  setShowPricing(true);
                  return;
                }
                setDesign({ 
                  ...design, 
                  bgGradient: design.bgGradient ? null : { type: 'linear', rotation: 0, colorStops: [design.bgColor, '#f0f0f0'] } 
                });
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all",
                design.bgGradient ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {design.bgGradient ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {design.bgGradient && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <NativeColorPicker
                  label="Start Color"
                  value={design.bgGradient.colorStops[0]}
                  onChange={(val) => {
                    const newStops = [...design.bgGradient.colorStops];
                    newStops[0] = val;
                    setDesign({ ...design, bgGradient: { ...design.bgGradient, colorStops: newStops } });
                  }}
                />
                <NativeColorPicker
                  label="End Color"
                  value={design.bgGradient.colorStops[1]}
                  onChange={(val) => {
                    const newStops = [...design.bgGradient.colorStops];
                    newStops[1] = val;
                    setDesign({ ...design, bgGradient: { ...design.bgGradient, colorStops: newStops } });
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Rotation ({design.bgGradient.rotation}°)</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={design.bgGradient.rotation}
                  onChange={(e) => setDesign({ ...design, bgGradient: { ...design.bgGradient, rotation: parseInt(e.target.value) } })}
                  className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Margin ({design.margin}px)</label>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={design.margin}
            onChange={(e) => setDesign({ ...design, margin: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Error Correction</label>
          </div>
          <div className="flex gap-1 bg-secondary p-0.5 rounded-lg">
            {['L', 'M', 'Q', 'H'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDesign({ ...design, errorCorrectionLevel: lvl })}
                className={cn(
                  "flex-1 py-1 rounded-md text-[9px] font-black transition-all",
                  design.errorCorrectionLevel === lvl ? "bg-card text-brand-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logo Upload Section */}
      <div className="space-y-4 pt-4 relative">
        {!isPro && (
          <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-[2px] rounded-[2rem] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-primary/20">
            <Crown className="w-8 h-8 text-brand-700 mb-2" />
            <p className="text-sm font-black uppercase tracking-tight">Pro Feature</p>
            <p className="text-[10px] text-muted-foreground font-medium mb-4">Logo branding is only available for Pro users.</p>
            <button 
              onClick={() => setShowPricing(true)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              Upgrade Now
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Upload className="w-3 h-3" />
            Logo Branding
          </h3>
          <button 
            onClick={() => setShowSvgPaste(!showSvgPaste)}
            className="text-[10px] font-bold text-brand-700 uppercase hover:underline"
          >
            {showSvgPaste ? 'Upload File' : 'Paste SVG Code'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showSvgPaste ? (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <textarea
                value={svgCode}
                onChange={(e) => setSvgCode(e.target.value)}
                placeholder="<svg ...> paste your code here </svg>"
                className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all min-h-[100px] bg-background text-xs font-mono"
              />
              <button 
                onClick={handleSvgPaste}
                className="w-full py-3 bg-foreground text-background rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-foreground/90 transition-all active:scale-95"
              >
                Apply SVG Code
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-4 items-center"
            >
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLogoUploading}
                className={cn(
                  "flex-1 py-4 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center gap-1.5 bg-secondary/50 group active:scale-95",
                  isLogoUploading ? "border-primary/20 cursor-not-allowed" : "border-border text-muted-foreground hover:border-primary hover:text-brand-700"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-card shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isLogoUploading ? (
                    <Loader2 className="w-4 h-4 text-brand-700 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-muted-foreground group-hover:text-brand-700" />
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {isLogoUploading ? 'Uploading...' : 'Drop or Click'}
                </span>
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {design.logoUrl && (
                <div className="relative w-14 h-14 bg-card border border-border rounded-xl p-2 shadow-sm group">
                  <img src={design.logoUrl} className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setDesign({ ...design, logoUrl: '' })}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-lg hover:scale-110 transition-transform"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {design.logoUrl && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Logo Size ({Math.round(design.logoSize * 100)}%)</label>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="0.6" 
                step="0.01"
                value={design.logoSize}
                onChange={(e) => setDesign({ ...design, logoSize: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Logo Margin ({design.logoMargin}px)</label>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                value={design.logoMargin}
                onChange={(e) => setDesign({ ...design, logoMargin: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 space-y-3 p-3 bg-secondary/50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-card shadow-sm flex items-center justify-center">
                    <ShieldCheck className={cn("w-3.5 h-3.5", design.logoBackground ? "text-green-500" : "text-muted-foreground/30")} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-foreground uppercase">Clear Background</p>
                    <p className="text-[8px] text-muted-foreground font-medium">Hides QR dots behind logo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDesign({ ...design, logoBackground: !design.logoBackground })}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    design.logoBackground ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                    design.logoBackground ? "left-5.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {design.logoBackground && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4 border-t border-border space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Background Shape</label>
                    <div className="flex gap-1 bg-card p-1 rounded-xl shadow-sm">
                      <button 
                        onClick={() => setDesign({ ...design, logoBackgroundShape: 'square' })}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                          design.logoBackgroundShape === 'square' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Sharp
                      </button>
                      <button 
                        onClick={() => setDesign({ ...design, logoBackgroundShape: 'rounded' })}
                        className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                          design.logoBackgroundShape === 'rounded' ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Rounded
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <NativeColorPicker
                      label="Background Color"
                      value={design.logoBackgroundColor || '#ffffff'}
                      onChange={(val) => setDesign({ ...design, logoBackgroundColor: val })}
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-1 min-w-[80px] ml-4">
                        <label className="text-[8px] font-bold text-muted-foreground uppercase">Opacity {Math.round((design.logoBackgroundOpacity ?? 1) * 100)}%</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1"
                          value={design.logoBackgroundOpacity ?? 1}
                          onChange={(e) => setDesign({ ...design, logoBackgroundOpacity: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* AI Suggestion */}
        <section className="pt-6 border-t border-border">
          <div className="bg-primary rounded-2xl p-6 text-primary-foreground relative overflow-hidden shadow-xl shadow-primary/20">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-base font-bold uppercase tracking-wider">AI Design Assistant</h3>
              </div>
              <p className="text-primary-foreground/80 text-xs font-medium">Describe your brand vibe and let AI forge the perfect design.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Minimalist tech brand with deep blue accents"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-4 focus:ring-white/10 transition-all text-xs"
                />
                <button 
                  onClick={handleAISuggest}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-white text-brand-700 rounded-xl font-bold uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-all active:scale-95 shadow-lg text-[9px]"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Forge'}
                </button>
              </div>

              {/* AI Suggestions Cards */}
              <AnimatePresence>
                {aiSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"
                  >
                    {aiSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => applySuggestion(suggestion, idx)}
                        className={cn(
                          "p-4 rounded-2xl border-2 text-left transition-all relative group",
                          selectedSuggestionIndex === idx 
                            ? "bg-white border-white text-brand-700" 
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Option {idx + 1}</span>
                          {selectedSuggestionIndex === idx && <Check className="w-3 h-3 text-brand-700" />}
                        </div>
                        <p className="text-[10px] font-medium leading-tight line-clamp-2">{suggestion.reason}</p>
                        <div className="flex gap-1 mt-3">
                          <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: suggestion.fgColor }} />
                          <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: suggestion.bgColor }} />
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl" />
          </div>
        </section>
      </div>
    );

  if (!isOpen) return null;

  if (isSuccess) {
    const link = `${window.location.origin}/view/${savedShortId}`;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-xl"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md bg-card border border-border rounded-[3rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-brand-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Success!</h2>
              <p className="text-muted-foreground font-medium">Your QR code has been forged.</p>
            </div>

            <div className="p-6 bg-secondary/30 rounded-3xl border border-border space-y-4">
              <div className="flex justify-center">
                <QRPreview 
                  value={category === 'dynamic' ? link : content} 
                  design={design} 
                  size={180} 
                />
              </div>
              {category === 'dynamic' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Dynamic Link</p>
                  <div className="flex items-center gap-2 p-3 bg-card rounded-2xl border border-border">
                    <LinkIcon className="w-4 h-4 text-brand-700 shrink-0" />
                    <p className="text-xs font-mono truncate flex-1 text-left">{link}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(link);
                        toast('Link copied!', 'success');
                      }}
                      className="p-2 hover:bg-secondary rounded-xl transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleDownload()}
                className="py-4 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
              >
                Download
              </button>
              <button 
                onClick={onClose}
                className="py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 md:p-4 bg-black/60 backdrop-blur-sm overflow-hidden tap-highlight-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card rounded-none sm:rounded-2xl md:rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full md:h-[92vh] border-none md:border border-border relative"
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-2 py-1.5 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-1.5 -ml-1 hover:bg-secondary rounded-full transition-all active:scale-90"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <h2 className="text-xs font-black uppercase tracking-widest">Forge Studio</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                className="p-2 bg-primary text-primary-foreground rounded-xl active:scale-95 transition-all border border-primary/20 shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showDownloadOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl p-3 z-[100]"
                  >
                    <div className="space-y-2 mb-3">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Export Format</p>
                      <div className="flex gap-1 p-1 bg-secondary rounded-xl">
                        <button 
                          onClick={() => setDownloadFormat('png')}
                          className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all", downloadFormat === 'png' ? "bg-card shadow-sm text-brand-700" : "opacity-50")}
                        >
                          PNG
                        </button>
                        <button 
                          onClick={() => setDownloadFormat('svg')}
                          className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all", downloadFormat === 'svg' ? "bg-card shadow-sm text-brand-700" : "opacity-50")}
                        >
                          SVG
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setHideBackground(!hideBackground)}
                      className="w-full flex items-center justify-between px-2 py-2 hover:bg-secondary rounded-xl transition-all mb-3"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">Transparent</span>
                      <div className={cn("w-8 h-4 rounded-full relative transition-all", hideBackground ? "bg-primary" : "bg-muted-foreground/30")}>
                        <div className={cn("absolute top-1 w-2 h-2 bg-white rounded-full transition-all", hideBackground ? "left-5" : "left-1")} />
                      </div>
                    </button>

                    <button 
                      onClick={() => handleDownload()}
                      disabled={isDownloading}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving || !name || !content}
              className="px-4 py-2 bg-foreground text-background rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50 shadow-xl"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>

        {/* Left Panel: Configuration (Scrollable) */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar bg-card transition-all duration-500 ios-momentum-scroll",
          "md:block",
          showMobileSettings ? "hidden md:block" : "block"
        )}>
          <div className="p-3 md:p-4 space-y-4 pb-32 md:pb-6">
            <header className="hidden md:flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">Forge QR</h2>
                <p className="text-muted-foreground text-[9px] font-medium">Design your next branded experience</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    setDesign(DEFAULT_DESIGN);
                    toast('Design reset to default', 'success');
                  }}
                  className="p-1.5 text-muted-foreground hover:text-brand-700 transition-colors"
                  title="Reset Design"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-all active:scale-90">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </header>

            {/* Mobile Preview Area (The "Canva") */}
            <div className="md:hidden space-y-4">
              <div className="bg-secondary/30 rounded-[1.5rem] p-4 flex flex-col items-center justify-center relative group border border-border/50 min-h-[200px]">
                <motion.div 
                  className="bg-card p-3 rounded-[1rem] shadow-xl relative origin-center border border-border flex items-center justify-center"
                >
                  <QRPreview 
                    ref={qrPreviewRef}
                    value={previewValue} 
                    design={design} 
                    size={140} 
                    className="mx-auto" 
                  />
                </motion.div>
                
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <section className="space-y-1.5">
                <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">QR Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Summer Sale 2024"
                  className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-background font-bold text-xs"
                />
              </section>

              <section className="space-y-1.5">
                <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Organization</label>
                <Select 
                  value={selectedOrgId || 'personal'}
                  onValueChange={(val) => setSelectedOrgId(val === 'personal' ? '' : val)}
                >
                  <SelectTrigger className="w-full h-10 bg-background border-border text-xs font-bold rounded-xl">
                    <SelectValue placeholder="Personal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    {userOrgs.map(org => (
                      <SelectItem key={org.id} value={org.id || 'unknown'}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <section className="space-y-1.5">
                <NativeSelect
                  label="Assign to Folder"
                  value={folderId || ''}
                  onChange={(val) => setFolderId(val || null)}
                  options={[
                    { id: '', name: 'Uncategorized', icon: <LayoutGrid className="w-3 h-3" /> },
                    ...folders.map(f => ({ 
                      id: f.id, 
                      name: f.name, 
                      icon: <FolderIcon className="w-3 h-3" style={{ color: f.color }} /> 
                    }))
                  ]}
                />
              </section>
            </div>

            {/* Category Selection */}
            <section className="space-y-3">
              <div className="flex gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (cat.id === 'dynamic' && !canUseDynamic) {
                        setShowPricing(true);
                        return;
                      }
                      setCategory(cat.id as QRCategory);
                      setQrType(types[cat.id as QRCategory][0].id as QRType);
                    }}
                    className={cn(
                      "flex-1 p-3 rounded-2xl border-2 transition-all flex flex-col gap-1.5 items-start text-left relative overflow-hidden group",
                      category === cat.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/20",
                      cat.id === 'dynamic' && !canUseDynamic && "opacity-70"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <cat.icon className={cn("w-5 h-5", category === cat.id ? "text-brand-700" : "text-muted-foreground")} />
                      {cat.id === 'dynamic' && !canUseDynamic && <Crown className="w-3 h-3 text-brand-700" />}
                    </div>
                    <div>
                      <span className={cn("text-xs font-bold uppercase tracking-wider", category === cat.id ? "text-brand-700" : "text-muted-foreground")}>
                        {cat.label}
                      </span>
                      <p className="text-[9px] text-muted-foreground font-medium leading-tight mt-0.5">{cat.info}</p>
                    </div>
                    {category === cat.id && (
                      <motion.div layoutId="cat-active" className="absolute top-1.5 right-1.5">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              {category === 'dynamic' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex gap-2 items-start"
                >
                  <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-brand-700 font-bold leading-tight">
                    <span className="uppercase">Pro Tip:</span> Dynamic QRs use a short redirect link. This keeps the QR pattern simple and high-quality.
                  </p>
                </motion.div>
              )}
            </section>

            {/* Type Selection Grid */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                <LayoutGrid className="w-3 h-3" />
                Select Content Type
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {types[category]?.map((t) => {
                  const isLocked = (t.id === 'flow' && !canUseFlow) || 
                                   (t.id === 'menu' && !canUseMenu) || 
                                   (t.id === 'bank' && !canUseBank) ||
                                   (t.id === 'file' && !canUseDynamic) || // File is dynamic only
                                   (t.isPro && !isPro);

                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (isLocked) {
                          setShowPricing(true);
                          return;
                        }
                        setQrType(t.id as QRType);
                      }}
                      className={cn(
                        "p-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 group relative",
                        qrType === t.id 
                          ? "border-brand-200 bg-brand-50 text-brand-600 shadow-sm" 
                          : "border-border text-muted-foreground hover:bg-secondary",
                        isLocked && "opacity-70"
                      )}
                    >
                      <t.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", qrType === t.id ? "text-brand-500" : "text-gray-300")} />
                      <span className="text-[9px] font-bold uppercase tracking-wide">{t.label}</span>
                      {isLocked && (
                        <div className="absolute top-1 right-1">
                          <Crown className="w-2 h-2 text-brand-700" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Dynamic Input Fields */}
            <section className="bg-secondary/50 p-4 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-card shadow-sm flex items-center justify-center">
                    {types[category]?.find(t => t.id === qrType)?.icon && React.createElement(types[category].find(t => t.id === qrType)!.icon, { className: "w-3 h-3 text-brand-500" })}
                  </div>
                  <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">{qrType} Content</h3>
                </div>
                
                <button 
                  onClick={handleSuggestContent}
                  disabled={isSuggestingContent}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                >
                  {isSuggestingContent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Suggest
                </button>
              </div>

              {/* AI Content Suggestions Cards */}
              <AnimatePresence>
                {contentSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 gap-2 pb-4"
                  >
                    {contentSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyContentSuggestion(suggestion)}
                        className="p-3 rounded-xl border border-brand-200 bg-brand-50/50 text-left hover:bg-brand-100/50 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{suggestion.title}</span>
                          <Plus className="w-3 h-3 text-brand-400 group-hover:text-brand-600 transition-colors" />
                        </div>
                        <p className="text-[10px] text-gray-600 font-medium line-clamp-1 mb-1">"{suggestion.content}"</p>
                        <p className="text-[8px] text-muted-foreground font-medium leading-tight">{suggestion.description}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="grid grid-cols-1 gap-4">
                {qrType === 'text' && (
                  <textarea
                    value={fields.text}
                    onChange={(e) => setFields({ ...fields, text: e.target.value })}
                    placeholder="Enter your text here..."
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all min-h-[80px] bg-card text-xs"
                  />
                )}
                {qrType === 'wifi' && (
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      value={fields.ssid}
                      onChange={(e) => setFields({ ...fields, ssid: e.target.value })}
                      placeholder="Network Name (SSID)"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                    />
                    <input
                      type="password"
                      value={fields.password}
                      onChange={(e) => setFields({ ...fields, password: e.target.value })}
                      placeholder="Password"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                    />
                    <NativeSelect
                      label="Encryption"
                      value={fields.encryption || 'WPA'}
                      onChange={(val) => setFields({ ...fields, encryption: val })}
                      options={[
                        { id: 'WPA', name: 'WPA/WPA2', icon: <ShieldCheck className="w-3 h-3" /> },
                        { id: 'WEP', name: 'WEP', icon: <ShieldCheck className="w-3 h-3" /> },
                        { id: 'nopass', name: 'None', icon: <ShieldCheck className="w-3 h-3" /> },
                      ]}
                    />
                  </div>
                )}
                {qrType === 'file' && (
                  <div className="space-y-4">
                    <div 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx,.jpg,.png';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file && user) {
                            try {
                              setIsSaving(true);
                              const url = await uploadImage(file, `files/${user.uid}/${Date.now()}_${file.name}`);
                              setFields({ 
                                ...fields, 
                                fileUrl: url,
                                fileName: file.name,
                                fileSize: file.size
                              });
                              toast('File uploaded successfully!', 'success');
                            } catch (err) {
                              toast('Failed to upload file', 'error');
                            } finally {
                              setIsSaving(false);
                            }
                          }
                        };
                        input.click();
                      }}
                      className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-secondary/10 hover:bg-secondary/20 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 bg-card rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isSaving ? (
                          <Loader2 className="w-8 h-8 text-brand-700 animate-spin" />
                        ) : (
                          <FileText className="w-8 h-8 text-muted-foreground group-hover:text-brand-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-foreground">
                          {fields.fileName ? 'Change Document' : 'Upload Document'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {fields.fileName ? `${fields.fileName} (${(fields.fileSize / 1024 / 1024).toFixed(2)}MB)` : 'PDF, JPG, PNG or DOC (Max 5MB)'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Or Paste File URL</label>
                      <input
                        type="url"
                        value={fields.fileUrl}
                        onChange={(e) => setFields({ ...fields, fileUrl: e.target.value })}
                        placeholder="https://example.com/document.pdf"
                        className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                      />
                    </div>
                  </div>
                )}
                {(qrType === 'phone' || qrType === 'whatsapp') && (
                  <input
                    type="tel"
                    value={fields.phone}
                    onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                  />
                )}
                {(qrType === 'instagram' || qrType === 'twitter' || qrType === 'linkedin') && (
                  <input
                    type="text"
                    value={fields.text}
                    onChange={(e) => setFields({ ...fields, text: e.target.value })}
                    placeholder={qrType === 'linkedin' ? "Profile ID" : "@username"}
                    className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                  />
                )}
                {qrType === 'sms' && (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      value={fields.phone}
                      onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                      placeholder="Phone Number"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                    />
                    <textarea
                      value={fields.message}
                      onChange={(e) => setFields({ ...fields, message: e.target.value })}
                      placeholder="Message"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs min-h-[60px]"
                    />
                  </div>
                )}
                {qrType === 'email' && (
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="email"
                      value={fields.email}
                      onChange={(e) => setFields({ ...fields, email: e.target.value })}
                      placeholder="Recipient Email"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                    />
                    <input
                      type="text"
                      value={fields.subject}
                      onChange={(e) => setFields({ ...fields, subject: e.target.value })}
                      placeholder="Subject"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                    />
                    <textarea
                      value={fields.body}
                      onChange={(e) => setFields({ ...fields, body: e.target.value })}
                      placeholder="Email Body"
                      className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs min-h-[60px]"
                    />
                  </div>
                )}
                {qrType === 'vcard' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">First Name</label>
                      <input
                        type="text"
                        value={fields.firstName}
                        onChange={(e) => setFields({ ...fields, firstName: e.target.value })}
                        placeholder="First Name"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Last Name</label>
                      <input
                        type="text"
                        value={fields.lastName}
                        onChange={(e) => setFields({ ...fields, lastName: e.target.value })}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Phone Number</label>
                      <input
                        type="tel"
                        value={fields.phone}
                        onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                        placeholder="Phone"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Email Address</label>
                      <input
                        type="email"
                        value={fields.email}
                        onChange={(e) => setFields({ ...fields, email: e.target.value })}
                        placeholder="Email"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Organization</label>
                      <input
                        type="text"
                        value={fields.org}
                        onChange={(e) => setFields({ ...fields, org: e.target.value })}
                        placeholder="Organization"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Job Title</label>
                      <input
                        type="text"
                        value={fields.jobTitle || fields.title}
                        onChange={(e) => setFields({ ...fields, jobTitle: e.target.value })}
                        placeholder="Job Title"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Website</label>
                      <input
                        type="url"
                        value={fields.website}
                        onChange={(e) => setFields({ ...fields, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Address</label>
                      <textarea
                        value={fields.address}
                        onChange={(e) => setFields({ ...fields, address: e.target.value })}
                        placeholder="Full Address"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold min-h-[60px]"
                      />
                    </div>
                  </div>
                )}
                {qrType === 'event' && (
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      value={fields.eventTitle}
                      onChange={(e) => setFields({ ...fields, eventTitle: e.target.value })}
                      placeholder="Event Title"
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={fields.location}
                      onChange={(e) => setFields({ ...fields, location: e.target.value })}
                      placeholder="Location"
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold"
                    />
                    <textarea
                      value={fields.description}
                      onChange={(e) => setFields({ ...fields, description: e.target.value })}
                      placeholder="Description"
                      className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs font-bold min-h-[60px]"
                    />
                  </div>
                )}
                {qrType === 'social' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center relative overflow-hidden group">
                          {fields.profileImage ? (
                            <img src={fields.profileImage} className="w-full h-full object-cover" alt="Profile" />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && user) {
                                try {
                                  const url = await uploadImage(file, `profiles/${user.uid}/${Date.now()}_${file.name}`);
                                  setFields({ ...fields, profileImage: url });
                                  toast('Profile image uploaded!', 'success');
                                } catch (err) {
                                  toast('Failed to upload image', 'error');
                                }
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={fields.profileName}
                            onChange={(e) => setFields({ ...fields, profileName: e.target.value })}
                            placeholder="Profile Name"
                            className="w-full px-3 py-2 rounded-lg border border-border text-xs font-bold outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            value={fields.profileBio}
                            onChange={(e) => setFields({ ...fields, profileBio: e.target.value })}
                            placeholder="Short Bio"
                            className="w-full px-3 py-2 rounded-lg border border-border text-[10px] outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Template Selector */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Landing Page Template</p>
                      <div className="grid grid-cols-3 gap-2">
                        {SOCIAL_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setFields({ ...fields, templateId: t.id })}
                            className={cn(
                              "p-2 rounded-xl border-2 transition-all text-left space-y-1",
                              fields.templateId === t.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/20"
                            )}
                          >
                            <div className={cn("w-full h-8 rounded-md mb-1", t.bgClass)} />
                            <p className="text-[8px] font-black uppercase truncate">{t.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Social Links</p>
                          <button 
                            onClick={() => setFields({ ...fields, socialLinks: [...(Array.isArray(fields.socialLinks) ? fields.socialLinks : []), { id: nanoid(4), platform: 'instagram', url: '', label: '' }] })}
                            className="flex items-center gap-1 text-[10px] font-bold text-brand-700 uppercase hover:underline"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Add Link
                          </button>
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, 'socialLinks')}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext
                            items={fields.socialLinks?.map((l: any) => l.id) || []}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {fields.socialLinks?.map((link: any, idx: number) => (
                                <SortableItem key={link.id} id={link.id} handle>
                                  <div className="flex gap-2 items-start group">
                                    <SortableHandle className="mt-4 text-muted-foreground/30 group-hover:text-brand-700/50 transition-colors cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-4 h-4" />
                                    </SortableHandle>
                                    <div className="flex-1 grid grid-cols-2 gap-2 p-3 bg-secondary/30 rounded-xl border border-border">
                                      <NativeSelect
                                        label="Platform"
                                        value={link.platform}
                                        onChange={(val) => {
                                          const newLinks = [...fields.socialLinks];
                                          newLinks[idx].platform = val;
                                          setFields({ ...fields, socialLinks: newLinks });
                                        }}
                                        options={[
                                          { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-3 h-3" /> },
                                          { id: 'twitter', name: 'Twitter', icon: <Twitter className="w-3 h-3" /> },
                                          { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-3 h-3" /> },
                                          { id: 'facebook', name: 'Facebook', icon: <Facebook className="w-3 h-3" /> },
                                          { id: 'github', name: 'GitHub', icon: <Github className="w-3 h-3" /> },
                                          { id: 'website', name: 'Website', icon: <Globe className="w-3 h-3" /> },
                                        ]}
                                      />
                                      <input
                                        type="text"
                                        value={link.label}
                                        onChange={(e) => {
                                          const newLinks = [...fields.socialLinks];
                                          newLinks[idx].label = e.target.value;
                                          setFields({ ...fields, socialLinks: newLinks });
                                        }}
                                        placeholder="Label (e.g. My Portfolio)"
                                        className="px-3 py-2 rounded-lg border border-border text-[10px] outline-none focus:border-primary"
                                      />
                                      <input
                                        type="url"
                                        value={link.url}
                                        onChange={(e) => {
                                          const newLinks = [...fields.socialLinks];
                                          newLinks[idx].url = e.target.value;
                                          setFields({ ...fields, socialLinks: newLinks });
                                        }}
                                        placeholder="URL"
                                        className="col-span-2 px-3 py-2 rounded-lg border border-border text-[10px] outline-none focus:border-primary"
                                      />
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const newLinks = fields.socialLinks.filter((_: any, i: number) => i !== idx);
                                        setFields({ ...fields, socialLinks: newLinks });
                                      }}
                                      className="mt-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </SortableItem>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                  </div>
                )}

                {qrType === 'file' && (
                  <div className="space-y-4">
                    <div 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx,.jpg,.png';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file && user) {
                            try {
                              setIsSaving(true);
                              const url = await uploadImage(file, `files/${user.uid}/${Date.now()}_${file.name}`);
                              setFields({ 
                                ...fields, 
                                fileUrl: url,
                                fileName: file.name,
                                fileSize: file.size
                              });
                              toast('File uploaded successfully!', 'success');
                            } catch (err) {
                              toast('Failed to upload file', 'error');
                            } finally {
                              setIsSaving(false);
                            }
                          }
                        };
                        input.click();
                      }}
                      className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-secondary/10 hover:bg-secondary/20 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 bg-card rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isSaving ? (
                          <Loader2 className="w-8 h-8 text-brand-700 animate-spin" />
                        ) : (
                          <FileText className="w-8 h-8 text-muted-foreground group-hover:text-brand-700" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-foreground">
                          {fields.fileName ? 'Change Document' : 'Upload Document'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {fields.fileName ? `${fields.fileName} (${(fields.fileSize / 1024 / 1024).toFixed(2)}MB)` : 'PDF, JPG, PNG or DOC (Max 5MB)'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Or Paste File URL</label>
                      <input
                        type="url"
                        value={fields.fileUrl}
                        onChange={(e) => setFields({ ...fields, fileUrl: e.target.value })}
                        placeholder="https://example.com/document.pdf"
                        className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card text-xs"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'crypto' && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <NativeSelect
                        className="sm:w-32"
                        label="Currency"
                        value={fields.currency}
                        onChange={(val) => setFields({ ...fields, currency: val })}
                        options={[
                          { id: 'BTC', name: 'BTC', icon: <Coins className="w-3 h-3" /> },
                          { id: 'ETH', name: 'ETH', icon: <Coins className="w-3 h-3" /> },
                          { id: 'LTC', name: 'LTC', icon: <Coins className="w-3 h-3" /> },
                          { id: 'DOGE', name: 'DOGE', icon: <Coins className="w-3 h-3" /> },
                        ]}
                      />
                      <div className="flex-1 space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Wallet Address</label>
                        <input
                          type="text"
                          value={fields.address}
                          onChange={(e) => setFields({ ...fields, address: e.target.value })}
                          placeholder="Wallet Address"
                          className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground px-1">Amount (Optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={fields.amount}
                        onChange={(e) => setFields({ ...fields, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'bank' && (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <NativeSelect
                        label="Country"
                        value={fields.bankCountry}
                        onChange={(val) => setFields({ ...fields, bankCountry: val })}
                        options={COUNTRIES.map(c => ({ id: c.code, name: c.name, icon: <Globe className="w-4 h-4" /> }))}
                      />
                      <NativeSelect
                        label="Standard"
                        value={fields.bankStandard}
                        onChange={(val) => setFields({ ...fields, bankStandard: val })}
                        options={BANK_STANDARDS.map(s => ({ id: s.id, name: s.name, icon: <Landmark className="w-4 h-4" /> }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Recipient Name</label>
                      <input
                        type="text"
                        value={fields.bankName}
                        onChange={(e) => setFields({ ...fields, bankName: e.target.value })}
                        placeholder="Recipient Name"
                        className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                      />
                    </div>

                    {fields.bankStandard === 'sepa' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={fields.bankIban}
                          onChange={(e) => setFields({ ...fields, bankIban: e.target.value })}
                          placeholder="IBAN"
                          className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                        />
                        <input
                          type="text"
                          value={fields.bankBic}
                          onChange={(e) => setFields({ ...fields, bankBic: e.target.value })}
                          placeholder="BIC"
                          className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                        />
                      </div>
                    )}

                    {fields.bankStandard === 'upi' && (
                      <input
                        type="text"
                        value={fields.bankUpiId}
                        onChange={(e) => setFields({ ...fields, bankUpiId: e.target.value })}
                        placeholder="UPI ID (e.g. name@bank)"
                        className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                      />
                    )}

                    {fields.bankStandard === 'pix' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Pix Key</label>
                          <input
                            type="text"
                            value={fields.bankPixKey}
                            onChange={(e) => setFields({ ...fields, bankPixKey: e.target.value })}
                            placeholder="Email, Phone, CPF, or Random"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">City</label>
                          <input
                            type="text"
                            value={fields.bankCity}
                            onChange={(e) => setFields({ ...fields, bankCity: e.target.value })}
                            placeholder="City (e.g. SAO PAULO)"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {fields.bankStandard === 'paynow' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Proxy Type</label>
                          <NativeSelect
                            label=""
                            value={fields.bankPaynowProxyType}
                            onChange={(val) => setFields({ ...fields, bankPaynowProxyType: val })}
                            options={[
                              { id: '0', name: 'Mobile Number', icon: <Smartphone className="w-4 h-4" /> },
                              { id: '1', name: 'NRIC / FIN', icon: <User className="w-4 h-4" /> },
                              { id: '2', name: 'UEN', icon: <Landmark className="w-4 h-4" /> },
                              { id: '3', name: 'Virtual Payment Address', icon: <Globe className="w-4 h-4" /> },
                            ]}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">PayNow Proxy</label>
                          <input
                            type="text"
                            value={fields.bankPaynowProxy}
                            onChange={(e) => setFields({ ...fields, bankPaynowProxy: e.target.value })}
                            placeholder="Mobile, NRIC, UEN or VPA"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">City</label>
                          <input
                            type="text"
                            value={fields.bankCity}
                            onChange={(e) => setFields({ ...fields, bankCity: e.target.value })}
                            placeholder="City (e.g. SINGAPORE)"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {fields.bankStandard === 'promptpay' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Proxy Type</label>
                          <NativeSelect
                            label=""
                            value={fields.bankPromptpayProxyType}
                            onChange={(val) => setFields({ ...fields, bankPromptpayProxyType: val })}
                            options={[
                              { id: '01', name: 'Mobile Number', icon: <Smartphone className="w-4 h-4" /> },
                              { id: '02', name: 'National ID', icon: <User className="w-4 h-4" /> },
                              { id: '03', name: 'e-Wallet ID', icon: <CreditCard className="w-4 h-4" /> },
                              { id: '04', name: 'Bank Account', icon: <Landmark className="w-4 h-4" /> },
                            ]}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">PromptPay Proxy</label>
                          <input
                            type="text"
                            value={fields.bankPromptpayProxy}
                            onChange={(e) => setFields({ ...fields, bankPromptpayProxy: e.target.value })}
                            placeholder="Mobile, National ID or e-Wallet ID"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">City</label>
                          <input
                            type="text"
                            value={fields.bankCity}
                            onChange={(e) => setFields({ ...fields, bankCity: e.target.value })}
                            placeholder="City (e.g. BANGKOK)"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {fields.bankStandard === 'nqr' && (
                      <div className="grid grid-cols-1 gap-4">
                        <NativeSelect
                          label="Select Nigeria Bank/Fintech"
                          value={fields.bankName}
                          onChange={(val) => setFields({ ...fields, bankName: val })}
                          options={NIGERIA_BANKS.map(b => ({ id: b.name, name: b.name, icon: <Landmark className="w-4 h-4" /> }))}
                        />
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Account Number</label>
                          <input
                            type="text"
                            value={fields.bankAccount}
                            onChange={(e) => setFields({ ...fields, bankAccount: e.target.value })}
                            placeholder="Account Number"
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-bold text-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Raw NQR Payload (Optional)</label>
                          <textarea
                            value={fields.nqrPayload}
                            onChange={(e) => setFields({ ...fields, nqrPayload: e.target.value })}
                            placeholder="Paste raw NQR string from your bank dashboard here..."
                            className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card font-mono text-[10px] min-h-[80px]"
                          />
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-brand-700" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-700">Powerful NQR Mode</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                            This QR will act as a "Smart Bridge". When scanned, it will open a landing page that lets users select their specific bank app (GTBank, Access, Kuda, etc.) or use USSD for instant transfer.
                          </p>
                        </div>
                      </div>
                    )}

                    {fields.bankStandard === 'generic' && (
                      <input
                        type="text"
                        value={fields.bankAccount}
                        onChange={(e) => setFields({ ...fields, bankAccount: e.target.value })}
                        placeholder="Account Number"
                        className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        value={fields.amount}
                        onChange={(e) => setFields({ ...fields, amount: e.target.value })}
                        placeholder="Amount"
                        className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                      />
                      <input
                        type="text"
                        value={fields.bankReference}
                        onChange={(e) => setFields({ ...fields, bankReference: e.target.value })}
                        placeholder="Reference"
                        className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all bg-card"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'menu' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu Items</p>
                      <button 
                        onClick={() => setFields({ ...fields, menuItems: [...(Array.isArray(fields.menuItems) ? fields.menuItems : []), { id: nanoid(4), name: '', price: '', description: '' }] })}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand-700 uppercase hover:underline"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'menuItems')}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={fields.menuItems?.map((m: any) => m.id) || []}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {fields.menuItems?.map((item: any, idx: number) => (
                              <SortableItem key={item.id} id={item.id} handle>
                                <div className="p-4 bg-card rounded-2xl border border-border shadow-sm space-y-3 relative group flex gap-3">
                                  <SortableHandle className="mt-1 text-muted-foreground/30 group-hover:text-brand-700/50 transition-colors cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                  </SortableHandle>
                                  <div className="flex-1 space-y-3">
                                    <button 
                                      onClick={() => {
                                        const newItems = (Array.isArray(fields.menuItems) ? fields.menuItems : []).filter((_: any, i: number) => i !== idx);
                                        setFields({ ...fields, menuItems: newItems });
                                      }}
                                      className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="grid grid-cols-3 gap-3">
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => {
                                          const newItems = [...(Array.isArray(fields.menuItems) ? fields.menuItems : [])];
                                          newItems[idx].name = e.target.value;
                                          setFields({ ...fields, menuItems: newItems });
                                        }}
                                        placeholder="Item Name"
                                        className="col-span-2 px-3 py-2 rounded-lg border border-border text-xs font-bold outline-none focus:border-primary"
                                      />
                                      <input
                                        type="text"
                                        value={item.price}
                                        onChange={(e) => {
                                          const newItems = [...(Array.isArray(fields.menuItems) ? fields.menuItems : [])];
                                          newItems[idx].price = e.target.value;
                                          setFields({ ...fields, menuItems: newItems });
                                        }}
                                        placeholder="Price"
                                        className="px-3 py-2 rounded-lg border border-border text-xs font-bold outline-none focus:border-primary"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => {
                                        const newItems = [...(Array.isArray(fields.menuItems) ? fields.menuItems : [])];
                                        newItems[idx].description = e.target.value;
                                        setFields({ ...fields, menuItems: newItems });
                                      }}
                                      placeholder="Description (Optional)"
                                      className="w-full px-3 py-2 rounded-lg border border-border text-[10px] outline-none focus:border-primary"
                                    />
                                  </div>
                                </div>
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                )}

                {qrType === 'flow' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Flow Steps</p>
                      <button 
                        onClick={() => setFields({ ...fields, flowSteps: [...(Array.isArray(fields.flowSteps) ? fields.flowSteps : []), { id: nanoid(4), type: 'info', title: '', content: '' }] })}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand-700 uppercase hover:underline"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add Step
                      </button>
                    </div>
                    <div className="space-y-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'flowSteps')}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={fields.flowSteps?.map((s: any) => s.id) || []}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {fields.flowSteps?.map((step: any, idx: number) => (
                              <SortableItem key={step.id} id={step.id} handle>
                                <div className="p-4 bg-card rounded-2xl border border-border shadow-sm space-y-3 relative group flex gap-3">
                                  <SortableHandle className="mt-1 text-muted-foreground/30 group-hover:text-brand-700/50 transition-colors cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                  </SortableHandle>
                                  <div className="flex-1 space-y-3">
                                    <button 
                                      onClick={() => {
                                        const newSteps = (Array.isArray(fields.flowSteps) ? fields.flowSteps : []).filter((_: any, i: number) => i !== idx);
                                        setFields({ ...fields, flowSteps: newSteps });
                                      }}
                                      className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex gap-3">
                                      <NativeSelect
                                        className="w-32"
                                        value={step.type}
                                        onChange={(val) => {
                                          const newSteps = [...(Array.isArray(fields.flowSteps) ? fields.flowSteps : [])];
                                          newSteps[idx].type = val as any;
                                          setFields({ ...fields, flowSteps: newSteps });
                                        }}
                                        options={[
                                          { id: 'info', name: 'Info Card', icon: <Info className="w-3.5 h-3.5" /> },
                                          { id: 'menu', name: 'Menu List', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
                                          { id: 'payment', name: 'Payment', icon: <CreditCard className="w-3.5 h-3.5" /> },
                                        ]}
                                      />
                                      <input
                                        type="text"
                                        value={step.title}
                                        onChange={(e) => {
                                          const newSteps = [...(Array.isArray(fields.flowSteps) ? fields.flowSteps : [])];
                                          newSteps[idx].title = e.target.value;
                                          setFields({ ...fields, flowSteps: newSteps });
                                        }}
                                        placeholder="Step Title"
                                        className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-bold outline-none focus:border-primary"
                                      />
                                    </div>
                                    <textarea
                                      value={step.content}
                                      onChange={(e) => {
                                        const newSteps = [...(Array.isArray(fields.flowSteps) ? fields.flowSteps : [])];
                                        newSteps[idx].content = e.target.value;
                                        setFields({ ...fields, flowSteps: newSteps });
                                      }}
                                      placeholder="Content or JSON data"
                                      className="w-full px-3 py-2 rounded-lg border border-border text-[10px] outline-none focus:border-primary min-h-[60px]"
                                    />
                                  </div>
                                </div>
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Design Templates Library */}
            <section className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <LayoutGrid className="w-3 h-3" />
                  Design Templates
                </h3>
                <button 
                  onClick={() => {
                    setDesign(DEFAULT_DESIGN);
                    toast('Reset to default design', 'success');
                  }}
                  className="text-[10px] font-bold text-brand-700 uppercase tracking-widest hover:underline"
                >
                  Reset to Default
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setDesign(DEFAULT_DESIGN);
                    toast('Started from scratch', 'success');
                  }}
                  className="p-4 rounded-[1.5rem] border border-dashed border-border bg-secondary/5 hover:bg-secondary/10 transition-all text-left group"
                >
                  <div className="w-6 h-6 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-2 group-hover:border-primary/50 transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground/50 group-hover:text-brand-700 transition-colors" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-tight group-hover:text-brand-700 transition-colors">Start Fresh</p>
                  <p className="text-[8px] text-muted-foreground mt-1 font-medium">Clean slate</p>
                </button>
                {QR_TEMPLATES.map((template) => {
                  const isLocked = template.isPro && !isPro;
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => {
                        if (isLocked) {
                          setShowPricing(true);
                          return;
                        }
                        // Explicitly clear gradients when applying a template that doesn't have them
                        setDesign({ 
                          ...DEFAULT_DESIGN, 
                          ...template.design 
                        });
                        toast(`Applied ${template.name} template`, 'success');
                      }}
                      className={cn(
                        "p-4 rounded-[1.5rem] border transition-all text-left group relative overflow-hidden",
                        isLocked 
                          ? "border-border bg-secondary/10 opacity-70" 
                          : "border-border bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-2">
                        {isLocked ? (
                          <Crown className="w-3 h-3 text-brand-700" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-tight truncate group-hover:text-brand-700 transition-colors">{template.name}</p>
                      <p className="text-[8px] text-muted-foreground mt-1 line-clamp-1 font-medium">{template.category}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Advanced Options Toggle */}
            <section className="pt-4">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-6 bg-secondary/30 rounded-[2rem] border border-border hover:bg-secondary/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    showAdvanced ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                  )}>
                    <Settings className={cn("w-5 h-5", showAdvanced && "animate-spin-slow")} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase tracking-widest">Advanced Options</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Design, Logo, A/B Testing, Expiry</p>
                  </div>
                </div>
                <div className={cn("transition-transform duration-300", showAdvanced ? "rotate-180" : "")}>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            </section>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-8"
                >
                  {/* Advanced Options: Expiry & Tags */}
                  <section className="bg-secondary/20 p-6 rounded-[2rem] border border-border space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <NativeDatePicker
                          label="Expiration Date"
                          value={expiresAt}
                          onChange={setExpiresAt}
                        />
                        <p className="text-[9px] text-muted-foreground font-medium">QR will become inactive after this date.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          Scan Limit
                        </label>
                        <input 
                          type="number" 
                          value={scanLimit}
                          onChange={(e) => setScanLimit(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="Unlimited"
                          className="w-full px-5 py-3 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-card text-sm font-bold"
                        />
                        <p className="text-[9px] text-muted-foreground font-medium">QR will become inactive after reaching this many scans.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <LayoutGrid className="w-3 h-3" />
                          Project Tags
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tagInput.trim()) {
                                e.preventDefault();
                                if (!tags.includes(tagInput.trim())) {
                                  setTags([...tags, tagInput.trim()]);
                                }
                                setTagInput('');
                              }
                            }}
                            placeholder="Add tag..."
                            className="flex-1 px-5 py-3 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-card text-sm font-bold"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-primary/10 text-brand-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5">
                              {tag}
                              <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-foreground">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Password Protection Section */}
                  <div className="space-y-4 pt-4 border-t border-border relative">
                    {!canUsePassword && (
                      <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-[2px] rounded-[2rem] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-primary/20">
                        <Crown className="w-8 h-8 text-brand-700 mb-2" />
                        <p className="text-sm font-black uppercase tracking-tight">Pro Feature</p>
                        <p className="text-[10px] text-muted-foreground font-medium mb-4">Password Protection is only available for Pro users.</p>
                        <button 
                          onClick={() => setShowPricing(true)}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-brand-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground uppercase">Password Protection</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Secure your QR content with a password</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {password && (
                          <button 
                            onClick={() => setPassword('')}
                            className="text-[10px] font-bold text-destructive uppercase tracking-widest hover:underline"
                          >
                            Clear
                          </button>
                        )}
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={!canUsePassword}
                          placeholder="Set Password"
                          className="w-32 px-3 py-1.5 rounded-xl bg-background border border-border text-[10px] font-bold outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* A/B Testing Section */}
                  <div className="space-y-4 pt-4 border-t border-border relative">
                    {!isPro && (
                      <div className="absolute inset-0 z-10 bg-card/60 backdrop-blur-[2px] rounded-[2rem] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-primary/20">
                        <Crown className="w-8 h-8 text-brand-700 mb-2" />
                        <p className="text-sm font-black uppercase tracking-tight">Pro Feature</p>
                        <p className="text-[10px] text-muted-foreground font-medium mb-4">A/B Testing is only available for Pro users.</p>
                        <button 
                          onClick={() => setShowPricing(true)}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                          Upgrade Now
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Split className="w-4 h-4 text-brand-700" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground uppercase">A/B Testing</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Create a campaign for this QR</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsABTest(!isABTest)}
                        disabled={!isPro}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          isABTest ? "bg-primary" : "bg-muted-foreground/20"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          isABTest ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    {isABTest && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <input 
                          type="text" 
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="Campaign Name (e.g. Summer Sale 2024)"
                          className="w-full px-5 py-4 rounded-2xl border border-border focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-background text-xs font-bold"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Design Customization */}
                  <section className="hidden md:block space-y-8 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Palette className="w-3 h-3" />
                        Appearance
                      </h3>
                      <button 
                        onClick={() => {
                          setDesign(DEFAULT_DESIGN);
                          toast('Design reset to default', 'success');
                        }}
                        className="text-[10px] font-bold text-brand-700 uppercase hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                    {renderDesignSettings()}
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Save Button */}
            <div className="md:hidden pt-4 pb-8">
              <button 
                onClick={handleSave}
                disabled={isSaving || !name || !content}
                className="w-full py-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 disabled:opacity-50 font-black text-xs tracking-tight shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{qrId ? 'SAVE' : 'FORGE'}</span>
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

            {/* Mobile Customization Toggle - Fluid Arrow Button */}
            <AnimatePresence>
              {!showMobileSettings && !isInputFocused && (
                <motion.button 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                  whileHover={{ x: -5 }}
                  onClick={() => setShowMobileSettings(true)}
                  className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 z-[110] flex items-center group"
                >
                  <div className="bg-foreground text-background py-6 pl-2 pr-1 rounded-l-3xl shadow-2xl border-y border-l border-border/20 flex flex-col items-center gap-3 transition-all group-active:pr-4">
                    <PaletteIcon className="w-4 h-4" />
                    <div className="h-8 w-px bg-background/20" />
                    <ChevronLeft className="w-4 h-4 animate-pulse" />
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

        {/* Mobile Settings Drawer */}
        <AnimatePresence>
          {showMobileSettings && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-0 z-[120] bg-card flex flex-col"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5 text-brand-700" />
                  </div>
                  <h3 className="font-black uppercase tracking-widest text-[10px]">Design Studio</h3>
                </div>
                <button onClick={() => setShowMobileSettings(false)} className="p-1.5 bg-secondary rounded-lg active:scale-90 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar pb-24 ios-momentum-scroll">
                {renderDesignSettings()}
              </div>
              
              {/* Drawer Sticky Footer */}
              <div className="p-4 border-t border-border bg-card/80 backdrop-blur-xl">
                <button 
                  onClick={() => setShowMobileSettings(false)}
                  className="w-full py-2.5 bg-foreground text-background rounded-xl font-black uppercase tracking-widest text-[9px] shadow-xl"
                >
                  APPLY
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PricingModal 
          isOpen={showPricing} 
          onClose={() => setShowPricing(false)} 
        />
        <div className="hidden md:flex bg-secondary/30 p-12 flex-col border-l border-border w-[450px] relative overflow-y-auto custom-scrollbar">
          <div className="w-full space-y-8 pb-12">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Live Preview</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDownload('png')}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Download className="w-3 h-3" />
                  PNG
                </button>
                <button 
                  onClick={() => handleDownload('svg')}
                  className="px-3 py-1.5 bg-foreground text-background rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Download className="w-3 h-3" />
                  SVG
                </button>
              </div>
            </div>

            <motion.div 
              className="bg-card p-10 rounded-[3rem] shadow-2xl shadow-foreground/5 relative group origin-center border border-border"
            >
              <QRPreview 
                ref={qrPreviewRef}
                value={previewValue} 
                design={design} 
                size={280} 
                className="mx-auto" 
              />
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem] pointer-events-none" />
            </motion.div>

            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">QR Name</label>
                  <p className="text-lg font-bold text-foreground truncate">{name || 'Untitled Campaign'}</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(content);
                    toast('Content copied to clipboard', 'success');
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors group"
                  title="Copy QR Content"
                >
                  <Copy className="w-4 h-4 text-muted-foreground group-hover:text-brand-700" />
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Encoded Content</label>
                <p className="text-[10px] font-mono text-muted-foreground break-all line-clamp-2 bg-secondary/30 p-2 rounded-lg">{content || 'No content yet...'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-secondary rounded-full text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{design.matrixStyle}</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{design.errorCorrectionLevel} ECC</span>
                {design.logoUrl && <span className="px-3 py-1 bg-primary/10 text-brand-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Branded</span>}
              </div>
            </div>
          </div>

          <div className="w-full pt-8 mt-auto space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleSaveDraft}
                className="py-3 bg-secondary text-foreground rounded-xl font-bold uppercase tracking-wide text-[10px] hover:bg-secondary/80 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <FileText className="w-3.5 h-3.5" />
                DRAFT
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !name || !content}
                className="py-3 bg-foreground text-background rounded-xl font-bold uppercase tracking-wide text-[10px] hover:bg-foreground/90 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {qrId ? 'SAVE' : 'FORGE'}
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-3 h-3 text-green-500" />
              Your asset is saved securely and can be edited anytime
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
