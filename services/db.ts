import { Client, DomainClient, User, CompanySettings, Status, PaymentStatus, Invoice, SMTPSettings, AppNotification, DataFields } from '../types';
import { SecurityService } from './security';

const STORAGE_KEYS = {
  USERS: 'hm_users_db',
  CLIENTS: 'hm_clients_db',
  DOMAINS: 'hm_domains_db',
  SETTINGS: 'hm_settings_db',
  INVOICES: 'hm_invoices_db',
  SMTP: 'hm_smtp_db',
  NOTIFICATIONS: 'hm_notifications_db',
  DATA_FIELDS: 'hm_data_fields_db'
};

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'HostMaster Pro',
  logoUrl: '',
  iconUrl: '',
  contactEmail: 'abdul.bizcope@gmail.com',
  phone: '+1 (555) 123-4567',
  address: '123 Server Lane, Cloud City, CA 90210',
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  font: 'Inter',
  currency: 'USD',
  currencySymbol: '$',
  currencyPosition: 'left',
  defaultHostingRenewalPeriod: '1 Year',
  defaultDomainRenewalPeriod: '1 Year',
  renewalNotificationDays: 30,
  emailSignature: 'Best regards,\nThe HostMaster Team'
};

const DEFAULT_SMTP: SMTPSettings = {
  host: 'smtp.mailtrap.io',
  port: '2525',
  encryption: 'TLS',
  username: '',
  password: '',
  fromName: 'HostMaster Admin',
  fromEmail: 'no-reply@hostmaster.com'
};

const DEFAULT_DATA_FIELDS: DataFields = {
  statuses: ['Active', 'Suspended', 'Expired', 'Pending'],
  paymentMethods: ['Bank Transfer', 'Bkash', 'Cash', 'Cheque', 'Credit Card', 'PayPal'],
  invoiceStatuses: ['Draft', 'Sent', 'Paid', 'Cancelled', 'Not Sent']
};

