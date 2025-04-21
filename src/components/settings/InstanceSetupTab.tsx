
import React, { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Code, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseInstanceLinker } from './SupabaseInstanceLinker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const InstanceSetupTab = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CodeBlock = ({ code, language = 'sql', label }: { code: string; language?: string; label: string }) => (
    <div className="relative">
      <pre className="p-4 rounded-md bg-muted/50 text-sm overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, label)}
      >
        <Copy className={`h-4 w-4 ${copied === label ? 'text-green-500' : ''}`} />
      </Button>
    </div>
  );

  return (
    <TabsContent value="setup" className="space-y-6">
      {/* Emergency Admin Access Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Emergency Admin Access</AlertTitle>
        <AlertDescription>
          This application has an emergency admin access feature when not connected to Supabase.
          Username: <strong>techlinxadmin</strong>, Password: <strong>Snowball9012@</strong>
        </AlertDescription>
      </Alert>

      {/* Supabase Instance Linking Section */}
      <SupabaseInstanceLinker />

      {/* Main Setup Tutorial Accordion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <span>Complete Instance Setup Guide</span>
          </CardTitle>
          <CardDescription>
            Follow this step-by-step guide to set up your own instance of this application.
            This guide includes EVERYTHING needed to fully recreate the backend infrastructure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="general">
            {/* General Information */}
            <AccordionItem value="general">
              <AccordionTrigger className="text-lg font-medium">
                General Information & Prerequisites
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Prerequisites</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>A Supabase account (free tier works fine)</li>
                    <li>Basic understanding of SQL and database management</li>
                    <li>Access to the Fortnox API (for accounting integration)</li>
                    <li>Node.js and npm installed (for local development if needed)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Overview</h3>
                  <p>
                    This tutorial will guide you through setting up the complete backend infrastructure needed
                    for this time tracking and invoicing system. It includes:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Creating all required database tables</li>
                    <li>Setting up Row Level Security (RLS) policies</li>
                    <li>Creating necessary database functions and triggers</li>
                    <li>Setting up edge functions for the Fortnox integration</li>
                    <li>Configuring all required secrets</li>
                    <li>Setting up storage buckets</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 1: Create Supabase Project */}
            <AccordionItem value="step1">
              <AccordionTrigger className="text-lg font-medium">
                Step 1: Create Supabase Project
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Create a New Supabase Project</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Supabase.com</a> and sign in</li>
                    <li>Click "New Project"</li>
                    <li>Name your project (e.g., "TimeTrackingApp")</li>
                    <li>Choose a strong database password (save it securely)</li>
                    <li>Select a region close to your users</li>
                    <li>Click "Create new project" and wait for it to initialize</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Configure Authentication</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>In the Supabase dashboard, go to Authentication → Settings</li>
                    <li>Under "Email Auth", enable "Email confirmations" or disable it for development</li>
                    <li>Configure password strength requirements if needed</li>
                    <li>Save changes</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Set Up Required Project Secrets */}
            <AccordionItem value="step2">
              <AccordionTrigger className="text-lg font-medium">
                Step 2: Set Up Required Project Secrets
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Configure Required Secrets</h3>
                  <p>
                    Navigate to the Supabase dashboard, go to Project Settings → API → Edge Functions and add the following secrets:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>SUPABASE_URL</strong>: Your Supabase project URL (e.g., https://your-project-id.supabase.co)</li>
                    <li><strong>SUPABASE_ANON_KEY</strong>: Your Supabase project's anon/public key</li>
                    <li><strong>SUPABASE_SERVICE_ROLE_KEY</strong>: Your Supabase project's service role key (for admin operations)</li>
                    <li><strong>SUPABASE_DB_URL</strong>: Your Supabase PostgreSQL connection string</li>
                    <li><strong>FORTNOX_REFRESH_SECRET</strong>: A secret key for Fortnox token refresh operations</li>
                    <li><strong>JWT_SECRET</strong>: A secret key for JWT token signing/verification</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can find your Supabase URL and keys in Project Settings → API → Project API keys.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Set Up Database Tables */}
            <AccordionItem value="step3">
              <AccordionTrigger className="text-lg font-medium">
                Step 3: Set Up Database Tables
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Create Core Tables</h3>
                  <p>Run the following SQL in the Supabase SQL Editor to create all required tables:</p>

                  <CodeBlock 
                    label="Core Tables SQL"
                    code={`-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_number TEXT,
  client_number TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  county TEXT,
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  fortnox_customer_number TEXT
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  account_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  article_number TEXT
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  product_id UUID REFERENCES public.products(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  quantity INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  total_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  invoice_number TEXT NOT NULL,
  fortnox_invoice_id TEXT,
  exported_to_fortnox BOOLEAN DEFAULT false
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_percentage INTEGER NOT NULL,
  time_entry_id UUID REFERENCES public.time_entries(id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fortnox_tokens table
CREATE TABLE IF NOT EXISTS public.fortnox_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT,
  token_type TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fortnox_token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.fortnox_token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.fortnox_tokens(id),
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create news_posts table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published BOOLEAN DEFAULT false,
  image_url TEXT
);

-- Create user_timers table (for active time tracking)
CREATE TABLE IF NOT EXISTS public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  product_id UUID REFERENCES public.products(id),
  status TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create token_refresh_logs table (for debugging auth)
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success BOOLEAN NOT NULL,
  message TEXT,
  session_id TEXT,
  token_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);`}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-md font-medium">Create Database Functions</h3>
                  <p>Run the following SQL to create necessary database functions:</p>

                  <CodeBlock 
                    label="Database Functions SQL"
                    code={`-- Function to handle new users
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

-- Function to get username
CREATE OR REPLACE FUNCTION public.get_username(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

-- Function to check if user is admin or manager
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

-- Function to get user role
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

-- Function to update system settings updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update news posts updated_at
CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update user role
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

-- Function to save system settings
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

-- Function to get system settings
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

-- Function to delete system settings
CREATE OR REPLACE FUNCTION public.delete_system_settings(
  setting_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.system_settings
  WHERE id = setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-md font-medium">Create Triggers</h3>
                  <p>Run this SQL to create database triggers:</p>

                  <CodeBlock 
                    label="Database Triggers SQL"
                    code={`-- Trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for system settings updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Trigger for news posts updated_at
CREATE TRIGGER update_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_news_posts_updated_at();`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Set Up Row Level Security */}
            <AccordionItem value="step4">
              <AccordionTrigger className="text-lg font-medium">
                Step 4: Set Up Row Level Security
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Configure Row Level Security (RLS)</h3>
                  <p>Run this SQL to enable and configure Row Level Security for all tables:</p>

                  <CodeBlock 
                    label="RLS Policies SQL"
                    code={`-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_token_refresh_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- Clients policies
CREATE POLICY "Authenticated users can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update clients"
  ON public.clients FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Time entries policies
CREATE POLICY "Users can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all time entries"
  ON public.time_entries FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update any time entry"
  ON public.time_entries FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can delete their own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can delete any time entry"
  ON public.time_entries FOR DELETE
  USING (public.is_admin_or_manager());

-- Invoices policies
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Invoice items policies
CREATE POLICY "Authenticated users can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoice items"
  ON public.invoice_items FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoice items"
  ON public.invoice_items FOR DELETE
  USING (public.get_user_role() = 'admin');

-- System settings policies
CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can update system settings"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can insert system settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins can delete system settings"
  ON public.system_settings FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Fortnox tokens policies
CREATE POLICY "Admins can view fortnox tokens"
  ON public.fortnox_tokens FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can insert fortnox tokens"
  ON public.fortnox_tokens FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Admins can update fortnox tokens"
  ON public.fortnox_tokens FOR UPDATE
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete fortnox tokens"
  ON public.fortnox_tokens FOR DELETE
  USING (public.get_user_role() = 'admin');

-- Fortnox token refresh logs policies
CREATE POLICY "Admins can view fortnox token refresh logs"
  ON public.fortnox_token_refresh_logs FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Service can insert fortnox token refresh logs"
  ON public.fortnox_token_refresh_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.get_user_role() = 'admin');

