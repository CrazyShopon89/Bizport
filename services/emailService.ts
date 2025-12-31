import { Invoice, SMTPSettings, User } from '../types';
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
  },

  /**
   * Sends welcome email with credentials to new team members.
   */
  sendWelcomeEmail: async (user: User, rawPassword: string): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`SMTP Error: ${validation.error}`);
    }

    const loginUrl = window.location.origin + '/login';

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log(`[SMTP SIMULATION] --- Sending Welcome Email ---`);
        console.log(`[SMTP SIMULATION] To: ${user.email}`);
        console.log(`[SMTP SIMULATION] Subject: Welcome to ${companySettings.companyName} Team`);
        console.log(`[SMTP SIMULATION] Body:
          Hello ${user.name},
          
          You have been invited to join the ${companySettings.companyName} management dashboard.
          
          Here are your login credentials:
          Username: ${user.email}
          Temporary Password: ${rawPassword}
          
          Login here: ${loginUrl}
          
          Please change your password immediately after logging in.
        `);
        
        resolve({ 
          success: true, 
          message: `Welcome email sent to ${user.email}` 
        });
      }, 1500);
    });
  }
};