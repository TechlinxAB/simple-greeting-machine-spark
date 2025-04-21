
import React from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupabaseInstanceLinker } from './SupabaseInstanceLinker';
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, Info, KeyRound, Database, ShieldAlert, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const InstanceSetupTab = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

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
            Configure and manage the Supabase backend for this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="warning" className="border-amber-500 border-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-amber-600">Emergency Admin Access</AlertTitle>
            <AlertDescription>
              This application includes an emergency admin access feature that allows you to log in using
              special credentials when the Supabase instance is unreachable. This is useful for setting up a
              new instance. Please keep these credentials secure.
            </AlertDescription>
          </Alert>

          <SupabaseInstanceLinker />

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Complete Backend Setup Checklist</h3>
            <p className="text-sm text-muted-foreground">
              Follow this checklist to set up a complete clone of the backend on a new Supabase instance:
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
                    <li>Pricing Plan: Free tier works for development</li>
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
                  <p>Run the following SQL scripts in the Supabase SQL editor to create all required tables, functions, and policies:</p>

                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    <Badge className="mb-2">Schema Setup</Badge>
                    <pre className="whitespace-pre-wrap">
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

-- Create RLS policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`}
                    </pre>
                  </div>

                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto mt-4">
                    <Badge className="mb-2">Create Tables</Badge>
                    <pre className="whitespace-pre-wrap">
{`-- Create clients table
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
);`}
                    </pre>
                  </div>

                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto mt-4">
                    <Badge className="mb-2">Create Storage Buckets</Badge>
                    <pre className="whitespace-pre-wrap">
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
ON CONFLICT (id) DO NOTHING;`}
                    </pre>
                  </div>

                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto mt-4">
                    <Badge className="mb-2">Create System Functions</Badge>
                    <pre className="whitespace-pre-wrap">
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
$$;`}
                    </pre>
                  </div>

                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto mt-4">
                    <Badge className="mb-2">Default Settings & RLS Policies</Badge>
                    <pre className="whitespace-pre-wrap">
{`-- Insert default settings
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

-- Apply RLS to all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Default RLS policies for system settings
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

-- Default Storage policies
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
ON CONFLICT DO NOTHING;`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="step-3">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>3. Configure Supabase Secrets</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Add the following secrets in your Supabase project:</p>
                  <div className="bg-muted p-4 rounded space-y-2">
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> JWT_SECRET
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generate a strong random string for JWT authentication
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> SUPABASE_URL
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your Supabase project URL (https://YOUR_PROJECT_ID.supabase.co)
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
                        <KeyRound className="h-3 w-3" /> SUPABASE_DB_URL
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your Supabase database connection string
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1 mb-1">
                        <KeyRound className="h-3 w-3" /> FORTNOX_REFRESH_SECRET
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Secret key for Fortnox token refresh functionality
                      </div>
                    </div>
                  </div>
                  
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

              <AccordionItem value="step-4">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>4. Enable Auth Settings</span>
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

              <AccordionItem value="step-5">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>5. Deploy Edge Functions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Create and deploy the following edge functions in your Supabase project:</p>
                  <div className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
                    <Badge className="mb-2">Function List</Badge>
                    <ul className="list-disc pl-6 space-y-0.5">
                      <li>fortnox-token-exchange</li>
                      <li>fortnox-token-refresh</li>
                      <li>fortnox-token-migrate</li>
                      <li>fortnox-proxy</li>
                      <li>get-all-users</li>
                      <li>fortnox-token-debug</li>
                      <li>fortnox-scheduled-refresh</li>
                    </ul>
                  </div>
                  <p className="mt-2">Create these functions using the Supabase CLI or through the web interface.</p>
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

              <AccordionItem value="step-6">
                <AccordionTrigger className="text-base">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>6. Link Your New Instance</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm">
                  <p>Finally, link this application to your new Supabase instance:</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Copy your Supabase project URL</li>
                    <li>Copy your Supabase anon/public key</li>
                    <li>Paste them in the instance linker form above</li>
                    <li>Click "Test Connection" to verify it works</li>
                    <li>Click "Save & Use" to connect to your new instance</li>
                  </ol>
                  <p className="text-xs italic mt-2">
                    For development and testing, you can log in to your new instance using the emergency admin credentials.
                    This allows you to set up the first real user accounts.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Troubleshooting</h3>
            <p className="text-sm text-muted-foreground">
              If you encounter issues during setup, try these troubleshooting steps:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Check that all required SQL has been executed successfully</li>
              <li>Verify that all secrets have been configured correctly</li>
              <li>Ensure auth settings are properly configured</li>
              <li>Test auth functionality with a test user</li>
              <li>Check console logs for detailed error messages</li>
              <li>Use emergency admin access if database connection is unavailable</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
