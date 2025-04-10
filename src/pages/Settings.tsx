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
import { RefreshCw, RotateCcw, Save, Settings as SettingsIcon, Brush, Link, Upload, Trash } from "lucide-react";
import { FortnoxConnect } from "@/components/integrations/FortnoxConnect";
import { FortnoxCallbackHandler } from "@/components/integrations/FortnoxCallbackHandler";
import { useNavigate, useLocation } from "react-router-dom";
import { applyColorTheme, DEFAULT_THEME, AppSettings } from "@/components/ThemeProvider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  checkLogoExists, 
  uploadAppLogo, 
  removeAppLogo,
  DEFAULT_LOGO_PATH,
  MAX_LOGO_WIDTH,
  MAX_LOGO_HEIGHT,
  MAX_LOGO_SIZE,
  validateLogoFile,
  fileToDataUrl,
  getStoredLogoAsDataUrl,
  updateLogoInSystemSettings,
  LOGO_DATA_URL_KEY
} from "@/utils/logoUtils";

const appSettingsSchema = z.object({
  appName: z.string().min(1, "Application name is required"),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  sidebarColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
});

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showRemoveLogoConfirm, setShowRemoveLogoConfirm] = useState(false);
  const [hasExistingLogo, setHasExistingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoValidationError, setLogoValidationError] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(true);

  const isAdmin = role === 'admin';
  const canManageSettings = isAdmin || role === 'manager';
  
  const isFortnoxCallback = location.pathname.includes('/settings/fortnox-callback');
  
  if (isFortnoxCallback) {
    return <FortnoxCallbackHandler />;
  }
  
  const { data: appLogo, refetch: refetchLogo, isLoading: isLogoLoading } = useQuery({
    queryKey: ["app-logo-settings"],
    queryFn: async () => {
      setLoadingLogo(true);
      try {
        // Check localStorage first for cached logo
        const cachedLogo = localStorage.getItem(LOGO_DATA_URL_KEY);
        if (cachedLogo) {
          setHasExistingLogo(true);
          setLoadingLogo(false);
          return cachedLogo;
        }
        
        const logoExists = await checkLogoExists();
        setHasExistingLogo(logoExists);
        
        if (!logoExists) {
          setLoadingLogo(false);
          return null;
        }
        
        const dataUrl = await getStoredLogoAsDataUrl();
        setLoadingLogo(false);
        
        if (!dataUrl) {
          setHasExistingLogo(false);
          return null;
        }
        
        return dataUrl;
      } catch (error) {
        console.error("Error in app logo query:", error);
        setHasExistingLogo(false);
        setLoadingLogo(false);
        return null;
      }
    },
    staleTime: 10000,
    retry: 1
  });

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
            setIsDefaultSystemSettings(true);
            return DEFAULT_THEME;
          }
          throw error;
        }
        
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
    enabled: canManageSettings,
  });
  
  const appSettingsForm = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: DEFAULT_THEME.appName,
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      sidebarColor: DEFAULT_THEME.sidebarColor,
      accentColor: DEFAULT_THEME.accentColor,
    },
  });
  
  const fortnoxSettingsForm = useForm<FortnoxSettingsFormValues>({
    resolver: zodResolver(fortnoxSettingsSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      enabled: false,
    },
  });
  
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
    if (appLogo) {
      setLogoPreview(appLogo);
      setLogoError(false);
    }
  }, [appLogo]);
  
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
    appSettingsForm.reset({
      appName: DEFAULT_THEME.appName,
      primaryColor: DEFAULT_THEME.primaryColor,
      secondaryColor: DEFAULT_THEME.secondaryColor,
      sidebarColor: DEFAULT_THEME.sidebarColor,
      accentColor: DEFAULT_THEME.accentColor,
    });
    
    setLogoPreview(null);
    applyColorTheme(DEFAULT_THEME);
    
    if (canManageSettings) {
      try {
        const { error } = await supabase
          .from("system_settings")
          .upsert({ 
            id: "app_settings", 
            settings: {
              ...DEFAULT_THEME,
              logoUrl: null,
            } as unknown as Record<string, any>
          });
          
        if (error) throw error;
        
        if (hasExistingLogo) {
          const removed = await removeAppLogo();
          if (!removed) {
            toast.error("Failed to remove the application logo");
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["app-settings"] });
        queryClient.invalidateQueries({ queryKey: ["app-logo-settings"] });
        
        toast.success("Colors and logo reset to default and applied to all users");
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
      const settingsToSave = {
        ...data,
      };
      
      applyColorTheme(settingsToSave as AppSettings);
      
      const { error } = await supabase
        .from("system_settings")
        .upsert({ 
          id: "app_settings", 
          settings: settingsToSave as unknown as Record<string, any>
        });
        
      if (error) throw error;
      
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
      
      queryClient.invalidateQueries({ queryKey: ["fortnox-settings"] });
      
      toast.success("Fortnox settings saved");
    } catch (error) {
      console.error("Error saving Fortnox settings:", error);
      toast.error("Failed to save Fortnox settings");
    }
  };
  
  const handleLogoUpload = async (file: File) => {
    if (!canManageSettings) {
      toast.error("You don't have permission to change application settings");
      return null;
    }
    
    try {
      setUploadingLogo(true);
      setLogoError(false);
      setLogoValidationError(null);
      
      const { dataUrl, success } = await uploadAppLogo(file);
      
      // Always use the dataUrl for immediate display regardless of success
      if (dataUrl) {
        setLogoPreview(dataUrl);
        setHasExistingLogo(true);
        
        // Store the dataUrl in localStorage for persistence
        localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
        
        // Also update the system settings directly with the dataUrl
        await updateLogoInSystemSettings(dataUrl);
        
        // Refresh queryClient to update all components using the logo
        queryClient.invalidateQueries({ queryKey: ["app-logo-settings"] });
        queryClient.invalidateQueries({ queryKey: ["app-logo-dataurl"] });
        queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      }
      
      if (!success) {
        toast.warning("Logo saved locally but may not be available for other users");
      } else {
        toast.success("Logo uploaded successfully");
      }
      
      return dataUrl;
    } catch (error) {
      let errorMsg = "Failed to upload logo";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      console.error("Error uploading logo:", error);
      toast.error(errorMsg);
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLogoValidationError(null);
    setLogoError(false);
    
    // Verify the file is actually a PNG
    if (file.type !== 'image/png') {
      setLogoValidationError('Invalid file type. Only PNG files are allowed.');
      e.target.value = '';
      return;
    }
    
    // Check file size
    if (file.size > MAX_LOGO_SIZE) {
      setLogoValidationError(`File size exceeds the maximum allowed size of ${MAX_LOGO_SIZE / 1024 / 1024}MB`);
      e.target.value = '';
      return;
    }
    
    setUploadingLogo(true);
    
    try {
      // Show temporary preview immediately
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
      setLogoFile(file);
      
      console.log("Uploading logo file:", file.name, "Type:", file.type, "Size:", file.size);
      
      // Process the actual upload
      const { dataUrl, success } = await uploadAppLogo(file);
      
      if (dataUrl) {
        // Update preview with the final data URL
        setLogoPreview(dataUrl);
        setHasExistingLogo(true);
        
        // Refresh all logo-related queries
        refetchLogo();
        queryClient.invalidateQueries({ queryKey: ["app-logo-dataurl"] });
        
        // Release the temporary object URL
        URL.revokeObjectURL(objectUrl);
        
        if (success) {
          toast.success("Logo uploaded successfully");
        } else {
          toast.warning("Logo saved locally but may not be available for other users");
        }
      } else {
        toast.error("Failed to upload logo");
        setLogoPreview(null);
        setLogoFile(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process logo");
      setLogoPreview(null);
      setLogoFile(null);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };
  
  const handleRemoveLogo = async () => {
    if (!canManageSettings) {
      toast.error("You don't have permission to change application settings");
      return;
    }
    
    try {
      const removed = await removeAppLogo();
      
      if (removed) {
        setLogoPreview(null);
        setLogoFile(null);
        setHasExistingLogo(false);
        setLogoError(false);
        
        // Clear from localStorage
        localStorage.removeItem(LOGO_DATA_URL_KEY);
        
        // Refresh all components using the logo
        queryClient.invalidateQueries({ queryKey: ["app-logo-settings"] });
        queryClient.invalidateQueries({ queryKey: ["app-logo-dataurl"] });
        queryClient.invalidateQueries({ queryKey: ["app-settings"] });
        
        toast.success("Logo removed successfully");
      } else {
        toast.error("Failed to remove logo");
      }
    } catch (error) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    } finally {
      setShowRemoveLogoConfirm(false);
    }
  };
  
  const handleLogoError = () => {
    console.log("Logo failed to load in settings, using fallback");
    setLogoError(true);
    
    // If the logo is in localStorage, use that
    const cachedLogo = localStorage.getItem(LOGO_DATA_URL_KEY);
    if (cachedLogo) {
      setLogoPreview(cachedLogo);
      setLogoError(false);
      return;
    }
    
    // Otherwise try to convert from file if available
    if (logoFile) {
      fileToDataUrl(logoFile).then(dataUrl => {
        if (dataUrl) {
          setLogoPreview(dataUrl);
          setLogoError(false);
        }
      }).catch(() => {
        setLogoPreview(null);
      });
    } else {
      setLogoPreview(DEFAULT_LOGO_PATH);
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
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <span>Integrations</span>
            </TabsTrigger>
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
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Application Logo</Label>
                      <FormDescription className="mt-1 mb-3">
                        Upload a logo to display in the application header. Recommended size: up to {MAX_LOGO_WIDTH}×{MAX_LOGO_HEIGHT}px.
                      </FormDescription>
                    </div>
                    
                    {loadingLogo && (
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-12 w-32" />
                        <span className="text-sm text-muted-foreground">Loading logo...</span>
                      </div>
                    )}
                    
                    {!loadingLogo && (logoPreview || appLogo) && !logoError ? (
                      <div className="flex items-center space-x-4">
                        <div className="bg-white p-2 rounded border inline-block">
                          <img 
                            src={logoPreview || appLogo}
                            alt="App Logo" 
                            className="h-12 w-auto max-w-[200px] object-contain" 
                            onError={handleLogoError}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          disabled={!canManageSettings || !hasExistingLogo}
                          onClick={() => setShowRemoveLogoConfirm(true)}
                          className="flex items-center gap-2"
                        >
                          <Trash className="h-4 w-4" />
                          Remove Logo
                        </Button>
                      </div>
                    ) : !loadingLogo && (
                      <div className="flex flex-col gap-2">
                        <Input
                          type="file"
                          accept="image/png"
                          onChange={onLogoChange}
                          disabled={uploadingLogo || !canManageSettings}
                          className="w-full max-w-sm"
                        />
                        {logoValidationError && (
                          <p className="text-sm text-destructive">
                            {logoValidationError}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Upload a PNG logo image (max {MAX_LOGO_WIDTH}×{MAX_LOGO_HEIGHT}px, {MAX_LOGO_SIZE / 1024 / 1024}MB). 
                          Only PNG format is supported for best compatibility.
                        </div>
                      </div>
                    )}
                    
                    {uploadingLogo && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        <span>Uploading logo...</span>
                      </div>
                    )}
                  </div>
                  
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
        )}
      </Tabs>
      
      <ConfirmDialog
        open={showRemoveLogoConfirm}
        onOpenChange={setShowRemoveLogoConfirm}
        title="Remove Application Logo"
        description="Are you sure you want to remove the application logo? This cannot be undone."
        actionLabel="Remove Logo"
        onAction={handleRemoveLogo}
        variant="destructive"
      />
    </div>
  );
}