-- News posts policies
CREATE POLICY "Authenticated users can view published news posts"
  ON public.news_posts FOR SELECT
  TO authenticated
  USING (published = true OR created_by = auth.uid() OR public.is_admin_or_manager());

CREATE POLICY "Admins and managers can insert news posts"
  ON public.news_posts FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Authors can update their own news posts"
  ON public.news_posts FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin_or_manager());

CREATE POLICY "Admins can delete news posts"
  ON public.news_posts FOR DELETE
  USING (public.get_user_role() = 'admin');

-- User timers policies
CREATE POLICY "Users can view their own timers"
  ON public.user_timers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all timers"
  ON public.user_timers FOR SELECT
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can insert their own timers"
  ON public.user_timers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers"
  ON public.user_timers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update any timer"
  ON public.user_timers FOR UPDATE
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can delete their own timers"
  ON public.user_timers FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can delete any timer"
  ON public.user_timers FOR DELETE
  USING (public.is_admin_or_manager());

-- Token refresh logs policies
CREATE POLICY "Admins can view token refresh logs"
  ON public.token_refresh_logs FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Service role can insert token refresh logs"
  ON public.token_refresh_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.get_user_role() = 'admin');`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 5: Create Storage Buckets */}
            <AccordionItem value="step5">
              <AccordionTrigger className="text-lg font-medium">
                Step 5: Create Storage Buckets
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Set Up Storage for Files and Images</h3>
                  <p>Run this SQL to create and configure storage buckets:</p>

                  <CodeBlock 
                    label="Storage Buckets SQL"
                    code={`-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'User Avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif']),
  ('application-logo', 'Application Logo', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/svg+xml']),
  ('news_images', 'News Post Images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif']);

