// Fix: Import React to resolve namespace error for React.ReactNode
import React from 'react';

export const COUNTRY_CODES = [
  { code: '+1', country: 'US' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'IN' },
  { code: '+880', country: 'BD' },
  { code: '+61', country: 'AU' },
  { code: '+81', country: 'JP' },
  { code: '+49', country: 'DE' },
  { code: '+33', country: 'FR' },
  { code: '+971', country: 'UAE' },
  { code: '+86', country: 'CN' },
  { code: '+55', country: 'BR' },
  { code: '+65', country: 'SG' },
  { code: '+60', country: 'MY' },
];

export enum Status {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  PENDING = 'Pending',
  SUSPENDED = 'Suspended'
}

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  OVERDUE = 'Overdue'
}

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Member';

export interface DataFields {
  statuses: string[];
  paymentMethods: string[];
  invoiceStatuses: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  password?: string; // Stored as hash
  forcePasswordChange?: boolean;
  failedLoginAttempts?: number;
  lockUntil?: string; // ISO Date string
}

export type EmailProvider = 'simulation' | 'emailjs';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface SignatureConfig {
  enabled: boolean;
  fullName: string;
  jobTitle: string;
  companyName: string;
  phone: string;
  website: string;
  email: string;
  address: string;
  photoUrl: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
}

export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  iconUrl?: string; // Small icon for sidebar/favicon
  contactEmail: string;
  phone: string;
  address: string;
  
  // Branding
  primaryColor: string;
  primaryHoverColor?: string; // New
  disabledColor?: string; // New
  secondaryColor: string;
  
  // Typography & UI
  font: string;
  fontScale?: number; // New (1.0 = 16px)
  borderRadius?: string; // New (e.g. '0.5rem')
  buttonBorderWidth?: string; // New (e.g. '1px')
  
  currency: string;
  currencySymbol: string;
  currencyPosition: 'left' | 'right';
  defaultHostingRenewalPeriod?: string;
  defaultDomainRenewalPeriod?: string;
  renewalNotificationDays?: number; // Days before renewal to generate invoice/notification
  
  emailSignature?: string; // Legacy text signature (kept for backward compat)
  signatureConfig?: SignatureConfig; // New structured signature
  
  emailProvider: EmailProvider;
  emailJsConfig: EmailJSConfig;
  allowSearchIndexing?: boolean; // New SEO setting
  
  // Backup Config
  backupSchedule?: 'daily' | 'weekly' | 'monthly' | 'disabled';
  backupRetentionCount?: number;
}

export interface SMTPSettings {
  host: string;
  port: string;
  encryption: 'TLS' | 'SSL' | 'None';
  username: string;
  password: string; // Stored encrypted/obfuscated
  fromName: string;
  fromEmail: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  description: string;
  placeholders: string[];
}

export interface Client {
  id: string;
  sl: number;
  clientName: string;
  website: string;
  validationDate: string;
  email: string;
  phone: string;
  status: string; // Changed from Status to string for dynamic fields
  storageGB: number;
  setupDate: string;
  amount: number;
  invoiceNumber: string;
  invoiceDate: string;
  paidDate?: string;
  sendingDate?: string;
  paymentStatus: string; // Changed from PaymentStatus to string
  invoiceStatus: string; // Changed to string
  paymentMethod: string; // Changed to string
  nextRenewalDate: string;
  renewalPeriod?: string; // Specific renewal period for this client
}

export interface DomainClient {
  id: string;
  sl: number;
  clientName: string;
  email: string;
  phone: string;
  domainName: string;
  registrar?: string;
  purchaseDate: string;
  expiryDate: string;
  validationDate: string;
  amount: number;
  paymentMethod: string; // Changed to string
  paymentStatus: string; // Changed to string
  status: string; // Changed to string
  invoiceNumber?: string;
  invoiceDate?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  status: string; // Changed to string
  type: 'Hosting Renew' | 'Domain Renew';
  amount: number;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'invoice' | 'payment' | 'hosting' | 'profile' | 'team' | 'backup';
  timestamp: string;
  isRead: boolean;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'success' | 'failed';
  provider: 'emailjs' | 'simulation';
  error?: string;
}

export interface BackupMeta {
  id: string;
  filename: string;
  sizeMB: string;
  created: string; // ISO
  type: 'Manual' | 'Daily' | 'Weekly' | 'Monthly';
  status: 'Completed' | 'Failed';
  location: string;
  checksum: string; // Integrity hash simulation
}