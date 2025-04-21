import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEFAULT_SUPABASE_URL = "https://xojrleypudfrbmvejpow.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc";

// Instance setup tab: show config fields + tutorial
export function InstanceSetupTab() {
  // Local state for Supabase config
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [saving, setSaving] = useState(false);

  // On mount, load current config from localStorage
  useEffect(() => {
    setSupabaseUrl(localStorage.getItem("custom_supabase_url") || DEFAULT_SUPABASE_URL);
    setSupabaseAnonKey(localStorage.getItem("custom_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY);
  }, []);

  // Function to save and apply config
  const saveConfig = () => {
    if (!supabaseUrl.startsWith("https://") || !supabaseAnonKey || supabaseAnonKey.length < 30) {
      toast.error("Please enter a valid Supabase URL and anon key.");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem("custom_supabase_url", supabaseUrl.trim());
      localStorage.setItem("custom_supabase_anon_key", supabaseAnonKey.trim());
      toast.success("Supabase configuration saved! Reloading...");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast.error("Failed to save Supabase config: " + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  // FULL tutorial, only point 1 changed!
  return (
    <Card className="mt-1">
      <CardHeader>
        <CardTitle>Instance & First-Time Setup</CardTitle>
        <CardDescription>
          <div className="text-muted-foreground mb-2">
            Welcome to the techlinx Time Tracking platform! Please follow these instructions for your first-time setup. This is an **admin-only** area and critical for linking your app instance to a Supabase backend.<br /><br />
            <b>1. Enter your Supabase Project URL and Anon Key here:</b>
            <div className="flex flex-col md:flex-row gap-2 mt-2 mb-2">
              <Input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="Supabase URL"
                className="w-full md:max-w-xs"
                autoComplete="off"
                aria-label="Supabase URL"
              />
              <Input
                type="text"
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="Supabase Anon Key"
                className="w-full md:max-w-xl"
                autoComplete="off"
                aria-label="Supabase Anon Key"
              />
              <Button onClick={saveConfig} disabled={saving} className="w-full md:w-auto">
                {saving ? "Saving..." : "Save & Apply"}
              </Button>
            </div>
            <small className="text-xs text-gray-500">You can find these in your Supabase project: Project Settings → API</small>
            <br /><br />
            2. <b>Login with <code>techlinxadmin</code> / <code>Snowball9012@</code> (as shown above) to access this setup page if not yet linked to a backend.</b>
            <br />
            3. Once a valid backend is connected, you can create additional users, clients, products, and manage invoicing from the rest of the app.
            <br />
            4. This page is always available, and you can use it later to change or switch Supabase projects (be careful as users/data will change instantly).
            <br /><br />
            <hr className="my-2" />
            <div className="font-semibold mb-1 underline">Full Setup Tutorial</div>
            <ol className="list-decimal ml-6 text-left space-y-2">
              <li>Enter your Supabase Project URL and Anon Key above and click "Save & Apply".</li>
              <li>Once connected, register a new user, or log in with your main credentials.</li>
              <li>As an administrator, configure instance branding under the Appearance tab.</li>
              <li>Create initial product & activity records under the Products tab.</li>
              <li>Add your first client under Clients.</li>
              <li>Test time tracking and create your first invoice.</li>
              <li>If integrating with Fortnox, go to Integrations and follow OAuth flow.</li>
              <li>Review Users/Permissions under Administration & grant Manager/Admin as needed.</li>
              <li>You're ready to use the full system!</li>
            </ol>
            <div className="text-xs mt-2 text-muted-foreground">
              Need help? Contact <a href="mailto:support@techlinx.se" className="underline">support@techlinx.se</a>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* (rest of the page - could include more info, but tutorial above is sufficient) */}
      </CardContent>
    </Card>
  );
}

export default InstanceSetupTab;
