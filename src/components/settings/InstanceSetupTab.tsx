import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Code, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseInstanceLinker } from './SupabaseInstanceLinker';

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
    <TabsContent value="setup">
      <SupabaseInstanceLinker />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <span>Instance Setup Tutorial</span>
          </CardTitle>
          <CardDescription>
            Follow this step-by-step guide to set up your own instance of this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="general">
            {/* General Information */}
            <AccordionItem value="general">
              <AccordionTrigger className="text-lg font-medium">
                General Information
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
                    This tutorial will guide you through setting up the backend infrastructure needed
                    for this time tracking and invoicing system. You will create all necessary tables,
                    functions, policies, and edge functions to fully replicate the functionality.
                  </p>
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

            {/* Step 2: Set Up Database Tables */}
            <AccordionItem value="step2">
              <AccordionTrigger className="text-lg font-medium">
                Step 2: Set Up Database Tables
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Create Core Tables</h3>
                  <p>Run the following SQL in the Supabase SQL Editor to create all required tables:</p>
                  
                  <CodeBlock 
                    label="Core Tables SQL"
                    code={`-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user',
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  fortnox_customer_number TEXT
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  account_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  quantity DECIMAL(10, 2) DEFAULT 1,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft',
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fortnox_invoice_number TEXT,
  exported_to_fortnox BOOLEAN DEFAULT false,
  export_error TEXT
);

-- Create system_settings table
CREATE TABLE public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fortnox_tokens table
CREATE TABLE public.fortnox_tokens (
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
CREATE TABLE public.fortnox_token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.fortnox_tokens(id),
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create news_posts table
CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published BOOLEAN DEFAULT false,
  image_url TEXT
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
$$;`}
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
CREATE TRIGGER before_update_system_settings
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Trigger for news posts updated_at
CREATE TRIGGER before_update_news_posts
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_news_posts_updated_at();`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Set Up Row Level Security */}
            <AccordionItem value="step3">
              <AccordionTrigger className="text-lg font-medium">
                Step 3: Set Up Row Level Security
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
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_token_refresh_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Admins and managers can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_admin_or_manager());

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
  USING (public.get_user_role() = 'admin');`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Create Storage Buckets */}
            <AccordionItem value="step4">
              <AccordionTrigger className="text-lg font-medium">
                Step 4: Create Storage Buckets
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
  ('app_assets', 'Application Assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/svg+xml']),
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

-- Create storage policies for app_assets
CREATE POLICY "Anyone can view app assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app_assets');

CREATE POLICY "Admins and managers can manage app assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'app_assets' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can update app assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'app_assets' AND public.is_admin_or_manager());

