import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, DomainClient, Invoice, PaymentStatus } from '../types';
import { DB } from '../services/db';
import { InvoiceService } from '../services/invoiceService';
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
    // Initial Load
    refreshData();
    
    // Run Auto-Generator (Invoices)
    const generated = InvoiceService.checkAndGenerateAutoInvoices();
    if (generated > 0) {
      refreshData(); // Reload to get new invoices
      addNotification('Auto-Automation', `${generated} new invoices generated for upcoming renewals.`, 'invoice');
    }

    // Run Automated Reminders (Team Emails + Overdue Marking)
    // Runs async to not block UI
    InvoiceService.runAutomatedReminders().then(emailsSent => {
        if (emailsSent > 0) {
            refreshData(); // Refresh to catch any 'Overdue' status updates
            addNotification('System Automation', `${emailsSent} reminder emails sent to the team regarding renewals/overdues.`, 'system');
        }
    });

    // Check for Domain Expirations (15 days notice) - UI Notification
    checkDomainExpirations();

    setLoading(false);
  }, []);

  const refreshData = () => {
    setClients(DB.getClients());
    setDomains(DB.getDomains());
    setInvoices(DB.getInvoices());
  };

  const checkDomainExpirations = () => {
    const allDomains = DB.getDomains();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    allDomains.forEach(domain => {
        // Filter for active domains with expiry dates
        if (domain.status === 'Active' && domain.expiryDate) {
            const expiryDate = new Date(domain.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            
            // Calculate difference in days
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if within 15 days (and not expired significantly ago, e.g. -1 days is Overdue not "expiring soon")
            // We notify for today (0) up to 15 days out.
            if (diffDays <= 15 && diffDays >= 0) {
                const notifKey = `notif_domain_expiry_${domain.id}_${domain.expiryDate}`;
                
                // Avoid duplicate notifications for the same expiry cycle using localStorage key
                if (!localStorage.getItem(notifKey)) {
                    addNotification(
                        'Domain Expiry Warning', 
                        `Domain ${domain.domainName} is expiring in ${diffDays === 0 ? 'today' : diffDays + ' days'} (${domain.expiryDate}). Please ensure renewal.`, 
                        'hosting'
                    );
                    localStorage.setItem(notifKey, 'sent');
                }
            }
        }
    });
  };

  // --- SYNC LOGIC HELPERS ---

  const syncPaymentToInvoice = (clientObj: Client | DomainClient, type: 'hosting' | 'domain') => {
    // Logic: If Client details change, update the linked Invoice to match.
    // This ensures Dashboard metrics (Revenue, Overdue, etc.) derived from invoices stay in sync.
    if (!clientObj.invoiceNumber) return false;

    const existingInvoices = DB.getInvoices();
    const targetInvoice = existingInvoices.find(i => i.invoiceNumber === clientObj.invoiceNumber);
    
    if (targetInvoice) {
      let hasChanges = false;

      // 1. Sync Payment Status
      if (targetInvoice.status !== clientObj.paymentStatus) {
        targetInvoice.status = clientObj.paymentStatus;
        hasChanges = true;
      }

      // 2. Sync Amount (Vital for Revenue/Pending stats)
      if (targetInvoice.amount !== clientObj.amount) {
        targetInvoice.amount = clientObj.amount;
        // Also update the line item price for consistency
        if (targetInvoice.items && targetInvoice.items.length > 0) {
             targetInvoice.items[0].price = clientObj.amount;
        }
        hasChanges = true;
      }

      // 3. Sync Due Date (Vital for Overdue stats)
      const newDueDate = type === 'hosting' 
        ? (clientObj as Client).nextRenewalDate 
        : (clientObj as DomainClient).expiryDate;
      
      if (newDueDate && targetInvoice.dueDate !== newDueDate) {
          targetInvoice.dueDate = newDueDate;
          hasChanges = true;
      }
      
      // 4. Sync Client Name/Email if changed (Good for consistency)
      if (targetInvoice.clientName !== clientObj.clientName) {
          targetInvoice.clientName = clientObj.clientName;
          hasChanges = true;
      }
      if (targetInvoice.clientEmail !== clientObj.email) {
          targetInvoice.clientEmail = clientObj.email;
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
    // Logic: If Invoice Status changes, update the Client Payment Status to match.
    // Also handle Renewal Date extensions if changing to 'Paid'.
    const settings = DB.getSettings();
    let updated = false;

    if (invoice.type === 'Hosting Renew') {
      const allClients = DB.getClients();
      const client = allClients.find(c => c.id === invoice.clientId);
      if (client) {
        // 1. Sync Payment Status (Bidirectional consistency)
        if (client.paymentStatus !== invoice.status) {
            client.paymentStatus = invoice.status;
            updated = true;
        }

        // 2. Special 'Paid' Logic: Activate Service & Extend Renewal
        if (invoice.status === 'Paid') {
          if (client.status !== 'Active') {
              client.status = 'Active'; // Re-activate service if paid
              updated = true;
          }
          client.paidDate = new Date().toISOString().split('T')[0];
          
          // Extend Renewal Date based on Configured Period ONLY if it hasn't been extended yet
          // Check if the invoice due date matches the current renewal date to avoid multi-extension
          if (client.nextRenewalDate <= invoice.dueDate) {
              const period = settings.defaultHostingRenewalPeriod || '1 Year';
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
        // 1. Sync Payment Status
        if (domain.paymentStatus !== invoice.status) {
            domain.paymentStatus = invoice.status;
            updated = true;
        }

        // 2. Special 'Paid' Logic
        if (invoice.status === 'Paid') {
          if (domain.status !== 'Active') {
              domain.status = 'Active';
              updated = true;
          }
          
          // Extend Expiry Date based on Configured Period
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

  // --- PUBLIC ACTIONS ---

  const updateClient = (client: Client) => {
    // 1. Save Client
    DB.saveClient(client);
    
    // 2. Sync Logic (Client -> Invoice)
    const synced = syncPaymentToInvoice(client, 'hosting');
    
    // 3. Update State (This triggers Dashboard re-render)
    refreshData();
    
    if (synced && client.paymentStatus === 'Paid') {
        addNotification('Sync Complete', `Invoice #${client.invoiceNumber} synced and marked as Paid.`, 'system');
    }
  };

  const updateDomain = (domain: DomainClient) => {
    // 1. Save Domain
    DB.saveDomain(domain);
    
    // 2. Sync Logic (Domain -> Invoice)
    const synced = syncPaymentToInvoice(domain, 'domain');
    
    // 3. Update State
    refreshData();

    if (synced && domain.paymentStatus === 'Paid') {
        addNotification('Sync Complete', `Invoice #${domain.invoiceNumber} synced and marked as Paid.`, 'system');
    }
  };

  const updateInvoice = (invoice: Invoice) => {
    // 1. Save Invoice
    DB.saveInvoice(invoice);

    // 2. Sync Logic (Invoice -> Client/Domain)
    const synced = syncInvoiceToClient(invoice);

    // 3. Update State
    refreshData();

    if (synced && invoice.status === 'Paid') {
        addNotification('Sync Complete', `Associated ${invoice.type === 'Hosting Renew' ? 'Hosting' : 'Domain'} service updated to Paid & Renewed.`, 'system');
    }
  };

  const deleteClient = (id: string) => {
    DB.deleteClient(id);
    refreshData();
  };

  const deleteDomain = (id: string) => {
    DB.deleteDomain(id);
    refreshData();
  };

  const deleteInvoice = (id: string) => {
    DB.deleteInvoice(id);
    refreshData();
  };

  return (
    <DataContext.Provider value={{
      clients,
      domains,
      invoices,
      refreshData,
      updateClient,
      updateDomain,
      updateInvoice,
      deleteClient,
      deleteDomain,
      deleteInvoice,
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