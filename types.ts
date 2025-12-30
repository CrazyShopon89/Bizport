// Fix: Import React to resolve namespace error for React.ReactNode
import React from 'react';

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

export type UserRole = 'Admin' | 'Manager' | 'Team Member';

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
  password?: string; // In a real app, this wouldn't be on the client
}

export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  iconUrl?: string; // Small icon for sidebar/favicon
  contactEmail: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  currency: string;
  currencySymbol: string;
  currencyPosition: 'left' | 'right';
}

export interface SMTPSettings {
  host: string;
  port: string;
  encryption: 'TLS' | 'SSL' | 'None';
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
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
  amount: number;
  paymentMethod: string; // Changed to string
  paymentStatus: string; // Changed to string
  status: string; // Changed to string
  invoiceNumber?: string;
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
  type: 'system' | 'invoice' | 'payment' | 'hosting' | 'profile' | 'team';
  timestamp: string;
  isRead: boolean;
}