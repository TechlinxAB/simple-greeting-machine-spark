import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { testSupabaseConnection, resetToDefaultEnvironment } from "@/lib/setupEnvironment";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { environment } from "@/config/environment";
import { supabaseConfig } from "@/integrations/supabase/client";

// Keeps all the tutorial/info as-is!
const SECRET_FLAG = "secret_admin_logged_in";

export function InstanceSetupTab() {
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem("custom_supabase_url") || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem("custom_supabase_anon_key") || "");
  const [editing, setEditing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [isResetting, setIsResetting] = useState(false);

  // Are we in secret/admin setup mode (no Supabase connected yet)?
  const [isSecretMode, setIsSecretMode] = useState(false);

  useEffect(() => {
    setIsSecretMode(localStorage.getItem(SECRET_FLAG) === "1");
  }, []);

  // Handler for saving new Supabase connection
  const handleSave = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Please enter both Project URL and Anon Key");
      return;
    }
    localStorage.setItem("custom_supabase_url", supabaseUrl);
    localStorage.setItem("custom_supabase_anon_key", supabaseAnonKey);
    localStorage.removeItem(SECRET_FLAG); // Remove secret flag so normal login is enforced
    toast.success("Supabase connection updated! Reloading frontend...");
    setTimeout(() => window.location.reload(), 1200); // reload to activate new config
  };

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Please enter both Project URL and Anon Key");
      return;
    }
    
    setTestingConnection(true);
    setConnectionStatus('untested');
    
    try {
      const isConnected = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      
      if (isConnected) {
        setConnectionStatus('success');
        toast.success("Connection successful! You can now save these settings.");
      } else {
        setConnectionStatus('error');
        toast.error("Connection failed. Please check your URL and Anon Key.");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setConnectionStatus('error');
      toast.error("Connection test failed. Please check your URL and Anon Key.");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      resetToDefaultEnvironment();
    } catch (error) {
      console.error("Error resetting to default:", error);
      toast.error("Failed to reset to default environment");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle>Instance Setup</CardTitle>
          <CardDescription>
            <div>
              <ol className="list-decimal ml-5 space-y-2 text-base text-muted-foreground">
                <li>
                  <strong>Link your Supabase backend:</strong>
                  <div className="mt-2 flex flex-col gap-2">
                    <span>
                      Enter your <b>Supabase Project URL</b> and <b>Public Anon Key</b> below to connect this frontend instance to your backend.
                    </span>
                    <span>
                      You can get both values from your{" "}
                      <a
                        className="text-primary hover:underline"
                        href="https://app.supabase.com/project"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Supabase dashboard
                      </a>
                      .
                    </span>
                  </div>
                  {isSecretMode ? (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleSave();
                      }}
                      className="mt-4 flex flex-col gap-4"
                    >
                      <div>
                        <label className="block font-medium">Supabase Project URL</label>
                        <Input
                          value={supabaseUrl}
                          onChange={e => setSupabaseUrl(e.target.value)}
                          placeholder="https://project-ref.supabase.co"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block font-medium">Supabase Public Anon Key</label>
                        <Input
                          value={supabaseAnonKey}
                          onChange={e => setSupabaseAnonKey(e.target.value)}
                          placeholder="eyJh..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="flex items-center gap-2"
                        >
                          {testingConnection ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                        <Button type="submit" className="w-max">Save & Connect</Button>
                      </div>
                      
                      {connectionStatus === 'success' && (
                        <Alert className="bg-green-50 border-green-200">
                          <AlertDescription className="text-green-700">
                            Connection successful! You can now save these settings.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {connectionStatus === 'error' && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Connection failed. Please check your URL and Anon Key.
                          </AlertDescription>
                        </Alert>
                      )}
                    </form>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2 text-muted-foreground text-sm">
                      <div>
                        <b>Current URL:</b> {supabaseConfig.url || "Default (cloud-hosted)"}
                      </div>
                      <div>
                        <b>Current Anon Key:</b> {supabaseConfig.anonKey ? "••••••••" + supabaseConfig.anonKey.slice(-6) : "Default (cloud-hosted)"}
                      </div>
                      <div>
                        <b>Project Ref:</b> {supabaseConfig.projectRef || "Default (cloud-hosted)"}
                      </div>
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleReset}
                          disabled={isResetting}
                          className="flex items-center gap-2"
                        >
                          {isResetting ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Resetting...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              Reset to Default
                            </>
                          )}
                        </Button>
                      </div>
                      <span className="mt-2">
                        To change the connection, log out and log in using the "techlinxadmin" bootstrapping credentials while no Supabase is connected.
                      </span>
                    </div>
                  )}
                </li>
                <Separator className="my-4" />
                <li>
                  <strong>Configure your Supabase project:</strong>
                  <div className="mt-2 flex flex-col gap-2">
                    <span>
                      After linking your Supabase project, you need to configure it properly:
                    </span>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Enable Email authentication in Authentication → Providers</li>
                      <li>Set up Storage buckets for avatars, logos, and other assets</li>
                      <li>Configure Row Level Security (RLS) policies for your tables</li>
                      <li>Set up any required Edge Functions</li>
                    </ul>
                  </div>
                </li>
                <li>
                  <strong>Create your first admin user:</strong>
                  <div className="mt-2 flex flex-col gap-2">
                    <span>
                      After configuring Supabase, create your first admin user:
                    </span>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Sign up using the registration page</li>
                      <li>Use the Supabase dashboard to set the user's role to 'admin' in the profiles table</li>
                      <li>Log in with your new admin account</li>
                    </ol>
                  </div>
                </li>
                <li>
                  <span>
                    <b>Hint:</b> After linking, reload the page to apply the new Supabase instance across your app.<br />
                    For best security, change the admin credentials or remove them after setup!
                  </span>
                </li>
                <li>
                  <span>
                    For more guidance, see the documentation or contact support.
                  </span>
                </li>
              </ol>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Place for possible advanced info or warnings if needed */}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export default InstanceSetupTab;
