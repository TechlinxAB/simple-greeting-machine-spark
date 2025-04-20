
import React, { useState, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { testSupabaseConnection, saveCustomEnvironment, resetToDefaultEnvironment } from '@/lib/setupEnvironment';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Check, Clipboard, Code, Database, ExternalLink, LinkIcon, RefreshCw, Server, Settings, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  copyable?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'sql', title, copyable = true }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative mt-2 mb-4 rounded-md bg-slate-950 text-slate-50 overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-slate-900 text-sm font-mono border-b border-slate-800">
          {title}
        </div>
      )}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono">{code}</pre>
      </div>
      {copyable && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          onClick={handleCopy}
        >
          {copied ? <Check size={16} /> : <Clipboard size={16} />}
        </Button>
      )}
    </div>
  );
};

export const InstanceSetupTab = () => {
  const [customUrl, setCustomUrl] = useState('');
  const [customAnonKey, setCustomAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['item-1']);
  
  const isCurrentInstanceCustom = localStorage.getItem('custom_supabase_url') !== null;
  
  const currentSupabaseInfo = {
    url: isCurrentInstanceCustom ? localStorage.getItem('custom_supabase_url') || '' : environment.supabase.url,
    anonKey: isCurrentInstanceCustom ? '**********' : '**********', // Never display full anon key for security
    projectRef: environment.supabase.projectRef,
  };
  
  useEffect(() => {
    // Expand item-1 by default
    setExpandedItems(['item-1']);
  }, []);
  
  const handleToggleItem = (itemValue: string) => {
    setExpandedItems(
      expandedItems.includes(itemValue)
        ? expandedItems.filter(item => item !== itemValue)
        : [...expandedItems, itemValue]
    );
  };
  
  const handleTestConnection = async () => {
    if (!customUrl || !customAnonKey) {
      toast.error('Both URL and Anon Key are required');
      return;
    }
    
    setTesting(true);
    try {
      const success = await testSupabaseConnection(customUrl, customAnonKey);
      
      if (success) {
        toast.success('Connection successful!');
      } else {
        toast.error('Connection failed. Please check your credentials.');
      }
    } catch (error) {
      toast.error('An error occurred while testing the connection');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };
  
  const handleSaveConnection = async () => {
    if (!customUrl || !customAnonKey) {
      toast.error('Both URL and Anon Key are required');
      return;
    }
    
    try {
      saveCustomEnvironment(customUrl, customAnonKey);
      
      toast.success('Custom connection settings saved. Reloading...');
      
      // Give toast time to display
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Failed to save connection settings');
      console.error(error);
    }
  };
  
  const handleReset = () => {
    resetToDefaultEnvironment();
  };

  return (
    <TabsContent value="setup" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <span>Instance Setup</span>
          </CardTitle>
          <CardDescription>
            Configure and switch between Supabase backends or set up a new self-hosted instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Server className="h-4 w-4" />
            <AlertTitle>Current Supabase Instance</AlertTitle>
            <AlertDescription>
              <div className="mt-2 grid grid-cols-1 gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">URL:</span>
                  <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                    {currentSupabaseInfo.url}
                  </code>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Project Ref:</span>
                  <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                    {currentSupabaseInfo.projectRef}
                  </code>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Connection Type:</span>
                  <span className="font-medium">
                    {isCurrentInstanceCustom ? 'Custom (self-hosted)' : 'Cloud (Supabase.com)'}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Switch Supabase Backend</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customUrl">Custom Supabase URL</Label>
                  <Input
                    id="customUrl"
                    placeholder="https://your-project.supabase.co"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customAnonKey">Custom Anon Key</Label>
                  <Input
                    id="customAnonKey"
                    type="password"
                    placeholder="eyJ..."
                    value={customAnonKey}
                    onChange={(e) => setCustomAnonKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testing || !customUrl || !customAnonKey}
                >
                  {testing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button 
                  onClick={handleSaveConnection}
                  disabled={!customUrl || !customAnonKey}
                >
                  Save & Use Custom Instance
                </Button>
              </div>
              {isCurrentInstanceCustom && (
                <div>
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="mt-2"
                  >
                    Reset to Default Instance
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Complete Setup Guide</h3>
            <p className="text-sm text-muted-foreground">
              Follow this comprehensive guide to set up a new Supabase instance for this application.
            </p>

            <Accordion
              type="multiple"
              value={expandedItems}
              onValueChange={setExpandedItems}
              className="w-full"
            >
              <AccordionItem value="item-1">
                <AccordionTrigger onClick={() => handleToggleItem('item-1')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Step 1: Create a New Supabase Project</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      Start by creating a new Supabase project that will host your database, authentication, 
                      storage, and edge functions.
                    </p>
                    
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Supabase Dashboard</a></li>
                      <li>Click <strong>New Project</strong></li>
                      <li>Choose an organization or create a new one</li>
                      <li>Name your project (e.g., <code>timetracking-production</code>)</li>
                      <li>Set a secure database password</li>
                      <li>Choose a region closest to your users</li>
                      <li>Select the free plan or paid plan depending on your needs</li>
                      <li>Click <strong>Create new project</strong></li>
                      <li>Wait for the project to be created (typically 1-2 minutes)</li>
                    </ol>
                    
                    <p>
                      After project creation, you'll need these credentials to connect your application:
                    </p>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li><strong>Project URL</strong>: Found in the project settings under <code>API</code> tab</li>
                      <li><strong>Anon/Public Key</strong>: Also found in the project settings under <code>API</code> tab</li>
                      <li><strong>Project Reference</strong>: The unique identifier in your project URL (e.g., if your URL is <code>https://abcdefghijklm.supabase.co</code>, the project ref is <code>abcdefghijklm</code>)</li>
                    </ul>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                      <p className="font-medium">Important Note</p>
                      <p className="text-sm mt-1">
                        Never share your database password or service role key as these provide full access to your database. 
                        The anon key has limited permissions defined by your Row Level Security policies.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger onClick={() => handleToggleItem('item-2')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Step 2: Initialize Database Schema</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      Run the following SQL commands in the Supabase SQL Editor to create all required tables, functions, 
                      and security policies. This will set up the complete database schema for the application.
                    </p>
                    
                    <Alert variant="warning">
                      <AlertTitle>Important Note</AlertTitle>
                      <AlertDescription>
                        Run these SQL commands one at a time in the following order. Make sure each command completes successfully 
                        before proceeding to the next one.
                      </AlertDescription>
                    </Alert>
                    
                    <h4 className="font-medium mt-4">2.1 Create Tables</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Create profiles table"
                      code={`-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create clients table"
                      code={`-- Create clients table
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_clients_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create products table"
                      code={`-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  account_number TEXT,
  article_number TEXT,
  vat_percentage INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create time_entries table"
                      code={`-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity INTEGER,
  description TEXT,
  invoice_id UUID,
  invoiced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_time_entries_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create invoices table"
                      code={`-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_invoices_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create invoice_items table"
                      code={`-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  vat_percentage INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL
);`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create user_timers table"
                      code={`-- Create user_timers table
CREATE TABLE IF NOT EXISTS public.user_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_timers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_timers_updated_at
BEFORE UPDATE ON public.user_timers
FOR EACH ROW
EXECUTE FUNCTION public.update_user_timers_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create system_settings table"
                      code={`-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create news_posts table"
                      code={`-- Create news_posts table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_news_posts_updated_at();`}
                    />
                    
                    <CodeBlock 
                      language="sql"
                      title="Create token_refresh_logs table"
                      code={`-- Create token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);`}
                    />
                    
                    <h4 className="font-medium mt-6">2.2 Create Auth Trigger for New Users</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Setup auth trigger for new users"
                      code={`-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();`}
                    />
                    
                    <h4 className="font-medium mt-6">2.3 Create Storage Buckets</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Create storage buckets"
                      code={`-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create news images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'news_images', true)
ON CONFLICT (id) DO NOTHING;`}
                    />
                    
                    <h4 className="font-medium mt-6">2.4 Create Row Level Security (RLS) Policies</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Enable RLS and create policies"
                      code={`-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create policies for clients (viewable by all authenticated users)
CREATE POLICY "All users can view clients"
ON public.clients
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can update clients"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete clients"
ON public.clients
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for products
CREATE POLICY "All users can view products"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update products"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete products"
ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for time_entries
CREATE POLICY "Users can view all time entries"
ON public.time_entries
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own time entries"
ON public.time_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
ON public.time_entries
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can delete their own time entries"
ON public.time_entries
FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for invoices
CREATE POLICY "All users can view invoices"
ON public.invoices
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can insert invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update invoices"
ON public.invoices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete invoices"
ON public.invoices
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for invoice_items
CREATE POLICY "All users can view invoice items"
ON public.invoice_items
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage invoice items"
ON public.invoice_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for user_timers
CREATE POLICY "Users can view all timers"
ON public.user_timers
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own timers"
ON public.user_timers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers"
ON public.user_timers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers"
ON public.user_timers
FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for system_settings
CREATE POLICY "All users can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage system settings"
ON public.system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policies for news_posts
CREATE POLICY "All users can view news posts"
ON public.news_posts
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage news posts"
ON public.news_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policies for token_refresh_logs
CREATE POLICY "Only admins can view token refresh logs"
ON public.token_refresh_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert token refresh logs"
ON public.token_refresh_logs
FOR INSERT
WITH CHECK (true);`}
                    />
                    
                    <h4 className="font-medium mt-6">2.5 Create Helper Functions</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Create helper functions"
                      code={`-- Function to get a username
CREATE OR REPLACE FUNCTION public.get_username(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

-- Function to check if a user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Function to get a user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Function to update a user's role (admin only)
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
                    
                    <h4 className="font-medium mt-6">2.6 Storage Bucket Policies</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Create storage bucket policies"
                      code={`-- Create policy for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for application logo bucket
CREATE POLICY "Application logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'application-logo');

CREATE POLICY "Only admins and managers can upload application logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Only admins and managers can update application logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Only admins and managers can delete application logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'application-logo' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create policy for news images bucket
CREATE POLICY "News images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'news_images');

CREATE POLICY "Only admins and managers can upload news images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Only admins and managers can update news images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Only admins and managers can delete news images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'news_images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);`}
                    />
                    
                    <h4 className="font-medium mt-6">2.7 Cron Job for Fortnox Token Refresh</h4>
                    
                    <CodeBlock 
                      language="sql"
                      title="Create cron job for token refresh"
                      code={`-- Enable the pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set up a cron job to refresh Fortnox tokens every 12 hours
SELECT cron.schedule(
  'refresh-fortnox-tokens',              -- unique job name
  '0 */12 * * *',                        -- every 12 hours (cron syntax)
  $$
    SELECT net.http_post(
      url:='https://' || (SELECT settings->'projectRef' FROM system_settings WHERE id = 'app_settings')::text || '.supabase.co/functions/v1/fortnox-token-refresh',
      headers:='{
        "Content-Type": "application/json",
        "Authorization": "Bearer ' || (SELECT settings->>'anonKey' FROM system_settings WHERE id = 'app_settings') || '"
      }'::jsonb,
      body:='{
        "automated": true,
        "session_id": "cron-job-' || gen_random_uuid()::text || '"
      }'::jsonb
    ) AS request_id;
  $$
);`}
                    />
                    
                    <Alert className="mt-6">
                      <AlertTitle>Success!</AlertTitle>
                      <AlertDescription>
                        After running all SQL commands, your database schema is fully configured. The schema includes tables, 
                        triggers, functions, RLS policies, and storage bucket configurations needed for the application.
                      </AlertDescription>
                    </Alert>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger onClick={() => handleToggleItem('item-3')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Step 3: Configure Authentication Settings</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      Configure the authentication settings in your Supabase project to enable user sign-up and login.
                    </p>
                    
                    <ol className="list-decimal ml-5 space-y-3">
                      <li>
                        <strong>Email Provider Setup</strong>
                        <ol className="list-disc ml-5 mt-1">
                          <li>Go to Authentication &gt; Providers &gt; Email in your Supabase dashboard</li>
                          <li>Enable "Email provider" if not already enabled</li>
                          <li>Configure whether you want to require email confirmation (recommended to temporarily disable for testing)</li>
                          <li>Save changes</li>
                        </ol>
                      </li>
                      
                      <li>
                        <strong>Configure Email Templates</strong> (Optional)
                        <ol className="list-disc ml-5 mt-1">
                          <li>Go to Authentication &gt; Email Templates</li>
                          <li>Customize the email templates for:
                            <ul className="list-disc ml-5">
                              <li>Confirmation</li>
                              <li>Invitation</li>
                              <li>Magic Link</li>
                              <li>Reset Password</li>
                            </ul>
                          </li>
                          <li>Make sure to update the company name, logo, and links in the templates</li>
                        </ol>
                      </li>
                      
                      <li>
                        <strong>Set Up URL Configuration</strong> (Critical)
                        <ol className="list-disc ml-5 mt-1">
                          <li>Go to Authentication &gt; URL Configuration</li>
                          <li>Set the Site URL to your production domain (e.g., <code>https://timetracking.yourdomain.com</code>)</li>
                          <li>Add Redirect URLs for:
                            <ul className="list-disc ml-5">
                              <li>Your production domain: <code>https://timetracking.yourdomain.com</code></li>
                              <li>Local development URL: <code>http://localhost:5173</code> (for testing)</li>
                              <li>Any other environments where the app will be deployed</li>
                            </ul>
                          </li>
                        </ol>
                      </li>
                    </ol>
                    
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Critical Setting!</AlertTitle>
                      <AlertDescription>
                        The URL Configuration settings are crucial for authentication to work correctly. If these are not 
                        set properly, users will be unable to log in or receive authentication emails.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md mt-4">
                      <p className="font-medium">Testing Authentication</p>
                      <p className="text-sm mt-1">
                        For testing purposes, you may want to:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Temporarily disable email confirmations</li>
                        <li>Create a test user through the Supabase dashboard (Authentication &gt; Users &gt; "Add User")</li>
                        <li>Test the login flow with the created user</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger onClick={() => handleToggleItem('item-4')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span>Step 4: Deploy and Configure Edge Functions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      Edge Functions are a critical component of this application, especially for integrating with 
                      external services like Fortnox. Here's how to deploy and configure them.
                    </p>

                    <Alert>
                      <AlertTitle>Deployment Options</AlertTitle>
                      <AlertDescription>
                        There are two main ways to deploy edge functions: using the Supabase CLI locally or setting up GitHub Actions for automatic deployments.
                      </AlertDescription>
                    </Alert>
                    
                    <h4 className="font-medium mt-4">4.1 Option 1: Deploy Using Supabase CLI (For Development)</h4>
                    
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Install the Supabase CLI: <code>npm install -g supabase</code></li>
                      <li>Login to Supabase: <code>supabase login</code></li>
                      <li>Link your project: <code>supabase link --project-ref YOUR_PROJECT_REF</code></li>
                      <li>Deploy the functions: <code>supabase functions deploy --project-ref YOUR_PROJECT_REF</code></li>
                    </ol>
                    
                    <h4 className="font-medium mt-4">4.2 Option 2: Set Up GitHub Actions (For Production)</h4>
                    
                    <p>Create a GitHub workflow file in your repository at <code>.github/workflows/deploy-functions.yml</code>:</p>
                    
                    <CodeBlock 
                      language="yaml" 
                      title="GitHub Action for Edge Functions Deployment"
                      code={`name: Deploy Supabase Edge Functions

on:
  push:
    branches:
      - main
    paths:
      - 'supabase/functions/**'
      - '.github/workflows/deploy-functions.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      SUPABASE_ACCESS_TOKEN: \${{ secrets.SUPABASE_ACCESS_TOKEN }}
      PROJECT_ID: your-project-ref-here

    steps:
      - uses: actions/checkout@v3

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - run: supabase functions deploy --project-ref \${{ env.PROJECT_ID }}
`}
                    />
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                      <p className="font-medium">Important Note for GitHub Actions</p>
                      <p className="text-sm mt-1">
                        You'll need to add your Supabase access token as a GitHub secret. Get your token from your Supabase dashboard under Account &gt; Access Tokens.
                      </p>
                    </div>
                    
                    <h4 className="font-medium mt-6">4.3 Required Edge Functions</h4>
                    
                    <p>The application needs these edge functions to be deployed:</p>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <strong>fortnox-proxy</strong> - Proxies requests to Fortnox API
                      </li>
                      <li>
                        <strong>fortnox-token-exchange</strong> - Handles OAuth token exchange
                      </li>
                      <li>
                        <strong>fortnox-token-refresh</strong> - Refreshes Fortnox tokens
                      </li>
                      <li>
                        <strong>fortnox-scheduled-refresh</strong> - Triggered by cron job
                      </li>
                      <li>
                        <strong>get-all-users</strong> - Admin function to get all users
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-6">4.4 Configure Function Secrets</h4>
                    
                    <p>For the edge functions to work properly, you need to set up these secrets:</p>
                    
                    <CodeBlock 
                      language="bash"
                      title="Set required secrets"
                      code={`# Using CLI:
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_DB_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
supabase secrets set FORTNOX_REFRESH_SECRET=a-strong-secret-key
supabase secrets set JWT_SECRET=another-strong-secret-key

# Or using Supabase Dashboard:
# Go to Settings > API > Edge Functions and add the secrets there
`}
                    />
                    
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Security Warning!</AlertTitle>
                      <AlertDescription>
                        The service role key grants admin access to your project. Never expose it in client-side code 
                        or public repositories. Only use it in secure server environments.
                      </AlertDescription>
                    </Alert>
                    
                    <h4 className="font-medium mt-6">4.5 Edge Function Source Code</h4>
                    
                    <p>Below are the complete implementations of each required edge function:</p>
                    
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="fortnox-proxy">
                        <AccordionTrigger className="text-sm font-medium">
                          fortnox-proxy/index.ts
                        </AccordionTrigger>
                        <AccordionContent>
                          <CodeBlock
                            language="typescript"
                            code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Fortnox access token from request header
    const accessToken = req.headers.get('x-fortnox-token');

    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing Fortnox access token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract the relative path from the request URL
    const url = new URL(req.url);
    const relativePath = url.searchParams.get('path');
    
    if (!relativePath) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing path parameter' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Forward request to Fortnox API
    const fortnoxApiUrl = \`https://api.fortnox.se/3/\${relativePath}\`;
    
    // Get and set request body
    let body = null;
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      body = await req.text();
    }

    // Create request options for fetch
    const options: RequestInit = {
      method: req.method,
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Add body for non-GET/DELETE requests
    if (body) {
      options.body = body;
    }

    // Fetch from Fortnox API
    const response = await fetch(fortnoxApiUrl, options);
    
    // Get response data
    const responseData = await response.text();
    
    // Forward response to client
    return new Response(
      responseData,
      { 
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in Fortnox proxy:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});`}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="fortnox-token-exchange">
                        <AccordionTrigger className="text-sm font-medium">
                          fortnox-token-exchange/index.ts
                        </AccordionTrigger>
                        <AccordionContent>
                          <CodeBlock
                            language="typescript"
                            code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = await req.json();
    
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': clientId,
        'client_secret': clientSecret,
        'redirect_uri': redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Fortnox token exchange error:', tokenData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to exchange authorization code for token',
          details: tokenData
        }),
        { 
          status: tokenResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store token in Supabase
    const { error: storeError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_token',
        settings: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          created_at: new Date().toISOString(),
          client_id: clientId,
        }
      });
    
    if (storeError) {
      console.error('Error storing Fortnox token:', storeError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store token', 
          details: storeError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Fortnox authorization successful',
        scope: tokenData.scope 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in Fortnox token exchange:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});`}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="fortnox-token-refresh">
                        <AccordionTrigger className="text-sm font-medium">
                          fortnox-token-refresh/index.ts
                        </AccordionTrigger>
                        <AccordionContent>
                          <CodeBlock
                            language="typescript"
                            code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request parameters
    const { automated = false, session_id = null } = await req.json().catch(() => ({}));

    // Fetch the current token from system_settings
    const { data: tokenSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_token')
      .single();
    
    if (fetchError) {
      await logRefreshAttempt(session_id, false, 'Failed to fetch token from database: ' + fetchError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch token', 
          details: fetchError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!tokenSettings || !tokenSettings.settings) {
      await logRefreshAttempt(session_id, false, 'No token found in database');
      return new Response(
        JSON.stringify({ 
          error: 'No token found', 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const tokenData = tokenSettings.settings;
    
    // Fetch client settings
    const { data: fortnoxSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_settings')
      .single();
    
    if (settingsError) {
      await logRefreshAttempt(session_id, false, 'Failed to fetch Fortnox settings: ' + settingsError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Fortnox settings', 
          details: settingsError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const clientId = fortnoxSettings.settings.clientId;
    const clientSecret = fortnoxSettings.settings.clientSecret;
    
    if (!clientId || !clientSecret) {
      await logRefreshAttempt(session_id, false, 'Missing client credentials in Fortnox settings');
      return new Response(
        JSON.stringify({ 
          error: 'Missing client credentials in Fortnox settings'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Refresh the token
    const refreshResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': tokenData.refresh_token,
        'client_id': clientId,
        'client_secret': clientSecret,
      }),
    });

    const refreshData = await refreshResponse.json();
    
    if (!refreshResponse.ok) {
      await logRefreshAttempt(
        session_id, 
        false, 
        \`Failed to refresh token. Status: \${refreshResponse.status}. Error: \${JSON.stringify(refreshData)}\`
      );
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to refresh token',
          details: refreshData
        }),
        { 
          status: refreshResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update token in database
    const updatedTokenData = {
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expires_in: refreshData.expires_in,
      scope: refreshData.scope || tokenData.scope,
      created_at: new Date().toISOString(),
      client_id: clientId,
      last_refresh: new Date().toISOString(),
    };
    
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_token',
        settings: updatedTokenData
      });
    
    if (updateError) {
      await logRefreshAttempt(session_id, false, 'Failed to update token in database: ' + updateError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update token', 
          details: updateError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Log successful refresh
    await logRefreshAttempt(
      session_id, 
      true, 
      'Token refreshed successfully',
      refreshData.access_token.length
    );

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Token refreshed successfully',
        automated,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in Fortnox token refresh:', error);
    
    await logRefreshAttempt(null, false, 'Internal server error: ' + error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function logRefreshAttempt(
  session_id: string | null, 
  success: boolean, 
  message: string,
  token_length?: number
) {
  try {
    await supabase
      .from('token_refresh_logs')
      .insert({
        session_id: session_id || \`manual-\${new Date().toISOString()}\`,
        success,
        message,
        token_length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log token refresh attempt:', error);
  }
}`}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="fortnox-scheduled-refresh">
                        <AccordionTrigger className="text-sm font-medium">
                          fortnox-scheduled-refresh/index.ts
                        </AccordionTrigger>
                        <AccordionContent>
                          <CodeBlock
                            language="typescript"
                            code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sessionId = \`scheduled-\${new Date().toISOString()}\`;
    
    // Call the token refresh edge function
    const refreshResponse = await fetch(
      \`\${Deno.env.get('SUPABASE_URL')}/functions/v1/fortnox-token-refresh\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${Deno.env.get('SUPABASE_ANON_KEY')}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automated: true,
          session_id: sessionId
        }),
      }
    );

    const result = await refreshResponse.json();
    
    return new Response(
      JSON.stringify({ 
        success: refreshResponse.ok,
        details: result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: refreshResponse.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in scheduled refresh:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});`}
                          />
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="get-all-users">
                        <AccordionTrigger className="text-sm font-medium">
                          get-all-users/index.ts
                        </AccordionTrigger>
                        <AccordionContent>
                          <CodeBlock
                            language="typescript"
                            code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase client with the service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify the user has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the user's role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all users with pagination
    const { page = '1', per_page = '50' } = Object.fromEntries(new URL(req.url).searchParams);
    const pageNumber = parseInt(page as string, 10);
    const perPage = parseInt(per_page as string, 10);
    const start = (pageNumber - 1) * perPage;
    
    const { data: authUsers, error: usersError, count } = await supabase.auth.admin.listUsers({
      page: pageNumber,
      perPage: perPage,
    });
    
    if (usersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user profiles
    const userIds = authUsers.users.map(u => u.id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (profilesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles', details: profilesError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Combine auth data with profile data
    const users = authUsers.users.map(user => {
      const profile = profiles.find(p => p.id === user.id) || {};
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        confirmed_at: user.confirmed_at,
        ...profile
      };
    });
    
    return new Response(
      JSON.stringify({
        users,
        pagination: {
          page: pageNumber,
          per_page: perPage,
          total: count,
          total_pages: Math.ceil(count / perPage)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-all-users function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger onClick={() => handleToggleItem('item-5')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Step 5: Configure Secretes and Environment Variables</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      This application requires certain secrets and environment variables to be configured in the Supabase project.
                    </p>
                    
                    <h4 className="font-medium">Required Secrets</h4>
                    
                    <p>Set the following secrets in your Supabase project under Settings &gt; API &gt; Edge Functions:</p>
                    
                    <table className="min-w-full border-collapse mt-2">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800">
                          <th className="border border-slate-300 dark:border-slate-700 px-4 py-2 text-left">Secret Name</th>
                          <th className="border border-slate-300 dark:border-slate-700 px-4 py-2 text-left">Description</th>
                          <th className="border border-slate-300 dark:border-slate-700 px-4 py-2 text-left">Example</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">SUPABASE_URL</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">Your Supabase project URL</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">https://your-project-ref.supabase.co</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">SUPABASE_ANON_KEY</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">Your Supabase anon/public key</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">eyJhbGci...z3dw</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">Your Supabase service role key</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">eyJhbGci...x4dw</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">SUPABASE_DB_URL</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">Your Supabase database connection string</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">FORTNOX_REFRESH_SECRET</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">Secret for Fortnox token refresh</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">your-secure-random-secret</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">JWT_SECRET</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2">JWT secret for token creation</td>
                          <td className="border border-slate-300 dark:border-slate-700 px-4 py-2 font-mono text-xs">another-secure-random-secret</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div className="flex items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-md mt-4">
                      <div className="flex-shrink-0 text-amber-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          You can set these secrets using the Supabase dashboard or the CLI command:
                          <br />
                          <code className="text-xs bg-slate-200 dark:bg-slate-700 p-1 mt-1 block rounded">
                            supabase secrets set NAME=VALUE --project-ref your-project-ref
                          </code>
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger onClick={() => handleToggleItem('item-6')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Step 6: Deploy the Frontend Application</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      The final step is to deploy the frontend application. This involves building the application 
                      and deploying it to a hosting service.
                    </p>
                    
                    <h4 className="font-medium">Hosting Options</h4>
                    
                    <p>There are several hosting options available:</p>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <strong>Vercel</strong> - Great for React applications, with automatic deployments from GitHub
                      </li>
                      <li>
                        <strong>Netlify</strong> - Similar to Vercel, with continuous deployment from Git
                      </li>
                      <li>
                        <strong>AWS Amplify</strong> - Convenient if you're already using AWS services
                      </li>
                      <li>
                        <strong>GitHub Pages</strong> - Free hosting directly from your GitHub repository
                      </li>
                      <li>
                        <strong>Cloudflare Pages</strong> - Fast global CDN with free hosting
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-6">Build and Deploy Process</h4>
                    
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>
                        <strong>Configure Environment</strong>
                        <p className="mt-1">
                          Create environment files that point to your Supabase instance. In most hosting platforms,
                          you'll need to set these in their environment settings instead of in the code.
                        </p>
                        
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md mt-2">
                          <p className="font-mono text-sm">Example Vercel Environment Variables:</p>
                          <pre className="text-xs mt-1">
{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
                          </pre>
                        </div>
                      </li>
                      
                      <li>
                        <strong>Build the Application</strong>
                        <p className="mt-1">Run the build command locally or let your CI/CD pipeline handle it:</p>
                        <pre className="text-xs mt-1 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          npm run build
                        </pre>
                      </li>
                      
                      <li>
                        <strong>Deploy to Hosting Provider</strong>
                        <p className="mt-1">Follow the specific instructions for your chosen hosting provider.</p>
                        
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md mt-2">
                          <p className="font-medium">Example: Deploying to Vercel</p>
                          <ol className="list-disc ml-5 mt-1 space-y-1">
                            <li>Push your code to a GitHub repository</li>
                            <li>Create a new project in Vercel</li>
                            <li>Connect to your GitHub repository</li>
                            <li>Set the environment variables</li>
                            <li>Deploy</li>
                          </ol>
                        </div>
                      </li>
                    </ol>
                    
                    <h4 className="font-medium mt-6">Configure Domain and SSL</h4>
                    
                    <p>After deployment, you may want to configure a custom domain:</p>
                    
                    <ol className="list-decimal ml-5 space-y-2">
                      <li>Purchase a domain from a domain registrar (e.g., Namecheap, GoDaddy, Google Domains)</li>
                      <li>Configure DNS settings to point to your hosting provider</li>
                      <li>Set up SSL certificates (most hosting providers handle this automatically)</li>
                      <li>Update your Supabase authentication settings to include your new domain in the allowed redirect URLs</li>
                    </ol>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md mt-4">
                      <p className="font-medium">Final Checklist</p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Database is fully set up with all tables and RLS policies</li>
                        <li>Edge functions are deployed and have all required secrets configured</li>
                        <li>Authentication settings are properly configured with correct redirect URLs</li>
                        <li>Frontend application is built and deployed to a hosting provider</li>
                        <li>Domain and SSL are properly configured</li>
                        <li>First admin user is created for initial access</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger onClick={() => handleToggleItem('item-7')} className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>Additional Resources</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm">
                  <div className="space-y-4">
                    <p>
                      Here are some helpful resources for working with the technologies used in this application:
                    </p>
                    
                    <h4 className="font-medium">Supabase Documentation</h4>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Supabase Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Supabase Auth Guide</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://supabase.com/docs/guides/database" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Supabase Database Guide</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://supabase.com/docs/guides/storage" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Supabase Storage Guide</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://supabase.com/docs/guides/functions" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Supabase Edge Functions Guide</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-6">Fortnox Resources</h4>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <a href="https://developer.fortnox.se/documentation/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Fortnox API Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://developer.fortnox.se/documentation/general/authentication/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Fortnox Authentication Guide</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-6">React and UI Libraries</h4>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <a href="https://react.dev/learn" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>React Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://tailwindcss.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Tailwind CSS Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://ui.shadcn.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Shadcn UI Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-6">Deployment Resources</h4>
                    
                    <ul className="list-disc ml-5 space-y-2">
                      <li>
                        <a href="https://vercel.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Vercel Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>
                        <a href="https://docs.netlify.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 flex items-center">
                          <span>Netlify Documentation</span>
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
