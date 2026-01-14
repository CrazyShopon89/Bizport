import { GoogleGenAI } from "@google/genai";
import { Client, DomainClient } from "../types";
import { DB } from "./db";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.

export const generateRenewalEmail = async (client: Client, formattedAmount: string): Promise<string> => {
  try {
    const settings = DB.getSettings();
    // Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Write a professional and polite hosting renewal reminder email for a client.
      
      Client Details:
      Name: ${client.clientName}
      Website: ${client.website}
      Renewal Date: ${client.nextRenewalDate}
      Amount Due: ${formattedAmount}
      Invoice Number: ${client.invoiceNumber}
      
      Sender Details (for signature):
      Company Name: ${settings.companyName}
      Support Email: ${settings.contactEmail}
      Phone: ${settings.phone}
      
      The tone should be friendly but professional. Include a call to action to pay the invoice.
      Keep it concise.
      
      IMPORTANT: The email MUST end with "Best regards," followed by the Company Name, Support Email, and Phone number provided above. Do not use placeholders like "[Your Name]" or "[Company Name]".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate email content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to connect to AI service. Please check your API key configuration.";
  }
};

export const generateDomainRenewalEmail = async (client: DomainClient, formattedAmount: string): Promise<string> => {
  try {
    const settings = DB.getSettings();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Write a professional and urgent domain name expiration warning and renewal email.
      
      Client Details:
      Name: ${client.clientName}
      Domain Name: ${client.domainName}
      Expiry Date: ${client.expiryDate}
      Renewal Cost: ${formattedAmount}
      
      Sender Details (for signature):
      Company Name: ${settings.companyName}
      Support Email: ${settings.contactEmail}
      Phone: ${settings.phone}
      
      Emphasize the risk of losing the domain if not renewed.
      The tone should be helpful but clearly state the urgency.
      
      IMPORTANT: The email MUST end with "Best regards," followed by the Company Name, Support Email, and Phone number provided above. Do not use placeholders.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate email content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to connect to AI service.";
  }
};

export const analyzeClientData = async (clients: Client[], domains: DomainClient[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare summary data to save tokens and provide high-level context
    const totalClients = clients.length;
    const totalDomains = domains.length;
    const activeClients = clients.filter(c => c.status === 'Active').length;
    const activeDomains = domains.filter(d => d.status === 'Active').length;
    
    // Calculate total potential revenue
    const clientRev = clients.reduce((acc, c) => acc + c.amount, 0);
    const domainRev = domains.reduce((acc, d) => acc + d.amount, 0);
    
    const prompt = `
      As a business analyst, provide a brief executive summary for a hosting company based on this snapshot:
      
      Hosting Clients: ${totalClients} (${activeClients} active)
      Domains Managed: ${totalDomains} (${activeDomains} active)
      Total Annual Revenue Potential: ${clientRev + domainRev} (Currency units)
      
      Provide:
      1. A simplified health check of the business.
      2. 3 actionable growth or maintenance strategies in bullet points.
      3. A motivational closing sentence.
      
      Keep it professional, concise, and formatted in Markdown (use bolding for key terms).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to analyze data. Please ensure your API key is configured correctly in the .env file.";
  }
};