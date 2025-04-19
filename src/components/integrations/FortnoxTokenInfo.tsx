
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
  const [refreshScheduled, setRefreshScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      setRefreshScheduled(false);
      setScheduledTime(null);
    }

    if (credentials?.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // If token expires within 30 minutes, schedule a refresh
      if (timeUntilExpiry > 0 && timeUntilExpiry <= 30 * 60 * 1000) {
        console.log("Token expires soon, scheduling refresh");
        
        // Calculate when the refresh will happen
        const refreshTime = new Date(now + 1000); // simulate immediate refresh for testing
        setRefreshScheduled(true);
        setScheduledTime(refreshTime);
        
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            await forceTokenRefresh();
            setLastRefresh(new Date());
            setRefreshScheduled(false);
            setScheduledTime(null);
            queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
          } catch (error) {
            console.error("Auto-refresh failed:", error);
            setRefreshScheduled(false);
            setScheduledTime(null);
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

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex justify-center">
          <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!credentials?.expiresAt) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground text-sm">
          Token information unavailable
        </div>
      </Card>
    );
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Token Status:</span>
          </div>
          <Badge variant={status.color as "default" | "destructive" | "warning" | "success"}>
            {status.text}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">Expires in:</span>
            <span className="font-medium text-right">
              {minutesUntilExpiry} minute{minutesUntilExpiry !== 1 ? 's' : ''}
            </span>
          
            <span className="text-muted-foreground">Expires at:</span>
            <span className="font-medium text-right">
              {formatTime(expiresAt)}
            </span>
            
            {refreshScheduled && scheduledTime && (
              <>
                <span className="text-muted-foreground flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 text-amber-500" />
                  Auto-refresh at:
                </span>
                <span className="font-medium text-amber-600 text-right">
                  {formatTime(scheduledTime)}
                </span>
              </>
            )}
            
            {lastRefresh && (
              <>
                <span className="text-muted-foreground flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3" />
                  Last refresh:
                </span>
                <span className="font-medium text-right">
                  {formatTime(lastRefresh)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
