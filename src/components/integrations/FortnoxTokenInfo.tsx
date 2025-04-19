import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { Badge } from "@/components/ui/badge";
import { forceTokenRefresh } from "@/integrations/fortnox/auth";
import { Card } from "@/components/ui/card";
import { Clock, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";

export function FortnoxTokenInfo() {
  const queryClient = useQueryClient();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const [lastRefresh, setLastRefresh] = useState<Date>();

  const { data: credentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (credentials?.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry > 0 && timeUntilExpiry <= 30 * 60 * 1000) {
        console.log("Token expires soon, scheduling refresh");
        
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            await forceTokenRefresh();
            setLastRefresh(new Date());
            queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
          } catch (error) {
            console.error("Auto-refresh failed:", error);
          }
        }, 1000);
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
      return { color: "destructive", text: "Critical - Refresh Imminent" };
    }
    if (minutesUntilExpiry <= 30) {
      return { color: "warning", text: "Auto-Refresh Scheduled" };
    }
    return { color: "success", text: "Token Valid" };
  };

  const formatTime = (date: Date) => {
    return format(date, "HH:mm:ss");
  };

  const status = getExpiryStatus();

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Token Status:</span>
          </div>
          <Badge variant={status.color as "default" | "destructive" | "warning" | "success"}>
            {status.text}
          </Badge>
        </div>
        
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Expires in:</span>
            <span className="font-medium text-foreground">
              {minutesUntilExpiry} minute{minutesUntilExpiry !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Expires at:</span>
            <span className="font-medium text-foreground">
              {formatTime(expiresAt)}
            </span>
          </div>
          
          {lastRefresh && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <RefreshCcw className="h-3 w-3" />
                Last refresh:
              </span>
              <span className="font-medium text-foreground">
                {formatTime(lastRefresh)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
