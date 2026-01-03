import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Plus, Mail, Edit, Trash2 } from 'lucide-react';
import { Client, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { DB } from '../services/db';
import AiEmailModal from '../components/AiEmailModal';
import EditClientModal from '../components/EditClientModal';
import { useDebounce } from '../hooks/useDebounce';

const Clients: React.FC = () => {
  const { clients, updateClient, deleteClient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClientForEmail, setSelectedClientForEmail] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { user, formatCurrency, dataFields } = useAuth();
  const { addNotification } = useNotification();

  const isAdminOrManager = ['Super Admin', 'Admin', 'Manager'].includes(user?.role || '');

  // Advanced Filter Logic with Debouncing
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const term = debouncedSearchTerm.toLowerCase().trim();
      
      // Multi-field search capability
      const matchesSearch = 
        term === '' ||
        client.clientName.toLowerCase().includes(term) || 
        client.website.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        (client.phone && client.phone.includes(term)) ||
        (client.invoiceNumber && client.invoiceNumber.toLowerCase().includes(term)) ||
        client.paymentStatus.toLowerCase().includes(term) || // Allow searching 'paid', 'unpaid'
        client.status.toLowerCase().includes(term);          // Allow searching 'active', 'expired'

      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clients, debouncedSearchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s === 'expired') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (s === 'suspended') return 'bg-slate-200 text-slate-700 border-slate-300';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getPaymentStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100';
    if (s === 'overdue') return 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-bold';
    if (s === 'unpaid') return 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100';
    return 'text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100';
  };

  const handleUpdateClient = (updatedClient: Client) => {
    // DataContext handles the syncing logic now
    updateClient(updatedClient);

    // Auto-generate Invoice on Creation if new
    // Check if ID exists in current list (if not, it's new)
    const existing = clients.find(c => c.id === updatedClient.id);
    if (!existing) {
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: updatedClient.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        clientId: updatedClient.id,
        clientName: updatedClient.clientName,
        clientEmail: updatedClient.email,
        clientPhone: updatedClient.phone,
        clientAddress: '',
        issueDate: updatedClient.setupDate || DB.getTodayLocal(),
        dueDate: updatedClient.setupDate || DB.getTodayLocal(), // Immediate due for setup
        status: 'Unpaid',
        type: 'Hosting Renew',
        amount: updatedClient.amount,
        items: [{
          description: `Hosting Service - ${updatedClient.website} (${updatedClient.storageGB}GB)`,
          quantity: 1,
          price: updatedClient.amount
        }]
      };
      DB.saveInvoice(newInvoice);
      // We need to refresh data to see the invoice, but updateClient handles refreshData in Context
      addNotification('Invoice Generated', `Invoice #${newInvoice.invoiceNumber} automatically created for new hosting client.`, 'invoice');
    }

    setEditingClient(null);

    if (!existing) {
       addNotification('New Client Added', `${updatedClient.clientName} has been added to the system.`, 'hosting');
    } else {
       addNotification('Client Updated', `Details for ${updatedClient.clientName} have been updated.`, 'hosting');
    }
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      deleteClient(client.id);
      addNotification('Client Deleted', `${client.clientName} was removed from the system.`, 'system');
    }
  };

  const handleAddClient = () => {
    const settings = DB.getSettings();
    const period = settings.defaultHostingRenewalPeriod || '1 Year';
    const today = DB.getTodayLocal();
    const nextDate = DB.calculateDate(today, period);
    
    const newClient: Client = {
      id: `c${Date.now()}`,
      sl: clients.length > 0 ? Math.max(...clients.map(c => c.sl)) + 1 : 1,
      clientName: 'New Client',
      website: 'website.com',
      validationDate: nextDate,
      email: '',
      phone: '',
      status: 'Pending',
      storageGB: 10,
      setupDate: today,
      amount: 0,
      invoiceNumber: `INV-${new Date().getFullYear()}-${clients.length + 1}`,
      invoiceDate: today,
      paymentStatus: 'Unpaid',
      invoiceStatus: 'Draft',
      paymentMethod: 'Bank Transfer',
      nextRenewalDate: nextDate,
    };
    setEditingClient(newClient);
  };

  const handleExportCSV = () => {
    const headers = ['Sl.', 'Client Name', 'Website', 'Email', 'Phone', 'Status', 'Setup Date', 'Renewal Date', 'Amount', 'Payment Method', 'Payment Status', 'Invoice Number'];
    
    const escapeCsv = (str: string | number | undefined) => {
        if (str === undefined || str === null) return '';
        const stringValue = String(str);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const csvContent = [
      headers.join(','),
      ...filteredClients.map(client => {
        const row = [
          client.sl,
          escapeCsv(client.clientName),
          escapeCsv(client.website),
          escapeCsv(client.email),
          escapeCsv(client.phone),
          escapeCsv(client.status),
          escapeCsv(client.setupDate),
          escapeCsv(client.nextRenewalDate),
          client.amount,
          escapeCsv(client.paymentMethod),
          escapeCsv(client.paymentStatus),
          escapeCsv(client.invoiceNumber)
        ];
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    addNotification('Export Complete', 'Client list exported to CSV successfully.', 'system');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hosting Clients</h1>
          <p className="text-slate-500 font-medium">Manage hosting accounts, renewals, and statuses.</p>
        </div>
        {isAdminOrManager && (
          <button 
            onClick={handleAddClient}
            className="bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md font-medium w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Add New Client
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search Name, Email, Invoice #..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-slate-50 focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <select 
              className="w-full sm:w-auto pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl appearance-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer text-slate-700 font-medium"
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors font-medium hover:border-slate-300"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-16">Sl.</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 min-w-[200px]">Client Info</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Setup Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Renewal Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Amount</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Method</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Payment</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Contact</th>
                {isAdminOrManager && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right sticky right-0 bg-slate-50/95 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                   <td colSpan={10} className="p-12 text-center text-slate-400">
                      {searchTerm ? 'No clients match your search.' : 'No clients found.'}
                   </td>
                </tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 text-sm text-slate-400 font-medium">{client.sl}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{client.clientName}</div>
                    <div className="text-xs text-primary hover:underline cursor-pointer opacity-80">{client.website}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-medium">{client.setupDate}</td>
                  <td className="p-4 text-sm text-slate-700 font-medium">
                    {client.nextRenewalDate}
                    {new Date(client.nextRenewalDate) < new Date(new Date().setMonth(new Date().getMonth() + 1)) && (
                      <span className="ml-2 text-rose-500 text-[10px] font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase">Soon</span>
                    )}
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-900">
                    {formatCurrency(client.amount)}
                  </td>
                   <td className="p-4 text-sm text-slate-600">
                    {client.paymentMethod}
                  </td>
                  <td className="p-4 text-xs font-bold">
                    <span className={`${getPaymentStatusColor(client.paymentStatus)}`}>
                      {client.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                     <div className="flex flex-col">
                        <span className="truncate max-w-[150px] font-medium" title={client.email}>{client.email}</span>
                        <span className="text-xs text-slate-400">{client.phone}</span>
                     </div>
                  </td>
                  {isAdminOrManager && (
                    <td className="p-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                           onClick={() => setSelectedClientForEmail(client)}
                           className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors tooltip"
                           title="Send Email"
                         >
                           <Mail size={16} />
                         </button>
                        <button 
                          onClick={() => setEditingClient(client)}
                          className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors tooltip"
                          title="Edit Client"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
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
          isOpen={!!selectedClientForEmail}
          onClose={() => setSelectedClientForEmail(null)}
        />
      )}

      {editingClient && (
        <EditClientModal
          client={editingClient}
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          onSave={handleUpdateClient}
        />
      )}
    </div>
  );
};

export default Clients;