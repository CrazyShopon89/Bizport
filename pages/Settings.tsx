import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Palette, Type, Save, DollarSign, Mail, Server, Upload, Trash2, Image, Database, List, Plus, X, Calendar, Bell, AlertTriangle, Zap, Terminal, Send, Layout, MousePointer, Ban, Globe, Shield, Lock, FileText, ChevronRight, User, Phone, MapPin, Link as LinkIcon, Facebook, Linkedin, Twitter, Instagram, Search, Download, CreditCard, Tag, Sliders, Eye, EyeOff } from 'lucide-react';
import { DB } from '../services/db';
import { SMTPSettings, DataFields, COUNTRY_CODES, EmailJSConfig, EmailProvider, EmailTemplate, SignatureConfig } from '../types';
import { EmailService } from '../services/emailService';

export const SettingsForm: React.FC = () => {
  const { settings, updateCompanySettings, dataFields, updateDataFields, refreshData } = useAuth();
  const [formData, setFormData] = useState(settings);
  
  // SMTP State (Reference/Storage)
  const [smtpData, setSmtpData] = useState<SMTPSettings>(DB.getSMTPSettings());
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Email Backend State
  const [backendUrl, setBackendUrl] = useState<string>(settings.backendApiUrl || '');
  const [testingEmail, setTestingEmail] = useState(false);

  // Data Fields State
  const [fieldsData, setFieldsData] = useState<DataFields>(dataFields);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newInvoiceStatus, setNewInvoiceStatus] = useState('');

  const [saved, setSaved] = useState(false);

  // Sync state if context updates
  useEffect(() => {
     setFormData(settings);
     setFieldsData(dataFields);
     if (settings.backendApiUrl) setBackendUrl(settings.backendApiUrl);
  }, [settings, dataFields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save Settings
    const updatedSettings = { 
        ...formData, 
        emailProvider: 'backend' as const, // Enforce backend logic
        backendApiUrl: backendUrl
    };
    
    updateCompanySettings(updatedSettings);
    DB.saveSMTPSettings(smtpData); // Save SMTP settings to DB
    updateDataFields(fieldsData); 

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDownloadPhpScript = () => {
    // Inject saved settings into the script
    const host = smtpData.host || 'mail.yourdomain.com';
    const user = smtpData.username || 'noreply@yourdomain.com';
    const pass = smtpData.password || 'EMAIL_PASSWORD';
    const port = smtpData.port || '465';
    // Map UI selection to PHPMailer constant
    const encryption = smtpData.encryption === 'TLS' 
        ? 'PHPMailer::ENCRYPTION_STARTTLS' 
        : 'PHPMailer::ENCRYPTION_SMTPS';
    
    const fromName = smtpData.fromName || 'System';
    const fromEmail = smtpData.fromEmail || user;

    const phpContent = `<?php
/**
 * HostMaster Pro - Universal Mail API
 * Designed to solve "Library Not Found" issues by checking multiple paths.
 */

use PHPMailer\\PHPMailer\\PHPMailer;
use PHPMailer\\PHPMailer\\Exception;

// 1. ROBUST LIBRARY LOADING
// We check common Composer paths AND a manual "PHPMailer" folder fallback.
$autoloadPaths = [
    __DIR__ . '/vendor/autoload.php',           // Same dir
    __DIR__ . '/../vendor/autoload.php',        // Parent dir
    __DIR__ . '/../../vendor/autoload.php',     // Grandparent dir
    $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php' // Web root
];

$libFound = false;

// Try Composer Autoloaders
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $libFound = true;
        break;
    }
}

// Fallback: Check for Manual Upload of PHPMailer source files
// If user uploaded the 'src' folder as 'PHPMailer' in the same directory
if (!$libFound) {
    $manualPath = __DIR__ . '/PHPMailer/';
    if (file_exists($manualPath . 'PHPMailer.php')) {
        require_once $manualPath . 'Exception.php';
        require_once $manualPath . 'PHPMailer.php';
        require_once $manualPath . 'SMTP.php';
        $libFound = true;
    }
}

// 2. CONFIGURATION & HEADERS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Exit early if library still missing
if (!$libFound) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => "PHPMailer library not found. Fix: 1) Run 'composer require phpmailer/phpmailer' OR 2) Upload PHPMailer 'src' folder renamed to 'PHPMailer' next to this file."
    ]);
    exit;
}

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 3. Enforce POST Request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "success" => true,
        "message" => "API is active. Please use POST request to send emails.",
        "details" => null
    ]);
    exit;
}

// 4. Parse JSON Body
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (empty($data['to']) || empty($data['subject']) || empty($data['html'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing required fields (to, subject, html)"
    ]);
    exit;
}

$mail = new PHPMailer(true);

try {
    // 5. Server Settings (Injected from Dashboard)
    $mail->isSMTP();
    $mail->Host       = '${host}';
    $mail->SMTPAuth   = true;
    $mail->Username   = '${user}';
    $mail->Password   = '${pass}';
    $mail->SMTPSecure = ${encryption};
    $mail->Port       = ${port};

    // 6. Sender & Recipient
    // Use injected From Name/Email, but allow override from request if secure
    $reqFromEmail = isset($data['fromEmail']) ? $data['fromEmail'] : '${fromEmail}';
    $reqFromName = isset($data['fromName']) ? $data['fromName'] : '${fromName}';
    
    $mail->setFrom($reqFromEmail, $reqFromName);
    $mail->addAddress($data['to']);
    $mail->Subject = $data['subject'];
    $mail->Body    = $data['html'];
    $mail->AltBody = strip_tags($data['html']);
    $mail->isHTML(true);

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Email sent successfully"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: " . $mail->ErrorInfo
    ]);
}
?>`;

    const blob = new Blob([phpContent], { type: 'application/x-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mail_api.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestEmail = async () => {
      const tempSettings = { ...formData, emailProvider: 'backend' as const, backendApiUrl: backendUrl };
      DB.saveSettings(tempSettings);
      
      setTestingEmail(true);
      try {
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

  // Helper for image upload
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    field: 'logoUrl' | 'iconUrl',
    maxSizeKB: number,
    allowedTypes: string[]
  ) => {
    const file = e.target.files?.[0];
    if (file) {
       if (!allowedTypes.includes(file.type)) {
           alert(`Invalid file type.`);
           return;
       }
       if (file.size > maxSizeKB * 1024) {
           alert(`Image is too large. Max size: ${maxSizeKB}KB.`);
           return;
       }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const newFormData = { ...formData, [field]: result };
        setFormData(newFormData);
        updateCompanySettings(newFormData);
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
    if (window.confirm(`Delete "${value}"?`)) {
      setFieldsData(prev => ({
        ...prev,
        [category]: prev[category].filter(item => item !== value)
      }));
    }
  };

  // Helper to split/combine phone number and code
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

  const handleUIChange = (key: keyof typeof formData, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }));
      updateCompanySettings({ ...formData, [key]: value });
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        
        {/* Identity Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="relative group w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                    {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                        <Building2 className="text-slate-300" size={32} />
                    )}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload size={20} className="text-white" />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => handleImageUpload(e, 'logoUrl', 500, ['image/png', 'image/jpeg', 'image/webp'])}
                        />
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700">Company Logo</label>
                    <p className="text-xs text-slate-500 mt-1">Displayed on invoices and emails.<br/>Max 500KB (PNG/JPG).</p>
                    {formData.logoUrl && (
                        <button type="button" onClick={() => handleUIChange('logoUrl', '')} className="text-xs text-red-500 hover:underline mt-2">Remove Logo</button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="relative group w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                    {formData.iconUrl ? (
                        <img src={formData.iconUrl} alt="Icon" className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-2xl">⚡</div>
                    )}
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload size={20} className="text-white" />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/png, image/jpeg, image/x-icon, image/svg+xml"
                            onChange={(e) => handleImageUpload(e, 'iconUrl', 100, ['image/png', 'image/jpeg', 'image/x-icon', 'image/svg+xml'])}
                        />
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700">App Icon (Favicon)</label>
                    <p className="text-xs text-slate-500 mt-1">Browser tab icon & sidebar brand.<br/>Square image recommended.</p>
                    {formData.iconUrl && (
                        <button type="button" onClick={() => handleUIChange('iconUrl', '')} className="text-xs text-red-500 hover:underline mt-2">Reset to Default</button>
                    )}
                </div>
            </div>
        </div>

        {/* Company Profile Settings */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Building2 className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Company Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => handleUIChange('companyName', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
                    <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleUIChange('contactEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                        <select
                            value={phoneCode}
                            onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                            className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium min-w-[80px]"
                        >
                            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.country} {c.code}</option>)}
                        </select>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(phoneCode, e.target.value)}
                            className="flex-1 px-3 py-2 outline-none text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleUIChange('address', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                </div>
                
                {/* Currency Settings */}
                <div className="md:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                        <select
                            value={formData.currency}
                            onChange={(e) => handleCurrencyChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                        >
                            {['USD', 'EUR', 'GBP', 'BDT', 'INR', 'AUD', 'CAD', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
                        <input
                            type="text"
                            value={formData.currencySymbol}
                            onChange={(e) => handleUIChange('currencySymbol', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Symbol Position</label>
                        <select
                            value={formData.currencyPosition}
                            onChange={(e) => handleUIChange('currencyPosition', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                        >
                            <option value="left">Left ($100)</option>
                            <option value="right">Right (100$)</option>
                        </select>
                    </div>
                </div>
            </div>
        </section>

        {/* Email Configuration */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Mail className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Email Configuration</h2>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6">
                
                {/* Primary Backend Config */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Backend API URL</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            value={backendUrl} 
                            onChange={(e) => setBackendUrl(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none" 
                            placeholder="https://your-domain.com/mail_api.php"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2">
                        <p className="text-xs text-slate-500">
                            <strong>New:</strong> The updated script now fixes "Library Not Found" errors automatically.
                        </p>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={handleDownloadPhpScript}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline bg-indigo-50 px-2 py-1 rounded"
                            >
                                <Download size={12} /> Download PHP Script
                            </button>
                            <button
                                type="button"
                                onClick={handleTestEmail}
                                disabled={testingEmail || !backendUrl}
                                className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium hover:underline bg-emerald-50 px-2 py-1 rounded disabled:opacity-50"
                            >
                                {testingEmail ? 'Sending...' : 'Test Connection'}
                                <Send size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* SMTP Reference Section */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={16} className="text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700">SMTP Settings (For PHP Script)</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        Fill in these details to generate a pre-configured PHP script. The script uses <strong>PHPMailer</strong>.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">SMTP Host</label>
                            <input 
                                type="text" 
                                value={smtpData.host}
                                onChange={(e) => setSmtpData({...smtpData, host: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none"
                                placeholder="mail.yourdomain.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">SMTP Port</label>
                            <input 
                                type="text" 
                                value={smtpData.port}
                                onChange={(e) => setSmtpData({...smtpData, port: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none"
                                placeholder="465"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                            <input 
                                type="text" 
                                value={smtpData.username}
                                onChange={(e) => setSmtpData({...smtpData, username: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none"
                                placeholder="noreply@yourdomain.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showSmtpPass ? "text" : "password"} 
                                    value={smtpData.password}
                                    onChange={(e) => setSmtpData({...smtpData, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none pr-8"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showSmtpPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Encryption</label>
                            <select 
                                value={smtpData.encryption}
                                onChange={(e) => setSmtpData({...smtpData, encryption: e.target.value as any})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none bg-white"
                            >
                                <option value="SSL">SSL (Port 465)</option>
                                <option value="TLS">TLS (Port 587)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">From Name</label>
                            <input 
                                type="text" 
                                value={smtpData.fromName}
                                onChange={(e) => setSmtpData({...smtpData, fromName: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Service & System Defaults Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Sliders className="text-slate-500" size={20} />
                <h2 className="font-semibold text-slate-800">Service & System Defaults</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Hosting Period</label>
                    <select
                        value={formData.defaultHostingRenewalPeriod || '1 Year'}
                        onChange={(e) => handleUIChange('defaultHostingRenewalPeriod', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                    >
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                        <option value="2 Years">2 Years</option>
                        <option value="3 Years">3 Years</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Domain Period</label>
                    <select
                        value={formData.defaultDomainRenewalPeriod || '1 Year'}
                        onChange={(e) => handleUIChange('defaultDomainRenewalPeriod', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                    >
                        <option value="1 Year">1 Year</option>
                        <option value="2 Years">2 Years</option>
                        <option value="3 Years">3 Years</option>
                        <option value="5 Years">5 Years</option>
                        <option value="10 Years">10 Years</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Notification Lead Time</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={formData.renewalNotificationDays || 7}
                            onChange={(e) => handleUIChange('renewalNotificationDays', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Days</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Days before expiry to generate invoice.</p>
                </div>

                <div className="md:col-span-2 lg:col-span-3 border-t border-slate-100 pt-4 mt-2">
                     <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="seo-indexing"
                            checked={formData.allowSearchIndexing || false}
                            onChange={(e) => handleUIChange('allowSearchIndexing', e.target.checked)}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <div>
                            <label htmlFor="seo-indexing" className="block text-sm font-medium text-slate-700">Allow Search Engine Indexing</label>
                            <p className="text-xs text-slate-500">If enabled, public pages (if any) can be indexed by Google.</p>
                        </div>
                     </div>
                </div>
            </div>
        </section>

        {/* Interface Customization */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
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
                    <input type="color" value={formData.primaryColor} onChange={(e) => handleUIChange('primaryColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm" />
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">{formData.primaryColor}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <MousePointer size={14} /> Hover State
                </label>
                <div className="flex items-center gap-3">
                    <input type="color" value={formData.primaryHoverColor || '#4338ca'} onChange={(e) => handleUIChange('primaryHoverColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm" />
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">{formData.primaryHoverColor || '#4338ca'}</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Ban size={14} /> Disabled State
                </label>
                <div className="flex items-center gap-3">
                    <input type="color" value={formData.disabledColor || '#94a3b8'} onChange={(e) => handleUIChange('disabledColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0 shadow-sm" />
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
                <select value={formData.font} onChange={(e) => handleUIChange('font', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm">
                    <option value="Plus Jakarta Sans">Jakarta Sans (Modern)</option>
                    <option value="Inter">Inter (Clean)</option>
                    <option value="Roboto">Roboto (Standard)</option>
                    <option value="Lato">Lato (Friendly)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base Font Size</label>
                <input type="range" min="0.85" max="1.15" step="0.05" value={formData.fontScale || 1} onChange={(e) => handleUIChange('fontScale', Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>Small</span><span>{Math.round((formData.fontScale || 1) * 16)}px</span><span>Large</span></div>
            </div>
            </div>

            {/* Borders & Shape */}
            <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shape & Borders</h4>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Button Roundness</label>
                <select value={formData.borderRadius || '0.75rem'} onChange={(e) => handleUIChange('borderRadius', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm">
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
                <select value={formData.buttonBorderWidth || '0px'} onChange={(e) => handleUIChange('buttonBorderWidth', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm">
                    <option value="0px">None</option>
                    <option value="1px">Thin (1px)</option>
                    <option value="2px">Thick (2px)</option>
                    <option value="3px">Heavy (3px)</option>
                </select>
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
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Statuses */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><List size={14} /> Service Statuses</h4>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            placeholder="Add Status" 
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:border-primary"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        />
                        <button type="button" onClick={() => addField('statuses', newStatus, setNewStatus)} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md text-slate-600"><Plus size={18} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {fieldsData.statuses.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200">
                                {s}
                                <button type="button" onClick={() => removeField('statuses', s)} className="hover:text-red-500"><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><CreditCard size={14} /> Payment Methods</h4>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            placeholder="Add Method" 
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:border-primary"
                            value={newPaymentMethod}
                            onChange={(e) => setNewPaymentMethod(e.target.value)}
                        />
                        <button type="button" onClick={() => addField('paymentMethods', newPaymentMethod, setNewPaymentMethod)} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md text-slate-600"><Plus size={18} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {fieldsData.paymentMethods.map(m => (
                            <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200">
                                {m}
                                <button type="button" onClick={() => removeField('paymentMethods', m)} className="hover:text-red-500"><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Invoice Statuses */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Tag size={14} /> Invoice Statuses</h4>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            placeholder="Add Status" 
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm outline-none focus:border-primary"
                            value={newInvoiceStatus}
                            onChange={(e) => setNewInvoiceStatus(e.target.value)}
                        />
                        <button type="button" onClick={() => addField('invoiceStatuses', newInvoiceStatus, setNewInvoiceStatus)} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md text-slate-600"><Plus size={18} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {fieldsData.invoiceStatuses.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs border border-slate-200">
                                {s}
                                <button type="button" onClick={() => removeField('invoiceStatuses', s)} className="hover:text-red-500"><X size={12} /></button>
                            </span>
                        ))}
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