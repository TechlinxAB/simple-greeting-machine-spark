
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clipboard, Code, Database, Download, ExternalLink, Play, Server } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export function InstanceSetupTab() {
  const { toast } = useToast();
  
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: description,
        });
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy to clipboard",
        });
      });
  };

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <span>Instance Setup Guide</span>
          </CardTitle>
          <CardDescription>
            Complete guide to set up your own instance of this application with Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none dark:prose-invert">
            <p>
              This guide will walk you through setting up your own instance of this time tracking and invoicing application
              using Supabase as the backend. Follow each step carefully to ensure a complete setup.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {/* Step 1: Create Supabase Project */}
            <AccordionItem value="step1">
              <AccordionTrigger className="text-lg font-medium">
                Step 1: Create Supabase Project
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <ol className="space-y-4 list-decimal pl-5">
                  <li>
                    <div className="space-y-2">
                      <p>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">Supabase.com <ExternalLink className="h-3 w-3" /></a> and sign up or log in</p>
                    </div>
                  </li>
                  <li>
                    <div className="space-y-2">
                      <p>Create a new project and note down the following information:</p>
                      <div className="grid gap-3 max-w-md">
                        <div className="space-y-1">
                          <Label htmlFor="project-url">Project URL</Label>
                          <div className="flex gap-2">
                            <Input id="project-url" placeholder="https://your-project-id.supabase.co" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(
                              (document.getElementById('project-url') as HTMLInputElement)?.value || '',
                              "Project URL copied to clipboard"
                            )}>
                              <Clipboard className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="anon-key">Anon/Public Key</Label>
                          <div className="flex gap-2">
                            <Input id="anon-key" type="password" placeholder="your-anon-key" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(
                              (document.getElementById('anon-key') as HTMLInputElement)?.value || '',
                              "Anon key copied to clipboard"
                            )}>
                              <Clipboard className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="service-key">Service Role Key (for Edge Functions)</Label>
                          <div className="flex gap-2">
                            <Input id="service-key" type="password" placeholder="your-service-role-key" />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(
                              (document.getElementById('service-key') as HTMLInputElement)?.value || '',
                              "Service role key copied to clipboard"
                            )}>
                              <Clipboard className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Database Setup */}
            <AccordionItem value="step2">
              <AccordionTrigger className="text-lg font-medium">
                Step 2: Database Setup
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Run these SQL scripts in the Supabase SQL Editor to set up all required tables and functions.</p>
                
                <div className="space-y-4">
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.profilesTable, "Profiles table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Profiles Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.profilesTable}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.clientsTable, "Clients table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Clients Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.clientsTable}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.productsTable, "Products table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Products Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.productsTable}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.timeEntriesTable, "Time entries table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Time Entries Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.timeEntriesTable}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.invoicesTable, "Invoices table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Invoices Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.invoicesTable}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.userFunctions, "User functions SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create User Functions</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.userFunctions}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.fortnoxSettings, "Fortnox settings SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Fortnox Settings</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.fortnoxSettings}</pre>
                  </div>

                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.storageBuckets, "Storage buckets SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Storage Buckets</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.storageBuckets}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.newsPostsTable, "News posts table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create News Posts Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.newsPostsTable}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.systemSettings, "System settings SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create System Settings</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.systemSettings}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.fortnoxTokens, "Fortnox tokens SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Fortnox Tokens Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.fortnoxTokens}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.refreshLogTable, "Refresh log table SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Token Refresh Log Table</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.refreshLogTable}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.scheduledJobs, "Scheduled jobs SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Create Scheduled Jobs</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.scheduledJobs}</pre>
                  </div>
                  
                  <div className="rounded-md bg-muted p-4 relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(sqlScripts.rls, "RLS policies SQL copied to clipboard")}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold mb-2">Set Up Row Level Security (RLS) Policies</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded">{sqlScripts.rls}</pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Edge Functions Setup */}
            <AccordionItem value="step3">
              <AccordionTrigger className="text-lg font-medium">
                Step 3: Edge Functions Setup
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Create the following Edge Functions in your Supabase dashboard under Edge Functions:</p>

                <div className="space-y-6">
                  {edgeFunctions.map((func, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Code className="h-5 w-5" />
                          <h3 className="font-medium">{func.name}</h3>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => copyToClipboard(func.code, `${func.name} function code copied to clipboard`)}
                        >
                          <Clipboard className="h-4 w-4 mr-2" />
                          Copy Code
                        </Button>
                      </div>
                      <div className="p-4 bg-background">
                        <p className="text-sm text-muted-foreground mb-2">{func.description}</p>
                        <div className="rounded-md bg-muted p-1">
                          <pre className="text-xs overflow-auto p-3">{func.code}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-primary/10 rounded-lg p-4 mt-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Required Supabase Secrets
                  </h3>
                  <p className="text-sm mb-3">
                    Set the following secrets in your Supabase dashboard under Settings {'>'} API {'>'} Project Secrets:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li><strong>SUPABASE_URL</strong>: Your Supabase project URL</li>
                    <li><strong>SUPABASE_ANON_KEY</strong>: Your Supabase anon/public key</li>
                    <li><strong>SUPABASE_SERVICE_ROLE_KEY</strong>: Your Supabase service role key</li>
                    <li><strong>SUPABASE_DB_URL</strong>: Your database connection string (find in Project Settings {'>'} Database)</li>
                    <li><strong>FORTNOX_REFRESH_SECRET</strong>: A secret key used for Fortnox token refresh (generate a random string)</li>
                    <li><strong>JWT_SECRET</strong>: A secret key for JWT operations (generate a random string)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Front-end Configuration */}
            <AccordionItem value="step4">
              <AccordionTrigger className="text-lg font-medium">
                Step 4: Front-end Configuration
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Configure your front-end application to connect to your Supabase instance:</p>

                <div className="rounded-md bg-muted p-4 relative">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(frontendEnvConfig, "Environment config copied to clipboard")}
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                  <p className="text-sm font-semibold mb-2">Create a .env file in your project root with:</p>
                  <pre className="text-xs overflow-auto p-2 bg-background rounded">{frontendEnvConfig}</pre>
                </div>

                <p className="text-sm mt-4">After setting up your environment variables, rebuild your application:</p>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <code className="text-sm">npm run build</code>
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <code className="text-sm">npm run start</code>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Step 5: Verification */}
            <AccordionItem value="step5">
              <AccordionTrigger className="text-lg font-medium">
                Step 5: Verification & Troubleshooting
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>After completing all setup steps, verify your installation:</p>
                
                <div className="space-y-3">
                  <h3 className="font-medium">Checklist:</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Register a new account - first user automatically becomes an admin</li>
                    <li>Check database tables to ensure they're properly created</li>
                    <li>Test time entry recording</li>
                    <li>Test client creation and management</li>
                    <li>Verify Fortnox integration (if configured)</li>
                    <li>Test invoicing functionality</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-md p-4 mt-2">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Troubleshooting Common Issues</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-yellow-700 dark:text-yellow-300/80">
                    <li>
                      <strong>Database schema errors:</strong> Double-check all SQL scripts were run successfully
                    </li>
                    <li>
                      <strong>Edge Function errors:</strong> Ensure all secrets are properly set and the functions are deployed
                    </li>
                    <li>
                      <strong>Authentication issues:</strong> Verify environment variables are correctly set
                    </li>
                    <li>
                      <strong>RLS policy issues:</strong> Check that all policies were applied correctly
                    </li>
                    <li>
                      <strong>Storage access errors:</strong> Verify storage bucket policies are correctly set
                    </li>
                  </ul>
                </div>
                
                <div className="mt-4">
                  <Button variant="default" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Download Complete Setup Guide (PDF)</span>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <Separator className="my-6" />
          
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium mb-1">Need more help?</h3>
              <p className="text-sm text-muted-foreground">
                Reach out to our support team or check the documentation for detailed guidance.
              </p>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>Documentation</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

