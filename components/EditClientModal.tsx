import React, { useState, useEffect } from 'react';
import { X, Save, User, Server, CreditCard, Calendar, Download } from 'lucide-react';
import { Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { InvoiceService } from '../services/invoiceService';
import { DB } from '../services/db';

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Client>(client);
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

    // If not found (e.g. manual record), generate a temporary invoice object for the PDF
    if (!invoiceToDownload) {
        invoiceToDownload = {
            id: 'temp_preview',
            invoiceNumber: formData.invoiceNumber || 'DRAFT',
            clientId: formData.id,
            clientName: formData.clientName,
            clientEmail: formData.email,
            clientPhone: formData.phone,
            issueDate: formData.invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: formData.nextRenewalDate,
            status: formData.paymentStatus,
            type: 'Hosting Renew',
            amount: formData.amount,
            items: [{
                description: `Hosting Renewal - ${formData.website}`,
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
             <h3 className="font-bold text-lg text-slate-800">{client.id.startsWith('c') && client.clientName === 'New Client' ? 'New Hosting Record' : 'Edit Hosting Record'}</h3>
             <p className="text-xs text-slate-500">Update client details and service configuration.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Client Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <User className="text-primary" size={20} />
                  <h4 className="font-semibold text-slate-800">Client Details</h4>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      required
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
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

            {/* Section 2: Service Configuration */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Server className="text-primary" size={20} />
                  <h4 className="font-semibold text-slate-800">Service Configuration</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Service Status</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Storage Capacity (GB)</label>
                    <input
                      type="number"
                      value={formData.storageGB}
                      onChange={(e) => setFormData({...formData, storageGB: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Initial Setup Date</label>
                    <input
                      type="date"
                      value={formData.setupDate}
                      onChange={(e) => setFormData({...formData, setupDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Next Renewal Date</label>
                    <input
                      type="date"
                      required
                      value={formData.nextRenewalDate}
                      onChange={(e) => setFormData({...formData, nextRenewalDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none font-medium text-primary"
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Validation Date</label>
                    <input
                      type="date"
                      value={formData.validationDate}
                      onChange={(e) => setFormData({...formData, validationDate: e.target.value})}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Fee</label>
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
                     <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Status</label>
                     <select
                       value={formData.invoiceStatus}
                       onChange={(e) => setFormData({...formData, invoiceStatus: e.target.value})}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
                     >
                       {dataFields.invoiceStatuses.map((s) => (
                         <option key={s} value={s}>{s}</option>
                       ))}
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
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2 flex items-end">
                      <button 
                        onClick={handleDownloadInvoice}
                        className="w-full py-2 border border-slate-300 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700 transition-colors"
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
            form="edit-client-form"
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

export default EditClientModal;