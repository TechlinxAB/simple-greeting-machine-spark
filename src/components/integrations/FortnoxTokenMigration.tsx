
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getFortnoxCredentials, isLegacyToken, migrateLegacyToken } from '@/integrations/fortnox';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { FortnoxCredentials } from '@/integrations/fortnox';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function FortnoxTokenMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { role } = useAuth();
  const queryClient = useQueryClient();
  
  const isAdmin = role === 'admin';
  
  // Get current Fortnox credentials
  const { data: credentials, isLoading } = useQuery({
    queryKey: ["fortnox-credentials-for-migration"],
    queryFn: async () => {
      const creds = await getFortnoxCredentials();
      return creds;
    },
    staleTime: 10000,
  });
  
  // Determine if we have a legacy token that needs migration
  const needsMigration = !isLoading && credentials && isLegacyToken(credentials);
  
  const handleMigration = async () => {
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.accessToken) {
      toast.error("Missing required credentials for migration");
      return;
    }
    
    try {
      setIsMigrating(true);
      
      const migratedCredentials = await migrateLegacyToken(
        credentials.clientId,
        credentials.clientSecret,
        credentials.accessToken
      );
      
      if (migratedCredentials) {
        setMigrationComplete(true);
        
        // Force refresh credentials queries
        queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
        queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });
        queryClient.invalidateQueries({ queryKey: ["fortnox-credentials-for-migration"] });
        
        toast.success("Successfully migrated to JWT tokens", {
          description: "Your Fortnox integration now uses the more secure JWT authentication."
        });
      }
    } catch (error) {
      console.error("Migration error:", error);
      // Toast errors are already handled in the migrateLegacyToken function
    } finally {
      setIsMigrating(false);
    }
  };
  
  // If not admin or no migration needed, don't show anything
  if (!isAdmin || !needsMigration && !migrationComplete) {
    return null;
  }
  
  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-800 flex items-center gap-2">
          {migrationComplete ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Fortnox Migration Complete</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Fortnox Legacy Token Migration Required</span>
            </>
          )}
        </CardTitle>
        <CardDescription className="text-amber-700">
          {migrationComplete 
            ? "Your Fortnox integration has been successfully migrated to use the new JWT authentication system." 
            : "Fortnox is discontinuing legacy token support after April 30, 2025. Migrate now to avoid disruption."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {migrationComplete ? (
          <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Migration Successful</AlertTitle>
            <AlertDescription>
              Your Fortnox integration is now using the new JWT authentication system. No further action is required.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                We've detected that your Fortnox integration is using a legacy token that will stop working after April 30, 2025. 
                You need to migrate to the new JWT authentication system to ensure continued access.
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-amber-700 mb-4">
              This migration will convert your existing legacy token to the new JWT format. 
              This is a one-time process and your customers will not need to reauthenticate.
            </p>
            
            <Button 
              onClick={handleMigration} 
              disabled={isMigrating || !needsMigration}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
            >
              {isMigrating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Migrating...</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Migrate to JWT</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
