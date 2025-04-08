
export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user';
  date_of_birth?: string;
};

export type Client = {
  id: string;
  name: string;
  organization_number: string;
  client_number: string;
  address: string;
  postal_code: string;
  city: string;
  county: string;
  telephone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
};

export type ProductType = 'activity' | 'item';

export type Product = {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  account_number: string;
  vat_percentage: number;
  created_at: string;
  updated_at: string;
};

export type TimeEntry = {
  id: string;
  user_id: string;
  client_id: string;
  product_id: string;
  start_time?: string;
  end_time?: string;
  quantity?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  invoiced: boolean;
  invoice_id?: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date: string;
  due_date: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  exported_to_fortnox: boolean;
  fortnox_invoice_id?: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  time_entry_id?: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percentage: number;
  total_amount: number;
};
