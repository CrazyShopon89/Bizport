import { jsPDF } from 'jspdf';
import { DB } from './db';
import { Client, Invoice, PaymentStatus, CompanySettings } from '../types';

// Helper to load image for PDF
const loadImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.src = url;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        // Tainted canvas or other error
        resolve(null);
      }
    };
    
    img.onerror = () => {
       resolve(null);
    };
  });
};

const generatePdfDoc = async (invoice: Invoice, settings: CompanySettings) => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;
  
  // Capture start Y for absolute positioning of right-side elements
  const topY = y;

  // -- Header --
  
  // 1. Logo (Top Left)
  if (settings.logoUrl) {
      const logoData = await loadImage(settings.logoUrl);
      if (logoData) {
          const logoSize = 20;
          doc.addImage(logoData, 'PNG', margin, y, logoSize, logoSize); 
          y += logoSize + 5; // Move Y down below logo
      }
  }

  // 2. Company Info (Below Logo)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(settings.companyName, margin, y + 5); 
  
  y += 12; // Space after Company Name
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(settings.address, margin, y);
  doc.text(settings.contactEmail, margin, y + 5);
  doc.text(settings.phone, margin, y + 10);
  
  // Track bottom of left header
  y += 20;

  // 3. INVOICE Title (Right aligned - fixed at top)
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(settings.primaryColor);
  doc.text("INVOICE", 190, topY + 10, { align: 'right' }); 
  
  // Ensure Y is below both left header and reasonable space for title
  y = Math.max(y, topY + 40);

  // -- Invoice Details --
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 190, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  
  // Left Side: Bill To
  doc.text("BILL TO:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.clientName, margin, y + 5);
  doc.setFont("helvetica", "normal");
  
  let currentY = y + 10;
  doc.text(invoice.clientEmail, margin, currentY);
  
  if (invoice.clientPhone) {
      currentY += 5;
      doc.text(invoice.clientPhone, margin, currentY);
  }

  if (invoice.clientAddress) {
      currentY += 5;
      doc.text(invoice.clientAddress, margin, currentY);
  }
  
  // Right Side: Info
  // Fix Overlap: Move label to 130, value anchor to 190 (Right Margin)
  const labelX = 130;
  const valueX = 190;
  
  doc.text("Invoice No:", labelX, y);
  doc.text(invoice.invoiceNumber, valueX, y, { align: 'right' });
  
  doc.text("Date:", labelX, y + 5);
  doc.text(invoice.issueDate, valueX, y + 5, { align: 'right' });
  
  doc.text("Due Date:", labelX, y + 10);
  doc.text(invoice.dueDate, valueX, y + 10, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.text("Status:", labelX, y + 15);
  doc.setTextColor(invoice.status === 'Paid' ? '#22c55e' : invoice.status === 'Overdue' ? '#ef4444' : '#eab308');
  doc.text(invoice.status.toUpperCase(), valueX, y + 15, { align: 'right' });
  doc.setTextColor(50, 50, 50);

  // -- Items Table Header --
  y += 30;
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, 170, 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin + 5, y + 7);
  doc.text("Amount", 180, y + 7, { align: 'right' });

  // -- Items List --
  y += 10;
  doc.setFont("helvetica", "normal");
  
  invoice.items.forEach(item => {
    y += 10;
    doc.text(item.description, margin + 5, y);
    
    const formattedPrice = settings.currencyPosition === 'left' 
      ? `${settings.currencySymbol}${item.price.toLocaleString()}`
      : `${item.price.toLocaleString()}${settings.currencySymbol}`;
      
    doc.text(formattedPrice, 180, y, { align: 'right' });
  });

  // -- Total --
  y += 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 190, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 140, y);
  
  const formattedTotal = settings.currencyPosition === 'left' 
      ? `${settings.currencySymbol}${invoice.amount.toLocaleString()}`
      : `${invoice.amount.toLocaleString()}${settings.currencySymbol}`;
      
  doc.text(formattedTotal, 180, y, { align: 'right' });

  // -- Footer --
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", 105, 280, { align: 'center' });

  return doc;
};

