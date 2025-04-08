
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  isFortnoxConnected,
  disconnectFortnox,
  getFortnoxCredentials,
  FortnoxCredentials
} from "@/integrations/fortnox/api";
import { Badge } from "@/components/ui/badge";
import { Link, ArrowUpRight, Check, X, Copy } from "lucide-react";
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
  const navigate = useNavigate();
  const { user } = useAuth();

  // Set the redirect URI when component mounts
  useEffect(() => {
    // Generate the current URL for the redirect - make sure it's exactly what's registered in Fortnox
    const baseUrl = window.location.origin;
    const redirectPath = "/settings?tab=fortnox";
    setRedirectUri(`${baseUrl}${redirectPath}`);
  }, []);

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

  const handleConnect = () => {
    if (!user) {
      toast.error("You need to be logged in to connect to Fortnox");
      navigate("/login");
      return;
    }

    if (!clientId) {
      toast.error("Client ID is required to connect to Fortnox");
      return;
    }

    if (!redirectUri) {
      toast.error("Redirect URI is not set properly");
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // Build the Fortnox authorization URL according to their documentation
      const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
      const scope = 'invoice company-settings customer article';
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store the state in sessionStorage to verify when we come back
      sessionStorage.setItem('fortnox_oauth_state', state);
      
      // Direct browser navigation - simplest and most reliable method
      const authUrl = new URL(FORTNOX_AUTH_URL);
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', scope);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('access_type', 'offline');
      
      console.log("Redirecting to Fortnox OAuth URL:", authUrl.toString());
      
      // Use direct window location change for most reliable redirect
      window.location.href = authUrl.toString();
      
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
          <Button 
            variant="destructive" 
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect from Fortnox"}
          </Button>
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
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleConnect} 
              disabled={!clientId || !clientSecret || isConnecting || !redirectUri}
              className="flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              <span>Connect to Fortnox</span>
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
