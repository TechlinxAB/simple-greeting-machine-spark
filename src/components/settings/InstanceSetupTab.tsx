import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clipboard, Code, Database, FileCode, Server, Settings } from "lucide-react";
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InstanceSetupTab() {
  const [activeTab, setActiveTab] = useState("setup");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(elementId);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CodeBlock = ({ id, language, code }: { id: string, language: string, code: string }) => (
    <div className="relative mt-2 mb-4">
      <div className="bg-muted text-muted-foreground p-4 rounded-md font-mono text-sm overflow-x-auto">
        <pre className="whitespace-pre">{code}</pre>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        <Clipboard className="h-3.5 w-3.5 mr-1" />
        {copied === id ? "Copied!" : "Copy"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Instance Setup</h2>
        <Badge variant="outline" className="ml-2">
          <Server className="h-3.5 w-3.5 mr-1" />
          Supabase Cloud
        </Badge>
      </div>
      
      <p className="text-muted-foreground">
        Complete guide for setting up your own instance of the app with Supabase as the backend.
        This page contains everything you need to create an exact duplicate of the backend.
      </p>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          To use this guide, you'll need to create a Supabase project first at{" "}
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            supabase.com
          </a>
        </AlertDescription>
      </Alert>

      <Tabs 
        defaultValue="setup" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="setup">
            <Server className="h-4 w-4 mr-2" /> 
            Setup Process
          </TabsTrigger>
          <TabsTrigger value="edge-functions">
            <FileCode className="h-4 w-4 mr-2" /> 
            Edge Functions
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" /> 
            Database Setup
          </TabsTrigger>
        </TabsList>

        {/* SETUP PROCESS TAB */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Setup Process</CardTitle>
              <CardDescription>
                Follow these steps to set up your own instance of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">1. Create a Supabase Project</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a new Supabase project at{" "}
                    <a 
                      href="https://supabase.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      supabase.com
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Write down your project's URL and anon key, as you'll need them later.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">2. Set Up Database Schema</h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate to the "SQL Editor" in your Supabase dashboard and run the SQL scripts provided in the Database Setup tab.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Execute each SQL block one by one to create all required tables, functions, and triggers.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">3. Create Edge Functions</h3>
                  <p className="text-sm text-muted-foreground">
                    Go to the "Edge Functions" section in your Supabase dashboard and create the following edge functions:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>fortnox-token-exchange</li>
                    <li>fortnox-token-refresh</li>
                    <li>fortnox-token-migrate</li>
                    <li>fortnox-token-debug</li>
                    <li>fortnox-proxy</li>
                    <li>fortnox-scheduled-refresh</li>
                    <li>get-all-users</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Copy the code from the Edge Functions tab for each function.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">4. Add Required Secrets</h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate to "Settings" > "API" in your Supabase dashboard to find your service role key.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Then go to "Settings" > "Edge Functions" and add the following secrets:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>SUPABASE_URL (your project URL)</li>
                    <li>SUPABASE_ANON_KEY (your anon key)</li>
                    <li>SUPABASE_SERVICE_ROLE_KEY (your service role key)</li>
                    <li>FORTNOX_REFRESH_SECRET (create a random string for this)</li>
                    <li>JWT_SECRET (create a random string for this)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">5. Set Up Cron Job for Token Refresh</h3>
                  <p className="text-sm text-muted-foreground">
                    Run the SQL script to create a scheduled job for refreshing Fortnox tokens (in the Database Setup tab, last section).
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">6. Configure Frontend</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your application's configuration with your Supabase project details.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">7. Testing</h3>
                  <p className="text-sm text-muted-foreground">
                    Test that everything works:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Create a user account</li>
                    <li>Connect to Fortnox</li>
                    <li>Create a test client</li>
                    <li>Create a test time entry</li>
                    <li>Create a test invoice</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDGE FUNCTIONS TAB */}
        <TabsContent value="edge-functions">
          <Card>
            <CardHeader>
              <CardTitle>Edge Functions</CardTitle>
              <CardDescription>
                Copy these edge function definitions to your Supabase dashboard Edge Functions section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fortnox-token-exchange">
                <TabsList className="mb-4 flex-wrap h-auto py-1">
                  <TabsTrigger value="fortnox-token-exchange">token-exchange</TabsTrigger>
                  <TabsTrigger value="fortnox-token-refresh">token-refresh</TabsTrigger>
                  <TabsTrigger value="fortnox-token-migrate">token-migrate</TabsTrigger>
                  <TabsTrigger value="fortnox-token-debug">token-debug</TabsTrigger>
                  <TabsTrigger value="fortnox-proxy">proxy</TabsTrigger>
                  <TabsTrigger value="fortnox-scheduled-refresh">scheduled-refresh</TabsTrigger>
                  <TabsTrigger value="get-all-users">get-all-users</TabsTrigger>
                  <TabsTrigger value="cors">_shared/cors.ts</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <TabsContent value="fortnox-token-exchange" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-token-exchange/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function handles OAuth token exchange with Fortnox.
                    </p>
                    <CodeBlock
                      id="fortnox-token-exchange"
                      language="typescript"
                      code={`// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Function to check if a value is a valid JWT
function isValidJwtFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Function to validate refresh token
function isValidRefreshToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

// Simple delay function for async operations
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to compute SHA-256 hash for token validation
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Main handler function
Deno.serve(async (req) => {
  // Generate a unique session ID for tracing this exchange session
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(\`[\${sessionId}] Handling CORS preflight request\`);
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log(\`[\${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====\`);
  console.log(\`[\${sessionId}] Request method:\`, req.method);
  console.log(\`[\${sessionId}] Request headers:\`, req.headers);
  console.log(\`[\${sessionId}] Content-Type:\`, req.headers.get("Content-Type"));
  
  try {
    // Parse the request body
    let body;
    try {
      const rawText = await req.text();
      console.log(\`[\${sessionId}] Raw JSON body:\`, rawText);
      body = JSON.parse(rawText);
      console.log(\`[\${sessionId}] 📦 Parsed JSON body:\`, {
        client_id: body.client_id ? \`\${body.client_id.substring(0, 10)}...\` : undefined,
        client_secret: body.client_secret ? '•••' : undefined,
        code: body.code ? \`\${body.code.substring(0, 10)}...\` : undefined,
        redirect_uri: body.redirect_uri
      });
    } catch (e) {
      console.error(\`[\${sessionId}] Error parsing request body:\`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required parameters
    if (!body.code || !body.client_id || !body.client_secret || !body.redirect_uri) {
      console.error(\`[\${sessionId}] Missing required parameters:\`, {
        hasCode: !!body.code,
        hasClientId: !!body.client_id,
        hasClientSecret: !!body.client_secret,
        hasRedirectUri: !!body.redirect_uri
      });
      
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log key info for debugging
    console.log(\`[\${sessionId}] 🔄 Sending request to Fortnox:\`);
    console.log(\`[\${sessionId}] URL:\`, FORTNOX_TOKEN_URL);
    console.log(\`[\${sessionId}] Method: POST\`);
    console.log(\`[\${sessionId}] Headers:\`, {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic •••"
    });
    console.log(\`[\${sessionId}] Body (form data):\`, \`grant_type=authorization_code&code=\${body.code}&redirect_uri=\${encodeURIComponent(body.redirect_uri)}\`);
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = \`\${body.client_id}:\${body.client_secret}\`;
    const base64Auth = btoa(authString);
    const authHeader = \`Basic \${base64Auth}\`;
    
    // Make request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: formData
    });
    
    console.log(\`[\${sessionId}] 📬 Fortnox responded with status:\`, response.status);
    
    // Get response body as text
    const responseText = await response.text();
    console.log(\`[\${sessionId}] 🧾 Fortnox response body:\`, responseText);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(\`[\${sessionId}] Error parsing Fortnox response:\`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Invalid response from Fortnox' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(\`[\${sessionId}] Fortnox API returned error status \${response.status}:\`, responseData);
      return new Response(
        JSON.stringify(responseData),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(\`[\${sessionId}] Missing access_token in Fortnox response:\`, responseData);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Missing access token in response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate token formats
    const accessTokenValid = isValidJwtFormat(responseData.access_token);
    const refreshTokenValid = isValidRefreshToken(responseData.refresh_token);
    
    console.log(\`[\${sessionId}] Token validation:\`, {
      accessTokenValid,
      refreshTokenValid,
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token ? responseData.refresh_token.length : 0
    });
    
    if (!accessTokenValid) {
      console.error(\`[\${sessionId}] Invalid access token format received from Fortnox\`);
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Invalid access token format' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!refreshTokenValid) {
      console.warn(\`[\${sessionId}] Invalid or missing refresh token format from Fortnox\`);
      // We continue anyway since the access token is valid
    }
    
    // Log token details for debugging
    console.log(\`[\${sessionId}] 🔑 Received tokens:\`, {
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token?.length || 0,
      accessTokenPreview: \`\${responseData.access_token.substring(0, 20)}...\${responseData.access_token.substring(responseData.access_token.length - 20)}\`,
      refreshTokenPreview: responseData.refresh_token ? 
        \`\${responseData.refresh_token.substring(0, 10)}...\${responseData.refresh_token.substring(responseData.refresh_token.length - 5)}\` : 
        'none'
    });
    
    // Compute hashes for verification
    const accessTokenHash = await computeHash(responseData.access_token);
    const refreshTokenHash = responseData.refresh_token ? await computeHash(responseData.refresh_token) : 'no-refresh-token';
    
    console.log(\`[\${sessionId}] 🔐 Token hashes for verification:\`, {
      accessTokenHash: \`\${accessTokenHash.substring(0, 10)}...\`,
      refreshTokenHash: \`\${refreshTokenHash.substring(0, 10)}...\`,
    });
    
    // Return successful response with tokens and hashes for verification
    return new Response(
      JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        token_type: responseData.token_type,
        expires_in: responseData.expires_in,
        _debug: {
          session_id: sessionId,
          access_token_length: responseData.access_token.length,
          refresh_token_length: responseData.refresh_token?.length || 0,
          access_token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(\`[\${sessionId}] Unexpected error:\`, error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="fortnox-token-refresh" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-token-refresh/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function refreshes Fortnox OAuth tokens.
                    </p>
                    <CodeBlock
                      id="fortnox-token-refresh"
                      language="typescript"
                      code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment (for database access)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Starting Fortnox token refresh process");
    
    // Get client credentials - either from request or directly from database
    let requestData;
    let clientId;
    let clientSecret;
    let refreshToken;
    
    // Two authentication modes:
    // 1. API key for system-level refresh (cron job or scheduled task)
    // 2. Direct request with provided credentials (from frontend)
    
    // Check for API key authentication first (system-level access)
    const apiKey = req.headers.get("x-api-key");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");
    
    console.log("Authentication check:", {
      apiKeyPresent: !!apiKey,
      validKeyPresent: !!validKey,
      hasAuthHeader: !!req.headers.get("Authorization"),
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
      requestMethod: req.method,
      contentType: req.headers.get("content-type"),
      headersPresent: Array.from(req.headers.keys()),
    });
    
    const isSystemAuthenticated = !!validKey && apiKey === validKey;

    // Try Supabase auth for logged-in users
    let userAuthenticated = false;

    if (!isSystemAuthenticated && req.headers.get("Authorization")?.startsWith("Bearer ")) {
      const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: req.headers.get("Authorization")! } }
      });

      const { data: authData, error: authError } = await userSupabase.auth.getUser();

      if (authData?.user && !authError) {
        userAuthenticated = true;
        console.log("Authenticated via Supabase JWT:", authData.user.id);
      } else {
        console.warn("Supabase auth failed:", authError);
      }
    }

    // Final check
    if (!isSystemAuthenticated && !userAuthenticated) {
      console.error("Unauthorized request: missing or invalid API key or user token");
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing or invalid API key or user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If this is a system-level authenticated request, get credentials from database
    if (isSystemAuthenticated) {
      console.log("System-level authentication successful");
      
      // Initialize Supabase client with service role for direct database access
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or service key not configured");
        return new Response(
          JSON.stringify({ 
            error: "server_configuration_error", 
            message: "Server is not properly configured for system-level refresh" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Create Supabase client with admin privileges
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get Fortnox credentials from system_settings table
      console.log("Retrieving Fortnox credentials from database");
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      if (settingsError || !settingsData) {
        console.error("Error retrieving Fortnox credentials:", settingsError);
        return new Response(
          JSON.stringify({ 
            error: "database_error", 
            message: "Failed to retrieve Fortnox credentials from database",
            details: settingsError
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Extract credentials from settings
      const credentials = settingsData.settings;
      
      if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        console.error("Invalid or incomplete credentials in database");
        return new Response(
          JSON.stringify({ 
            error: "invalid_credentials", 
            message: "Invalid or incomplete Fortnox credentials in database" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from database credentials
      clientId = credentials.clientId;
      clientSecret = credentials.clientSecret;
      refreshToken = credentials.refreshToken;
      
      console.log("Successfully retrieved credentials from database");
    } 
    // Otherwise, parse credentials from request body
    else {
      // Validate API key if the environment has one configured
      if (validKey && !isSystemAuthenticated) {
        console.error("Invalid API key provided", {
          apiKeyProvided: apiKey ? \`\${apiKey.substring(0, 3)}...\${apiKey.substring(apiKey.length - 3)}\` : 'missing',
          validKeyHint: validKey ? \`\${validKey.substring(0, 3)}...\${validKey.substring(validKey.length - 3)}\` : 'missing',
        });
        
        return new Response(
          JSON.stringify({ 
            error: "unauthorized", 
            message: "Invalid API key provided"
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // If no API key is required (or not configured), parse the request body
      try {
        requestData = await req.json();
        console.log("Parsing request data:", {
          hasRefreshToken: !!requestData.refresh_token,
          hasClientId: !!requestData.client_id,
          hasClientSecret: !!requestData.client_secret
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Validate required fields
      if (!requestData.client_id || !requestData.client_secret || !requestData.refresh_token) {
        const missingFields = [];
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        
        console.error(\`Missing required parameters: \${missingFields.join(', ')}\`);
        
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters",
            details: {
              missing: missingFields
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from request body
      clientId = requestData.client_id;
      clientSecret = requestData.client_secret;
      refreshToken = requestData.refresh_token;
    }
    
    // Log token refresh attempt (obfuscate sensitive data)
    console.log("Processing token refresh with:", {
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      refreshTokenLength: refreshToken.length,
      clientIdPrefix: clientId.substring(0, 3) + '...',
      refreshTokenPrefix: refreshToken.substring(0, 3) + '...',
    });
    
    // Prepare the form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    
    console.log("Making token refresh request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
      
      // Log the structure of the response (without revealing sensitive data)
      console.log("Response structure:", {
        has_access_token: !!responseData.access_token,
        has_refresh_token: !!responseData.refresh_token,
        has_expires_in: !!responseData.expires_in,
        expires_in_value: responseData.expires_in,
        token_type: responseData.token_type
      });
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error:", response.status, responseData);
      
      // Add specific detection for invalid/expired refresh token
      if (responseData.error === 'invalid_grant' && 
          responseData.error_description === 'Invalid refresh token') {
        return new Response(
          JSON.stringify({ 
            error: "refresh_token_invalid", 
            error_description: "The refresh token is no longer valid. User needs to reconnect to Fortnox.",
            status: response.status,
            details: responseData
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "fortnox_api_error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If this was a system-level request, update the database with new tokens
    if (isSystemAuthenticated && supabaseUrl && supabaseServiceKey) {
      console.log("Updating tokens in database");
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get current credentials
      const { data: currentData } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      if (currentData && currentData.settings) {
        // Calculate expiration times
        const expiresAt = Date.now() + (responseData.expires_in || 3600) * 1000;
        const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days
        
        // Update with new tokens
        const updatedCredentials = {
          ...currentData.settings,
          accessToken: responseData.access_token,
          refreshToken: responseData.refresh_token || refreshToken, // Use new refresh token if provided
          expiresAt,
          expiresIn: responseData.expires_in,
          refreshTokenExpiresAt,
          refreshFailCount: 0, // Reset failure count on successful refresh
          lastRefreshAttempt: Date.now()
        };
        
        // Save updated credentials
        const { error: updateError } = await supabase
          .from('system_settings')
          .upsert({
            id: 'fortnox_credentials',
            settings: updatedCredentials
          }, {
            onConflict: 'id'
          });
          
        if (updateError) {
          console.error("Error updating credentials in database:", updateError);
          // Continue to return the tokens even if database update fails
        } else {
          console.log("Successfully updated tokens in database");
        }
      }
    }
    
    console.log("Token refresh successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-refresh:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="fortnox-token-migrate" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-token-migrate/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function migrates legacy Fortnox tokens to OAuth tokens.
                    </p>
                    <CodeBlock
                      id="fortnox-token-migrate"
                      language="typescript"
                      code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_MIGRATE_URL = 'https://apps.fortnox.se/oauth-v1/migrate';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Received token migration request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data successfully", {
        hasAccessToken: !!requestData.access_token,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate required fields
    if (!requestData.client_id || !requestData.client_secret || !requestData.access_token) {
      const missingFields = [];
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.access_token) missingFields.push('access_token');
      
      console.error(\`Missing required parameters: \${missingFields.join(', ')}\`, {
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasAccessToken: !!requestData.access_token
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters",
          details: {
            missing: missingFields,
            client_id: requestData.client_id ? "present" : "missing",
            client_secret: requestData.client_secret ? "present" : "missing",
            access_token: requestData.access_token ? "present" : "missing"
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create the credentials string (Base64 encoding of ClientId:ClientSecret)
    const credentials = btoa(\`\${requestData.client_id}:\${requestData.client_secret}\`);
    
    // Prepare the form data
    const formData = new URLSearchParams({
      access_token: requestData.access_token
    });
    
    console.log("Making token migration request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_MIGRATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${credentials}\`
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error:", response.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: "Fortnox API error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Token migration successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-migrate:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="fortnox-token-debug" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-token-debug/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function helps debug Fortnox token status.
                    </p>
                    <CodeBlock
                      id="fortnox-token-debug"
                      language="typescript"
                      code={`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// This function provides a debug endpoint to verify token state
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("🔍 Running Fortnox token debug endpoint");
    
    // Authentication check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "server_configuration_error", message: "Server configuration incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from database
    console.log("📚 Retrieving Fortnox credentials for debug");
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error("❌ Error retrieving Fortnox credentials:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract credentials
    const credentials = settingsData.settings;
    
    // Create safe debug output that doesn't expose full tokens
    const debugInfo = {
      accessTokenPresent: !!credentials?.accessToken,
      accessTokenLength: credentials?.accessToken?.length || 0,
      refreshTokenPresent: !!credentials?.refreshToken,
      refreshTokenLength: credentials?.refreshToken?.length || 0,
      clientIdPresent: !!credentials?.clientId,
      clientIdLength: credentials?.clientId?.length || 0,
      clientSecretPresent: !!credentials?.clientSecret,
      clientSecretLength: credentials?.clientSecret?.length || 0,
      accessTokenPreview: credentials?.accessToken 
        ? \`\${credentials.accessToken.substring(0, 10)}...\${credentials.accessToken.substring(credentials.accessToken.length - 10)}\`
        : 'missing',
      refreshTokenPreview: credentials?.refreshToken
        ? \`\${credentials.refreshToken.substring(0, 5)}...\${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}\`
        : 'missing',
      rawSettingsType: typeof settingsData.settings,
      settingsKeys: Object.keys(settingsData.settings || {}),
      timestamp: new Date().toISOString()
    };
    
    console.log("✅ Debug info generated:", {
      accessTokenLength: debugInfo.accessTokenLength,
      refreshTokenLength: debugInfo.refreshTokenLength,
      clientIdLength: debugInfo.clientIdLength,
      timestamp: debugInfo.timestamp
    });
    
    return new Response(
      JSON.stringify(debugInfo),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in debug endpoint:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="fortnox-proxy" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-proxy/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function acts as a proxy to Fortnox API, handling authentication and security.
                    </p>
                    <CodeBlock
                      id="fortnox-proxy"
                      language="typescript"
                      code={`import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { endpoint, method, data, contentType, accessToken } = await req.json();

    // Validate required parameters
    if (!endpoint || !accessToken) {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Missing required parameters",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Format the request URL
    let url = \`https://api.fortnox.se/3/\${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}\`;

    // Replace double slashes in the URL path (except after the protocol)
    url = url.replace(/([^:]\\/)\\\/+/g, "$1");

    console.log(\`Making \${method} request to Fortnox API: \${url}\`);

    // Prepare headers
    const headers = new Headers({
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': contentType || 'application/json',
      'Accept': 'application/json'
    });

    // Prepare request options
    const options: RequestInit = {
      method: method || 'GET',
      headers,
    };

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      if (contentType === 'application/json' && typeof data !== 'string') {
        options.body = JSON.stringify(data);
      } else {
        options.body = data;
      }
    }

    // Make the request to Fortnox API
    const response = await fetch(url, options);
    
    // Handle API-level errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = \`Fortnox API error \${response.status}\`;
      let errorDetails = errorText;
      
      try {
        // Try to parse error response
        const errorJson = JSON.parse(errorText);
        
        if (errorJson.ErrorInformation) {
          errorMessage = errorJson.ErrorInformation.message || errorMessage;
          errorDetails = JSON.stringify(errorJson.ErrorInformation);
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
          errorDetails = JSON.stringify(errorJson);
        }
      } catch (e) {
        // If parsing fails, use the raw error text
      }
      
      // Special handling for common errors
      if (response.status === 401) {
        errorMessage = "Fortnox authentication expired";
      } else if (response.status === 404) {
        // Check for specific article not found error
        if (errorText.includes("article") && errorText.includes("not found")) {
          // Extract the article number from the URL if possible
          const match = url.match(/articles\\/([^\\/]+)/);
          const articleNumber = match ? match[1] : null;
          
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                error: "article_not_found",
                message: "Article not found in Fortnox",
                status: response.status,
                articleDetails: {
                  articleNumber,
                  // Include additional details that might be useful for creating the article
                  description: "Auto-created by Techlinx app",
                  accountNumber: "3001", // Default account
                  vat: 25 // Default VAT
                }
              }),
              {
                status: 404,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
      }
      
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            status: response.status
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Parse and return the successful response
    const responseData = await response.json();
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          data: responseData,
          success: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Error in fortnox-proxy function:", error);
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          error: error.message || "Unknown error occurred",
          success: false
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="fortnox-scheduled-refresh" className="mt-0">
                    <h3 className="text-lg font-medium">fortnox-scheduled-refresh/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function handles scheduled token refreshes for Fortnox integration.
                    </p>
                    <CodeBlock
                      id="fortnox-scheduled-refresh"
                      language="typescript"
                      code={`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { jwtVerify, decodeJwt } from "https://deno.land/x/jose@v4.14.4/index.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const jwtSecret = Deno.env.get('JWT_SECRET');

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility function to validate access token structure
function isValidJwtFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Utility function to validate refresh token
function isValidRefreshToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

// Helper to check JWT expiration time
function getTokenExpirationTime(token: string): number | null {
  try {
    const decoded = decodeJwt(token);
    return decoded.exp || null;
  } catch (err) {
    console.error("Error decoding JWT:", err);
    return null;
  }
}

// Check if token needs refresh (less than 30 minutes remaining)
function tokenNeedsRefresh(token: string): boolean {
  const expTime = getTokenExpirationTime(token);
  if (!expTime) return true; // If we can't determine expiration, refresh to be safe
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeRemaining = expTime - now;
  const thirtyMinutesInSeconds = 30 * 60;
  
  // Always refresh if less than 30 minutes remaining
  return timeRemaining < thirtyMinutesInSeconds;
}

// Helper to check if token is expired
function isTokenExpired(token: string): boolean {
  const expTime = getTokenExpirationTime(token);
  if (!expTime) return true; // If we can't determine expiration, assume expired
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return now >= expTime;
}

// Helper to log refresh attempts to the database
async function logRefreshAttempt(
  supabase, 
  success: boolean, 
  message: string, 
  sessionId: string, 
  tokenLength?: number
) {
  try {
    const { error } = await supabase
      .from('token_refresh_logs')
      .insert({
        success,
        message,
        token_length: tokenLength,
        session_id: sessionId
      });
      
    if (error) {
      console.error(\`[\${sessionId}] Error logging refresh attempt:\`, error);
    } else {
      console.log(\`[\${sessionId}] Successfully logged refresh attempt\`);
    }
  } catch (err) {
    console.error(\`[\${sessionId}] Exception logging refresh attempt:\`, err);
  }
}

// This function will be called by a scheduled cron job or manually
Deno.serve(async (req) => {
  // Generate a unique session ID for this refresh operation
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log(\`[\${sessionId}] 🚀 Starting Fortnox token refresh process\`);
    
    // Parse request body if it exists
    let force = false;
    let automatic = false;
    try {
      const body = await req.json();
      force = !!body.force;
      automatic = !!body.automatic;
      console.log(\`[\${sessionId}] 📝 Request body:\`, { force, automatic, scheduled: !!body.scheduled });
    } catch (e) {
      console.log(\`[\${sessionId}] ⚠️ No valid request body found\`);
    }
    
    // Authentication check
    const apiKey = req.headers.get("x-api-key");
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");

    console.log(\`[\${sessionId}] 🔐 Authentication check:\`, {
      authHeaderPresent: !!req.headers.get("Authorization"),
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
      jwtSecretPresent: !!jwtSecret,
      isAutomaticRefresh: automatic
    });
    
    // For automatic refreshes, we'll always allow them without authentication
    // This is critical for system stability when expired tokens are detected
    if (automatic) {
      console.log(\`[\${sessionId}] ✅ Automatic token refresh detected - proceeding without authentication\`);
    } else {
      // Check for system-level authentication via API key
      const isSystemAuthenticated = validKey && apiKey === validKey;
      
      // Check for user authentication via JWT token
      let userAuthenticated = false;
      
      if (!isSystemAuthenticated && token && jwtSecret) {
        try {
          const encoder = new TextEncoder();
          const { payload } = await jwtVerify(token, encoder.encode(jwtSecret));
          console.log(\`[\${sessionId}] ✅ JWT manually validated via jose, user ID:\`, payload.sub);
          userAuthenticated = true;
        } catch (err) {
          console.error(\`[\${sessionId}] ❌ JWT verification failed (via jose):\`, err);
        }
      }
      
      const isAuthenticated = isSystemAuthenticated || userAuthenticated;
      
      if (!isAuthenticated) {
        console.error(\`[\${sessionId}] ❌ Unauthorized access to Fortnox token refresh\`);
        
        // Log unauthorized attempt
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await logRefreshAttempt(supabase, false, "Unauthorized access attempt", sessionId);
        }
        
        return new Response(
          JSON.stringify({ 
            error: "unauthorized", 
            message: "Missing or invalid API key or user token" 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      console.log(\`[\${sessionId}] ✅ Authentication successful:\`, {
        systemAuth: isSystemAuthenticated,
        userAuth: userAuthenticated
      });
    }
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(\`[\${sessionId}] ❌ Supabase configuration missing\`);
      return new Response(
        JSON.stringify({ 
          error: "server_configuration_error", 
          message: "Server configuration incomplete" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from database
    console.log(\`[\${sessionId}] 📚 Retrieving Fortnox credentials from database\`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error(\`[\${sessionId}] ❌ Error retrieving Fortnox credentials:\`, settingsError);
      await logRefreshAttempt(supabase, false, "Failed to retrieve credentials from database", sessionId);
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Extract and validate credentials
    const credentials = settingsData.settings;
    
    console.log(\`[\${sessionId}] 🧐 Credentials structure check:\`, {
      hasClientId: !!credentials?.clientId,
      hasClientSecret: !!credentials?.clientSecret,
      hasAccessToken: !!credentials?.accessToken,
      hasRefreshToken: !!credentials?.refreshToken,
      clientIdLength: credentials?.clientId?.length || 0,
      clientSecretLength: credentials?.clientSecret?.length || 0,
      accessTokenLength: credentials?.accessToken?.length || 0,
      refreshTokenLength: credentials?.refreshToken?.length || 0
    });
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error(\`[\${sessionId}] ❌ Invalid or incomplete credentials in database:\`, {
        clientIdExists: !!credentials?.clientId,
        clientSecretExists: !!credentials?.clientSecret,
        refreshTokenExists: !!credentials?.refreshToken
      });
      
      await logRefreshAttempt(supabase, false, "Incomplete credentials found in database", sessionId);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Incomplete Fortnox credentials",
          details: {
            clientIdExists: !!credentials?.clientId,
            clientSecretExists: !!credentials?.clientSecret,
            refreshTokenExists: !!credentials?.refreshToken
          },
          requiresReconnect: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Check if token refresh is needed
    // Always refresh if:
    // 1. Force is true (forced refresh from the UI)
    // 2. Automatic is true (system detected expired token)
    // 3. No access token exists
    // 4. Invalid token format
    // 5. Token is expired
    // 6. Token is expiring soon (less than 30 minutes)
    const isExpired = credentials.accessToken ? isTokenExpired(credentials.accessToken) : true;
    const shouldRefresh = force || automatic || !credentials.accessToken || 
                         !isValidJwtFormat(credentials.accessToken) || 
                         isExpired || 
                         tokenNeedsRefresh(credentials.accessToken);
    
    // Always log the token expiration status regardless of whether we refresh
    if (credentials.accessToken && isValidJwtFormat(credentials.accessToken)) {
      const expTime = getTokenExpirationTime(credentials.accessToken);
      if (expTime) {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = expTime - now;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        console.log(\`[\${sessionId}] ⏰ Token expires in: \${minutes} minutes and \${seconds} seconds (expired: \${isExpired})\`);
      }
    }
    
    if (!shouldRefresh) {
      console.log(\`[\${sessionId}] ✅ Token is still valid with more than 30 minutes remaining. No refresh needed.\`);
      
      // Log the skipped refresh
      await logRefreshAttempt(
        supabase, 
        true, 
        "Token refresh skipped - token still valid with >30 minutes remaining", 
        sessionId
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Token is still valid. No refresh needed.",
          tokenLength: credentials.accessToken.length,
          session_id: sessionId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // If we got here, we need to refresh the token
    console.log(\`[\${sessionId}] 🔄 Token needs refreshing \${isExpired ? '(EXPIRED)' : ''} - proceeding with refresh\`);

    // Make sure the refresh token is the correct length (40 chars for Fortnox)
    if (credentials.refreshToken.length !== 40) {
      console.warn(\`[\${sessionId}] ⚠️ Refresh token length (\${credentials.refreshToken.length}) doesn't match expected 40 chars\`);
    }
    
    // Log the current refresh token details (for debugging)
    console.log(\`[\${sessionId}] 🔑 Using refresh token:\`, credentials.refreshToken);
    console.log(\`[\${sessionId}] 🔍 Current refresh token details:\`, {
      length: credentials.refreshToken.length,
      preview: \`\${credentials.refreshToken.substring(0, 10)}...\${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}\`,
      isString: typeof credentials.refreshToken === 'string',
      valid: isValidRefreshToken(credentials.refreshToken)
    });
    
    console.log(\`[\${sessionId}] 💬 Refreshing with:\`, { 
      clientId: credentials.clientId,
      clientSecretLength: credentials.clientSecret.length,
      refreshToken: credentials.refreshToken
    });
    
    // Prepare form data for token refresh using URLSearchParams
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', credentials.refreshToken);
    
    // Create the Authorization header with Basic auth
    const authString = \`\${credentials.clientId}:\${credentials.clientSecret}\`;
    const base64Auth = btoa(authString);
    const authHeader = \`Basic \${base64Auth}\`;
    
    console.log(\`[\${sessionId}] 🔄 Making token refresh request to Fortnox with:\`, {
      url: FORTNOX_TOKEN_URL,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      authHeader: 'Basic ***',
      formData: Object.fromEntries(formData.entries()),
      refreshTokenLength: credentials.refreshToken.length
    });
    
    // Make the request to Fortnox with multiple retries
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(FORTNOX_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader
          },
          body: formData,
        });
        
        // If successful, break out of the retry loop
        break;
      } catch (err) {
        retryCount++;
        console.error(\`[\${sessionId}] ❌ Fetch error on attempt \${retryCount}/\${maxRetries}:\`, err);
        
        if (retryCount < maxRetries) {
          console.log(\`[\${sessionId}] ⏱️ Retrying in \${retryDelay}ms...\`);
          await delay(retryDelay * retryCount); // Exponential backoff
        } else {
          console.error(\`[\${sessionId}] ❌ All retry attempts failed\`);
          
          await logRefreshAttempt(supabase, false, \`Failed to connect to Fortnox API after \${maxRetries} attempts\`, sessionId);
          
          return new Response(
            JSON.stringify({ 
              error: "connection_error", 
              message: \`Failed to connect to Fortnox API after \${maxRetries} attempts\`,
              details: String(err)
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
    }
    
    // Get and parse response
    const responseText = await response.text();
    console.log(\`[\${sessionId}] 📬 Fortnox response status:\`, response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(\`[\${sessionId}] ✅ Successfully parsed Fortnox response\`);
      console.log(\`[\${sessionId}] 📋 Fortnox response data:\`, responseData);
    } catch (e) {
      console.error(\`[\${sessionId}] ❌ Failed to parse Fortnox response:\`, e);
      console.log(\`[\${sessionId}] 📝 Raw response text:\`, responseText);
      
      await logRefreshAttempt(supabase, false, "Invalid response from Fortnox API", sessionId);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          message: "Invalid response from Fortnox",
          raw: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!response.ok) {
      console.error(\`[\${sessionId}] ❌ Fortnox API error:\`, responseData);
      
      await logRefreshAttempt(
        supabase, 
        false, 
        \`Fortnox API error: \${responseData.error || 'Unknown error'} - \${responseData.error_description || ''}\`, 
        sessionId
      );
      
      // For invalid_grant (refresh token expired/invalid), we handle this
      // by telling the client they need to reconnect
      if (responseData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({ 
            error: responseData.error, 
            message: "Refresh token is invalid or expired. Please reconnect to Fortnox.",
            details: responseData,
            requiresReconnect: true
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: responseData.error, 
          message: responseData.error_description || "Token refresh failed",
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate received tokens
    if (!responseData.access_token || !isValidJwtFormat(responseData.access_token)) {
      console.error(\`[\${sessionId}] ❌ Invalid access token format received from Fortnox\`);
      
      await logRefreshAttempt(supabase, false, "Received invalid access token format", sessionId);
      
      return new Response(
        JSON.stringify({
          error: "invalid_token_format",
          message: "Received invalid access token format from Fortnox",
          requiresReconnect: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Detailed token logging
    console.log(\`[\${sessionId}] 🧪 access_token length:\`, responseData.access_token?.length);
    console.log(\`[\${sessionId}] 🧪 refresh_token length:\`, responseData.refresh_token?.length);
    console.log(\`[\${sessionId}] 🧪 access_token preview:\`, \`\${responseData.access_token?.slice(0, 20)}...\${responseData.access_token?.slice(-20)}\`);
    if (responseData.refresh_token) {
      console.log(\`[\${sessionId}] 🧪 refresh_token preview:\`, \`\${responseData.refresh_token?.slice(0, 10)}...\${responseData.refresh_token?.slice(-5)}\`);
    }
    
    // Create a clean, minimalist credentials object with only the necessary fields
    // IMPORTANT: Only update the refresh token if Fortnox provides a new one
    const updatedCredentials = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accessToken: responseData.access_token,
      // Only update refresh token if a new one is provided, otherwise keep the existing one
      refreshToken: responseData.refresh_token || credentials.refreshToken,
      isLegacyToken: false
    };
    
    // Add token expiration information - parse JWT to extract expiration
    if (responseData.access_token) {
      try {
        const tokenParts = responseData.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp) {
            // Convert Unix timestamp to ISO date
            updatedCredentials.expiresAt = new Date(payload.exp * 1000).toISOString();
            console.log(\`[\${sessionId}] 🕒 Token expires at: \${updatedCredentials.expiresAt}\`);
          }
        }
      } catch (err) {
        console.error(\`[\${sessionId}] Error parsing JWT token:\`, err);
      }
    }
    
    // Verify we're not storing a truncated token
    console.log(\`[\${sessionId}] ✅ Verification - Access token type check:\`, typeof updatedCredentials.accessToken === 'string');
    console.log(\`[\${sessionId}] ✅ Verification - Access token length check:\`, updatedCredentials.accessToken.length);
    console.log(\`[\${sessionId}] ✅ Verification - Refresh token type check:\`, typeof updatedCredentials.refreshToken === 'string');
    console.log(\`[\${sessionId}] ✅ Verification - Refresh token length check:\`, updatedCredentials.refreshToken.length);
    
    if (typeof updatedCredentials.accessToken !== 'string' || 
        updatedCredentials.accessToken.length < 100) {
      console.error(\`[\${sessionId}] ❌ Token validation failed - suspiciously short access token\`);
      
      await logRefreshAttempt(supabase, false, "Token validation failed - suspiciously short access token", sessionId, updatedCredentials.accessToken.length);
      
      return new Response(
        JSON.stringify({
          error: "token_validation_failed",
          message: "Refusing to save suspiciously short access token",
          requiresReconnect: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Save updated credentials
    console.log(\`[\${sessionId}] 💾 Saving updated credentials to database\`);
    console.log(\`[\${sessionId}] 💾 Access token length:\`, updatedCredentials.accessToken.length);
    console.log(\`[\${sessionId}] 💾 Refresh token length:\`, updatedCredentials.refreshToken.length);
    
    // Serialize credentials separately to ensure full data integrity 
    const stringifiedSettings = JSON.stringify(updatedCredentials);
    console.log(\`[\${sessionId}] 📐 Stringified settings length:\`, stringifiedSettings.length);
    
    // Try multiple times to save the credentials to ensure they're properly stored
    let updateSuccess = false;
    let updateAttempts = 0;
    const maxUpdateAttempts = 3;
    
    while (!updateSuccess && updateAttempts < maxUpdateAttempts) {
      updateAttempts++;
      console.log(\`[\${sessionId}] 💾 Database save attempt \${updateAttempts}/\${maxUpdateAttempts}\`);
      
      const { error: updateError } = await supabase
        .from('system_settings')
        .upsert({
          id: 'fortnox_credentials',
          settings: updatedCredentials
        }, {
          onConflict: 'id'
        });
        
      if (updateError) {
        console.error(\`[\${sessionId}] ❌ Error updating credentials in database (attempt \${updateAttempts}):\`, updateError);
        
        if (updateAttempts < maxUpdateAttempts) {
          console.log(\`[\${sessionId}] ⏱️ Waiting before retry...\`);
          await delay(1000); // Wait 1 second before retrying
        } else {
          await logRefreshAttempt(supabase, false, "Failed to update tokens in database after multiple attempts", sessionId, updatedCredentials.accessToken.length);
          
          return new Response(
            JSON.stringify({ 
              error: "database_error", 
              message: "Failed to update tokens in database after multiple attempts",
              details: updateError
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      } else {
        updateSuccess = true;
        console.log(\`[\${sessionId}] ✅ Credentials successfully updated in database (attempt \${updateAttempts})\`);
      }
    }
      
    // Add a small delay to ensure database consistency
    await delay(500);
    
    // Double-check that the tokens were saved correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
      
    if (verifyError) {
      console.error(\`[\${sessionId}] ❌ Error verifying updated credentials:\`, verifyError);
    } else if (verifyData && verifyData.settings) {
      const settings = verifyData.settings;
      
      console.log(\`[\${sessionId}] ✅ Verification - Saved access token length:\`, settings.accessToken.length);
      console.log(\`[\${sessionId}] ✅ Verification - Saved refresh token length:\`, settings.refreshToken.length);
      console.log(\`[\${sessionId}] ✅ Verification - First 20 chars of access token match:\`, 
        settings.accessToken.substring(0, 20) === updatedCredentials.accessToken.substring(0, 20));
      console.log(\`[\${sessionId}] ✅ Verification - Last 20 chars of access token match:\`,
        settings.accessToken.substring(settings.accessToken.length - 20) === 
        updatedCredentials.accessToken.substring(updatedCredentials.accessToken.length - 20));
      
      if (settings.accessToken.length !== updatedCredentials.accessToken.length) {
        console.error(
          \`[\${sessionId}] ⚠️ Token length mismatch after save! \` +
          \`Original: \${updatedCredentials.accessToken.length}, \` +
          \`Saved: \${settings.accessToken.length}\`
        );
      }
      
      if (settings.refreshToken.length !== updatedCredentials.refreshToken.length) {
        console.error(
          \`[\${sessionId}] ⚠️ Refresh token length mismatch after save! \` +
          \`Original: \${updatedCredentials.refreshToken.length}, \` +
          \`Saved: \${settings.refreshToken.length}\`
        );
      }
    }
    
    console.log(\`[\${sessionId}] ✅ Token refresh completed successfully\`);
    
    // Log the successful refresh
    await logRefreshAttempt(
      supabase, 
      true, 
      "Token refresh completed successfully", 
      sessionId, 
      updatedCredentials.accessToken.length
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refresh completed successfully",
        tokenLength: updatedCredentials.accessToken.length,
        session_id: sessionId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error(\`[\${sessionId}] ❌ Server error in token refresh:\`, error);
    
    // Try to log the error
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await logRefreshAttempt(
          supabase, 
          false, 
          \`Server error: \${error.message || "Unknown error"}\`, 
          sessionId
        );
      } catch (logError) {
        console.error(\`[\${sessionId}] Failed to log error:\`, logError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="get-all-users" className="mt-0">
                    <h3 className="text-lg font-medium">get-all-users/index.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This function retrieves all users from the system, including their profile information.
                    </p>
                    <CodeBlock
                      id="get-all-users"
                      language="typescript"
                      code={`import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// Updated CORS headers to ensure they work with all requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests properly
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Get Supabase connection details from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceRole) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Extract the JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRole,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized access attempt:", userError?.message || "Auth session missing!");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin or manager
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({ error: 'Error fetching user profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      console.error("Access denied: User is not an admin or manager");
      return new Response(JSON.stringify({ error: 'Unauthorized. Only administrators and managers can access this function' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Get all users and their profiles
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error("Error listing users:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get all profiles to merge with user data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, avatar_url');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(JSON.stringify({ error: profilesError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Map profiles to a dictionary for easy lookup
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }

    // Combine user data with profile data
    const combinedData = users.users.map(user => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        profile_name: profile?.name || null,
        profile_role: profile?.role || 'user',
        profile_avatar_url: profile?.avatar_url || null
      };
    });

    console.log("Successfully retrieved users:", combinedData.length);
    
    return new Response(JSON.stringify(combinedData), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Unexpected error in function:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});`}
                    />
                  </TabsContent>

                  <TabsContent value="cors" className="mt-0">
                    <h3 className="text-lg font-medium">_shared/cors.ts</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      Common CORS headers for all edge functions.
                    </p>
                    <CodeBlock
                      id="cors"
                      language="typescript"
                      code={`export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};`}
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATABASE SETUP TAB */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Setup</CardTitle>
              <CardDescription>
                Run these SQL scripts in your Supabase SQL Editor to set up the required database schema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ScrollArea className="h-[500px] rounded-md border p-4">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium">1. Create Tables</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      Run these SQL commands to create the core tables for the application.
                    </p>
                    <CodeBlock
                      id="create-tables"
                      language="sql"
                      code={`-- Profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization_number TEXT,
    client_number TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    county TEXT,
    telephone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    article_number TEXT,
    account_number TEXT,
    vat_percentage INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time entries table
CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    product_id UUID REFERENCES public.products(id),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    quantity INTEGER,
    invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    exported_to_fortnox BOOLEAN DEFAULT FALSE,
    fortnox_invoice_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoice items table
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    time_entry_id UUID REFERENCES public.time_entries(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    vat_percentage INTEGER NOT NULL
);

-- User timers table
CREATE TABLE public.user_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    product_id UUID REFERENCES public.products(id),
    description TEXT,
    status TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings table
CREATE TABLE public.system_settings (
    id TEXT PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- News posts table
CREATE TABLE public.news_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Token refresh logs table
CREATE TABLE public.token_refresh_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    success BOOLEAN NOT NULL,
    message TEXT,
    token_length INTEGER,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);`}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">2. Create Functions and Triggers</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      These functions and triggers help maintain data integrity and handle user creation.
                    </p>
                    <CodeBlock
                      id="create-functions"
                      language="sql"
                      code={`-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  name_value TEXT;
BEGIN
  -- Get the name from metadata or use email as fallback
  IF new.raw_user_meta_data IS NOT NULL AND new.raw_user_meta_data->>'name' IS NOT NULL THEN
    name_value := new.raw_user_meta_data->>'name';
  ELSE
    name_value := split_part(new.email, '@', 1);
  END IF;

  -- Create more robust profile entry
  INSERT INTO public.profiles (
    id,
    name,
    avatar_url,
    role,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    name_value,
    new.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'
      ELSE 'user'
    END,
    now(),
    now()
  );

  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error and still return the user so authentication succeeds
    RAISE NOTICE 'Error in handle_new_user function: %', SQLERRM;
    RETURN new;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update system_settings updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for system_settings
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE PROCEDURE public.update_system_settings_updated_at();

-- Function to update news_posts updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_news_posts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for news_posts
CREATE TRIGGER update_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE PROCEDURE public.update_news_posts_updated_at();

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

-- Function to get username
CREATE OR REPLACE FUNCTION public.get_username(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT name FROM public.profiles WHERE id = user_id
$$;

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;

  -- Check if the new role is valid
  IF new_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: must be admin, manager, or user';
  END IF;

  -- Update the user's role
  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;`}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">3. Create Row Level Security Policies</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      These policies control access to tables based on user roles.
                    </p>
                    <CodeBlock
                      id="create-rls-policies"
                      language="sql"
                      code={`-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "All authenticated users can view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager() OR get_user_role() = 'user');

CREATE POLICY "Admins and managers can update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- Products policies
CREATE POLICY "All authenticated users can view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- Time entries policies
CREATE POLICY "Users can view all time entries"
  ON public.time_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin_or_manager());

CREATE POLICY "Admins and managers can delete time entries"
  ON public.time_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin_or_manager());

-- Invoices policies
CREATE POLICY "All authenticated users can view invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoices"
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoices"
  ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete invoices"
  ON public.invoices
  FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- Invoice items policies
CREATE POLICY "All authenticated users can view invoice items"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert invoice items"
  ON public.invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update invoice items"
  ON public.invoice_items
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete invoice items"
  ON public.invoice_items
  FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- User timers policies
CREATE POLICY "Users can view all timers"
  ON public.user_timers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own timers"
  ON public.user_timers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers"
  ON public.user_timers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers"
  ON public.user_timers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System settings policies
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

-- News posts policies
CREATE POLICY "All authenticated users can view news posts"
  ON public.news_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert news posts"
  ON public.news_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins and managers can update news posts"
  ON public.news_posts
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_manager());

CREATE POLICY "Admins and managers can delete news posts"
  ON public.news_posts
  FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- Token refresh logs policies
CREATE POLICY "Admins can view token refresh logs"
  ON public.token_refresh_logs
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Allow insert to token_refresh_logs from edge functions"
  ON public.token_refresh_logs
  FOR INSERT
  WITH CHECK (true);`}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">4. Set Up Cron Job for Token Refresh</h3>
                    <p className="text-sm text-muted-foreground my-2">
                      This sets up a scheduled job to refresh Fortnox tokens automatically.
                    </p>
                    <CodeBlock
                      id="create-cron-job"
                      language="sql"
                      code={`-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a scheduled job to refresh tokens every hour
SELECT cron.schedule(
  'refresh-fortnox-token-hourly',   -- Name of the job
  '0 * * * *',                      -- Cron schedule (every hour at minute 0)
  $$
    SELECT net.http_post(
      url := 'https://xojrleypudfrbmvejpow.supabase.co/functions/v1/fortnox-scheduled-refresh',
      headers := '{"Content-Type": "application/json", "x-api-key": "' || (SELECT value FROM secrets.secret WHERE key = 'FORTNOX_REFRESH_SECRET') || '"}'::JSONB,
      body := '{"scheduled": true, "automatic": true}'
    ) AS request_id;
  $$
);`}
                    />
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
