
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { environment } from "@/config/environment";
import { ExternalLink, Info } from "lucide-react";

// Helper to get custom Supabase config from localStorage
function getCustomSupabaseConfig() {
  let url = "";
  let anonKey = "";
  try {
    url = localStorage.getItem("custom_supabase_url") || "";
    anonKey = localStorage.getItem("custom_supabase_anon_key") || "";
  } catch (_e) {}
  return { url, anonKey };
}

export function InstanceSetupTab() {
  const [customConfig, setCustomConfig] = useState({ url: "", anonKey: "" });

  useEffect(() => {
    setCustomConfig(getCustomSupabaseConfig());
  }, []);

  // Determine current values
  const currentUrl = customConfig.url || environment.supabase.url;
  const currentKey = customConfig.anonKey || environment.supabase.anonKey;
  const currentRef = environment.supabase.projectRef;

  return (
    <div>
      <Card className="my-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Instance & Supabase Setup Guide
          </CardTitle>
          <CardDescription>
            Everything you need to know about connecting your app to Supabase and changing environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="font-semibold mb-2">1. Supabase Connection Settings</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>API URL: <span className="font-mono">{currentUrl}</span></li>
              <li>Anon Key: <span className="font-mono break-all">{currentKey.substring(0, 20)}...{currentKey.slice(-8)}</span></li>
              <li>Project Ref: <span className="font-mono">{currentRef}</span></li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Where do these come from?</span>
              <br />
              The app first checks <span className="font-mono">localStorage</span> for custom values. If none are set, it uses the standard Supabase cloud project.
            </div>
          </section>
          <Separator />
          
          <section>
            <h3 className="font-semibold mb-2">2. How to Switch to a Different Supabase Backend</h3>
            <ol className="list-decimal ml-5 text-sm space-y-2">
              <li>
                Open your self-hosted Supabase's dashboard and get the Project API URL and Anon Key.<br />
                <a href="https://supabase.com/dashboard/project/xojrleypudfrbmvejpow/settings/api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline">
                  Open Supabase API Config <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                In your browser's console, run:<br />
                <span className="bg-gray-100 p-1 font-mono text-xs rounded">
                  localStorage.setItem("custom_supabase_url", "YOUR_NEW_URL");
                  <br />
                  localStorage.setItem("custom_supabase_anon_key", "YOUR_NEW_ANON_KEY");
                </span>
                <div className="mt-1 text-xs text-gray-500">
                  Or use the environment configuration UI if provided.
                </div>
              </li>
              <li>
                Refresh the browser. The app now uses your self-hosted instance. To reset to defaults, remove those items from <span className="font-mono">localStorage</span>.
              </li>
            </ol>
            <div className="mt-2 text-xs">
              <span className="font-medium">Tip:</span> Always make sure your Project Ref is correct (it’s extracted from your Supabase URL).
            </div>
          </section>
          <Separator />
          
          <section>
            <h3 className="font-semibold mb-2">3. Edge Function Deployment</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>All edge functions are deployed automatically with code changes.</li>
              <li>No manual CLI commands or "Deploy" steps are needed—just make, save, and publish changes in the app.</li>
              <li>Functions are available at <span className="font-mono">https://{'{your-project-ref}'}.supabase.co/functions/v1/{"{function-name}"}</span></li>
              <li>
                <span className="font-medium text-yellow-700">Warning:</span> 
                If you change Supabase environment, test your edge functions as endpoints may differ!
              </li>
            </ul>
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Troubleshooting?</span> Check the
              {" "}
              <a href={`https://supabase.com/dashboard/project/xojrleypudfrbmvejpow/functions`} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">Supabase Edge Functions</a>
              {" "}
              dashboard for logs, or visit the <a className="underline text-blue-700" href="https://docs.lovable.dev/integrations/supabase/" target="_blank" rel="noopener noreferrer">Lovable Supabase Docs</a>.
            </div>
          </section>
          <Separator />
          
          <section>
            <h3 className="font-semibold mb-2">4. Security & Best Practices</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>Never store secret keys in your codebase—always use the provided secrets manager or UI fields.</li>
              <li>Switching backends is as easy as clearing your custom values from browser storage.</li>
              <li>All users will connect to the backend active in the environment—make sure migrations/data are synchronized.</li>
            </ul>
            <div className="mt-2 text-xs text-red-700 font-medium">
              Don’t share your Anon Key publicly. Only share if you know what you’re doing.
            </div>
          </section>
          <Separator />
          
          <section>
            <h3 className="font-semibold mb-2">5. Useful Links</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>
                <a href="https://supabase.com/dashboard/project/xojrleypudfrbmvejpow/settings/api" className="underline text-blue-700" target="_blank" rel="noopener noreferrer">
                  Supabase API Settings
                </a>
              </li>
              <li>
                <a href="https://supabase.com/dashboard/project/xojrleypudfrbmvejpow/functions" className="underline text-blue-700" target="_blank" rel="noopener noreferrer">
                  Edge Functions Dashboard
                </a>
              </li>
              <li>
                <a href="https://docs.lovable.dev/integrations/supabase/" className="underline text-blue-700" target="_blank" rel="noopener noreferrer">
                  Lovable Supabase Integration Docs
                </a>
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

export default InstanceSetupTab;

