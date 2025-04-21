
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { environment } from "@/config/environment";
import { testSupabaseConnection, reloadSupabaseEnvironment, saveCustomEnvironment, resetToDefaultEnvironment } from "@/lib/setupEnvironment";

export function SupabaseInstanceConfig() {
  // Get current values either from custom (localStorage) or default environment
  const [currentUrl, setCurrentUrl] = useState(environment.supabase.url);
  const [currentAnonKey, setCurrentAnonKey] = useState(environment.supabase.anonKey);
  const [currentProjectRef, setCurrentProjectRef] = useState(environment.supabase.projectRef);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [inputAnonKey, setInputAnonKey] = useState(currentAnonKey);
  const [inputProjectRef, setInputProjectRef] = useState(currentProjectRef);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);

  // Load values from localStorage (if present) on mount
  useEffect(() => {
    const customUrl = localStorage.getItem("custom_supabase_url");
    const customAnonKey = localStorage.getItem("custom_supabase_anon_key");
    const getProjectRef = () => {
      try {
        const match = (customUrl || "").match(/https:\/\/([^.]+)\.supabase\.co/);
        if (match && match[1]) return match[1];
      } catch {}
      return environment.supabase.projectRef;
    };

    if (customUrl && customAnonKey) {
      setCurrentUrl(customUrl);
      setCurrentAnonKey(customAnonKey);
      setCurrentProjectRef(getProjectRef());
      setInputUrl(customUrl);
      setInputAnonKey(customAnonKey);
      setInputProjectRef(getProjectRef());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When switching values, reflect into input fields
  useEffect(() => {
    setInputUrl(currentUrl);
    setInputAnonKey(currentAnonKey);
    setInputProjectRef(currentProjectRef);
  }, [currentUrl, currentAnonKey, currentProjectRef]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await testSupabaseConnection(inputUrl, inputAnonKey);
      setTestResult(ok);
      if (ok) toast.success("Connection successful! This project can be linked.");
      else toast.error("Connection test failed. Check your values and try again.");
    } catch {
      toast.error("Error testing connection.");
      setTestResult(false);
    }
    setIsTesting(false);
  };

  const handleSave = () => {
    if (!inputUrl.startsWith("https://") || !inputUrl.includes("supabase.co")) {
      toast.error("Project URL must be a valid Supabase project endpoint.");
      return;
    }
    if (!inputAnonKey || inputAnonKey.length < 20) {
      toast.error("Anon/public key does not look valid.");
      return;
    }
    saveCustomEnvironment(inputUrl, inputAnonKey);
    toast.success("Supabase config saved. Reloading...");
    setTimeout(() => reloadSupabaseEnvironment(), 700);
  };

  const handleReset = () => resetToDefaultEnvironment();

  const hasCustom = !!localStorage.getItem("custom_supabase_url");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Instance</CardTitle>
        <CardDescription>
          Connect your own Supabase project by pasting its credentials below. After creating a new Supabase project, 
          copy the values (<b>Project URL</b> and <b>Anon/public key</b>) from your Supabase dashboard.<br />
          <span className="text-xs text-muted-foreground">
            (Current values are always shown. If you want to return to the default configuration, use "Reset to Default".)
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 py-4">
        <div>
          <Label htmlFor="supabase-url">Project URL <span className="text-xs text-muted-foreground">(Current)</span></Label>
          <Input
            id="supabase-url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="https://yourproject.supabase.co"
            autoComplete="off"
            className={inputUrl !== currentUrl ? "border-warning" : ""}
          />
        </div>
        <div>
          <Label htmlFor="supabase-anonkey">Anon/Public Key <span className="text-xs text-muted-foreground">(Current)</span></Label>
          <Input
            id="supabase-anonkey"
            value={inputAnonKey}
            onChange={e => setInputAnonKey(e.target.value)}
            placeholder="Supabase anon/public key"
            autoComplete="off"
            className={inputAnonKey !== currentAnonKey ? "border-warning" : ""}
          />
        </div>
        <div>
          <Label htmlFor="supabase-projectref">Project Ref (Auto, derived)</Label>
          <Input
            id="supabase-projectref"
            value={inputProjectRef}
            onChange={e => setInputProjectRef(e.target.value)}
            disabled
            className="bg-muted cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" className="flex gap-2" onClick={handleTestConnection} disabled={isTesting}>
            <RefreshCw className="w-4 h-4" />
            {isTesting ? "Testing..." : "Test Connection"}
          </Button>
          <Button
            type="button"
            className="flex gap-2"
            onClick={handleSave}
            disabled={isTesting}
            variant="default"
          >
            <Save className="w-4 h-4" />
            Link Supabase Project
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            disabled={!hasCustom || isTesting}
          >
            Reset to Default
          </Button>
          {testResult === true && <span className="text-green-600 text-sm ml-2">✓ Connected</span>}
          {testResult === false && <span className="text-red-600 text-sm ml-2">✗ Failed</span>}
        </div>
        <Separator />
        <div className="text-xs text-muted-foreground">
          <b>How does this work?</b> When you link a new Supabase project, these values are immediately stored and the app reloads to use your custom backend.
          To return to the default hosted backend, just click "Reset to Default".
        </div>
      </CardContent>
    </Card>
  );
}

