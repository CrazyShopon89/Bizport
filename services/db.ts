import { Client, DomainClient, User, CompanySettings, Status, PaymentStatus, Invoice, SMTPSettings, AppNotification, DataFields, EmailLog, BackupMeta, EmailTemplate, SignatureConfig } from '../types';
import { SecurityService } from './security';

const STORAGE_KEYS = {
  USERS: 'hm_users_db',
  CLIENTS: 'hm_clients_db',
  DOMAINS: 'hm_domains_db',
  SETTINGS: 'hm_settings_db',
  INVOICES: 'hm_invoices_db',
  SMTP: 'hm_smtp_db',
  NOTIFICATIONS: 'hm_notifications_db',
  DATA_FIELDS: 'hm_data_fields_db',
  EMAIL_LOGS: 'hm_email_logs_db',
  BACKUP_HISTORY: 'hm_backup_history_db',
  TEMPLATES: 'hm_email_templates_db'
};

const DEFAULT_SIGNATURE: SignatureConfig = {
  enabled: true,
  fullName: 'Md Abdul Kader',
  jobTitle: 'Sr. Web Developer',
  companyName: 'Bizcope Digital Ltd.',
  phone: '+8801324738611',
  website: 'www.bizcope.com',
  email: 'abdulkader@bizcope.com',
  address: '89/7 Gopibag, Dhaka-1203',
  photoUrl: 'https://ui-avatars.com/api/?name=Abdul+Kader&background=0f172a&color=fff',
  facebookUrl: 'https://facebook.com',
  linkedinUrl: 'https://linkedin.com',
  twitterUrl: 'https://twitter.com'
};

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'HostMaster Pro',
  logoUrl: '',
  iconUrl: '',
  contactEmail: 'abdul.bizcope@gmail.com',
  phone: '+1 (555) 123-4567',
  address: '123 Server Lane, Cloud City, CA 90210',
  
  // UI Defaults
  primaryColor: '#4f46e5', // Indigo 600
  primaryHoverColor: '#4338ca', // Indigo 700
  disabledColor: '#94a3b8', // Slate 400
  secondaryColor: '#64748b',
  font: 'Plus Jakarta Sans',
  fontScale: 1,
  borderRadius: '0.75rem', // 12px (rounded-xl)
  buttonBorderWidth: '0px',

  currency: 'USD',
  currencySymbol: '$',
  currencyPosition: 'left',
  defaultHostingRenewalPeriod: '1 Year',
  defaultDomainRenewalPeriod: '1 Year',
  renewalNotificationDays: 7,
  emailSignature: '', // Legacy
  signatureConfig: DEFAULT_SIGNATURE,
  emailProvider: 'simulation',
  emailJsConfig: {
    serviceId: '',
    templateId: '',
    publicKey: ''
  },
  
  backupSchedule: 'disabled',
  backupRetentionCount: 5,
  allowSearchIndexing: false // Default to private
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

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'invoice_ready',
    name: 'Invoice Ready',
    description: 'Your Invoice #{invoice_id} is Ready',
    subject: 'Your Invoice #{invoice_id} is Ready',
    body: `Hi {client_name},

Your invoice #{invoice_id} for "{service_name}" is now available. 
Please find the details below.

Total Amount Due: {amount}
Due Date: {due_date}

Please login to your client portal to make a payment.

Thank you for choosing us.`,
    placeholders: ['{client_name}', '{invoice_id}', '{service_name}', '{amount}', '{due_date}']
  },
  {
    id: 'renewal_reminder',
    name: 'Renewal Reminder',
    description: 'Hosting/Domain Renewal Reminder',
    subject: 'Renewal Reminder: {service_name} Expires Soon',
    body: `Hi {client_name},

This is a friendly reminder that your service "{service_name}" is set to expire on {due_date}.

To ensure uninterrupted service, please review the attached invoice #{invoice_id} and process the payment of {amount} before the due date.

If you have already made a payment, please disregard this notice.`,
    placeholders: ['{client_name}', '{service_name}', '{due_date}', '{invoice_id}', '{amount}']
  },
  {
    id: 'overdue_notice',
    name: 'Overdue Notice',
    description: 'Invoice #{invoice_id} Overdue Notice',
    subject: 'URGENT: Invoice #{invoice_id} is Overdue',
    body: `Hi {client_name},

We noticed that payment for invoice #{invoice_id} was due on {due_date} and is now overdue.

Outstanding Amount: {amount}

Please arrange payment immediately to avoid potential service suspension.

If you need assistance, simply reply to this email.`,
    placeholders: ['{client_name}', '{invoice_id}', '{due_date}', '{amount}']
  }
];

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

    // Initialize Email Logs
    if (!localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify([]));
    }
    
    // Initialize Backup History
    if (!localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify([]));
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

    // Initialize Templates
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    }
  },

  // --- BACKUP & RESTORE ---
  
  createBackup: (): string => {
    const backupData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // Only backup critical data tables (excluding large logs)
    const CRITICAL_KEYS = [
        STORAGE_KEYS.USERS, STORAGE_KEYS.CLIENTS, 
        STORAGE_KEYS.DOMAINS, STORAGE_KEYS.SETTINGS, 
        STORAGE_KEYS.INVOICES, STORAGE_KEYS.DATA_FIELDS,
        STORAGE_KEYS.TEMPLATES
    ];

    CRITICAL_KEYS.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          backupData.data[key] = JSON.parse(item);
        }
      } catch (e) {
        console.error(`Failed to backup key: ${key}`, e);
      }
    });

    return JSON.stringify(backupData, null, 2);
  },

  restoreBackup: (jsonString: string): boolean => {
    try {
      const backup = JSON.parse(jsonString);
      
      if (!backup.data) throw new Error("Invalid backup format");

      Object.entries(backup.data).forEach(([key, value]) => {
        // Validate that the key belongs to our app storage keys
        if (Object.values(STORAGE_KEYS).includes(key as string)) {
           localStorage.setItem(key, JSON.stringify(value));
        }
      });
      
      return true;
    } catch (e) {
      console.error("Restore failed", e);
      return false;
    }
  },
  
  // --- BACKUP HISTORY OPERATIONS ---
  getBackupHistory: (): BackupMeta[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY) || '[]');
    } catch { return []; }
  },

  saveBackupHistory: (record: BackupMeta) => {
    const history = DB.getBackupHistory();
    history.unshift(record); // Newest first
    
    // Enforce Retention (Max 20 logs for UI, actual file retention handled by logic)
    if (history.length > 20) history.pop();
    
    localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(history));
  },
  
  deleteBackupRecord: (id: string) => {
      let history = DB.getBackupHistory();
      history = history.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(history));
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

  /**
   * Calculates the next renewal date based on the current year.
   * If the start date is in the past (e.g., 2018), it projects it to the current/next cycle.
   */
  calculateNextRenewalDate: (startDateStr: string, period: string): string => {
    if (!startDateStr) return new Date().toISOString().split('T')[0];

    const today = new Date();
    // Create "Today" as UTC YYYY-MM-DD for fair comparison
    const nowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const [y, m, d] = startDateStr.split('-').map(Number);
    // Construct start date in UTC
    const start = new Date(Date.UTC(y, m - 1, d));

    if (start >= nowUTC) {
        // If setup/purchase date is in future or today, next renewal is Start + Period
        return DB.calculateDate(startDateStr, period);
    }

    let nextDate = new Date(start);

    if (period.includes('Year')) {
        const years = parseInt(period) || 1;
        const currentYear = nowUTC.getUTCFullYear();
        
        // Project to current year
        nextDate.setUTCFullYear(currentYear);
        
        // If projected date is before today, move to next cycle
        if (nextDate < nowUTC) {
            nextDate.setUTCFullYear(currentYear + years);
        }
    } else if (period.includes('Month')) {
        const months = parseInt(period) || 1;
        // Iterate adding months until date is in the future
        while (nextDate < nowUTC) {
            nextDate.setUTCMonth(nextDate.getUTCMonth() + months);
        }
    } else {
        // Fallback default 1 year behavior
        const currentYear = nowUTC.getUTCFullYear();
        nextDate.setUTCFullYear(currentYear);
        if (nextDate < nowUTC) {
            nextDate.setUTCFullYear(currentYear + 1);
        }
    }

    return nextDate.toISOString().split('T')[0];
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

  // --- EMAIL LOGS OPERATIONS ---
  getEmailLogs: (): EmailLog[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS) || '[]');
    } catch { return []; }
  },

  saveEmailLog: (log: EmailLog) => {
    const logs = DB.getEmailLogs();
    logs.unshift(log); // Add to top
    if (logs.length > 500) logs.pop(); // Keep last 500
    localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(logs));
  },

  clearEmailLogs: () => {
    localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify([]));
  },

  // --- TEMPLATE OPERATIONS ---
  getTemplates: (): EmailTemplate[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES) || '[]');
    } catch { return DEFAULT_TEMPLATES; }
  },

  saveTemplate: (template: EmailTemplate) => {
    const templates = DB.getTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index !== -1) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  },

  // --- SETTINGS OPERATIONS ---
  getSettings: (): CompanySettings => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS));
      // Merge with defaults to ensure new fields exist
      const merged = { ...DEFAULT_SETTINGS, ...stored };
      
      // Ensure signatureConfig exists
      if (!merged.signatureConfig) merged.signatureConfig = DEFAULT_SIGNATURE;
      if (!merged.emailJsConfig) merged.emailJsConfig = DEFAULT_SETTINGS.emailJsConfig;
      if (!merged.emailProvider) merged.emailProvider = DEFAULT_SETTINGS.emailProvider;
      
      // Ensure new UI fields exist
      if (!merged.primaryHoverColor) merged.primaryHoverColor = DEFAULT_SETTINGS.primaryHoverColor;
      if (!merged.disabledColor) merged.disabledColor = DEFAULT_SETTINGS.disabledColor;
      if (!merged.fontScale) merged.fontScale = DEFAULT_SETTINGS.fontScale;
      if (!merged.borderRadius) merged.borderRadius = DEFAULT_SETTINGS.borderRadius;
      if (!merged.buttonBorderWidth) merged.buttonBorderWidth = DEFAULT_SETTINGS.buttonBorderWidth;
      
      // Ensure SEO setting exists
      if (typeof merged.allowSearchIndexing === 'undefined') {
          merged.allowSearchIndexing = DEFAULT_SETTINGS.allowSearchIndexing;
      }

      return merged;
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