export const InvoiceService = {
  
  /**
   * Generates a unique invoice number.
   * Format: INV-YYYY-SEQUENCE
   * Accepts an optional offset to handle batch generation.
   */
  generateInvoiceNumber: (existingInvoices: Invoice[], offset: number = 0): string => {
    const year = new Date().getFullYear();
    const count = existingInvoices.filter(i => i.issueDate.startsWith(year.toString())).length + 1 + offset;
    return `INV-${year}-${count.toString().padStart(4, '0')}`;
  },

  /**
   * Checks for clients with renewals within 30 days and generates invoices if not present.
   * Returns the number of invoices generated.
   */
  checkAndGenerateAutoInvoices: (): number => {
    const clients = DB.getClients();
    const domains = DB.getDomains();
    let invoices = DB.getInvoices(); // Get fresh list
    let generatedCount = 0;

    // Set up date boundaries (Local Time Midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureThreshold = new Date(today);
    futureThreshold.setDate(today.getDate() + 30);

    const pastThreshold = new Date(today);
    pastThreshold.setDate(today.getDate() - 30);

    // 1. Process Hosting Clients
    clients.forEach(client => {
      if (!client.nextRenewalDate) return;

      const [y, m, d] = client.nextRenewalDate.split('-').map(Number);
      const renewalDate = new Date(y, m - 1, d); 

      if (renewalDate >= pastThreshold && renewalDate <= futureThreshold) {
        
        const alreadyInvoiced = invoices.some(inv => 
          inv.clientId === client.id && 
          inv.dueDate === client.nextRenewalDate &&
          inv.type === 'Hosting Renew'
        );

        if (!alreadyInvoiced) {
          const newInvoice: Invoice = {
            id: `inv_${Date.now()}_h_${Math.random().toString(36).substr(2, 5)}`,
            invoiceNumber: InvoiceService.generateInvoiceNumber(invoices, generatedCount),
            clientId: client.id,
            clientName: client.clientName,
            clientEmail: client.email,
            clientPhone: client.phone,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: client.nextRenewalDate,
            status: PaymentStatus.UNPAID,
            type: 'Hosting Renew',
            amount: client.amount,
            items: [{
              description: `Hosting Renewal - ${client.website}`,
              quantity: 1,
              price: client.amount
            }]
          };

          DB.saveInvoice(newInvoice);
          generatedCount++;
          
          client.invoiceNumber = newInvoice.invoiceNumber;
          client.invoiceDate = newInvoice.issueDate;
          client.paymentStatus = PaymentStatus.UNPAID;
          DB.saveClient(client);
        }
      }
    });

    // 2. Process Domain Clients
    domains.forEach(domain => {
      if (!domain.expiryDate) return;

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
            invoiceNumber: InvoiceService.generateInvoiceNumber(invoices, generatedCount),
            clientId: domain.id,
            clientName: domain.clientName,
            clientEmail: domain.email,
            clientPhone: domain.phone,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: domain.expiryDate,
            status: PaymentStatus.UNPAID,
            type: 'Domain Renew',
            amount: domain.amount,
            items: [{
              description: `Domain Renewal - ${domain.domainName}`,
              quantity: 1,
              price: domain.amount
            }]
          };

          DB.saveInvoice(newInvoice);
          generatedCount++;
          
          // Note: DomainClient interface has invoiceNumber but not invoiceDate/paymentStatus sync in same way as Client if we want full sync, but we update invoiceNumber
          domain.invoiceNumber = newInvoice.invoiceNumber;
          DB.saveDomain(domain);
        }
      }
    });

    return generatedCount;
  },

  /**
   * Generates a PDF for a specific invoice using jsPDF and saves it.
   */
  downloadPDF: async (invoice: Invoice, settings: CompanySettings) => {
    const doc = await generatePdfDoc(invoice, settings);
    doc.save(`${invoice.invoiceNumber}.pdf`);
  },

  /**
   * Generates a PDF and opens it in a new tab for printing.
   */
  printPDF: async (invoice: Invoice, settings: CompanySettings) => {
    const doc = await generatePdfDoc(invoice, settings);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }
};