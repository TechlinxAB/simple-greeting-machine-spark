
export interface Client {
  id: string;
  name: string;
  organization_number?: string;
  client_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  county?: string;
  telephone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  type: 'activity' | 'item';
  vat_percentage?: number;
  account_number?: string;
  article_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimeEntry {
  id: string;
  client_id: string;
  product_id?: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  quantity?: number;
  invoice_id?: string;
  invoiced?: boolean;
  created_at?: string;
  updated_at?: string;
  // Join fields - making these partial types to accommodate what Supabase returns
  clients?: Partial<Client>;
  products?: Partial<Product>;
  profiles?: {
    name?: string;
  };
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status?: string;
  exported_to_fortnox?: boolean;
  fortnox_invoice_id?: string;
  created_at?: string;
  updated_at?: string;
  // Join fields
  clients?: Partial<Client>;
}

export type ProductType = 'activity' | 'item';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'manager' | 'user';
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export * from "./auth";
export * from "./database";
