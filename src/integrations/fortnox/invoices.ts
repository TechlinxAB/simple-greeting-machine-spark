
import { supabase } from "@/lib/supabase";
import { fortnoxApiRequest } from "./api-client";
import type { Client, Product, TimeEntry, Invoice } from "@/types";

// Interface for Fortnox invoice creation
interface FortnoxInvoiceData {
  CustomerNumber: string;
  InvoiceRows: FortnoxInvoiceRow[];
  InvoiceDate?: string;
  DueDate?: string;
  VATIncluded?: boolean;
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
  Unit?: string; // Add unit field for Fortnox
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
  SalesAccount: string;
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
      
      // Check if article exists in Fortnox or create it with the original article number
      let articleNumber: string | undefined = undefined;
      if (product.article_number) {
        // Check if this article exists in Fortnox
        const exists = await checkFortnoxArticle(product.article_number);
        if (exists) {
          articleNumber = product.article_number;
        } else {
          // Create new article with the original article number
          const newArticleNumber = await ensureFortnoxArticle(product);
          if (newArticleNumber) {
            articleNumber = newArticleNumber;
          }
        }
      }
      
      // Get user profile from the map
      const userProfile = userProfileMap.get(entry.user_id);
      const userName = userProfile?.name || 'Unknown User';
      
      // Calculate quantity
      let quantity = 1;
      
      if (product.type === 'activity' && entry.start_time && entry.end_time) {
        // Calculate hours from start_time to end_time
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        quantity = parseFloat(diffHours.toFixed(2));
      } else if (product.type === 'item' && entry.quantity) {
        quantity = entry.quantity;
      }
      
      // Format description in a Fortnox-compatible way
      const baseDescription = entry.description || product.name || "Service";
      const timeInfo = product.type === 'activity' && entry.start_time && entry.end_time ? 
        formatDateRange(entry.start_time, entry.end_time) : '';
      
      // Format description without pipe symbols and with proper spacing
      const description = sanitizeFortnoxDescription(`${baseDescription} - ${userName}${timeInfo ? ' - ' + timeInfo : ''}`);
      
      // Ensure VAT is one of the allowed values (25, 12, 6)
      const validVatRates = [25, 12, 6];
      const vat = validVatRates.includes(product.vat_percentage) ? product.vat_percentage : 25;
      
      // Ensure account number is in valid sales account range (3000-3999)
      let accountNumber = "3001"; // Default fallback
      if (product.account_number) {
        const accountNum = parseInt(product.account_number);
        if (!isNaN(accountNum) && accountNum >= 3000 && accountNum <= 3999) {
          accountNumber = product.account_number;
        } else {
          console.warn(`Invalid account number ${product.account_number} for product ${product.name}, using default 3001`);
        }
      }
      
      // Set appropriate unit based on product type
      const unit = product.type === 'activity' ? 't' : 'st';
      
      // Create the base row with required fields
      const row: FortnoxInvoiceRow = {
        Description: description,
        DeliveredQuantity: quantity,
        Price: product.price,
        VAT: vat,
        AccountNumber: accountNumber,
        Unit: unit
      };
      
      // Only add ArticleNumber if it exists
      if (articleNumber) {
        row.ArticleNumber = articleNumber;
      }
      