// SQL Scripts Collection
const sqlScripts = {
  profilesTable: `-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Set up a trigger to handle new user creation
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

  -- Create profile entry
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`,

  clientsTable: `-- Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_number TEXT,
  organization_number TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Sweden',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view all clients"
  ON public.clients
  FOR SELECT
  USING (true);

CREATE POLICY "Admin and Manager can insert clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can update clients"
  ON public.clients
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can delete clients"
  ON public.clients
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));`,

  productsTable: `-- Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('activity', 'item')),
  price DECIMAL(10, 2) NOT NULL,
  account_number TEXT,
  vat_percentage DECIMAL(5, 2) DEFAULT 25.00,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Users can view active products"
  ON public.products
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admin and Manager can view all products"
  ON public.products
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can update products"
  ON public.products
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can delete products"
  ON public.products
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));`,

  timeEntriesTable: `-- Create Time Entries Table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('activity', 'item')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  quantity DECIMAL(10, 2),
  description TEXT,
  invoiced BOOLEAN DEFAULT false,
  invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for time entries
CREATE POLICY "Users can view their own time entries"
  ON public.time_entries
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin and Manager can view all time entries"
  ON public.time_entries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries
  FOR UPDATE
  USING (user_id = auth.uid() AND NOT invoiced);

CREATE POLICY "Admin and Manager can update any time entry"
  ON public.time_entries
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Users can delete their own time entries"
  ON public.time_entries
  FOR DELETE
  USING (user_id = auth.uid() AND NOT invoiced);

CREATE POLICY "Admin and Manager can delete any time entry"
  ON public.time_entries
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));`,

  invoicesTable: `-- Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  total_amount DECIMAL(10, 2),
  fortnox_id TEXT,
  fortnox_document_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  issued_date DATE,
  due_date DATE,
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Admin and Manager can view all invoices"
  ON public.invoices
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can insert invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can update invoices"
  ON public.invoices
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can delete invoices"
  ON public.invoices
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));`,

  userFunctions: `-- Create helper functions for user roles
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_username(user_id UUID)
RETURNS TEXT AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$ LANGUAGE sql STABLE;

-- Function to update user roles (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`,

  fortnoxSettings: `-- Create Fortnox Tokens Table
CREATE TABLE IF NOT EXISTS public.fortnox_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can view/update fortnox tokens
CREATE POLICY "Only admins can view fortnox tokens"
  ON public.fortnox_tokens
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can insert fortnox tokens"
  ON public.fortnox_tokens
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Only admins can update fortnox tokens"
  ON public.fortnox_tokens
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));`,

  storageBuckets: `-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('profile-images', 'profile-images', TRUE),
  ('app-assets', 'app-assets', TRUE),
  ('news-images', 'news-images', TRUE);

-- Create storage policies
CREATE POLICY "Public users can view profile images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload their own profile image" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'profile-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own profile image" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'profile-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own profile image" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'profile-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- App assets policies
CREATE POLICY "Public users can view app assets" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'app-assets');

CREATE POLICY "Admin and Manager can upload app assets" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'app-assets' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update app assets" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'app-assets' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete app assets" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'app-assets' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );

-- News images policies
CREATE POLICY "Public users can view news images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'news-images');

CREATE POLICY "Admin and Manager can upload news images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'news-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update news images" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'news-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete news images" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'news-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
    )
  );`,

  newsPostsTable: `-- Create News Posts Table
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN DEFAULT true,
  author_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_news_posts_updated_at();

-- Create RLS policies for news posts
CREATE POLICY "Everyone can view published news posts"
  ON public.news_posts
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admin and Manager can view all news posts"
  ON public.news_posts
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can insert news posts"
  ON public.news_posts
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can update news posts"
  ON public.news_posts
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can delete news posts"
  ON public.news_posts
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));`,

  systemSettings: `-- Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Create RLS policies for system settings
CREATE POLICY "Everyone can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admin and Manager can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

CREATE POLICY "Admin and Manager can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

-- Initialize default system settings
INSERT INTO public.system_settings (id, settings) VALUES 
  ('app_settings', '{"appName": "TimeTracker", "primaryColor": "#0f766e", "secondaryColor": "#ecfeff", "sidebarColor": "#083344", "accentColor": "#06b6d4"}')
ON CONFLICT (id) DO NOTHING;`,

  fortnoxTokens: `-- Create the fortnox_token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.fortnox_token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  message TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fortnox_token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view token refresh logs
CREATE POLICY "Only admins can view token refresh logs"
  ON public.fortnox_token_refresh_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));`,

  refreshLogTable: `-- Create the fortnox_token_refresh_logs table
CREATE TABLE IF NOT EXISTS public.fortnox_token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  message TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fortnox_token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view token refresh logs
CREATE POLICY "Only admins can view token refresh logs"
  ON public.fortnox_token_refresh_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));`,

  scheduledJobs: `-- Create scheduled job for Fortnox token refresh
SELECT cron.schedule(
  'fortnox-token-refresh',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url:='https://xojrleypudfrbmvejpow.supabase.co/functions/v1/fortnox-scheduled-refresh',
    headers:='{
      "Content-Type": "application/json",
      "Authorization": "Bearer " || current_setting('supabase_functions.secret.FORTNOX_REFRESH_SECRET')
    }'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);`,

  rls: `-- Enable RLS on all tables (if not already done)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fortnox_token_refresh_logs ENABLE ROW LEVEL SECURITY;`
};