-- Create storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create storage policies for application-logo
CREATE POLICY "Anyone can view application logo"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'application-logo');

CREATE POLICY "Admins and managers can upload application logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'application-logo' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update application logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'application-logo' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can delete application logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'application-logo' AND public.is_admin_or_manager());

-- Create storage policies for news_images
CREATE POLICY "Anyone can view news images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news_images');

CREATE POLICY "Admins and managers can upload news images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'news_images' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update news images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'news_images' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can delete news images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'news_images' AND public.is_admin_or_manager());`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 6: Create Edge Functions */}
            <AccordionItem value="step6">
              <AccordionTrigger className="text-lg font-medium">
                Step 6: Create Edge Functions
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Fortnox Integration Edge Functions</h3>
                  <p>Create the following edge functions in your Supabase project:</p>

                  <div className="mt-4 mb-2">
                    <h4 className="font-medium">1. fortnox-token-exchange</h4>
                    <p className="text-sm mb-2">This function handles the OAuth token exchange for Fortnox:</p>
                    <CodeBlock 
                      label="fortnox-token-exchange"
                      language="typescript"
                      code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { authorizationCode, clientId, clientSecret, redirectUri } = await req.json()
    
    // Validate all required parameters
    if (!authorizationCode || !clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare the token exchange request to Fortnox
    const tokenRequest = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': authorizationCode,
        'redirect_uri': redirectUri,
        'client_id': clientId,
        'client_secret': clientSecret
      })
    })

    const tokenResponse = await tokenRequest.json()
    
    if (tokenRequest.status !== 200) {
      console.error('Fortnox token exchange error:', tokenResponse)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange authorization code for token',
          details: tokenResponse 
        }),
        { 
          status: tokenRequest.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Add expiration timestamp to the token response
    const expiresInSeconds = tokenResponse.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    
    const tokenData = {
      ...tokenResponse,
      expires_at: expiresAt
    }

    // Save token to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = await fetch(\`\${supabaseUrl}/rest/v1/fortnox_tokens\`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': \`Bearer \${supabaseServiceKey}\`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        expires_at: tokenData.expires_at
      })
    })

    if (supabaseAdmin.status !== 201) {
      const error = await supabaseAdmin.text()
      console.error('Error saving Fortnox token to database:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save token to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success response with token data
    return new Response(
      JSON.stringify({
        success: true,
        token: {
          scope: tokenData.scope,
          expiresAt: tokenData.expires_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in fortnox-token-exchange:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                    />
                  </div>

                  <div className="mt-4 mb-2">
                    <h4 className="font-medium">2. fortnox-token-refresh</h4>
                    <p className="text-sm mb-2">This function refreshes Fortnox OAuth tokens:</p>
                    <CodeBlock 
                      label="fortnox-token-refresh"
                      language="typescript"
                      code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { refreshToken, clientId, clientSecret } = await req.json()
    
    // Validate all required parameters
    if (!refreshToken || !clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare the token refresh request to Fortnox
    const tokenRequest = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
        'client_id': clientId,
        'client_secret': clientSecret
      })
    })

    const tokenResponse = await tokenRequest.json()
    
    if (tokenRequest.status !== 200) {
      console.error('Fortnox token refresh error:', tokenResponse)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to refresh token',
          details: tokenResponse 
        }),
        { 
          status: tokenRequest.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Add expiration timestamp to the token response
    const expiresInSeconds = tokenResponse.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    
    const tokenData = {
      ...tokenResponse,
      expires_at: expiresAt
    }

    // Update token in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Get existing token record to update
    const tokenQuery = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens?refresh_token=eq.\${encodeURIComponent(refreshToken)}&select=id\`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': \`Bearer \${supabaseServiceKey}\`
        }
      }
    )

    const tokenQueryResult = await tokenQuery.json()
    
    if (!tokenQueryResult || tokenQueryResult.length === 0) {
      console.error('No token found with provided refresh_token')
      return new Response(
        JSON.stringify({ error: 'Token not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenId = tokenQueryResult[0].id

    // Update the token record
    const supabaseUpdate = await fetch(\`\${supabaseUrl}/rest/v1/fortnox_tokens?id=eq.\${tokenId}\`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': \`Bearer \${supabaseServiceKey}\`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // Note that refresh token might also be updated
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        expires_at: tokenData.expires_at,
        updated_at: new Date().toISOString()
      })
    })

    if (supabaseUpdate.status !== 204) {
      const error = await supabaseUpdate.text()
      console.error('Error updating Fortnox token in database:', error)
      
      // Log the refresh attempt
      await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': \`Bearer \${supabaseServiceKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_id: tokenId,
          success: false,
          error: error
        })
      })
      
      return new Response(
        JSON.stringify({ error: 'Failed to update token in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful refresh
    await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': \`Bearer \${supabaseServiceKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token_id: tokenId,
        success: true
      })
    })

    // Return success response with token data
    return new Response(
      JSON.stringify({
        success: true,
        token: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          expiresAt: tokenData.expires_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in fortnox-token-refresh:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                    />
                  </div>

                  <div className="mt-4 mb-2">
                    <h4 className="font-medium">3. fortnox-proxy</h4>
                    <p className="text-sm mb-2">This function proxies requests to the Fortnox API:</p>
                    <CodeBlock 
                      label="fortnox-proxy"
                      language="typescript"
                      code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const FORTNOX_API_URL = 'https://api.fortnox.se/3'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { path, method, body, params } = await req.json()
    
    // Validate required parameters
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Fortnox token from Supabase database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Get the latest token
    const tokenQuery = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens?order=created_at.desc&limit=1\`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': \`Bearer \${supabaseServiceKey}\`
        }
      }
    )

    const tokens = await tokenQuery.json()
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Fortnox token found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = tokens[0]
    
    // Check if token is expired
    const expiresAt = new Date(token.expires_at)
    const now = new Date()
    
    if (now >= expiresAt) {
      return new Response(
        JSON.stringify({ 
          error: 'Fortnox token has expired', 
          tokenExpired: true 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the URL with query parameters
    let url = \`\${FORTNOX_API_URL}/\${path}\`
    
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, value)
      }
      url += \`?\${queryParams.toString()}\`
    }

    // Prepare headers for Fortnox API request
    const headers = {
      'Authorization': \`Bearer \${token.access_token}\`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Make request to Fortnox API
    const requestOptions: RequestInit = {
      method: method || 'GET',
      headers
    }
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body)
    }

    const fortnoxResponse = await fetch(url, requestOptions)
    
    // Get the response body
    let responseBody
    const contentType = fortnoxResponse.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await fortnoxResponse.json()
    } else {
      responseBody = await fortnoxResponse.text()
    }

    // Return the Fortnox API response
    return new Response(
      typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
      { 
        status: fortnoxResponse.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': contentType || 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in fortnox-proxy:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error in Fortnox proxy' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                    />
                  </div>

                  <div className="mt-4 mb-2">
                    <h4 className="font-medium">4. fortnox-scheduled-refresh</h4>
                    <p className="text-sm mb-2">This function automatically refreshes Fortnox tokens on a schedule:</p>
                    <CodeBlock 
                      label="fortnox-scheduled-refresh"
                      language="typescript"
                      code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Check authorization if this is a scheduled run
    const authorization = req.headers.get('Authorization')
    
    if (refreshSecret && (!authorization || authorization !== \`Bearer \${refreshSecret}\`)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Fortnox client credentials
    const settingsQuery = await fetch(
      \`\${supabaseUrl}/rest/v1/system_settings?id=eq.fortnox_settings&select=settings\`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': \`Bearer \${supabaseServiceKey}\`
        }
      }
    )

    const settingsResult = await settingsQuery.json()
    
    if (!settingsResult || settingsResult.length === 0 || !settingsResult[0].settings) {
      return new Response(
        JSON.stringify({ error: 'Fortnox settings not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settings = settingsResult[0].settings
    
    if (!settings.clientId || !settings.clientSecret || !settings.enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'Fortnox integration not properly configured or not enabled',
          status: 'disabled' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tokens that need refresh (expiring within the next hour)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const tokensQuery = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens?expires_at=lt.\${oneHourFromNow}&order=created_at.desc\`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': \`Bearer \${supabaseServiceKey}\`
        }
      }
    )

    const tokens = await tokensQuery.json()
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tokens need refreshing at this time' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each token that needs to be refreshed
    const refreshResults = []
    
    for (const token of tokens) {
      try {
        // Prepare the token refresh request to Fortnox
        const tokenRequest = await fetch(FORTNOX_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': token.refresh_token,
            'client_id': settings.clientId,
            'client_secret': settings.clientSecret
          })
        })

        const tokenResponse = await tokenRequest.json()
        
        if (tokenRequest.status !== 200) {
          console.error(\`Fortnox token refresh error for token \${token.id}:\`, tokenResponse)
          
          // Log failed refresh attempt
          await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': \`Bearer \${supabaseServiceKey}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token_id: token.id,
              success: false,
              error: JSON.stringify(tokenResponse)
            })
          })
          
          refreshResults.push({
            tokenId: token.id,
            success: false,
            error: tokenResponse
          })
          
          continue
        }

        // Add expiration timestamp to the token response
        const expiresInSeconds = tokenResponse.expires_in || 3600
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        
        // Update the token in the database
        const supabaseUpdate = await fetch(\`\${supabaseUrl}/rest/v1/fortnox_tokens?id=eq.\${token.id}\`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': \`Bearer \${supabaseServiceKey}\`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            scope: tokenResponse.scope,
            token_type: tokenResponse.token_type,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
        })

        if (supabaseUpdate.status !== 204) {
          const error = await supabaseUpdate.text()
          console.error(\`Error updating token \${token.id} in database:\`, error)
          
          // Log failed update attempt
          await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': \`Bearer \${supabaseServiceKey}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token_id: token.id,
              success: false,
              error: error
            })
          })
          
          refreshResults.push({
            tokenId: token.id,
            success: false,
            error: 'Database update failed'
          })
          
          continue
        }

        // Log successful refresh
        await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': \`Bearer \${supabaseServiceKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token_id: token.id,
            success: true
          })
        })
        
        refreshResults.push({
          tokenId: token.id,
          success: true,
          expiresAt
        })
      } catch (error) {
        console.error(\`Unexpected error refreshing token \${token.id}:\`, error)
        
        // Log error
        await fetch(\`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': \`Bearer \${supabaseServiceKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token_id: token.id,
            success: false,
            error: error.message || 'Unexpected error'
          })
        })
        
        refreshResults.push({
          tokenId: token.id,
          success: false,
          error: error.message || 'Unexpected error'
        })
      }
    }

    // Return summary of refresh operations
    return new Response(
      JSON.stringify({
        refreshed: refreshResults.length,
        successful: refreshResults.filter(r => r.success).length,
        failed: refreshResults.filter(r => !r.success).length,
        results: refreshResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in fortnox-scheduled-refresh:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                    />
                  </div>

                  <div className="mt-4 mb-2">
                    <h4 className="font-medium">5. _shared/cors.ts</h4>
                    <p className="text-sm mb-2">Create a shared CORS helper file:</p>
                    <CodeBlock 
                      label="_shared/cors.ts"
                      language="typescript"
                      code={`export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}`}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 7: Configure Default System Settings */}
            <AccordionItem value="step7">
              <AccordionTrigger className="text-lg font-medium">
                Step 7: Configure Default System Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Insert Default System Settings</h3>
                  <p>Run the following SQL to add default system settings:</p>

                  <CodeBlock 
                    label="Default System Settings SQL"
                    code={`-- Insert default application settings
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
ON CONFLICT (id) DO NOTHING;

-- Insert default Fortnox settings (disabled by default)
INSERT INTO public.system_settings (id, settings)
VALUES ('fortnox_settings', '{
  "clientId": "",
  "clientSecret": "",
  "enabled": false
}')
ON CONFLICT (id) DO NOTHING;`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 8: Set Up Supabase Config for Edge Functions */}
            <AccordionItem value="step8">
              <AccordionTrigger className="text-lg font-medium">
                Step 8: Configure Edge Functions in config.toml
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Update supabase/config.toml</h3>
                  <p>Create or update the supabase/config.toml file with this content:</p>

                  <CodeBlock 
                    label="supabase/config.toml"
                    language="toml"
                    code={`# The project ID for your application on Supabase
project_id = "your-project-id-here"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost"

[inbucket]
enabled = true
port = 54324

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[auth.external.apple]
enabled = false
client_id = ""
secret = ""
redirect_uri = ""

[auth.external.google]
enabled = false
client_id = ""
secret = ""
redirect_uri = ""

[auth.external.facebook]
enabled = false
client_id = ""
secret = ""
redirect_uri = ""

[analytics]
enabled = false
port = 54327
vector_port = 54328
backend = "postgres"

[realtime]
enabled = true

[functions]
[functions.fortnox-token-exchange]
verify_jwt = false

[functions.fortnox-scheduled-refresh]
verify_jwt = false

[functions.fortnox-token-refresh]
verify_jwt = false

[functions.fortnox-token-migrate]
verify_jwt = false

[functions.fortnox-proxy]
verify_jwt = false

[functions.get-all-users]
verify_jwt = true`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Final Instructions */}
            <AccordionItem value="final">
              <AccordionTrigger className="text-lg font-medium">
                Final Configuration Steps
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Setup Auth Domain and URL Configuration</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>In the Supabase dashboard, go to Authentication → URL Configuration</li>
                    <li>Set Site URL to your application's URL (e.g., https://yourdomain.com)</li>
                    <li>Add Redirect URLs for all domains where your application will be accessed</li>
                    <li>Save changes</li>
                  </ol>
                </div>

                <div className="space-y-2 mt-4">
                  <h3 className="text-md font-medium">Test Your Configuration</h3>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Connect the frontend to your new Supabase instance using the SupabaseInstanceLinker above</li>
                    <li>Try to sign up and log in with a new user to verify authentication works</li>
                    <li>Check that the first user is automatically assigned the admin role</li>
                    <li>Test creating clients, products, and time entries</li>
                    <li>If using Fortnox integration, configure the Fortnox API credentials in Settings</li>
                  </ol>
                </div>

                <div className="mt-4 p-4 border border-yellow-500 bg-yellow-50 rounded-md">
                  <h3 className="font-medium text-yellow-800">Important Notes</h3>
                  <ul className="list-disc list-inside mt-2 text-yellow-700 space-y-1">
                    <li>Make sure to set strong passwords for all admin users</li>
                    <li>Keep your Supabase service keys secure and never expose them in the frontend code</li>
                    <li>For production, consider enabling email verification in Authentication settings</li>
                    <li>Regularly back up your database to prevent data loss</li>
                    <li>If you encounter issues with Edge Functions, check the logs in the Supabase dashboard</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
