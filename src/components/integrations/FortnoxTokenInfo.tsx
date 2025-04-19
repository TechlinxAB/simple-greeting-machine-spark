
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { Badge } from "@/components/ui/badge";
import { forceTokenRefresh } from "@/integrations/fortnox/auth";
import { Card } from "@/components/ui/card";
import { Clock, RefreshCcw } from "lucide-react";
import { useEffect, useRef } from "react";

export function FortnoxTokenInfo() {
  const queryClient = useQueryClient();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: credentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (credentials?.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // If less than 30 minutes until expiry, trigger a refresh
      if (timeUntilExpiry > 0 && timeUntilExpiry <= 30 * 60 * 1000) {
        console.log("Token expires soon, scheduling refresh");
        
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            await forceTokenRefresh();
            queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
          } catch (error) {
            console.error("Auto-refresh failed:", error);
          }
        }, 1000); // Small delay to avoid immediate execution
      }
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [credentials?.expiresAt, queryClient]);

  if (!credentials?.expiresAt) {
    return null;
  }

  const expiresAt = new Date(credentials.expiresAt);
  const now = new Date();
  const minutesUntilExpiry = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)));
  
  const getExpiryStatus = () => {
    if (minutesUntilExpiry <= 5) {
      return { color: "destructive", text: "Expiring very soon" };
    }
    if (minutesUntilExpiry <= 30) {
      return { color: "warning", text: "Expiring soon" };
    }
    return { color: "success", text: "Valid" };
  };

  const status = getExpiryStatus();

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Token expires in:</span>
          <span className="font-medium">
            {minutesUntilExpiry} minute{minutesUntilExpiry !== 1 ? 's' : ''}
          </span>
        </div>
        <Badge variant={status.color as "default" | "destructive" | "warning"}>
          {status.text}
        </Badge>
      </div>
    </Card>
  );
}
