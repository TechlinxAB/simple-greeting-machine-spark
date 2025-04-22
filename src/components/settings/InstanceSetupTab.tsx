
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Info, Link, Code, RefreshCcw, RotateCcw, Save } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getEnvironmentConfig, saveEnvironmentConfig, resetEnvironmentConfig, EnvironmentConfig } from "@/config/environment";
import { YesBadge, NoBadge } from "@/components/ui/YesBadge";

// These SQL snippets must be updated whenever you change your DB setup!
const FULL_SQL_SETUP = `-- SYSTEM SETTINGS TABLE AND RLS
-- ...copy from your src/sql/create_system_settings.sql and other custom migrations...

-- NEWS POSTS TABLE, IMAGE BUCKET, AND RLS
-- ...copy from src/sql/create_news_posts.sql...

-- STORAGE BUCKETS AND POLICIES
-- ...copy from src/sql/create_storage_buckets.sql and src/sql/create_storage_policies.sql...

-- TOKEN REFRESH LOGS TABLE AND RLS
-- ...copy from supabase/migrations/20250419_add_token_refresh_logs.sql...

-- FORTNOX TOKEN SCHEDULED REFRESH
-- ...copy from supabase/migrations/20250419_add_fortnox_token_refresh_cron.sql and related...
`;

const REQUIRED_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FORTNOX_REFRESH_SECRET",
  "JWT_SECRET",
  "SUPABASE_DB_URL",
  "SUPABASE_DB_PASSWORD",
];

const instanceSetupSchema = z.object({
  // Supabase
  supabaseUrl: z.string().url("Must be a valid URL").min(1, "Required"),
  supabaseAnonKey: z.string().min(1, "Required"),
  supabaseProjectRef: z.string().min(1, "Required"),
  // Database
  dbUrl: z.string().optional(),
  dbHost: z.string().optional(),
  dbPort: z.coerce.number().optional(),
  dbName: z.string().optional(),
  dbUser: z.string().optional(),
  // Fortnox
  fortnoxAuthUrl: z.string().url("Must be a valid URL").min(1, "Required"),
  fortnoxApiUrl: z.string().url("Must be a valid URL").min(1, "Required"),
  fortnoxRedirectPath: z.string().min(1, "Required"),
  fortnoxScopes: z.string().optional(),
  // Storage
  avatarBucket: z.string().min(1, "Required"),
  logosBucket: z.string().min(1, "Required"),
  newsBucket: z.string().min(1, "Required"),
  storageDomain: z.string().optional(),
  // Frontend
  frontendBaseUrl: z.string().optional(),
  // Edge Functions
  edgeFunctionsBaseUrl: z.string().optional(),
  edgeFunctionsTimeout: z.coerce.number().optional(),
  // CORS
  allowedDomains: z.string().optional(),
  corsAllowedOrigins: z.string().optional(),
  // Features
  enableEdgeFunctions: z.boolean().default(true),
});

type InstanceSetupFormValues = z.infer<typeof instanceSetupSchema>;

