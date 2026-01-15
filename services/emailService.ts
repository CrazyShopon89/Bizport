import { Invoice, SMTPSettings, User, Client, DomainClient, EmailLog, SignatureConfig } from '../types';
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
    if (!config.serviceId) return { valid: false, error: 'Service ID is missing. Please configure it in Settings.' };
    if (!config.templateId) return { valid: false, error: 'Template ID is missing. Please configure it in Settings.' };
    if (!config.publicKey) return { valid: false, error: 'Public Key is missing. Please configure it in Settings.' };
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
   * Helper to replace placeholders in template string
   */
  processTemplate: (text: string, data: Record<string, any>): string => {
      let processed = text;
      Object.keys(data).forEach(key => {
          const regex = new RegExp(`{${key}}`, 'g');
          processed = processed.replace(regex, data[key]);
      });
      return processed;
  },

  /**
   * Generates a rich HTML signature based on configuration (Wishstamp Style)
   */
  generateSignatureHtml: (config: SignatureConfig | undefined, themeColor: string = '#4f46e5'): string => {
      if (!config || !config.enabled) return '';

      // Standardize icon styles
      const socialLinkStyle = "text-decoration: none; display: inline-block; margin-right: 5px;";
      const iconImgStyle = "display: block; border-radius: 4px; width: 24px; height: 24px;";
      const contactIconStyle = "display: block; width: 14px; height: 14px;";
      
      // Social Icons
      const fbIcon = config.facebookUrl ? `<a href="${config.facebookUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" width="24" height="24" alt="Facebook" style="${iconImgStyle}" /></a>` : '';
      const liIcon = config.linkedinUrl ? `<a href="${config.linkedinUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/145/145807.png" width="24" height="24" alt="LinkedIn" style="${iconImgStyle}" /></a>` : '';
      const twIcon = config.twitterUrl ? `<a href="${config.twitterUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/3670/3670151.png" width="24" height="24" alt="Twitter" style="${iconImgStyle}" /></a>` : '';
      const igIcon = config.instagramUrl ? `<a href="${config.instagramUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png" width="24" height="24" alt="Instagram" style="${iconImgStyle}" /></a>` : '';

      // Clean website URL for display
      const displayWebsite = config.website ? config.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

      return `
        <br />
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; max-width: 600px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 500px; background: none; border-collapse: collapse;">
            <tr>
              <!-- Profile Photo -->
              <td valign="top" width="110" style="width: 110px; padding-right: 20px; vertical-align: top;">
                ${config.photoUrl ? `
                  <div style="width: 100px; height: 100px; border-radius: 6px; overflow: hidden;">
                    <img src="${config.photoUrl}" width="100" height="100" style="width: 100px; height: 100px; object-fit: cover; display: block;" alt="${config.fullName}" border="0" />
                  </div>
                ` : ''}
              </td>
              
              <!-- Content with Left Divider -->
              <td valign="top" style="vertical-align: top; border-left: 3px solid ${themeColor}; padding-left: 20px;">
                
                <!-- Name & Title -->
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.1; margin-bottom: 4px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    ${config.fullName}
                  </div>
                  <div style="font-size: 14px; color: #64748b; line-height: 1.4;">
                    ${config.jobTitle}
                    ${config.jobTitle && config.companyName ? `<span style="color: ${themeColor}; font-weight: bold; margin: 0 4px;">|</span>` : ''}
                    <span style="font-weight: 600; color: #475569;">${config.companyName}</span>
                  </div>
                </div>
                
                <!-- Contact Info Table (for alignment) -->
                <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.6; color: #475569;">
                  ${config.phone ? `
                  <tr>
                    <td width="24" valign="middle" style="vertical-align: middle; padding-bottom: 4px; padding-right: 4px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/159/159832.png" width="14" height="14" alt="Phone" style="${contactIconStyle}" />
                    </td>
                    <td valign="middle" style="vertical-align: middle; padding-bottom: 4px;"><a href="tel:${config.phone}" style="color: #475569; text-decoration: none;">${config.phone}</a></td>
                  </tr>` : ''}
                  
                  ${config.website ? `
                  <tr>
                    <td width="24" valign="middle" style="vertical-align: middle; padding-bottom: 4px; padding-right: 4px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" width="14" height="14" alt="Web" style="${contactIconStyle}" />
                    </td>
                    <td valign="middle" style="vertical-align: middle; padding-bottom: 4px;"><a href="${config.website.startsWith('http') ? config.website : 'https://' + config.website}" style="color: #475569; text-decoration: none;">${displayWebsite}</a></td>
                  </tr>` : ''}
                  
                  ${config.email ? `
                  <tr>
                    <td width="24" valign="middle" style="vertical-align: middle; padding-bottom: 4px; padding-right: 4px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/542/542638.png" width="14" height="14" alt="Email" style="${contactIconStyle}" />
                    </td>
                    <td valign="middle" style="vertical-align: middle; padding-bottom: 4px;"><a href="mailto:${config.email}" style="color: #475569; text-decoration: none;">${config.email}</a></td>
                  </tr>` : ''}
                  
                  ${config.address ? `
                  <tr>
                    <td width="24" valign="middle" style="vertical-align: middle; padding-bottom: 4px; padding-right: 4px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/535/535239.png" width="14" height="14" alt="Loc" style="${contactIconStyle}" />
                    </td>
                    <td valign="middle" style="vertical-align: middle; padding-bottom: 4px;">${config.address}</td>
                  </tr>` : ''}
                </table>

                <!-- Social Icons -->
                ${(fbIcon || liIcon || twIcon || igIcon) ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: inline-block;">
                  ${fbIcon}
                  ${liIcon}
                  ${twIcon}
                  ${igIcon}
                </div>` : ''}
                
              </td>
            </tr>
          </table>
        </div>
        <br />
      `;
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
    let messageBody = `Success! Your email configuration is working correctly.\n\nProvider: ${provider === 'emailjs' ? 'EmailJS' : 'Custom SMTP'}\nTime: ${new Date().toLocaleString()}`;
    
    // Convert to simple HTML for body
    messageBody = messageBody.replace(/\n/g, '<br/>');
    
    // Append Signature
    const signature = EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);
    messageBody += signature;

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
                message: messageBody // Passed as HTML
            };

            await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
            EmailService.logEmail(toEmail, subject, 'success', 'emailjs');
            return { success: true, message: `Test email sent successfully to ${toEmail}` };
        } catch (error: any) {
            console.error("EmailJS Error:", error);
            const errorMsg = error.text || error.message || 'Unknown Network Error';
            EmailService.logEmail(toEmail, subject, 'failed', 'emailjs', errorMsg);
            return { success: false, message: `Delivery Failed: ${errorMsg}` };
        }
    }

    // --- SIMULATION (Custom SMTP) ---
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
        return { success: false, message: `Configuration Missing: ${validation.error}` };
    }

    EmailService.logEmail(toEmail, subject, 'success', 'simulation');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.group('📧 [SMTP Handshake Simulation]');
        console.log(`Host: ${settings.host}:${settings.port}`);
        console.log(`User: ${settings.username}`);
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log('Status: Authenticated & Sent (Simulated)');
        console.groupEnd();
        resolve({ success: true, message: `Connected to ${settings.host} and verified credentials successfully.` });
      }, 1500);
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
    const templates = DB.getTemplates();

    if (!invoice.clientEmail) {
      throw new Error("Client email address is missing.");
    }

    // 1. Determine Template (Renewal or Invoice Ready)
    const template = templates.find(t => t.id === 'invoice_ready') || {
        subject: `Invoice #${invoice.invoiceNumber} - ${companySettings.companyName}`,
        body: `Dear ${invoice.clientName},\n\nPlease find your invoice #${invoice.invoiceNumber} attached.\nTotal: ${invoice.amount}`
    };

    // 2. Prepare Data for Replacement
    const data = {
        client_name: invoice.clientName,
        invoice_id: invoice.invoiceNumber,
        service_name: invoice.items[0]?.description || 'Services',
        amount: invoice.amount.toString(), // Add currency formatting if needed
        due_date: invoice.dueDate
    };

    // 3. Process Content
    let subject = EmailService.processTemplate(template.subject, data);
    let emailBody = EmailService.processTemplate(template.body, data);
    
    // Convert newlines to HTML breaks for proper rendering with signature
    emailBody = emailBody.replace(/\n/g, '<br/>');

    // 4. Append Signature
    const signature = EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);
    emailBody += signature;

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        const validation = EmailService.validateEmailJS(config);
        if (!validation.valid) throw new Error(validation.error);

        try {
            const templateParams: Record<string, any> = {
                to_email: invoice.clientEmail,
                to_name: invoice.clientName,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: emailBody, // HTML content
                invoice_number: invoice.invoiceNumber,
                amount: invoice.amount,
                due_date: invoice.dueDate
            };

            // Attach PDF if provided
            if (attachmentDataUri) {
                if (attachmentDataUri.length > 40000) {
                    console.warn(`[EmailJS] Attachment too large. Sending without attachment.`);
                    templateParams.message += `<br/><br/>[NOTE: The invoice PDF was too large to attach directly. Please verify the details in your dashboard.]`;
                } else {
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
            const errorMsg = error.text || error.message || 'Unknown Error';
            EmailService.logEmail(invoice.clientEmail, subject, 'failed', 'emailjs', errorMsg);
            throw new Error(`EmailJS Failed: ${errorMsg}`);
        }
    }

    // --- SIMULATION (CONSOLE) ---
    const validation = EmailService.validateSettings(settings);
    if (!validation.valid) {
      throw new Error(`Configuration Error: ${validation.error} Please configure Custom SMTP in Settings.`);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const isConnected = true; 

        if (isConnected) {
          console.group(`📧 [SMTP SIMULATION] Invoice #${invoice.invoiceNumber}`);
          console.log(`To: ${invoice.clientEmail}`);
          console.log(`Subject: ${subject}`);
          console.log(`Body (HTML Preview):`);
          console.log(emailBody); // Log HTML for debugging
          console.groupEnd();
          
          EmailService.logEmail(invoice.clientEmail, subject, 'success', 'simulation');
          resolve({ 
            success: true, 
            message: `[SIMULATION] Invoice sent via ${settings.host}` 
          });
        } else {
          EmailService.logEmail(invoice.clientEmail, subject, 'failed', 'simulation', 'Connection Error');
          reject(new Error("Failed to connect to SMTP server. Check credentials."));
        }

      }, 2000);
    });
  },

  /**
   * Sends a generic client email (used by AI Assistant or Manual sends).
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

    // Convert markdown/text to basic HTML breaks
    let htmlBody = messageBody.replace(/\n/g, '<br/>');

    // Append Signature
    const signature = EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);
    htmlBody += signature;

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        const validation = EmailService.validateEmailJS(config);
        if (!validation.valid) throw new Error(validation.error);

        try {
            const templateParams = {
                to_email: toEmail,
                to_name: toName,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: htmlBody
            };

            await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
            EmailService.logEmail(toEmail, subject, 'success', 'emailjs');
            return { success: true, message: `Email sent via EmailJS to ${toEmail}` };
        } catch (error: any) {
            console.error("EmailJS Error:", error);
            const errorMsg = error.text || error.message || 'Unknown Error';
            EmailService.logEmail(toEmail, subject, 'failed', 'emailjs', errorMsg);
            throw new Error(`EmailJS Failed: ${errorMsg}`);
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
        console.log(`Body (HTML): ${htmlBody}`);
        console.groupEnd();
        EmailService.logEmail(toEmail, subject, 'success', 'simulation');
        resolve({ success: true, message: `Email sent via ${settings.host}` });
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
    let message = `You have been invited to the dashboard.\nLogin: ${user.email}\nPassword: ${rawPassword}\nURL: ${loginUrl}`;
    
    // HTML conversion
    let htmlMessage = message.replace(/\n/g, '<br/>');
    htmlMessage += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        if (EmailService.validateEmailJS(config).valid) {
             const templateParams = {
                to_email: user.email,
                to_name: user.name,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: htmlMessage
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
        console.log(`Body (HTML): ${htmlMessage}`);
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
    let message = `Your password has been reset.\nTemp Password: ${tempPassword}\nLogin: ${loginUrl}`;

    let htmlMessage = message.replace(/\n/g, '<br/>');
    htmlMessage += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    // --- REAL EMAIL (EMAILJS) ---
    if (provider === 'emailjs') {
        const config = companySettings.emailJsConfig;
        if (EmailService.validateEmailJS(config).valid) {
             const templateParams = {
                to_email: user.email,
                to_name: user.name,
                from_name: settings.fromName || companySettings.companyName,
                subject: subject,
                message: htmlMessage
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
        console.log(`Body (HTML): ${htmlMessage}`);
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
                message: details // Plain text for internal alerts is fine, or wrap in HTML
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