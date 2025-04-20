
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Info, Link, Code, RefreshCcw, Database, Server, KeyRound, ExternalLink } from "lucide-react";
import { environment } from "@/config/environment";
import { YesBadge, NoBadge } from "@/components/ui/YesNoBadge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Full SQL setup scripts organized by category
const TABLES_SQL = `-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user'::text CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create news_posts table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_number TEXT,
  organization_number TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  county TEXT,
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'activity' or 'item'
  price NUMERIC NOT NULL DEFAULT 0,
  account_number TEXT,
  article_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  quantity INTEGER,
  description TEXT,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft'::text,
  exported_to_fortnox BOOLEAN DEFAULT false,
  fortnox_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  vat_percentage INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  time_entry_id UUID REFERENCES public.time_entries(id)
);

-- Create user_timers table for real-time tracking
CREATE TABLE IF NOT EXISTS public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  status TEXT NOT NULL,  -- 'running', 'paused', 'stopped'
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const RLS_POLICIES_SQL = `-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admin and managers can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin_or_manager());

-- System settings policies
CREATE POLICY "Anyone can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Administrators and managers can insert system settings" 
  ON public.system_settings 
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators and managers can update system settings" 
  ON public.system_settings 
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators can delete system settings" 
  ON public.system_settings 
  FOR DELETE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- News posts policies
CREATE POLICY "Anyone can read news posts" 
  ON public.news_posts 
  FOR SELECT 
  USING (true);

CREATE POLICY "Administrators and managers can create news posts" 
  ON public.news_posts 
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators and managers can update their own news posts" 
  ON public.news_posts 
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators and managers can delete their own news posts" 
  ON public.news_posts 
  FOR DELETE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Clients policies
CREATE POLICY "Anyone authenticated can read clients" 
  ON public.clients 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert clients" 
  ON public.clients 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update clients" 
  ON public.clients 
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admin and managers can delete clients" 
  ON public.clients 
  FOR DELETE 
  USING (public.is_admin_or_manager());

-- Products policies
CREATE POLICY "Anyone authenticated can read products" 
  ON public.products 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admin and managers can insert products" 
  ON public.products 
  FOR INSERT 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admin and managers can update products" 
  ON public.products 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admin and managers can delete products" 
  ON public.products 
  FOR DELETE 
  USING (public.is_admin_or_manager());

-- Time entries policies
CREATE POLICY "Users can view their own time entries" 
  ON public.time_entries 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and managers can view all time entries" 
  ON public.time_entries 
  FOR SELECT 
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can insert their own time entries" 
  ON public.time_entries 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" 
  ON public.time_entries 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id AND NOT invoiced);

CREATE POLICY "Admin and managers can update any time entries" 
  ON public.time_entries 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admin and managers can delete time entries" 
  ON public.time_entries 
  FOR DELETE 
  USING (public.is_admin_or_manager());

-- Invoice policies
CREATE POLICY "Authenticated users can read invoices" 
  ON public.invoices 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admin and managers can manage invoices" 
  ON public.invoices 
  FOR ALL 
  USING (public.is_admin_or_manager());

-- Invoice items policies
CREATE POLICY "Authenticated users can read invoice items" 
  ON public.invoice_items 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admin and managers can manage invoice items" 
  ON public.invoice_items 
  FOR ALL 
  USING (public.is_admin_or_manager());

-- User timers policies
CREATE POLICY "Users can view their own timers" 
  ON public.user_timers 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and managers can view all timers" 
  ON public.user_timers 
  FOR SELECT 
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can manage their own timers" 
  ON public.user_timers 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Token refresh logs policies
