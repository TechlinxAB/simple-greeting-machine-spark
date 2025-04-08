
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  getFortnoxAuthUrl, 
  getFortnoxCredentials, 
  isFortnoxConnected,
  disconnectFortnox,
  FortnoxCredentials
} from "@/integrations/fortnox/api";
import { Badge } from "@/components/ui/badge";
import { Link, ArrowUpRight, Check, X } from "lucide-react";

interface FortnoxConnectProps {
  clientId: string;
  clientSecret: string;
  onStatusChange?: (connected: boolean) => void;
}

export function FortnoxConnect({ clientId, clientSecret, onStatusChange }: FortnoxConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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
    if (!clientId) {
      toast.error("Client ID is required to connect to Fortnox");
      return;
    }

    // Generate the current URL for the redirect
    const redirectUri = `${window.location.origin}/settings?tab=fortnox`;
    
    // Get the authorization URL and redirect
    const authUrl = getFortnoxAuthUrl(clientId, redirectUri);
    setIsConnecting(true);
    
    // Open in a new window/tab
    window.open(authUrl, '_blank');
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
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleConnect} 
              disabled={!clientId || !clientSecret || isConnecting}
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
