import { Invoice, TimeEntry } from "@/types";
import { getToken } from "./auth";

const FORTNOX_API_URL = process.env.NEXT_PUBLIC_FORTNOX_API_URL || "https://api.fortnox.se/3/";

interface FortnoxInvoiceRow {
  ArticleNumber: string;
  Description: string;
  Price: number;
  Quantity: number;
  Unit: 'hours' | 'pcs';
  VAT: number;
  AccountNumber?: string;
}

interface FortnoxInvoice {
  CustomerNumber: string;
  InvoiceDate: string;
  DueDate: string;
  Remarks?: string;
  InvoiceRows: FortnoxInvoiceRow[];
}

export const createFortnoxInvoice = async (invoice: Invoice, timeEntries: TimeEntry[]) => {
  try {
    const token = await getToken();

    if (!token) {
      throw new Error("No access token available. Ensure user is connected to Fortnox.");
    }

    const client = {
      baseURL: FORTNOX_API_URL,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "Client-Secret": process.env.FORTNOX_CLIENT_SECRET || "",
        "Client-Id": process.env.FORTNOX_CLIENT_ID || "",
      },
    };

    const invoiceRows = timeEntries.map((entry) => {
      const product = entry.products;
      let description = product?.name || 'Unknown Product';
      
      if (entry.description) {
        description += ` - ${entry.description}`;
      }

      // Calculate quantity and unit price based on product type
      let quantity: number;
      let unitPrice: number;
      
      if (product?.type === 'activity' && entry.start_time && entry.end_time) {
        // For activities, calculate hours worked
        const startTime = new Date(entry.start_time);
        const endTime = new Date(entry.end_time);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        quantity = Math.round(hours * 100) / 100; // Round to 2 decimal places
        unitPrice = entry.custom_price || product.price || 0;
      } else if (product?.type === 'product' && entry.quantity) {
        // For products, use the specified quantity
        quantity = entry.quantity;
        unitPrice = entry.custom_price || product.price || 0;
      } else {
        // Fallback
        quantity = 1;
        unitPrice = entry.custom_price || product?.price || 0;
      }

      return {
        ArticleNumber: product?.article_number || '',
        Description: description,
        Price: unitPrice,
        Quantity: quantity,
        Unit: product?.type === 'activity' ? 'hours' : 'pcs',
        VAT: product?.vat_percentage || 25,
        AccountNumber: product?.account_number,
      };
    });

    const invoiceData: FortnoxInvoice = {
      CustomerNumber: invoice.client_id,
      InvoiceDate: invoice.issue_date,
      DueDate: invoice.due_date,
      Remarks: `Invoice created from time tracker entries.`,
      InvoiceRows: invoiceRows,
    };

    const response = await fetch(`${FORTNOX_API_URL}invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "Client-Secret": process.env.FORTNOX_CLIENT_SECRET || "",
        "Client-Id": process.env.FORTNOX_CLIENT_ID || "",
      },
      body: JSON.stringify({ Invoice: invoiceData }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Fortnox API Error:', response.status, errorBody);
      throw new Error(`Failed to create invoice in Fortnox: ${response.status} - ${errorBody}`);
    }

    const responseData = await response.json();
    console.log("Fortnox API Response:", responseData);
    return responseData;
  } catch (error: any) {
    console.error('Error creating Fortnox invoice:', error);
    throw error;
  }
};

export const getFortnoxInvoice = async (id: string) => {
    try {
        const token = await getToken();

        if (!token) {
            throw new Error("No access token available. Ensure user is connected to Fortnox.");
        }

        const response = await fetch(`${FORTNOX_API_URL}invoices/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`,
                "Client-Secret": process.env.FORTNOX_CLIENT_SECRET || "",
                "Client-Id": process.env.FORTNOX_CLIENT_ID || "",
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Fortnox API Error:', response.status, errorBody);
            throw new Error(`Failed to get invoice from Fortnox: ${response.status} - ${errorBody}`);
        }

        const responseData = await response.json();
        console.log("Fortnox API Response:", responseData);
        return responseData;
    } catch (error: any) {
        console.error('Error getting Fortnox invoice:', error);
        throw error;
    }
};