export const DB = {
  init: () => {
    // Initialize Users logic to ensure specific Super Admin exists
    let users: User[] = [];
    try {
        const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (storedUsers) {
            users = JSON.parse(storedUsers);
        }
    } catch { 
        users = []; 
    }

    const adminEmail = 'abdul.bizcope@gmail.com';
    
    // Check if the requested admin exists
    if (!users.some(u => u.email === adminEmail)) {
        const superAdmin: User = {
            id: 'super_admin_bizcope',
            name: 'Super Admin',
            email: adminEmail,
            role: 'Super Admin',
            password: SecurityService.hashPassword('Sopon2#$'),
            avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0f172a&color=fff',
            forcePasswordChange: false,
            failedLoginAttempts: 0
        };
        users.push(superAdmin);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    
    // Initialize Clients (Empty or Demo)
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    }

    // Initialize Domains
    if (!localStorage.getItem(STORAGE_KEYS.DOMAINS)) {
      localStorage.setItem(STORAGE_KEYS.DOMAINS, JSON.stringify([]));
    }

    // Initialize Settings
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Initialize Invoices
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    }

    // Initialize SMTP
    if (!localStorage.getItem(STORAGE_KEYS.SMTP)) {
      localStorage.setItem(STORAGE_KEYS.SMTP, JSON.stringify(DEFAULT_SMTP));
    }
    
    // Initialize Data Fields
    if (!localStorage.getItem(STORAGE_KEYS.DATA_FIELDS)) {
      localStorage.setItem(STORAGE_KEYS.DATA_FIELDS, JSON.stringify(DEFAULT_DATA_FIELDS));
    }

    // Initialize Notifications
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      const welcomeNotification: AppNotification = {
        id: 'welcome_1',
        title: 'Welcome to HostMaster Pro',
        message: 'System initialization complete. You are ready to manage your hosting clients.',
        type: 'system',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([welcomeNotification]));
    }
  },

  // --- UTILITY ---
  /**
   * Calculates a future date based on a start date and a period string.
   * Handles date arithmetic safely using UTC to prevent timezone shifts.
   * @param startDateStr YYYY-MM-DD string
   * @param period "1 Year", "1 Month", etc.
   */
  calculateDate: (startDateStr: string, period: string): string => {
    if (!startDateStr) return new Date().toISOString().split('T')[0];
    
    // Parse YYYY-MM-DD
    const [y, m, d] = startDateStr.split('-').map(Number);
    // Create Date in UTC (Month is 0-indexed)
    const date = new Date(Date.UTC(y, m - 1, d));

    switch (period) {
      case '1 Month': date.setUTCMonth(date.getUTCMonth() + 1); break;
      case '3 Months': date.setUTCMonth(date.getUTCMonth() + 3); break;
      case '6 Months': date.setUTCMonth(date.getUTCMonth() + 6); break;
      case '1 Year': date.setUTCFullYear(date.getUTCFullYear() + 1); break;
      case '2 Years': date.setUTCFullYear(date.getUTCFullYear() + 2); break;
      case '3 Years': date.setUTCFullYear(date.getUTCFullYear() + 3); break;
      case '5 Years': date.setUTCFullYear(date.getUTCFullYear() + 5); break;
      case '10 Years': date.setUTCFullYear(date.getUTCFullYear() + 10); break;
      default: date.setUTCFullYear(date.getUTCFullYear() + 1); // Default
    }

    return date.toISOString().split('T')[0];
  },

  getTodayLocal: (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // --- USER OPERATIONS ---
  getUsers: (): User[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch { return []; }
  },

  hasAdmin: (): boolean => {
    const users = DB.getUsers();
    return users.some(u => u.role === 'Admin' || u.role === 'Super Admin');
  },

  findUser: (email: string): User | undefined => {
    const users = DB.getUsers();
    return users.find(u => u.email === email);
  },

  saveUser: (user: User) => {
    const users = DB.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  deleteUser: (id: string) => {
    let users = DB.getUsers();
    users = users.filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // --- CLIENT OPERATIONS ---
  getClients: (): Client[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');
    } catch { return []; }
  },

  saveClient: (client: Client) => {
    const clients = DB.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      clients[index] = client;
    } else {
      clients.push(client);
    }
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  deleteClient: (id: string) => {
    let clients = DB.getClients();
    clients = clients.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  },

  // --- DOMAIN OPERATIONS ---
  getDomains: (): DomainClient[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOMAINS) || '[]');
    } catch { return []; }
  },

  saveDomain: (domain: DomainClient) => {
    const domains = DB.getDomains();
    const index = domains.findIndex(d => d.id === domain.id);
    if (index !== -1) {
      domains[index] = domain;
    } else {
      domains.push(domain);
    }
    localStorage.setItem(STORAGE_KEYS.DOMAINS, JSON.stringify(domains));
  },

  deleteDomain: (id: string) => {
    let domains = DB.getDomains();
    domains = domains.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOMAINS, JSON.stringify(domains));
  },

  // --- INVOICE OPERATIONS ---
  getInvoices: (): Invoice[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    } catch { return []; }
  },

  saveInvoice: (invoice: Invoice) => {
    const invoices = DB.getInvoices();
    const index = invoices.findIndex(i => i.id === invoice.id);
    if (index !== -1) {
      invoices[index] = invoice;
    } else {
      invoices.push(invoice);
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  deleteInvoice: (id: string) => {
    let invoices = DB.getInvoices();
    invoices = invoices.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  // --- NOTIFICATION OPERATIONS ---
  getNotifications: (): AppNotification[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    } catch { return []; }
  },

  saveNotification: (notification: AppNotification) => {
    const notifications = DB.getNotifications();
    notifications.unshift(notification); 
    if (notifications.length > 50) notifications.pop();
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  markNotificationRead: (id: string) => {
    const notifications = DB.getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].isRead = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  },

  markAllNotificationsRead: () => {
    const notifications = DB.getNotifications();
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  },

  deleteNotification: (id: string) => {
    let notifications = DB.getNotifications();
    notifications = notifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  // --- SETTINGS OPERATIONS ---
  getSettings: (): CompanySettings => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS));
      // Merge with defaults to ensure new fields exist
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch { return DEFAULT_SETTINGS; }
  },

  saveSettings: (settings: CompanySettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- SMTP OPERATIONS ---
  getSMTPSettings: (): SMTPSettings => {
    try {
      const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SMTP) || JSON.stringify(DEFAULT_SMTP));
      // Decrypt password on retrieval
      if (settings.password) {
        settings.password = SecurityService.decryptData(settings.password);
      }
      return settings;
    } catch { return DEFAULT_SMTP; }
  },

  saveSMTPSettings: (settings: SMTPSettings) => {
    // Encrypt password before storage
    const secureSettings = { ...settings };
    if (secureSettings.password) {
      secureSettings.password = SecurityService.encryptData(secureSettings.password);
    }
    localStorage.setItem(STORAGE_KEYS.SMTP, JSON.stringify(secureSettings));
  },

  // --- DATA FIELDS OPERATIONS ---
  getDataFields: (): DataFields => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA_FIELDS) || JSON.stringify(DEFAULT_DATA_FIELDS));
    } catch { return DEFAULT_DATA_FIELDS; }
  },

  saveDataFields: (fields: DataFields) => {
    localStorage.setItem(STORAGE_KEYS.DATA_FIELDS, JSON.stringify(fields));
  }
};