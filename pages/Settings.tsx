import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Palette, Type, Save, DollarSign, Mail, Server, Upload, Trash2, Image, Database, List, Plus, X, Calendar, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../services/db';
import { SMTPSettings, DataFields, COUNTRY_CODES } from '../types';

export const SettingsForm: React.FC = () => {
  const { settings, updateCompanySettings, dataFields, updateDataFields, user } = useAuth();
  const [formData, setFormData] = useState(settings);
  
  // SMTP State
  const [smtpData, setSmtpData] = useState<SMTPSettings>(DB.getSMTPSettings());
  const [showPassword, setShowPassword] = useState(false);

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
  }, [settings, dataFields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(formData);
    DB.saveSMTPSettings(smtpData); // Save SMTP
    updateDataFields(fieldsData); // Save Data Fields
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

  return (
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Information */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Building2 className="text-slate-500" size={20} />
            <h2 className="font-semibold text-slate-800">Company Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
               <div className="flex items-start gap-4">
                  <div className="flex-1">
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
                     <div className="relative group w-32 h-32 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
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
                    <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-300">
                        <Image size={32} />
                    </div>
                  )}
               </div>
            </div>

            {/* Icon Upload */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
               <label className="block text-sm font-medium text-slate-700 mb-2">Company Icon (Sidebar)</label>
               <div className="flex items-start gap-4">
                  <div className="flex-1">
                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-2">
                            <Upload className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-xs text-slate-500">Rec: 64x64px</p>
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
                     <div className="relative group w-32 h-32 bg-slate-800 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
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
                    <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-300">
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
                    className="flex-1 px-3 py-2 outline-none"
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
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Hosting Renewal Period</label>
              <select
                value={formData.defaultHostingRenewalPeriod || '1 Year'}
                onChange={(e) => setFormData({...formData, defaultHostingRenewalPeriod: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
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
                            value={formData.renewalNotificationDays || 30}
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

        {/* Data Fields Management */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Database className="text-slate-500" size={20} />
            <h2 className="font-semibold text-slate-800">Data Fields Management</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
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

        {/* Currency Settings */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <DollarSign className="text-slate-500" size={20} />
            <h2 className="font-semibold text-slate-800">Currency Management</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Currency Code</label>
              <select
                value={formData.currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
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

        {/* Branding & Appearance */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Palette className="text-slate-500" size={20} />
            <h2 className="font-semibold text-slate-800">Branding & Appearance</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-sm font-mono text-slate-500">{formData.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({...formData, secondaryColor: e.target.value})}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-sm font-mono text-slate-500">{formData.secondaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Font Family</label>
              <div className="flex items-center gap-2">
                 <Type size={18} className="text-slate-400" />
                 <select
                    value={formData.font}
                    onChange={(e) => setFormData({...formData, font: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                 >
                    <option value="Inter">Inter (Clean)</option>
                    <option value="Roboto">Roboto (Modern)</option>
                    <option value="Lato">Lato (Friendly)</option>
                 </select>
              </div>
            </div>
          </div>
        </section>

        {/* SMTP Configuration */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Mail className="text-slate-500" size={20} />
            <h2 className="font-semibold text-slate-800">SMTP Configuration</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 text-sm text-slate-500 mb-2 bg-blue-50 p-3 rounded border border-blue-100 flex items-start gap-2">
               <Server size={16} className="mt-0.5 text-blue-600" />
               <p>Configure your outgoing mail server settings. These credentials will be used to send invoices and notifications to clients.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.example.com"
                value={smtpData.host}
                onChange={(e) => setSmtpData({...smtpData, host: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
              <input
                type="text"
                placeholder="587"
                value={smtpData.port}
                onChange={(e) => setSmtpData({...smtpData, port: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Encryption</label>
               <select
                  value={smtpData.encryption}
                  onChange={(e) => setSmtpData({...smtpData, encryption: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
               >
                  <option value="TLS">TLS</option>
                  <option value="SSL">SSL</option>
                  <option value="None">None</option>
               </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sender Email (From)</label>
              <input
                type="email"
                placeholder="billing@company.com"
                value={smtpData.fromEmail}
                onChange={(e) => setSmtpData({...smtpData, fromEmail: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sender Name</label>
              <input
                type="text"
                placeholder="HostMaster Billing"
                value={smtpData.fromName}
                onChange={(e) => setSmtpData({...smtpData, fromName: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="md:col-span-2">
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

            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Authentication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={smtpData.username}
                            onChange={(e) => setSmtpData({...smtpData, username: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={smtpData.password}
                                onChange={(e) => setSmtpData({...smtpData, password: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-primary"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
           <div className={`text-green-600 font-medium transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
              Settings saved successfully!
           </div>
           <button
             type="submit"
             className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all shadow-md"
           >
             <Save size={18} />
             Save All Changes
           </button>
        </div>
      </form>
  );
};

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'Team Member') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role === 'Team Member') return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage company details, branding, and system configurations.</p>
      </div>
      <SettingsForm />
    </div>
  );
};

export default Settings;