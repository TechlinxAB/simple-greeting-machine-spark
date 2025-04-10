
import { supabase } from "@/lib/supabase";
import { fortnoxApiRequest } from "./api-client";
import type { Client, Product, TimeEntry, Invoice } from "@/types";

// Interface for Fortnox invoice creation
interface FortnoxInvoiceData {
  CustomerNumber: string;
  InvoiceRows: FortnoxInvoiceRow[];
  InvoiceDate?: string;
  DueDate?: string;
  Comments?: string;
  PricesIncludeVAT?: boolean;
  Currency?: string;
  Language?: string;
  InvoiceType?: string;
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

// Interface for Fortnox customer creation - WITHOUT CustomerNumber
interface FortnoxCustomerData {
  Name: string;
  OrganisationNumber?: string;
  Address1?: string;
  ZipCode?: string;
  City?: string;
  CountryCode?: string;
  Email?: string;
  Phone1?: string;
}

// Interface for Fortnox article creation
interface FortnoxArticleData {
  Description: string;
  ArticleNumber?: string;
  Type: string;
  PurchasePrice?: number;
  SalesPrice: number;
  SalesAccount: string;
  Unit?: string;
  VAT: number;
  StockGoods: boolean;
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
    
    // Get time entries including product details
    const { data: timeEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select(`
        *,
        products:product_id (*)
      `)
      .in("id", timeEntryIds)
      .eq("client_id", clientId)
      .eq("invoiced", false);
      
    if (entriesError) throw entriesError;
    if (!timeEntries || timeEntries.length === 0) {
      throw new Error("No time entries found");
    }
    
    // Get user profiles in a separate query to avoid the relationship error
    const userIds = timeEntries.map(entry => entry.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
      
    if (profilesError) throw profilesError;
    
    // Create a map of user_id to profile data for easy lookup
    const userProfileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        userProfileMap.set(profile.id, profile);
      });
    }
    
    // Format invoice rows from time entries
    const invoiceRows: FortnoxInvoiceRow[] = await Promise.all(timeEntries.map(async (entry) => {
      const product = entry.products as Product;
      
      // Validate ArticleNumber - only use if it's numeric
      let articleNumber: string | undefined = undefined;
      if (product.article_number && /^\d+$/.test(product.article_number)) {
        articleNumber = product.article_number;
      }
      
      // Get user profile from the map
      const userProfile = userProfileMap.get(entry.user_id);
      const userName = userProfile?.name || 'Unknown User';
      
      // Calculate quantity
      let quantity = 1;
      let unitCode: string | undefined = undefined;
      
      if (product.type === 'activity' && entry.start_time && entry.end_time) {
        // Calculate hours from start_time to end_time
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        quantity = parseFloat(diffHours.toFixed(2));
        unitCode = "h"; // Hour unit code
      } else if (product.type === 'item' && entry.quantity) {
        quantity = entry.quantity;
        unitCode = "st"; // Standard unit code for items
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
      
      // Ensure VAT is one of the allowed values (25, 12, 6)
      const validVatRates = [25, 12, 6];
      const vat = validVatRates.includes(product.vat_percentage) ? product.vat_percentage : 25;
      
      // Ensure account number is in valid sales account range (3000-3999)
      let accountNumber = "3001"; // Default fallback
      if (product.account_number) {
        const accountNum = parseInt(product.account_number);
        if (!isNaN(accountNum) && accountNum >= 3000 && accountNum <= 3999) {
          accountNumber = product.account_number;
        }
      }
      
      // Create the base row with required fields
      const row: FortnoxInvoiceRow = {
        Description: description,
        DeliveredQuantity: quantity,
        Price: product.price,
        VAT: vat,
        AccountNumber: accountNumber
      };
      
      // Only add ArticleNumber if it exists and is numeric
      if (articleNumber) {
        row.ArticleNumber = articleNumber;
      }
      
      // Only add UnitCode if valid
      if (unitCode) {
        row.UnitCode = unitCode;
      }
      
      return row;
    }));
    
    // Prepare the invoice data with only CustomerNumber, not full Customer object
    const invoiceData: FortnoxInvoiceData = {
      CustomerNumber: client.client_number || "", // Will be set after customer validation
      InvoiceRows: invoiceRows,
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      Comments: `Invoice generated from Techlinx Time Tracker`,
      PricesIncludeVAT: false, // Per Fortnox spec
      Currency: "SEK", // Swedish Krona
      Language: "SV", // Swedish
      InvoiceType: "INVOICE" // Regular invoice
    };
    
    // Log the exact structure being sent to Fortnox for debugging
    console.log("Formatted invoice data for Fortnox:", JSON.stringify(invoiceData, null, 2));
    
    return invoiceData;
  } catch (error) {
    console.error("Error formatting time entries for Fortnox:", error);
    throw error;
  }
}

