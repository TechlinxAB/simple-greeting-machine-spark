
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Info, Link, Code } from "lucide-react";

// These SQL snippets must be updated whenever you change your DB setup!
const FULL_SQL_SETUP = `-- SYSTEM SETTINGS TABLE AND RLS
-- ...copy from your src/sql/create_system_settings.sql and other custom migrations...

-- NEWS POSTS TABLE, IMAGE BUCKET, AND RLS
-- ...copy from src/sql/create_news_posts.sql...

-- STORAGE BUCKETS AND POLICIES
-- ...copy from src/sql/create_storage_buckets.sql and src/sql/create_storage_policies.sql...

-- TOKEN REFRESH LOGS TABLE AND RLS
-- ...copy from supabase/migrations/20250419_add_token_refresh_logs.sql...

-- FORTNOX TOKEN SCHEDULED REFRESH
-- ...copy from supabase/migrations/20250419_add_fortnox_token_refresh_cron.sql and related...
`;

const REQUIRED_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FORTNOX_REFRESH_SECRET",
  "JWT_SECRET",
];

export function InstanceSetupTab() {
  const [sqlCopied, setSqlCopied] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem("custom_supabase_url") || ""
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    localStorage.getItem("custom_supabase_anon_key") || ""
  );

  // Tutorial for full instance setup (may update for your case)
  const HOWTO = `
# How to deploy this SaaS (Step by Step)

1. **Deploy the Frontend**
    - Clone the repo and run \`npm install\`.
    - Set up your hosting (Vercel, Netlify, or any static hosting).
    - Configure the Supabase URL and Anon Key using the fields below.
2. **Set up Supabase Backend**
    - Create a new Supabase project [https://app.supabase.com/](https://app.supabase.com/).
    - Go to the SQL Editor and run all the SQL below in order.
    - Add storage buckets under [Storage](https://app.supabase.com/project/_/storage).
    - Set all required Edge Function secrets.
    - Deploy all Edge Functions from \`/supabase/functions\`.
    - Copy the required secrets into Supabase (under Settings > Secrets):
      ${REQUIRED_SECRETS.map(secret => `        - ${secret}`).join('\n')}
    - Enable email authentication and configure email sending.
3. **Connect the Frontend**
    - Paste your Supabase URL and Anon Key below.
    - Save & reload the app.
4. **Verify Everything**
    - Create an account to become the first admin.
    - Go to settings to confirm branding/theme is working.
    - Test integrations (Fortnox, storage, etc).
`;

  // Update env config for the current session/localstorage
  const handleSave = () => {
    localStorage.setItem("custom_supabase_url", supabaseUrl);
    localStorage.setItem("custom_supabase_anon_key", supabaseAnonKey);
    toast.success("Supabase config saved. Reload the app to apply changes.");
  };

  const handleCopySql = async () => {
    await navigator.clipboard.writeText(FULL_SQL_SETUP);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 1500);
  };

  return (
    <TabsContent value="setup">
      <Card>
        <CardHeader>
          <CardTitle>Instance Setup / Migration Help</CardTitle>
          <CardDescription>
            Tools, SQL, and a step-by-step tutorial to deploy a new instance or migrate to a new Supabase backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <section className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <Info className="h-5 w-5" /> 
              Full Setup Guide
            </h3>
            <pre className="whitespace-pre-wrap rounded bg-muted/30 p-4 text-sm mb-4">{HOWTO}</pre>
          </section>
          <section className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <Link className="h-5 w-5" />
              Supabase Backend Connection
            </h3>
            <div className="space-y-3">
              <Label htmlFor="supabase-url">Supabase Project URL</Label>
              <Input
                id="supabase-url"
                type="text"
                placeholder="https://your-project-ref.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
              />
              <Label htmlFor="supabase-anon">Supabase Anon/Public Key</Label>
              <Input
                id="supabase-anon"
                type="text"
                placeholder="Supabase Anon Key"
                value={supabaseAnonKey}
                onChange={e => setSupabaseAnonKey(e.target.value)}
              />
              <Button onClick={handleSave}>
                Save & Reload Required
              </Button>
              <p className="text-muted-foreground text-xs mt-2">
                Enter your target backend to switch between environments. You must reload the app for it to take effect.
              </p>
            </div>
          </section>
          <section className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <Code className="h-5 w-5" />
              Full SQL Setup Commands
              <Button
                type="button"
                size="sm"
                className="ml-2"
                onClick={handleCopySql}
                variant="outline"
              >
                {sqlCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {sqlCopied ? "Copied!" : "Copy"}
              </Button>
            </h3>
            <pre className="bg-muted/40 rounded p-4 overflow-x-auto text-xs max-h-80">{FULL_SQL_SETUP}</pre>
          </section>
          <section className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
              <Info className="h-5 w-5" />
              List of Required Secrets
            </h3>
            <ul className="list-disc pl-6 text-sm">
              {REQUIRED_SECRETS.map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground mt-2">
              Set these in the Supabase Console under <b>Project &rarr; Settings &rarr; Secrets</b>.
            </div>
          </section>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
