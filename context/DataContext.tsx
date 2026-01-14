import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, DomainClient, Invoice } from '../types';
import { DB } from '../services/db';
import { SchedulerService } from '../services/schedulerService';
import { useNotification } from './NotificationContext';

interface DataContextType {
  clients: Client[];
  domains: DomainClient[];
  invoices: Invoice[];
  refreshData: () => void;
  updateClient: (client: Client) => void;
  updateDomain: (domain: DomainClient) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteClient: (id: string) => void;
  deleteDomain: (id: string) => void;
  deleteInvoice: (id: string) => void;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [domains, setDomains] = useState<DomainClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    // 1. Initial Data Load
    refreshData();
    
    // 2. Run Automation Scheduler (Once per day logic)
    SchedulerService.runDailyTasks().then(result => {
        if (result.run) {
            refreshData(); // Refresh if tasks ran
            
            if (result.invoices > 0) {
                addNotification('Automation', `Generated ${result.invoices} renewal invoices.`, 'invoice');
            }
            if (result.emails > 0) {
                addNotification('Automation', `Sent ${result.emails} automated reminders.`, 'system');
            }
        }
    }).catch(err => console.error("Scheduler Error:", err));

    setLoading(false);
  }, []);

  const refreshData = () => {
    setClients(DB.getClients());
    setDomains(DB.getDomains());
    setInvoices(DB.getInvoices());
  };

  // --- SYNC HELPERS (Keeping existing logic intact) ---
  const syncPaymentToInvoice = (clientObj: Client | DomainClient, type: 'hosting' | 'domain') => {
    if (!clientObj.invoiceNumber) return false;
    const existingInvoices = DB.getInvoices();
    const targetInvoice = existingInvoices.find(i => i.invoiceNumber === clientObj.invoiceNumber);
    
    if (targetInvoice) {
      let hasChanges = false;
      if (targetInvoice.status !== clientObj.paymentStatus) {
        targetInvoice.status = clientObj.paymentStatus;
        hasChanges = true;
      }
      if (targetInvoice.amount !== clientObj.amount) {
        targetInvoice.amount = clientObj.amount;
        if (targetInvoice.items && targetInvoice.items.length > 0) {
             targetInvoice.items[0].price = clientObj.amount;
        }
        hasChanges = true;
      }
      const newDueDate = type === 'hosting' ? (clientObj as Client).nextRenewalDate : (clientObj as DomainClient).expiryDate;
      if (newDueDate && targetInvoice.dueDate !== newDueDate) {
          targetInvoice.dueDate = newDueDate;
          hasChanges = true;
      }
      if (hasChanges) {
        DB.saveInvoice(targetInvoice);
        return true; 
      }
    }
    return false;
  };

  const syncInvoiceToClient = (invoice: Invoice) => {
    const settings = DB.getSettings();
    let updated = false;

    if (invoice.type === 'Hosting Renew') {
      const allClients = DB.getClients();
      const client = allClients.find(c => c.id === invoice.clientId);
      if (client) {
        if (client.paymentStatus !== invoice.status) {
            client.paymentStatus = invoice.status;
            updated = true;
        }
        if (invoice.status === 'Paid') {
          if (client.status !== 'Active') {
              client.status = 'Active';
              updated = true;
          }
          client.paidDate = new Date().toISOString().split('T')[0];
          // Extend renewal only if not already extended for this cycle
          if (client.nextRenewalDate <= invoice.dueDate) {
              const period = client.renewalPeriod || settings.defaultHostingRenewalPeriod || '1 Year';
              client.nextRenewalDate = DB.calculateDate(client.nextRenewalDate, period);
              updated = true;
          }
        }
        if (updated) DB.saveClient(client);
      }
    } else if (invoice.type === 'Domain Renew') {
      const allDomains = DB.getDomains();
      const domain = allDomains.find(d => d.id === invoice.clientId);
      if (domain) {
        if (domain.paymentStatus !== invoice.status) {
            domain.paymentStatus = invoice.status;
            updated = true;
        }
        if (invoice.status === 'Paid') {
          if (domain.status !== 'Active') {
              domain.status = 'Active';
              updated = true;
          }
          if (domain.expiryDate <= invoice.dueDate) {
              const period = settings.defaultDomainRenewalPeriod || '1 Year';
              domain.expiryDate = DB.calculateDate(domain.expiryDate, period);
              updated = true;
          }
        }
        if (updated) DB.saveDomain(domain);
      }
    }
    return updated;
  };

  const updateClient = (client: Client) => {
    DB.saveClient(client);
    syncPaymentToInvoice(client, 'hosting');
    refreshData();
  };

  const updateDomain = (domain: DomainClient) => {
    DB.saveDomain(domain);
    syncPaymentToInvoice(domain, 'domain');
    refreshData();
  };

  const updateInvoice = (invoice: Invoice) => {
    DB.saveInvoice(invoice);
    syncInvoiceToClient(invoice);
    refreshData();
  };

  const deleteClient = (id: string) => { DB.deleteClient(id); refreshData(); };
  const deleteDomain = (id: string) => { DB.deleteDomain(id); refreshData(); };
  const deleteInvoice = (id: string) => { DB.deleteInvoice(id); refreshData(); };

  return (
    <DataContext.Provider value={{
      clients, domains, invoices, refreshData,
      updateClient, updateDomain, updateInvoice,
      deleteClient, deleteDomain, deleteInvoice,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};