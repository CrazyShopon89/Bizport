import React, { useState } from 'react';
import { X, Download, Printer, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { InvoiceService } from '../services/invoiceService';
import { EmailService } from '../services/emailService';

interface InvoiceViewModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ invoice, isOpen, onClose }) => {
  const { settings, formatCurrency } = useAuth();
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{type: 'success' | 'error' | null, message: string}>({ type: null, message: '' });

  if (!isOpen) return null;

  const handleDownload = () => {
    InvoiceService.downloadPDF(invoice, settings);
  };

  const handlePrint = () => {
    InvoiceService.printPDF(invoice, settings);
  };

  const handleSendEmail = async () => {
    setSending(true);
    setEmailStatus({ type: null, message: '' });
    
    try {
        const result = await EmailService.sendInvoiceEmail(invoice);
        if (result.success) {
            setEmailStatus({ type: 'success', message: 'Sent successfully' });
        }
    } catch (error: any) {
        setEmailStatus({ type: 'error', message: error.message || 'Failed to send email' });
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Invoice Details</h3>
            <p className="text-xs text-slate-500">View and manage invoice #{invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Status Notification Bar */}
        {emailStatus.type && (
            <div className={`px-6 py-2 flex items-center gap-2 text-sm font-medium ${
                emailStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
                {emailStatus.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                {emailStatus.message}
            </div>
        )}

        {/* Modal Content - Scrollable Invoice Preview */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-100/50 flex-1">
          <div className="bg-white border border-slate-200 p-8 shadow-sm rounded-lg max-w-xl mx-auto min-h-[500px] flex flex-col">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              {/* Left Side: Logo & Company Info */}
              <div className="flex flex-col items-start gap-4">
                {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain rounded-sm" />
                )}
                <div>
                  <div className="text-lg font-bold text-slate-800 leading-tight">{settings.companyName}</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-[180px] leading-relaxed whitespace-pre-line">{settings.address}</div>
                  <div className="text-xs text-slate-500 mt-1">{settings.contactEmail}</div>
                  <div className="text-xs text-slate-500">{settings.phone}</div>
                </div>
              </div>

              {/* Right Side: Invoice Title & Meta */}
              <div className="text-right">
                <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">INVOICE</h2>
                <div className="text-sm text-slate-500">Invoice No: <span className="font-mono font-medium text-slate-700">{invoice.invoiceNumber}</span></div>
                <div className="text-sm text-slate-500">Date: <span className="font-medium text-slate-700">{invoice.issueDate}</span></div>
                <div className="text-sm text-slate-500">Due: <span className="font-medium text-slate-700">{invoice.dueDate}</span></div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-6"></div>

            {/* Bill To */}
            <div className="mb-8">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</h4>
              <div className="font-bold text-slate-800">{invoice.clientName}</div>
              <div className="text-sm text-slate-600">{invoice.clientEmail}</div>
              {invoice.clientPhone && <div className="text-sm text-slate-600">{invoice.clientPhone}</div>}
              {invoice.clientAddress && <div className="text-sm text-slate-600">{invoice.clientAddress}</div>}
            </div>

            {/* Line Items */}
            <div className="flex-1">
              <table className="w-full text-left mb-6">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="py-2 px-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3 text-sm text-slate-700">{item.description}</td>
                      <td className="py-3 px-3 text-sm text-slate-900 font-medium text-right">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <div className="text-sm text-slate-500">
                Status: <span className={`font-semibold ${invoice.status === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>{invoice.status}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Due</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.amount)}</div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            <Download size={18} />
            PDF
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {sending ? (
                <>Sending...</>
            ) : (
                <>
                    <Send size={18} />
                    Send to Client
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;