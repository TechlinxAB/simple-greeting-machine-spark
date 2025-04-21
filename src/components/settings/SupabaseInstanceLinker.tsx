
import React, { useState, useEffect } from "react";
import { Card, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { testSupabaseConnection, saveCustomEnvironment, resetToDefaultEnvironment, initializeCustomEnvironment } from "@/lib/setupEnvironment";
import { environment } from "@/config/environment";
import { AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const SupabaseInstanceLinker = () => {
  const [customUrl, setCustomUrl] = useState("");
  const [customAnonKey, setCustomAnonKey] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);
  const [currentConnection, setCurrentConnection] = useState({
    url: "",
    projectRef: "",
    isCustom: false
  });

  useEffect(() => {
    // Initialize with current environment values
    const env = initializeCustomEnvironment();
    const currentUrlValue = environment.supabase.url;
    const projectRef = environment.supabase.projectRef;
    
    setIsCustom(env.isCustom);
    setCustomUrl(env.url || "");
    setCustomAnonKey(env.anonKey || "");
    setCurrentConnection({
      url: currentUrlValue,
      projectRef: projectRef,
      isCustom: env.isCustom
    });
  }, []);

  const maskAnonKey = (key: string) => {
    if (!key) return "";
    // Only show first 6 and last 4 characters
    if (key.length <= 10) return "********";
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const ok = await testSupabaseConnection(customUrl.trim(), customAnonKey.trim());
    setTestResult(ok);
    toast[ok ? "success" : "error"](ok ? "Connection successful!" : "Failed to connect to Supabase.");
    setTesting(false);
  };

  const handleSave = () => {
    if (!customUrl.trim() || !customAnonKey.trim()) {
      toast.error("Please enter both a URL and Anon Key.");
      return;
    }
    saveCustomEnvironment(customUrl.trim(), customAnonKey.trim());
    setIsCustom(true);
    setCurrentConnection({
      url: customUrl.trim(),
      projectRef: customUrl.trim().split(".")[0].replace("https://", ""),
      isCustom: true
    });
    toast.success("Supabase instance linked! Reloading…");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleReset = () => {
    resetToDefaultEnvironment();
    setIsCustom(false);
    setCustomUrl("");
    setCustomAnonKey("");
    toast.success("Reset to default Supabase instance. Reloading…");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <Card className="mb-6 border-2 border-primary/30">
      <CardContent className="p-4 space-y-4">
        <div>
          <CardTitle>Link Custom Supabase Instance</CardTitle>
          <CardDescription>
            Connect this frontend to a different Supabase backend by entering a custom API URL and Anon Key.
          </CardDescription>
        </div>

        <div className="p-3 bg-muted/50 rounded-md space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-primary" />
            <span className="font-medium">Current Connection</span>
          </div>
          <div className="text-sm flex items-center gap-1.5">
            <span className="font-semibold text-muted-foreground">Project:</span> 
            <code className="bg-background px-1 py-0.5 rounded text-xs">{currentConnection.projectRef}</code>
            {currentConnection.isCustom && (
              <Badge variant="outline" className="text-xs h-5">Custom</Badge>
            )}
          </div>
          <div className="text-sm">
            <span className="font-semibold text-muted-foreground">URL:</span> 
            <code className="bg-background px-1 py-0.5 rounded text-xs ml-1">{currentConnection.url.replace(/^https:\/\//, '')}</code>
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <div className="space-y-2">
          <Label htmlFor="custom-supabase-url">Supabase Project URL</Label>
          <Input
            id="custom-supabase-url"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="https://YOUR-project-id.supabase.co"
            autoComplete="off"
            disabled={testing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-supabase-anon">Supabase Anon/Public Key</Label>
          <Input
            id="custom-supabase-anon"
            value={customAnonKey}
            onChange={e => setCustomAnonKey(e.target.value)}
            placeholder="Enter your project's anon key"
            autoComplete="off"
            disabled={testing}
            type="password"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testing || !customUrl.trim() || !customAnonKey.trim()}
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={testing || !customUrl.trim() || !customAnonKey.trim()}
          >
            Save & Use
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={testing || !isCustom}
          >
            Reset to Default
          </Button>
          {testResult === true && (
            <span className="text-green-600 text-sm px-2">✓ Connected</span>
          )}
          {testResult === false && (
            <span className="text-destructive text-sm px-2">✗ Failed</span>
          )}
        </div>
        <div className="text-xs pt-2 italic text-muted-foreground">
          You can always reset to the built-in hosted project. Changing these settings affects only your browser.
        </div>
      </CardContent>
    </Card>
  );
};