export function InstanceSetupTab() {
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [configJson, setConfigJson] = useState("");
  const [importError, setImportError] = useState("");
  
  const form = useForm<InstanceSetupFormValues>({
    resolver: zodResolver(instanceSetupSchema),
    defaultValues: {
      supabaseUrl: "",
      supabaseAnonKey: "",
      supabaseProjectRef: "",
      dbUrl: "",
      dbHost: "",
      dbPort: 5432,
      dbName: "",
      dbUser: "",
      fortnoxAuthUrl: "",
      fortnoxApiUrl: "",
      fortnoxRedirectPath: "",
      fortnoxScopes: "",
      avatarBucket: "",
      logosBucket: "",
      newsBucket: "",
      frontendBaseUrl: "",
      edgeFunctionsBaseUrl: "",
      edgeFunctionsTimeout: 10000,
      allowedDomains: "",
      corsAllowedOrigins: "",
      enableEdgeFunctions: true,
    },
  });

  // Load saved configuration on component mount
  useEffect(() => {
    const config = getEnvironmentConfig();
    
    form.reset({
      supabaseUrl: config.supabase.url,
      supabaseAnonKey: config.supabase.anonKey,
      supabaseProjectRef: config.supabase.projectRef,
      dbUrl: config.supabase.dbUrl,
      dbHost: config.supabase.dbHost,
      dbPort: config.supabase.dbPort,
      dbName: config.supabase.dbName,
      dbUser: config.supabase.dbUser,
      fortnoxAuthUrl: config.fortnox.authUrl,
      fortnoxApiUrl: config.fortnox.apiUrl,
      fortnoxRedirectPath: config.fortnox.redirectPath,
      fortnoxScopes: config.fortnox.scopes?.join(','),
      avatarBucket: config.storage.avatarBucket,
      logosBucket: config.storage.logosBucket,
      newsBucket: config.storage.newsBucket,
      storageDomain: config.storage.storageDomain,
      frontendBaseUrl: config.frontend?.baseUrl,
      edgeFunctionsBaseUrl: config.edgeFunctions?.baseUrl,
      edgeFunctionsTimeout: config.edgeFunctions?.timeoutMs,
      allowedDomains: config.allowedDomains?.join(','),
      corsAllowedOrigins: config.cors?.allowedOrigins.join(','),
      enableEdgeFunctions: config.features.enableEdgeFunctions,
    });
  }, [form]);

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(FULL_SQL_SETUP);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 1500);
  };
  
  const handleExportConfig = () => {
    try {
      const config = getEnvironmentConfig();
      setConfigJson(JSON.stringify(config, null, 2));
      setShowImportExport(true);
    } catch (error) {
      toast.error("Failed to export configuration");
      console.error("Export error:", error);
    }
  };
  
  const handleImportConfig = () => {
    try {
      setImportError("");
      const config = JSON.parse(configJson);
      saveEnvironmentConfig(config);
      setShowImportExport(false);
      toast.success("Configuration imported successfully", {
        description: "Please reload the page to apply changes."
      });
    } catch (error) {
      setImportError("Invalid JSON configuration");
      console.error("Import error:", error);
    }
  };
  
  const handleResetConfig = () => {
    resetEnvironmentConfig();
    toast.success("Configuration reset to defaults", {
      description: "Please reload the page to apply changes."
    });
    setTimeout(() => window.location.reload(), 2000);
  };

  const onSubmit = (data: InstanceSetupFormValues) => {
    try {
      // Convert form values to environment config structure
      const config: Partial<EnvironmentConfig> = {
        supabase: {
          url: data.supabaseUrl,
          anonKey: data.supabaseAnonKey,
          projectRef: data.supabaseProjectRef,
          dbUrl: data.dbUrl,
          dbHost: data.dbHost,
          dbPort: data.dbPort,
          dbName: data.dbName,
          dbUser: data.dbUser,
        },
        fortnox: {
          authUrl: data.fortnoxAuthUrl,
          apiUrl: data.fortnoxApiUrl,
          redirectPath: data.fortnoxRedirectPath,
          refreshSecret: "fortnox-refresh-secret-key", // This is just a placeholder, actual secret in Supabase
          scopes: data.fortnoxScopes ? data.fortnoxScopes.split(',').map(s => s.trim()) : undefined,
        },
        storage: {
          avatarBucket: data.avatarBucket,
          logosBucket: data.logosBucket,
          newsBucket: data.newsBucket,
          storageDomain: data.storageDomain,
        },
        frontend: {
          baseUrl: data.frontendBaseUrl,
        },
        edgeFunctions: {
          baseUrl: data.edgeFunctionsBaseUrl,
          timeoutMs: data.edgeFunctionsTimeout,
        },
        allowedDomains: data.allowedDomains ? data.allowedDomains.split(',').map(d => d.trim()) : undefined,
        cors: {
          allowedOrigins: data.corsAllowedOrigins ? data.corsAllowedOrigins.split(',').map(o => o.trim()) : ['*'],
        },
        features: {
          enableEdgeFunctions: data.enableEdgeFunctions,
        },
      };
      
      // Save configuration
      saveEnvironmentConfig(config);
      
      toast.success("Configuration saved successfully", {
        description: "Please reload the page to apply changes."
      });
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error("Save error:", error);
    }
  };

  const handleTestSupabaseConnection = async () => {
    const values = form.getValues();
    try {
      // Create a temporary Supabase client to test the connection
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(values.supabaseUrl, values.supabaseAnonKey);
      
      const { data, error } = await testClient.from('system_settings').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      toast.success("Supabase connection successful");
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Supabase connection failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  // Tutorial for full instance setup
  const HOWTO = `
# How to Migrate This Application to a New Environment

1. **Set Up a New Supabase Project**
   - Create a new Supabase project at [https://app.supabase.com/](https://app.supabase.com/)
   - Run the SQL setup scripts in the SQL Editor (see Full SQL Setup below)
   - Create storage buckets with the same names configured in Storage section
   - Deploy all Edge Functions from your existing project

2. **Configure Supabase Secrets**
   - Set all required secrets in your new Supabase project:
${REQUIRED_SECRETS.map(secret => `     - ${secret}`).join('\n')}

3. **Update Instance Configuration**
   - Enter your new Supabase URL, Anon Key, and Project Ref in the Supabase section
   - Enter your database connection details (host, port, database name, user)
   - Test the connection to verify it works
   - Update any other environment-specific values
   - Save the configuration
   - Reload the application

4. **Verify Fortnox Integration**
   - Re-authenticate with Fortnox in the Integrations tab
   - Test that token refresh works correctly

5. **Migrate Data (Optional)**
   - Export data from your old database
   - Import data into your new database
   - Verify that all data was migrated correctly

6. **Test the Application**
   - Verify that all features work correctly
   - Check that all API calls are going to the new backend
   - Test edge functions and storage operations
`;

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle>Instance Setup & Migration</CardTitle>
          <CardDescription>
            Configure all environment settings to migrate this application to a new backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-2 mb-4">
            <Button variant="outline" onClick={handleExportConfig}>Export Config</Button>
            <Button variant="outline" onClick={handleResetConfig}>Reset to Defaults</Button>
          </div>
          
          <section className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <Info className="h-5 w-5" /> 
              Migration Guide
            </h3>
            <pre className="whitespace-pre-wrap rounded bg-muted/30 p-4 text-sm mb-4">{HOWTO}</pre>
          </section>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="single" collapsible className="w-full" defaultValue="supabase">
                {/* Supabase Configuration */}
                <AccordionItem value="supabase">
                  <AccordionTrigger className="text-md font-semibold">
                    Supabase / Database Configuration
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="supabaseUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supabase URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-project-ref.supabase.co" {...field} />
                            </FormControl>
                            <FormDescription>
                              The URL of your Supabase project
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="supabaseAnonKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anon/Public Key</FormLabel>
                            <FormControl>
                              <Input placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
                            </FormControl>
                            <FormDescription>
                              The anon/public key of your Supabase project
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="supabaseProjectRef"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Reference</FormLabel>
                            <FormControl>
                              <Input placeholder="project-ref" {...field} />
                            </FormControl>
                            <FormDescription>
                              The reference ID of your Supabase project
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <h4 className="text-md font-semibold mt-4">Database Configuration</h4>
                      
                      <FormField
                        control={form.control}
                        name="dbUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Database URL (Connection String)</FormLabel>
                            <FormControl>
                              <Input placeholder="postgresql://postgres:password@localhost:5432/postgres" {...field} />
                            </FormControl>
                            <FormDescription>
                              The full database connection string
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dbHost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Database Host</FormLabel>
                              <FormControl>
                                <Input placeholder="localhost" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dbPort"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Database Port</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="5432" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dbName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Database Name</FormLabel>
                              <FormControl>
                                <Input placeholder="postgres" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="dbUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Database User</FormLabel>
                              <FormControl>
                                <Input placeholder="postgres" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
                        <h4 className="font-semibold mb-2">Required Supabase Secrets</h4>
                        <p className="mb-2">
                          The following secrets must be set in your Supabase project settings. These cannot be set from the frontend.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                          {REQUIRED_SECRETS.map(secret => (
                            <li key={secret}>{secret}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-red-700 font-semibold">
                          Note: Database password (SUPABASE_DB_PASSWORD) must be set as a secret in Supabase for security reasons.
                        </p>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleTestSupabaseConnection}
                        className="mt-2"
                      >
                        Test Connection
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Fortnox Configuration */}
                <AccordionItem value="fortnox">
                  <AccordionTrigger className="text-md font-semibold">
                    Fortnox Integration
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="fortnoxAuthUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Auth URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://apps.fortnox.se/oauth-v1/auth" {...field} />
                            </FormControl>
                            <FormDescription>
                              The Fortnox OAuth authorization URL
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fortnoxApiUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://api.fortnox.se/3" {...field} />
                            </FormControl>
                            <FormDescription>
                              The Fortnox API base URL
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fortnoxRedirectPath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Redirect Path</FormLabel>
                            <FormControl>
                              <Input placeholder="/settings?tab=fortnox" {...field} />
                            </FormControl>
                            <FormDescription>
                              The path to redirect to after Fortnox authentication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fortnoxScopes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scopes (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="invoice,article,customer" {...field} />
                            </FormControl>
                            <FormDescription>
                              The Fortnox API scopes to request
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-800">
                        <h4 className="font-semibold mb-2">Fortnox Client ID & Secret</h4>
                        <p>
                          Fortnox Client ID and Secret are stored in the <code>system_settings</code> table and can be 
                          configured in the Integrations tab. These credentials are specific to each instance and must be 
                          set up after migration.
                        </p>
                        <p className="mt-2">
                          The <code>FORTNOX_REFRESH_SECRET</code> must be set in your Supabase project secrets for token 
                          refresh to work correctly.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Storage Configuration */}
                <AccordionItem value="storage">
                  <AccordionTrigger className="text-md font-semibold">
                    Storage Configuration
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="avatarBucket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Avatar Bucket</FormLabel>
                            <FormControl>
                              <Input placeholder="avatars" {...field} />
                            </FormControl>
                            <FormDescription>
                              The name of the bucket for avatar images
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="logosBucket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logos Bucket</FormLabel>
                            <FormControl>
                              <Input placeholder="logos" {...field} />
                            </FormControl>
                            <FormDescription>
                              The name of the bucket for logo images
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newsBucket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>News Bucket</FormLabel>
                            <FormControl>
                              <Input placeholder="news" {...field} />
                            </FormControl>
                            <FormDescription>
                              The name of the bucket for news images
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="storageDomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Domain (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-storage-domain.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Custom domain for storage buckets (if different from Supabase URL)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Frontend & Edge Functions */}
                <AccordionItem value="frontend">
                  <AccordionTrigger className="text-md font-semibold">
                    Frontend & Edge Functions
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="frontendBaseUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frontend Base URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-frontend-domain.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave blank to auto-detect from browser
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="edgeFunctionsBaseUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Edge Functions Base URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-project-ref.supabase.co/functions/v1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave blank to use Supabase URL + '/functions/v1'
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="edgeFunctionsTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Edge Functions Timeout (ms)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="10000" {...field} />
                            </FormControl>
                            <FormDescription>
                              Default timeout for edge function calls
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="enableEdgeFunctions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Edge Functions</FormLabel>
                              <FormDescription>
                                Enable or disable edge function calls
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* CORS & Domain Configuration */}
                <AccordionItem value="cors">
                  <AccordionTrigger className="text-md font-semibold">
                    CORS & Domain Configuration
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="allowedDomains"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowed Domains (comma-separated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="your-domain.com,another-domain.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Domains allowed for OAuth redirects and other operations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="corsAllowedOrigins"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CORS Allowed Origins (comma-separated)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="*,https://your-domain.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Origins allowed in CORS headers (use * for all)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* SQL Setup */}
                <AccordionItem value="sql">
                  <AccordionTrigger className="text-md font-semibold">
                    SQL Setup
                  </AccordionTrigger>
                  <AccordionContent className="p-2 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-md font-medium">Full SQL Setup Commands</h3>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCopySql}
                          variant="outline"
                        >
                          {sqlCopied ? (
                            <Check className="w-4 h-4 mr-2 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          {sqlCopied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <pre className="bg-muted/40 rounded p-4 overflow-x-auto text-xs max-h-80">{FULL_SQL_SETUP}</pre>
                      <p className="text-sm text-muted-foreground">
                        Run these SQL commands in your new Supabase project to set up all required tables, functions, and policies.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleResetConfig}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset to Default</span>
                </Button>
                
                <Button 
                  type="submit" 
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save All Settings</span>
                </Button>
              </div>
            </form>
          </Form>
          
          {/* Import/Export Dialog */}
          <Dialog open={showImportExport} onOpenChange={setShowImportExport}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import/Export Configuration</DialogTitle>
                <DialogDescription>
                  Export to backup your configuration or import from another instance.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Label htmlFor="config-json">Configuration JSON</Label>
                <Textarea 
                  id="config-json" 
                  value={configJson} 
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="h-72 font-mono text-xs"
                />
                {importError && (
                  <p className="text-sm text-destructive">{importError}</p>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImportExport(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportConfig}>
                  Import & Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
