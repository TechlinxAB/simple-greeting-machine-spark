
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  isFortnoxConnected,
  disconnectFortnox,
  getFortnoxCredentials,
  saveFortnoxCredentials,
  forceTokenRefresh
} from "@/integrations/fortnox"; 
import { Badge } from "@/components/ui/badge";
import { Link, ArrowUpRight, Check, X, Copy, AlertCircle, ExternalLink, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { environment, getRedirectUri } from "@/config/environment";
import { FortnoxCredentials } from "@/integrations/fortnox/types";
import { supabase } from "@/lib/supabase"; // Updated import path

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
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fullRedirectUri = getRedirectUri();
    console.log("Setting Fortnox redirect URI:", fullRedirectUri);
    setRedirectUri(fullRedirectUri);
  }, []);

  useEffect(() => {
    setValidationError(null);
    
    if (clientId && clientSecret) {
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

  const { data: connected = false, refetch: refetchStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["fortnox-connection-status", connectionRetryCount],
    queryFn: async () => {
      if (!clientId || !clientSecret) return false;
      console.log(`Checking Fortnox connection (attempt ${connectionRetryCount + 1})`);
      try {
        const result = await isFortnoxConnected();
        console.log("Fortnox connection status:", result);
        return result;
      } catch (error) {
        console.error("Error checking Fortnox connection:", error);
        return false;
      }
    },
    enabled: !!clientId && !!clientSecret,
    staleTime: 5000,
    retry: 2,
  });

  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["fortnox-credentials", connectionRetryCount],
    queryFn: async () => {
      const creds = await getFortnoxCredentials();
      console.log("Retrieved Fortnox credentials:", creds ? "Found" : "Not found");
      return creds;
    },
    enabled: connected || connectionRetryCount > 0,
    staleTime: 10000,
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
    
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    try {
      setIsConnecting(true);
      
      console.log("Current origin:", window.location.origin);
      console.log("Using redirect URI:", redirectUri);
      
      console.log("Saving credentials to database before OAuth flow");
      await saveFortnoxCredentials({
        clientId,
        clientSecret
      });
      
      queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
      
      const FORTNOX_AUTH_URL = environment.fortnox.authUrl;
      
      const scopes = [
        'companyinformation',
        'invoice',
        'customer',
        'article'
      ];
      
      const state = crypto.randomUUID();
      
      try {
        const stateData = {
          state,
          origin: window.location.origin,
          path: environment.fortnox.redirectPath
        };
        
        sessionStorage.setItem('fortnox_oauth_state', JSON.stringify(stateData));
        console.log("Generated and stored secure state for OAuth:", state);
      } catch (storageError) {
        console.error("Failed to store OAuth state in sessionStorage:", storageError);
        toast.error("Failed to secure the authorization process. Please check your browser settings and try again.");
        setIsConnecting(false);
        return;
      }
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        response_type: 'code',
        state: state,
        access_type: 'offline'
      });
      
      const authUrl = `${FORTNOX_AUTH_URL}?${params.toString()}`;
      
      console.log("Redirecting to Fortnox OAuth URL:", authUrl);
      
      window.location.href = authUrl;
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
      queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
      setConnectionRetryCount(0);
      setNeedsReconnect(false);
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

  const handleRefreshStatus = () => {
    setConnectionRetryCount(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
    queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
    toast.info("Refreshing Fortnox connection status...");
  };

  const handleManualRefresh = async () => {
    try {
      toast.info("Manually refreshing Fortnox token...");
      const { data, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
        body: JSON.stringify({ force: true }),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (error) {
        console.error("Error in manual refresh:", error);
        
        // Check if this is an invalid_grant error that requires reconnection
        if (typeof error === 'object' && error !== null && 'message' in error) {
          const errorMessage = error.message as string;
          if (errorMessage.includes('invalid_grant') || errorMessage.includes('requires reconnect')) {
            setNeedsReconnect(true);
            toast.error("Your connection to Fortnox has expired. Please reconnect.", {
              duration: 6000
            });
            return;
          }
        }
        
        toast.error("Failed to refresh Fortnox token");
        return;
      }

      if (data?.success) {
        toast.success("Fortnox token refreshed successfully");
        setNeedsReconnect(false);
        await Promise.all([
          refetchStatus(),
          queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] })
        ]);
      } else if (data?.requiresReconnect) {
        setNeedsReconnect(true);
        toast.error("Your connection to Fortnox has expired. Please reconnect.", {
          duration: 6000
        });
      } else {
        console.error("Unexpected response:", data);
        toast.error("Failed to refresh Fortnox token");
      }
    } catch (error) {
      console.error("Error during manual token refresh:", error);
      toast.error("Error refreshing token");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Fortnox Connection</h3>
          {isLoadingStatus ? (
            <Badge variant="outline" className="bg-gray-100">
              <RefreshCcw className="mr-1 h-3 w-3 animate-spin" /> Checking...
            </Badge>
          ) : connected ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="mr-1 h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline">
              <X className="mr-1 h-3 w-3" /> Not connected
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-2" 
            onClick={handleRefreshStatus}
            disabled={isLoadingStatus}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {needsReconnect && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Connection expired</p>
              <p className="text-sm text-red-600 mt-1">
                Your Fortnox connection has expired or been revoked. Please disconnect and connect again to reauthorize access.
              </p>
            </div>
          </div>
        </div>
      )}

      {connected ? (
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <div className="space-y-2">
              <p className="text-sm">
                Connected to Fortnox. You can now export invoices directly to your Fortnox account.
              </p>
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
                  setConnectionRetryCount(prev => prev + 1);
                  queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
                  queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
                } catch (error) {
                  toast.error("Failed to update credentials");
                  console.error(error);
                }
              }}
              disabled={!clientId || !clientSecret}
            >
              Update Credentials
            </Button>
            <Button
              variant="secondary"
              onClick={handleManualRefresh}
              disabled={isLoadingStatus}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
              Refresh Token
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
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>Important: Redirect URI must be exactly correct</span>
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Make sure to register this exact redirect URI in your Fortnox Developer Portal, with no additional characters or trailing slashes:
                </p>
              </div>
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
