import { useState, useEffect, useCallback } from "react";
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
import { Link, ArrowUpRight, Check, X, Copy, AlertCircle, ExternalLink, RefreshCcw, Key, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { environment, getRedirectUri } from "@/config/environment";
import { FortnoxCredentials } from "@/integrations/fortnox/types";

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
  const [showToken, setShowToken] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tokenExpirationDate, setTokenExpirationDate] = useState<Date | null>(null);
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [refreshTokenExpirationDate, setRefreshTokenExpirationDate] = useState<Date | null>(null);
  const [refreshTokenDaysLeft, setRefreshTokenDaysLeft] = useState<number | null>(null);
  const [refreshFailCount, setRefreshFailCount] = useState<number>(0);

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
    if (credentials) {
      if (credentials.expiresAt) {
        const expirationDate = new Date(credentials.expiresAt);
        const expiresInMinutes = (credentials.expiresAt - Date.now()) / (1000 * 60);
        const expiresInDays = expiresInMinutes / (24 * 60);
        
        setTokenExpirationDate(expirationDate);
        setDaysUntilExpiration(Math.max(0, Math.round(expiresInDays * 100) / 100));
      } else {
        setTokenExpirationDate(null);
        setDaysUntilExpiration(null);
      }
      
      if (credentials.refreshTokenExpiresAt) {
        const refreshExpirationDate = new Date(credentials.refreshTokenExpiresAt);
        const refreshExpiresInMinutes = (credentials.refreshTokenExpiresAt - Date.now()) / (1000 * 60);
        const refreshExpiresInDays = refreshExpiresInMinutes / (24 * 60);
        
        setRefreshTokenExpirationDate(refreshExpirationDate);
        setRefreshTokenDaysLeft(Math.max(0, Math.round(refreshExpiresInDays * 100) / 100));
      } else {
        setRefreshTokenExpirationDate(null);
        setRefreshTokenDaysLeft(null);
      }
      
      setRefreshFailCount(credentials.refreshFailCount || 0);
    }
  }, [credentials]);

  const checkTokenValidity = useCallback(async () => {
    console.log("🔍 Running comprehensive token validity check");
    
    try {
      const credentials = await getFortnoxCredentials();
      
      if (credentials?.expiresAt) {
        const currentTime = Date.now();
        const expirationTime = credentials.expiresAt;
        const expiresInMinutes = (expirationTime - currentTime) / (1000 * 60);
        const expiresInDays = expiresInMinutes / (24 * 60);

        const expirationDate = new Date(expirationTime);
        setTokenExpirationDate(expirationDate);
        setDaysUntilExpiration(Math.round(expiresInDays * 100) / 100);

        console.group("🕰️ Token Lifecycle Analysis");
        console.log(`Current Time: ${new Date().toISOString()}`);
        console.log(`Token Expiration: ${expirationDate.toISOString()}`);
        console.log(`Days Until Expiration: ${Math.round(expiresInDays)}`);
        console.log(`Minutes Until Expiration: ${Math.round(expiresInMinutes)}`);
        console.groupEnd();

        const shouldRefreshDueToTime = 
          expiresInDays <= 7 || 
          expiresInMinutes < 30;

        if (shouldRefreshDueToTime) {
          console.warn(`🚨 Proactive Token Refresh Required. Expires in ${Math.round(expiresInDays)} days`);
          
          try {
            const refreshSuccess = await forceTokenRefresh();
            
            if (refreshSuccess) {
              await Promise.all([
                refetchStatus(),
                queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] })
              ]);
              
              toast.success("Fortnox token refreshed automatically", {
                description: `Previous token was expiring in ${Math.round(expiresInDays)} days`
              });
            } else {
              console.error("Forced refresh failed");
              toast.error("Token refresh failed", {
                description: "Please try again later or reconnect to Fortnox"
              });
            }
          } catch (error) {
            console.error("Error during forced refresh:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error checking token validity:", error);
    }
  }, [refetchStatus, queryClient]);

  useEffect(() => {
    const refreshInterval = window.setInterval(checkTokenValidity, 15 * 60 * 1000);
    
    checkTokenValidity();
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [checkTokenValidity]);

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

  const copyToken = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard`);
  };

  const handleRefreshStatus = () => {
    setConnectionRetryCount(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
    queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
    toast.info("Refreshing Fortnox connection status...");
    
    checkTokenValidity();
  };

  const handleManualRefresh = async () => {
    try {
      toast.info("Manually refreshing Fortnox token...");
      const success = await forceTokenRefresh();
      
      if (success) {
        toast.success("Fortnox token refreshed successfully");
        await Promise.all([
          refetchStatus(),
          queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] })
        ]);
      } else {
        toast.error("Failed to refresh Fortnox token");
      }
    } catch (error) {
      console.error("Error during manual token refresh:", error);
      toast.error("Error refreshing token");
    }
  };

  const renderTokenExpirationInfo = () => {
    return (
      <div className="space-y-2 mt-4 p-3 bg-slate-50 rounded-md border">
        <h4 className="text-sm font-medium">Token Information</h4>
        
        {tokenExpirationDate && daysUntilExpiration !== null && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              daysUntilExpiration <= 0.5 ? "bg-red-500" : 
              daysUntilExpiration <= 3 ? "bg-orange-500" : 
              "bg-green-500"
            }`}></div>
            <div className="text-xs">
              <div className="font-medium">Access Token:</div>
              <div>
                Expires: {tokenExpirationDate.toLocaleString()} 
                {' '}<span className="font-medium">({daysUntilExpiration} days)</span>
              </div>
            </div>
          </div>
        )}
        
        {refreshTokenExpirationDate && refreshTokenDaysLeft !== null && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              refreshTokenDaysLeft <= 7 ? "bg-red-500" : 
              refreshTokenDaysLeft <= 14 ? "bg-orange-500" : 
              "bg-green-500"
            }`}></div>
            <div className="text-xs">
              <div className="font-medium">Refresh Token:</div>
              <div>
                Expires: {refreshTokenExpirationDate.toLocaleString()} 
                {' '}<span className="font-medium">({refreshTokenDaysLeft} days)</span>
              </div>
            </div>
          </div>
        )}
        
        {refreshFailCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-1 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Recent refresh failures: {refreshFailCount}</span>
          </div>
        )}
        
        <div className="text-xs text-slate-500 italic">
          Tokens are automatically refreshed 7 days before expiration
        </div>
      </div>
    );
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

      {connected ? (
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <div className="space-y-2">
              <p className="text-sm">
                Connected to Fortnox. You can now export invoices directly to your Fortnox account.
              </p>
              
              {credentials?.accessToken && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Key className="h-3 w-3 text-green-600" />
                        <span>Access Token</span>
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? "Hide" : "Show"}
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <div className="font-mono text-xs p-2 bg-black/10 rounded overflow-hidden whitespace-nowrap overflow-ellipsis">
                        {showToken ? credentials.accessToken : '••••••••••••••••••••••••••••••••'}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => copyToken(credentials.accessToken, 'Access Token')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {credentials?.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Token expires: {new Date(credentials.expiresAt).toLocaleString()}
                        {' '}
                        (in {Math.max(0, Math.round((credentials.expiresAt - Date.now()) / (1000 * 60)))} minutes)
                      </p>
                    )}
                  </div>
                </div>
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
          {renderTokenExpirationInfo()}
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