CREATE POLICY "Admins and managers can delete app assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'app_assets' AND public.is_admin_or_manager());

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

            {/* Step 5: Create Edge Functions */}
            <AccordionItem value="step5">
              <AccordionTrigger className="text-lg font-medium">
                Step 5: Create Edge Functions
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Set Up Supabase Edge Functions</h3>
                  <p>Create the following edge functions in your Supabase dashboard:</p>
                  
                  <h4 className="font-medium mt-4">1. fortnox-proxy</h4>
                  <CodeBlock 
                    label="fortnox-proxy function"
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the latest valid token
    const tokenResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens?order=created_at.desc&limit=1\`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Fortnox token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokens = await tokenResponse.json()
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Fortnox token available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token } = tokens[0]
    
    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid Fortnox token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construct URL with query parameters if provided
    let url = \`\${FORTNOX_API_URL}\${path}\`
    if (params) {
      const queryParams = new URLSearchParams(params).toString()
      url = \`\${url}?\${queryParams}\`
    }

    // Make request to Fortnox API
    const requestMethod = method || 'GET'
    const requestOptions: RequestInit = {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': \`Bearer \${access_token}\`
      }
    }

    // Add body for non-GET requests
    if (requestMethod !== 'GET' && body) {
      requestOptions.body = JSON.stringify(body)
    }

    console.log(\`Making \${requestMethod} request to Fortnox: \${url}\`)
    
    const fortnoxResponse = await fetch(url, requestOptions)
    const fortnoxData = await fortnoxResponse.json()

    // Return the Fortnox API response
    return new Response(
      JSON.stringify(fortnoxData),
      { 
        status: fortnoxResponse.status, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in Fortnox proxy:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                  />
                  
                  <h4 className="font-medium mt-4">2. fortnox-token-exchange</h4>
                  <CodeBlock 
                    label="fortnox-token-exchange function"
                    language="typescript"
                    code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch Fortnox client credentials from system_settings
    const settingsResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/system_settings?id=eq.fortnox_settings\`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!settingsResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Fortnox settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settings = await settingsResponse.json()
    
    if (!settings || settings.length === 0 || !settings[0].settings) {
      return new Response(
        JSON.stringify({ error: 'Fortnox settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { clientId, clientSecret } = settings[0].settings
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Fortnox client credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange authorization code for tokens
    const tokenUrl = 'https://apps.fortnox.se/oauth-v1/token'
    const redirectUri = \`\${req.headers.get('origin')}/settings?tab=fortnox\`

    console.log('Exchanging code for token with redirect URI:', redirectUri)

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUri
      }).toString()
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange error:', tokenData)
      return new Response(
        JSON.stringify({ error: tokenData.error_description || 'Failed to exchange authorization code' }),
        { status: tokenResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate token expiration time (access token expires in 3600 seconds / 1 hour)
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600))

    // Store tokens in the database
    const storeResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          expires_at: expiresAt.toISOString()
        })
      }
    )

    if (!storeResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to store Fortnox tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Fortnox authorization successful' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in token exchange:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                  />
                  
                  <h4 className="font-medium mt-4">3. fortnox-token-refresh</h4>
                  <CodeBlock 
                    label="fortnox-token-refresh function"
                    language="typescript"
                    code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For scheduled invocations, validate secret
    if (req.method === 'POST') {
      const { authorization } = req.headers
      const token = authorization?.split(' ')[1]
      
      if (refreshSecret && (!token || token !== refreshSecret)) {
        console.error('Invalid or missing authorization token')
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch Fortnox client credentials from system_settings
    const settingsResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/system_settings?id=eq.fortnox_settings\`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!settingsResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Fortnox settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const settings = await settingsResponse.json()
    
    if (!settings || settings.length === 0 || !settings[0].settings) {
      return new Response(
        JSON.stringify({ error: 'Fortnox settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { clientId, clientSecret, enabled } = settings[0].settings
    
    if (!enabled) {
      return new Response(
        JSON.stringify({ message: 'Fortnox integration is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Fortnox client credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the latest token from the database
    const tokenResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_tokens?order=created_at.desc&limit=1\`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Fortnox token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokens = await tokenResponse.json()
    
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No Fortnox token available to refresh' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = tokens[0]
    
    if (!token.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid Fortnox token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is about to expire (within 15 minutes)
    const expiresAt = new Date(token.expires_at)
    const now = new Date()
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000)
    
    // If token is not expiring soon, just return success
    if (expiresAt > fifteenMinutesFromNow) {
      return new Response(
        JSON.stringify({ message: 'Token still valid, no refresh needed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Token expires at', expiresAt, 'refreshing now')

    // Refresh the token
    const tokenUrl = 'https://apps.fortnox.se/oauth-v1/token'

    const refreshResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': token.refresh_token
      }).toString()
    })

    const refreshData = await refreshResponse.json()

    let success = false
    let error = null

    if (!refreshResponse.ok || !refreshData.access_token) {
      console.error('Token refresh error:', refreshData)
      error = refreshData.error_description || 'Failed to refresh token'
    } else {
      // Calculate new expiration time
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + (refreshData.expires_in || 3600))

      // Store new tokens in the database
      const storeResponse = await fetch(
        \`\${supabaseUrl}/rest/v1/fortnox_tokens\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': \`Bearer \${supabaseKey}\`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            scope: refreshData.scope,
            token_type: refreshData.token_type,
            expires_at: expiresAt.toISOString()
          })
        }
      )

      if (!storeResponse.ok) {
        error = 'Failed to store refreshed tokens'
      } else {
        success = true
      }
    }

    // Log the refresh attempt
    await fetch(
      \`\${supabaseUrl}/rest/v1/fortnox_token_refresh_logs\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          token_id: token.id,
          success: success,
          error: error
        })
      }
    )

    if (error) {
      return new Response(
        JSON.stringify({ error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Fortnox token refreshed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in token refresh:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                  />
                  
                  <h4 className="font-medium mt-4">4. get-all-users</h4>
                  <CodeBlock 
                    label="get-all-users function"
                    language="typescript"
                    code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Get the authorization token
  const token = req.headers.get('authorization')?.split(' ')[1]
  
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is an admin
    const userResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/rpc/get_user_role\`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${token}\`
        }
      }
    )

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userRole = await userResponse.text()
    
    if (userRole !== '"admin"') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only administrators can access this resource' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all users from auth.users using service role key
    const usersResponse = await fetch(
      \`\${supabaseUrl}/auth/v1/admin/users\`,
      {
        headers: {
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!usersResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { users, aud } = await usersResponse.json()
    
    // Get user profiles
    const profilesResponse = await fetch(
      \`\${supabaseUrl}/rest/v1/profiles\`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': \`Bearer \${supabaseKey}\`
        }
      }
    )

    if (!profilesResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profiles = await profilesResponse.json()
    
    // Create a map of user profiles
    const profileMap = profiles.reduce((map, profile) => {
      map[profile.id] = profile
      return map
    }, {})
    
    // Combine user and profile information
    const combinedUsers = users.map(user => {
      const profile = profileMap[user.id] || {}
      
      return {
        id: user.id,
        email: user.email,
        name: profile.name || user.email?.split('@')[0] || 'Unknown',
        role: profile.role || 'user',
        avatar_url: profile.avatar_url || null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        confirmed_at: user.confirmed_at,
        email_confirmed_at: user.email_confirmed_at,
        banned_until: user.banned_until,
        is_sso_user: user.app_metadata?.provider !== 'email' && Boolean(user.app_metadata?.provider)
      }
    })

    return new Response(
      JSON.stringify({ users: combinedUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching users:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})`}
                  />
                  
                  <h4 className="font-medium mt-4">5. Create shared CORS module</h4>
                  <CodeBlock 
                    label="cors.ts module"
                    language="typescript"
                    code={`export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}`}
                  />
                </div>
                
                <div className="space-y-2 mt-4">
                  <h3 className="text-md font-medium">Configure Edge Functions in supabase/config.toml</h3>
                  <CodeBlock 
                    label="config.toml configuration"
                    language="toml"
                    code={`project_id = "your-project-id"

[api]
enabled = true
url = "https://your-project-id.supabase.co"

[db]
enabled = true

[realtime]
enabled = true

[storage]
enabled = true

[functions]
enabled = true

[functions.fortnox-proxy]
verify_jwt = true

[functions.fortnox-token-exchange]
verify_jwt = false

[functions.fortnox-token-refresh]
verify_jwt = false

[functions.fortnox-scheduled-refresh]
verify_jwt = false

[functions.get-all-users]
verify_jwt = true`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 6: Set Up Environment Variables */}
            <AccordionItem value="step6">
              <AccordionTrigger className="text-lg font-medium">
                Step 6: Set Up Environment Variables
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Configure Required Secrets</h3>
                  <p>
                    Set up the following secrets in your Supabase dashboard under
                    <b> Settings → API → Functions Settings </b>:
                  </p>
                  
                  <div className="space-y-2 mt-4">
                    <Label>Required secrets:</Label>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><b>SUPABASE_URL</b>: Your Supabase project URL (e.g., https://YOUR-project-id.supabase.co)</li>
                      <li><b>SUPABASE_ANON_KEY</b>: Your Supabase anon/public key</li>
                      <li><b>SUPABASE_SERVICE_ROLE_KEY</b>: Your Supabase service role key</li>
                      <li><b>SUPABASE_DB_URL</b>: Full database connection string (required for edge functions/SQL migrations)</li>
                      <li><b>FORTNOX_REFRESH_SECRET</b>: Secure random string for authorizing the token refresh function/cron</li>
                      <li><b>JWT_SECRET</b>: (Required by auth) Your project's JWT secret, can be copied from Supabase dashboard</li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
                    <p className="text-amber-800 font-medium">⚠️ Important Security Note</p>
                    <p className="text-amber-700 text-sm mt-1">
                      Never expose your service role key or JWT secret to the client. These keys should only be used in secure server-side environments like Edge Functions.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 7: Set Up Scheduled Functions */}
            <AccordionItem value="step7">
              <AccordionTrigger className="text-lg font-medium">
                Step 7: Set Up Scheduled Functions
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Set Up Cron Job for Token Refresh</h3>
                  <p>Run the following SQL to set up a scheduled job for refreshing Fortnox tokens:</p>
                  
                  <CodeBlock 
                    label="Fortnox Token Refresh Cron SQL"
                    code={`-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set up scheduled job for Fortnox token refresh
SELECT cron.schedule(
  'refresh-fortnox-token',
  '15 * * * *',  -- Run every hour at 15 minutes past the hour
  $$
  SELECT net.http_post(
    url:='https://your-project-id.supabase.co/functions/v1/fortnox-token-refresh',
    headers:='{
      "Content-Type": "application/json",
      "Authorization": "Bearer your-fortnox-refresh-secret"
    }'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);`}
                  />
                  
                  <div className="bg-amber-50 border border-amber-200 rounded p-4 mt-4">
                    <p className="text-amber-800 font-medium">⚠️ Important</p>
                    <p className="text-amber-700 text-sm mt-1">
                      Replace <code>your-project-id</code> with your actual Supabase project ID and
                      <code>your-fortnox-refresh-secret</code> with the FORTNOX_REFRESH_SECRET value
                      you set in your environment variables.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 8: Verify Setup */}
            <AccordionItem value="step8">
              <AccordionTrigger className="text-lg font-medium">
                Step 8: Verify Setup
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-md font-medium">Final Checklist</h3>
                  <p>Verify that the following components are properly set up:</p>
                  
                  <div className="space-y-2 mt-4">
                    <Label>Database:</Label>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>All tables are created</li>
                      <li>All functions are created</li>
                      <li>All triggers are set up</li>
                      <li>RLS policies are properly configured</li>
                      <li>Storage buckets are created with appropriate policies</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label>Edge Functions:</Label>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>All edge functions are deployed</li>
                      <li>Proper JWT verification settings are configured</li>
                      <li>All required secrets are set</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label>Scheduled Jobs:</Label>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Fortnox token refresh cron job is set up</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <Label>Configuration:</Label>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Email authentication is properly configured</li>
                      <li>Fortnox API credentials are stored in system_settings</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
                    <p className="text-green-800 font-medium">Congratulations!</p>
                    <p className="text-green-700 text-sm mt-1">
                      If you've completed all the steps successfully, your backend infrastructure is now
                      set up to support the full functionality of the time tracking and invoicing system.
                      You can now connect your frontend to this Supabase instance using the project URL
                      and anon key.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
