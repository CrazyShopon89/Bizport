import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer, Send, CheckCircle, AlertCircle, Loader2, Building2, Calendar, Hash, User } from 'lucide-react';
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
    setEmailStatus({ type: null, message: 'Generating Invoice PDF...' });
    
    try {
        // 1. Generate PDF Payload
        const pdfDataUri = await InvoiceService.generatePdfBase64(invoice, settings);
        
        if (!pdfDataUri || pdfDataUri.length < 100) {
            throw new Error("Failed to generate valid PDF attachment.");
        }

        setEmailStatus({ type: null, message: 'Sending Email...' });

        // 2. Send Email with PDF Attachment
        const result = await EmailService.sendInvoiceEmail(invoice, pdfDataUri);
        
        if (result.success) {
            setEmailStatus({ type: 'success', message: 'Sent successfully with PDF' });
        }
    } catch (error: any) {
        console.error("Email send failed:", error);
        setEmailStatus({ type: 'error', message: error.message || 'Failed to send email' });
    } finally {
        setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 z-[9999] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm transition-all">
      <div className="bg-slate-100 sm:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 z-20">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              Invoice #{invoice.invoiceNumber}
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold border ${
                  invoice.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                  invoice.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' : 
                  'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {invoice.status}
              </span>
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Notification Bar */}
        {emailStatus.message && (
            <div className={`px-6 py-3 flex items-center gap-2 text-sm font-medium shrink-0 animate-fade-in ${
                emailStatus.type === 'error' ? 'bg-red-50 text-red-700 border-b border-red-100' : 
                emailStatus.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-100' : 'bg-blue-50 text-blue-700 border-b border-blue-100'
            }`}>
                {emailStatus.type === 'success' ? <CheckCircle size={16}/> : 
                 emailStatus.type === 'error' ? <AlertCircle size={16}/> : <Loader2 size={16} className="animate-spin"/>}
                {emailStatus.message}
            </div>
        )}

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6 md:p-8">
             
             {/* INVOICE PAPER */}
             <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 sm:p-10 max-w-2xl mx-auto relative overflow-hidden">
                
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                {/* Header Section: Flex column on mobile, row on desktop */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 mt-2">
                  
                  {/* Left: Company Branding */}
                  <div className="w-full md:w-auto order-2 md:order-1">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain mb-4" />
                    ) : (
                        <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                            <Building2 size={24} />
                        </div>
                    )}
                    <div>
                      {/* Hide company name text if logo is present, to match PDF style */}
                      {(!settings.logoUrl) && (
                          <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">{settings.companyName}</h2>
                      )}
                      <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed whitespace-pre-line">{settings.address}</p>
                      <div className="mt-3 space-y-0.5">
                        <p className="text-sm text-slate-600 font-medium">{settings.contactEmail}</p>
                        <p className="text-sm text-slate-600">{settings.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Invoice Meta Details */}
                  <div className="w-full md:w-auto order-1 md:order-2 bg-slate-50/50 md:bg-transparent p-5 md:p-0 rounded-xl border border-slate-100 md:border-none">
                    <div className="text-left md:text-right">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">INVOICE</h1>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between md:justify-end items-center gap-8">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice No</span>
                                <span className="text-sm font-bold text-slate-700 font-mono">{invoice.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between md:justify-end items-center gap-8">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</span>
                                <span className="text-sm font-medium text-slate-700">{invoice.issueDate}</span>
                            </div>
                            <div className="flex justify-between md:justify-end items-center gap-8">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</span>
                                <span className={`text-sm font-bold ${invoice.status === 'Overdue' ? 'text-red-600' : 'text-slate-700'}`}>
                                    {invoice.dueDate}
                                </span>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 mb-8" />

                {/* Client Info Section */}
                <div className="mb-10">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={14} /> Bill To
                  </h4>
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      <div className="text-lg font-bold text-slate-900 mb-1">{invoice.clientName}</div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>{invoice.clientEmail}</p>
                        {invoice.clientPhone && <p>{invoice.clientPhone}</p>}
                        {invoice.clientAddress && <p className="whitespace-pre-line mt-2 text-slate-500">{invoice.clientAddress}</p>}
                      </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">Description</th>
                        <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wider text-right border-b border-slate-200 w-24 sm:w-32">Qty</th>
                        <th className="py-3 px-4 font-semibold uppercase text-xs tracking-wider text-right border-b border-slate-200 w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 text-slate-700 font-medium">
                              {item.description}
                          </td>
                          <td className="py-4 px-4 text-slate-600 text-right">
                              {item.quantity}
                          </td>
                          <td className="py-4 px-4 text-slate-900 font-bold text-right">
                              {formatCurrency(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex flex-col items-end gap-2 border-t border-slate-200 pt-6">
                  <div className="flex justify-between w-full sm:w-64 text-sm">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="text-slate-700 font-semibold">{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className="flex justify-between w-full sm:w-64 text-sm">
                    <span className="text-slate-500 font-medium">Tax (0%)</span>
                    <span className="text-slate-700 font-semibold">$0.00</span>
                  </div>
                  <div className="flex justify-between w-full sm:w-64 mt-2 pt-3 border-t border-slate-100">
                    <span className="text-slate-800 font-bold text-base">Total Due</span>
                    <span className="text-indigo-600 font-extrabold text-xl">{formatCurrency(invoice.amount)}</span>
                  </div>
                </div>

                {/* Footer Notes */}
                {(settings.emailSignature) && (
                    <div className="mt-10 pt-6 border-t-2 border-slate-100 border-dashed text-center md:text-left">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Notes</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line italic opacity-80">
                            Thank you for your business. Please make payments by the due date.
                        </p>
                    </div>
                )}
             </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-end gap-3 shrink-0 z-20">
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">Print</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">PDF</span>
              </button>
          </div>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {sending ? (
                <>
                    <Loader2 size={18} className="animate-spin"/>
                    Sending...
                </>
            ) : (
                <>
                    <Send size={18} />
                    Send to Client
                </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceViewModal;