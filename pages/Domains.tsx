import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Plus, Mail, Edit, Trash2, Globe, Calendar, CreditCard } from 'lucide-react';
import { DomainClient, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { DB } from '../services/db';
import AiEmailModal from '../components/AiEmailModal';
import EditDomainModal from '../components/EditDomainModal';
import { useDebounce } from '../hooks/useDebounce';

const Domains: React.FC = () => {
  const { domains, updateDomain, deleteDomain } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClientForEmail, setSelectedClientForEmail] = useState<DomainClient | null>(null);
  const [editingDomain, setEditingDomain] = useState<DomainClient | null>(null);
  const { user, formatCurrency, dataFields } = useAuth();
  const { addNotification } = useNotification();

  const isAdminOrManager = ['Super Admin', 'Admin', 'Manager'].includes(user?.role || '');

  const filteredDomains = useMemo(() => {
    return domains.filter(domain => {
      const term = debouncedSearchTerm.toLowerCase().trim();
      
      const matchesSearch = 
        term === '' ||
        domain.clientName.toLowerCase().includes(term) || 
        domain.domainName.toLowerCase().includes(term) ||
        domain.email.toLowerCase().includes(term) ||
        (domain.invoiceNumber && domain.invoiceNumber.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'All' || domain.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [domains, debouncedSearchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return 'bg-green-100 text-green-700';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (s === 'expired') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getPaymentStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'text-green-600';
    if (s === 'overdue') return 'text-red-600 font-semibold';
    if (s === 'unpaid') return 'text-orange-600';
    return 'text-slate-600';
  };

  const handleUpdateDomain = (updatedDomain: DomainClient) => {
    // DataContext handles the syncing logic now
    updateDomain(updatedDomain);
    
    // Auto-generate Invoice on Creation
    const existing = domains.find(d => d.id === updatedDomain.id);
    if (!existing) {
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: updatedDomain.invoiceNumber || `INV-DOM-${Date.now().toString().slice(-6)}`,
        clientId: updatedDomain.id,
        clientName: updatedDomain.clientName,
        clientEmail: updatedDomain.email,
        clientPhone: updatedDomain.phone,
        clientAddress: '',
        issueDate: updatedDomain.purchaseDate || DB.getTodayLocal(),
        dueDate: updatedDomain.purchaseDate || DB.getTodayLocal(), // Immediate due for purchase
        status: 'Unpaid',
        type: 'Domain Renew',
        amount: updatedDomain.amount,
        items: [{
          description: `Domain Registration - ${updatedDomain.domainName}`,
          quantity: 1,
          price: updatedDomain.amount
        }]
      };
      DB.saveInvoice(newInvoice);
      addNotification('Invoice Generated', `Invoice #${newInvoice.invoiceNumber} automatically created for new domain client.`, 'invoice');
    }

    setEditingDomain(null);

    if (!existing) {
       addNotification('New Client Added', `${updatedDomain.clientName} and domain ${updatedDomain.domainName} registered.`, 'hosting');
    } else {
       addNotification('Domain Updated', `Records for ${updatedDomain.domainName} have been updated.`, 'hosting');
    }
  };

  const handleDeleteDomain = (domain: DomainClient) => {
    if (window.confirm(`Are you sure you want to remove ${domain.domainName}?`)) {
      deleteDomain(domain.id);
      addNotification('Domain Removed', `${domain.domainName} was removed from the system.`, 'system');
    }
  };

  const handleAddDomain = () => {
    const settings = DB.getSettings();
    const period = settings.defaultDomainRenewalPeriod || '1 Year';
    const today = DB.getTodayLocal();
    const nextDate = DB.calculateDate(today, period);

    const newDomain: DomainClient = {
      id: `d${Date.now()}`,
      sl: domains.length > 0 ? Math.max(...domains.map(d => d.sl)) + 1 : 1,
      clientName: 'New Client',
      email: '',
      phone: '',
      domainName: 'example.com',
      purchaseDate: today,
      expiryDate: nextDate,
      validationDate: nextDate,
      amount: 15, // Default domain price
      paymentMethod: 'Credit Card',
      paymentStatus: 'Unpaid',
      status: 'Pending',
      invoiceNumber: `INV-DOM-${Date.now().toString().slice(-4)}`
    };
    setEditingDomain(newDomain);
  };

  const handleExportCSV = () => {
    const headers = ['Sl.', 'Client Name', 'Domain', 'Email', 'Purchase Date', 'Renewal Date', 'Validation Date', 'Amount', 'Payment Method', 'Payment Status', 'Status'];
    
    const csvContent = [
      headers.join(','),
      ...filteredDomains.map(d => [
        d.sl,
        `"${d.clientName}"`,
        d.domainName,
        d.email,
        d.purchaseDate,
        d.expiryDate,
        d.validationDate,
        d.amount,
        d.paymentMethod,
        d.paymentStatus,
        d.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `domains_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification('Export Complete', 'Domain list exported to CSV successfully.', 'system');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domain Clients</h1>
          <p className="text-slate-500">Manage domain clients, registrations, and renewals.</p>
        </div>
        {isAdminOrManager && (
          <button 
            onClick={handleAddDomain}
            className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            Add New Client
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Domain, Client, Email..." 
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
              {dataFields.statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
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
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-16">Sl.</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 min-w-[200px]">Client Info</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Domain</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Purchase Date</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Renewal Date</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Cost</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Payment</th>
                {isAdminOrManager && <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDomains.length === 0 ? (
                <tr>
                   <td colSpan={9} className="p-8 text-center text-slate-500">
                      {searchTerm ? 'No domains match your search.' : 'No domain records found.'}
                   </td>
                </tr>
              ) : filteredDomains.map((domain) => (
                <tr key={domain.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-sm text-slate-500">{domain.sl}</td>
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{domain.clientName}</div>
                    <div className="text-sm text-slate-500">{domain.email}</div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-2 text-slate-800 font-medium">
                        <Globe size={16} className="text-slate-400" />
                        {domain.domainName}
                     </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(domain.status)}`}>
                      {domain.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {domain.purchaseDate}
                  </td>
                  <td className="p-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {domain.expiryDate}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-900">
                    {formatCurrency(domain.amount)}
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex flex-col">
                        <span className={`font-medium ${getPaymentStatusColor(domain.paymentStatus)}`}>
                        {domain.paymentStatus}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                             <CreditCard size={10} /> {domain.paymentMethod}
                        </span>
                    </div>
                  </td>
                  {isAdminOrManager && (
                    <td className="p-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                           onClick={() => setSelectedClientForEmail(domain)}
                           className="p-2 text-primary hover:bg-indigo-50 rounded-lg tooltip"
                           title="Send Renewal Notification"
                         >
                           <Mail size={16} />
                         </button>
                        <button 
                          onClick={() => setEditingDomain(domain)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg tooltip"
                          title="Edit Domain"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDomain(domain)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedClientForEmail && (
        <AiEmailModal 
          client={selectedClientForEmail} 
          type="domain"
          isOpen={!!selectedClientForEmail}
          onClose={() => setSelectedClientForEmail(null)}
        />
      )}

      {editingDomain && (
        <EditDomainModal
          client={editingDomain}
          isOpen={!!editingDomain}
          onClose={() => setEditingDomain(null)}
          onSave={handleUpdateDomain}
        />
      )}
    </div>
  );
};

export default Domains;