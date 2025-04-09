
import { supabase } from "@/lib/supabase";
import { fortnoxApiRequest } from "./api";
import type { Client, Product, TimeEntry, Invoice } from "@/types";

// Interface for Fortnox invoice creation
interface FortnoxInvoiceData {
  Customer: {
    CustomerNumber: string;
    Name?: string;
    OrganisationNumber?: string;
    Address1?: string;
    ZipCode?: string;
    City?: string;
    CountryCode?: string;
    Email?: string;
    Phone1?: string;
  };
  InvoiceRows: FortnoxInvoiceRow[];
  InvoiceDate?: string;
  DueDate?: string;
  Comments?: string;
  EmailInformation?: {
    EmailAddressTo?: string;
    EmailSubject?: string;
    EmailBody?: string;
  };
}

interface FortnoxInvoiceRow {
  ArticleNumber?: string;
  Description: string;
  DeliveredQuantity: number;
  Price: number;
  VAT: number;
  AccountNumber?: string;
  UnitCode?: string;
}

/**
 * Format time entries for export to Fortnox
 */
export async function formatTimeEntriesForFortnox(
  clientId: string,
  timeEntryIds: string[]
): Promise<FortnoxInvoiceData | null> {
  try {
    // Get client data with complete details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
      
    if (clientError) throw clientError;
    if (!client) throw new Error("Client not found");
    
    // Get time entries including user information and product details
    const { data: timeEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select(`
        *,
        products:product_id (*),
        profiles:user_id (id, name, email)
      `)
      .in("id", timeEntryIds)
      .eq("client_id", clientId)
      .eq("invoiced", false);
      
    if (entriesError) throw entriesError;
    if (!timeEntries || timeEntries.length === 0) {
      throw new Error("No time entries found");
    }
    
    // Format invoice data for Fortnox with complete client information
    const invoiceRows: FortnoxInvoiceRow[] = timeEntries.map(entry => {
      const product = entry.products;
      // Fix TypeScript error - make sure profiles exists before accessing properties
      const userName = entry.profiles?.name || 'Unknown User';
      
      // Calculate quantity
      let quantity = 1;
      let unitCode = "st"; // Default unit code (piece/item)
      
      if (product.type === 'activity' && entry.start_time && entry.end_time) {
        // Calculate hours from start_time to end_time
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        quantity = parseFloat(diffHours.toFixed(2));
        unitCode = "tim"; // Hour unit code
      } else if (product.type === 'item' && entry.quantity) {
        quantity = entry.quantity;
      }
      
      // Format description including user information
      const baseDescription = entry.description || product.name;
      const timeInfo = product.type === 'activity' && entry.start_time && entry.end_time ? 
        `${new Date(entry.start_time).toLocaleString()} - ${new Date(entry.end_time).toLocaleString()}` : '';
      
      const description = [
        baseDescription,
        `Utförd av: ${userName}`,
        timeInfo
      ].filter(Boolean).join(' | ');
      
      return {
        ArticleNumber: product.id.substring(0, 10), // Fortnox has limits on article number length
        Description: description,
        DeliveredQuantity: quantity,
        Price: product.price,
        VAT: product.vat_percentage,
        AccountNumber: product.account_number,
        UnitCode: unitCode
      };
    });
    
    // Prepare complete customer information for Fortnox
    return {
      Customer: {
        CustomerNumber: client.client_number || client.id.substring(0, 10),
        Name: client.name,
        OrganisationNumber: client.organization_number,
        Address1: client.address,
        ZipCode: client.postal_code,
        City: client.city,
        CountryCode: "SE", // Default to Sweden
        Email: client.email,
        Phone1: client.telephone
      },
      InvoiceRows: invoiceRows,
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      Comments: `Invoice generated from Techlinx Time Tracker`,
      EmailInformation: client.email ? {
        EmailAddressTo: client.email,
        EmailSubject: "New Invoice",
        EmailBody: "Please find attached your invoice."
      } : undefined
    };
  } catch (error) {
    console.error("Error formatting time entries for Fortnox:", error);
    throw error;
  }
}

/**
 * Create invoice in Fortnox
 */
export async function createFortnoxInvoice(
  clientId: string,
  timeEntryIds: string[]
): Promise<{ invoiceNumber: string; invoiceId: string }> {
  try {
    // Format time entries for Fortnox
    const invoiceData = await formatTimeEntriesForFortnox(clientId, timeEntryIds);
    
    if (!invoiceData) {
      throw new Error("Failed to format invoice data");
    }
    
    // Check if client exists in Fortnox
    let customerExists = false;
    try {
      customerExists = await checkFortnoxCustomer(invoiceData.Customer.CustomerNumber);
    } catch (error) {
      console.log("Customer check failed, will attempt to create:", error);
    }
    
    // Create client in Fortnox if not exists
    if (!customerExists) {
      console.log("Creating customer in Fortnox:", invoiceData.Customer.Name);
      await createFortnoxCustomer({
        id: clientId,
        client_number: invoiceData.Customer.CustomerNumber,
        name: invoiceData.Customer.Name || '',
        organization_number: invoiceData.Customer.OrganisationNumber || '',
        address: invoiceData.Customer.Address1 || '',
        postal_code: invoiceData.Customer.ZipCode || '',
        city: invoiceData.Customer.City || '',
        email: invoiceData.Customer.Email || '',
        telephone: invoiceData.Customer.Phone1 || '',
        county: '',
        created_at: new Date().toISOString(), // Add required fields from Client type
        updated_at: new Date().toISOString()
      });
    }
    
    // Create invoice in Fortnox
    const response = await fortnoxApiRequest("/invoices", "POST", {
      Invoice: invoiceData
    });
    
    if (!response || !response.Invoice) {
      throw new Error("Failed to create invoice in Fortnox");
    }
    
    const fortnoxInvoice = response.Invoice;
    
    // Create local invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        invoice_number: fortnoxInvoice.DocumentNumber,
        status: "sent",
        issue_date: fortnoxInvoice.InvoiceDate,
        due_date: fortnoxInvoice.DueDate,
        total_amount: fortnoxInvoice.Total,
        exported_to_fortnox: true,
        fortnox_invoice_id: fortnoxInvoice.DocumentNumber
      })
      .select()
      .single();
      
    if (invoiceError) throw invoiceError;
    
    // Update time entries to mark as invoiced
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        invoiced: true,
        invoice_id: invoice.id
      })
      .in("id", timeEntryIds);
      
    if (updateError) throw updateError;
    
    return {
      invoiceNumber: fortnoxInvoice.DocumentNumber,
      invoiceId: invoice.id
    };
  } catch (error) {
    console.error("Error creating Fortnox invoice:", error);
    throw error;
  }
}

