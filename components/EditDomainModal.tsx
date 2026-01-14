import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Globe, CreditCard, Calendar, Download, AlertCircle } from 'lucide-react';
import { DomainClient, COUNTRY_CODES } from '../types';
import { useAuth } from '../context/AuthContext';
import { InvoiceService } from '../services/invoiceService';
import { DB } from '../services/db';

interface EditDomainModalProps {
  client: DomainClient;
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: DomainClient) => void;
}

const EditDomainModal: React.FC<EditDomainModalProps> = ({ client, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<DomainClient>(client);
  const [error, setError] = useState<string | null>(null);
  const { settings, dataFields } = useAuth();

  useEffect(() => {
    setFormData(client);
    setError(null);
  }, [client]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        setError("Please enter a valid email address.");
        return;
    }

    setError(null);
    onSave(formData);
  };

  const handleDateChange = (field: 'purchaseDate' | 'expiryDate' | 'validationDate' | 'invoiceDate', value: string) => {
     let newFormData = { ...formData, [field]: value };
     
     // Auto-calculate renewal/expiry if purchase date changes based on current year projection
     if (field === 'purchaseDate') {
         const settings = DB.getSettings();
         const period = settings.defaultDomainRenewalPeriod || '1 Year';
         
         // Use new smart calculation to project past dates to current/future cycle
         const nextDate = DB.calculateNextRenewalDate(value, period);
         
         newFormData.expiryDate = nextDate;
         newFormData.validationDate = nextDate;

         // Automatically update Invoice Date to 7 days before renewal
         if (nextDate) {
             const d = new Date(nextDate);
             d.setDate(d.getDate() - (settings.renewalNotificationDays || 7));
             // Ensure this projected invoice date is within the current year or relevant context?
             // Since 'nextDate' is projected to the current/next cycle, 'invoiceDate' will match that cycle.
             // This fulfills: "Invoice Date is also automatically updated... based on the current year"
             // if 'nextRenewalDate' was projected to the current year.
             newFormData.invoiceDate = d.toISOString().split('T')[0];
         }
     }
     setFormData(newFormData);
  };

  const handleDownloadInvoice = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Try to find existing invoice record first
    const invoices = DB.getInvoices();
    let invoiceToDownload = invoices.find(inv => inv.invoiceNumber === formData.invoiceNumber);

    // If not found, generate a temporary invoice object for the PDF
    if (!invoiceToDownload) {
        invoiceToDownload = {
            id: 'temp_preview_domain',
            invoiceNumber: formData.invoiceNumber || 'DRAFT',
            clientId: formData.id,
            clientName: formData.clientName,
            clientEmail: formData.email,
            clientPhone: formData.phone,
            issueDate: formData.invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: formData.expiryDate,
            status: formData.paymentStatus,
            type: 'Domain Renew',
            amount: formData.amount,
            items: [{
                description: `Domain Renewal - ${formData.domainName}`,
                quantity: 1,
                price: formData.amount
            }],
            clientAddress: ''
        };
    }

    InvoiceService.downloadPDF(invoiceToDownload, settings);
  };

  // Logic to split/combine phone number and code
  const splitPhone = (phone: string = '') => {
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    const found = sortedCodes.find(c => phone.startsWith(c.code));
    return found 
      ? { code: found.code, number: phone.slice(found.code.length) } 
      : { code: '+1', number: phone };
  };

  const { code: phoneCode, number: phoneNumber } = splitPhone(formData.phone);

  const handlePhoneChange = (code: string, number: string) => {
    setFormData({ ...formData, phone: `${code}${number}` });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up h-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
             <h3 className="font-bold text-lg text-slate-800">{client.id.startsWith('d') && client.clientName === 'New Client' ? 'Add New Client' : 'Edit Domain Record'}</h3>
             <p className="text-xs text-slate-500">Update domain details and renewal status.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <form id="edit-domain-form" onSubmit={handleSubmit} className="space-y-4">
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200 text-sm flex items-center gap-2 shadow-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Section 1: Client Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <User className="text-primary" size={18} />
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Client Information</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name</label>
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                          setFormData({...formData, email: e.target.value});
                          setError(null);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-primary outline-none transition-all text-sm ${
                          error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-primary'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary bg-white">
                        <select
                          value={phoneCode}
                          onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                          className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium min-w-[80px]"
                        >
                            {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                            ))}
                        </select>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => handlePhoneChange(phoneCode, e.target.value)}
                          className="flex-1 px-3 py-2 outline-none text-sm"
                          placeholder="123456789"
                        />
                    </div>
                  </div>
               </div>
            </div>

            {/* Section 2: Domain Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <Globe className="text-primary" size={18} />
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Domain Configuration</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Domain Name</label>
                    <input
                      type="text"
                      required
                      placeholder="example.com"
                      value={formData.domainName}
                      onChange={(e) => setFormData({...formData, domainName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                     <select
                       value={formData.status}
                       onChange={(e) => setFormData({...formData, status: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                     >
                       {dataFields.statuses.map((s) => (
                         <option key={s} value={s}>{s}</option>
                       ))}
                     </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleDateChange('purchaseDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      required
                      value={formData.expiryDate}
                      onChange={(e) => handleDateChange('expiryDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none font-medium text-primary text-sm"
                    />
                  </div>
                   <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Validation Date</label>
                    <input
                      type="date"
                      value={formData.validationDate}
                      onChange={(e) => handleDateChange('validationDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Registrar (Optional)</label>
                    <input
                      type="text"
                      value={formData.registrar || ''}
                      onChange={(e) => setFormData({...formData, registrar: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
               </div>
            </div>

            {/* Section 3: Billing & Payment */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <CreditCard className="text-primary" size={18} />
                  <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Billing & Payment</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Renewal Cost</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                     <select
                       value={formData.paymentMethod}
                       onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                     >
                       {dataFields.paymentMethods.map((m) => (
                         <option key={m} value={m}>{m}</option>
                       ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Status</label>
                     <select
                       value={formData.paymentStatus}
                       onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white text-sm"
                     >
                       <option value="Paid">Paid</option>
                       <option value="Unpaid">Unpaid</option>
                       <option value="Overdue">Overdue</option>
                     </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoiceDate || ''}
                      onChange={(e) => handleDateChange('invoiceDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none text-sm"
                    />
                  </div>
                   
                  <div className="lg:col-span-3 flex items-end justify-end">
                      <button 
                        onClick={handleDownloadInvoice}
                        className="py-2 px-4 border border-slate-300 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors text-sm"
                        title="Download Invoice PDF"
                      >
                        <Download size={16} />
                        Download Invoice
                      </button>
                  </div>
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-domain-form"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors shadow-sm text-sm"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditDomainModal;