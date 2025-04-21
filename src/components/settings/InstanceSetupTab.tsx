
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { testSupabaseConnection, saveCustomEnvironment, resetToDefaultEnvironment } from "@/lib/setupEnvironment";
import { toast } from "sonner";

interface SupabaseConnectionForm {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const InstanceSetupTab = () => {
  const [activeTab, setActiveTab] = useState("connection");
  const [isConnectionTesting, setIsConnectionTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Get current settings from localStorage
  const customSupabaseUrl = localStorage.getItem("custom_supabase_url");
  const customSupabaseAnonKey = localStorage.getItem("custom_supabase_anon_key");
  
  const { register, handleSubmit, formState } = useForm<SupabaseConnectionForm>({
    defaultValues: {
      supabaseUrl: customSupabaseUrl || '',
      supabaseAnonKey: customSupabaseAnonKey || ''
    }
  });

  const handleTestConnection = async (data: SupabaseConnectionForm) => {
    setIsConnectionTesting(true);
    setConnectionStatus("idle");
    
    try {
      const isValid = await testSupabaseConnection(data.supabaseUrl, data.supabaseAnonKey);
      
      if (isValid) {
        setConnectionStatus("success");
        toast.success("Connection to Supabase successful!");
      } else {
        setConnectionStatus("error");
        toast.error("Failed to connect to Supabase");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setConnectionStatus("error");
      toast.error("Connection test failed");
    } finally {
      setIsConnectionTesting(false);
    }
  };

  const handleSaveConnection = (data: SupabaseConnectionForm) => {
    try {
      saveCustomEnvironment(data.supabaseUrl, data.supabaseAnonKey);
      toast.success("Custom Supabase connection saved. Reloading...");
      
      // Give toast time to display
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save custom connection");
    }
  };

  const handleResetConnection = () => {
    if (window.confirm("Are you sure you want to reset to the default Supabase connection? This will reload the application.")) {
      resetToDefaultEnvironment();
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(message);
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast.error("Failed to copy to clipboard");
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="connection">Supabase Connection</TabsTrigger>
        <TabsTrigger value="edge-functions">Edge Functions</TabsTrigger>
        <TabsTrigger value="database">Database Setup</TabsTrigger>
      </TabsList>
      
      <TabsContent value="connection">
        <Card>
          <CardHeader>
            <CardTitle>Supabase Connection</CardTitle>
            <CardDescription>
              Configure your connection to the Supabase cloud backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Default Configuration</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Your app is currently using the default Supabase cloud backend.
                        This setup is fully managed and requires no additional configuration from you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Custom Supabase Connection (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect to a different Supabase instance by providing custom credentials.
                  Only use this if you're switching to a self-hosted Supabase instance.
                </p>
                
                <form onSubmit={handleSubmit(handleSaveConnection)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="supabaseUrl">Supabase URL</Label>
                    <Input
                      id="supabaseUrl"
                      placeholder="https://your-project-ref.supabase.co"
                      {...register("supabaseUrl", { required: true })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
                    <Input
                      id="supabaseAnonKey"
                      type="password"
                      placeholder="eyJhbG..."
                      {...register("supabaseAnonKey", { required: true })}
                    />
                  </div>
                  
                  {connectionStatus === "error" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to connect to Supabase with these credentials.
                        Please check the URL and anon key and try again.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {connectionStatus === "success" && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Successfully connected to Supabase! You can now save these credentials.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleSubmit(handleTestConnection)}
                      disabled={isConnectionTesting}
                    >
                      {isConnectionTesting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Testing
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={connectionStatus !== "success" && customSupabaseUrl === null}
                    >
                      Save Connection
                    </Button>
                    
                    {customSupabaseUrl && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleResetConnection}
                      >
                        Reset to Default
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="edge-functions">
        <Card>
          <CardHeader>
            <CardTitle>Edge Functions Setup Guide</CardTitle>
            <CardDescription>
              How to manage and deploy edge functions in your Supabase cloud project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm">
              <h3 className="text-lg font-medium">Step 1: Access Your Supabase Project</h3>
              <p>
                Log into the Supabase dashboard and select your project. Navigate to the "Edge Functions" section in the sidebar.
              </p>
              
              <h3 className="text-lg font-medium">Step 2: Create Required Edge Functions</h3>
              <p>
                This application requires several edge functions to work properly. For each function listed below:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>Click on "Create a new function" in the Supabase dashboard</li>
                <li>Enter the exact function name (e.g., "fortnox-token-refresh")</li>
                <li>Paste the provided code into the editor</li>
                <li>Click "Deploy" to create and activate the function</li>
              </ol>
              
              <h3 className="text-lg font-medium">Step 3: Required Edge Functions</h3>
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">1. fortnox-token-debug</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-token-debug',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Provides diagnostic information about Fortnox token status
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">2. fortnox-token-exchange</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-token-exchange',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Handles OAuth token exchange with Fortnox
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">3. fortnox-proxy</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-proxy',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Proxies API requests to Fortnox
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">4. fortnox-token-migrate</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-token-migrate',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Handles migration of legacy Fortnox tokens
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">5. fortnox-token-refresh</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-token-refresh',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Refreshes Fortnox OAuth tokens
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">6. fortnox-scheduled-refresh</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'fortnox-scheduled-refresh',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Handles scheduled token refreshes for Fortnox integration
                  </p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">7. get-all-users</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        'get-all-users',
                        'Function name copied'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy name
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Retrieves all users for administrative purposes
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-medium">Step 4: Configure Secrets</h3>
              <p>
                Set required secrets in the Supabase dashboard under "Project Settings" → "API" → "Functions":
              </p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>SUPABASE_URL</li>
                <li>SUPABASE_ANON_KEY</li>
                <li>SUPABASE_SERVICE_ROLE_KEY</li>
                <li>SUPABASE_DB_URL</li>
                <li>FORTNOX_REFRESH_SECRET</li>
                <li>JWT_SECRET</li>
              </ul>
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Need help?</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Visit the official Supabase documentation for detailed guides on 
                        edge functions and secrets management.
                      </p>
                      <div className="mt-2">
                        <a href="https://supabase.com/docs/guides/functions" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-800">
                          Supabase Edge Functions Documentation
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="database">
        <Card>
          <CardHeader>
            <CardTitle>Database Setup Guide</CardTitle>
            <CardDescription>
              How to set up and configure your Supabase database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm">
              <h3 className="text-lg font-medium">Step 1: Access SQL Editor</h3>
              <p>
                Log into the Supabase dashboard, select your project, and navigate to the "SQL Editor" section in the sidebar.
              </p>
              
              <h3 className="text-lg font-medium">Step 2: Create Database Structure</h3>
              <p>
                Run the following SQL scripts in the SQL Editor to set up the necessary database structure. You can run them one by one or combine them into a single script.
              </p>
              
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">1. Create System Settings Table</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Create a system_settings table to store application settings
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
EXECUTE FUNCTION update_system_settings_updated_at();`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">2. Create System Settings Functions</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Function to save system settings
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">3. Create News Posts Table</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Add support for news posts with images
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
  );`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">4. Create Storage Buckets</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Create application-logo bucket if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-logo', 'application-logo', true)
ON CONFLICT (id) DO NOTHING;

-- Create news_images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">5. Create Storage Policies</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Create policy for public access to application logos
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
ON CONFLICT DO NOTHING;`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">6. Add Token Refresh Logs</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Create a table to track token refresh history
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set up RLS policies
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for admins/managers to view logs
CREATE POLICY "Admins and managers can view token refresh logs" 
  ON public.token_refresh_logs 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin_or_manager());

-- Create trigger to update updated_at
CREATE TRIGGER set_token_refresh_logs_updated_at
  BEFORE UPDATE ON public.token_refresh_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_created_at ON public.token_refresh_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_success ON public.token_refresh_logs (success);`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">7. Set Up Fortnox Token Refresh Cron Jobs</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7"
                      onClick={() => copyToClipboard(
                        `-- Enable required extensions for cron jobs with HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get the Supabase project reference and anon key
DO $$
DECLARE
  project_ref TEXT := 'xojrleypudfrbmvejpow';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc';
  
  -- Instead of generating a random secret, we'll use a fixed value that matches what's set in Edge Functions
  -- This ensures the cron job passes the correct API key to the function
  refresh_secret TEXT := 'fortnox-refresh-secret-key-xojrleypudfrbmvejpow';
BEGIN
  -- Store the refresh secret in server settings for reference
  -- (This won't be used directly, but helps with troubleshooting)
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
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add more frequent refresh schedule
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/15 * * * *',  -- Run every 15 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true, "force": false}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add forced refresh every 12 hours
  PERFORM cron.schedule(
    'refresh-fortnox-token-forced',
    '0 */12 * * *',  -- Run every 12 hours (at 00:00 and 12:00)
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true, "force": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;`,
                        'SQL copied to clipboard'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy SQL
                    </Button>
                  </div>
                </div>
              </div>
              
              <h3 className="text-lg font-medium">Step 3: Verify Database Setup</h3>
              <p>
                After running the SQL scripts, you should verify that the tables and functions have been created correctly by:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>Checking the table listing in the "Table Editor" section</li>
                <li>Verifying storage buckets in the "Storage" section</li>
                <li>Testing the connections from your application</li>
              </ol>
              
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Notes</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          When copying SQL, make sure to paste it exactly as shown.
                        </li>
                        <li>
                          Run the scripts in the order listed for proper dependencies.
                        </li>
                        <li>
                          If you encounter any errors, check the Supabase logs for details.
                        </li>
                        <li>
                          The default project references are configured for this application. If you're using a different Supabase project, update the project references in the SQL scripts.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default InstanceSetupTab;