CREATE POLICY "Admins and managers can view token refresh logs" 
  ON public.token_refresh_logs 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin_or_manager());`;

const FUNCTIONS_SQL = `-- Helper functions for RLS and utility operations
CREATE OR REPLACE FUNCTION public.get_username(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  name_value TEXT;
BEGIN
  -- Get the name from metadata or use email as fallback
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data->>'name' IS NOT NULL THEN
    name_value := new.raw_user_meta_data->>'name';
  ELSE
    name_value := split_part(new.email, '@', 1);
  END IF;

  -- Create more robust profile entry
  INSERT INTO public.profiles (
    id,
    name,
    avatar_url,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    name_value,
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'
      ELSE 'user'
    END,
    now(),
    now()
  );

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error and still return the user so authentication succeeds
    RAISE NOTICE 'Error in handle_new_user function: %', SQLERRM;
    RETURN new;
END;
$$;

-- Update timestamp functions
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update user roles (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;

  -- Check if the new role is valid
  IF new_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin, manager, or user';
  END IF;

  -- Update the user's role
  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- System settings functions
CREATE OR REPLACE FUNCTION public.save_system_settings(
  setting_id TEXT,
  setting_data JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.system_settings (id, settings)
  VALUES (setting_id, setting_data)
  ON CONFLICT (id) 
  DO UPDATE SET 
    settings = setting_data,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_system_settings(
  setting_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  setting_result JSONB;
BEGIN
  SELECT settings INTO setting_result
  FROM public.system_settings
  WHERE id = setting_id;
  
  RETURN setting_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_system_settings(
  setting_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.system_settings
  WHERE id = setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply color theme (trigger update only, actual theme applied client-side)
CREATE OR REPLACE FUNCTION public.apply_theme_to_css_variables()
RETURNS TRIGGER AS $$
DECLARE
  theme_settings JSONB;
BEGIN
  -- Get the app settings
  SELECT settings INTO theme_settings 
  FROM public.system_settings 
  WHERE id = 'app_settings';
  
  -- We're just updating the trigger, the actual CSS changes are handled client-side
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const TRIGGERS_SQL = `-- Create auth user trigger to handle new users
CREATE TRIGGER handle_new_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add trigger to update the system_settings updated_at timestamp
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Add trigger to update news_posts updated_at timestamp
CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION update_news_posts_updated_at();

-- Add trigger to update css when theme changes
CREATE TRIGGER update_theme_css
AFTER UPDATE ON public.system_settings
FOR EACH ROW
WHEN (NEW.id = 'app_settings')
EXECUTE FUNCTION public.apply_theme_to_css_variables();

-- Add triggers to set updated_at for time entries
CREATE TRIGGER set_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add triggers to set updated_at for invoices
CREATE TRIGGER set_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add triggers to set updated_at for clients
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add triggers to set updated_at for products
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add triggers to set updated_at for token_refresh_logs
CREATE TRIGGER set_token_refresh_logs_updated_at
BEFORE UPDATE ON public.token_refresh_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add triggers to set updated_at for profiles
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();`;

const STORAGE_SQL = `-- Create application-logo bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create news_images bucket for news post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for application-logo bucket
CREATE POLICY "Allow public access to application logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'application-logo')
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin and manager can upload application logos" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'application-logo' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin and manager can update application logos" 
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-logo' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Admin and manager can delete application logos" 
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-logo' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
)
ON CONFLICT DO NOTHING;

-- Storage Policies for avatars bucket
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars')
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
ON CONFLICT DO NOTHING;

-- Storage Policies for news_images bucket
CREATE POLICY "Public can view news images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'news_images')
ON CONFLICT DO NOTHING;

CREATE POLICY "Administrators and managers can upload news images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Administrators and managers can update news images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Administrators and managers can delete news images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
)
ON CONFLICT DO NOTHING;`;

const INDEXES_SQL = `-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_client_id ON public.time_entries (client_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_product_id ON public.time_entries (product_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON public.time_entries (invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON public.time_entries (created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices (issue_date);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON public.invoice_items (product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_time_entry_id ON public.invoice_items (time_entry_id);

CREATE INDEX IF NOT EXISTS idx_user_timers_user_id ON public.user_timers (user_id);
CREATE INDEX IF NOT EXISTS idx_user_timers_client_id ON public.user_timers (client_id);
CREATE INDEX IF NOT EXISTS idx_user_timers_status ON public.user_timers (status);

CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_created_at ON public.token_refresh_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_success ON public.token_refresh_logs (success);`;

const DEFAULT_DATA_SQL = `-- Insert default settings - Green theme
INSERT INTO public.system_settings (id, settings)
VALUES ('app_settings', '{
  "appName": "Techlinx Time Tracker", 
  "primaryColor": "#4ba64b", 
  "secondaryColor": "#e8f5e9",
  "sidebarColor": "#326c32",
  "accentColor": "#4caf50"
}')
ON CONFLICT (id) DO UPDATE
SET settings = '{
  "appName": "Techlinx Time Tracker", 
  "primaryColor": "#4ba64b", 
  "secondaryColor": "#e8f5e9",
  "sidebarColor": "#326c32",
  "accentColor": "#4caf50"
}';

-- Insert default company news
INSERT INTO public.system_settings (id, settings)
VALUES ('company_news', 'Welcome to Techlinx Time Tracker company news! This is where important company announcements will be posted by administrators and managers.')
ON CONFLICT (id) DO NOTHING;`;

const FORTNOX_CRON_SQL = `-- Enable required extensions for cron jobs with HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get the Supabase project reference and anon key
DO $$
DECLARE
  project_ref TEXT := current_setting('request.jwt.claims')::json->>'sub'::text;
  anon_key TEXT; -- This will be set based on your actual anon key
  
  -- Use a dynamic secret key for Fortnox functions
  refresh_secret TEXT := 'fortnox-refresh-secret-key-' || project_ref;
BEGIN
  -- Store the refresh secret in server settings for reference
  EXECUTE format('ALTER DATABASE postgres SET app.settings.fortnox_refresh_secret = %L', refresh_secret);
  
  -- Schedule token refresh every 24 hours
  PERFORM cron.schedule(
    'refresh-fortnox-token-daily',
    '0 3 * * *',  -- Run at 3:00 AM every day
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer " || current_setting('request.jwt.claims')::json->>'anon_key',
        "x-api-key": "' || refresh_secret || '"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add more frequent token refresh job (every 15 minutes)
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/15 * * * *',  -- Run every 15 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer " || current_setting('request.jwt.claims')::json->>'anon_key',
        "x-api-key": "' || refresh_secret || '"
      }'::jsonb,
      body:='{"scheduled": true, "force": false}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add forced refresh job (every 12 hours)
  PERFORM cron.schedule(
    'refresh-fortnox-token-forced',
    '0 */12 * * *',  -- Run every 12 hours (at 00:00 and 12:00)
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer " || current_setting('request.jwt.claims')::json->>'anon_key',
        "x-api-key": "' || refresh_secret || '"
      }'::jsonb,
      body:='{"scheduled": true, "force": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;`;

// Combine all SQL for a complete setup
const FULL_SQL_SETUP = `-- ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- TABLE DEFINITIONS
${TABLES_SQL}

-- DATABASE FUNCTIONS
${FUNCTIONS_SQL}

-- TRIGGERS
${TRIGGERS_SQL}

-- ROW LEVEL SECURITY POLICIES
${RLS_POLICIES_SQL}

-- STORAGE BUCKETS AND POLICIES
${STORAGE_SQL}

-- PERFORMANCE INDEXES
${INDEXES_SQL}

-- DEFAULT DATA
${DEFAULT_DATA_SQL}

-- FORTNOX SCHEDULED REFRESH (CRON JOBS)
${FORTNOX_CRON_SQL}
`;

// List of required secrets for the application
const REQUIRED_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FORTNOX_REFRESH_SECRET",
  "JWT_SECRET",
];

export function InstanceSetupTab() {
  const [sqlCopied, setSqlCopied] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem("custom_supabase_url") || environment.supabase.url
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    localStorage.getItem("custom_supabase_anon_key") || environment.supabase.anonKey
  );
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [isReloading, setIsReloading] = useState(false);
  const [activeSqlSection, setActiveSqlSection] = useState<string | null>("all");

  // Check current connection status on component mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Check the Supabase connection using the current URL and key
  const checkConnection = async () => {
    try {
      // Create a temporary Supabase client with the current URL and key
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Try a simple query to check connection
      const { error } = await tempClient.from('system_settings').select('id').limit(1);
      
      if (error) {
        console.error("Connection test failed:", error);
        setConnectionStatus('error');
        return false;
      } else {
        setConnectionStatus('success');
        return true;
      }
    } catch (err) {
      console.error("Connection test error:", err);
      setConnectionStatus('error');
      return false;
    }
  };

  // Update env config and reload the application
  const handleSave = async () => {
    localStorage.setItem("custom_supabase_url", supabaseUrl);
    localStorage.setItem("custom_supabase_anon_key", supabaseAnonKey);
    
    // Test connection before reloading
    const isConnected = await checkConnection();
    
    if (isConnected) {
      toast.success("Supabase config saved. Reloading the app to apply changes...");
      setIsReloading(true);
      
      // Give the toast time to display before reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      toast.error("Failed to connect to Supabase. Please check your URL and Anon key.");
    }
  };

  // For displaying individual SQL section or full SQL
  const getDisplayedSql = () => {
    switch(activeSqlSection) {
      case "tables": return TABLES_SQL;
      case "functions": return FUNCTIONS_SQL;
      case "triggers": return TRIGGERS_SQL;
      case "rls": return RLS_POLICIES_SQL;
      case "storage": return STORAGE_SQL;
      case "indexes": return INDEXES_SQL;
      case "defaultData": return DEFAULT_DATA_SQL;
      case "fortnoxCron": return FORTNOX_CRON_SQL;
      default: return FULL_SQL_SETUP;
    }
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(getDisplayedSql());
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 1500);
  };

  // Detailed guide for setting up a new instance
  const DETAILED_GUIDE = `
# Complete Setup Guide for a New Time Tracking Instance

## 1. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/projects) and click "New Project".
2. Choose a project name and a secure password for the database.
3. Select a region close to your users.
4. Create the project and wait for it to initialize (usually takes 1-2 minutes).

## 2. Run the SQL Setup Scripts

1. Go to the SQL Editor in your new Supabase project.
2. Copy the full SQL setup from the "SQL Setup Commands" section below.
3. Paste and execute the SQL in the Supabase SQL editor.
   - If you encounter any errors, try running each section individually in this order:
     - Tables
     - Functions
     - Triggers
     - RLS Policies
     - Storage
     - Indexes
     - Default Data
     - Fortnox Cron Jobs (if needed)

## 3. Set Required Secrets

Set these secrets in the Supabase Console under Settings → API:
- \`SUPABASE_URL\`: Your Supabase project URL (already available)
- \`SUPABASE_ANON_KEY\`: Your public anon key (already available)
- \`SUPABASE_SERVICE_ROLE_KEY\`: Your service role key (already available)
- \`FORTNOX_REFRESH_SECRET\`: Create a secure random string for Fortnox token refresh (if using Fortnox)
- \`JWT_SECRET\`: Create a secure random string for JWT signing

## 4. Configure Authentication

1. Go to Authentication → Providers.
2. Enable Email provider.
3. Configure email templates (optional).
4. For development, disable email confirmation.

## 5. Deploy Edge Functions

The Fortnox integration requires several Edge Functions. Deploy these using the Supabase CLI or GitHub Actions.

## 6. Connect the Frontend to Your New Backend

1. Enter your Supabase URL and Anon Key in the "Supabase Backend Connection" section below.
2. Click "Save & Reload Required".
3. After reloading, you should be connected to your new backend.

## 7. Create Your First Admin User

1. Register a new user through the application.
2. The first user registered will automatically be assigned the "admin" role.
3. Log in with this user to access admin functionality.

## 8. Configure Appearance Settings

1. Go to Settings → Appearance to customize the application:
   - Application name
   - Color theme
   - Logo

## 9. Set Up Fortnox Integration (If Required)

1. Go to Settings → Integrations.
2. Enter your Fortnox Client ID and Client Secret.
3. Enable the integration and connect your Fortnox account.

## 10. Ready to Use!

Your new instance is now ready. Start by:
1. Creating clients
2. Adding products/services
3. Recording time entries
4. Generating invoices
`;

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Supabase Instance Setup Guide
          </CardTitle>
          <CardDescription>
            Complete guide to set up a new Supabase backend for this application. Follow these instructions to 
            clone the entire backend configuration to a new Supabase project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Detailed Step-by-Step Guide */}
            <section className="mb-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                <Info className="h-5 w-5" /> 
                Complete Setup Guide
              </h3>
              <div className="overflow-auto max-h-[300px] rounded bg-muted/30 p-4 text-sm mb-4">
                <pre className="whitespace-pre-wrap">{DETAILED_GUIDE}</pre>
              </div>
            </section>

            {/* Supabase Connection Settings */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Database className="h-5 w-5" />
                Supabase Backend Connection
              </h3>
              <div className="space-y-6 bg-muted/20 p-4 rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="supabase-url">Supabase Project URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="supabase-url"
                      type="text"
                      placeholder="https://your-project-ref.supabase.co"
                      value={supabaseUrl}
                      onChange={e => setSupabaseUrl(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center">
                      {connectionStatus === 'success' && <YesBadge />}
                      {connectionStatus === 'error' && <NoBadge />}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supabase-anon">Supabase Anon/Public Key</Label>
                  <Input
                    id="supabase-anon"
                    type="text"
                    placeholder="Supabase Anon Key"
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={checkConnection}
                    className="flex items-center gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Test Connection
                  </Button>
                  
                  <Button 
                    onClick={handleSave} 
                    disabled={isReloading}
                    className="flex items-center gap-2"
                  >
                    {isReloading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        Reloading...
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        Save & Reload Required
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground mt-2">
                  <p>
                    Enter your Supabase project URL and Anon Key to connect this application to a different backend.
                    After saving, the application will reload to connect to the new backend.
                  </p>
                  <p className="mt-2">
                    <strong>Current environment:</strong> {supabaseUrl === environment.supabase.url ? 
                      "Using default Supabase backend" : 
                      "Using custom Supabase backend"}
                  </p>
                </div>
              </div>
            </section>
            
            {/* SQL Scripts Section */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <Code className="h-5 w-5" />
                SQL Setup Commands
                <Button
                  type="button"
                  size="sm"
                  className="ml-2"
                  onClick={handleCopySql}
                  variant="outline"
                >
                  {sqlCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {sqlCopied ? "Copied!" : "Copy"}
                </Button>
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    variant={activeSqlSection === "all" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("all")}
                  >
                    Complete Setup
                  </Button>
                  <Button 
                    variant={activeSqlSection === "tables" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("tables")}
                  >
                    Tables
                  </Button>
                  <Button 
                    variant={activeSqlSection === "functions" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("functions")}
                  >
                    Functions
                  </Button>
                  <Button 
                    variant={activeSqlSection === "triggers" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("triggers")}
                  >
                    Triggers
                  </Button>
                  <Button 
                    variant={activeSqlSection === "rls" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("rls")}
                  >
                    RLS Policies
                  </Button>
                  <Button 
                    variant={activeSqlSection === "storage" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("storage")}
                  >
                    Storage
                  </Button>
                  <Button 
                    variant={activeSqlSection === "indexes" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("indexes")}
                  >
                    Indexes
                  </Button>
                  <Button 
                    variant={activeSqlSection === "defaultData" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("defaultData")}
                  >
                    Default Data
                  </Button>
                  <Button 
                    variant={activeSqlSection === "fortnoxCron" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setActiveSqlSection("fortnoxCron")}
                  >
                    Fortnox Cron
                  </Button>
                </div>
                
                <div className="relative">
                  <pre className="bg-muted/40 rounded p-4 overflow-auto text-xs max-h-[400px] whitespace-pre">{getDisplayedSql()}</pre>
                </div>
              </div>
            </section>
            
            {/* Required Secrets Section */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                <KeyRound className="h-5 w-5" />
                Required Supabase Secrets
              </h3>
              <div className="bg-muted/20 p-4 rounded-md">
                <p className="mb-2 text-sm">Set these secrets in the Supabase Console under <b>Project → Settings → API</b>:</p>
                <ul className="list-disc pl-6 text-sm space-y-2">
                  {REQUIRED_SECRETS.map(name => (
                    <li key={name}>
                      <code className="bg-muted px-1 py-0.5 rounded">{name}</code>
                      {name === "SUPABASE_URL" && <span className="text-muted-foreground ml-2">(already available in your project)</span>}
                      {name === "SUPABASE_ANON_KEY" && <span className="text-muted-foreground ml-2">(already available in your project)</span>}
                      {name === "SUPABASE_SERVICE_ROLE_KEY" && <span className="text-muted-foreground ml-2">(already available in your project)</span>}
                      {name === "FORTNOX_REFRESH_SECRET" && <span className="text-muted-foreground ml-2">(create a secure random string)</span>}
                      {name === "JWT_SECRET" && <span className="text-muted-foreground ml-2">(create a secure random string)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            
            {/* FAQ Section */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                <Info className="h-5 w-5" />
                FAQ & Troubleshooting
              </h3>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What if I get errors running the SQL setup?</AccordionTrigger>
                  <AccordionContent>
                    Try running each section individually in this order: Tables, Functions, Triggers, RLS Policies, Storage, Indexes, 
                    Default Data, and finally Fortnox Cron Jobs. If a specific error persists, check for conflicting object names or 
                    try running the commands after enabling Extensions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I migrate data from an existing instance?</AccordionTrigger>
                  <AccordionContent>
                    For data migration, use Supabase's pgAdmin interface to export data as CSV or SQL INSERT statements. 
                    Alternatively, write a script using the Supabase JavaScript client to read from the source database 
                    and write to the target database. Make sure to maintain relationships between tables.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I enable email confirmation for production?</AccordionTrigger>
                  <AccordionContent>
                    Go to Authentication → Providers → Email in the Supabase dashboard. Enable "Confirm email" and configure 
                    SMTP settings to send real emails. You can customize the email templates under Authentication → Email Templates.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Do I need to deploy the Edge Functions?</AccordionTrigger>
                  <AccordionContent>
                    Yes, if you use the Fortnox integration. Edge Functions are required for token exchange, refreshing, and scheduled 
                    tasks. Use the Supabase CLI or set up GitHub Actions to deploy them. The functions are located in the 
                    <code className="mx-1 p-0.5 bg-muted rounded">supabase/functions</code> directory of this project.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>How do I reset a user's password?</AccordionTrigger>
                  <AccordionContent>
                    In the Supabase dashboard, go to Authentication → Users, find the user, and select "Reset password". 
                    You can generate a password reset link or set a new password directly.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
            
            {/* Useful Links Section */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                <ExternalLink className="h-5 w-5" />
                Useful Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/new`} target="_blank" rel="noopener noreferrer">
                    <Database className="w-4 h-4 mr-2" />
                    Create New Supabase Project
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/_/sql`} target="_blank" rel="noopener noreferrer">
                    <Code className="w-4 h-4 mr-2" />
                    SQL Editor
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/_/auth/users`} target="_blank" rel="noopener noreferrer">
                    <KeyRound className="w-4 h-4 mr-2" />
                    User Management
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/_/storage/buckets`} target="_blank" rel="noopener noreferrer">
                    <Server className="w-4 h-4 mr-2" />
                    Storage Buckets
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/_/settings/api`} target="_blank" rel="noopener noreferrer">
                    <KeyRound className="w-4 h-4 mr-2" />
                    API Settings & Secrets
                  </a>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`https://app.supabase.com/project/_/functions`} target="_blank" rel="noopener noreferrer">
                    <Code className="w-4 h-4 mr-2" />
                    Edge Functions
                  </a>
                </Button>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
