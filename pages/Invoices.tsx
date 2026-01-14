import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, FileText, Trash2, CheckCircle, Clock, AlertCircle, RefreshCw, Eye, Printer, Tag } from 'lucide-react';
import { Invoice, PaymentStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { InvoiceService } from '../services/invoiceService';
import InvoiceViewModal from '../components/InvoiceViewModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useDebounce } from '../hooks/useDebounce';

const Invoices: React.FC = () => {
  const { invoices, updateInvoice, deleteInvoice, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, invoice: Invoice | null}>({ isOpen: false, invoice: null });
  const { formatCurrency, settings, user } = useAuth();
  const { addNotification } = useNotification();
  const isAdmin = ['Super Admin', 'Admin', 'Manager'].includes(user?.role || '');

  // Sorted list for display
  const displayInvoices = useMemo(() => {
    return [...invoices].reverse();
  }, [invoices]);

  const handleAutoGenerate = () => {
    setLoading(true);
    // Simulate a small delay for UX
    setTimeout(() => {
        const count = InvoiceService.checkAndGenerateAutoInvoices();
        if (count > 0) {
            refreshData(); // Triggers data context reload
            addNotification('Invoices Generated', `${count} renewal invoices were automatically generated.`, 'invoice');
        } else {
            addNotification('System', 'No pending renewals found needing invoices.', 'system');
        }
        setLoading(false);
    }, 800);
  };

  const confirmDeleteInvoice = (invoice: Invoice) => {
    setDeleteConfirmation({ isOpen: true, invoice });
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmation.invoice) {
      deleteInvoice(deleteConfirmation.invoice.id);
      addNotification('Invoice Deleted', `Invoice #${deleteConfirmation.invoice.invoiceNumber} has been deleted.`, 'system');
      setDeleteConfirmation({ isOpen: false, invoice: null });
    }
  };

  const handleDownload = (invoice: Invoice) => {
    InvoiceService.downloadPDF(invoice, settings);
  };

  const handlePrint = (invoice: Invoice) => {
    InvoiceService.printPDF(invoice, settings);
  };

  const handleStatusChange = (invoice: Invoice, newStatus: string) => {
      const updatedInvoice = { ...invoice, status: newStatus };
      updateInvoice(updatedInvoice);
  };
  
  // Advanced Filter Logic with Debouncing
  const filteredInvoices = useMemo(() => {
    return displayInvoices.filter(inv => {
      const term = debouncedSearchTerm.toLowerCase().trim();
      
      const matchesSearch = 
        term === '' ||
        inv.clientName.toLowerCase().includes(term) || 
        inv.clientEmail.toLowerCase().includes(term) ||
        inv.invoiceNumber.toLowerCase().includes(term) ||
        (inv.type && inv.type.toLowerCase().includes(term)) ||
        inv.status.toLowerCase().includes(term); 

      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      const matchesType = typeFilter === 'All' || inv.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [displayInvoices, debouncedSearchTerm, statusFilter, typeFilter]);

  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Client', 'Type', 'Amount', 'Status', 'Issue Date', 'Due Date'];
    
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(inv => [
        inv.invoiceNumber,
        `"${inv.clientName}"`,
        inv.type,
        inv.amount,
        inv.status,
        inv.issueDate,
        inv.dueDate
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle size={12}/> Paid</span>;
    if (s === 'unpaid') return <span className="flex items-center gap-1 text-orange-700 bg-orange-100 px-2 py-1 rounded-full text-xs font-medium"><Clock size={12}/> Unpaid</span>;
    if (s === 'overdue') return <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-medium"><AlertCircle size={12}/> Overdue</span>;
    return <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium"><Tag size={12}/> {status}</span>;
  };

  const getTypeBadge = (type: string) => {
    const isHosting = type === 'Hosting Renew';
    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${
            isHosting 
            ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
            : 'bg-purple-50 text-purple-700 border-purple-100'
        }`}>
            {isHosting ? 'Hosting' : 'Domain'}
        </span>
    );
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Manage and track billing history.</p>
        </div>
        {isAdmin && (
            <div className="flex gap-2 w-full sm:w-auto">
                 <button 
                    onClick={handleAutoGenerate}
                    disabled={loading}
                    className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    {loading ? 'Checking...' : 'Check Due Renewals'}
                </button>
            </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Client, Type, Invoice #..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="w-full sm:w-auto pl-10 pr-8 py-2 border border-slate-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="w-full sm:w-auto pl-10 pr-8 py-2 border border-slate-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Hosting Renew">Hosting</option>
              <option value="Domain Renew">Domain</option>
            </select>
          </div>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Invoice #</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Client</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Type</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Amount</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Issue Date</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Due Date</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                   <td colSpan={8} className="p-8 text-center text-slate-500">
                      {searchTerm || statusFilter !== 'All' || typeFilter !== 'All' ? 'No invoices match your search.' : 'No invoices found.'}
                   </td>
                </tr>
              ) : filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 font-mono text-sm font-medium text-slate-700">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{inv.clientName}</div>
                    <div className="text-xs text-slate-400">{inv.clientEmail}</div>
                  </td>
                  <td className="p-3">
                     {getTypeBadge(inv.type || 'Hosting Renew')}
                  </td>
                  <td className="p-3 text-sm font-medium text-slate-900">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="p-3">
                    {/* Allow Status Toggle for Admin */}
                    {isAdmin ? (
                        <select 
                            value={inv.status}
                            onChange={(e) => handleStatusChange(inv, e.target.value)}
                            className="bg-transparent text-xs font-medium border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Sent">Sent</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    ) : (
                        getStatusBadge(inv.status)
                    )}
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {inv.issueDate}
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {inv.dueDate}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                         onClick={() => setViewInvoice(inv)}
                         className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg tooltip"
                         title="View Invoice"
                       >
                         <Eye size={16} />
                       </button>
                       <button 
                         onClick={() => handleDownload(inv)}
                         className="p-1.5 text-primary hover:bg-indigo-50 rounded-lg tooltip"
                         title="Download PDF"
                       >
                         <Download size={16} />
                       </button>
                       <button 
                         onClick={() => handlePrint(inv)}
                         className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg tooltip"
                         title="Print Invoice"
                       >
                         <Printer size={16} />
                       </button>
                      
                      {isAdmin && (
                        <button 
                          onClick={() => confirmDeleteInvoice(inv)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete Invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewInvoice && (
        <InvoiceViewModal 
          invoice={viewInvoice} 
          isOpen={!!viewInvoice} 
          onClose={() => setViewInvoice(null)} 
        />
      )}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice #${deleteConfirmation.invoice?.invoiceNumber}? This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        isDangerous={true}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, invoice: null })}
      />
    </div>
  );
};

export default Invoices;