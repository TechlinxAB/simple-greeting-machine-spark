
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { FortnoxConnect } from "@/components/integrations/FortnoxConnect";
import { FortnoxCallbackHandler } from "@/components/integrations/FortnoxCallbackHandler";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const appSettingsSchema = z.object({
  appName: z.string().min(1, { message: "App name is required" }),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Invalid color format" }),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Invalid color format" }),
});

const fortnoxSettingsSchema = z.object({
  fortnoxClientId: z.string().min(5, { message: "Fortnox Client ID is too short" }),
  fortnoxClientSecret: z.string().min(5, { message: "Fortnox Client Secret is too short" }),
});

interface AppSettings {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
}

interface FortnoxSettings {
  clientId: string;
  clientSecret: string;
}

interface SystemSettingsResponse {
  fortnoxSettings: FortnoxSettings | null;
  appSettings: AppSettings | null;
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "appearance");
  const [fortnoxConnected, setFortnoxConnected] = useState(false);
  const { role, user } = useAuth();
  
  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access settings");
      navigate("/login");
    }
  }, [user, navigate]);
  
  if (role !== 'admin') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the settings page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please contact an administrator for assistance.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading settings...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const appSettingsForm = useForm<z.infer<typeof appSettingsSchema>>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: "Techlinx Time Tracker",
      primaryColor: "#2e7d32", // Green color matching the screenshot
      secondaryColor: "#e8f5e9", // Light green for secondary elements
    },
  });
  
  const fortnoxSettingsForm = useForm<z.infer<typeof fortnoxSettingsSchema>>({
    resolver: zodResolver(fortnoxSettingsSchema),
    defaultValues: {
      fortnoxClientId: "",
      fortnoxClientSecret: "",
    },
  });
  
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      try {
        const { data: fortnoxData, error: fortnoxError } = await supabase
          .from('system_settings')
          .select('settings')
          .eq('id', 'fortnox_credentials')
          .maybeSingle();
          
        if (fortnoxError && !fortnoxError.message.includes('does not exist')) {
          console.error("Error fetching Fortnox settings:", fortnoxError);
          toast.error("Failed to load Fortnox settings");
        }
          
        const { data: appData, error: appError } = await supabase
          .from('system_settings')
          .select('settings')
          .eq('id', 'app_settings')
          .maybeSingle();
          
        if (appError && !appError.message.includes('does not exist')) {
          console.error("Error fetching app settings:", appError);
          toast.error("Failed to load app settings");
        }
          
        const fortnoxSettings = fortnoxData?.settings as Record<string, any> | null;
        const appSettings = appData?.settings as Record<string, any> | null;
        
        return {
          fortnoxSettings: fortnoxSettings ? {
            clientId: fortnoxSettings.clientId || '',
            clientSecret: fortnoxSettings.clientSecret || ''
          } : null,
          appSettings: appSettings ? {
            appName: appSettings.appName || 'Techlinx Time Tracker',
            primaryColor: appSettings.primaryColor || '#2e7d32',
            secondaryColor: appSettings.secondaryColor || '#e8f5e9'
          } : null
        } as SystemSettingsResponse;
      } catch (err) {
        console.error("Error fetching system settings:", err);
        toast.error("Failed to load settings");
        return { fortnoxSettings: null, appSettings: null } as SystemSettingsResponse;
      }
    }
  });
  
  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.appSettings) {
        appSettingsForm.reset(systemSettings.appSettings);
        
        // Apply the color settings to CSS variables
        const root = document.documentElement;
        const primaryColorHsl = hexToHSL(systemSettings.appSettings.primaryColor);
        const secondaryColorHsl = hexToHSL(systemSettings.appSettings.secondaryColor);
        
        if (primaryColorHsl) {
          root.style.setProperty('--primary', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
          root.style.setProperty('--ring', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
        }
        
        if (secondaryColorHsl) {
          root.style.setProperty('--secondary', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
          root.style.setProperty('--accent', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
        }
        
        localStorage.setItem('appSettings', JSON.stringify(systemSettings.appSettings));
      }
      
      if (systemSettings.fortnoxSettings) {
        const fortnoxCreds = {
          fortnoxClientId: systemSettings.fortnoxSettings.clientId || "",
          fortnoxClientSecret: systemSettings.fortnoxSettings.clientSecret || ""
        };
        
        fortnoxSettingsForm.reset(fortnoxCreds);
        localStorage.setItem('fortnoxSettings', JSON.stringify(fortnoxCreds));
      }
    } else {
      const storedAppSettings = localStorage.getItem('appSettings');
      if (storedAppSettings) {
        try {
          const settings = JSON.parse(storedAppSettings);
          appSettingsForm.reset(settings);
          
          // Apply stored settings from localStorage
          const root = document.documentElement;
          const primaryColorHsl = hexToHSL(settings.primaryColor);
          const secondaryColorHsl = hexToHSL(settings.secondaryColor);
          
          if (primaryColorHsl) {
            root.style.setProperty('--primary', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
            root.style.setProperty('--ring', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
          }
          
          if (secondaryColorHsl) {
            root.style.setProperty('--secondary', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
            root.style.setProperty('--accent', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
          }
        } catch (error) {
          console.error('Error parsing app settings:', error);
        }
      }
      
      const storedFortnoxSettings = localStorage.getItem('fortnoxSettings');
      if (storedFortnoxSettings) {
        try {
          const settings = JSON.parse(storedFortnoxSettings);
          fortnoxSettingsForm.reset(settings);
        } catch (error) {
          console.error('Error parsing Fortnox settings:', error);
        }
      }
    }
  }, [systemSettings, appSettingsForm, fortnoxSettingsForm]);
  
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Function to convert hex to HSL
  function hexToHSL(hex: string) {
    // Remove the # if it exists
    hex = hex.replace(/^#/, '');
    
    // Convert to RGB first
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    
    // Find min and max
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h *= 60;
    }
    
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  
  const onAppSettingsSubmit = async (values: z.infer<typeof appSettingsSchema>) => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(values));
      
      // Apply the color settings to CSS variables
      const root = document.documentElement;
      const primaryColorHsl = hexToHSL(values.primaryColor);
      const secondaryColorHsl = hexToHSL(values.secondaryColor);
      
      if (primaryColorHsl) {
        root.style.setProperty('--primary', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
        root.style.setProperty('--ring', `${primaryColorHsl.h} ${primaryColorHsl.s}% ${primaryColorHsl.l}%`);
      }
      
      if (secondaryColorHsl) {
        root.style.setProperty('--secondary', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
        root.style.setProperty('--accent', `${secondaryColorHsl.h} ${secondaryColorHsl.s}% ${secondaryColorHsl.l}%`);
      }
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'app_settings',
          settings: values
        });
      
      if (error) throw error;
      
      toast.success("App settings saved successfully");
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast.error("Failed to save app settings to database");
    }
  };
  
  const onFortnoxSettingsSubmit = async (values: z.infer<typeof fortnoxSettingsSchema>) => {
    try {
      localStorage.setItem('fortnoxSettings', JSON.stringify(values));
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'fortnox_credentials',
          settings: {
            clientId: values.fortnoxClientId,
            clientSecret: values.fortnoxClientSecret
          }
        });
      
      if (error) throw error;
      
      toast.success("Fortnox settings saved successfully");
    } catch (error) {
      console.error("Error saving Fortnox settings:", error);
      toast.error("Failed to save Fortnox settings to database");
    }
  };
  
  const handleFortnoxCallbackSuccess = () => {
    setFortnoxConnected(true);
    toast.success("Successfully connected to Fortnox!");
  };
  
  const handleFortnoxCallbackError = (error: Error) => {
    toast.error(`Failed to connect to Fortnox: ${error.message}`);
  };
  
  const currentClientId = fortnoxSettingsForm.watch('fortnoxClientId');
  const currentClientSecret = fortnoxSettingsForm.watch('fortnoxClientSecret');
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="fortnox">Fortnox Integration</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <Form {...appSettingsForm}>
              <form onSubmit={appSettingsForm.handleSubmit(onAppSettingsSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={appSettingsForm.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name displayed in the app header and browser title.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={appSettingsForm.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full border"
                              style={{ backgroundColor: field.value }}
                            />
                            <FormControl>
                              <Input {...field} type="color" className="w-16 h-10 p-1" />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <FormDescription>
                            Main accent color for buttons and highlights.
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
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full border"
                              style={{ backgroundColor: field.value }}
                            />
                            <FormControl>
                              <Input {...field} type="color" className="w-16 h-10 p-1" />
                            </FormControl>
                            <Input 
                              value={field.value} 
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <FormDescription>
                            Secondary accent color for complementary elements.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-6 p-4 border rounded-md">
                    <h3 className="font-medium mb-2">Preview</h3>
                    <div className="flex gap-4 flex-wrap">
                      <Button
                        style={{
                          backgroundColor: appSettingsForm.watch('primaryColor'),
                          color: "#fff"
                        }}
                      >
                        Primary Button
                      </Button>
                      
                      <Button
                        variant="outline"
                        style={{
                          borderColor: appSettingsForm.watch('primaryColor'),
                          color: appSettingsForm.watch('primaryColor')
                        }}
                      >
                        Outline Button
                      </Button>
                      
                      <div 
                        className="p-4 rounded-md"
                        style={{ 
                          backgroundColor: appSettingsForm.watch('secondaryColor'),
                          color: '#000'
                        }}
                      >
                        Secondary Background
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Changes</Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="fortnox" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fortnox Integration</CardTitle>
              <CardDescription>
                Connect to Fortnox API for invoice exports
              </CardDescription>
            </CardHeader>
            
            {searchParams.has('code') && (
              <CardContent className="mb-6">
                <FortnoxCallbackHandler 
                  onSuccess={handleFortnoxCallbackSuccess}
                  onError={handleFortnoxCallbackError}
                />
              </CardContent>
            )}
            
            <Form {...fortnoxSettingsForm}>
              <form onSubmit={fortnoxSettingsForm.handleSubmit(onFortnoxSettingsSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={fortnoxSettingsForm.control}
                    name="fortnoxClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fortnox Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Client ID from your Fortnox Developer Portal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={fortnoxSettingsForm.control}
                    name="fortnoxClientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fortnox Client Secret</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Client Secret from your Fortnox Developer Portal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="mt-2">Save Credentials</Button>
                  
                  <Separator className="my-6" />
                  
                  <FortnoxConnect 
                    clientId={currentClientId}
                    clientSecret={currentClientSecret}
                    onStatusChange={setFortnoxConnected}
                  />
                  
                  <div className="bg-muted p-4 rounded-md mt-6">
                    <p className="text-sm text-muted-foreground">
                      Note: To integrate with Fortnox, you'll need to register your application in the Fortnox Developer Portal.
                      After registration, you'll receive a Client ID and Client Secret to use with this application.
                    </p>
                  </div>
                </CardContent>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                User management features coming soon. This will allow administrators to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>View all registered users</li>
                <li>Assign or change user roles (Admin, Manager, User)</li>
                <li>Invite new users to the platform</li>
                <li>Disable or delete user accounts</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
