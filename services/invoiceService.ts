import { jsPDF } from 'jspdf';
import { DB } from './db';
import { Client, Invoice, PaymentStatus, CompanySettings } from '../types';
import { EmailService } from './emailService';

// Helper to load and compress image for PDF
const loadImage = (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.src = url;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Increased max size for better quality logos
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve({ data: dataURL, width, height });
      } catch (e) {
        resolve(null);
      }
    };
    
    img.onerror = () => {
       resolve(null);
    };
  });
};

const generatePdfDoc = async (invoice: Invoice, settings: CompanySettings) => {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const primaryColor = settings.primaryColor || '#4f46e5'; 
  
  // -- Header --
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  if (settings.logoUrl) {
      const logo = await loadImage(settings.logoUrl);
      if (logo) {
          // Calculate Aspect Ratio to fit within 80mm x 26mm box
          const maxHeight = 26; 
          const maxWidth = 80;
          const ratio = logo.width / logo.height;
          
          let pdfH = maxHeight;
          let pdfW = pdfH * ratio;
          
          // Constrain Width if needed
          if (pdfW > maxWidth) {
              pdfW = maxWidth;
              pdfH = pdfW / ratio;
          }
          
          // Vertically center in the 40mm header (approx y=7 to y=33)
          const y = (40 - pdfH) / 2;
          
          doc.addImage(logo.data, 'PNG', margin, y, pdfW, pdfH);
      } else {
          // Fallback if logo fails to load: Show Text
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(255, 255, 255);
          doc.text(settings.companyName, margin, 26);
      }
  } else {
      // No Logo: Show Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(settings.companyName, margin, 26);
  }

  // Invoice Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", pageWidth - margin, 28, { align: 'right' });

  // -- Info --
  let y = 55;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("FROM:", margin, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  y += 5;
  doc.text(settings.companyName, margin, y);
  y += 5;
  doc.text(settings.address || '', margin, y);
  y += 5;
  doc.text(settings.contactEmail || '', margin, y);
  y += 5;
  doc.text(settings.phone || '', margin, y);

  y = 55;
  const rightColX = pageWidth / 2 + 10;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", rightColX, y);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  y += 5;
  doc.text(invoice.clientName, rightColX, y);
  y += 5;
  doc.text(invoice.clientEmail, rightColX, y);
  if (invoice.clientPhone) {
      y += 5;
      doc.text(invoice.clientPhone, rightColX, y);
  }
  if (invoice.clientAddress) {
      y += 5;
      doc.text(invoice.clientAddress, rightColX, y);
  }

  y = 95;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');

  const detailY = y + 12;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("INVOICE NO", margin + 10, detailY - 5);
  doc.text("DATE", margin + 50, detailY - 5);
  doc.text("DUE DATE", margin + 90, detailY - 5);
  doc.text("STATUS", margin + 130, detailY - 5);

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.invoiceNumber, margin + 10, detailY + 1);
  doc.text(invoice.issueDate, margin + 50, detailY + 1);
  doc.text(invoice.dueDate, margin + 90, detailY + 1);
  
  const statusColor = invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Overdue' ? '#dc2626' : '#ca8a04';
  doc.setTextColor(statusColor);
  doc.text(invoice.status.toUpperCase(), margin + 130, detailY + 1);

  y += 35;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", margin + 5, y + 7);
  doc.text("QTY", pageWidth - margin - 40, y + 7, { align: 'right' });
  doc.text("AMOUNT", pageWidth - margin - 5, y + 7, { align: 'right' });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  invoice.items.forEach((item, index) => {
    y += 10;
    if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 6, pageWidth - (margin * 2), 10, 'F');
    }
    doc.text(item.description, margin + 5, y);
    doc.text(item.quantity.toString(), pageWidth - margin - 40, y, { align: 'right' });
    
    const formattedPrice = settings.currencyPosition === 'left' 
      ? `${settings.currencySymbol}${item.price.toLocaleString()}`
      : `${item.price.toLocaleString()}${settings.currencySymbol}`;
    doc.text(formattedPrice, pageWidth - margin - 5, y, { align: 'right' });
  });

  y += 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  
  const formattedTotal = settings.currencyPosition === 'left' 
      ? `${settings.currencySymbol}${invoice.amount.toLocaleString()}`
      : `${invoice.amount.toLocaleString()}${settings.currencySymbol}`;

  doc.text("TOTAL", pageWidth - margin - 60, y);
  doc.text(formattedTotal, pageWidth - margin - 5, y, { align: 'right' });

  const footerY = pageHeight - 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your business!", margin, footerY);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const InvoiceService = {
  
  /**
   * Generates a unique invoice number using a sequence counter.
   * Finds the highest sequence number in the current year to prevent collisions.
   */
  generateInvoiceNumber: (existingInvoices: Invoice[]): string => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    // Find highest sequence
    let maxSeq = 0;
    existingInvoices.forEach(inv => {
        if (inv.invoiceNumber.startsWith(prefix)) {
            const seqStr = inv.invoiceNumber.replace(prefix, '');
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        }
    });

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  },

  generatePdfBase64: async (invoice: Invoice, settings: CompanySettings): Promise<string> => {
    const doc = await generatePdfDoc(invoice, settings);
    return doc.output('datauristring');
  },

  /**
   * Production-grade invoice generator.
   * Handles recurring billing cycles correctly.
   */
  checkAndGenerateAutoInvoices: (): number => {
    const settings = DB.getSettings();
    const clients = DB.getClients();
    const domains = DB.getDomains();
    let invoices = DB.getInvoices(); 
    let generatedCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leadTime = settings.renewalNotificationDays || 7;
    const futureThreshold = new Date(today);
    futureThreshold.setDate(today.getDate() + leadTime);
    
    const pastThreshold = new Date(today);
    pastThreshold.setDate(today.getDate() - 60);

    // --- HOSTING ---
    clients.forEach(client => {
      if (!client.nextRenewalDate || client.status === 'Suspended') return;

      const [y, m, d] = client.nextRenewalDate.split('-').map(Number);
      const renewalDate = new Date(y, m - 1, d); 

      // Check if within generation window
      if (renewalDate >= pastThreshold && renewalDate <= futureThreshold) {
        
        // CRITICAL FIX: Check if an invoice ALREADY exists for this specific Due Date
        const alreadyInvoiced = invoices.some(inv => 
          inv.clientId === client.id && 
          inv.dueDate === client.nextRenewalDate &&
          inv.type === 'Hosting Renew'
        );

        if (!alreadyInvoiced) {
          const newInvoice: Invoice = {
            id: `inv_${Date.now()}_h_${Math.random().toString(36).substr(2, 5)}`,
            invoiceNumber: InvoiceService.generateInvoiceNumber(invoices),
            clientId: client.id,
            clientName: client.clientName,
            clientEmail: client.email,
            clientPhone: client.phone,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: client.nextRenewalDate,
            status: 'Unpaid',
            type: 'Hosting Renew',
            amount: client.amount,
            items: [{
              description: `Hosting Renewal - ${client.website}`,
              quantity: 1,
              price: client.amount
            }]
          };

          DB.saveInvoice(newInvoice);
          invoices.push(newInvoice); // Add to local array so subsequent iterations see it
          generatedCount++;
          
          // Update client status to Unpaid to reflect pending renewal
          client.invoiceNumber = newInvoice.invoiceNumber;
          client.invoiceDate = newInvoice.issueDate;
          client.paymentStatus = 'Unpaid';
          
          // If past due, mark overdue immediately
          if (today > renewalDate) {
              client.paymentStatus = 'Overdue';
          }
          
          DB.saveClient(client);
        }
      }
    });

    // --- DOMAINS ---
    domains.forEach(domain => {
      if (!domain.expiryDate || domain.status === 'Suspended') return;

      const [y, m, d] = domain.expiryDate.split('-').map(Number);
      const expiryDate = new Date(y, m - 1, d); 

      if (expiryDate >= pastThreshold && expiryDate <= futureThreshold) {
        
        const alreadyInvoiced = invoices.some(inv => 
          inv.clientId === domain.id && 
          inv.dueDate === domain.expiryDate &&
          inv.type === 'Domain Renew'
        );

        if (!alreadyInvoiced) {
          const newInvoice: Invoice = {
            id: `inv_${Date.now()}_d_${Math.random().toString(36).substr(2, 5)}`,
            invoiceNumber: InvoiceService.generateInvoiceNumber(invoices),
            clientId: domain.id,
            clientName: domain.clientName,
            clientEmail: domain.email,
            clientPhone: domain.phone,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: domain.expiryDate,
            status: 'Unpaid',
            type: 'Domain Renew',
            amount: domain.amount,
            items: [{
              description: `Domain Renewal - ${domain.domainName}`,
              quantity: 1,
              price: domain.amount
            }]
          };

          DB.saveInvoice(newInvoice);
          invoices.push(newInvoice);
          generatedCount++;
          
          domain.invoiceNumber = newInvoice.invoiceNumber;
          domain.paymentStatus = 'Unpaid';
          if (today > expiryDate) {
              domain.paymentStatus = 'Overdue';
          }
          DB.saveDomain(domain);
        }
      }
    });

    return generatedCount;
  },

  runAutomatedReminders: async (): Promise<number> => {
    const clients = DB.getClients();
    const domains = DB.getDomains();
    const users = DB.getUsers();
    
    // Send to Admins/Managers if client email fails or as internal notification
    const teamRecipients = users.filter(u => u.role !== 'Team Member').map(u => u.email).filter(Boolean);

    let emailsSent = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    const intervals = [15, 7, 3, 1]; // Reminder days

    const processEntity = async (
      id: string, 
      name: string, 
      targetName: string, 
      dateStr: string, 
      status: string, 
      type: 'hosting' | 'domain',
      amount: number,
      email: string,
      updater: (status: string) => void
    ) => {
      if (!dateStr || status === 'Paid') return;

      const [y, m, d] = dateStr.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Key to prevent duplicate emails for the same event
      // e.g. "sent_reminder_hosting_c123_2024-12-31_7" (Sent 7 day reminder for specific due date)
      
      // 1. Overdue Handling
      if (daysRemaining < 0) {
        if (status !== 'Overdue') {
            updater('Overdue');
        }
        
        // Send Overdue Notice (Once)
        const logKey = `sent_overdue_${type}_${id}_${dateStr}`;
        if (!localStorage.getItem(logKey)) {
           // Try to send to Client first
           try {
               await EmailService.sendClientEmail(
                   email,
                   name,
                   `URGENT: ${type === 'hosting' ? 'Hosting' : 'Domain'} Overdue - ${targetName}`,
                   `Your service for ${targetName} expired on ${dateStr}. Please pay immediately to avoid suspension.`
               );
           } catch (e) {
               console.error("Failed to send client overdue email", e);
           }

           // Always notify team
           await EmailService.sendTeamReminder(
             teamRecipients,
             `OVERDUE ALERT: ${targetName}`,
             `The ${type} service for ${name} (${targetName}) is overdue.\nDue: ${dateStr}\nAmount: ${amount}`
           );
           
           localStorage.setItem(logKey, 'true');
           emailsSent++;
        }
        return;
      }

      // 2. Standard Reminders
      if (intervals.includes(daysRemaining)) {
         const logKey = `sent_reminder_${type}_${id}_${dateStr}_${daysRemaining}`;
         
         if (!localStorage.getItem(logKey)) {
             // Send to Client
             try {
                 await EmailService.sendClientEmail(
                   email,
                   name,
                   `Renewal Reminder: ${daysRemaining} Days Left - ${targetName}`,
                   `Your service for ${targetName} expires on ${dateStr}. Amount due: ${amount}.`
                 );
             } catch (e) {
                 console.error("Failed to send client reminder", e);
             }
             
             localStorage.setItem(logKey, 'true');
             emailsSent++;
         }
      }
    };

    for (const c of clients) {
        await processEntity(
            c.id, c.clientName, c.website, c.nextRenewalDate, c.paymentStatus, 'hosting', c.amount, c.email,
            (newStatus) => { c.paymentStatus = newStatus; DB.saveClient(c); }
        );
    }

    for (const d of domains) {
        await processEntity(
            d.id, d.clientName, d.domainName, d.expiryDate, d.paymentStatus, 'domain', d.amount, d.email,
            (newStatus) => { d.paymentStatus = newStatus; DB.saveDomain(d); }
        );
    }

    return emailsSent;
  },

  downloadPDF: async (invoice: Invoice, settings: CompanySettings) => {
    const doc = await generatePdfDoc(invoice, settings);
    doc.save(`${invoice.invoiceNumber}.pdf`);
  },

  printPDF: async (invoice: Invoice, settings: CompanySettings) => {
    const doc = await generatePdfDoc(invoice, settings);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
};