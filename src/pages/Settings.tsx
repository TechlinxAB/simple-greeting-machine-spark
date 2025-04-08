
import { useState } from "react";
import { useForm } from "react-hook-form";
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

const appSettingsSchema = z.object({
  appName: z.string().min(1, { message: "App name is required" }),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Invalid color format" }),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: "Invalid color format" }),
});

const fortnoxSettingsSchema = z.object({
  fortnoxClientId: z.string().optional(),
  fortnoxClientSecret: z.string().optional(),
  fortnoxAccessToken: z.string().optional(),
  fortnoxRefreshToken: z.string().optional(),
});

export default function Settings() {
  const [activeTab, setActiveTab] = useState("appearance");
  const { role } = useAuth();
  
  // Only admin should access this page
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
  
  const appSettingsForm = useForm<z.infer<typeof appSettingsSchema>>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: "Techlinx Time Tracker",
      primaryColor: "#0ea5e9",
      secondaryColor: "#6366f1",
    },
  });
  
  const fortnoxSettingsForm = useForm<z.infer<typeof fortnoxSettingsSchema>>({
    resolver: zodResolver(fortnoxSettingsSchema),
    defaultValues: {
      fortnoxClientId: "",
      fortnoxClientSecret: "",
      fortnoxAccessToken: "",
      fortnoxRefreshToken: "",
    },
  });
  
  const onAppSettingsSubmit = (values: z.infer<typeof appSettingsSchema>) => {
    // Save to localStorage for demo purposes
    localStorage.setItem('appSettings', JSON.stringify(values));
    toast.success("App settings saved successfully");
    
    // In a real app, you would save to the database
    // and apply the settings to the UI dynamically
  };
  
  const onFortnoxSettingsSubmit = (values: z.infer<typeof fortnoxSettingsSchema>) => {
    // In a real app, you would save these securely
    toast.success("Fortnox settings saved successfully");
  };
  
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
                              <Input {...field} />
                            </FormControl>
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
                              <Input {...field} />
                            </FormControl>
                          </div>
                          <FormDescription>
                            Secondary accent color for complementary elements.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={fortnoxSettingsForm.control}
                      name="fortnoxAccessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token (Optional)</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            This will be auto-generated if not provided.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={fortnoxSettingsForm.control}
                      name="fortnoxRefreshToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Refresh Token (Optional)</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            This will be auto-generated if not provided.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      Note: To integrate with Fortnox, you'll need to register your application in the Fortnox Developer Portal.
                      After registration, you'll receive a Client ID and Client Secret to use with this application.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Fortnox Settings</Button>
                </CardFooter>
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
