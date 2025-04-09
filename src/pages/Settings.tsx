import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RefreshCw, RotateCcw, Save, Settings as SettingsIcon, Brush, Link, Users } from "lucide-react";
import { FortnoxConnect } from "@/components/integrations/FortnoxConnect";
import { FortnoxCallbackHandler } from "@/components/integrations/FortnoxCallbackHandler";
import { useNavigate, useLocation } from "react-router-dom";
import { applyColorTheme, DEFAULT_THEME, AppSettings } from "@/components/ThemeProvider";
import { UserManagement } from "@/components/settings/UserManagement";

// Define schema for app settings
const appSettingsSchema = z.object({
  appName: z.string().min(1, "Application name is required"),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  sidebarColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
});

// Define Fortnox schema
const fortnoxSettingsSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  enabled: z.boolean().default(false),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;
type FortnoxSettingsFormValues = z.infer<typeof fortnoxSettingsSchema>;

export default function Settings() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("appearance");
  const [isDefaultSystemSettings, setIsDefaultSystemSettings] = useState(false);
  
  const isAdmin = role === 'admin';
  const canManageSettings = isAdmin || role === 'manager';
  
  // Handle OAuth callback
  const isFortnoxCallback = location.search.includes('code=') && location.search.includes('state=');
  
  if (isFortnoxCallback) {
    return <FortnoxCallbackHandler />;
  }
  
  // Get app settings
  const { data: appSettings, isLoading: isLoadingAppSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("settings")
          .eq("id", "app_settings")
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // Record not found, use defaults
            setIsDefaultSystemSettings(true);
            return DEFAULT_THEME;
          }
          throw error;
        }
        
        // Ensure we have a complete settings object
        if (data?.settings) {
          const settings = data.settings as Record<string, any>;
          return {
            appName: settings.appName || DEFAULT_THEME.appName,
            primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
            sidebarColor: settings.sidebarColor || DEFAULT_THEME.sidebarColor,
            accentColor: settings.accentColor || DEFAULT_THEME.accentColor,
          } as AppSettings;
        }
        
        return DEFAULT_THEME;
      } catch (error) {
        console.error("Error fetching app settings:", error);
        return DEFAULT_THEME;
      }
    },
  });
  
  // Get Fortnox settings
  const { data: fortnoxSettings, isLoading: isLoadingFortnoxSettings } = useQuery({
    queryKey: ["fortnox-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("settings")
          .eq("id", "fortnox_settings")
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // Record not found
            return { clientId: "", clientSecret: "", enabled: false };
          }
          throw error;
        }
        
        const fortnoxData = data.settings as Record<string, any>;
        
        return {
          clientId: fortnoxData.clientId || "",
          clientSecret: fortnoxData.clientSecret || "",
          enabled: fortnoxData.enabled || false,
        };
      } catch (error) {
        console.error("Error fetching Fortnox settings:", error);
        return { clientId: "", clientSecret: "", enabled: false };
      }
    },
    enabled: canManageSettings, // Only fetch if user can manage settings
  });
  
  // Form for app settings
  const appSettingsForm = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: DEFAULT_THEME.appName,
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      sidebarColor: DEFAULT_THEME.sidebarColor,
      accentColor: DEFAULT_THEME.accentColor
    },
  });
  
  // Form for Fortnox settings
  const fortnoxSettingsForm = useForm<FortnoxSettingsFormValues>({
    resolver: zodResolver(fortnoxSettingsSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      enabled: false,
    },
  });
  
  // Update form values when data is loaded
  useEffect(() => {
    if (appSettings) {
      appSettingsForm.reset({
        appName: appSettings.appName,
        primaryColor: appSettings.primaryColor,
        secondaryColor: appSettings.secondaryColor,
        sidebarColor: appSettings.sidebarColor,
        accentColor: appSettings.accentColor,
      });
    }
  }, [appSettings, appSettingsForm]);
  
  useEffect(() => {
    if (fortnoxSettings) {
      fortnoxSettingsForm.reset({
        clientId: fortnoxSettings.clientId,
        clientSecret: fortnoxSettings.clientSecret,
        enabled: fortnoxSettings.enabled,
      });
    }
  }, [fortnoxSettings, fortnoxSettingsForm]);

  const handleResetToDefault = async () => {
    // Reset the form to default values
    appSettingsForm.reset({
      appName: DEFAULT_THEME.appName,
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      sidebarColor: DEFAULT_THEME.sidebarColor,
      accentColor: DEFAULT_THEME.accentColor,
    });

    // Apply the default theme immediately
    applyColorTheme(DEFAULT_THEME);
    
    if (canManageSettings) {
      try {
        // Save default colors to the database directly
        const { error } = await supabase
          .from("system_settings")
          .upsert({ 
            id: "app_settings", 
            settings: DEFAULT_THEME as unknown as Record<string, any>
          });
          
        if (error) throw error;
        
        // Invalidate the query to refetch
        queryClient.invalidateQueries({ queryKey: ["app-settings"] });
        
        toast.success("Colors reset to default and applied to all users");
      } catch (error) {
        console.error("Error saving default app settings:", error);
        toast.error("Failed to save default settings to the database");
      }
    } else {
      toast.success("Colors reset to default", {
        description: "Click Save to persist these changes."
      });
    }
  };
  
  const onSubmitAppSettings = async (data: AppSettingsFormValues) => {
    if (!canManageSettings) {
      toast.error("You don't have permission to change application settings");
      return;
    }
    
    try {
      // Apply the theme immediately
      applyColorTheme(data as AppSettings);
      
      // Save to database
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          id: "app_settings", 
          settings: data as unknown as Record<string, any>
        });
        
      if (error) throw error;
      
      // Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      
      toast.success("Application settings saved for all users");
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast.error("Failed to save application settings");
    }
  };
  
  const onSubmitFortnoxSettings = async (data: FortnoxSettingsFormValues) => {
    if (!isAdmin) {
      toast.error("You don't have permission to change Fortnox settings");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          id: "fortnox_settings", 
          settings: data as unknown as Record<string, any>
        });
        
      if (error) throw error;
      
      // Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: ["fortnox-settings"] });
      
      toast.success("Fortnox settings saved");
    } catch (error) {
      console.error("Error saving Fortnox settings:", error);
      toast.error("Failed to save Fortnox settings");
    }
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <span>Settings</span>
        </h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Brush className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                <span>Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...appSettingsForm}>
                <form onSubmit={appSettingsForm.handleSubmit(onSubmitAppSettings)} className="space-y-6">
                  <FormField
                    control={appSettingsForm.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Application Name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be displayed in the browser tab and application header.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-6" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={appSettingsForm.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={field.onChange}
                              className="font-mono"
                            />
                          </div>
                          <FormDescription>
                            Used for buttons, active states, and accents.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={field.onChange}
                              className="font-mono"
                            />
                          </div>
                          <FormDescription>
                            Used for backgrounds and secondary elements.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="sidebarColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sidebar Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={field.onChange}
                              className="font-mono"
                            />
                          </div>
                          <FormDescription>
                            Background color for the sidebar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appSettingsForm.control}
                      name="accentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="color" {...field} />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={field.onChange}
                              className="font-mono"
                            />
                          </div>
                          <FormDescription>
                            Used for highlights and accents.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleResetToDefault}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset to Default</span>
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={!canManageSettings || !appSettingsForm.formState.isDirty}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Settings</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <>
            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle>Fortnox Integration</CardTitle>
                  <CardDescription>Configure integration with Fortnox accounting software</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...fortnoxSettingsForm}>
                    <form onSubmit={fortnoxSettingsForm.handleSubmit(onSubmitFortnoxSettings)} className="space-y-6">
                      <FormField
                        control={fortnoxSettingsForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Fortnox Client ID" {...field} />
                            </FormControl>
                            <FormDescription>
                              The client ID from your Fortnox developer account.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={fortnoxSettingsForm.control}
                        name="clientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Fortnox Client Secret" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The client secret from your Fortnox developer account.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={fortnoxSettingsForm.control}
                        name="enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Enable Fortnox Integration</FormLabel>
                              <FormDescription>
                                Allow integration with Fortnox for invoicing and customer sync.
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
                      
                      <div className="flex justify-between pt-6">
                        {fortnoxSettings && (
                          <FortnoxConnect 
                            clientId={fortnoxSettings.clientId}
                            clientSecret={fortnoxSettings.clientSecret}
                          />
                        )}
                        
                        <Button 
                          type="submit" 
                          disabled={!isAdmin || !fortnoxSettingsForm.formState.isDirty}
                          className="flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Settings</span>
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