/**
 * Find an existing customer in Fortnox by OrganisationNumber
 */
export async function findFortnoxCustomerByOrgNumber(orgNumber: string): Promise<string | null> {
  if (!orgNumber) return null;
  
  try {
    console.log(`Searching for existing customer with OrganisationNumber: ${orgNumber}`);
    
    // Use the filter to search by organisation number
    const customersResponse = await fortnoxApiRequest(`/customers?filter=organisationnumber&filtername=${encodeURIComponent(orgNumber)}`);
    
    if (customersResponse?.Customers?.Customer?.length > 0) {
      // Customer exists, use the first match
      const customerNumber = customersResponse.Customers.Customer[0].CustomerNumber;
      console.log(`Found existing customer with CustomerNumber: ${customerNumber}`);
      return customerNumber;
    }
    
    console.log(`No existing customer found with OrganisationNumber: ${orgNumber}`);
    return null;
  } catch (error) {
    console.warn("Error searching for customer by OrganisationNumber:", error);
    return null;
  }
}

/**
 * Check if a customer exists in Fortnox by CustomerNumber
 */
export async function checkFortnoxCustomer(customerNumber: string): Promise<boolean> {
  if (!customerNumber) return false;
  
  try {
    await fortnoxApiRequest(`/customers/${customerNumber}`);
    console.log(`Customer with CustomerNumber ${customerNumber} exists in Fortnox`);
    return true;
  } catch (error) {
    console.log(`Customer with CustomerNumber ${customerNumber} not found in Fortnox`);
    return false;
  }
}

/**
 * Check if an article exists in Fortnox by ArticleNumber
 */
export async function checkFortnoxArticle(articleNumber: string): Promise<boolean> {
  if (!articleNumber) return false;
  
  try {
    await fortnoxApiRequest(`/articles/${articleNumber}`);
    console.log(`Article with ArticleNumber ${articleNumber} exists in Fortnox`);
    return true;
  } catch (error) {
    console.log(`Article with ArticleNumber ${articleNumber} not found in Fortnox`);
    return false;
  }
}

/**
 * Create a customer in Fortnox - no longer sends CustomerNumber
 */
