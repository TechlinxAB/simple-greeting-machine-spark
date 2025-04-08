
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  isFortnoxConnected,
  disconnectFortnox,
  getFortnoxCredentials,
  saveFortnoxCredentials
} from "@/integrations/fortnox/api";
import { Badge } from "@/components/ui/badge";
import { Link, ArrowUpRight, Check, X, Copy, AlertCircle, ExternalLink, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface FortnoxConnectProps {
  clientId: string;
  clientSecret: string;
  onStatusChange?: (connected: boolean) => void;
}

export function FortnoxConnect({ clientId, clientSecret, onStatusChange }: FortnoxConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Set the redirect URI when component mounts
  useEffect(() => {
    // Generate the current URL for the redirect - make sure it's exactly what's registered in Fortnox
    const baseUrl = window.location.origin;
    const redirectPath = "/settings?tab=fortnox";
    setRedirectUri(`${baseUrl}${redirectPath}`);
  }, []);

  // Validate client ID and secret whenever they change
  useEffect(() => {
    // Clear any previous validation errors
    setValidationError(null);
    
    // Only validate if both values are provided
    if (clientId && clientSecret) {
      // Simple validation for length
      if (clientId.trim().length < 5) {
        setValidationError("Client ID appears to be too short");
        return;
      }
      
      if (clientSecret.trim().length < 5) {
        setValidationError("Client Secret appears to be too short");
        return;
      }
    }
  }, [clientId, clientSecret]);

  // Get connection status
  const { data: connected = false, refetch: refetchStatus } = useQuery({
    queryKey: ["fortnox-connection-status"],
    queryFn: async () => {
      if (!clientId || !clientSecret) return false;
      return await isFortnoxConnected();
    },
    enabled: !!clientId && !!clientSecret,
  });

  // Get credentials for display
  const { data: credentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    enabled: connected,
  });

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(connected);
    }
  }, [connected, onStatusChange]);

  const handleConnect = async () => {
    if (!user) {
      toast.error("You need to be logged in to connect to Fortnox");
      navigate("/login");
      return;
    }

    if (!clientId || !clientId.trim()) {
      toast.error("Client ID is required to connect to Fortnox");
      return;
    }

    if (!clientSecret || !clientSecret.trim()) {
      toast.error("Client Secret is required to connect to Fortnox");
      return;
    }

    if (!redirectUri) {
      toast.error("Redirect URI is not set properly");
      return;
    }
    
    // Check for validation errors
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // First, save the credentials to the database
      await saveFortnoxCredentials({
        clientId,
        clientSecret
      });
      
      console.log("Saved credentials to database before OAuth flow");
      
      // Build the Fortnox authorization URL according to their documentation
      const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
      
      // Expanded scopes following the example from the Frappe implementation
      const scopes = [
        'companyinformation',
        'invoice',
        'customer',
        'article' // For product data
      ];
      
      // Generate a secure random state for CSRF protection
      // Use crypto.randomUUID() for better security
      const state = crypto.randomUUID();
      
      // Store the state in sessionStorage to verify when we come back - with explicit error handling
      try {
        sessionStorage.setItem('fortnox_oauth_state', state);
        console.log("Generated and stored secure state for OAuth:", state);
      } catch (storageError) {
        console.error("Failed to store OAuth state in sessionStorage:", storageError);
        toast.error("Failed to secure the authorization process. Please check your browser settings and try again.");
        setIsConnecting(false);
        return;
      }
      
      // Build parameters following Fortnox's requirements
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '), // Space-separated list of scopes
        response_type: 'code',
        state: state,
        access_type: 'offline' // Request refresh token
      });
      
      const authUrl = `${FORTNOX_AUTH_URL}?${params.toString()}`;
      
      console.log("Redirecting to Fortnox OAuth URL:", authUrl);
      
      // Use direct window location change for most reliable redirect
      window.location.href = authUrl;
      
      // Not setting isConnecting to false here because we're redirecting away
    } catch (error) {
      console.error("Error generating Fortnox auth URL:", error);
      toast.error("Failed to generate Fortnox authorization URL");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnectFortnox();
      toast.success("Successfully disconnected from Fortnox");
      refetchStatus();
    } catch (error) {
      toast.error("Failed to disconnect from Fortnox");
      console.error(error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success("Redirect URI copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Fortnox Connection</h3>
          {connected ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="mr-1 h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline">
              <X className="mr-1 h-3 w-3" /> Not connected
            </Badge>
          )}
        </div>
      </div>

      {connected ? (
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <div className="space-y-2">
              <p className="text-sm">
                Connected to Fortnox. You can now export invoices directly to your Fortnox account.
              </p>
              {credentials?.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Token expires: {new Date(credentials.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect from Fortnox"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await saveFortnoxCredentials({
                    clientId,
                    clientSecret,
                    ...(credentials || {})
                  });
                  toast.success("Credentials updated successfully");
                } catch (error) {
                  toast.error("Failed to update credentials");
                  console.error(error);
                }
              }}
              disabled={!clientId || !clientSecret}
            >
              Update Credentials
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm">
              Connect to Fortnox to export invoices directly to your Fortnox account.
              You'll be redirected to Fortnox to authorize this application.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">
                Important: Make sure to register this exact redirect URI in your Fortnox Developer settings:
              </p>
              <div className="flex items-center mt-1">
                <code className="flex-1 block bg-gray-700 text-white p-2 rounded-md text-xs overflow-auto">
                  {redirectUri || "Loading redirect URI..."}
                </code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={copyRedirectUri}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {validationError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">{validationError}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Please check your credentials and make sure you've saved them properly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleConnect} 
              disabled={!clientId || !clientSecret || isConnecting || !redirectUri || !!validationError}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              <span>Connect to Fortnox</span>
              <ArrowUpRight className="h-3 w-3" />
            </Button>
            
            <Button
              variant="outline" 
              size="sm"
              className="ml-2 flex items-center gap-1"
              onClick={() => window.open("https://developer.fortnox.se/", "_blank")}
            >
              <span>Fortnox Developer Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
