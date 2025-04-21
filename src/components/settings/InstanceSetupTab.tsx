
import React, { useState } from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupabaseInstanceLinker } from './SupabaseInstanceLinker';
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, Info, KeyRound, Database, ShieldAlert, Lock, Code, FileCode, ServerCrash, Timer, Files } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const InstanceSetupTab = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState("sql");

  if (!isAdmin) {
    return (
      <TabsContent value="setup">
        <Card>
          <CardHeader>
            <CardTitle>Instance Setup</CardTitle>
            <CardDescription>
              Only administrators can access the instance setup options.
            </CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>Supabase Instance Setup</span>
          </CardTitle>
          <CardDescription>
            Complete guide to configure and deploy a new Supabase backend for this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="warning" className="border-amber-500 border-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-amber-600">Before You Begin</AlertTitle>
            <AlertDescription>
              This guide provides everything needed to set up a complete clone of the backend on a fresh Supabase instance.
              Follow all steps in the given order to ensure proper functionality. Once the setup is complete, you'll have
              a fully operational backend with all required tables, functions, storage buckets, and edge functions.
            </AlertDescription>
          </Alert>

          <SupabaseInstanceLinker />

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Complete Backend Setup Guide</h3>
            <p className="text-sm text-muted-foreground">
              Follow this step-by-step guide to set up a complete backend clone. Each step contains detailed instructions and code snippets.
            </p>

            <Accordion type="multiple" defaultValue={['step-1']}>
              <AccordionItem value="step-1">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    <span>1. Create a New Supabase Project</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Create a new project in Supabase with the following settings:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Organization: Your organization</li>
                    <li>Name: Techlinx Time Tracker (or your preferred name)</li>
                    <li>Database Password: Create a strong password</li>
                    <li>Region: Choose the region closest to your users</li>
                    <li>Pricing Plan: Free tier works for development, Pro for production</li>
                  </ul>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open('https://app.supabase.com/projects', '_blank')}>
                      Go to Supabase Dashboard
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-2">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>2. Set Up Database Schema</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Run the following SQL scripts in the Supabase SQL editor to create all required tables, functions, and policies.</p>
                  <p className="text-xs text-muted-foreground">Note: Execute these scripts in order. You can copy each section and run it separately.</p>

                  <Tabs defaultValue="sql" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-5 mb-2">
                      <TabsTrigger value="sql">Base Tables</TabsTrigger>
                      <TabsTrigger value="functions">Functions</TabsTrigger>
                      <TabsTrigger value="rls">RLS Policies</TabsTrigger>
                      <TabsTrigger value="storage">Storage</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  {activeTab === "sql" && (
                    <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                      <div className="space-y-4">
                        <Badge className="mb-2">Core Schema Setup</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profile handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  vat_percentage INTEGER DEFAULT 25,
  account_number TEXT,
  article_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  description TEXT,
  quantity INTEGER,
  invoice_id UUID,
  invoiced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_timers table
CREATE TABLE IF NOT EXISTS public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL,
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
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  fortnox_invoice_id TEXT,
  exported_to_fortnox BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  time_entry_id UUID REFERENCES public.time_entries(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  vat_percentage INTEGER NOT NULL
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
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  success BOOLEAN NOT NULL,
  token_length INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;`}
                        </pre>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === "functions" && (
                    <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                      <div className="space-y-4">
                        <Badge className="mb-2">Database Functions</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- Function to save system settings
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get username
CREATE OR REPLACE FUNCTION public.get_username(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER AS $$
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

-- Function to update timestamp on system settings changes
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the timestamp
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Function to update news posts updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the timestamp
CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION update_news_posts_updated_at();

-- Add a function to apply color theme (placeholder for client-side functionality)
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
$$ LANGUAGE plpgsql;

-- Add trigger to update css when theme changes
CREATE TRIGGER update_theme_css
AFTER UPDATE ON public.system_settings
FOR EACH ROW
WHEN (NEW.id = 'app_settings')
EXECUTE FUNCTION public.apply_theme_to_css_variables();`}
                        </pre>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === "rls" && (
                    <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                      <div className="space-y-4">
                        <Badge className="mb-2">Row Level Security Policies</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- SYSTEM SETTINGS POLICIES
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

-- NEWS POSTS POLICIES
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

-- TOKEN REFRESH LOGS POLICIES
CREATE POLICY "Admins and managers can view token refresh logs" 
  ON public.token_refresh_logs 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin_or_manager());

-- CLIENTS POLICIES
CREATE POLICY "Authenticated users can view all clients" 
  ON public.clients 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients" 
  ON public.clients 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update clients" 
  ON public.clients 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete clients" 
  ON public.clients 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- PRODUCTS POLICIES
CREATE POLICY "Authenticated users can view all products" 
  ON public.products 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products" 
  ON public.products 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update products" 
  ON public.products 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete products" 
  ON public.products 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- TIME ENTRIES POLICIES
CREATE POLICY "Users can view their own time entries" 
  ON public.time_entries 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all time entries" 
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
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update all time entries" 
  ON public.time_entries 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Users can delete their own time entries" 
  ON public.time_entries 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any time entry" 
  ON public.time_entries 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- USER TIMERS POLICIES
CREATE POLICY "Users can view their own timers" 
  ON public.user_timers 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timers" 
  ON public.user_timers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers" 
  ON public.user_timers 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers" 
  ON public.user_timers 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- INVOICES POLICIES
CREATE POLICY "Authenticated users can view all invoices" 
  ON public.invoices 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoices" 
  ON public.invoices 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoices" 
  ON public.invoices 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoices" 
  ON public.invoices 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- INVOICE ITEMS POLICIES
CREATE POLICY "Authenticated users can view all invoice items" 
  ON public.invoice_items 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoice items" 
  ON public.invoice_items 
  FOR INSERT 
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoice items" 
  ON public.invoice_items 
  FOR UPDATE 
  USING (public.is_admin_or_manager());

CREATE POLICY "Admins can delete invoice items" 
  ON public.invoice_items 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );`}
                        </pre>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === "storage" && (
                    <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                      <div className="space-y-4">
                        <Badge className="mb-2">Storage Buckets & Policies</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- Create application-logo bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create news_images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- APPLICATION LOGO STORAGE POLICIES
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

-- NEWS IMAGES STORAGE POLICIES
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
ON CONFLICT DO NOTHING;

-- AVATAR STORAGE POLICIES
CREATE POLICY "Users can view all avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars')
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.filename(name)::text = auth.uid()::text)
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)::text = auth.uid()::text)
)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)::text = auth.uid()::text)
)
ON CONFLICT DO NOTHING;`}
                        </pre>
                      </div>
                    </ScrollArea>
                  )}

                  {activeTab === "settings" && (
                    <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                      <div className="space-y-4">
                        <Badge className="mb-2">Default Settings</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- Insert default app settings
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

-- Enable required extensions for cron jobs with HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get the Supabase project reference and anon key
DO $$
DECLARE
  project_ref TEXT := current_setting('request.jwt.claims', true)::json->>'aud';
  anon_key TEXT := 'YOUR_ANON_KEY_HERE'; -- Replace with your actual key after project creation
  
  -- Use a fixed value that matches what's set in Edge Functions
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
        "Authorization": "Bearer ANON_KEY_PLACEHOLDER",
        "x-api-key": "fortnox-refresh-secret-key-PROJECT_REF_PLACEHOLDER"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
  
  -- More frequent refresh job (every 15 minutes)
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/15 * * * *',  -- Run every 15 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer ANON_KEY_PLACEHOLDER",
        "x-api-key": "fortnox-refresh-secret-key-PROJECT_REF_PLACEHOLDER"
      }'::jsonb,
      body:='{"scheduled": true, "force": false}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add a second job that runs every 12 hours with force=true to ensure token is refreshed
  PERFORM cron.schedule(
    'refresh-fortnox-token-forced',
    '0 */12 * * *',  -- Run every 12 hours (at 00:00 and 12:00)
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer ANON_KEY_PLACEHOLDER",
        "x-api-key": "fortnox-refresh-secret-key-PROJECT_REF_PLACEHOLDER"
      }'::jsonb,
      body:='{"scheduled": true, "force": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;

-- IMPORTANT: After running this script, you need to manually update the ANON_KEY_PLACEHOLDER and PROJECT_REF_PLACEHOLDER
-- in the cron jobs with your actual values. This can be done with:

/*
DO $$
DECLARE
  project_ref TEXT := 'your-project-ref';
  anon_key TEXT := 'your-anon-key';
BEGIN
  PERFORM cron.alter_job('refresh-fortnox-token-daily', 
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer [YOUR_ANON_KEY]",
        "x-api-key": "fortnox-refresh-secret-key-[YOUR_PROJECT_REF]"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Repeat for other cron jobs...
END
$$;
*/`}
                        </pre>
                      </div>
                    </ScrollArea>
                  )}
                  
                  <div className="pt-4 flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                    >
                      Open SQL Editor
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Important: After setting up the database, you must enable the required extensions (pg_cron and pg_net) and update the cron job queries with your actual project reference and anon key.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-3">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    <span>3. Deploy Edge Functions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Create and deploy the following edge functions in your Supabase project:</p>
                  
                  <Tabs defaultValue="function-list" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-2">
                      <TabsTrigger value="function-list">Function List</TabsTrigger>
                      <TabsTrigger value="function-config">Configuration</TabsTrigger>
                      <TabsTrigger value="function-code">Code</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="function-list">
                      <div className="rounded-md border p-4 bg-muted">
                        <Badge className="mb-2">Required Edge Functions</Badge>
                        <ul className="list-disc pl-6 space-y-1 text-xs">
                          <li><strong>fortnox-token-exchange</strong> - Handles OAuth token exchange with Fortnox</li>
                          <li><strong>fortnox-token-refresh</strong> - Refreshes Fortnox access tokens</li>
                          <li><strong>fortnox-token-migrate</strong> - Migrates legacy Fortnox tokens</li>
                          <li><strong>fortnox-proxy</strong> - Proxies requests to Fortnox API</li>
                          <li><strong>get-all-users</strong> - Retrieves all users for admin interface</li>
                          <li><strong>fortnox-token-debug</strong> - Debug tool for Fortnox token status</li>
                          <li><strong>fortnox-scheduled-refresh</strong> - Handles scheduled token refresh</li>
                        </ul>
                        <p className="text-xs mt-4">You can create these functions via the Supabase CLI or through the web interface. The code for each function is provided in the "Code" tab.</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="function-config">
                      <div className="rounded-md border p-4 bg-muted">
                        <Badge className="mb-2">Edge Function Configuration (config.toml)</Badge>
                        <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`# The project ID for your application on Supabase
project_id = "YOUR_PROJECT_ID"

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
verify_jwt = true

[functions.fortnox-token-debug]
verify_jwt = false`}
                        </pre>
                        <p className="text-xs mt-4 text-muted-foreground">
                          Replace "YOUR_PROJECT_ID" with your actual Supabase project ID. This file configures the edge functions and their security settings.
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="function-code">
                      <ScrollArea className="h-96 rounded-md border p-4 bg-muted">
                        <div className="space-y-6">
                          <div>
                            <Badge className="mb-2">Shared CORS Configuration</Badge>
                            <p className="text-xs mb-2">Create a file at <code>supabase/functions/_shared/cors.ts</code>:</p>
                            <pre className="whitespace-pre-wrap text-xs overflow-x-auto bg-neutral-100 dark:bg-neutral-900 p-2 rounded">
{`// Shared CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};`}
                            </pre>
                          </div>
                          
                          <div>
                            <Badge className="mb-2">Edge Function: fortnox-token-exchange/index.ts</Badge>
                            <p className="text-xs text-muted-foreground">This function handles OAuth token exchange with Fortnox.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs mb-2" 
                              onClick={() => navigator.clipboard.writeText(`// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Function to check if a value is a valid JWT
function isValidJwtFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Function to validate refresh token
function isValidRefreshToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

// Simple delay function for async operations
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to compute SHA-256 hash for token validation
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main handler function
Deno.serve(async (req) => {
  // Generate a unique session ID for tracing this exchange session
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(\`[\${sessionId}] Handling CORS preflight request\`);
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log(\`[\${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====\`);
  console.log(\`[\${sessionId}] Request method:\`, req.method);
  console.log(\`[\${sessionId}] Request headers:\`, req.headers);
  console.log(\`[\${sessionId}] Content-Type:\`, req.headers.get("Content-Type"));
  
  try {
    // Parse the request body
    let body;
    try {
      const rawText = await req.text();
      console.log(\`[\${sessionId}] Raw JSON body:\`, rawText);
      body = JSON.parse(rawText);
      console.log(\`[\${sessionId}] 📦 Parsed JSON body:\`, {
        client_id: body.client_id ? \`\${body.client_id.substring(0, 10)}...\` : undefined,
        client_secret: body.client_secret ? '•••' : undefined,
        code: body.code ? \`\${body.code.substring(0, 10)}...\` : undefined,
        redirect_uri: body.redirect_uri
      });
    } catch (e) {
      console.error(\`[\${sessionId}] Error parsing request body:\`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required parameters
    if (!body.code || !body.client_id || !body.client_secret || !body.redirect_uri) {
      console.error(\`[\${sessionId}] Missing required parameters:\`, {
        hasCode: !!body.code,
        hasClientId: !!body.client_id,
        hasClientSecret: !!body.client_secret,
        hasRedirectUri: !!body.redirect_uri
      });
      
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log key info for debugging
    console.log(\`[\${sessionId}] 🔄 Sending request to Fortnox:\`);
    console.log(\`[\${sessionId}] URL:\`, FORTNOX_TOKEN_URL);
    console.log(\`[\${sessionId}] Method: POST\`);
    console.log(\`[\${sessionId}] Headers:\`, {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic •••"
    });
    console.log(\`[\${sessionId}] Body (form data):\`, \`grant_type=authorization_code&code=\${body.code}&redirect_uri=\${encodeURIComponent(body.redirect_uri)}\`);
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = \`\${body.client_id}:\${body.client_secret}\`;
    const base64Auth = btoa(authString);
    const authHeader = \`Basic \${base64Auth}\`;
    
    // Make request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: formData
    });
    
    console.log(\`[\${sessionId}] 📬 Fortnox responded with status:\`, response.status);
    
    // Get response body as text
    const responseText = await response.text();
    console.log(\`[\${sessionId}] 🧾 Fortnox response body:\`, responseText);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(\`[\${sessionId}] Error parsing Fortnox response:\`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Invalid response from Fortnox' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(\`[\${sessionId}] Fortnox API returned error status \${response.status}:\`, responseData);
      return new Response(
        JSON.stringify(responseData),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(\`[\${sessionId}] Missing access_token in Fortnox response:\`, responseData);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Missing access token in response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate token formats
    const accessTokenValid = isValidJwtFormat(responseData.access_token);
    const refreshTokenValid = isValidRefreshToken(responseData.refresh_token);
    
    console.log(\`[\${sessionId}] Token validation:\`, {
      accessTokenValid,
      refreshTokenValid,
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token ? responseData.refresh_token.length : 0
    });
    
    if (!accessTokenValid) {
      console.error(\`[\${sessionId}] Invalid access token format received from Fortnox\`);
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Invalid access token format' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!refreshTokenValid) {
      console.warn(\`[\${sessionId}] Invalid or missing refresh token format from Fortnox\`);
      // We continue anyway since the access token is valid
    }
    
    // Log token details for debugging
    console.log(\`[\${sessionId}] 🔑 Received tokens:\`, {
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token?.length || 0,
      accessTokenPreview: \`\${responseData.access_token.substring(0, 20)}...\${responseData.access_token.substring(responseData.access_token.length - 20)}\`,
      refreshTokenPreview: responseData.refresh_token ? 
        \`\${responseData.refresh_token.substring(0, 10)}...\${responseData.refresh_token.substring(responseData.refresh_token.length - 5)}\` : 
        'none'
    });
    
    // Compute hashes for verification
    const accessTokenHash = await computeHash(responseData.access_token);
    const refreshTokenHash = responseData.refresh_token ? await computeHash(responseData.refresh_token) : 'no-refresh-token';
    
    console.log(\`[\${sessionId}] 🔐 Token hashes for verification:\`, {
      accessTokenHash: \`\${accessTokenHash.substring(0, 10)}...\`,
      refreshTokenHash: \`\${refreshTokenHash.substring(0, 10)}...\`,
    });
    
    // Return successful response with tokens and hashes for verification
    return new Response(
      JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        token_type: responseData.token_type,
        expires_in: responseData.expires_in,
        _debug: {
          session_id: sessionId,
          access_token_length: responseData.access_token.length,
          refresh_token_length: responseData.refresh_token?.length || 0,
          access_token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(\`[\${sessionId}] Unexpected error:\`, error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`)}
                            >
                              Copy Code
                            </Button>
                          </div>
                          
                          <div>
                            <Badge className="mb-2">Edge Function: fortnox-proxy/index.ts</Badge>
                            <p className="text-xs text-muted-foreground">This function proxies requests to the Fortnox API.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs mb-2" 
                              onClick={() => navigator.clipboard.writeText(`import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { endpoint, method, data, contentType, accessToken } = await req.json();

    // Validate required parameters
    if (!endpoint || !accessToken) {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Missing required parameters",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Format the request URL
    let url = \`https://api.fortnox.se/3/\${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}\`;

    // Replace double slashes in the URL path (except after the protocol)
    url = url.replace(/([^:]\/)\/+/g, "$1");

    console.log(\`Making \${method} request to Fortnox API: \${url}\`);

    // Prepare headers
    const headers = new Headers({
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': contentType || 'application/json',
      'Accept': 'application/json'
    });

    // Prepare request options
    const options: RequestInit = {
      method: method || 'GET',
      headers,
    };

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      if (contentType === 'application/json' && typeof data !== 'string') {
        options.body = JSON.stringify(data);
      } else {
        options.body = data;
      }
    }

    // Make the request to Fortnox API
    const response = await fetch(url, options);
    
    // Handle API-level errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = \`Fortnox API error \${response.status}\`;
      let errorDetails = errorText;
      
      try {
        // Try to parse error response
        const errorJson = JSON.parse(errorText);
        
        if (errorJson.ErrorInformation) {
          errorMessage = errorJson.ErrorInformation.message || errorMessage;
          errorDetails = JSON.stringify(errorJson.ErrorInformation);
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
          errorDetails = JSON.stringify(errorJson);
        }
      } catch (e) {
        // If parsing fails, use the raw error text
      }
      
      // Special handling for common errors
      if (response.status === 401) {
        errorMessage = "Fortnox authentication expired";
      } else if (response.status === 404) {
        // Check for specific article not found error
        if (errorText.includes("article") && errorText.includes("not found")) {
          // Extract the article number from the URL if possible
          const match = url.match(/articles\\/([^\\/]+)/);
          const articleNumber = match ? match[1] : null;
          
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                error: "article_not_found",
                message: "Article not found in Fortnox",
                status: response.status,
                articleDetails: {
                  articleNumber,
                  // Include additional details that might be useful for creating the article
                  description: "Auto-created by Techlinx app",
                  accountNumber: "3001", // Default account
                  vat: 25 // Default VAT
                }
              }),
              {
                status: 404,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
      }
      
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            status: response.status
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Parse and return the successful response
    const responseData = await response.json();
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          data: responseData,
          success: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Error in fortnox-proxy function:", error);
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          error: error.message || "Unknown error occurred",
          success: false
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});`)}
                            >
                              Copy Code
                            </Button>
                          </div>
                          
                          <div>
                            <Badge className="mb-2">Edge Function: get-all-users/index.ts</Badge>
                            <p className="text-xs text-muted-foreground">This function retrieves all users for admin interface.</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs mb-2" 
                              onClick={() => navigator.clipboard.writeText(`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// Updated CORS headers to ensure they work with all requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Get Supabase connection details from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceRole) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Extract the JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRole,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized access attempt:", userError?.message || "Auth session missing!");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin or manager
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      console.error("Access denied: User is not an admin or manager");
      return new Response(JSON.stringify({ error: 'Unauthorized. Only administrators and managers can access this function' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Get all users and their profiles
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error("Error listing users:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get all profiles to merge with user data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, avatar_url');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Map profiles to a dictionary for easy lookup
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Combine user data with profile data
    const combinedData = users.users.map(user => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        profile_name: profile?.name || null,
        profile_role: profile?.role || 'user',
        profile_avatar_url: profile?.avatar_url || null
      };
    });

    console.log("Successfully retrieved users:", combinedData.length);
    
    return new Response(JSON.stringify(combinedData), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in function:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});`)}
                            >
                              Copy Code
                            </Button>
                          </div>
                          
                          <div>
                            <Badge className="mb-2">More Functions</Badge>
                            <p className="text-xs text-muted-foreground">
                              Additional edge functions are required for complete setup. Each function's code can be found in the GitHub repository.
                              The remaining required functions are:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-xs mt-2">
                              <li>fortnox-token-refresh</li>
                              <li>fortnox-token-migrate</li>
                              <li>fortnox-token-debug</li>
                              <li>fortnox-scheduled-refresh</li>
                            </ul>
                            <p className="text-xs mt-2">
                              These functions should be copied from the source GitHub repository as they contain critical Fortnox integration code.
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                  
                  <Alert variant="info" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Edge Function Deployment</AlertTitle>
                    <AlertDescription className="text-xs">
                      You can deploy edge functions using the Supabase CLI or through the web interface. Make sure to set up all required environment variables in the Supabase dashboard under Settings &gt; Functions.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => window.open('https://supabase.com/dashboard/project/_/functions', '_blank')}
                    >
                      Go to Supabase Edge Functions
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-4">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>4. Configure Environment Variables</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Set the following environment variables in your Supabase project:</p>
                  <div className="bg-muted p-4 rounded space-y-4">
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> SUPABASE_URL
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your Supabase project URL (e.g., https://YOUR_PROJECT_ID.supabase.co)
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> SUPABASE_ANON_KEY
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your Supabase project anon/public key
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> SUPABASE_SERVICE_ROLE_KEY
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your Supabase project service role key (for admin access)
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> FORTNOX_REFRESH_SECRET
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Set this to: fortnox-refresh-secret-key-YOUR_PROJECT_ID (replace YOUR_PROJECT_ID with your actual project ID)
                      </div>
                    </div>
                  </div>
                  
                  <Alert variant="warning" className="mt-4 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-amber-800">Important</AlertTitle>
                    <AlertDescription className="text-xs text-amber-700">
                      These environment variables are essential for the proper functioning of the edge functions. Make sure they are correctly set in the Supabase dashboard under Settings &gt; API.
                      <br /><br />
                      For the FORTNOX_REFRESH_SECRET, use the format 'fortnox-refresh-secret-key-YOUR_PROJECT_ID' to ensure compatibility with cron jobs.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => window.open('https://supabase.com/dashboard/project/_/settings/api', '_blank')}
                    >
                      Go to Supabase API Settings
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-5">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>5. Configure Authentication</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Configure authentication settings in your Supabase project:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Enable Email/Password sign-up</li>
                    <li>Set Site URL to your application domain</li>
                    <li>Add allowed redirect URLs for your application domains</li>
                    <li>For development: Disable email confirmation (optional)</li>
                    <li>Set session expiry time (default: 1 week)</li>
                  </ul>
                  
                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>First User Setup</AlertTitle>
                    <AlertDescription className="text-xs">
                      The first user who signs up will automatically be assigned the 'admin' role.
                      All subsequent users will be assigned the 'user' role by default, which can be changed
                      by an administrator in the User Management section of the application.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs" 
                      onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}
                    >
                      Go to Supabase Auth Settings
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-6">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span>6. Set Up Cron Jobs (Optional)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>The Fortnox integration requires scheduled token refreshes to maintain connectivity. Set up the following cron jobs:</p>
                  
                  <ScrollArea className="h-60 rounded-md border p-4 bg-muted">
                    <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
{`-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update cron job settings
DO $$
DECLARE
  project_ref TEXT := 'YOUR_PROJECT_ID';
  anon_key TEXT := 'YOUR_ANON_KEY';
BEGIN
  -- Scheduled refresh every 15 minutes
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/15 * * * *',  -- Run every 15 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer YOUR_ANON_KEY",
        "x-api-key": "fortnox-refresh-secret-key-YOUR_PROJECT_ID"
      }'::jsonb,
      body:='{"scheduled": true, "force": false}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Forced refresh every 12 hours
  PERFORM cron.schedule(
    'refresh-fortnox-token-forced',
    '0 */12 * * *',  -- Run every 12 hours
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer YOUR_ANON_KEY",
        "x-api-key": "fortnox-refresh-secret-key-YOUR_PROJECT_ID"
      }'::jsonb,
      body:='{"scheduled": true, "force": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;`}
                    </pre>
                  </ScrollArea>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Replace 'YOUR_PROJECT_ID' and 'YOUR_ANON_KEY' with your actual Supabase project ID and anon key.
                    These cron jobs will keep the Fortnox integration active by refreshing tokens periodically.
                  </p>
                  
                  <Alert variant="info" className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      The cron job setup is only required if you plan to use the Fortnox integration. You can skip this step if you don't need Fortnox functionality.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-7">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Files className="h-4 w-4" />
                    <span>7. Deploy and Link Frontend</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Finally, link your frontend application to the newly created Supabase backend:</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Pull the frontend code from the GitHub repository</li>
                    <li>Copy your Supabase project URL (from the settings page)</li>
                    <li>Copy your Supabase anon/public key</li>
                    <li>Use the Instance Linker on this page to connect to your new Supabase instance</li>
                    <li>Test the connection</li>
                    <li>Save and use the new configuration</li>
                  </ol>
                  
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Success Criteria</AlertTitle>
                    <AlertDescription className="text-xs text-green-700">
                      Your setup is complete when:
                      <ul className="list-disc pl-6 mt-1">
                        <li>The Instance Linker shows a successful connection</li>
                        <li>You can sign up and log in</li>
                        <li>The application dashboard loads with no errors</li>
                        <li>You can create and view clients, products, and time entries</li>
                        <li>You can manage user roles in the administration section</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-8">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <ServerCrash className="h-4 w-4" />
                    <span>8. Troubleshooting</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>If you encounter issues during setup, check the following common problems:</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm">Authentication Issues</h4>
                      <ul className="list-disc pl-6 space-y-1 text-xs">
                        <li>Verify that email auth is enabled in Supabase Auth settings</li>
                        <li>Check that site URL and redirect URLs are correctly configured</li>
                        <li>For development, consider disabling email confirmation</li>
                        <li>Check browser console for auth-related errors</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Database Connection Issues</h4>
                      <ul className="list-disc pl-6 space-y-1 text-xs">
                        <li>Verify that all SQL scripts executed successfully</li>
                        <li>Check for any SQL errors in the Supabase SQL editor logs</li>
                        <li>Ensure RLS policies are correctly configured</li>
                        <li>Confirm that the environment variables are correctly set</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Edge Function Issues</h4>
                      <ul className="list-disc pl-6 space-y-1 text-xs">
                        <li>Check edge function logs for deployment errors</li>
                        <li>Verify that all required secrets are set in Supabase</li>
                        <li>Ensure the config.toml file has the correct settings</li>
                        <li>Check CORS headers are properly set in each function</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Fortnox Integration Issues</h4>
                      <ul className="list-disc pl-6 space-y-1 text-xs">
                        <li>Verify the cron jobs are correctly set up</li>
                        <li>Check that FORTNOX_REFRESH_SECRET is correctly configured</li>
                        <li>Check edge function logs for token refresh errors</li>
                        <li>Ensure you have valid Fortnox API credentials</li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    When troubleshooting, always check the browser console logs for frontend errors and
                    the Supabase Edge Function logs for backend errors.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Additional Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <h4 className="font-medium text-sm">Supabase Documentation</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Official documentation for Supabase features and services.
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2" onClick={() => window.open('https://supabase.com/docs', '_blank')}>
                  Visit Documentation →
                </Button>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <h4 className="font-medium text-sm">GitHub Repository</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Source code for the application with implementation details.
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2" onClick={() => window.open('https://github.com/yourusername/techlinx-timetracker', '_blank')}>
                  View Repository →
                </Button>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
