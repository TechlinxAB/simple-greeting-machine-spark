
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getFortnoxCredentials, isConnected, clearFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { getRedirectUri } from "@/config/environment";
import { RefreshCw, Link, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { triggerSystemTokenRefresh, getTokenRefreshHistory } from "@/integrations/fortnox/auth";
import { FortnoxTokenInfo } from "@/components/integrations/FortnoxTokenInfo";
import { toast } from "sonner";
import { FortnoxConnectionStatus } from "@/integrations/fortnox/types";

interface FortnoxConnectProps {
  clientId: string;
  clientSecret: string;
}

export function FortnoxConnect({ clientId, clientSecret }: FortnoxConnectProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Set up state for OAuth flow
  useEffect(() => {
    // Store the current origin and state in sessionStorage
    const state = crypto.randomUUID();
    const stateData = {
      state,
      origin: window.location.origin,
      timestamp: Date.now()
    };
    sessionStorage.setItem('fortnox_oauth_state', JSON.stringify(stateData));
    
    return () => {
      // Cleanup on unmount
    };
  }, []);
  
  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    staleTime: 60000,
    refetchInterval: 300000,
  });
  
  const { data: connectionStatus, isLoading: isLoadingConnectionStatus } = useQuery({
    queryKey: ["fortnox-connection-status"],
    queryFn: async () => {
      if (!credentials) {
        return { isConnected: false };
      }
      return { isConnected: await isConnected(credentials) };
    },
    enabled: !!credentials,
    staleTime: 60000,
    refetchInterval: 300000,
  });
  
  const { data: refreshHistory } = useQuery({
    queryKey: ["fortnox-token-history"],
    queryFn: async () => {
      try {
        return await getTokenRefreshHistory(5);
      } catch (error) {
        console.error("Error fetching token refresh history:", error);
        return [];
      }
    },
    staleTime: 60000,
    enabled: !!credentials && !!(connectionStatus?.isConnected),
  });
  
  const handleConnect = () => {
    if (!clientId) {
      toast.error("Client ID is required to connect to Fortnox");
      return;
    }
    
    // Get state from session storage or generate new one
    let stateData;
    try {
      const stateJson = sessionStorage.getItem('fortnox_oauth_state');
      if (stateJson) {
        stateData = JSON.parse(stateJson);
      } 
    } catch (e) {
      console.error("Error parsing OAuth state:", e);
    }
    
    if (!stateData || !stateData.state) {
      stateData = {
        state: crypto.randomUUID(),
        origin: window.location.origin,
        timestamp: Date.now()
      };
      sessionStorage.setItem('fortnox_oauth_state', JSON.stringify(stateData));
    }
    
    const redirectUri = getRedirectUri();
    console.log("Using redirect URI:", redirectUri);
    
    // Construct the authorization URL
    const scope = "companyinformation invoice customer";
    const authUrl = new URL("https://apps.fortnox.se/oauth-v1/auth");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", scope);
    authUrl.searchParams.append("state", stateData.state);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("response_type", "code");
    
    console.log("Navigating to Fortnox authorization URL:", authUrl.toString());
    window.location.href = authUrl.toString();
  };
  
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const success = await triggerSystemTokenRefresh(true);
      if (success) {
        toast.success("Token refresh initiated");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
        queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
        queryClient.invalidateQueries({ queryKey: ["fortnox-token-history"] });
      } else {
        toast.error("Failed to initiate token refresh");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error("Error refreshing token");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await clearFortnoxCredentials();
      toast.success("Disconnected from Fortnox");
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["fortnox-token-history"] });
    } catch (error) {
      console.error("Error disconnecting from Fortnox:", error);
      toast.error("Error disconnecting from Fortnox");
    }
  };
  
  if (isLoadingCredentials || isLoadingConnectionStatus) {
    return (
      <div className="flex items-center space-x-4">
        <Button disabled>
          <span className="mr-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </span>
          Checking Fortnox Connection...
        </Button>
      </div>
    );
  }
  
  const isFortnoxConnected = connectionStatus?.isConnected || false;
  
  if (isFortnoxConnected) {
    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center space-x-4">
          <Button onClick={handleRefreshToken} disabled={isRefreshing}>
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Token
          </Button>
          
          <Button variant="destructive" onClick={handleDisconnect}>
            <XCircle className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
        
        <FortnoxTokenInfo 
          credentials={credentials} 
          refreshHistory={refreshHistory} 
        />
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-4">
      <Button 
        onClick={handleConnect} 
        disabled={!clientId}
        className="bg-[#446C9E] hover:bg-[#2E4A6B] text-white"
      >
        <Link className="h-4 w-4 mr-2" />
        Connect to Fortnox
      </Button>
      
      {!clientId && (
        <p className="text-sm text-muted-foreground">
          Enter a Client ID and Secret above, then save the settings before connecting.
        </p>
      )}
    </div>
  );
}
