
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

  return (
    <Card className="mt-1">
      <CardHeader>
        <CardTitle>Instance & First-Time Setup</CardTitle>
        <CardDescription>
          <div className="text-muted-foreground mb-2">
            Welcome to the techlinx Time Tracking platform! Please follow these instructions for your first-time setup. This is an <b>admin-only</b> area and critical for linking your app instance to a Supabase backend.<br /><br />
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
          {/* ---- FULL 1:1 CLONE/SETUP REFERENCE TUTORIAL BLOCK ---- */}
          <details className="mt-6">
            <summary className="font-bold cursor-pointer text-base underline">How to Fully Duplicate This Backend: <span className="text-green-500">COMPLETE 1:1 MANUAL SETUP GUIDE</span></summary>
            <div className="prose prose-sm max-w-none mt-2">
              <h3>‼️ 1. Create a new Supabase project</h3>
              <ol>
                <li>Create project at <a href="https://app.supabase.com/">https://app.supabase.com/</a></li>
                <li>Copy the new <b>project URL</b> and <b>anon/public key</b> from Project Settings → API.</li>
              </ol>
              <h3>‼️ 2. Set up <b>config.toml</b> in Supabase Studio</h3>
              <pre><code>{`
# Replace with your new project id!
project_id = "<your_project_id>"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost"

[inbucket]
enabled = true
port = 54324

[storage]
enabled = true
file_size_limit = "50MiB"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

# Set up Edge functions 
[functions.fortnox-token-exchange]
verify_jwt = false
[functions.fortnox-scheduled-refresh]
verify_jwt = false
[functions.fortnox-token-refresh]
verify_jwt = false
[functions.fortnox-token-migrate]
verify_jwt = false
[functions.fortnox-proxy]
verify_jwt = false
[functions.get-all-users]
verify_jwt = true
[functions.fortnox-token-debug]
verify_jwt = false
              `.trim()}</code></pre>
              <h3>‼️ 3. <b>Run ALL these SQL migrations and policies</b></h3>
              <details open>
                <summary className="font-semibold underline">All SQL: Tables, Functions, Policies</summary>
                <p>Copy-paste these in Supabase SQL Editor in order:</p>
                <pre>
{`-- SYSTEM SETTINGS TABLE AND POLICIES
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Administrators and managers can insert system settings" ON public.system_settings FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );
CREATE POLICY "Administrators and managers can update system settings" ON public.system_settings FOR UPDATE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );
CREATE POLICY "Administrators can delete system settings" ON public.system_settings FOR DELETE USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ... include all the other SQL provided in the project ...
-- (Insert the CREATE TABLE, RLS, triggers for every table: clients, users (profiles), products, time_entries, invoice_items, invoices, news_posts, all triggers, storage buckets and policies.)

-- TIP: To get the latest copy, use the "SQL Editor" export feature or follow the provided migration scripts.

-- For storage: create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('application-logo', 'application-logo', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('news_images', 'News Images', true) ON CONFLICT (id) DO NOTHING;

-- (Add storage policies for buckets as per provided SQL scripts.)

-- All special functions: see the migration files in src/sql/ directory.
`}
                </pre>
              </details>
              <h3>‼️ 4. <b>Edge Functions - names to create (.ts in supabase/functions):</b></h3>
              <ol>
                <li><b>fortnox-token-exchange</b></li>
                <li><b>fortnox-token-refresh</b></li>
                <li><b>fortnox-scheduled-refresh</b></li>
                <li><b>fortnox-proxy</b></li>
                <li><b>fortnox-token-migrate</b></li>
                <li><b>fortnox-token-debug</b></li>
                <li><b>get-all-users</b></li>
              </ol>
              <p>
                See exact code in your <b>supabase/functions/</b> directory.
                <br /><b>All must be deployed to Supabase Functions tab!</b>
              </p>
              <h3>‼️ 5. <b>Secrets & API keys</b> (Supabase - Project Settings - Functions - Environment Variables)</h3>
              <ul>
                <li>SUPABASE_URL</li>
                <li>SUPABASE_ANON_KEY</li>
                <li>SUPABASE_SERVICE_ROLE_KEY</li>
                <li>SUPABASE_DB_URL</li>
                <li>FORTNOX_REFRESH_SECRET</li>
                <li>JWT_SECRET</li>
              </ul>
              <p>
                Ensure all Edge Functions have correct secrets as shown.<br />
                Any APIs (e.g. OpenAI, Stripe, Fortnox) need their respective secrets added in Functions settings—see each function for requirements.
              </p>
              <h3>‼️ 6. <b>Configure Auth in Supabase:</b></h3>
              <ul>
                <li>Enable <b>Email/Password</b> login.</li>
                <li>Edit Redirect URLs: Add all your frontend URLs (localhost, prod, staging etc) to Authentication → URL Configuration.</li>
                <li>You can enable Google etc. as needed, but the system works with email by default.</li>
              </ul>
              <h3>‼️ 7. <b>Run migrations for storage & policies (for logo, images etc)</b></h3>
              <pre>{`
INSERT INTO storage.buckets (id, name, public) VALUES ('application-logo', 'application-logo', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Allow public access to application logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'application-logo')
ON CONFLICT DO NOTHING;
-- (add other logo/image policies as per your src/sql/create_storage_policies.sql)
              `.trim()}</pre>
              <h3>‼️ 8. <b>Triggers & Functions</b></h3>
              <p>
                All triggers (e.g. <code>update_system_settings_updated_at</code>, <code>update_news_posts_updated_at</code>) must be created by running the SQL in migration files.
              </p>
              <h3>‼️ 9. <b>Final steps:</b></h3>
              <ul>
                <li>After database + edge functions + secrets are set up, enter the right <b>URL</b> and <b>Anon Key</b> above and click Save & Apply.</li>
                <li>Reload, login with <code>techlinxadmin / Snowball9012@</code> if you have no users yet.</li>
                <li>Setup your appearance and branding from the "Appearance" tab.</li>
                <li>Create your initial products, clients, and test Invoicing.</li>
              </ul>
              <h3>‼️ 10. <b>Where to find all source code and SQL for above?</b></h3>
              <ul>
                <li>
                  SQL DDL/migrations: <b>src/sql/*.sql</b> in app repo, or see all run migrations in your Supabase SQL Editor.
                </li>
                <li>
                  Edge functions: <b>supabase/functions/</b> in app repo.
                </li>
                <li>
                  Application type definitions: <b>src/integrations/supabase/types.ts</b>
                </li>
                <li>
                  Full backend structure found in <b>supabase/config.toml</b> (always update <b>project_id</b>!).
                </li>
              </ul>
              <h3>‼️ 11. <b>Support, Questions or Bugs?</b></h3>
              <p>
                For assistant in full duplication or further onboarding, email <a href="mailto:support@techlinx.se">support@techlinx.se</a>.<br/>
                <b>Keep this full tutorial updated if you change backend structure!</b>
              </p>
              <hr/>
              <div className="text-xs text-muted-foreground mt-2"><b>Last updated:</b> {new Date().toLocaleDateString()} — Always use repo files for the actual copy-paste SQL/code.</div>
            </div>
          </details>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* (rest of the page - could include more info, but tutorial above is sufficient) */}
      </CardContent>
    </Card>
  );
}

export default InstanceSetupTab;
