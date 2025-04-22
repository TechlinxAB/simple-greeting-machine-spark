
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { SQLBlock, TSBlock, ShellBlock } from './CodeBlock';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function SetupGuide() {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTitle>Self-hosting guide</AlertTitle>
        <AlertDescription>
          Follow the steps below to set up your own instance of the application.
          Each step contains the necessary code and instructions.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="step1">
          <AccordionTrigger>Step 1: Database Schema Setup</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Create the database tables</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Run the following SQL to create the necessary database tables:</p>
                
                <SQLBlock 
                  title="1. Create extension and schema" 
                  code={`-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;`} 
                />

                <SQLBlock 
                  title="2. Create user roles enum" 
                  code={`-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'user');`} 
                />

                <SQLBlock 
                  title="3. Create profiles table" 
                  code={`-- Create profiles table with role
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  role public.user_role DEFAULT 'user'::public.user_role NOT NULL
);`} 
                />

                <SQLBlock 
                  title="4. Create clients table" 
                  code={`-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  org_number TEXT,
  client_number TEXT,
  street_address TEXT,
  postal_code TEXT,
  city TEXT,
  county TEXT,
  telephone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="5. Create product types enum" 
                  code={`-- Create product types enum
CREATE TYPE public.product_type AS ENUM ('activity', 'item');`} 
                />

                <SQLBlock 
                  title="6. Create products table" 
                  code={`-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  account_number TEXT NOT NULL,
  vat_percentage INTEGER NOT NULL,
  type public.product_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="7. Create time entries table" 
                  code={`-- Create time entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="8. Create user timers table" 
                  code={`-- Create user timers table
CREATE TABLE public.user_timers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="9. Create system settings table" 
                  code={`-- Create system settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#10b981',
  app_name TEXT DEFAULT 'Time Tracking & Invoicing',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="10. Create invoices table" 
                  code={`-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  fortnox_invoice_id TEXT,
  fortnox_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="11. Create invoice items table" 
                  code={`-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  vat_percentage INTEGER NOT NULL,
  account_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="12. Create Fortnox tokens table" 
                  code={`-- Create Fortnox tokens table
CREATE TABLE public.fortnox_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="13. Create Fortnox token refresh logs table" 
                  code={`-- Create token refresh logs table
CREATE TABLE public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);`} 
                />

                <SQLBlock 
                  title="14. Create helper functions" 
                  code={`-- Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create is_admin_or_manager helper function
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`} 
                />

                <SQLBlock 
                  title="15. Create initial system settings" 
                  code={`-- Insert initial system settings
INSERT INTO public.system_settings (id, primary_color, secondary_color, app_name)
VALUES (uuid_generate_v4(), '#3b82f6', '#10b981', 'Time Tracking & Invoicing');`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step2">
          <AccordionTrigger>Step 2: Row Level Security Policies</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Set up row-level security policies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Configure these RLS policies to secure your data:</p>
                
                <SQLBlock 
                  title="RLS Policies" 
                  code={`-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (public.is_admin());

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
  USING (public.is_admin());

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
  USING (public.is_admin());

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
  USING (public.is_admin());

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

-- SYSTEM SETTINGS POLICIES
CREATE POLICY "Authenticated users can view system settings" 
  ON public.system_settings 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update system settings" 
  ON public.system_settings 
  FOR UPDATE 
  USING (public.is_admin());

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
  USING (public.is_admin());

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
  USING (public.is_admin());

-- FORTNOX TOKENS POLICIES
CREATE POLICY "Admins can view fortnox tokens" 
  ON public.fortnox_tokens 
  FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "Admins can insert fortnox tokens" 
  ON public.fortnox_tokens 
  FOR INSERT 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update fortnox tokens" 
  ON public.fortnox_tokens 
  FOR UPDATE 
  USING (public.is_admin());

CREATE POLICY "Admins can delete fortnox tokens" 
  ON public.fortnox_tokens 
  FOR DELETE 
  USING (public.is_admin());

-- TOKEN REFRESH LOGS POLICIES
CREATE POLICY "Admins can view token refresh logs" 
  ON public.token_refresh_logs 
  FOR SELECT 
  USING (public.is_admin());

CREATE POLICY "System can insert token refresh logs" 
  ON public.token_refresh_logs 
  FOR INSERT 
  WITH CHECK (true);`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step3">
          <AccordionTrigger>Step 3: Storage Setup</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Set up storage buckets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Create storage buckets for media content:</p>
                
                <SQLBlock 
                  title="Create storage buckets and policies" 
                  code={`-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]);

-- Create app-content bucket for logos and other app assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-content', 'app-content', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp']::text[]);

-- Create avatars bucket policies
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Create app-content bucket policies
CREATE POLICY "Public can view app content"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-content');

CREATE POLICY "Admins can upload app content"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-content' AND public.is_admin());

CREATE POLICY "Admins can update app content"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-content' AND public.is_admin());

CREATE POLICY "Admins can delete app content"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-content' AND public.is_admin());`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step4">
          <AccordionTrigger>Step 4: Environment Variables</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Configure environment variables</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Set these environment variables in your Supabase project:</p>
                
                <Alert className="mb-4" variant="warning">
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    These variables are crucial for the Fortnox integration and other features to work properly.
                  </AlertDescription>
                </Alert>
                
                <TSBlock 
                  title="Environment Variables for Supabase" 
                  code={`// Fortnox API credentials
FORTNOX_CLIENT_ID=your_fortnox_client_id
FORTNOX_CLIENT_SECRET=your_fortnox_client_secret
FORTNOX_REDIRECT_URI=https://your-supabase-project.functions.supabase.co/fortnox-token-exchange

// Token management
FORTNOX_AUTH_SCOPE=invoice,customer,account
FORTNOX_STATE_SECRET=random_secure_string
JWT_SECRET=another_secure_random_string // Used for token signing

// Supabase connection (for edge functions)
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step5">
          <AccordionTrigger>Step 5: Edge Functions Setup</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Create Edge Functions for Fortnox Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Set up these Supabase Edge Functions for Fortnox integration:</p>

                <TSBlock 
                  title="1. CORS Helper (supabase/functions/_shared/cors.ts)" 
                  code={`// CORS headers for Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Handle OPTIONS request for CORS preflight
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
}
`} 
                />

                <TSBlock 
                  title="2. Supabase Helpers (supabase/functions/_shared/supabase-helpers.ts)" 
                  code={`// Helper functions for Supabase edge functions

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
}`} 
                />

                <TSBlock 
                  title="3. Fortnox Token Exchange (supabase/functions/fortnox-token-exchange/index.ts)" 
                  code={`// This function handles the OAuth callback from Fortnox
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/supabase-helpers.ts'

const FORTNOX_CLIENT_ID = Deno.env.get('FORTNOX_CLIENT_ID')
const FORTNOX_CLIENT_SECRET = Deno.env.get('FORTNOX_CLIENT_SECRET')
const FORTNOX_REDIRECT_URI = Deno.env.get('FORTNOX_REDIRECT_URI')
const FORTNOX_STATE_SECRET = Deno.env.get('FORTNOX_STATE_SECRET')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Check if this is a GET request (Fortnox redirect)
    if (req.method !== 'GET') {
      return errorResponse('Only GET requests are supported', 405, corsHeaders)
    }

    // Get query parameters from the URL
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Handle Fortnox error responses
    if (error) {
      return errorResponse(
        \`Fortnox authorization error: \${error}\`, 
        400, 
        corsHeaders, 
        { description: errorDescription }
      )
    }

    // Validate required parameters
    if (!code) {
      return errorResponse('Missing authorization code', 400, corsHeaders)
    }

    if (!state || state !== FORTNOX_STATE_SECRET) {
      return errorResponse('Invalid state parameter', 400, corsHeaders)
    }

    if (!FORTNOX_CLIENT_ID || !FORTNOX_CLIENT_SECRET || !FORTNOX_REDIRECT_URI) {
      return errorResponse('Fortnox API credentials not configured', 500, corsHeaders)
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${FORTNOX_CLIENT_ID}:\${FORTNOX_CLIENT_SECRET}\`)}\`
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': FORTNOX_REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      return errorResponse(
        'Failed to exchange code for token', 
        500, 
        corsHeaders, 
        errorData
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Create client using service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Save token to database
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000))
    
    // Check if a token already exists
    const { data: existingTokens } = await supabase
      .from('fortnox_tokens')
      .select('id')
    
    let result
    
    if (existingTokens && existingTokens.length > 0) {
      // Update existing token
      result = await supabase
        .from('fortnox_tokens')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingTokens[0].id)
    } else {
      // Insert new token
      result = await supabase
        .from('fortnox_tokens')
        .insert({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt.toISOString()
        })
    }
    
    if (result.error) {
      return errorResponse(
        'Failed to save token to database', 
        500, 
        corsHeaders, 
        result.error
      )
    }
    
    // Redirect to front-end callback with success message
    return new Response(
      \`<html>
        <head>
          <title>Authorization Successful</title>
          <script>
            window.opener.postMessage({ type: 'FORTNOX_AUTH_SUCCESS' }, '*');
            window.close();
          </script>
        </head>
        <body>
          <h1>Authorization Successful!</h1>
          <p>You can close this window now.</p>
        </body>
      </html>\`,
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html' 
        } 
      }
    )
  } catch (error) {
    return errorResponse(
      \`Unexpected error: \${error.message}\`, 
      500, 
      corsHeaders
    )
  }
})
`} 
                />

                <TSBlock 
                  title="4. Fortnox Token Refresh (supabase/functions/fortnox-token-refresh/index.ts)" 
                  code={`// This function refreshes the Fortnox access token
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse, generateSessionId } from '../_shared/supabase-helpers.ts'

const FORTNOX_CLIENT_ID = Deno.env.get('FORTNOX_CLIENT_ID')
const FORTNOX_CLIENT_SECRET = Deno.env.get('FORTNOX_CLIENT_SECRET')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Generate a unique session ID for this request for logging
  const sessionId = generateSessionId()
  console.log(\`[\${sessionId}] Starting token refresh\`)

  try {
    // Create client using service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get the current token
    const { data: tokens, error: fetchError } = await supabase
      .from('fortnox_tokens')
      .select('*')
      .limit(1)
      .single()
    
    if (fetchError) {
      const errorMsg = \`[\${sessionId}] Failed to fetch token: \${fetchError.message}\`
      console.error(errorMsg)
      
      // Log the error
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: false,
          error_message: errorMsg
        })
      
      return errorResponse('Failed to fetch token', 500, corsHeaders, fetchError)
    }
    
    if (!tokens) {
      const errorMsg = \`[\${sessionId}] No token found in database\`
      console.error(errorMsg)
      
      // Log the error
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: false,
          error_message: errorMsg
        })
      
      return errorResponse('No token found in database', 404, corsHeaders)
    }
    
    // Check if token needs to be refreshed (expires in less than 10 minutes)
    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000)
    
    if (expiresAt > tenMinutesFromNow) {
      console.log(\`[\${sessionId}] Token still valid until \${expiresAt.toISOString()}\`)
      
      // Log the success
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: true,
          error_message: 'Token still valid, no refresh needed'
        })
      
      return successResponse({ message: 'Token is still valid' }, corsHeaders)
    }
    
    console.log(\`[\${sessionId}] Token expires at \${expiresAt.toISOString()}, refreshing...\`)
    
    if (!FORTNOX_CLIENT_ID || !FORTNOX_CLIENT_SECRET) {
      const errorMsg = \`[\${sessionId}] Fortnox API credentials not configured\`
      console.error(errorMsg)
      
      // Log the error
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: false,
          error_message: errorMsg
        })
      
      return errorResponse('Fortnox API credentials not configured', 500, corsHeaders)
    }

    // Refresh the token
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${FORTNOX_CLIENT_ID}:\${FORTNOX_CLIENT_SECRET}\`)}\`
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': tokens.refresh_token
      })
    })

    if (!tokenResponse.ok) {
      let errorDetails = {}
      try {
        errorDetails = await tokenResponse.json()
      } catch (e) {
        errorDetails = { text: await tokenResponse.text() }
      }
      
      const errorMsg = \`[\${sessionId}] Failed to refresh token: \${JSON.stringify(errorDetails)}\`
      console.error(errorMsg)
      
      // Log the error
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: false,
          error_message: errorMsg
        })
      
      return errorResponse(
        'Failed to refresh token', 
        500, 
        corsHeaders, 
        errorDetails
      )
    }

    const tokenData = await tokenResponse.json()
    
    // Update token in database
    const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000))
    
    const { error: updateError } = await supabase
      .from('fortnox_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', tokens.id)
    
    if (updateError) {
      const errorMsg = \`[\${sessionId}] Failed to update token in database: \${updateError.message}\`
      console.error(errorMsg)
      
      // Log the error
      await supabase
        .from('token_refresh_logs')
        .insert({
          success: false,
          error_message: errorMsg
        })
      
      return errorResponse('Failed to update token in database', 500, corsHeaders, updateError)
    }
    
    console.log(\`[\${sessionId}] Token refreshed successfully, expires at \${newExpiresAt.toISOString()}\`)
    
    // Log the success
    await supabase
      .from('token_refresh_logs')
      .insert({
        success: true
      })
    
    return successResponse({ 
      message: 'Token refreshed successfully',
      expires_at: newExpiresAt.toISOString()
    }, corsHeaders)
  } catch (error) {
    const errorMsg = \`[\${sessionId}] Unexpected error: \${error.message}\`
    console.error(errorMsg)
    
    // Create client using service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Log the error
    await supabase
      .from('token_refresh_logs')
      .insert({
        success: false,
        error_message: errorMsg
      })
    
    return errorResponse(
      \`Unexpected error: \${error.message}\`, 
      500, 
      corsHeaders
    )
  }
})
`} 
                />

                <TSBlock 
                  title="5. Fortnox Proxy (supabase/functions/fortnox-proxy/index.ts)" 
                  code={`// This function proxies requests to the Fortnox API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse, parseRequestJson } from '../_shared/supabase-helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return errorResponse('Only POST requests are supported', 405, corsHeaders)
    }

    // Parse request body
    const { endpoint, method = 'GET', data = null } = await parseRequestJson(req)
    
    if (!endpoint) {
      return errorResponse('Missing required parameter: endpoint', 400, corsHeaders)
    }

    // Create client using service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get the current token
    const { data: token, error: fetchError } = await supabase
      .from('fortnox_tokens')
      .select('access_token')
      .limit(1)
      .single()
    
    if (fetchError || !token) {
      return errorResponse(
        'Failed to fetch Fortnox token', 
        500, 
        corsHeaders,
        fetchError
      )
    }

    // Call Fortnox API
    const fortnoxUrl = \`https://api.fortnox.se/3/\${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}\`
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': \`Bearer \${token.access_token}\`
      }
    }
    
    // Add body for non-GET requests
    if (method !== 'GET' && data !== null) {
      requestOptions.body = JSON.stringify(data)
    }
    
    const fortnoxResponse = await fetch(fortnoxUrl, requestOptions)
    
    // Handle Fortnox error responses
    if (!fortnoxResponse.ok) {
      let errorData
      try {
        errorData = await fortnoxResponse.json()
      } catch (e) {
        errorData = { status: fortnoxResponse.status, statusText: fortnoxResponse.statusText }
      }
      
      return errorResponse(
        'Fortnox API error', 
        fortnoxResponse.status, 
        corsHeaders, 
        errorData
      )
    }

    // Return the Fortnox response
    const responseData = await fortnoxResponse.json()
    return successResponse(responseData, corsHeaders)
  } catch (error) {
    return errorResponse(
      \`Unexpected error: \${error.message}\`, 
      500, 
      corsHeaders
    )
  }
})
`} 
                />

                <TSBlock 
                  title="6. Get All Users (supabase/functions/get-all-users/index.ts)" 
                  code={`// This function gets all users with their profiles
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/supabase-helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('JWT_SECRET')!

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Check if this is a GET request
    if (req.method !== 'GET') {
      return errorResponse('Only GET requests are supported', 405, corsHeaders)
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401, corsHeaders)
    }

    // Create admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Verify JWT token to get user
    const token = authHeader.split(' ')[1]
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !userData) {
      return errorResponse('Unauthorized', 401, corsHeaders, authError)
    }
    
    // Get user's role from profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    
    if (profileError || !profileData) {
      return errorResponse('Failed to get user profile', 500, corsHeaders, profileError)
    }
    
    // Check if user is admin
    if (profileData.role !== 'admin') {
      return errorResponse('Only administrators can access this resource', 403, corsHeaders)
    }
    
    // Get all users and their profiles
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      return errorResponse('Failed to get users', 500, corsHeaders, usersError)
    }
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      return errorResponse('Failed to get profiles', 500, corsHeaders, profilesError)
    }
    
    // Merge users with their profiles
    const mergedUsers = users.users.map(user => {
      const profile = profiles?.find(p => p.id === user.id) || null
      return {
        ...user,
        profile
      }
    })
    
    return successResponse({ users: mergedUsers }, corsHeaders)
  } catch (error) {
    return errorResponse(
      \`Unexpected error: \${error.message}\`, 
      500, 
      corsHeaders
    )
  }
})
`} 
                />

                <SQLBlock 
                  title="7. Add scheduled token refresh cron job" 
                  code={`-- Create a scheduled job to refresh the Fortnox token every hour
SELECT cron.schedule(
  'fortnox-token-refresh',
  '0 * * * *', -- Run every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://your-supabase-project.functions.supabase.co/fortnox-token-refresh',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer your-supabase-anon-key"}'
    ) as request;
  $$
);`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="step6">
          <AccordionTrigger>Step 6: Authentication Setup</AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Configure authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Set up authentication and user management:</p>
                
                <Alert className="mb-4">
                  <AlertTitle>Authentication Configuration</AlertTitle>
                  <AlertDescription>
                    Configure the following in your Supabase project's Authentication settings:
                  </AlertDescription>
                </Alert>
                
                <ol className="list-decimal list-inside space-y-4 mb-6">
                  <li>Enable Email auth provider with Email confirmation disabled</li>
                  <li>Set up a Site URL that points to your application's domain</li>
                  <li>Configure the Redirect URLs to include your application's URLs</li>
                  <li>Create database triggers to automatically create profiles for new users</li>
                  <li>Set up admin users manually through the Supabase dashboard</li>
                </ol>
                
                <SQLBlock 
                  title="Create user profile trigger" 
                  code={`-- Create a trigger to create a profile whenever a new user signs up
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();`} 
                />

                <SQLBlock 
                  title="Create first admin user (after registration)" 
                  code={`-- Update a specific user to have admin role
-- Replace 'user-uuid-here' with the UUID of the user you want to make admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'user-uuid-here';`} 
                />
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