/**
 * Get list of invoices from Fortnox
 */
export async function getFortnoxInvoices(): Promise<any[]> {
  try {
    const response = await fortnoxApiRequest("/invoices");
    
    if (!response || !response.Invoices) {
      return [];
    }
    
    return response.Invoices.Invoice || [];
  } catch (error) {
    console.error("Error getting Fortnox invoices:", error);
    throw error;
  }
}

/**
 * Get a specific invoice from Fortnox
 */
export async function getFortnoxInvoice(invoiceNumber: string): Promise<any> {
  try {
    const response = await fortnoxApiRequest(`/invoices/${invoiceNumber}`);
    
    if (!response || !response.Invoice) {
      throw new Error("Invoice not found in Fortnox");
    }
    
    return response.Invoice;
  } catch (error) {
    console.error(`Error getting Fortnox invoice ${invoiceNumber}:`, error);
    throw error;
  }
}

/**
 * Check if a customer exists in Fortnox
 */
export async function checkFortnoxCustomer(customerNumber: string): Promise<boolean> {
  try {
    await fortnoxApiRequest(`/customers/${customerNumber}`);
    return true;
  } catch (error) {
    // If error is 404, customer doesn't exist
    return false;
  }
}

/**
 * Create a customer in Fortnox
 */
export async function createFortnoxCustomer(client: Client): Promise<string> {
  try {
    // Format customer data for Fortnox
    const customerData = {
      CustomerNumber: client.client_number || client.id.substring(0, 10),
      Name: client.name,
      OrganisationNumber: client.organization_number,
      Address1: client.address,
      ZipCode: client.postal_code,
      City: client.city,
      CountryCode: "SE", // Default to Sweden
      Email: client.email,
      Phone1: client.telephone
    };
    
    // Create customer in Fortnox
    const response = await fortnoxApiRequest("/customers", "POST", {
      Customer: customerData
    });
    
    if (!response || !response.Customer) {
      throw new Error("Failed to create customer in Fortnox");
    }
    
    return response.Customer.CustomerNumber;
  } catch (error) {
    console.error("Error creating Fortnox customer:", error);
    throw error;
  }
}
