
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardCopy, Code, Database, FunctionSquare, Info, Key, Settings, ServerCog } from "lucide-react";

const DEFAULT_SUPABASE_URL = "https://xojrleypudfrbmvejpow.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc";

// Instance setup tab: show config fields + tutorial
export function InstanceSetupTab() {
  // Local state for Supabase config
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("connection");

  // On mount, load current config from localStorage
  useEffect(() => {
    setSupabaseUrl(localStorage.getItem("custom_supabase_url") || DEFAULT_SUPABASE_URL);
    setSupabaseAnonKey(localStorage.getItem("custom_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY);
  }, []);

  // Function to save and apply config
  const saveConfig = () => {
    if (!supabaseUrl.startsWith("https://") || !supabaseAnonKey || supabaseAnonKey.length < 30) {
      toast.error("Please enter a valid Supabase URL and anon key.");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem("custom_supabase_url", supabaseUrl.trim());
      localStorage.setItem("custom_supabase_anon_key", supabaseAnonKey.trim());
      toast.success("Supabase configuration saved! Reloading...");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast.error("Failed to save Supabase config: " + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  // Function to copy code to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(err => toast.error("Failed to copy: " + err.message));
  };

  return (
    <Card className="mt-1">
      <CardHeader>
        <CardTitle>Instance & First-Time Setup</CardTitle>
        <CardDescription>
          Welcome to the techlinx Time Tracking platform! This page provides complete setup instructions for connecting to or duplicating your Supabase backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="connection" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Connection</span>
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              <span>Full Setup Tutorial</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="connection">
            <div className="text-muted-foreground mb-2">
              <p className="mb-4">Enter your Supabase Project URL and Anon Key here to connect this application to your backend:</p>
              
              <div className="flex flex-col md:flex-row gap-2 mt-2 mb-2">
                <Input
                  type="text"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="Supabase URL"
                  className="w-full md:max-w-xs"
                  autoComplete="off"
                  aria-label="Supabase URL"
                />
                <Input
                  type="text"
                  value={supabaseAnonKey}
                  onChange={e => setSupabaseAnonKey(e.target.value)}
                  placeholder="Supabase Anon Key"
                  className="w-full md:max-w-xl"
                  autoComplete="off"
                  aria-label="Supabase Anon Key"
                />
                <Button onClick={saveConfig} disabled={saving} className="w-full md:w-auto">
                  {saving ? "Saving..." : "Save & Apply"}
                </Button>
              </div>
              <small className="text-xs text-gray-500">You can find these in your Supabase project: Project Settings → API</small>
              
              <Alert className="mt-4 bg-amber-50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Login with <code className="bg-black/10 p-1 rounded">techlinxadmin</code> / <code className="bg-black/10 p-1 rounded">Snowball9012@</code> for first-time access.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="tutorial" className="space-y-6">
            <Alert className="bg-green-50 mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p>This is a comprehensive guide to recreate the entire Supabase backend for this application from scratch. Each section contains all the SQL, configuration, and code required.</p>
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="general">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <Info className="h-5 w-5" /> General Information
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Prerequisites</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>A Supabase account</li>
                      <li>A new Supabase project</li>
                      <li>Basic knowledge of SQL and Supabase concepts</li>
                      <li>Access to your Supabase project's API URL and Anon Key</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">What You'll Need To Set Up</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Database tables and schemas (9 tables)</li>
                      <li>Row Level Security (RLS) policies</li>
                      <li>Storage buckets and policies</li>
                      <li>Edge functions (7 functions)</li>
                      <li>Environment variables and secrets</li>
                      <li>Database functions and triggers</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Backend Architecture Overview</h3>
                    <p>This application uses Supabase for:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><b>Authentication:</b> Email-based user authentication with role management</li>
                      <li><b>Database:</b> PostgreSQL database with tables for users, clients, products, time entries, invoices</li>
                      <li><b>Storage:</b> File storage for application logo and images</li>
                      <li><b>Edge Functions:</b> Serverless functions for Fortnox integration and user management</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step1">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <Database className="h-5 w-5" /> Step 1: Create Supabase Project
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Creating Your Supabase Project</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">https://app.supabase.com</a> and log in</li>
                      <li>Click "New Project"</li>
                      <li>Enter a name for your project</li>
                      <li>Choose a database password (save this securely)</li>
                      <li>Choose a region close to your users</li>
                      <li>Click "Create new project"</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Configure Project Settings</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>In the Supabase dashboard, go to "Authentication" → "Settings"</li>
                      <li>Under "Site URL", add your application's URL</li>
                      <li>Under "Redirect URLs", add your application's URL (both development and production URLs)</li>
                      <li>Turn off "Confirm Email" for testing if needed</li>
                      <li>Save changes</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Get API Keys</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Go to "Project Settings" → "API"</li>
                      <li>Copy the "Project URL" and "anon/public" key</li>
                      <li>These will be used to configure the frontend application</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-100 p-3 rounded-md mt-4">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2" /> Config.toml Setup
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => copyToClipboard(`# Replace with your new project id!
project_id = "<your_project_id>"

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

# Set up Edge functions 
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
verify_jwt = false`)}>
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </h4>
                    <pre className="text-xs overflow-auto max-h-96 bg-black text-green-400 p-4 rounded-md">
                      {`# Replace with your new project id!
project_id = "<your_project_id>"

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

# Set up Edge functions 
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
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step2">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <Database className="h-5 w-5" /> Step 2: Create Database Tables
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Execute SQL for System Settings Table</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Create a system_settings table to store application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to restrict access to system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (for company news and appearance)
CREATE POLICY "Anyone can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (true);

-- Only administrators and managers can update system settings
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

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default settings - Updated to match the green theme
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

-- Add a function to apply color theme
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
EXECUTE FUNCTION public.apply_theme_to_css_variables();`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy System Settings SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
                      {`-- Create a system_settings table to store application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to restrict access to system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (for company news and appearance)
CREATE POLICY "Anyone can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (true);

-- Only administrators and managers can update system settings
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

-- ... more policies and functions ...`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">User Profiles Table</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Create a profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin and managers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create a function to handle new user creation
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

-- Create a trigger to handle new user registrations
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Utility function for checking user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
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

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
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

-- Function to get username by ID
CREATE OR REPLACE FUNCTION public.get_username(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN
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
$$;`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Profiles SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
                      {`-- Create a profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies...`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Clients and Products Tables</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Create clients table
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

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Everyone can view clients
CREATE POLICY "Anyone can view clients"
  ON public.clients
  FOR SELECT
  USING (true);

-- Only authenticated users can insert clients
CREATE POLICY "Authenticated users can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins and managers can update clients
CREATE POLICY "Admins and managers can update clients"
  ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can delete clients
CREATE POLICY "Admins and managers can delete clients"
  ON public.clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'activity' or 'item'
  price NUMERIC NOT NULL DEFAULT 0,
  account_number TEXT,
  article_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can view products
CREATE POLICY "Anyone can view products"
  ON public.products
  FOR SELECT
  USING (true);

-- Only admins and managers can insert products
CREATE POLICY "Admins and managers can insert products"
  ON public.products
  FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can update products
CREATE POLICY "Admins and managers can update products"
  ON public.products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can delete products
CREATE POLICY "Admins and managers can delete products"
  ON public.products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Clients/Products SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
                      {`-- Create clients table
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

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies...`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Time Entries, Invoices and News Tables</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  description TEXT,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on time_entries table
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own time entries
CREATE POLICY "Users can view their own time entries"
  ON public.time_entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins and managers can view all time entries
CREATE POLICY "Admins and managers can view all time entries"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Users can insert their own time entries
CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own time entries if not invoiced
CREATE POLICY "Users can update their own time entries if not invoiced"
  ON public.time_entries
  FOR UPDATE
  USING (auth.uid() = user_id AND (invoiced = false OR invoiced IS NULL));

-- Admins and managers can update any time entry
CREATE POLICY "Admins and managers can update any time entry"
  ON public.time_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Users can delete their own time entries if not invoiced
CREATE POLICY "Users can delete their own time entries if not invoiced"
  ON public.time_entries
  FOR DELETE
  USING (auth.uid() = user_id AND (invoiced = false OR invoiced IS NULL));

-- Admins and managers can delete any time entry
CREATE POLICY "Admins and managers can delete any time entry"
  ON public.time_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  exported_to_fortnox BOOLEAN DEFAULT false,
  fortnox_invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Everyone can view invoices
CREATE POLICY "Anyone can view invoices"
  ON public.invoices
  FOR SELECT
  USING (true);

-- Only admins and managers can insert invoices
CREATE POLICY "Admins and managers can insert invoices"
  ON public.invoices
  FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can update invoices
CREATE POLICY "Admins and managers can update invoices"
  ON public.invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can delete invoices
CREATE POLICY "Admins and managers can delete invoices"
  ON public.invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  vat_percentage INTEGER NOT NULL
);

-- Enable RLS on invoice_items table
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view invoice items
CREATE POLICY "Anyone can view invoice items"
  ON public.invoice_items
  FOR SELECT
  USING (true);

-- Only admins and managers can insert invoice items
CREATE POLICY "Admins and managers can insert invoice items"
  ON public.invoice_items
  FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can update invoice items
CREATE POLICY "Admins and managers can update invoice items"
  ON public.invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only admins and managers can delete invoice items
CREATE POLICY "Admins and managers can delete invoice items"
  ON public.invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create news_posts table for company announcements
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for news posts
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read news posts
CREATE POLICY "Anyone can read news posts" 
  ON public.news_posts 
  FOR SELECT 
  USING (true);

-- Only administrators and managers can create news posts
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

-- Only administrators and managers can update their own news posts
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

-- Only administrators and managers can delete their own news posts
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

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the timestamp
CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION update_news_posts_updated_at();

-- Add token refresh logs table for debugging
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  session_id TEXT
);

-- User timers for active tracking
CREATE TABLE IF NOT EXISTS public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  status TEXT NOT NULL,  -- 'running', 'paused', 'stopped'
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;

-- Users can only see their own timers
CREATE POLICY "Users can view their own timers"
  ON public.user_timers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the user can create their own timers
CREATE POLICY "Users can create their own timers"
  ON public.user_timers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the user can update their own timers
CREATE POLICY "Users can update their own timers"
  ON public.user_timers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only the user can delete their own timers
CREATE POLICY "Users can delete their own timers"
  ON public.user_timers
  FOR DELETE
  USING (auth.uid() = user_id);`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Time Entries, Invoices & News SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
                      {`-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  description TEXT,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS...`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step3">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <FunctionSquare className="h-5 w-5" /> Step 3: Database Functions & Setup Storage
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">System Settings Functions</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Function to save system settings
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy System Settings Functions
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
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

-- Function to get system settings...`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Storage Buckets & Policies</h3>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Create application-logo bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create news_images bucket for storing news post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public access to application logos
CREATE POLICY "Allow public access to application logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'application-logo')
ON CONFLICT DO NOTHING;

-- Admin and manager users can insert/upload logos
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

-- Admin and manager users can update logos
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

-- Admin and manager users can delete logos
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

-- Set up storage policy for the news_images bucket
CREATE POLICY "Public can view news images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'news_images');

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
);

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
);

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
);`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Storage Setup SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-60 bg-black text-green-400 p-4 rounded-md">
                      {`-- Create application-logo bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create news_images bucket for storing news post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies...`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step4">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <ServerCog className="h-5 w-5" /> Step 4: Edge Functions
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Required Edge Functions</h3>
                    <p>You need to create 7 edge functions in your Supabase project:</p>
                    <ol className="list-decimal pl-5 space-y-3">
                      <li className="border-b pb-2">
                        <div className="font-semibold">get-all-users</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Used by administrators to view and manage all users in the system.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy get-all-users
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-token-exchange</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Handles OAuth token exchange for Fortnox integration.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`// Function for exchanging the OAuth code for a Fortnox access token
// Path: supabase/functions/fortnox-token-exchange/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { code, state } = await req.json();
    
    // Validate required parameters
    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_settings')
      .single();
    
    if (settingsError || !settingsData?.settings) {
      console.error("Error getting Fortnox settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Fortnox settings not found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    const fortnoxSettings = settingsData.settings;
    
    if (!fortnoxSettings.clientId || !fortnoxSettings.clientSecret) {
      return new Response(
        JSON.stringify({ error: "Fortnox integration not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(fortnoxSettings.clientId + ':' + fortnoxSettings.clientSecret)
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': state || window.location.origin
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Fortnox token exchange error:", tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to exchange code for token", details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store the access token and refresh token in the database
    const { error: storeError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          scope: tokenData.scope,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          timestamp: new Date().toISOString(),
          clientId: fortnoxSettings.clientId,
          clientSecret: fortnoxSettings.clientSecret
        }
      });
    
    if (storeError) {
      console.error("Error storing Fortnox credentials:", storeError);
      return new Response(
        JSON.stringify({ error: "Failed to store credentials" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Return the token data to the client
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Fortnox integration successful", 
        scopes: tokenData.scope
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-token-exchange
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-token-refresh</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Refreshes Fortnox access tokens before they expire.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`// Function for refreshing Fortnox access tokens
// Path: supabase/functions/fortnox-token-refresh/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { forced = false } = await req.json().catch(() => ({}));
    console.log("Token refresh requested. Forced:", forced);
    
    // Check for secret key in headers for security
    const authSecret = req.headers.get('x-refresh-secret');
    const configSecret = Deno.env.get('FORTNOX_REFRESH_SECRET');
    
    if (configSecret && authSecret !== configSecret) {
      console.error("Unauthorized refresh attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current Fortnox credentials
    const { data: credentialsData, error: credentialsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .single();
    
    if (credentialsError || !credentialsData?.settings) {
      console.error("Fortnox credentials not found:", credentialsError);
      return new Response(
        JSON.stringify({ error: "Fortnox credentials not found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    const credentials = credentialsData.settings;
    const refreshToken = credentials.refreshToken;
    const clientId = credentials.clientId;
    const clientSecret = credentials.clientSecret;
    
    if (!refreshToken || !clientId || !clientSecret) {
      console.error("Missing required credentials");
      return new Response(
        JSON.stringify({ error: "Incomplete Fortnox credentials" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if token needs refreshing
    const tokenTimestamp = new Date(credentials.timestamp || 0).getTime();
    const tokenAgeMs = Date.now() - tokenTimestamp;
    const tokenAgeMinutes = tokenAgeMs / (1000 * 60);
    const expiresInMinutes = (credentials.expiresIn || 3600) / 60; // Convert seconds to minutes
    
    // Create a log entry
    const logSessionId = crypto.randomUUID();
    
    // Log the refresh attempt
    try {
      await supabase.from('token_refresh_logs').insert({
        session_id: logSessionId,
        success: false, // Will update on success
        message: `Starting refresh. Token age: ${tokenAgeMinutes.toFixed(2)} min, expires in: ${expiresInMinutes.toFixed(2)} min. Forced: ${forced}`,
        token_length: refreshToken?.length || 0
      });
    } catch (logError) {
      console.error("Failed to create refresh log:", logError);
    }
    
    // Only refresh if forced or token is older than 80% of its lifetime
    if (!forced && tokenAgeMinutes < (expiresInMinutes * 0.8)) {
      console.log("Token does not need refreshing yet");
      return new Response(
        JSON.stringify({ 
          message: "Token is still valid", 
          tokenAge: tokenAgeMinutes,
          expiresIn: expiresInMinutes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("Refreshing Fortnox token...");
    
    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Fortnox token refresh error:", tokenResponse.status, errorText);
      
      // Update the log with the error
      try {
        await supabase.from('token_refresh_logs').update({
          message: `Refresh failed: ${errorText} (HTTP ${tokenResponse.status})`,
        }).eq('session_id', logSessionId);
      } catch (logUpdateError) {
        console.error("Failed to update refresh log:", logUpdateError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to refresh token", 
          status: tokenResponse.status,
          details: errorText 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store the new access token and refresh token
    const { error: storeError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          scope: tokenData.scope || credentials.scope,
          expiresIn: tokenData.expires_in,
          tokenType: tokenData.token_type,
          timestamp: new Date().toISOString(),
          clientId: clientId,
          clientSecret: clientSecret
        }
      });
    
    if (storeError) {
      console.error("Error storing refreshed credentials:", storeError);
      
      // Update the log with the error
      try {
        await supabase.from('token_refresh_logs').update({
          message: `Token received but storage failed: ${storeError.message}`,
        }).eq('session_id', logSessionId);
      } catch (logUpdateError) {
        console.error("Failed to update refresh log:", logUpdateError);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to store refreshed credentials" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Fortnox token refreshed successfully");
    
    // Update the log with success
    try {
      await supabase.from('token_refresh_logs').update({
        success: true,
        message: `Token refreshed successfully. New token length: ${tokenData.access_token?.length || 0}`,
        token_length: tokenData.access_token?.length || 0
      }).eq('session_id', logSessionId);
    } catch (logUpdateError) {
      console.error("Failed to update refresh log with success:", logUpdateError);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Fortnox token refreshed",
        scopes: tokenData.scope
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error in token refresh:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-token-refresh
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-scheduled-refresh</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Regularly scheduled function to refresh Fortnox tokens automatically.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`// Scheduled function to refresh Fortnox token regularly
// Path: supabase/functions/fortnox-scheduled-refresh/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Scheduled Fortnox token refresh triggered");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET');
    
    if (!supabaseUrl) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Call the fortnox-token-refresh function
    const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/fortnox-token-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-refresh-secret': refreshSecret || ''
      },
      body: JSON.stringify({ forced: false })
    });
    
    const refreshResult = await refreshResponse.json();
    
    if (!refreshResponse.ok) {
      console.error("Scheduled refresh failed:", refreshResult);
      return new Response(
        JSON.stringify({ 
          error: "Scheduled refresh failed", 
          details: refreshResult 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: refreshResponse.status }
      );
    }
    
    console.log("Scheduled refresh completed:", refreshResult);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Scheduled refresh completed",
        result: refreshResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error in scheduled refresh:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-scheduled-refresh
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-token-migrate</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Migrates legacy Fortnox access tokens to OAuth2 tokens.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-token-migrate
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-proxy</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Proxy for making authenticated requests to the Fortnox API.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
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
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-proxy
                        </Button>
                      </li>
                      
                      <li className="border-b pb-2">
                        <div className="font-semibold">fortnox-token-debug</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Provides debugging information for Fortnox token state.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
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
});`)}>
                          <ClipboardCopy className="h-4 w-4 mr-2" /> Copy fortnox-token-debug
                        </Button>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">CORS Helper File</h3>
                    <p>Create a shared CORS helper file in <code>supabase/functions/_shared/cors.ts</code>:</p>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`// CORS headers for all Supabase Edge Functions
// Path: supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-refresh-secret',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy _shared/cors.ts
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-40 bg-black text-green-400 p-4 rounded-md">
                      {`// CORS headers for all Supabase Edge Functions
// Path: supabase/functions/_shared/cors.ts

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-refresh-secret',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};`}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step5">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <Key className="h-5 w-5" /> Step 5: Set Environment Variables
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Required Secrets</h3>
                    <p>Set up the following secrets in your Supabase project (Project Settings → API → Edge Functions → Environment Variables):</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li><strong>SUPABASE_URL</strong> - The URL of your Supabase project</li>
                      <li><strong>SUPABASE_ANON_KEY</strong> - The anon key of your Supabase project</li>
                      <li><strong>SUPABASE_SERVICE_ROLE_KEY</strong> - The service role key of your Supabase project</li>
                      <li><strong>SUPABASE_DB_URL</strong> - The database connection URL (format: postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres)</li>
                      <li><strong>FORTNOX_REFRESH_SECRET</strong> - A unique secret for validating token refresh requests</li>
                      <li><strong>JWT_SECRET</strong> - A secret for JWT token validation</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-100 p-4 rounded-md">
                    <h4 className="font-semibold mb-2">How to Find These Values</h4>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>SUPABASE_URL</strong> and <strong>SUPABASE_ANON_KEY</strong>: Go to Project Settings → API</li>
                      <li><strong>SUPABASE_SERVICE_ROLE_KEY</strong>: Go to Project Settings → API → service_role key (scroll down)</li>
                      <li><strong>SUPABASE_DB_URL</strong>: Go to Project Settings → Database → Connection String → URI</li>
                      <li><strong>FORTNOX_REFRESH_SECRET</strong>: Generate a random string</li>
                      <li><strong>JWT_SECRET</strong>: Generate a random string</li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Info className="h-4 w-4 mr-2" /> Important Note About Secrets
                    </h4>
                    <p>For security, never share or expose these secrets. In production, use a secure method for storing and accessing secrets such as a secrets manager or environment variables in your deployment platform.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step6">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <FunctionSquare className="h-5 w-5" /> Step 6: Setup Scheduled Functions
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Enable Extensions</h3>
                    <p>First, enable the required PostgreSQL extensions for scheduled functions:</p>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Enable required extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Extensions SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-40 bg-black text-green-400 p-4 rounded-md">
                      {`-- Enable required extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Create Scheduled Token Refresh</h3>
                    <p>Set up a scheduled task to refresh the Fortnox token automatically:</p>
                    <Button variant="outline" size="sm" className="mb-2" onClick={() => copyToClipboard(`-- Schedule Fortnox token refresh every 45 minutes
SELECT cron.schedule(
  'refresh-fortnox-token-every-45-minutes',
  '*/45 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xojrleypudfrbmvejpow.supabase.co/functions/v1/fortnox-token-refresh',
    headers:='{
      "Content-Type": "application/json",
      "x-refresh-secret": "your_fortnox_refresh_secret_here"
    }'::jsonb,
    body:='{"forced": false}'::jsonb
  ) AS request_id;
  $$
);`)}>
                      <ClipboardCopy className="h-4 w-4 mr-2" /> Copy Scheduled Task SQL
                    </Button>
                    
                    <pre className="text-xs overflow-auto max-h-40 bg-black text-green-400 p-4 rounded-md">
                      {`-- Schedule Fortnox token refresh every 45 minutes
SELECT cron.schedule(
  'refresh-fortnox-token-every-45-minutes',
  '*/45 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xojrleypudfrbmvejpow.supabase.co/functions/v1/fortnox-token-refresh',
    headers:='{
      "Content-Type": "application/json",
      "x-refresh-secret": "your_fortnox_refresh_secret_here"
    }'::jsonb,
    body:='{"forced": false}'::jsonb
  ) AS request_id;
  $$
);`}
                    </pre>
                    <div className="bg-amber-50 p-3 rounded">
                      <p className="text-sm"><strong>Note:</strong> Replace <code>your_fortnox_refresh_secret_here</code> with the same secret you set as the <code>FORTNOX_REFRESH_SECRET</code> environment variable. Also replace the URL with your own Supabase URL.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="step7">
                <AccordionTrigger className="text-lg font-semibold flex gap-2 items-center">
                  <Info className="h-5 w-5" /> Step 7: Verify & Test
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Verification Checklist</h3>
                    <p>After completing all the previous steps, verify your setup with this checklist:</p>
                    <ul className="list-none space-y-2">
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Database tables created with correct schemas and RLS policies</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Storage buckets created with proper policies</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>All 7 edge functions deployed and functional</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Environment variables and secrets set correctly</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Scheduled functions set up and running</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Database functions and triggers working as expected</div>
                      </li>
                      <li className="flex items-start">
                        <div className="h-6 w-6 mr-2 flex-shrink-0 rounded border border-gray-300 flex items-center justify-center">✓</div>
                        <div>Frontend connected to your Supabase instance with correct URL and Anon Key</div>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Testing the Backend</h3>
                    <p>Here are some quick tests to verify your setup:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li><strong>Authentication:</strong> Try registering a new user and logging in</li>
                      <li><strong>Database Access:</strong> Create a client and verify it's saved to the database</li>
                      <li><strong>Storage:</strong> Try uploading a logo in the Appearance settings</li>
                      <li><strong>Edge Functions:</strong> Test the user management functionality as an admin user</li>
                      <li><strong>Fortnox Integration:</strong> If you have Fortnox credentials, test the OAuth flow</li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-2">Troubleshooting Common Issues</h4>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Authentication issues:</strong> Check that your Site URL and Redirect URLs are set correctly in Supabase Authentication settings</li>
                      <li><strong>Database connection errors:</strong> Verify your RLS policies and ensure the tables were created correctly</li>
                      <li><strong>Edge function errors:</strong> Check the function logs in the Supabase dashboard and verify all environment variables are set</li>
                      <li><strong>Storage issues:</strong> Make sure the storage buckets and policies were created correctly</li>
                      <li><strong>Scheduled function issues:</strong> Check that pg_cron and pg_net extensions are enabled and the cron job is scheduled</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()} — Keep this guide updated as backend changes are made.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default InstanceSetupTab;
