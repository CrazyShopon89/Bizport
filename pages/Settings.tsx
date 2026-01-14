import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Palette, Type, Save, DollarSign, Mail, Server, Upload, Trash2, Image, Database, List, Plus, X, Calendar, Bell, AlertTriangle, Zap, Terminal, Send, Layout, MousePointer, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { SMTPSettings, DataFields, COUNTRY_CODES, EmailJSConfig, EmailProvider } from '../types';
import { EmailService } from '../services/emailService';

export const SettingsForm: React.FC = () => {
  const { settings, updateCompanySettings, dataFields, updateDataFields, refreshData } = useAuth();
  const [formData, setFormData] = useState(settings);
  
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
     setFieldsData(dataFields);
     setEmailProvider(settings.emailProvider || 'simulation');
     if (settings.emailJsConfig) setEmailJsData(settings.emailJsConfig);
  }, [settings, dataFields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save Generic Settings
    const updatedSettings = { 
        ...formData, 
        emailProvider, 
        emailJsConfig: emailJsData 
    };
    
    updateCompanySettings(updatedSettings);
    DB.saveSMTPSettings(smtpData); // Save SMTP Legacy Data
    updateDataFields(fieldsData); // Save Data Fields
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestEmail = async () => {
      // Temporarily save settings to context/local storage so service uses current values
      const tempSettings = { ...formData, emailProvider, emailJsConfig: emailJsData };
      DB.saveSettings(tempSettings);
      
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
    field: 'logoUrl' | 'iconUrl',
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
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
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
      // Optional: Apply immediately to context if you want 'Live Preview' before saving,
      // but standard practice is 'Save' to apply.
      // However, for colors/fonts, immediate feedback is nice.
      updateCompanySettings({ ...formData, [key]: value });
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        
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
                   <Terminal size={16} /> Simulation (Console)
                </button>
                <button
                   type="button"
                   onClick={() => setEmailProvider('emailjs')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                       emailProvider === 'emailjs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                   }`}
                >
                   <Zap size={16} /> EmailJS (Live)
                </button>
             </div>

             {emailProvider === 'simulation' ? (
                 <div className="space-y-6 animate-fade-in">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                       <AlertTriangle className="text-blue-600 shrink-0" size={20} />
                       <div className="text-sm text-blue-800">
                          <p className="font-bold mb-1">Browsers cannot send direct SMTP emails</p>
                          <p>Due to web security standards, browsers are blocked from connecting directly to SMTP servers. In this mode, the system will <strong>simulate</strong> email sending by logging the full email content to your browser console (F12) for testing purposes.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 pointer-events-none filter grayscale-[30%]">
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host (Mock)</label>
                          <input type="text" value={smtpData.host} readOnly className="w-full px-3 py-2 border rounded-lg bg-slate-50" />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Sender Email</label>
                          <input type="text" value={smtpData.fromEmail} readOnly className="w-full px-3 py-2 border rounded-lg bg-slate-50" />
                       </div>
                    </div>
                 </div>
             ) : (
                 <div className="space-y-6 animate-fade-in">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                       <Zap className="text-indigo-600 shrink-0" size={20} />
                       <div className="text-sm text-indigo-800">
                          <p className="font-bold mb-1">Send Real Emails with EmailJS</p>
                          <p>To send actual emails from a client-side app, you can use a service like <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-indigo-900">EmailJS</a>. It's free for up to 200 emails/month.</p>
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
                    {testingEmail ? 'Sending...' : 'Send Test Email'}
                    <Send size={14} />
                </button>
             </div>

             <div className="mt-6 border-t border-slate-100 pt-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Signature</label>
                <textarea
                  rows={4}
                  placeholder="Best regards,&#10;The HostMaster Team"
                  value={formData.emailSignature || ''}
                  onChange={(e) => setFormData({...formData, emailSignature: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">This signature will be appended to all system emails.</p>
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className={`text-green-600 font-medium transition-opacity text-center sm:text-left ${saved ? 'opacity-100' : 'opacity-0'}`}>
              Settings saved successfully!
           </div>
           <button
             type="submit"
             className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all shadow-md"
           >
             <Save size={18} />
             Save All Changes
           </button>
        </div>
      </form>
  );
};

export default SettingsForm;