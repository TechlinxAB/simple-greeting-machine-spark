import { useState, useEffect } from "react";
import { environment } from "@/config/environment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clipboard } from "lucide-react";

export function InstanceSetupTab() {
  // Always initialize with current settings from localStorage or config/environment
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState(""); // Not used clientside, but let user input/store if needed

  useEffect(() => {
    // Use current values, prioritizing custom input from storage, then defaults
    setSupabaseUrl(localStorage.getItem("custom_supabase_url") || environment.supabase.url);
    setAnonKey(localStorage.getItem("custom_supabase_anon_key") || environment.supabase.anonKey);
    setServiceRoleKey(localStorage.getItem("custom_supabase_service_role_key") || "");
  }, []);
  
  // Show settings as determined by instance config
  const isCustomEnv = Boolean(localStorage.getItem("custom_supabase_url") && localStorage.getItem("custom_supabase_anon_key"));

  // Allow user to save changes
  const handleLinkSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !anonKey.trim()) {
      toast.error("Project URL and Anon/Public Key are required.");
      return;
    }
    localStorage.setItem("custom_supabase_url", supabaseUrl.trim());
    localStorage.setItem("custom_supabase_anon_key", anonKey.trim());
    if (serviceRoleKey.trim()) {
      localStorage.setItem("custom_supabase_service_role_key", serviceRoleKey.trim());
    }
    toast.success("Supabase configuration linked! Reloading the app...");
    setTimeout(() => window.location.reload(), 1200);
  };

  // Utility for copy-paste UX for all fields
  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 1: Create Supabase Project</h2>
        <ol className="list-decimal list-inside space-y-2 text-base mb-6">
          <li>
            Go to{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline font-medium"
            >
              Supabase.com <span aria-label="open in new tab" className="inline-block align-text-bottom">&#8599;</span>
            </a>
            <br />and sign up or log in
          </li>
          <li>
            Create a new project and note down the following information:
          </li>
        </ol>
        <form onSubmit={handleLinkSupabase} className="grid gap-6 max-w-lg">
          {/* Supabase Project URL */}
          <div>
            <label htmlFor="supabase-url" className="font-medium text-gray-700 flex items-center gap-2">
              Project URL
              <button
                type="button"
                title="Copy"
                onClick={() => handleCopy(supabaseUrl)}
                className="ml-2 text-muted-foreground hover:text-gray-700"
                tabIndex={-1}
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </label>
            <Input
              id="supabase-url"
              type="url"
              required
              inputMode="url"
              spellCheck={false}
              autoComplete="off"
              placeholder="https://your-project-id.supabase.co"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              className="mt-1"
            />
            <span className="text-xs text-muted-foreground ml-1">The Project URL from your Supabase project settings.</span>
          </div>
          {/* Supabase Anon/Public Key */}
          <div>
            <label htmlFor="supabase-anon" className="font-medium text-gray-700 flex items-center gap-2">
              Anon/Public Key
              <button
                type="button"
                title="Copy"
                onClick={() => handleCopy(anonKey)}
                className="ml-2 text-muted-foreground hover:text-gray-700"
                tabIndex={-1}
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </label>
            <Input
              id="supabase-anon"
              type="text"
              required
              spellCheck={false}
              autoComplete="off"
              placeholder="your-anon-key"
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              className="mt-1 font-mono"
            />
            <span className="text-xs text-muted-foreground ml-1">
              The anon/public key from your Supabase project’s API settings.
            </span>
          </div>
          {/* Supabase Service Role Key */}
          <div>
            <label htmlFor="supabase-service-role" className="font-medium text-gray-700 flex items-center gap-2">
              Service Role Key (for Edge Functions)
              <button
                type="button"
                title="Copy"
                onClick={() => handleCopy(serviceRoleKey)}
                className="ml-2 text-muted-foreground hover:text-gray-700"
                tabIndex={-1}
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </label>
            <Input
              id="supabase-service-role"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="your-service-role-key"
              value={serviceRoleKey}
              onChange={e => setServiceRoleKey(e.target.value)}
              className="mt-1 font-mono"
            />
            <span className="text-xs text-muted-foreground ml-1">
              Only required for advanced functionality like Edge Functions. Keep it secret!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" className="w-fit">Link Supabase</Button>
            {isCustomEnv && (
              <span className="text-green-700 text-xs">Currently using custom Supabase configuration.</span>
            )}
          </div>
        </form>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 2: Configure Database</h2>
        <ol className="list-decimal list-inside space-y-2 text-base mb-6">
          <li>
            Run the SQL scripts located in the <code>/sql</code> directory of this
            project against your Supabase database.
          </li>
          <li>
            These scripts set up the necessary tables, functions, and policies
            required for the application to function correctly.
          </li>
        </ol>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 3: Set up Storage Buckets</h2>
        <ol className="list-decimal list-inside space-y-2 text-base mb-6">
          <li>
            Create storage buckets for{" "}
            <code>avatars</code>, <code>application-logo</code>, and{" "}
            <code>news_images</code> in your Supabase project.
          </li>
          <li>
            Ensure that the appropriate policies are set up for each bucket to
            control access and permissions.
          </li>
        </ol>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 4: Configure Authentication</h2>
        <ol className="list-decimal list-inside space-y-2 text-base mb-6">
          <li>
            Enable email confirmations in your Supabase project’s authentication
            settings.
          </li>
          <li>
            Configure the necessary OAuth providers (e.g., Google, Facebook) if
            required.
          </li>
        </ol>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 5: Deploy Edge Functions</h2>
        <ol className="list-decimal list-inside space-y-2 text-base mb-6">
          <li>
            Deploy the Edge Functions located in the <code>/supabase/functions</code>{" "}
            directory of this project to your Supabase project.
          </li>
          <li>
            These functions provide additional server-side logic and functionality
            for the application.
          </li>
        </ol>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Additional Tips</h2>
        <ul className="list-disc list-inside space-y-2 text-base mb-6">
          <li>
            Make sure to keep your Supabase project URL and API keys secure and
            never expose them in client-side code.
          </li>
          <li>
            Regularly back up your Supabase database to prevent data loss.
          </li>
          <li>
            Monitor your Supabase project’s performance and usage to identify any
            potential issues.
          </li>
        </ul>
      </div>
    </div>
  );
}