// Edge Functions Collection
const edgeFunctions = [
  {
    name: "fortnox-token-exchange",
    description: "Handles the OAuth token exchange for Fortnox integration",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, clientId, clientSecret } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Fortnox API to exchange the authorization code for tokens
    const tokenResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Error from Fortnox:', tokenData);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange code for tokens', details: tokenData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store tokens in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate expiry time (tokenData.expires_in is in seconds)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    
    // Delete any existing tokens
    const { error: deleteError } = await supabase
      .from('fortnox_tokens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error deleting existing tokens:', deleteError);
    }
    
    // Insert new token
    const { error: insertError } = await supabase
      .from('fortnox_tokens')
      .insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error storing tokens:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Fortnox connected successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in token exchange:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  },
  {
    name: "fortnox-token-refresh",
    description: "Refreshes Fortnox access tokens before they expire",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get client credentials from system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_settings')
      .single();
    
    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Fortnox settings not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw settingsError;
    }
    
    const clientId = settingsData.settings.clientId;
    const clientSecret = settingsData.settings.clientSecret;
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Fortnox client credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refresh token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('fortnox_tokens')
      .select('*')
      .limit(1)
      .single();
    
    if (tokenError) {
      return new Response(
        JSON.stringify({ error: 'No Fortnox tokens found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the token
    const refreshResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error('Error refreshing token:', refreshData);
      
      // Log the refresh failure
      await supabase
        .from('fortnox_token_refresh_logs')
        .insert({
          status: 'error',
          message: 'Failed to refresh token',
          error: JSON.stringify(refreshData),
        });
        
      return new Response(
        JSON.stringify({ error: 'Failed to refresh tokens', details: refreshData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry time (refreshData.expires_in is in seconds)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + refreshData.expires_in);
    
    // Update token in database
    const { error: updateError } = await supabase
      .from('fortnox_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('Error updating tokens:', updateError);
      
      // Log the update failure
      await supabase
        .from('fortnox_token_refresh_logs')
        .insert({
          status: 'error',
          message: 'Failed to update token in database',
          error: JSON.stringify(updateError),
        });
        
      return new Response(
        JSON.stringify({ error: 'Failed to store refreshed tokens', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log successful refresh
    await supabase
      .from('fortnox_token_refresh_logs')
      .insert({
        status: 'success',
        message: 'Token refreshed successfully',
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Token refreshed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in token refresh:', error);
    
    // Log the exception
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase
      .from('fortnox_token_refresh_logs')
      .insert({
        status: 'error',
        message: 'Exception in token refresh',
        error: error.message,
      });
      
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  },
  {
    name: "fortnox-scheduled-refresh",
    description: "Called by a cron job to automatically refresh Fortnox tokens",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET') || '';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify secret for scheduled job
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (token !== refreshSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get client credentials from system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_settings')
      .single();
    
    if (settingsError) {
      if (settingsError.code === 'PGRST116') {
        await logRefresh(supabase, 'error', 'Fortnox settings not found');
        return new Response(
          JSON.stringify({ error: 'Fortnox settings not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw settingsError;
    }
    
    const settings = settingsData.settings;
    
    if (!settings.enabled) {
      await logRefresh(supabase, 'info', 'Fortnox integration is disabled');
      return new Response(
        JSON.stringify({ message: 'Fortnox integration is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const clientId = settings.clientId;
    const clientSecret = settings.clientSecret;
    
    if (!clientId || !clientSecret) {
      await logRefresh(supabase, 'error', 'Fortnox client credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Fortnox client credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refresh token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('fortnox_tokens')
      .select('*')
      .limit(1)
      .single();
    
    if (tokenError) {
      await logRefresh(supabase, 'error', 'No Fortnox tokens found');
      return new Response(
        JSON.stringify({ error: 'No Fortnox tokens found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if token needs refresh (within 1 hour of expiration)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    if (expiresAt > oneHourFromNow) {
      await logRefresh(supabase, 'info', \`Token still valid until \${expiresAt.toISOString()}\`);
      return new Response(
        JSON.stringify({ message: 'Token still valid, no refresh needed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh the token
    const refreshResponse = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      await logRefresh(supabase, 'error', 'Failed to refresh token', JSON.stringify(refreshData));
      return new Response(
        JSON.stringify({ error: 'Failed to refresh tokens', details: refreshData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry time (refreshData.expires_in is in seconds)
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);
    
    // Update token in database
    const { error: updateError } = await supabase
      .from('fortnox_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    if (updateError) {
      await logRefresh(supabase, 'error', 'Failed to update token in database', JSON.stringify(updateError));
      return new Response(
        JSON.stringify({ error: 'Failed to store refreshed tokens', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    await logRefresh(supabase, 'success', 'Token refreshed successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Token refreshed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scheduled token refresh:', error);
    
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logRefresh(supabase, 'error', 'Exception in token refresh', error.message);
    } catch (logError) {
      console.error('Error logging refresh failure:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logRefresh(supabase, status, message, error = null) {
  try {
    await supabase
      .from('fortnox_token_refresh_logs')
      .insert({
        status,
        message,
        error,
      });
  } catch (logError) {
    console.error('Error logging refresh:', logError);
  }
}`
  },
  {
    name: "fortnox-proxy",
    description: "Proxies requests to Fortnox API with automatic token handling",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user is an admin or manager
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check user role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!['admin', 'manager'].includes(profileData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Fortnox token
    const { data: tokenData, error: tokenError } = await supabase
      .from('fortnox_tokens')
      .select('*')
      .limit(1)
      .single();
    
    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Fortnox integration not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      return new Response(
        JSON.stringify({ error: 'Fortnox token expired. Please refresh the token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get request data
    const requestData = await req.json();
    const { endpoint, method = 'GET', body = null, params = {} } = requestData;
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build request URL with query parameters
    let url = \`https://api.fortnox.se/3/\${endpoint}\`;
    if (Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.append(key, value);
      }
      url += \`?\${queryParams.toString()}\`;
    }
    
    // Make request to Fortnox API
    const fortnoxResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': \`Bearer \${tokenData.access_token}\`,
      },
      body: body ? JSON.stringify(body) : null,
    });
    
    // Get response data
    let responseData;
    const contentType = fortnoxResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await fortnoxResponse.json();
    } else {
      responseData = await fortnoxResponse.text();
    }
    
    // Return response
    return new Response(
      JSON.stringify({ 
        status: fortnoxResponse.status,
        statusText: fortnoxResponse.statusText,
        data: responseData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in Fortnox proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  },
  {
    name: "fortnox-token-migrate",
    description: "Migrates Fortnox token to the new system",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const jwtSecret = Deno.env.get('JWT_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user is an admin
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check user role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (profileData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can migrate tokens' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      // Create decoder for JWT
      const decoder = new TextDecoder();
      
      // Split the JWT parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      // Decode the payload
      const payload = JSON.parse(
        decoder.decode(
          Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))
        )
      );
      
      // Extract token data
      const { access_token, refresh_token, scope } = payload;
      
      if (!access_token || !refresh_token) {
        throw new Error('Missing token data in JWT');
      }
      
      // Calculate expiry time (1 hour from now as a fallback)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Delete any existing tokens
      const { error: deleteError } = await supabase
        .from('fortnox_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error deleting existing tokens:', deleteError);
      }
      
      // Insert new token
      const { error: insertError } = await supabase
        .from('fortnox_tokens')
        .insert({
          access_token,
          refresh_token,
          scope,
          expires_at: expiresAt.toISOString(),
        });
  
      if (insertError) {
        console.error('Error storing tokens:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store tokens', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
  
      return new Response(
        JSON.stringify({ success: true, message: 'Token migrated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing token:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid token format', details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in token migration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  },
  {
    name: "fortnox-token-debug",
    description: "Provides debugging information for Fortnox token status",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user is an admin
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check user role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (profileData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can access token debug info' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Fortnox settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_settings')
      .single();
    
    const settings = settingsError ? null : settingsData?.settings;
    
    // Get Fortnox token
    const { data: tokenData, error: tokenError } = await supabase
      .from('fortnox_tokens')
      .select('*')
      .limit(1)
      .single();
    
    // Get refresh logs
    const { data: logsData, error: logsError } = await supabase
      .from('fortnox_token_refresh_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Check scheduled job
    const { data: jobData, error: jobError } = await supabase
      .from('_rexternal_cron.job')
      .select('name, last_executed, next_execution, error')
      .eq('name', 'fortnox-token-refresh')
      .limit(1)
      .single();
    
    let tokenStatus = 'unknown';
    let tokenExpiresIn = null;
    
    if (tokenData) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      if (expiresAt <= now) {
        tokenStatus = 'expired';
      } else {
        tokenStatus = 'valid';
        tokenExpiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      }
    }
    
    // Safe versions of data without sensitive information
    const safeSettings = settings ? {
      clientId: settings.clientId ? '✓ Set' : '✗ Not set',
      clientSecret: settings.clientSecret ? '✓ Set' : '✗ Not set',
      enabled: settings.enabled,
    } : null;
    
    const safeToken = tokenData ? {
      id: tokenData.id,
      access_token: '✓ ' + tokenData.access_token.substring(0, 5) + '...',
      refresh_token: '✓ ' + tokenData.refresh_token.substring(0, 5) + '...',
      scope: tokenData.scope,
      expires_at: tokenData.expires_at,
      created_at: tokenData.created_at,
      updated_at: tokenData.updated_at,
      status: tokenStatus,
      expires_in_seconds: tokenExpiresIn,
    } : null;
    
    return new Response(
      JSON.stringify({
        settings: {
          exists: !!settings,
          data: safeSettings,
          error: settingsError ? settingsError.message : null,
        },
        token: {
          exists: !!tokenData,
          data: safeToken,
          error: tokenError ? tokenError.message : null,
        },
        refresh_logs: {
          data: logsData || [],
          error: logsError ? logsError.message : null,
        },
        scheduled_job: {
          exists: !!jobData,
          data: jobData,
          error: jobError ? jobError.message : null,
        },
        system_info: {
          supabase_url: supabaseUrl ? '✓ Set' : '✗ Not set',
          service_key: supabaseServiceKey ? '✓ Set' : '✗ Not set',
          refresh_secret: Deno.env.get('FORTNOX_REFRESH_SECRET') ? '✓ Set' : '✗ Not set',
          jwt_secret: Deno.env.get('JWT_SECRET') ? '✓ Set' : '✗ Not set',
          timestamp: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in token debug:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  },
  {
    name: "get-all-users",
    description: "Retrieves a list of all users in the system (admin only)",
    code: `import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the current user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user is an admin
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check user role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (profileData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can retrieve all users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all users - first get auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve users', details: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all profile data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve user profiles', details: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Merge auth and profile data
    const users = authUsers.users.map(authUser => {
      const profile = profiles.find(p => p.id === authUser.id) || {};
      return {
        id: authUser.id,
        email: authUser.email,
        name: profile.name || authUser.email,
        role: profile.role || 'user',
        avatar_url: profile.avatar_url,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        confirmed_at: authUser.confirmed_at,
        user_metadata: authUser.user_metadata,
        profile_data: profile
      };
    });
    
    return new Response(
      JSON.stringify({ users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error retrieving users:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`
  }
];

const frontendEnvConfig = `
# Supabase Connection
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional - for deployment-specific settings
VITE_APP_ENV=production
`;
