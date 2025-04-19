
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFortnoxCredentials, getTokenRefreshHistory, triggerSystemTokenRefresh } from "@/integrations/fortnox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow, format, addDays, parseISO, differenceInMinutes } from "date-fns";
import { TokenRefreshLog } from "@/integrations/fortnox/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FortnoxTokenInfo() {
  const [nextScheduledRefresh, setNextScheduledRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  const { data: refreshHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["fortnox-token-refresh-history"],
    queryFn: async () => await getTokenRefreshHistory(10),
    enabled: !!credentials?.accessToken,
  });

  const getTokenExpiration = (token?: string) => {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return null;
      
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error("Error parsing token:", error);
      return null;
    }
  };

  const accessTokenExpiration = credentials?.accessToken ? 
    getTokenExpiration(credentials.accessToken) : null;

  const refreshTokenExpiration = credentials?.refreshToken ? 
    addDays(new Date(), 45) : null;

  useEffect(() => {
    if (credentials?.accessToken) {
      const calculateNextRefresh = () => {
        const now = new Date();
        let nextRefresh = new Date(now);
        
        const currentMinute = now.getMinutes();
        const nextMinuteMark = Math.ceil(currentMinute / 15) * 15;
        
        if (nextMinuteMark === 60) {
          nextRefresh.setHours(now.getHours() + 1, 0, 0, 0);
        } else {
          nextRefresh.setMinutes(nextMinuteMark, 0, 0);
        }
        
        setNextScheduledRefresh(nextRefresh);
      };

      calculateNextRefresh();
      
      const intervalId = setInterval(calculateNextRefresh, 60000);
      return () => clearInterval(intervalId);
    }
  }, [credentials]);

  useEffect(() => {
    const checkTokenExpirationAndRefresh = async () => {
      if (!accessTokenExpiration) return;

      const now = new Date();
      const minutesUntilExpiry = differenceInMinutes(accessTokenExpiration, now);
      
      if (minutesUntilExpiry <= 0 || minutesUntilExpiry < 20) {
        console.log(`Token ${minutesUntilExpiry <= 0 ? 'is expired' : 'expires soon'} - attempting refresh`);
        
        if (!isRefreshing) {
          setIsRefreshing(true);
          try {
            const success = await triggerSystemTokenRefresh(true);
            if (success) {
              console.log("Token refresh successful");
              toast.success("Access token refreshed");
              queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
              queryClient.invalidateQueries({ queryKey: ["fortnox-token-refresh-history"] });
            } else {
              console.error("Token refresh failed");
              toast.error("Failed to refresh access token");
            }
          } catch (error) {
            console.error("Error during token refresh:", error);
          } finally {
            setIsRefreshing(false);
          }
        }
      }
    };

    checkTokenExpirationAndRefresh();

    const intervalTime = accessTokenExpiration && new Date() > accessTokenExpiration ? 60000 : 120000;
    const intervalId = setInterval(checkTokenExpirationAndRefresh, intervalTime);
    
    return () => clearInterval(intervalId);
  }, [accessTokenExpiration, isRefreshing, queryClient]);

  if (isLoadingCredentials || !credentials?.accessToken) {
    return null;
  }

  const tokenHealth = () => {
    if (!accessTokenExpiration) return "unknown";
    const now = new Date();
    const timeUntilExpiry = accessTokenExpiration.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 0) return "expired";
    if (hoursUntilExpiry < 1) return "critical";
    if (hoursUntilExpiry < 12) return "warning";
    return "healthy";
  };

  const health = tokenHealth();
  const healthColors = {
    healthy: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
    expired: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-800"
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      toast.info("Manually refreshing token...");
      const success = await triggerSystemTokenRefresh(true);
      
      if (success) {
        toast.success("Token refreshed successfully");
        queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
        queryClient.invalidateQueries({ queryKey: ["fortnox-token-refresh-history"] });
      } else {
        toast.error("Failed to refresh token");
      }
    } catch (error) {
      console.error("Error in manual refresh:", error);
      toast.error("Error refreshing token");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Fortnox Token Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Access Token</span>
            <Badge variant="outline" className={healthColors[health]}>
              {health === "healthy" && "Healthy"}
              {health === "warning" && "Refreshing Soon"}
              {health === "critical" && "Refresh Needed"}
              {health === "expired" && "Expired"}
              {health === "unknown" && "Unknown Status"}
            </Badge>
          </div>
          
          {accessTokenExpiration && (
            <p className="text-xs text-gray-600">
              Expires: {format(accessTokenExpiration, 'PPpp')} ({formatDistanceToNow(accessTokenExpiration, { addSuffix: true })})
            </p>
          )}
          
          {!accessTokenExpiration && (
            <p className="text-xs text-gray-600">Unable to determine token expiration</p>
          )}
          
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="mt-1"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Refresh Token</span>
            {credentials.refreshToken ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">Active</Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800">Missing</Badge>
            )}
          </div>
          
          {refreshTokenExpiration && (
            <p className="text-xs text-gray-600">
              Valid for approximately 45 days (until around {format(refreshTokenExpiration, 'PPP')})
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Automatic Refresh Schedule</span>
          </div>
          
          {nextScheduledRefresh && (
            <p className="text-xs text-gray-600">
              Next scheduled refresh: {format(nextScheduledRefresh, 'PPpp')} ({formatDistanceToNow(nextScheduledRefresh, { addSuffix: true })})
            </p>
          )}
          
          <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The system automatically refreshes the access token every 15 minutes and also proactively when it has less than 20 minutes before expiration.
              A forced refresh is also performed every 12 hours to ensure token validity. The refresh token is valid for approximately 45 days.
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Recent Token Refreshes</span>
          </div>
          
          {isLoadingHistory && <p className="text-xs text-gray-600">Loading refresh history...</p>}
          
          {!isLoadingHistory && refreshHistory.length === 0 && (
            <p className="text-xs text-gray-600">No recent token refreshes found.</p>
          )}
          
          {!isLoadingHistory && refreshHistory.length > 0 && (
            <div className="max-h-40 overflow-auto">
              <ul className="text-xs space-y-2">
                {refreshHistory.map((log: TokenRefreshLog) => (
                  <li key={log.id} className="py-1 px-2 rounded bg-gray-50 flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    )}
                    <span>
                      {log.success ? "Successful refresh" : "Failed refresh"} on {format(parseISO(log.created_at), 'PP p')}
                      {log.message && ` - ${log.message}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
