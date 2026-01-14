import { InvoiceService } from './invoiceService';
import { DB } from './db';

const STORAGE_KEYS = {
  LAST_RUN: 'hm_automation_last_run'
};

export const SchedulerService = {
  /**
   * Runs daily automation tasks if they haven't run in the last 24 hours (or current calendar day).
   * Returns a summary of actions taken.
   */
  runDailyTasks: async (force: boolean = false): Promise<{ invoices: number, emails: number, run: boolean }> => {
    const lastRun = localStorage.getItem(STORAGE_KEYS.LAST_RUN);
    const today = new Date().toDateString(); // "Mon Jan 01 2024"
    
    // Check if already run today
    if (!force && lastRun === today) {
      console.log('Automation already ran today. Skipping.');
      return { invoices: 0, emails: 0, run: false };
    }

    console.log('Running Daily Automation...');
    
    // 1. Generate Invoices for Renewals
    // This looks for upcoming renewals that don't have invoices yet
    const generatedInvoices = InvoiceService.checkAndGenerateAutoInvoices();

    // 2. Send Reminder Emails & Mark Overdue
    // This checks invoices/clients for due dates and sends communications
    const emailsSent = await InvoiceService.runAutomatedReminders();

    // 3. Mark as run
    localStorage.setItem(STORAGE_KEYS.LAST_RUN, today);

    return { 
      invoices: generatedInvoices, 
      emails: emailsSent,
      run: true
    };
  },

  getLastRun: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.LAST_RUN);
  },

  resetLastRun: () => {
    localStorage.removeItem(STORAGE_KEYS.LAST_RUN);
  }
};