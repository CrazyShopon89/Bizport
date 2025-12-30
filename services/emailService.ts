import { Invoice, SMTPSettings } from '../types';
import { DB } from './db';

export const EmailService = {
  
  validateSettings: (settings: SMTPSettings): { valid: boolean; error?: string } => {
    if (!settings.host) return { valid: false, error: 'SMTP Host is required.' };
    if (!settings.port) return { valid: false, error: 'SMTP Port is required.' };
    if (!settings.username) return { valid: false, error: 'Username is required.' };
    if (!settings.fromEmail) return { valid: false, error: 'Sender Email is required.' };
    return { valid: true };
  },

  /**
   * Simulates sending an invoice via SMTP.
   * In a real React app, this would make an API call to a backend (Node/Laravel) 
   * which then uses the SMTP credentials to send the email.
   */
  sendInvoiceEmail: async (invoice: Invoice): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    
    // Validate configuration first
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Configuration Error: ${validation.error} Please configure SMTP in Settings.`);
    }

    if (!invoice.clientEmail) {
      throw new Error("Client email address is missing.");
    }

    // Simulate network delay and sending process
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        
        // Randomly simulate a connection error (5% chance) for realism in testing, or always succeed for demo
        const isConnected = true; 

        if (isConnected) {
          console.log(`[SMTP SIMULATION] Connecting to ${settings.host}:${settings.port}...`);
          console.log(`[SMTP SIMULATION] Authenticating as ${settings.username}...`);
          console.log(`[SMTP SIMULATION] Sending email to ${invoice.clientEmail} from ${settings.fromEmail}...`);
          console.log(`[SMTP SIMULATION] Subject: Invoice #${invoice.invoiceNumber}`);
          
          resolve({ 
            success: true, 
            message: `Invoice #${invoice.invoiceNumber} sent successfully to ${invoice.clientEmail}` 
          });
        } else {
          reject(new Error("Failed to connect to SMTP server. Check credentials."));
        }

      }, 2000);
    });
  }
};