export async function createFortnoxCustomer(client: Client): Promise<string> {
  try {
    // Format customer data for Fortnox without CustomerNumber
    const customerData: FortnoxCustomerData = {
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
    console.log("Creating customer in Fortnox with data:", JSON.stringify(customerData, null, 2));
    const response = await fortnoxApiRequest("/customers", "POST", {
      Customer: customerData
    });
    
    if (!response || !response.Customer) {
      throw new Error("Failed to create customer in Fortnox");
    }
    
    console.log("Customer created in Fortnox:", response.Customer);
    return response.Customer.CustomerNumber;
  } catch (error) {
    console.error("Error creating Fortnox customer:", error);
    throw error;
  }
}

/**
 * Generate a unique numeric article number
 */
export async function generateNumericArticleNumber(): Promise<string> {
  // Start with a base number (current timestamp last 6 digits for uniqueness)
  const timestamp = Date.now().toString().slice(-6);
  const baseNumber = `1${timestamp}`;
  
  return baseNumber;
}

/**
 * Create or update an article in Fortnox if needed
 */
export async function ensureFortnoxArticle(product: Product): Promise<string | null> {
  try {
    // Check if product already has a valid article number
    if (product.article_number && /^\d+$/.test(product.article_number)) {
      // Check if this article exists in Fortnox
      const exists = await checkFortnoxArticle(product.article_number);
      if (exists) {
        console.log(`Using existing Fortnox article with number: ${product.article_number}`);
        return product.article_number;
      }
    }
    
    // Generate a new article number
    const articleNumber = await generateNumericArticleNumber();
    
    // Format the article data
    const articleData: FortnoxArticleData = {
      Description: product.name,
      ArticleNumber: articleNumber,
      Type: product.type === 'activity' ? "SERVICE" : "STOCK",
      SalesPrice: product.price,
      SalesAccount: product.account_number || "3001",
      Unit: product.type === 'activity' ? "h" : "st", 
      VAT: [25, 12, 6].includes(product.vat_percentage) ? product.vat_percentage : 25,
      StockGoods: product.type === 'item'
    };
    
    // Create the article in Fortnox
    console.log("Creating new article in Fortnox:", articleData);
    const response = await fortnoxApiRequest("/articles", "POST", {
      Article: articleData
    });
    
    if (!response || !response.Article) {
      console.error("Failed to create article in Fortnox");
      return null;
    }
    
    const newArticleNumber = response.Article.ArticleNumber;
    console.log(`Article created in Fortnox with number: ${newArticleNumber}`);
    
    // Update our local product with the new article number
    await supabase
      .from("products")
      .update({ article_number: newArticleNumber })
      .eq("id", product.id);
    
    return newArticleNumber;
  } catch (error) {
    console.error("Error ensuring Fortnox article:", error);
    return null;
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
    // Get client data for customer check
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
      
    if (clientError) throw clientError;
    if (!client) throw new Error("Client not found");
    
    // Find or create customer in Fortnox
    let customerNumber = "";
    
    // 1. First try to find by stored client_number
    if (client.client_number) {
      const customerExists = await checkFortnoxCustomer(client.client_number);
      if (customerExists) {
        customerNumber = client.client_number;
        console.log(`Using existing customer with stored CustomerNumber: ${customerNumber}`);
      }
    }
    
    // 2. If not found by client_number, try to find by OrganisationNumber
    if (!customerNumber && client.organization_number) {
      const foundCustomerNumber = await findFortnoxCustomerByOrgNumber(client.organization_number);
      if (foundCustomerNumber) {
        customerNumber = foundCustomerNumber;
        console.log(`Found customer by OrganisationNumber with CustomerNumber: ${customerNumber}`);
        
        // Update our local record with the Fortnox CustomerNumber
        if (customerNumber !== client.client_number) {
          await supabase
            .from("clients")
            .update({ client_number: customerNumber })
            .eq("id", clientId);
          
          console.log(`Updated local client record with Fortnox CustomerNumber: ${customerNumber}`);
        }
      }
    }
    
    // 3. If customer not found, create a new one
    if (!customerNumber) {
      console.log("No existing customer found, creating new customer in Fortnox");
      customerNumber = await createFortnoxCustomer(client);
      
      if (!customerNumber) {
        throw new Error("Failed to create or find customer in Fortnox");
      }
      
      // Update our client record with the new CustomerNumber from Fortnox
      await supabase
        .from("clients")
        .update({ client_number: customerNumber })
        .eq("id", clientId);
      
      console.log(`Updated local client record with new Fortnox CustomerNumber: ${customerNumber}`);
    }
    
    // Format time entries for Fortnox
    const invoiceData = await formatTimeEntriesForFortnox(clientId, timeEntryIds);
    
    if (!invoiceData) {
      throw new Error("Failed to format invoice data");
    }
    
    // Update invoice data with the correct CustomerNumber
    invoiceData.CustomerNumber = customerNumber;
    
    // Create invoice in Fortnox - IMPORTANT: Wrapping in Invoice object as required by Fortnox API
    console.log("Sending invoice data to Fortnox wrapped in Invoice object as per API spec");
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
