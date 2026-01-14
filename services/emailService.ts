import { Invoice, SMTPSettings, User, Client, DomainClient, EmailLog } from '../types';
import { DB } from './db';
import emailjs from '@emailjs/browser';

export const EmailService = {
  
  validateSettings: (settings: SMTPSettings): { valid: boolean; error?: string } => {
    if (!settings.host) return { valid: false, error: 'SMTP Host is required.' };
    if (!settings.port) return { valid: false, error: 'SMTP Port is required.' };
    if (!settings.username) return { valid: false, error: 'Username is required.' };
    if (!settings.fromEmail) return { valid: false, error: 'Sender Email is required.' };
    return { valid: true };
  },

  validateEmailJS: (config: { serviceId: string, templateId: string, publicKey: string }): { valid: boolean; error?: string } => {
    if (!config.serviceId) return { valid: false, error: 'Service ID is required.' };
    if (!config.templateId) return { valid: false, error: 'Template ID is required.' };
    if (!config.publicKey) return { valid: false, error: 'Public Key is required.' };
    return { valid: true };
  },

  logEmail: (recipient: string, subject: string, status: 'success' | 'failed', provider: 'emailjs' | 'simulation', error?: string) => {
      const log: EmailLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          recipient,
          subject,
          status,
          provider,
          error
      };
      DB.saveEmailLog(log);
  },

  /**
   * Sends a test email to verify configuration.
   */
  sendTestEmail: async (toEmail: string): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';

    if (!toEmail) return { success: false, message: 'No recipient email provided.' };

    const subject = `Test Email from ${companySettings.companyName}`;
    const messageBody = `Success! Your email configuration is working correctly.\n\nProvider: ${provider === 'emailjs' ? 'EmailJS' : 'Simulation Mode'}\nTime: ${new Date().toLocaleString()}`;

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        const validation = EmailService.validateEmailJS(config);
        if (!validation.valid) return { success: false, message: validation.error || 'Invalid Config' };

        try {
            const templateParams = {
                to_email: toEmail,
                to_name: 'Admin',
                from_name: 'System Test',
                subject: subject,
                message: messageBody
            };

            await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
            EmailService.logEmail(toEmail, subject, 'success', 'emailjs');
            return { success: true, message: `Test email sent to ${toEmail}` };
        } catch (error: any) {
            console.error("EmailJS Error:", error);
            EmailService.logEmail(toEmail, subject, 'failed', 'emailjs', error.text || error.message);
            return { success: false, message: `EmailJS Failed: ${error.text || error.message}` };
        }
    }

    // --- SIMULATION ---
    EmailService.logEmail(toEmail, subject, 'success', 'simulation');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.group('📧 [SMTP SIMULATION] Test Email');
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${messageBody}`);
        console.groupEnd();
        resolve({ success: true, message: `[SIMULATION] Test email logged to console (F12).` });
      }, 1000);
    });
  },

  /**
   * Sends an invoice email via selected provider (Simulation or EmailJS).
   * Supports PDF attachment via Base64 string.
   */
  sendInvoiceEmail: async (invoice: Invoice, attachmentDataUri?: string): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';

    if (!invoice.clientEmail) {
      throw new Error("Client email address is missing.");
    }

    const subject = `Invoice #${invoice.invoiceNumber} - ${companySettings.companyName}`;

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        const validation = EmailService.validateEmailJS(config);
        if (!validation.valid) throw new Error(`EmailJS Config Error: ${validation.error}`);

        try {
            let emailBody = `
Dear ${invoice.clientName},

This is a payment reminder for Invoice #${invoice.invoiceNumber}.

INVOICE DETAILS:
--------------------------------
Invoice Number: ${invoice.invoiceNumber}
Amount Due:     ${invoice.amount}
Due Date:       ${invoice.dueDate}
Status:         ${invoice.status}
Service:        ${invoice.items[0]?.description || 'Hosting Services'}
--------------------------------

Please login to your dashboard or contact us to make a payment.

${companySettings.emailSignature || ''}`;

            const templateParams: Record<string, any> = {
                to_email: invoice.clientEmail,
                to_name: invoice.clientName,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: emailBody,
                invoice_number: invoice.invoiceNumber,
                amount: invoice.amount,
                due_date: invoice.dueDate
            };

            // Attach PDF if provided and within size limit
            if (attachmentDataUri) {
                // EmailJS Variable Size Limit is approx 50KB.
                // We enforce a safe limit of 40,000 characters for the attachment variable 
                // to allow space for other text parameters.
                if (attachmentDataUri.length > 40000) {
                    console.warn(`[EmailJS] Attachment too large (${attachmentDataUri.length} chars). Limit is ~40k chars. Sending without attachment.`);
                    templateParams.message += `\n\n[NOTE: The invoice PDF was too large to attach directly. Please verify the details in your dashboard.]`;
                } else {
                    // EmailJS requires raw base64 without the data URI prefix
                    const base64Content = attachmentDataUri.split(',')[1];
                    templateParams.content = base64Content;
                    templateParams.attachment = base64Content; 
                    templateParams.file_name = `Invoice-${invoice.invoiceNumber}.pdf`;
                }
            }

            await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
            EmailService.logEmail(invoice.clientEmail, subject, 'success', 'emailjs');
            return { success: true, message: `Email sent via EmailJS to ${invoice.clientEmail}` };
        } catch (error: any) {
            console.error("EmailJS Error:", error);
            EmailService.logEmail(invoice.clientEmail, subject, 'failed', 'emailjs', error.text || error.message);
            throw new Error(`EmailJS Failed: ${error.text || error.message}`);
        }
    }

    // --- SIMULATION (CONSOLE) ---
    // Validate configuration first
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Configuration Error: ${validation.error} Please configure SMTP in Settings.`);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Randomly simulate a connection error (5% chance) for realism in testing
        const isConnected = true; 

        if (isConnected) {
          console.group(`📧 [SMTP SIMULATION] Invoice #${invoice.invoiceNumber}`);
          console.log(`Connecting to ${settings.host}:${settings.port}...`);
          console.log(`Sending to: ${invoice.clientEmail}`);
          console.log(`Subject: ${subject}`);
          console.log(`Body Preview: Dear ${invoice.clientName}, Please find details below...`);
          if (attachmentDataUri) {
              const sizeInKb = Math.round((attachmentDataUri.length * 0.75) / 1024);
              console.log(`📎 Attachment: Invoice-${invoice.invoiceNumber}.pdf (${sizeInKb} KB)`);
          }
          console.groupEnd();
          
          EmailService.logEmail(invoice.clientEmail, subject, 'success', 'simulation');
          resolve({ 
            success: true, 
            message: `[SIMULATION] Invoice #${invoice.invoiceNumber} sent successfully to ${invoice.clientEmail}` 
          });
        } else {
          EmailService.logEmail(invoice.clientEmail, subject, 'failed', 'simulation', 'Connection Error');
          reject(new Error("Failed to connect to SMTP server. Check credentials."));
        }

      }, 2000);
    });
  },

  /**
   * Sends a generic client email (used by AI Assistant).
   */
  sendClientEmail: async (
    toEmail: string, 
    toName: string, 
    subject: string, 
    messageBody: string
  ): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';

    if (!toEmail) throw new Error("Recipient email is missing.");

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        const validation = EmailService.validateEmailJS(config);
        if (!validation.valid) throw new Error(`EmailJS Config Error: ${validation.error}`);

        try {
            const templateParams = {
                to_email: toEmail,
                to_name: toName,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: messageBody
            };

            await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
            EmailService.logEmail(toEmail, subject, 'success', 'emailjs');
            return { success: true, message: `Email sent via EmailJS to ${toEmail}` };
        } catch (error: any) {
            console.error("EmailJS Error:", error);
            EmailService.logEmail(toEmail, subject, 'failed', 'emailjs', error.text || error.message);
            throw new Error(`EmailJS Failed: ${error.text || error.message}`);
        }
    }

    // --- SIMULATION ---
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Configuration Error: ${validation.error}`);
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        console.group(`📧 [SMTP SIMULATION] Client Email`);
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${messageBody.substring(0, 50)}...`);
        console.groupEnd();
        EmailService.logEmail(toEmail, subject, 'success', 'simulation');
        resolve({ success: true, message: `Email sent successfully to ${toEmail}` });
      }, 1500);
    });
  },

  /**
   * Sends welcome email with credentials to new team members.
   */
  sendWelcomeEmail: async (user: User, rawPassword: string): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';
    const subject = `Welcome to ${companySettings.companyName}`;
    
    const loginUrl = window.location.origin + '/login';

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        if (EmailService.validateEmailJS(config).valid) {
             const templateParams = {
                to_email: user.email,
                to_name: user.name,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: `You have been invited to the dashboard.\nLogin: ${user.email}\nPassword: ${rawPassword}\nURL: ${loginUrl}`
            };
            try {
                await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
                EmailService.logEmail(user.email, subject, 'success', 'emailjs');
                return { success: true, message: `Welcome email sent to ${user.email}` };
            } catch (e: any) {
                EmailService.logEmail(user.email, subject, 'failed', 'emailjs', e.message);
                throw e;
            }
        }
    }

    // --- SIMULATION ---
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`SMTP Error: ${validation.error}`);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.group(`📧 [SMTP SIMULATION] Welcome Email`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Credentials: ${user.email} / ${rawPassword}`);
        console.groupEnd();
        
        EmailService.logEmail(user.email, subject, 'success', 'simulation');
        resolve({ 
          success: true, 
          message: `Welcome email sent to ${user.email}` 
        });
      }, 1500);
    });
  },

  /**
   * Sends password reset email with temporary credentials.
   */
  sendPasswordResetEmail: async (user: User, tempPassword: string): Promise<{ success: boolean; message: string }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';
    const subject = 'Password Reset';

    const loginUrl = window.location.origin + '/login';

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        if (EmailService.validateEmailJS(config).valid) {
             const templateParams = {
                to_email: user.email,
                to_name: user.name,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: `Your password has been reset.\nTemp Password: ${tempPassword}\nLogin: ${loginUrl}`
            };
            try {
                await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
                EmailService.logEmail(user.email, subject, 'success', 'emailjs');
                return { success: true, message: `Reset email sent to ${user.email}` };
            } catch (e: any) {
                EmailService.logEmail(user.email, subject, 'failed', 'emailjs', e.message);
                throw e;
            }
        }
    }

    // --- SIMULATION ---
    if (!settings.host) return { success: false, message: 'SMTP not configured' };

    return new Promise((resolve) => {
      setTimeout(() => {
        console.group(`📧 [SMTP SIMULATION] Password Reset`);
        console.log(`To: ${user.email}`);
        console.log(`Temp Pass: ${tempPassword}`);
        console.groupEnd();
        
        EmailService.logEmail(user.email, subject, 'success', 'simulation');
        resolve({ 
          success: true, 
          message: `Reset email sent to ${user.email}` 
        });
      }, 1500);
    });
  },

  /**
   * Sends internal reminders to the team about renewals or overdue items.
   */
  sendTeamReminder: async (
    recipients: string[], 
    subject: string, 
    details: string
  ): Promise<{ success: boolean }> => {
    const settings = DB.getSMTPSettings();
    const companySettings = DB.getSettings();
    const provider = companySettings.emailProvider || 'simulation';
    
    // Flatten recipients for log if simulation, or send individually for real?
    // Here we treat them as a batch.
    const recipientsStr = recipients.join(',');

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        
        if (EmailService.validateEmailJS(config).valid) {
             const templateParams = {
                to_email: recipientsStr, 
                to_name: 'Team',
                from_name: 'System Bot',
                subject: subject,
                message: details
            };

            try {
                await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
                EmailService.logEmail(recipientsStr, subject, 'success', 'emailjs');
                return { success: true };
            } catch (e: any) {
                console.error("Background EmailJS Error:", e);
                EmailService.logEmail(recipientsStr, subject, 'failed', 'emailjs', e.message);
                return { success: false };
            }
        }
        return { success: false };
    }

    // --- SIMULATION ---
    if (!settings.host || recipients.length === 0) return { success: false };

    return new Promise((resolve) => {
      setTimeout(() => {
        console.group(`📧 [SMTP SIMULATION] Team Auto-Reminder`);
        console.log(`Recipients: ${recipientsStr}`);
        console.log(`Subject: ${subject}`);
        console.log(`Details: ${details.substring(0, 50)}...`);
        console.groupEnd();
        EmailService.logEmail(recipientsStr, subject, 'success', 'simulation');
        resolve({ success: true });
      }, 500); 
    });
  }
};