      return row;
    }));
    
    // Prepare the invoice data with only CustomerNumber, not full Customer object
    const invoiceData: FortnoxInvoiceData = {
      CustomerNumber: client.client_number || "", // Will be set after customer validation
      InvoiceRows: invoiceRows,
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      VATIncluded: false, // Changed from PricesIncludeVAT to VATIncluded
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
 * Helper function to sanitize description for Fortnox API
 * Removes pipe symbols and other special characters that cause validation errors
 */
function sanitizeFortnoxDescription(description: string): string {
  // Replace pipe symbols with hyphens
  let sanitized = description.replace(/\|/g, '-');
  
  // Replace multiple spaces/hyphens with single ones
  sanitized = sanitized.replace(/\s+/g, ' ').replace(/-+/g, '-');
  
  // Replace other potentially problematic characters
  sanitized = sanitized.replace(/[^\w\s\-,.()]/g, '');
  
  // Trim the description to avoid having spaces or hyphens at start/end
  sanitized = sanitized.trim();
  
  // Limit the length to avoid potential issues (Fortnox might have limits)
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized;
}

/**
 * Helper function to format date range in a more compact, Fortnox-friendly way
 */
function formatDateRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Format date as YYYY-MM-DD HH:MM
  const formatDate = (date: Date) => {
    return `${date.toISOString().split('T')[0]} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  
  return `${formatDate(start)} to ${formatDate(end)}`;
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
 * This is now only used as a fallback if no article_number is provided
 */
export async function generateNumericArticleNumber(): Promise<string> {
  // Start with a base number (current timestamp last 6 digits for uniqueness)
  const timestamp = Date.now().toString().slice(-6);
  const baseNumber = `1${timestamp}`;
  
  return baseNumber;
}

/**
 * Create or update an article in Fortnox if needed
 * Modified to preserve original article numbers and handle account validation
 */
export async function ensureFortnoxArticle(product: Product): Promise<string | null> {
  try {
    // First check if the product has an article number
    if (product.article_number) {
      // Check if this article exists in Fortnox
      const exists = await checkFortnoxArticle(product.article_number);
      if (exists) {
        console.log(`Using existing Fortnox article with number: ${product.article_number}`);
        return product.article_number;
      }
      
      // Article doesn't exist, create it with the original article number
      console.log(`Creating new article with original article number: ${product.article_number}`);
      
      // Ensure account number is valid (3000-3999)
      let accountNumber = "3001"; // Default fallback
      if (product.account_number) {
        const accountNum = parseInt(product.account_number);
        if (!isNaN(accountNum) && accountNum >= 3000 && accountNum <= 3999) {
          accountNumber = product.account_number;
        } else {
          console.warn(`Invalid account number ${product.account_number} for product ${product.name}, using default 3001`);
        }
      }
      
      // Format the article data with the original article number
      const articleData: FortnoxArticleData = {
        Description: product.name || "Service",
        ArticleNumber: product.article_number, // Use the original article number
        Type: "SERVICE", // Default to SERVICE type for all products
        SalesAccount: accountNumber, // Use valid account number
        VAT: [25, 12, 6].includes(product.vat_percentage) ? product.vat_percentage : 25,
        StockGoods: false // Set to false for service products
      };
      
      // Create the article in Fortnox with the original article number
      // Important: Don't include SalesPrice as it's read-only in Fortnox API
      console.log("Creating new article in Fortnox with original number:", articleData);
      const response = await fortnoxApiRequest("/articles", "POST", {
        Article: articleData
      });
      
      if (!response || !response.Article) {
        console.error("Failed to create article in Fortnox");
        return null;
      }
      
      const newArticleNumber = response.Article.ArticleNumber;
      console.log(`Article created in Fortnox with number: ${newArticleNumber}`);
      
      return newArticleNumber;
    } else {
      // No article number provided, generate one
      const generatedArticleNumber = await generateNumericArticleNumber();
      
      // Ensure account number is valid (3000-3999)
      let accountNumber = "3001"; // Default fallback
      if (product.account_number) {
        const accountNum = parseInt(product.account_number);
        if (!isNaN(accountNum) && accountNum >= 3000 && accountNum <= 3999) {
          accountNumber = product.account_number;
        } else {
          console.warn(`Invalid account number ${product.account_number} for product ${product.name}, using default 3001`);
        }
      }
      
      // Format the article data with the generated article number
      const articleData: FortnoxArticleData = {
        Description: product.name || "Service",
        ArticleNumber: generatedArticleNumber,
        Type: "SERVICE",
        SalesAccount: accountNumber, // Use valid account number
        VAT: [25, 12, 6].includes(product.vat_percentage) ? product.vat_percentage : 25,
        StockGoods: false
      };
      
      // Create the article in Fortnox with the generated number
      console.log("Creating new article in Fortnox with generated number:", articleData);
      const response = await fortnoxApiRequest("/articles", "POST", {
        Article: articleData
      });
      
      if (!response || !response.Article) {
        console.error("Failed to create article in Fortnox");
        return null;
      }
      
      const newArticleNumber = response.Article.ArticleNumber;
      console.log(`Article created in Fortnox with generated number: ${newArticleNumber}`);
      
      // Update our local product with the new article number
      await supabase
        .from("products")
        .update({ article_number: newArticleNumber })
        .eq("id", product.id);
      
      return newArticleNumber;
    }
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
    
    // Create invoice in Fortnox - IMPORTANT: Wrapping in Invoice object as required by Fortnox API spec
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
