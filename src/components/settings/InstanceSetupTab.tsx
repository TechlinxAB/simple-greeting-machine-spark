
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const InstanceSetupTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Setup</CardTitle>
        <CardDescription>
          This page guides you through managing your application backend on Supabase Cloud.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 text-sm text-muted-foreground">
          <p>
            Your backend is hosted on <strong>Supabase Cloud</strong> in a managed environment. 
            There are no server-side installations or deployments needed on your part.
          </p>
          <p>
            Edge functions are manually created and deployed via the Supabase Cloud dashboard.
            You do not need to use any CLI tools or GitHub Actions for deployment.
          </p>
          <p>
            To manage edge functions:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Log in to your Supabase project dashboard.
            </li>
            <li>
              Navigate to the "Edge Functions" section.
            </li>
            <li>
              Create, edit, and deploy your functions directly there.
            </li>
            <li>
              Manage your secrets under the "Settings & Secrets" tab for 
              environment variables required by your functions.
            </li>
          </ol>
          <p>
            All API keys and sensitive data should be stored securely as secrets in Supabase.
            Any connection details can be configured here.
          </p>
          <p>
            Your frontend connects to this backend via the configured Supabase URL and anon key,
            which can be customized in the application settings under Instance Setup if needed.
          </p>
          <p>
            If you want to switch to a self-hosted Supabase backend in the future, 
            you can update these connection settings without changing your frontend code.
          </p>
          <p>
            For more information, please refer to the{' '}
            <a
              href="https://supabase.com/docs/guides/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Supabase Edge Functions documentation
            </a>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstanceSetupTab;
