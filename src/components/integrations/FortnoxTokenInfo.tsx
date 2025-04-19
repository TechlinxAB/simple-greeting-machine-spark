
import { useQuery } from "@tanstack/react-query";
import { getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistanceToNow, format, addDays, addHours, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";

export function FortnoxTokenInfo() {
  const [refreshHistory, setRefreshHistory] = useState<any[]>([]);
  const [nextScheduledRefresh, setNextScheduledRefresh] = useState<Date | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  // Parse JWT to get expiration time
  const getTokenExpiration = (token?: string) => {
    if (!token) return null;
    try {
      // JWT tokens consist of three parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      // The second part contains the payload, which we need to decode
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

  // Refresh tokens typically last 45 days
  const refreshTokenExpiration = credentials?.refreshToken ? 
    addDays(new Date(), 45) : null;

  // Get token refresh history
  useEffect(() => {
    const fetchRefreshHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('token_refresh_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error("Error fetching token refresh history:", error);
          return;
        }
        
        setRefreshHistory(data || []);
      } catch (error) {
        console.error("Failed to fetch token refresh history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Calculate the next scheduled refresh time
    // Assuming the cron job runs at 3:00 AM daily
    const calculateNextRefresh = () => {
      const now = new Date();
      const todayRefreshTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        3, 0, 0
      );
      
      // If it's already past 3 AM today, the next refresh is tomorrow at 3 AM
      if (now > todayRefreshTime) {
        todayRefreshTime.setDate(todayRefreshTime.getDate() + 1);
      }
      
      setNextScheduledRefresh(todayRefreshTime);
    };

    if (credentials?.accessToken) {
      fetchRefreshHistory();
      calculateNextRefresh();
    }
  }, [credentials]);

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Fortnox Token Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Access Token Information */}
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
        </div>

        {/* Refresh Token Information */}
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

        {/* Next Scheduled Refresh */}
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
              The system attempts to refresh the access token daily at 3:00 AM. 
              The refresh token is used to get a new access token and is valid for approximately 45 days.
            </AlertDescription>
          </Alert>
        </div>

        {/* Token Refresh History */}
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
                {refreshHistory.map((log, index) => (
                  <li key={index} className="py-1 px-2 rounded bg-gray-50 flex items-center gap-2">
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
