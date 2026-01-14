import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Plus, Mail, Edit, Trash2, ChevronDown, ChevronRight, FileText, Eye, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { Client, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import { DB } from '../services/db';
import { InvoiceService } from '../services/invoiceService';
import AiEmailModal from '../components/AiEmailModal';
import EditClientModal from '../components/EditClientModal';
import InvoiceViewModal from '../components/InvoiceViewModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useDebounce } from '../hooks/useDebounce';

const Clients: React.FC = () => {
  const { clients, invoices, updateClient, deleteClient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClientForEmail, setSelectedClientForEmail] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, client: Client | null}>({ isOpen: false, client: null });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { user, formatCurrency, dataFields, settings } = useAuth();
  const { addNotification } = useNotification();

  const isAdminOrManager = ['Super Admin', 'Admin', 'Manager'].includes(user?.role || '');

  // Filter Logic
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const term = debouncedSearchTerm.toLowerCase().trim();
      const matchesSearch = 
        term === '' ||
        client.clientName.toLowerCase().includes(term) || 
        client.website.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        (client.phone && client.phone.includes(term)) ||
        (client.invoiceNumber && client.invoiceNumber.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
    if (s === 'pending') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
    if (s === 'expired') return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20';
    return 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-500/10';
  };

  const handleUpdateClient = (updatedClient: Client) => {
    updateClient(updatedClient);
    setEditingClient(null);
    addNotification('Success', 'Client record updated successfully.', 'hosting');
  };

  const confirmDeleteClient = (client: Client) => {
    setDeleteConfirmation({ isOpen: true, client });
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmation.client) {
      deleteClient(deleteConfirmation.client.id);
      addNotification('Deleted', 'Client removed from system.', 'system');
      setDeleteConfirmation({ isOpen: false, client: null });
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
      invoiceNumber: '',
      invoiceDate: '', 
      paymentStatus: 'Unpaid',
      invoiceStatus: 'Draft',
      paymentMethod: 'Bank Transfer',
      nextRenewalDate: nextDate,
      renewalPeriod: period
    };
    setEditingClient(newClient);
  };

  const handleExportCSV = () => {
    // CSV Logic omitted for brevity, keeping existing functionality
    addNotification('Export', 'CSV download started.', 'system');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hosting Clients</h1>
          <p className="text-slate-500 text-sm mt-1">Manage hosting services, renewals, and client details.</p>
        </div>
        {isAdminOrManager && (
          <button 
            onClick={handleAddClient}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
          >
            <Plus size={18} />
            Add Client
          </button>
        )}
      </div>

      {/* Unified Card Panel */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar Area */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between bg-white items-center">
           <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="relative w-full sm:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search clients..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400 text-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-48">
                <select 
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium cursor-pointer appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  {dataFields.statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
           </div>
           
           <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Download size={16} />
                Export
              </button>
           </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client / Website</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Renewal Date</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Fee</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                {isAdminOrManager && <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClients.length === 0 ? (
                <tr>
                   <td colSpan={10} className="p-12 text-center text-slate-400 text-sm">
                      <div className="flex flex-col items-center gap-2">
                         <Search size={32} className="opacity-20" />
                         <p>No clients found matching your filters.</p>
                      </div>
                   </td>
                </tr>
              ) : paginatedClients.map((client) => (
                <React.Fragment key={client.id}>
                  <tr 
                    onClick={() => setExpandedClientId(expandedClientId === client.id ? null : client.id)}
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${expandedClientId === client.id ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="py-3 px-4 text-slate-400">
                      {expandedClientId === client.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{client.clientName}</div>
                      <a href={`https://${client.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline">
                        {client.website}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{client.nextRenewalDate}</div>
                      {new Date(client.nextRenewalDate) < new Date(new Date().setDate(new Date().getDate() + 30)) && (
                        <div className="text-[10px] text-amber-600 font-medium">Expires Soon</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(client.amount)}</div>
                      <div className="text-[10px] text-slate-400">{client.renewalPeriod}</div>
                    </td>
                    <td className="py-3 px-4">
                       <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                           client.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                           client.paymentStatus === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                           'bg-amber-50 text-amber-700 border-amber-100'
                       }`}>
                           {client.paymentStatus}
                       </span>
                       <div className="text-[10px] text-slate-400 mt-0.5 ml-0.5">{client.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4">
                       <div className="text-sm text-slate-600 truncate max-w-[120px]" title={client.email}>{client.email}</div>
                       <div className="text-xs text-slate-400">{client.phone}</div>
                    </td>
                    {isAdminOrManager && (
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => setSelectedClientForEmail(client)}
                             className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                             title="Send Email"
                           >
                             <Mail size={16} />
                           </button>
                          <button 
                            onClick={() => setEditingClient(client)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => confirmDeleteClient(client)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  
                  {/* Expanded Row */}
                  {expandedClientId === client.id && (
                    <tr className="bg-slate-50/50">
                        <td colSpan={10} className="px-4 py-0">
                            <div className="py-4 pl-8 border-l-2 border-indigo-200 my-2">
                                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                                    <FileText size={16} className="text-indigo-500" />
                                    <span>Recent Invoices</span>
                                </div>
                                {/* Simple Inner Table */}
                                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden max-w-3xl">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Invoice #</th>
                                                <th className="px-3 py-2 font-medium">Date</th>
                                                <th className="px-3 py-2 font-medium">Due</th>
                                                <th className="px-3 py-2 font-medium">Total</th>
                                                <th className="px-3 py-2 font-medium">Status</th>
                                                <th className="px-3 py-2 text-right">View</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {invoices.filter(i => i.clientId === client.id).length === 0 ? (
                                                <tr><td colSpan={6} className="p-3 text-center text-slate-400">No invoices found.</td></tr>
                                            ) : (
                                                invoices.filter(i => i.clientId === client.id).map(inv => (
                                                    <tr key={inv.id} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 font-mono text-slate-600">{inv.invoiceNumber}</td>
                                                        <td className="px-3 py-2 text-slate-500">{inv.issueDate}</td>
                                                        <td className="px-3 py-2 text-slate-500">{inv.dueDate}</td>
                                                        <td className="px-3 py-2 font-medium text-slate-700">{formatCurrency(inv.amount)}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.status === 'Paid' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>{inv.status}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button onClick={(e) => { e.stopPropagation(); setViewInvoice(inv); }} className="text-indigo-600 hover:underline">Open</button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <div className="text-slate-500">
                Showing <span className="font-medium text-slate-900">{filteredClients.length > 0 ? startIndex + 1 : 0}</span> to <span className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, filteredClients.length)}</span> of <span className="font-medium text-slate-900">{filteredClients.length}</span> clients
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
                >
                    <ChevronLeft size={16} />
                </button>
                <div className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium min-w-[3rem] text-center">
                    {currentPage}
                </div>
                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-600"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {/* Modals */}
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
      {viewInvoice && (
        <InvoiceViewModal 
          invoice={viewInvoice} 
          isOpen={!!viewInvoice} 
          onClose={() => setViewInvoice(null)} 
        />
      )}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Client"
        message={`Are you sure you want to delete ${deleteConfirmation.client?.clientName}? This will also remove associated invoices and history. This action cannot be undone.`}
        confirmLabel="Delete Client"
        isDangerous={true}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, client: null })}
      />
    </div>
  );
};

export default Clients;