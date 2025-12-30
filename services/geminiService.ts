import { GoogleGenAI } from "@google/genai";
import { Client, DomainClient } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.

export const generateRenewalEmail = async (client: Client, formattedAmount: string): Promise<string> => {
  try {
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
      
      The tone should be friendly but professional. Include a call to action to pay the invoice.
      Keep it concise.
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Write a professional and urgent domain name expiration warning and renewal email.
      
      Client Details:
      Name: ${client.clientName}
      Domain Name: ${client.domainName}
      Expiry Date: ${client.expiryDate}
      Renewal Cost: ${formattedAmount}
      
      Emphasize the risk of losing the domain if not renewed.
      The tone should be helpful but clearly state the urgency.
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

export const analyzeClientData = async (clients: Client[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const clientSummary = clients.map(c => `${c.clientName}: ${c.status}, Due: ${c.nextRenewalDate}, Amount: ${c.amount}`).join('\n');
    
    const prompt = `
      Analyze the following hosting client data and provide a brief executive summary.
      Focus on upcoming revenue opportunities (renewals) and potential risks (expired/unpaid).
      Provide 3 actionable insights in bullet points.
      
      Data:
      ${clientSummary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error: Unable to analyze data.";
  }
};