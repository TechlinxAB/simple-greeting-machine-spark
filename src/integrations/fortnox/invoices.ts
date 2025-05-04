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

// Interface for the response from Fortnox invoice creation
interface FortnoxInvoiceResponse {
  DocumentNumber: string;
  InvoiceDate: string;
  DueDate: string;
  Total: number;
  // Add other fields that might come back from the Fortnox API
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

// Define valid account ranges
const VALID_ACCOUNTS = {
  revenue: {
    min: 3000,
    max: 3999,
    default: "3001" // Default revenue account
  }
};

/**
 * Format time entries for export to Fortnox
 */
export async function formatTimeEntriesForFortnox(
  clientId: string,
  timeEntryIds: string[],
  isResend = false
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
    // If this is a resend, we want all time entries regardless of invoiced status
    const query = supabase
      .from("time_entries")
      .select(`
        *,
        products:product_id (*)
      `)
      .in("id", timeEntryIds)
      .eq("client_id", clientId);
    
    // Only filter by invoiced status if this is not a resend
    if (!isResend) {
      query.eq("invoiced", false);
    }
      
    const { data: timeEntries, error: entriesError } = await query;
      
    if (entriesError) throw entriesError;
    if (!timeEntries || timeEntries.length === 0) {
      throw new Error("No time entries found");
    }
    
    // Get user profiles in a separate query
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
      
      // Include article number if available - will be auto-created if not found in Fortnox
      let articleNumber: string | undefined = undefined;
      if (product.article_number) {
        articleNumber = product.article_number;
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
      const productName = product.name || "Unknown product";
      const baseDescription = entry.description || "";
      const timeInfo = product.type === 'activity' && entry.start_time && entry.end_time ? 
        formatDateRange(entry.start_time, entry.end_time) : '';
      
      // Format description with a dash after product name
      const description = sanitizeFortnoxDescription(`${productName} - ${baseDescription} - ${userName}${timeInfo ? ' - ' + timeInfo : ''}`);
      
      // Ensure VAT is one of the allowed values (25, 12, 6)
      const validVatRates = [25, 12, 6];
      const vat = validVatRates.includes(product.vat_percentage) ? product.vat_percentage : 25;
      
      // Use the account number from the product if it exists
      const accountNumber = product.account_number || VALID_ACCOUNTS.revenue.default;
      
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
    
    // Prepare the invoice data
    const invoiceData: FortnoxInvoiceData = {
      CustomerNumber: client.client_number || "", // Will be set after customer validation
      InvoiceRows: invoiceRows,
      InvoiceDate: new Date().toISOString().split('T')[0],
      DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      VATIncluded: false, 
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
 * Preserves Swedish characters (åäöÅÄÖ) while removing other problematic characters
 */
function sanitizeFortnoxDescription(description: string): string {
  // Replace pipe symbols with hyphens
  let sanitized = description.replace(/\|/g, '-');
  
  // Replace multiple spaces/hyphens with single ones
  sanitized = sanitized.replace(/\s+/g, ' ').replace(/-+/g, '-');
  
  // Use a more permissive replacement pattern that preserves Swedish characters
  // Allow a-z, A-Z, 0-9, spaces, hyphens, periods, commas, parentheses, and Swedish characters åäöÅÄÖ
  sanitized = sanitized.replace(/[^\w\såäöÅÄÖ\-,.()]/g, '');
  
  // Trim the description to avoid having spaces or hyphens at start/end
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Helper function to format date range in a more compact, Fortnox-friendly way
 */
function formatDateRange(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  
  // Format date as YYYY-MM-DD only
  const formatDate = (date: Date) => {
    return `${date.toISOString().split('T')[0]}`;
  };
  
  return formatDate(start);
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
 * Verify an article exists in Fortnox
 * Returns true if exists, false if not
 */
export async function verifyFortnoxArticle(product: Product): Promise<boolean> {
  try {
    // Check if the product has an article number
    if (product.article_number) {
      // Check if this article exists in Fortnox
      const exists = await checkFortnoxArticle(product.article_number);
      return exists;
    }
    return false;
  } catch (error: any) {
    console.error("Error verifying Fortnox article:", error);
    return false;
  }
}

/**
 * Create a customer in Fortnox
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
 * Create an article in Fortnox with details from missing article error
 */
export async function createArticleFromDetails(articleDetails: any): Promise<string | null> {
  try {
    if (!articleDetails || !articleDetails.articleNumber) {
      throw new Error("Invalid article details provided");
    }
    
    // Prepare article data for creation
    const articleData: FortnoxArticleData = {
      Description: articleDetails.description || "Product item",
      ArticleNumber: articleDetails.articleNumber,
      Type: "SERVICE", // Default to SERVICE type
      SalesAccount: articleDetails.accountNumber || VALID_ACCOUNTS.revenue.default, // Use the provided account number
      VAT: articleDetails.vat || 25, // Use provided VAT or default
      StockGoods: false // Set to false for service products
    };
    
    console.log("Creating new article in Fortnox with details:", articleData);
    
    const response = await fortnoxApiRequest("/articles", "POST", {
      Article: articleData
    });
    
    if (!response || !response.Article) {
      throw new Error("Failed to create article in Fortnox");
    }
    
    const newArticleNumber = response.Article.ArticleNumber;
    console.log(`Article created in Fortnox with number: ${newArticleNumber}`);
    
    return newArticleNumber;
  } catch (error) {
    console.error("Error creating article from details:", error);
    return null;
  }
}

/**
 * Validate and possibly correct account number
 */
function validateAccountNumber(accountNumber?: string): string {
  if (!accountNumber) {
    return VALID_ACCOUNTS.revenue.default;
  }
  
  // Check if it's a valid revenue account (3000-3999)
  const accountNum = parseInt(accountNumber, 10);
  if (isNaN(accountNum) || accountNum < VALID_ACCOUNTS.revenue.min || accountNum > VALID_ACCOUNTS.revenue.max) {
    console.warn(`Invalid account number: ${accountNumber}, using default: ${VALID_ACCOUNTS.revenue.default}`);
    return VALID_ACCOUNTS.revenue.default;
  }
  
  return accountNumber;
}

/**
 * Create an article in Fortnox if needed
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
      
      // Use the account number from the product or the default, ensuring it's valid
      const accountNumber = validateAccountNumber(product.account_number);
      
      // Format the article data with the original article number
      const articleData: FortnoxArticleData = {
        Description: product.name || "Service",
        ArticleNumber: product.article_number, // Use the original article number
        Type: "SERVICE", // Default to SERVICE type for all products
        SalesAccount: accountNumber, // Use the validated account number
        VAT: [25, 12, 6].includes(product.vat_percentage) ? product.vat_percentage : 25,
        StockGoods: false // Set to false for service products
      };
      
      // Create the article in Fortnox with the original article number
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
      
      // Use the account number from the product or the default, ensuring it's valid
      const accountNumber = validateAccountNumber(product.account_number);
      
      // Format the article data with the generated article number
      const articleData: FortnoxArticleData = {
        Description: product.name || "Service",
        ArticleNumber: generatedArticleNumber,
        Type: "SERVICE",
        SalesAccount: accountNumber, // Use the validated account number
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
  } catch (error: any) {
    console.error("Error ensuring Fortnox article:", error);
    
    // Special handling for account-related errors
    if (error && error.message && error.message.includes("account_not_found")) {
      console.log("Account not found, retrying with default account number");
      
      // Update the product account number to the default and try again
      const updatedProduct = {
        ...product,
        account_number: VALID_ACCOUNTS.revenue.default
      };
      
      // Update the product in the database with the correct account number
      await supabase
        .from("products")
        .update({ account_number: VALID_ACCOUNTS.revenue.default })
        .eq("id", product.id);
        
      // Retry with the updated product
      return ensureFortnoxArticle(updatedProduct);
    }
    
    return null;
  }
}

/**
 * Create invoice in Fortnox
 */
export async function createFortnoxInvoice(
  clientId: string,
  timeEntryIds: string[],
  isResend = false
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
    
    // Get all products used in the time entries to verify they exist in Fortnox
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from("time_entries")
      .select(`
        id, product_id,
        products:product_id (*)
      `)
      .in("id", timeEntryIds);
      
    if (timeEntriesError) throw timeEntriesError;
    
    // Check if any articles don't exist in Fortnox, and create them if needed
    if (timeEntries && timeEntries.length > 0) {
      // Create a unique list of products
      const uniqueProducts = new Map();
      timeEntries.forEach(entry => {
        if (entry.products && !uniqueProducts.has(entry.product_id)) {
          uniqueProducts.set(entry.product_id, entry.products);
        }
      });
      
      // Auto-create any missing products
      for (const product of uniqueProducts.values()) {
        const typedProduct = product as Product;
        const exists = await verifyFortnoxArticle(typedProduct);
        
        if (!exists) {
          console.log(`Article ${typedProduct.article_number || "(no number)"} for product ${typedProduct.name} not found in Fortnox, creating it...`);
          await ensureFortnoxArticle(typedProduct);
        }
      }
    }
    
    // Format time entries for Fortnox, passing the isResend flag
    const invoiceData = await formatTimeEntriesForFortnox(clientId, timeEntryIds, isResend);
    
    if (!invoiceData) {
      throw new Error("Failed to format invoice data");
    }
    
    // Update invoice data with the correct CustomerNumber
    invoiceData.CustomerNumber = customerNumber;
    
    // Create invoice in Fortnox - IMPORTANT: Wrapping in Invoice object as per API spec
    console.log("Sending invoice data to Fortnox wrapped in Invoice object as per API spec");
    try {
      // Validate all account numbers before sending
      if (invoiceData.InvoiceRows) {
        invoiceData.InvoiceRows.forEach(row => {
          if (row.AccountNumber) {
            row.AccountNumber = validateAccountNumber(row.AccountNumber);
          }
        });
      }
      
      const response = await fortnoxApiRequest("/invoices", "POST", {
        Invoice: invoiceData
      });
      
      if (!response || !response.Invoice) {
        throw new Error("Failed to create invoice in Fortnox");
      }
      
      const fortnoxInvoiceResponse = response.Invoice as FortnoxInvoiceResponse;
      
      // Update or create invoice record
      let invoice;
      
      if (isResend) {
        // For resends, find the existing invoice record
        // First get the invoice_id from one of the time entries
        const { data: timeEntryData, error: timeEntryError } = await supabase
          .from("time_entries")
          .select("invoice_id")
          .in("id", timeEntryIds)
          .limit(1);
          
        if (timeEntryError) throw timeEntryError;
        
        const invoiceId = timeEntryData?.[0]?.invoice_id;
        
        if (!invoiceId) {
          throw new Error("Could not find invoice ID from time entries");
        }
        
        // Now query for the invoice using the found ID
        const { data: existingInvoice, error: existingInvoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .maybeSingle();
          
        if (existingInvoiceError) throw existingInvoiceError;
        
        if (existingInvoice) {
          // Update existing invoice with new Fortnox invoice number
          const { data: updatedInvoice, error: updateError } = await supabase
            .from("invoices")
            .update({
              invoice_number: fortnoxInvoiceResponse.DocumentNumber,
              status: "sent",
              issue_date: fortnoxInvoiceResponse.InvoiceDate,
              due_date: fortnoxInvoiceResponse.DueDate,
              total_amount: fortnoxInvoiceResponse.Total,
              exported_to_fortnox: true,
              fortnox_invoice_id: fortnoxInvoiceResponse.DocumentNumber
            })
            .eq("id", existingInvoice.id)
            .select()
            .single();
            
          if (updateError) throw updateError;
          invoice = updatedInvoice;
        } else {
          // Fallback: Create new invoice record if existing one not found
          const { data: newInvoice, error: insertError } = await supabase
            .from("invoices")
            .insert({
              client_id: clientId,
              invoice_number: fortnoxInvoiceResponse.DocumentNumber,
              status: "sent",
              issue_date: fortnoxInvoiceResponse.InvoiceDate,
              due_date: fortnoxInvoiceResponse.DueDate,
              total_amount: fortnoxInvoiceResponse.Total,
              exported_to_fortnox: true,
              fortnox_invoice_id: fortnoxInvoiceResponse.DocumentNumber
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          invoice = newInvoice;
          
          // Update time entries to link to the new invoice if needed
          const { error: linkError } = await supabase
            .from("time_entries")
            .update({
              invoice_id: invoice.id
            })
            .in("id", timeEntryIds);
            
          if (linkError) throw linkError;
        }
      } else {
        // For new invoices, create a new record
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            client_id: clientId,
            invoice_number: fortnoxInvoiceResponse.DocumentNumber,
            status: "sent",
            issue_date: fortnoxInvoiceResponse.InvoiceDate,
            due_date: fortnoxInvoiceResponse.DueDate,
            total_amount: fortnoxInvoiceResponse.Total,
            exported_to_fortnox: true,
            fortnox_invoice_id: fortnoxInvoiceResponse.DocumentNumber
          })
          .select()
          .single();
          
        if (invoiceError) throw invoiceError;
        invoice = newInvoice;
        
        // Only update the time entries if this is not a resend (avoid double-marking)
        // Update time entries to mark as invoiced
        const { error: updateError } = await supabase
          .from("time_entries")
          .update({
            invoiced: true,
            invoice_id: invoice.id
          })
          .in("id", timeEntryIds);
          
        if (updateError) throw updateError;
      }
      
      return {
        invoiceNumber: fortnoxInvoiceResponse.DocumentNumber,
        invoiceId: invoice.id
      };
    } catch (error: any) {
      // Check if this is an account not found error
      if (error.message && error.message.includes("account_not_found") && error.accountDetails) {
        console.log("Account not found in Fortnox:", error.accountDetails);
        
        // This should be handled manually by the user
        throw new Error(`Account ${error.accountDetails.accountNumber} not found in Fortnox. Please create this account in Fortnox manually or select a different account number for the product.`);
      }
      
      // Handle article not found error
      if ((error.error === "article_not_found" || 
          (error.message && error.message.includes("article_not_found"))) && 
          error.articleDetails) {
        console.log("Article not found in Fortnox:", error.articleDetails);
        
        // Auto-create the article and retry
        const newArticleNumber = await createArticleFromDetails(error.articleDetails);
        if (newArticleNumber) {
          console.log(`Successfully created article ${newArticleNumber}, retrying invoice creation`);
          return createFortnoxInvoice(clientId, timeEntryIds, isResend);
        }
      }
      
      console.error("Error creating invoice in Fortnox:", error);
      throw error;
    }
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
