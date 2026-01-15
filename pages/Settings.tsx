import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Palette, Type, Save, DollarSign, Mail, Server, Upload, Trash2, Image, Database, List, Plus, X, Calendar, Bell, AlertTriangle, Zap, Terminal, Send, Layout, MousePointer, Ban, Globe, Shield, Lock, FileText, ChevronRight, User, Phone, MapPin, Link as LinkIcon, Facebook, Linkedin, Twitter, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { SMTPSettings, DataFields, COUNTRY_CODES, EmailJSConfig, EmailProvider, EmailTemplate, SignatureConfig } from '../types';
import { EmailService } from '../services/emailService';

export const SettingsForm: React.FC = () => {
  const { settings, updateCompanySettings, dataFields, updateDataFields, refreshData } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'templates'>('general');
  
  // Template State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('invoice_ready');
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  
  // Signature State
  const [sigConfig, setSigConfig] = useState<SignatureConfig>(settings.signatureConfig || {
      enabled: true,
      fullName: '',
      jobTitle: '',
      companyName: '',
      phone: '',
      website: '',
      email: '',
      address: '',
      photoUrl: '',
      facebookUrl: '',
      linkedinUrl: '',
      twitterUrl: '',
      instagramUrl: ''
  });

  // SMTP State
  const [smtpData, setSmtpData] = useState<SMTPSettings>(DB.getSMTPSettings());

  // EmailJS State
  const [emailJsData, setEmailJsData] = useState<EmailJSConfig>(settings.emailJsConfig || { serviceId: '', templateId: '', publicKey: '' });
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(settings.emailProvider || 'simulation');
  const [testingEmail, setTestingEmail] = useState(false);

  // Data Fields State
  const [fieldsData, setFieldsData] = useState<DataFields>(dataFields);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newInvoiceStatus, setNewInvoiceStatus] = useState('');

  const [saved, setSaved] = useState(false);

  // Sync state if context updates (e.g. initial load)
  useEffect(() => {
     setFormData(settings);
     if (settings.signatureConfig) setSigConfig(settings.signatureConfig);
     setFieldsData(dataFields);
     setEmailProvider(settings.emailProvider || 'simulation');
     if (settings.emailJsConfig) setEmailJsData(settings.emailJsConfig);
     
     // Load templates
     const dbTemplates = DB.getTemplates();
     setTemplates(dbTemplates);
     
     // Set initial active template if templates are loaded and not in signature mode
     if (dbTemplates.length > 0 && selectedTemplateId !== 'email_signature') {
         const t = dbTemplates.find(tpl => tpl.id === selectedTemplateId);
         if (t) setActiveTemplate(t);
     }
  }, [settings, dataFields]);

  // Effect to switch active template when selected ID changes
  useEffect(() => {
      if (selectedTemplateId === 'email_signature') {
          setActiveTemplate(null); // Clear active template to render signature builder
      } else {
          const t = templates.find(t => t.id === selectedTemplateId);
          if (t) setActiveTemplate(t);
      }
  }, [selectedTemplateId, templates]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save Generic Settings & Signature
    const updatedSettings = { 
        ...formData, 
        emailProvider, 
        emailJsConfig: emailJsData,
        signatureConfig: sigConfig
    };
    
    updateCompanySettings(updatedSettings);
    DB.saveSMTPSettings(smtpData); // Save SMTP Legacy Data
    updateDataFields(fieldsData); // Save Data Fields
    
    // Save Templates (only if editing a real template)
    if (activeTemplate && selectedTemplateId !== 'email_signature') {
        DB.saveTemplate(activeTemplate);
        // Update local list
        setTemplates(prev => prev.map(t => t.id === activeTemplate.id ? activeTemplate : t));
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestEmail = async () => {
      // Temporarily save settings to context/local storage so service uses current values immediately
      const tempSettings = { ...formData, emailProvider, emailJsConfig: emailJsData, signatureConfig: sigConfig };
      DB.saveSettings(tempSettings);
      DB.saveSMTPSettings(smtpData);
      
      setTestingEmail(true);
      try {
          // Use contact email as recipient for test
          const recipient = formData.contactEmail || 'admin@example.com';
          const result = await EmailService.sendTestEmail(recipient);
          
          if (result.success) {
              alert(`Success! ${result.message}`);
          } else {
              alert(`Failed: ${result.message}`);
          }
      } catch (e: any) {
          alert(`Error: ${e.message}`);
      } finally {
          setTestingEmail(false);
      }
  };

  // Helper for image validation and reading
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    field: 'logoUrl' | 'iconUrl' | 'sigPhoto',
    maxSizeKB: number,
    allowedTypes: string[]
  ) => {
    const file = e.target.files?.[0];
    if (file) {
       // Validate File Type
       if (!allowedTypes.includes(file.type)) {
           alert(`Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`);
           return;
       }

       // Validate Size
       if (file.size > maxSizeKB * 1024) {
           alert(`Image is too large. Max size: ${maxSizeKB}KB.`);
           return;
       }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (field === 'sigPhoto') {
            setSigConfig(prev => ({ ...prev, photoUrl: result }));
        } else {
            setFormData(prev => ({ ...prev, [field]: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCurrencyChange = (currencyCode: string) => {
    let symbol = '$';
    switch (currencyCode) {
      case 'USD': symbol = '$'; break;
      case 'EUR': symbol = '€'; break;
      case 'GBP': symbol = '£'; break;
      case 'BDT': symbol = '৳'; break;
      case 'INR': symbol = '₹'; break;
      case 'AUD': symbol = 'A$'; break;
      case 'CAD': symbol = 'C$'; break;
      case 'JPY': symbol = '¥'; break;
      default: symbol = '$';
    }
    setFormData({ ...formData, currency: currencyCode, currencySymbol: symbol });
  };

  // Data Fields Handlers
  const addField = (category: keyof DataFields, value: string, setter: (v: string) => void) => {
    if (value && !fieldsData[category].includes(value)) {
      setFieldsData(prev => ({
        ...prev,
        [category]: [...prev[category], value]
      }));
      setter('');
    }
  };

  const removeField = (category: keyof DataFields, value: string) => {
    if (window.confirm(`Delete "${value}"? Make sure it is not in use.`)) {
      setFieldsData(prev => ({
        ...prev,
        [category]: prev[category].filter(item => item !== value)
      }));
    }
  };

  // Logic to split/combine phone number and code
  const splitPhone = (phone: string = '') => {
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    const found = sortedCodes.find(c => phone.startsWith(c.code));
    return found 
      ? { code: found.code, number: phone.slice(found.code.length) } 
      : { code: '+1', number: phone };
  };

  const { code: phoneCode, number: phoneNumber } = splitPhone(formData.phone || '');

  const handlePhoneChange = (code: string, number: string) => {
    setFormData({ ...formData, phone: `${code}${number}` });
  };

  // Immediate UI Preview logic
  const handleUIChange = (key: keyof typeof formData, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }));
      updateCompanySettings({ ...formData, [key]: value });
  };

  // Template Handlers
  const handleTemplateChange = (field: 'subject' | 'body', value: string) => {
      if (!activeTemplate) return;
      setActiveTemplate({ ...activeTemplate, [field]: value });
  };

  // Render HTML Signature for Preview
  const renderSignaturePreview = () => {
      // Pass the current primary color from the settings form for immediate branding feedback
      const html = EmailService.generateSignatureHtml(sigConfig, formData.primaryColor);
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 w-full max-w-2xl mx-auto">
            <button
               type="button"
               onClick={() => setActiveSubTab('general')}
               className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                   activeSubTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
            >
               General Settings
            </button>
            <button
               type="button"
               onClick={() => setActiveSubTab('templates')}
               className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                   activeSubTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
            >
               Email Templates
            </button>
        </div>

        {activeSubTab === 'templates' && (
            <div className="grid grid-cols-12 gap-6 h-[750px] md:h-[600px]">
                {/* Sidebar List */}
                <div className="col-span-12 md:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Templates</h3>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTemplateId(t.id)}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${
                                    selectedTemplateId === t.id 
                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                                    : 'bg-white border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div className={`font-semibold mb-0.5 ${selectedTemplateId === t.id ? 'text-blue-700' : 'text-slate-700'}`}>{t.name}</div>
                                <div className="text-xs text-slate-500 truncate">{t.description}</div>
                            </button>
                        ))}
                        {/* Signature Item */}
                        <button
                            type="button"
                            onClick={() => setSelectedTemplateId('email_signature')}
                            className={`w-full text-left p-3 rounded-lg text-sm transition-colors border mt-4 ${
                                selectedTemplateId === 'email_signature' 
                                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                                : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                        >
                            <div className={`font-semibold mb-0.5 ${selectedTemplateId === 'email_signature' ? 'text-blue-700' : 'text-slate-700'}`}>Email Signature</div>
                            <div className="text-xs text-slate-500 truncate">Appended to all emails</div>
                        </button>
                    </div>
                    {/* Placeholder Helper */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                        <div className="font-bold mb-2 text-slate-700">Available Placeholders:</div>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>{'{client_name}'}</li>
                            <li>{'{invoice_id}'}</li>
                            <li>{'{service_name}'}</li>
                            <li>{'{amount}'}</li>
                            <li>{'{due_date}'}</li>
                        </ul>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="col-span-12 md:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
                    {selectedTemplateId === 'email_signature' ? (
                        // Signature Builder
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">Signature Generator</h3>
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={sigConfig.enabled}
                                        onChange={(e) => setSigConfig({ ...sigConfig, enabled: e.target.checked })}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-slate-700 select-none">Enable Signature</span>
                                </label>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Inputs */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <div className="relative group w-16 h-16 shrink-0 cursor-pointer">
                                                <img 
                                                    src={sigConfig.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(sigConfig.fullName || 'User')}`} 
                                                    alt="Sig" 
                                                    className="w-full h-full rounded-md object-cover border-2 border-white shadow-sm"
                                                />
                                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                    <Upload size={16} className="text-white" />
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/png, image/jpeg"
                                                        onChange={(e) => handleImageUpload(e, 'sigPhoto', 200, ['image/png', 'image/jpeg'])}
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-bold text-slate-700">Profile Photo</label>
                                                <p className="text-xs text-slate-500">Click image to upload (Max 200KB)</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={sigConfig.fullName}
                                                    onChange={(e) => setSigConfig({...sigConfig, fullName: e.target.value})}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Job Title</label>
                                                <input 
                                                    type="text" 
                                                    value={sigConfig.jobTitle}
                                                    onChange={(e) => setSigConfig({...sigConfig, jobTitle: e.target.value})}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                    placeholder="Manager"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Company</label>
                                            <div className="relative group">
                                                <Building2 size={16} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                <input 
                                                    type="text" 
                                                    value={sigConfig.companyName}
                                                    onChange={(e) => setSigConfig({...sigConfig, companyName: e.target.value})}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                    placeholder="Acme Corp"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone</label>
                                                <div className="relative group">
                                                    <Phone size={16} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.phone}
                                                        onChange={(e) => setSigConfig({...sigConfig, phone: e.target.value})}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="+1 234 567"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Website</label>
                                                <div className="relative group">
                                                    <Globe size={16} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.website}
                                                        onChange={(e) => setSigConfig({...sigConfig, website: e.target.value})}
                                                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="www.example.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email</label>
                                            <div className="relative group">
                                                <Mail size={16} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                <input 
                                                    type="text" 
                                                    value={sigConfig.email}
                                                    onChange={(e) => setSigConfig({...sigConfig, email: e.target.value})}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Address</label>
                                            <div className="relative group">
                                                <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                                <input 
                                                    type="text" 
                                                    value={sigConfig.address}
                                                    onChange={(e) => setSigConfig({...sigConfig, address: e.target.value})}
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                                                    placeholder="123 St, City"
                                                />
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-4">
                                            <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Social Media</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="relative group">
                                                    <div className="absolute left-2 top-2 text-blue-600 bg-blue-50 p-0.5 rounded">
                                                        <Facebook size={12} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.facebookUrl}
                                                        onChange={(e) => setSigConfig({...sigConfig, facebookUrl: e.target.value})}
                                                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="Facebook"
                                                    />
                                                </div>
                                                <div className="relative group">
                                                    <div className="absolute left-2 top-2 text-blue-700 bg-blue-50 p-0.5 rounded">
                                                        <Linkedin size={12} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.linkedinUrl}
                                                        onChange={(e) => setSigConfig({...sigConfig, linkedinUrl: e.target.value})}
                                                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="LinkedIn"
                                                    />
                                                </div>
                                                <div className="relative group">
                                                    <div className="absolute left-2 top-2 text-slate-800 bg-slate-100 p-0.5 rounded">
                                                        <Twitter size={12} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.twitterUrl}
                                                        onChange={(e) => setSigConfig({...sigConfig, twitterUrl: e.target.value})}
                                                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="X (Twitter)"
                                                    />
                                                </div>
                                                <div className="relative group">
                                                    <div className="absolute left-2 top-2 text-pink-600 bg-pink-50 p-0.5 rounded">
                                                        <Instagram size={12} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={sigConfig.instagramUrl}
                                                        onChange={(e) => setSigConfig({...sigConfig, instagramUrl: e.target.value})}
                                                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                        placeholder="Instagram"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="sticky top-0">
                                        <div className="bg-slate-200 rounded-xl overflow-hidden shadow-inner border border-slate-300 flex flex-col h-[400px]">
                                            {/* Fake Window Header */}
                                            <div className="bg-slate-300 px-4 py-2 flex items-center gap-2 border-b border-slate-300/50">
                                                <div className="flex gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                                </div>
                                                <div className="flex-1 text-center text-xs font-bold text-slate-600 opacity-70">
                                                    New Message
                                                </div>
                                            </div>
                                            
                                            {/* Fake Email Body */}
                                            <div className="bg-white flex-1 p-6 flex flex-col shadow-sm overflow-auto">
                                                <div className="border-b border-slate-100 pb-2 mb-4 space-y-1">
                                                    <div className="text-xs text-slate-400 flex gap-2">
                                                        <span className="font-semibold text-slate-500">To:</span> Client Name
                                                    </div>
                                                    <div className="text-xs text-slate-400 flex gap-2">
                                                        <span className="font-semibold text-slate-500">Subject:</span> Project Update
                                                    </div>
                                                </div>
                                                
                                                <div className="text-sm text-slate-600 mb-6 font-sans">
                                                    <p className="mb-2">Hi there,</p>
                                                    <p>This is a preview of how your email signature will look to recipients. It updates instantly as you edit the fields on the left.</p>
                                                </div>

                                                <div className="mt-auto border-t border-slate-100 pt-2">
                                                    <div className="transform origin-top-left">
                                                        {renderSignaturePreview()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-3 text-center">
                                            Live Preview • Updates instantly
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"
                                >
                                    <Save size={16} />
                                    Save Signature
                                </button>
                            </div>
                        </div>
                    ) : activeTemplate ? (
                        <>
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Editing: {activeTemplate.name}</h3>
                                {activeTemplate.id !== 'email_signature' && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                        <input 
                                            type="text" 
                                            value={activeTemplate.subject}
                                            onChange={(e) => handleTemplateChange('subject', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 p-6 flex flex-col">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email Body
                                </label>
                                <textarea 
                                    value={activeTemplate.body}
                                    onChange={(e) => handleTemplateChange('body', e.target.value)}
                                    className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none font-mono text-sm leading-relaxed resize-none bg-slate-50"
                                />
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <Save size={16} />
                                    Save Template
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">Select a template to edit</div>
                    )}
                </div>
            </div>
        )}

        {/* ... General Tab Content (Unchanged) ... */}
        {activeSubTab === 'general' && (
            <>
            {/* Branding & Appearance */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Palette className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Interface Customization</h2>
            </div>
            
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Colors */}
                <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Button Colors</h4>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <Layout size={14} /> Primary (Default)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleUIChange('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">{formData.primaryColor}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <MousePointer size={14} /> Hover State
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                        type="color"
                        value={formData.primaryHoverColor || '#4338ca'}
                        onChange={(e) => handleUIChange('primaryHoverColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">{formData.primaryHoverColor || '#4338ca'}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <Ban size={14} /> Disabled State
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                        type="color"
                        value={formData.disabledColor || '#94a3b8'}
                        onChange={(e) => handleUIChange('disabledColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">{formData.disabledColor || '#94a3b8'}</span>
                    </div>
                </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Typography</h4>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <Type size={14} /> Font Family
                    </label>
                    <select
                        value={formData.font}
                        onChange={(e) => handleUIChange('font', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                    >
                        <option value="Plus Jakarta Sans">Jakarta Sans (Modern)</option>
                        <option value="Inter">Inter (Clean)</option>
                        <option value="Roboto">Roboto (Standard)</option>
                        <option value="Lato">Lato (Friendly)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Font Size</label>
                    <input 
                        type="range" 
                        min="0.85" 
                        max="1.15" 
                        step="0.05"
                        value={formData.fontScale || 1}
                        onChange={(e) => handleUIChange('fontScale', Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Small</span>
                        <span>{Math.round((formData.fontScale || 1) * 16)}px</span>
                        <span>Large</span>
                    </div>
                </div>
                </div>

                {/* Borders & Shape */}
                <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shape & Borders</h4>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Button Roundness</label>
                    <select
                        value={formData.borderRadius || '0.75rem'}
                        onChange={(e) => handleUIChange('borderRadius', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                    >
                        <option value="0px">Square (0px)</option>
                        <option value="0.25rem">Small (4px)</option>
                        <option value="0.5rem">Medium (8px)</option>
                        <option value="0.75rem">Large (12px)</option>
                        <option value="1.5rem">Pill (24px)</option>
                        <option value="9999px">Full (Circle)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Button Border Width</label>
                    <select
                        value={formData.buttonBorderWidth || '0px'}
                        onChange={(e) => handleUIChange('buttonBorderWidth', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                    >
                        <option value="0px">None</option>
                        <option value="1px">Thin (1px)</option>
                        <option value="2px">Thick (2px)</option>
                        <option value="3px">Heavy (3px)</option>
                    </select>
                </div>
                </div>

                {/* Preview Box */}
                <div className="md:col-span-2 lg:col-span-3 mt-4 p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-sm text-slate-600">
                        <h5 className="font-bold text-slate-800 mb-1">Live Preview</h5>
                        <p>See how your buttons look instantly.</p>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium shadow-sm hover:bg-slate-50 transition-colors">
                            Secondary
                        </button>
                        <button type="button" className="px-5 py-2.5 bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                            <Zap size={16} /> Primary Action
                        </button>
                        <button type="button" disabled className="px-5 py-2.5 bg-slate-400 text-white font-medium cursor-not-allowed opacity-70">
                            Disabled
                        </button>
                    </div>
                </div>

            </div>
            </section>

            {/* Company Information */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Building2 className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Company Information</h2>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                />
                </div>
                
                {/* Logo Upload */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo (Invoices)</label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1 w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                                <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                <p className="text-xs text-slate-500">PNG, JPG (Max 500KB)</p>
                            </div>
                            <input 
                                type="file" 
                                accept="image/png, image/jpeg"
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, 'logoUrl', 500, ['image/png', 'image/jpeg'])}
                            />
                        </label>
                    </div>
                    {formData.logoUrl ? (
                        <div className="relative group w-32 h-32 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm mx-auto sm:mx-0">
                            <img src={formData.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, logoUrl: ''})}
                                className="absolute top-1 right-1 bg-white text-red-500 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                title="Remove Logo"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 mx-auto sm:mx-0">
                            <Image size={32} />
                        </div>
                    )}
                </div>
                </div>

                {/* Icon Upload */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Icon & Favicon</label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1 w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                                <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                <p className="text-xs text-slate-500">Sidebar & Browser Tab</p>
                                <p className="text-[10px] text-slate-400">PNG, JPG, SVG (Max 100KB)</p>
                            </div>
                            <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/svg+xml"
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, 'iconUrl', 100, ['image/png', 'image/jpeg', 'image/svg+xml'])}
                            />
                        </label>
                    </div>
                    {formData.iconUrl ? (
                        <div className="relative group w-32 h-32 bg-slate-800 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm mx-auto sm:mx-0">
                            <img src={formData.iconUrl} alt="Icon" className="w-16 h-16 object-contain" />
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, iconUrl: ''})}
                                className="absolute top-1 right-1 bg-white text-red-500 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                title="Remove Icon"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 mx-auto sm:mx-0">
                            <Server size={32} />
                        </div>
                    )}
                </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                    <select
                        value={phoneCode}
                        onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                        className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium min-w-[90px]"
                    >
                        {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                        ))}
                    </select>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(phoneCode, e.target.value)}
                        className="flex-1 px-3 py-2 outline-none w-full"
                        placeholder="123456789"
                    />
                </div>
                </div>

                <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Physical Address</label>
                <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none resize-none"
                />
                </div>
            </div>
            </section>

            {/* Renewal Defaults */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Calendar className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Renewal Configuration</h2>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Default Hosting Renewal Period</label>
                <select
                    value={formData.defaultHostingRenewalPeriod || '1 Year'}
                    onChange={(e) => setFormData({...formData, defaultHostingRenewalPeriod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Automatically extends the renewal date by this amount when marked Paid.</p>
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Default Domain Renewal Period</label>
                <select
                    value={formData.defaultDomainRenewalPeriod || '1 Year'}
                    onChange={(e) => setFormData({...formData, defaultDomainRenewalPeriod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                >
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="5 Years">5 Years</option>
                    <option value="10 Years">10 Years</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Automatically extends the expiry date by this amount when marked Paid.</p>
                </div>
                <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="text-slate-400" size={18} />
                        <h3 className="text-sm font-medium text-slate-700">Notification & Automation Lead Time</h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Renewal Notification Lead Time (Days)</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={formData.renewalNotificationDays || 7}
                                onChange={(e) => setFormData({...formData, renewalNotificationDays: Number(e.target.value)})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                The system will automatically generate invoices and system notifications this many days before the due date.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </section>

            {/* Currency Settings */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <DollarSign className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Currency Management</h2>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Currency Code</label>
                <select
                    value={formData.currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="BDT">BDT - Bangladeshi Taka</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                </select>
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Currency Symbol</label>
                <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({...formData, currencySymbol: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Symbol Position</label>
                <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="position"
                        value="left"
                        checked={formData.currencyPosition === 'left'}
                        onChange={() => setFormData({...formData, currencyPosition: 'left'})}
                        className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">Left ($100)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="position"
                        value="right"
                        checked={formData.currencyPosition === 'right'}
                        onChange={() => setFormData({...formData, currencyPosition: 'right'})}
                        className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">Right (100$)</span>
                    </label>
                </div>
                </div>
            </div>
            </section>

            {/* Email Configuration (Replaced Old SMTP Section) */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Mail className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Email Configuration</h2>
            </div>
            
            <div className="p-4 sm:p-6">
                {/* Provider Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6 w-full max-w-md">
                    <button
                    type="button"
                    onClick={() => setEmailProvider('simulation')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        emailProvider === 'simulation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    >
                    <Server size={16} /> Custom SMTP
                    </button>
                    <button
                    type="button"
                    onClick={() => setEmailProvider('emailjs')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                        emailProvider === 'emailjs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    >
                    <Zap size={16} /> EmailJS (API)
                    </button>
                </div>

                {emailProvider === 'simulation' ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                        <div className="text-sm text-amber-800">
                            <p className="font-bold mb-1">Direct Browser SMTP Limitations</p>
                            <p>Web browsers restrict direct TCP connections to SMTP ports (25, 465, 587) for security. In this dashboard, these settings are stored securely and used to simulate the handshake and verify credential format. For production delivery, use the EmailJS integration which proxies to your SMTP.</p>
                        </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host (e.g. mail.yourdomain.com)</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={smtpData.host} 
                                    onChange={(e) => setSmtpData({...smtpData, host: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none" 
                                    placeholder="mail.example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                            <div className="relative">
                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={smtpData.port} 
                                    onChange={(e) => setSmtpData({...smtpData, port: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                    placeholder="465 (SSL) or 587 (TLS)"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={smtpData.username} 
                                    onChange={(e) => setSmtpData({...smtpData, username: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="password" 
                                    value={smtpData.password} 
                                    onChange={(e) => setSmtpData({...smtpData, password: e.target.value})}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sender Email</label>
                            <input 
                                type="email" 
                                value={smtpData.fromEmail} 
                                onChange={(e) => setSmtpData({...smtpData, fromEmail: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                placeholder="no-reply@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sender Name</label>
                            <input 
                                type="text" 
                                value={smtpData.fromName} 
                                onChange={(e) => setSmtpData({...smtpData, fromName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                                placeholder="HostMaster Notifications"
                            />
                        </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                        <Zap className="text-indigo-600 shrink-0" size={20} />
                        <div className="text-sm text-indigo-800">
                            <p className="font-bold mb-1">Send Real Emails with EmailJS</p>
                            <p>To send actual emails from a client-side app, you can use a service like <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-indigo-900">EmailJS</a>. It allows you to connect your cPanel SMTP or Gmail account and send emails via API.</p>
                        </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Service ID</label>
                            <input
                                type="text"
                                placeholder="service_xxxxx"
                                value={emailJsData.serviceId}
                                onChange={(e) => setEmailJsData({...emailJsData, serviceId: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                            </div>
                            <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Template ID</label>
                            <input
                                type="text"
                                placeholder="template_xxxxx"
                                value={emailJsData.templateId}
                                onChange={(e) => setEmailJsData({...emailJsData, templateId: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                            </div>
                            <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Public Key (User ID)</label>
                            <input
                                type="password"
                                placeholder="Start with 'user_' or random string"
                                value={emailJsData.publicKey}
                                onChange={(e) => setEmailJsData({...emailJsData, publicKey: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Test Email Button */}
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {testingEmail ? 'Sending...' : 'Test Connection'}
                        <Send size={14} />
                    </button>
                </div>
            </div>
            </section>

            {/* Data Fields Management */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Database className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Data Fields Management</h2>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Statuses */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-2">
                    <List size={16} /> Statuses
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {fieldsData.statuses.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 group hover:border-blue-100 transition-colors">
                        <span className="text-sm text-slate-700 font-medium truncate pr-2 flex-1" title={item}>{item}</span>
                        <button 
                            type="button" 
                            onClick={() => removeField('statuses', item)} 
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                            <X size={14} />
                        </button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input 
                    type="text" 
                    className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    placeholder="New Status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField('statuses', newStatus, setNewStatus))}
                    />
                    <button 
                    type="button" 
                    onClick={() => addField('statuses', newStatus, setNewStatus)}
                    className="bg-primary text-white h-9 w-9 rounded-lg hover:bg-opacity-90 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    >
                    <Plus size={18} />
                    </button>
                </div>
                </div>

                {/* Payment Methods */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-2">
                    <List size={16} /> Payment Methods
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {fieldsData.paymentMethods.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 group hover:border-blue-100 transition-colors">
                        <span className="text-sm text-slate-700 font-medium truncate pr-2 flex-1" title={item}>{item}</span>
                        <button 
                            type="button" 
                            onClick={() => removeField('paymentMethods', item)} 
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                            <X size={14} />
                        </button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input 
                    type="text" 
                    className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    placeholder="New Method"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField('paymentMethods', newPaymentMethod, setNewPaymentMethod))}
                    />
                    <button 
                    type="button" 
                    onClick={() => addField('paymentMethods', newPaymentMethod, setNewPaymentMethod)}
                    className="bg-primary text-white h-9 w-9 rounded-lg hover:bg-opacity-90 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    >
                    <Plus size={18} />
                    </button>
                </div>
                </div>

                {/* Invoice Statuses */}
                <div className="flex flex-col h-[320px] bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-2">
                    <List size={16} /> Invoice Status
                </div>
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {fieldsData.invoiceStatuses.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 group hover:border-blue-100 transition-colors">
                        <span className="text-sm text-slate-700 font-medium truncate pr-2 flex-1" title={item}>{item}</span>
                        <button 
                            type="button" 
                            onClick={() => removeField('invoiceStatuses', item)} 
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                            <X size={14} />
                        </button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                    <input 
                    type="text" 
                    className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
                    placeholder="New Status"
                    value={newInvoiceStatus}
                    onChange={(e) => setNewInvoiceStatus(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField('invoiceStatuses', newInvoiceStatus, setNewInvoiceStatus))}
                    />
                    <button 
                    type="button" 
                    onClick={() => addField('invoiceStatuses', newInvoiceStatus, setNewInvoiceStatus)}
                    className="bg-primary text-white h-9 w-9 rounded-lg hover:bg-opacity-90 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
                    >
                    <Plus size={18} />
                    </button>
                </div>
                </div>

            </div>
            </section>
            </>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className={`text-green-600 font-medium transition-opacity text-center sm:text-left ${saved ? 'opacity-100' : 'opacity-0'}`}>
              Settings saved successfully!
           </div>
           {/* Only show bottom save button if in General tab, Templates has its own save button */}
           {activeSubTab === 'general' && (
               <button
               type="submit"
               className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all shadow-md"
               >
               <Save size={18} />
               Save All Changes
               </button>
           )}
        </div>
      </form>
  );
};

export default SettingsForm;