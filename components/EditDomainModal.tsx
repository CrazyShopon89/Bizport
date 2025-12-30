import React, { useState, useEffect } from 'react';
import { X, Save, User, Globe, CreditCard, Calendar, Download } from 'lucide-react';
import { DomainClient } from '../types';
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
  const { settings, dataFields } = useAuth();

  useEffect(() => {
    setFormData(client);
  }, [client]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
            issueDate: new Date().toISOString().split('T')[0],
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h3 className="font-bold text-lg text-slate-800">{client.id.startsWith('d') && client.clientName === 'New Client' ? 'Add New Client' : 'Edit Domain Record'}</h3>
             <p className="text-xs text-slate-500">Update domain details and renewal status.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <form id="edit-domain-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Client Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <User className="text-primary" size={20} />
                  <h4 className="font-semibold text-slate-800">Client Information</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
               </div>
            </div>

            {/* Section 2: Domain Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Globe className="text-primary" size={20} />
                  <h4 className="font-semibold text-slate-800">Domain Configuration</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Domain Name</label>
                    <input
                      type="text"
                      required
                      placeholder="example.com"
                      value={formData.domainName}
                      onChange={(e) => setFormData({...formData, domainName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                     <select
                       value={formData.status}
                       onChange={(e) => setFormData({...formData, status: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                     >
                       {dataFields.statuses.map((s) => (
                         <option key={s} value={s}>{s}</option>
                       ))}
                     </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Date</label>
                    <input
                      type="date"
                      required
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none font-medium text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registrar (Optional)</label>
                    <input
                      type="text"
                      value={formData.registrar || ''}
                      onChange={(e) => setFormData({...formData, registrar: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
               </div>
            </div>

            {/* Section 3: Billing & Payment */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <CreditCard className="text-primary" size={20} />
                  <h4 className="font-semibold text-slate-800">Billing & Payment</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Cost</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                     <select
                       value={formData.paymentMethod}
                       onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                     >
                       {dataFields.paymentMethods.map((m) => (
                         <option key={m} value={m}>{m}</option>
                       ))}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                     <select
                       value={formData.paymentStatus}
                       onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                     >
                       <option value="Paid">Paid</option>
                       <option value="Unpaid">Unpaid</option>
                       <option value="Overdue">Overdue</option>
                     </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                   
                  <div className="lg:col-span-4 flex items-end justify-end">
                      <button 
                        onClick={handleDownloadInvoice}
                        className="py-2 px-4 border border-slate-300 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors"
                        title="Download Invoice PDF"
                      >
                        <Download size={18} />
                        Download Invoice
                      </button>
                  </div>
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-domain-form"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors shadow-sm"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDomainModal;