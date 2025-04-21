import React, { useState } from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Database, ExternalLink, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const InstanceSetupTab = () => {
  const { toast } = useToast();
  const [copiedSteps, setCopiedSteps] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSteps((prev) => ({ ...prev, [stepId]: true }));
    
    toast({
      title: "Copied to clipboard",
      description: "The content has been copied to your clipboard.",
    });
    
    setTimeout(() => {
      setCopiedSteps((prev) => ({ ...prev, [stepId]: false }));
    }, 2000);
  };

  return (
    <TabsContent value="instance-setup" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Instance Setup Guide</CardTitle>
          <CardDescription>
            Complete setup instructions for deploying a new instance of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4 text-blue-800 dark:bg-blue-950 dark:text-blue-300 mb-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Complete Setup Guide</p>
                <p className="text-sm mt-1">
                  This guide contains all the steps needed to set up a complete instance of the application with a new Supabase backend. 
                  Follow these steps carefully to ensure all features work correctly, including database structure, edge functions, and storage.
                </p>
              </div>
            </div>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step-1">
              <AccordionTrigger className="font-medium">
                1. Create Supabase Project
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Supabase.com</a> and sign in or create an account</li>
                  <li>Click "New Project" and create a new project</li>
                  <li>Choose a name and database password (save it somewhere secure)</li>
                  <li>Select a region close to your users</li>
                  <li>Choose the free plan (or paid if needed)</li>
                  <li>Wait for the project to be created (takes about 1-2 minutes)</li>
                </ol>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    Open Supabase Dashboard
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2">
              <AccordionTrigger className="font-medium">
                2. Set Up Database Schema and Functions
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                <p className="mb-3">
                  Run these SQL commands in the Supabase SQL Editor to create all necessary tables, 
                  functions, and security policies.
                </p>

                <Tabs defaultValue="tables">
                  <TabsList className="mb-2">
                    <TabsTrigger value="tables">Tables & RLS</TabsTrigger>
                    <TabsTrigger value="functions">Functions</TabsTrigger>
                    <TabsTrigger value="triggers">Triggers</TabsTrigger>
                    <TabsTrigger value="extensions">Extensions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tables" className="max-h-[400px] overflow-y-auto">
                    <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                        onClick={() => handleCopy(`-- Create all tables and RLS policies

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user'::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  account_number TEXT,
  article_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_timers table
CREATE TABLE public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  status TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft'::TEXT,
  exported_to_fortnox BOOLEAN DEFAULT false,
  fortnox_invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  time_entry_id UUID REFERENCES public.time_entries(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  vat_percentage INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create news_posts table
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create token_refresh_logs table
CREATE TABLE public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

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
  );

-- SYSTEM SETTINGS POLICIES
CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- NEWS POSTS POLICIES
CREATE POLICY "Authenticated users can view news posts"
  ON public.news_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage news posts"
  ON public.news_posts
  FOR ALL
  USING (public.is_admin_or_manager());

-- TOKEN REFRESH LOGS POLICIES
CREATE POLICY "Admins can view token refresh logs"
  ON public.token_refresh_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );`, 'tables')}
                      >
                        {copiedSteps['tables'] ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                        {/* SQL for creating tables and RLS policies */}
                        -- Create all tables and RLS policies

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user'::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  account_number TEXT,
  article_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID REFERENCES public.products(id),
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

{/* Additional table SQL statements continue... */}

                        {/* Rest of tables and RLS policies */}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="functions" className="max-h-[400px] overflow-y-auto">
                    <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                        onClick={() => handleCopy(`-- Create database functions

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$function$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$function$;

-- Function to get username
CREATE OR REPLACE FUNCTION public.get_username(user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT name FROM public.profiles WHERE id = user_id
$function$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(user_id uuid, new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- Function to update system settings updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function to update news posts updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;`, 'functions')}
                      >
                        {copiedSteps['functions'] ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                        {/* SQL for creating functions */}
                        -- Create database functions

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$function$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$function$;

-- Function to get username
CREATE OR REPLACE FUNCTION public.get_username(user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT name FROM public.profiles WHERE id = user_id
$function$;

{/* Additional function SQL statements */}
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="triggers" className="max-h-[400px] overflow-y-auto">
                    <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                        onClick={() => handleCopy(`-- Create triggers

-- Trigger for new user registrations
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for system settings updated_at
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Trigger for news posts updated_at
CREATE TRIGGER news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_news_posts_updated_at();`, 'triggers')}
                      >
                        {copiedSteps['triggers'] ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                        {/* SQL for creating triggers */}
                        -- Create triggers

-- Trigger for new user registrations
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for system settings updated_at
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Trigger for news posts updated_at
CREATE TRIGGER news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_news_posts_updated_at();
                      </pre>
                    </div>
                  </TabsContent>

                  <TabsContent value="extensions" className="max-h-[400px] overflow-y-auto">
                    <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                        onClick={() => handleCopy(`-- Enable required extensions (for cron jobs)

-- Enable pg_cron extension (for scheduled token refresh)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for making HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for Fortnox token refresh
-- IMPORTANT: Update XXXXXX with your actual project ref and YYYYYY with your anon key
SELECT cron.schedule(
  'refresh-fortnox-token-daily',
  '0 9 * * *', -- Run daily at 9 AM
  $$
  SELECT net.http_post(
    url:='https://XXXXXX.functions.supabase.co/fortnox-scheduled-refresh',
    headers:='{"Content-Type": "application/json", "x-api-key": "YYYYYY"}'::jsonb,
    body:='{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);`, 'extensions')}
                      >
                        {copiedSteps['extensions'] ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                        {/* SQL for enabling extensions */}
                        -- Enable required extensions (for cron jobs)

-- Enable pg_cron extension (for scheduled token refresh)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for making HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for Fortnox token refresh
-- IMPORTANT: Update XXXXXX with your actual project ref and YYYYYY with your anon key
SELECT cron.schedule(
  'refresh-fortnox-token-daily',
  '0 9 * * *', -- Run daily at 9 AM
  $$
  SELECT net.http_post(
    url:='https://XXXXXX.functions.supabase.co/fortnox-scheduled-refresh',
    headers:='{"Content-Type": "application/json", "x-api-key": "YYYYYY"}'::jsonb,
    body:='{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-4 flex items-center justify-between">
                  <Button
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                  >
                    Open SQL Editor
                  </Button>
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground mt-2">
                      After setting up the database, you must enable the required extensions (pg_cron and pg_net) and update the cron job queries with your actual project reference and anon key.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3">
              <AccordionTrigger className="font-medium">
                3. Create Storage Buckets
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                <p className="mb-3">
                  Run these SQL commands to create and configure storage buckets for avatars, logo, and news images.
                </p>

                <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                    onClick={() => handleCopy(`-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'User Avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  ('application-logo', 'Application Logo', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('news_images', 'News Images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- Create storage policies for public access
CREATE POLICY "Public Access for Avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Public Access for Logo"
ON storage.objects
FOR SELECT
USING (bucket_id = 'application-logo');

CREATE POLICY "Public Access for News Images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'news_images');

-- Create storage policies for authenticated users to upload and delete their own files
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = COALESCE((storage.foldername(name))[1], ''));

CREATE POLICY "Allow authenticated users to update their avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = COALESCE((storage.foldername(name))[1], ''));

CREATE POLICY "Allow authenticated users to delete their avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = COALESCE((storage.foldername(name))[1], ''));

-- Create storage policies for admin users to manage logo
CREATE POLICY "Allow admins to upload logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow admins to update logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Allow admins to delete logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create storage policies for news images management by admins and managers
CREATE POLICY "Allow admins and managers to upload news images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Allow admins and managers to update news images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Allow admins and managers to delete news images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);`, 'storage')}
                  >
                    {copiedSteps['storage'] ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                    -- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'User Avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  ('application-logo', 'Application Logo', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('news_images', 'News Images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- Create storage policies for public access
CREATE POLICY "Public Access for Avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Additional storage policies...
                  </pre>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  This creates three storage buckets: avatars (for user profile photos), 
                  application-logo (for app branding), and news_images (for news post images).
                  The policies set appropriate access controls for each bucket.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4">
              <AccordionTrigger className="font-medium">
                4. Configure Environment Variables
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-4">
                <p>
                  Set up these required environment variables (secrets) for edge functions in the Supabase dashboard:
                </p>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <h4 className="font-semibold mb-2">Required Environment Variables:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mr-2">SUPABASE_URL</span>
                      <span className="flex-1">
                        Your Supabase project URL (e.g., <code className="text-xs">https://yourproject.supabase.co</code>)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mr-2">SUPABASE_ANON_KEY</span>
                      <span className="flex-1">
                        Your Supabase anon/public key
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mr-2">SUPABASE_SERVICE_ROLE_KEY</span>
                      <span className="flex-1">
                        Your Supabase service role key
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mr-2">FORTNOX_REFRESH_SECRET</span>
                      <span className="flex-1">
                        A secret key for authenticating Fortnox refresh requests (create a strong random string)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mr-2">JWT_SECRET</span>
                      <span className="flex-1">
                        Your Supabase JWT secret (found in Project Settings &gt; API &gt; JWT Settings)
                      </span>
                    </li>
                  </ul>
                </div>

                <Alert variant="default" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4" />
                  <AlertTitle>How to Find These Values</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p><strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong>: Go to Settings &gt; API in your Supabase project.</p>
                    <p><strong>SUPABASE_SERVICE_ROLE_KEY</strong>: Also in Settings &gt; API, under "service_role key" (be careful, this has admin privileges).</p>
                    <p><strong>JWT_SECRET</strong>: Go to Settings &gt; API &gt; JWT Settings &gt; JWT Secret.</p>
                    <p><strong>FORTNOX_REFRESH_SECRET</strong>: Create a strong random string (you can use a password generator).</p>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/settings/api', '_blank')}
                  >
                    Find API Keys
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/settings/functions', '_blank')}
                  >
                    Set Edge Function Secrets
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-5">
              <AccordionTrigger className="font-medium">
                5. Create and Deploy Edge Functions
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <p>
                  The application requires multiple edge functions for integration with Fortnox API and 
                  user management. Follow these steps to create each function.
                </p>

                <Tabs defaultValue="setup" className="w-full">
                  <TabsList className="mb-2 text-xs">
                    <TabsTrigger value="setup" className="text-xs">Setup & Config</TabsTrigger>
                    <TabsTrigger value="cors" className="text-xs">CORS Helper</TabsTrigger>
                    <TabsTrigger value="helpers" className="text-xs">Supabase Helpers</TabsTrigger>
                    <TabsTrigger value="get-users" className="text-xs">Get All Users</TabsTrigger>
                    <TabsTrigger value="token-exchange" className="text-xs">Fortnox Token Exchange</TabsTrigger>
                    <TabsTrigger value="token-refresh" className="text-xs">Fortnox Token Refresh</TabsTrigger>
                    <TabsTrigger value="scheduled-refresh" className="text-xs">Scheduled Refresh</TabsTrigger>
                    <TabsTrigger value="token-migrate" className="text-xs">Token Migration</TabsTrigger>
                    <TabsTrigger value="proxy" className="text-xs">Fortnox Proxy</TabsTrigger>
                    <TabsTrigger value="token-debug" className="text-xs">Token Debug</TabsTrigger>
                  </TabsList>

                  <TabsContent value="setup">
                    <div className="space-y-4">
                      <h3 className="font-medium">Setting Up Edge Functions</h3>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>In your Supabase dashboard, navigate to Edge Functions</li>
                        <li>Create the following edge functions:
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>get-all-users</li>
                            <li>fortnox-token-exchange</li>
                            <li>fortnox-token-refresh</li>
                            <li>fortnox-scheduled-refresh</li>
                            <li>fortnox-token-migrate</li>
                            <li>fortnox-proxy</li>
                            <li>fortnox-token-debug</li>
                          </ul>
                        </li>
                        <li>Create shared helper modules:
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>_shared/cors.ts</li>
                            <li>_shared/supabase-helpers.ts</li>
                          </ul>
                        </li>
                        <li>Update the config.toml file with function configurations</li>
                      </ol>

                      <h4 className="font-medium mt-4">config.toml</h4>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`# The project ID for your application on Supabase
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
verify_jwt = false`, 'config')}
                        >
                          {copiedSteps['config'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
# The project ID for your application on Supabase
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
verify_jwt = false
                        </pre>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Important: Replace "YOUR_PROJECT_ID" with your actual Supabase project ID.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="cors">
                    <div className="space-y-2">
                      <h3 className="font-medium">_shared/cors.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        This file contains CORS headers used by all edge functions.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`// CORS headers for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};`, 'cors')}
                        >
                          {copiedSteps['cors'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
// CORS headers for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        Create this file in the _shared folder within your edge functions directory.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="helpers">
                    <div className="space-y-2">
                      <h3 className="font-medium">_shared/supabase-helpers.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Helper functions used across Supabase edge functions.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`// Helper functions for Supabase edge functions

/**
 * Generates a standard error response with CORS headers
 */
export function errorResponse(
  message: string, 
  status: number = 500, 
  corsHeaders: Record<string, string>,
  details?: any
) {
  return new Response(
    JSON.stringify({ 
      error: message,
      details: details || null,
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Generates a standard success response with CORS headers
 */
export function successResponse(
  data: any, 
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({ 
      data,
      success: true
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Safely parses JSON from a request
 */
export async function parseRequestJson(req: Request) {
  try {
    return await req.json();
  } catch (e) {
    throw new Error("Invalid request body - could not parse JSON");
  }
}

/**
 * Validates required fields in a request object
 */
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
) {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(\`Missing required fields: \${missingFields.join(', ')}\`);
  }
  
  return true;
}

/**
 * Generate a session ID for tracing requests
 */
export function generateSessionId() {
  return crypto.randomUUID().substring(0, 8);
}`, 'helpers')}
                        >
                          {copiedSteps['helpers'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
// Helper functions for Supabase edge functions

/**
 * Generates a standard error response with CORS headers
 */
export function errorResponse(
  message: string, 
  status: number = 500, 
  corsHeaders: Record<string, string>,
  details?: any
) {
  return new Response(
    JSON.stringify({ 
      error: message,
      details: details || null,
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Generates a standard success response with CORS headers
 */
export function successResponse(
  data: any, 
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({ 
      data,
      success: true
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Safely parses JSON from a request
 */
export async function parseRequestJson(req: Request) {
  try {
    return await req.json();
  } catch (e) {
    throw new Error("Invalid request body - could not parse JSON");
  }
}

/**
 * Validates required fields in a request object
 */
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
) {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  return true;
}

/**
 * Generate a session ID for tracing requests
 */
export function generateSessionId() {
  return crypto.randomUUID().substring(0, 8);
}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="get-users">
                    <div className="space-y-2">
                      <h3 className="font-medium">get-all-users/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Function for retrieving all users and their profiles.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
});`, 'get-users')}
                        >
                          {copiedSteps['get-users'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
});
                        </pre>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="token-exchange">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-token-exchange/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Handles OAuth token exchange with Fortnox.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`// Import required modules
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
});`, 'token-exchange')}
                        >
                          {copiedSteps['token-exchange'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
// Import required modules
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
    console.log(`[${sessionId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log(`[${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====`);
  console.log(`[${sessionId}] Request method:`, req.method);
  console.log(`[${sessionId}] Request headers:`, req.headers);
  console.log(`[${sessionId}] Content-Type:`, req.headers.get("Content-Type"));
  
  try {
    // Parse the request body
    let body;
    try {
      const rawText = await req.text();
      console.log(`[${sessionId}] Raw JSON body:`, rawText);
      body = JSON.parse(rawText);
      console.log(`[${sessionId}] 📦 Parsed JSON body:`, {
        client_id: body.client_id ? `${body.client_id.substring(0, 10)}...` : undefined,
        client_secret: body.client_secret ? '•••' : undefined,
        code: body.code ? `${body.code.substring(0, 10)}...` : undefined,
        redirect_uri: body.redirect_uri
      });
    } catch (e) {
      console.error(`[${sessionId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required parameters
    if (!body.code || !body.client_id || !body.client_secret || !body.redirect_uri) {
      console.error(`[${sessionId}] Missing required parameters:`, {
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
    console.log(`[${sessionId}] 🔄 Sending request to Fortnox:`);
    console.log(`[${sessionId}] URL:`, FORTNOX_TOKEN_URL);
    console.log(`[${sessionId}] Method: POST`);
    console.log(`[${sessionId}] Headers:`, {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic •••"
    });
    console.log(`[${sessionId}] Body (form data):`, `grant_type=authorization_code&code=${body.code}&redirect_uri=${encodeURIComponent(body.redirect_uri)}`);
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = `${body.client_id}:${body.client_secret}`;
    const base64Auth = btoa(authString);
    const authHeader = `Basic ${base64Auth}`;
    
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
    
    console.log(`[${sessionId}] 📬 Fortnox responded with status:`, response.status);
    
    // Get response body as text
    const responseText = await response.text();
    console.log(`[${sessionId}] 🧾 Fortnox response body:`, responseText);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${sessionId}] Error parsing Fortnox response:`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Invalid response from Fortnox' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API returned error status ${response.status}:`, responseData);
      return new Response(
        JSON.stringify(responseData),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(`[${sessionId}] Missing access_token in Fortnox response:`, responseData);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Missing access token in response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return successful response with tokens
    return new Response(
      JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        token_type: responseData.token_type,
        expires_in: responseData.expires_in,
        _debug: {
          session_id: sessionId,
          access_token_length: responseData.access_token.length,
          refresh_token_length: responseData.refresh_token?.length || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
                        </pre>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="token-refresh">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-token-refresh/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Handles refreshing Fortnox access tokens.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment (for database access)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Starting Fortnox token refresh process");
    
    // Get client credentials - either from request or directly from database
    let requestData;
    let clientId;
    let clientSecret;
    let refreshToken;
    
    // Two authentication modes:
    // 1. API key for system-level refresh (cron job or scheduled task)
    // 2. Direct request with provided credentials (from frontend)
    
    // Check for API key authentication first (system-level access)
    const apiKey = req.headers.get("x-api-key");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");
    
    console.log("Authentication check:", {
      apiKeyPresent: !!apiKey,
      validKeyPresent: !!validKey,
      hasAuthHeader: !!req.headers.get("Authorization"),
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
      requestMethod: req.method,
      contentType: req.headers.get("content-type"),
      headersPresent: Array.from(req.headers.keys()),
    });
    
    const isSystemAuthenticated = !!validKey && apiKey === validKey;

    // Try Supabase auth for logged-in users
    let userAuthenticated = false;

    if (!isSystemAuthenticated && req.headers.get("Authorization")?.startsWith("Bearer ")) {
      const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: req.headers.get("Authorization")! } }
      });

      const { data: authData, error: authError } = await userSupabase.auth.getUser();

      if (authData?.user && !authError) {
        userAuthenticated = true;
        console.log("Authenticated via Supabase JWT:", authData.user.id);
      } else {
        console.warn("Supabase auth failed:", authError);
      }
    }

    // Final check
    if (!isSystemAuthenticated && !userAuthenticated) {
      console.error("Unauthorized request: missing or invalid API key or user token");
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing or invalid API key or user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If this is a system-level authenticated request, get credentials from database
    if (isSystemAuthenticated) {
      console.log("System-level authentication successful");
      
      // Initialize Supabase client with service role for direct database access
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or service key not configured");
        return new Response(
          JSON.stringify({ 
            error: "server_configuration_error", 
            message: "Server is not properly configured for system-level refresh" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Create Supabase client with admin privileges
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get Fortnox credentials from system_settings table
      console.log("Retrieving Fortnox credentials from database");
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      if (settingsError || !settingsData) {
        console.error("Error retrieving Fortnox credentials:", settingsError);
        return new Response(
          JSON.stringify({ 
            error: "database_error", 
            message: "Failed to retrieve Fortnox credentials from database",
            details: settingsError
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Extract credentials from settings
      const credentials = settingsData.settings;
      
      if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        console.error("Invalid or incomplete credentials in database");
        return new Response(
          JSON.stringify({ 
            error: "invalid_credentials", 
            message: "Invalid or incomplete Fortnox credentials in database" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from database credentials
      clientId = credentials.clientId;
      clientSecret = credentials.clientSecret;
      refreshToken = credentials.refreshToken;
      
      console.log("Successfully retrieved credentials from database");
    } 
    // Otherwise, parse credentials from request body
    else {
      // Validate API key if the environment has one configured
      if (validKey && !isSystemAuthenticated) {
        console.error("Invalid API key provided", {
          apiKeyProvided: apiKey ? \`\${apiKey.substring(0, 3)}...\${apiKey.substring(apiKey.length - 3)}\` : 'missing',
          validKeyHint: validKey ? \`\${validKey.substring(0, 3)}...\${validKey.substring(validKey.length - 3)}\` : 'missing',
        });
        
        return new Response(
          JSON.stringify({ 
            error: "unauthorized", 
            message: "Invalid API key provided"
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // If no API key is required (or not configured), parse the request body
      try {
        requestData = await req.json();
        console.log("Parsing request data:", {
          hasRefreshToken: !!requestData.refresh_token,
          hasClientId: !!requestData.client_id,
          hasClientSecret: !!requestData.client_secret
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Validate required fields
      if (!requestData.client_id || !requestData.client_secret || !requestData.refresh_token) {
        const missingFields = [];
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        
        console.error(\`Missing required parameters: \${missingFields.join(', ')}\`);
        
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters",
            details: {
              missing: missingFields
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from request body
      clientId = requestData.client_id;
      clientSecret = requestData.client_secret;
      refreshToken = requestData.refresh_token;
    }
    
    // Log token refresh attempt (obfuscate sensitive data)
    console.log("Processing token refresh with:", {
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      refreshTokenLength: refreshToken.length,
      clientIdPrefix: clientId.substring(0, 3) + '...',
      refreshTokenPrefix: refreshToken.substring(0, 3) + '...',
    });
    
    // Prepare the form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    
    console.log("Making token refresh request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
      
      // Log the structure of the response (without revealing sensitive data)
      console.log("Response structure:", {
        has_access_token: !!responseData.access_token,
        has_refresh_token: !!responseData.refresh_token,
        has_expires_in: !!responseData.expires_in,
        expires_in_value: responseData.expires_in,
        token_type: responseData.token_type
      });
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error:", response.status, responseData);
      
      // Add specific detection for invalid/expired refresh token
      if (responseData.error === 'invalid_grant' && 
          responseData.error_description === 'Invalid refresh token') {
        return new Response(
          JSON.stringify({ 
            error: "refresh_token_invalid", 
            error_description: "The refresh token is no longer valid. User needs to reconnect to Fortnox.",
            status: response.status,
            details: responseData
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "fortnox_api_error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If this was a system-level request, update the database with new tokens
    if (isSystemAuthenticated && supabaseUrl && supabaseServiceKey) {
      console.log("Updating tokens in database");
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get current credentials
      const { data: currentData } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      if (currentData && currentData.settings) {
        // Calculate expiration times
        const expiresAt = Date.now() + (responseData.expires_in || 3600) * 1000;
        const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days
        
        // Update with new tokens
        const updatedCredentials = {
          ...currentData.settings,
          accessToken: responseData.access_token,
          refreshToken: responseData.refresh_token || refreshToken, // Use new refresh token if provided
          expiresAt,
          expiresIn: responseData.expires_in,
          refreshTokenExpiresAt,
          refreshFailCount: 0, // Reset failure count on successful refresh
          lastRefreshAttempt: Date.now()
        };
        
        // Save updated credentials
        const { error: updateError } = await supabase
          .from('system_settings')
          .upsert({
            id: 'fortnox_credentials',
            settings: updatedCredentials
          }, {
            onConflict: 'id'
          });
          
        if (updateError) {
          console.error("Error updating credentials in database:", updateError);
          // Continue to return the tokens even if database update fails
        } else {
          console.log("Successfully updated tokens in database");
        }
      }
    }
    
    console.log("Token refresh successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-refresh:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});`, 'token-refresh')}
                        >
                          {copiedSteps['token-refresh'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment (for database access)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Starting Fortnox token refresh process");
    
    // Get client credentials - either from request or directly from database
    let requestData;
    let clientId;
    let clientSecret;
    let refreshToken;
    
    // Two authentication modes:
    // 1. API key for system-level refresh (cron job or scheduled task)
    // 2. Direct request with provided credentials (from frontend)
    
    // Check for API key authentication first (system-level access)
    const apiKey = req.headers.get("x-api-key");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");
    
    // Rest of function implementation...
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        This function supports both system-level token refreshes (via API key) and user-initiated refreshes (via JWT auth).
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="scheduled-refresh">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-scheduled-refresh/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Scheduled function for automatic token refresh.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET') || '';

// Fortnox token refresh endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// This function handles scheduled refreshes of Fortnox tokens
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Generate a session ID for tracing this refresh session
  const sessionId = crypto.randomUUID().substring(0, 8);
  console.log(\`[\${sessionId}] ===== SCHEDULED TOKEN REFRESH STARTED =====\`);
  
  try {
    // Validate authentication
    const apiKey = req.headers.get("x-api-key");
    const validKey = refreshSecret;
    
    if (!validKey || apiKey !== validKey) {
      console.error(\`[\${sessionId}] Unauthorized: Invalid API key\`);
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(\`[\${sessionId}] API key validation successful\`);
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log(\`[\${sessionId}] Request data:\`, { 
        scheduled: requestData.scheduled, 
        force: requestData.force 
      });
    } catch (e) {
      requestData = {};
      console.log(\`[\${sessionId}] No request body or invalid JSON\`);
    }
    
    // Create Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(\`[\${sessionId}] Missing Supabase configuration\`);
      return new Response(
        JSON.stringify({ error: "configuration_error", message: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get credentials from the database
    console.log(\`[\${sessionId}] Retrieving Fortnox credentials from database\`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error(\`[\${sessionId}] Error retrieving Fortnox credentials:\`, settingsError);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: \`Error retrieving credentials: \${settingsError?.message || 'No credentials found'}\`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract and validate credentials
    const credentials = settingsData.settings;
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error(\`[\${sessionId}] Invalid or incomplete credentials in database\`);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: \`Invalid or incomplete credentials\`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Invalid or incomplete Fortnox credentials" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if token is already expired or force refresh is requested
    const now = Date.now();
    const expiresAt = credentials.expiresAt || 0;
    const refreshNeeded = now >= expiresAt - (5 * 60 * 1000); // 5 minutes buffer
    
    if (!refreshNeeded && !requestData.force) {
      console.log(\`[\${sessionId}] Token is still valid. No refresh needed.\`);
      return new Response(
        JSON.stringify({ 
          message: "Token is still valid", 
          expiresIn: Math.floor((expiresAt - now) / 1000),
          expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Refresh the token
    console.log(\`[\${sessionId}] Refreshing token...\`);
    
    // Prepare the form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    
    // Make request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log(\`[\${sessionId}] Fortnox response status:\`, response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(\`[\${sessionId}] Successfully parsed Fortnox response\`);
    } catch (e) {
      console.error(\`[\${sessionId}] Failed to parse Fortnox response:\`, e);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: \`Failed to parse Fortnox response: \${e.message}\`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "parsing_error", 
          message: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(\`[\${sessionId}] Fortnox API error:\`, response.status, responseData);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: \`Fortnox API error: \${responseData.error_description || responseData.error || 'Unknown error'}\`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "fortnox_api_error", 
          status: response.status,
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update credentials in the database
    console.log(\`[\${sessionId}] Token refresh successful, updating database\`);
    
    // Calculate expiration times
    const expiresIn = responseData.expires_in || 3600;
    const newExpiresAt = Date.now() + expiresIn * 1000;
    const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days
    
    const updatedCredentials = {
      ...credentials,
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token || credentials.refreshToken, // Use new refresh token if provided
      expiresAt: newExpiresAt,
      expiresIn: expiresIn,
      refreshTokenExpiresAt,
      refreshFailCount: 0, // Reset failure count on successful refresh
      lastRefreshAttempt: Date.now(),
      lastRefreshSuccess: Date.now()
    };
    
    // Save updated credentials
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: updatedCredentials
      }, {
        onConflict: 'id'
      });
      
    if (updateError) {
      console.error(\`[\${sessionId}] Error updating credentials in database:\`, updateError);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: true,
          message: \`Token refreshed successfully but failed to update database: \${updateError.message}\`,
          token_length: responseData.access_token.length
        });
      
      return new Response(
        JSON.stringify({ 
          warning: "database_update_error", 
          message: "Token refreshed but failed to update database",
          details: updateError,
          tokenInfo: {
            expiresIn: expiresIn,
            expiresAt: newExpiresAt
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Log the successful refresh
    await supabase
      .from('token_refresh_logs')
      .insert({
        session_id: sessionId,
        success: true,
        message: \`Token refreshed successfully\`,
        token_length: responseData.access_token.length
      });
    
    console.log(\`[\${sessionId}] Token refresh completed successfully\`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refreshed successfully",
        expiresIn: expiresIn,
        expiresAt: newExpiresAt
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error(\`[\${sessionId}] Unexpected error in scheduled refresh:\`, error);
    
    // Try to log the error if possible
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('token_refresh_logs')
          .insert({
            session_id: sessionId,
            success: false,
            message: \`Unexpected error: \${error.message || 'Unknown error'}\`,
            token_length: 0
          });
      } catch (logError) {
        console.error(\`[\${sessionId}] Failed to log error:\`, logError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});`, 'scheduled-refresh')}
                        >
                          {copiedSteps['scheduled-refresh'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET') || '';

// Fortnox token refresh endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Rest of function implementation...
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        This function is designed to be called by a cron job to automatically refresh the Fortnox tokens before they expire.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="token-migrate">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-token-migrate/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Handles migrating old Fortnox tokens to the new API.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_MIGRATE_URL = 'https://apps.fortnox.se/oauth-v1/migrate';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Received token migration request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data successfully", {
        hasAccessToken: !!requestData.access_token,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate required fields
    if (!requestData.client_id || !requestData.client_secret || !requestData.access_token) {
      const missingFields = [];
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.access_token) missingFields.push('access_token');
      
      console.error(\`Missing required parameters: \${missingFields.join(', ')}\`, {
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasAccessToken: !!requestData.access_token
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters",
          details: {
            missing: missingFields,
            client_id: requestData.client_id ? "present" : "missing",
            client_secret: requestData.client_secret ? "present" : "missing",
            access_token: requestData.access_token ? "present" : "missing"
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create the credentials string (Base64 encoding of ClientId:ClientSecret)
    const credentials = btoa(\`\${requestData.client_id}:\${requestData.client_secret}\`);
    
    // Prepare the form data
    const formData = new URLSearchParams({
      access_token: requestData.access_token
    });
    
    console.log("Making token migration request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_MIGRATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${credentials}\`
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error:", response.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: "Fortnox API error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Token migration successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-migrate:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});`, 'token-migrate')}
                        >
                          {copiedSteps['token-migrate'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_MIGRATE_URL = 'https://apps.fortnox.se/oauth-v1/migrate';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rest of function implementation...
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        This function migrates legacy Fortnox access tokens to the new OAuth 2.0 flow.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="proxy">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-proxy/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Proxy for making requests to the Fortnox API.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
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
    url = url.replace(/([^:]\\/)\\/{2,}/g, "$1");

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
});`, 'proxy')}
                        >
                          {copiedSteps['proxy'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
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

    // Rest of function implementation...
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        This function acts as a secure proxy for making requests to the Fortnox API without exposing tokens in the client.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="token-debug">
                    <div className="space-y-2">
                      <h3 className="font-medium">fortnox-token-debug/index.ts</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Debug function for viewing Fortnox token information.
                      </p>
                      <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono max-h-[400px] overflow-y-auto">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                          onClick={() => handleCopy(`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// This function provides a debug endpoint to verify token state
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("🔍 Running Fortnox token debug endpoint");
    
    // Authentication check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "server_configuration_error", message: "Server configuration incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from database
    console.log("📚 Retrieving Fortnox credentials for debug");
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error("❌ Error retrieving Fortnox credentials:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract credentials
    const credentials = settingsData.settings;
    
    // Create safe debug output that doesn't expose full tokens
    const debugInfo = {
      accessTokenPresent: !!credentials?.accessToken,
      accessTokenLength: credentials?.accessToken?.length || 0,
      refreshTokenPresent: !!credentials?.refreshToken,
      refreshTokenLength: credentials?.refreshToken?.length || 0,
      clientIdPresent: !!credentials?.clientId,
      clientIdLength: credentials?.clientId?.length || 0,
      clientSecretPresent: !!credentials?.clientSecret,
      clientSecretLength: credentials?.clientSecret?.length || 0,
      accessTokenPreview: credentials?.accessToken 
        ? \`\${credentials.accessToken.substring(0, 10)}...\${credentials.accessToken.substring(credentials.accessToken.length - 10)}\`
        : 'missing',
      refreshTokenPreview: credentials?.refreshToken
        ? \`\${credentials.refreshToken.substring(0, 5)}...\${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}\`
        : 'missing',
      rawSettingsType: typeof settingsData.settings,
      settingsKeys: Object.keys(settingsData.settings || {}),
      timestamp: new Date().toISOString()
    };
    
    console.log("✅ Debug info generated:", {
      accessTokenLength: debugInfo.accessTokenLength,
      refreshTokenLength: debugInfo.refreshTokenLength,
      clientIdLength: debugInfo.clientIdLength,
      timestamp: debugInfo.timestamp
    });
    
    return new Response(
      JSON.stringify(debugInfo),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in debug endpoint:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});`, 'token-debug')}
                        >
                          {copiedSteps['token-debug'] ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// This function provides a debug endpoint to verify token state
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("🔍 Running Fortnox token debug endpoint");
    
    // Rest of function implementation...
                        </pre>
                      </div>
                      <p className="text-xs mt-2">
                        This function provides a way to verify the state of Fortnox tokens without exposing sensitive information.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Edge Function Deployment</AlertTitle>
                  <AlertDescription className="text-xs">
                    <p>After creating each edge function, you need to deploy them using the Supabase CLI or dashboard. 
                    Make sure all required environment variables are set before deploying.</p>
                    <p className="mt-1">You can create the edge functions through the Supabase Dashboard or by using the Supabase CLI.</p>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-6">
              <AccordionTrigger className="font-medium">
                6. Configure Authentication
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-4">
                <p>
                  Set up authentication in your Supabase project to allow users to sign up and log in.
                </p>

                <h3 className="font-medium mt-2">Authentication Settings</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>From the Supabase dashboard, go to Authentication &gt; Settings</li>
                  <li>Under Site URL, enter your application URL (this is where users will be redirected after authentication)</li>
                  <li>Add any additional redirect URLs if needed (e.g., localhost for development)</li>
                  <li>Configure a minimum password strength (recommended: Good or Strong)</li>
                  <li>Set session expiry time (default: 1 week)</li>
                </ol>
                
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>First User Setup</AlertTitle>
                  <AlertDescription className="text-xs">
                    <p>The first user who registers will automatically be assigned the 'admin' role thanks to the handle_new_user trigger function.</p>
                    <p className="mt-1">All subsequent users will be assigned the 'user' role, and the admin can promote them to 'manager' or 'admin' as needed.</p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between mt-2">
                  <Button
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}
                  >
                    Manage Users
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/providers', '_blank')}
                  >
                    Auth Settings
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-7">
              <AccordionTrigger className="font-medium">
                7. Connect Frontend to Supabase
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-4">
                <p>
                  Update your application's environment configuration to connect to your Supabase instance.
                </p>

                <h3 className="font-medium mt-2">Update Config</h3>
                <p>
                  In your application's code, update the <code className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">src/config/environment.ts</code> file:
                </p>

                <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white"
                    onClick={() => handleCopy(`// Update the values in src/config/environment.ts
// Replace with your actual Supabase project information

export const environment = {
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
    projectRef: 'YOUR_PROJECT_ID',
  },
  // Keep the rest of the config the same
  fortnox: {
    // ... existing fortnox config
  },
  storage: {
    // ... existing storage config
  },
  features: {
    // ... existing features config
  },
  // Add your domain to allowed domains
  allowedDomains: [
    'your-domain.com',
    'localhost:5173', // For local development
  ]
};`, 'frontend-config')}
                  >
                    {copiedSteps['frontend-config'] ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap">
// Update the values in src/config/environment.ts
// Replace with your actual Supabase project information

export const environment = {
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
    projectRef: 'YOUR_PROJECT_ID',
  },
  // Keep the rest of the config the same
  fortnox: {
    // ... existing fortnox config
  },
  storage: {
    // ... existing storage config
  },
  features: {
    // ... existing features config
  },
  // Add your domain to allowed domains
  allowedDomains: [
    'your-domain.com',
    'localhost:5173', // For local development
  ]
};
                  </pre>
                </div>

                <p className="text-xs mt-2 text-muted-foreground">
                  Replace <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">YOUR_PROJECT_ID</code> and <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">YOUR_ANON_KEY</code> with your actual Supabase project details.
                  You can find these values in your Supabase dashboard under Settings &gt; API.
                </p>

                <Button
                  size="sm"
                  onClick={() => window.open('https://supabase.com/dashboard/project/_/settings/api', '_blank')}
                >
                  Find API Keys
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-8">
              <AccordionTrigger className="font-medium">
                8. Configure Fortnox Integration (Optional)
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-4">
                <p>
                  If you want to use the Fortnox integration for invoicing, follow these steps to set it up.
                </p>

                <h3 className="font-medium mt-2">Fortnox Developer Account</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Create a developer account at <a href="https://developer.fortnox.se" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Fortnox Developer Portal</a></li>
                  <li>Register a new application with the following settings:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>API scope: select all necessary permissions (invoices, customers, etc.)</li>
                      <li>Authentication method: OAuth2</li>
                      <li>Redirect URI: Your application URL followed by <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">/settings?tab=fortnox</code> (e.g., <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">https://your-domain.com/settings?tab=fortnox</code>)</li>
                    </ul>
                  </li>
                  <li>After creating the application, you'll receive:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Client ID</li>
                      <li>Client Secret</li>
                    </ul>
                  </li>
                </ol>

                <p className="mt-2">
                  Once you have these credentials, you'll enter them in the application's Fortnox settings page
                  (accessible from Settings &gt; Fortnox tab). The application already includes all the necessary 
                  functionality to connect to Fortnox and manage tokens.
                </p>
                
                <p className="text-xs mt-2 text-muted-foreground">
                  The cron job setup in step 2 will automatically refresh the Fortnox tokens before they expire.
                  Make sure the edge functions have the correct environment variables set.
                </p>
                
                <Alert variant="default" className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    The cron job setup is only required if you plan to use the Fortnox integration. You can skip this step if you don't need Fortnox functionality.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-9">
              <AccordionTrigger className="font-medium">
                9. Launch and Test
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-4">
                <p>
                  Now that you've completed all the setup steps, it's time to launch and test your application.
                </p>

                <h3 className="font-medium mt-2">Final Checklist</h3>
                <ul className="space-y-2 list-disc pl-5">
                  <li>Database tables and policies are created</li>
                  <li>Storage buckets and policies are configured</li>
                  <li>Edge functions are deployed and working</li>
                  <li>Authentication settings are configured</li>
                  <li>Environment variables are set</li>
                  <li>Frontend config is updated</li>
                  <li>Fortnox integration is set up (if needed)</li>
                </ul>

                <h3 className="font-medium mt-4">Testing</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Sign up as the first user (will automatically be assigned admin role)</li>
                  <li>Create test clients and products</li>
                  <li>Add time entries and generate invoices</li>
                  <li>Try connecting to Fortnox (if configured)</li>
                  <li>Sign up additional users and test different permission levels</li>
                </ol>

                <div className="mt-4 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 p-4 rounded-md">
                  <p className="font-medium">Congratulations!</p>
                  <p className="mt-1">You now have a fully functional instance of the time tracking application. If you encounter any issues, review the setup steps or check the logs in your Supabase dashboard.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default InstanceSetupTab;
