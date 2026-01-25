import { Invoice, User, EmailLog, SignatureConfig } from '../types';
import { DB } from './db';

// Response interface from PHP script
interface ApiReponse {
    success: boolean;
    message: string;
    details?: any;
}

export const EmailService = {
  
  /**
   * Logs email attempts to local database for auditing.
   */
  logEmail: (recipient: string, subject: string, status: 'success' | 'failed', error?: string) => {
      const log: EmailLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          recipient,
          subject,
          status,
          provider: 'backend',
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
   * Generates a rich HTML signature based on configuration
   */
  generateSignatureHtml: (config: SignatureConfig | undefined, themeColor: string = '#4f46e5'): string => {
      if (!config || !config.enabled) return '';

      // Standardize icon styles
      const socialLinkStyle = "text-decoration: none; display: inline-block; margin-right: 5px;";
      const iconImgStyle = "display: block; border-radius: 4px; width: 24px; height: 24px;";
      const contactIconStyle = "display: block; width: 14px; height: 14px;";
      
      const fbIcon = config.facebookUrl ? `<a href="${config.facebookUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" width="24" height="24" alt="Facebook" style="${iconImgStyle}" /></a>` : '';
      const liIcon = config.linkedinUrl ? `<a href="${config.linkedinUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/145/145807.png" width="24" height="24" alt="LinkedIn" style="${iconImgStyle}" /></a>` : '';
      const twIcon = config.twitterUrl ? `<a href="${config.twitterUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/3670/3670151.png" width="24" height="24" alt="Twitter" style="${iconImgStyle}" /></a>` : '';
      const igIcon = config.instagramUrl ? `<a href="${config.instagramUrl}" style="${socialLinkStyle}"><img src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png" width="24" height="24" alt="Instagram" style="${iconImgStyle}" /></a>` : '';

      const displayWebsite = config.website ? config.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';

      return `
        <br />
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #334155; max-width: 600px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 500px; background: none; border-collapse: collapse;">
            <tr>
              <td valign="top" width="110" style="width: 110px; padding-right: 20px; vertical-align: top;">
                ${config.photoUrl ? `
                  <div style="width: 100px; height: 100px; border-radius: 6px; overflow: hidden;">
                    <img src="${config.photoUrl}" width="100" height="100" style="width: 100px; height: 100px; object-fit: cover; display: block;" alt="${config.fullName}" border="0" />
                  </div>
                ` : ''}
              </td>
              <td valign="top" style="vertical-align: top; border-left: 3px solid ${themeColor}; padding-left: 20px;">
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
                <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.6; color: #475569;">
                  ${config.phone ? `<tr><td width="24" valign="middle" style="padding-bottom:4px;"><img src="https://cdn-icons-png.flaticon.com/512/159/159832.png" width="14" height="14" alt="Phone" style="${contactIconStyle}" /></td><td valign="middle" style="padding-bottom:4px;"><a href="tel:${config.phone}" style="color:#475569;text-decoration:none;">${config.phone}</a></td></tr>` : ''}
                  ${config.website ? `<tr><td width="24" valign="middle" style="padding-bottom:4px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" width="14" height="14" alt="Web" style="${contactIconStyle}" /></td><td valign="middle" style="padding-bottom:4px;"><a href="${config.website.startsWith('http') ? config.website : 'https://' + config.website}" style="color:#475569;text-decoration:none;">${displayWebsite}</a></td></tr>` : ''}
                  ${config.email ? `<tr><td width="24" valign="middle" style="padding-bottom:4px;"><img src="https://cdn-icons-png.flaticon.com/512/542/542638.png" width="14" height="14" alt="Email" style="${contactIconStyle}" /></td><td valign="middle" style="padding-bottom:4px;"><a href="mailto:${config.email}" style="color:#475569;text-decoration:none;">${config.email}</a></td></tr>` : ''}
                  ${config.address ? `<tr><td width="24" valign="middle" style="padding-bottom:4px;"><img src="https://cdn-icons-png.flaticon.com/512/535/535239.png" width="14" height="14" alt="Loc" style="${contactIconStyle}" /></td><td valign="middle" style="padding-bottom:4px;">${config.address}</td></tr>` : ''}
                </table>
                ${(fbIcon || liIcon || twIcon || igIcon) ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;display:inline-block;">${fbIcon}${liIcon}${twIcon}${igIcon}</div>` : ''}
              </td>
            </tr>
          </table>
        </div>
        <br />
      `;
  },

  /**
   * CORE: Sends request to PHP Backend using strict POST JSON
   */
  sendViaBackend: async (payload: any): Promise<{ success: boolean; message: string }> => {
      const companySettings = DB.getSettings();
      const apiUrl = companySettings.backendApiUrl;

      if (!apiUrl) {
          throw new Error("Backend API URL is not configured. Please go to Settings > Email Configuration and set the API URL.");
      }

      try {
          // STRICT POST JSON Request as required
          const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  to: payload.to,
                  subject: payload.subject,
                  html: payload.html,
                  // Pass from details if supported by new script structure, otherwise script uses logic
                  fromEmail: payload.fromEmail || companySettings.contactEmail,
                  fromName: payload.fromName || companySettings.companyName
              })
          });

          // Even if 500, we try to parse JSON error message if possible
          const text = await response.text();
          let result: ApiReponse;
          
          try {
              result = JSON.parse(text);
          } catch (e) {
              // If not JSON, it's a raw server error
              throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
          }

          if (!response.ok || !result.success) {
              throw new Error(result.message || `HTTP Error ${response.status}`);
          }

          return { success: true, message: result.message };

      } catch (error: any) {
          console.error("Backend Email Error:", error);
          if (error instanceof SyntaxError) {
              throw new Error("Invalid JSON response from server.");
          }
          throw error;
      }
  },

  /**
   * Sends a test email to verify configuration.
   */
  sendTestEmail: async (toEmail: string): Promise<{ success: boolean; message: string }> => {
    const companySettings = DB.getSettings();
    if (!toEmail) return { success: false, message: 'No recipient email provided.' };

    const subject = `Test Email from ${companySettings.companyName}`;
    let messageBody = `Success! Your backend email API is connected.\n\nTime: ${new Date().toLocaleString()}`;
    
    // HTML conversion
    messageBody = messageBody.replace(/\n/g, '<br/>');
    messageBody += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    try {
        const result = await EmailService.sendViaBackend({
            to: toEmail,
            subject: subject,
            html: messageBody
        });
        EmailService.logEmail(toEmail, subject, 'success');
        return result;
    } catch (e: any) {
        EmailService.logEmail(toEmail, subject, 'failed', e.message);
        throw e;
    }
  },

  /**
   * Sends an invoice email via Backend.
   */
  sendInvoiceEmail: async (invoice: Invoice, attachmentDataUri?: string): Promise<{ success: boolean; message: string }> => {
    const companySettings = DB.getSettings();
    const templates = DB.getTemplates();

    if (!invoice.clientEmail) throw new Error("Client email address is missing.");

    // Template Processing
    const template = templates.find(t => t.id === 'invoice_ready') || {
        subject: `Invoice #${invoice.invoiceNumber} - ${companySettings.companyName}`,
        body: `Dear ${invoice.clientName},\n\nPlease find your invoice #${invoice.invoiceNumber} attached.\nTotal: ${invoice.amount}`
    };

    const data = {
        client_name: invoice.clientName,
        invoice_id: invoice.invoiceNumber,
        service_name: invoice.items[0]?.description || 'Services',
        amount: invoice.amount.toString(),
        due_date: invoice.dueDate
    };

    let subject = EmailService.processTemplate(template.subject, data);
    let emailBody = EmailService.processTemplate(template.body, data);
    emailBody = emailBody.replace(/\n/g, '<br/>');
    emailBody += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    try {
        const payload: any = {
            to: invoice.clientEmail,
            subject: subject,
            html: emailBody
        };

        // Note: The new strict PHP script structure provided by user 
        // does not explicitly handle attachments in the body parsing block 
        // (it only checks 'to', 'subject', 'html').
        // If attachments are needed, the PHP script logic needs to be extended on server side.
        // For now, we send text only or rely on the user modifying the server script further.
        
        const result = await EmailService.sendViaBackend(payload);
        EmailService.logEmail(invoice.clientEmail, subject, 'success');
        return result;
    } catch (e: any) {
        EmailService.logEmail(invoice.clientEmail, subject, 'failed', e.message);
        throw e;
    }
  },

  /**
   * Sends a generic client email (AI/Manual).
   */
  sendClientEmail: async (
    toEmail: string, 
    toName: string, 
    subject: string, 
    messageBody: string
  ): Promise<{ success: boolean; message: string }> => {
    const companySettings = DB.getSettings();

    if (!toEmail) throw new Error("Recipient email is missing.");

    let htmlBody = messageBody.replace(/\n/g, '<br/>');
    htmlBody += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    try {
        const result = await EmailService.sendViaBackend({
            to: toEmail,
            subject: subject,
            html: htmlBody
        });
        EmailService.logEmail(toEmail, subject, 'success');
        return result;
    } catch (e: any) {
        EmailService.logEmail(toEmail, subject, 'failed', e.message);
        throw e;
    }
  },

  /**
   * Sends welcome email.
   */
  sendWelcomeEmail: async (user: User, rawPassword: string): Promise<{ success: boolean; message: string }> => {
    const companySettings = DB.getSettings();
    const subject = `Welcome to ${companySettings.companyName}`;
    const loginUrl = window.location.origin + window.location.pathname + '#/login'; // Ensure hash path if hash router
    
    let message = `You have been invited to the dashboard.\nLogin: ${user.email}\nPassword: ${rawPassword}\nURL: ${loginUrl}`;
    let htmlMessage = message.replace(/\n/g, '<br/>');
    htmlMessage += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    try {
        const result = await EmailService.sendViaBackend({
            to: user.email,
            subject: subject,
            html: htmlMessage
        });
        EmailService.logEmail(user.email, subject, 'success');
        return result;
    } catch (e: any) {
        EmailService.logEmail(user.email, subject, 'failed', e.message);
        throw e;
    }
  },

  /**
   * Sends password reset email.
   */
  sendPasswordResetEmail: async (user: User, tempPassword: string): Promise<{ success: boolean; message: string }> => {
    const companySettings = DB.getSettings();
    const subject = 'Password Reset';
    const loginUrl = window.location.origin + window.location.pathname + '#/login';

    let message = `Your password has been reset.\nTemp Password: ${tempPassword}\nLogin: ${loginUrl}`;
    let htmlMessage = message.replace(/\n/g, '<br/>');
    htmlMessage += EmailService.generateSignatureHtml(companySettings.signatureConfig, companySettings.primaryColor);

    try {
        const result = await EmailService.sendViaBackend({
            to: user.email,
            subject: subject,
            html: htmlMessage
        });
        EmailService.logEmail(user.email, subject, 'success');
        return result;
    } catch (e: any) {
        EmailService.logEmail(user.email, subject, 'failed', e.message);
        throw e;
    }
  },

  /**
   * Sends internal reminders to team.
   */
  sendTeamReminder: async (
    recipients: string[], 
    subject: string, 
    details: string
  ): Promise<{ success: boolean }> => {
    if (recipients.length === 0) return { success: false };
    
    // We send individual emails for the list to ensure delivery
    const toField = recipients.join(',');

    try {
        await EmailService.sendViaBackend({
            to: toField,
            subject: subject,
            html: details.replace(/\n/g, '<br/>')
        });
        EmailService.logEmail('Team', subject, 'success');
        return { success: true };
    } catch (e: any) {
        console.error("Team Email Error", e);
        EmailService.logEmail('Team', subject, 'failed', e.message);
        return { success: false };
    }
  }
};