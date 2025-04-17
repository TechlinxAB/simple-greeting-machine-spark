
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  exchangeCodeForTokens, 
  saveFortnoxCredentials,
  getFortnoxCredentials,
  type FortnoxCredentials
} from "@/integrations/fortnox";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { environment } from "@/config/environment";

interface FortnoxCallbackHandlerProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FortnoxCallbackHandler({ 
  onSuccess,
  onError
}: FortnoxCallbackHandlerProps) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [needsRetry, setNeedsRetry] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch stored credentials from database
  const { data: storedCredentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: async () => {
      const credentials = await getFortnoxCredentials();
      console.log("Retrieved stored credentials:", credentials ? "Found" : "Not found");
      return credentials as FortnoxCredentials;
    },
    retry: 2,
    staleTime: 10000,
  });

  // Set the redirect URI when component mounts - must match exactly what was used in auth request
  useEffect(() => {
    const baseUrl = window.location.origin;
    const redirectPath = environment.fortnox.redirectBaseUrl;
    setRedirectUri(`${baseUrl}${redirectPath}`);
  }, []);

  useEffect(() => {
    // Debugging info
    console.log("FortnoxCallbackHandler activated with URL:", window.location.href);
    console.log("Search params:", Object.fromEntries(searchParams.entries()));
    
    // Check if user is logged in
    if (!user) {
      console.error("User not authenticated in callback handler");
      setStatus('error');
      setError("You must be logged in to complete the Fortnox authorization process");
      return;
    }
    
    // Wait until credentials are loaded
    if (isLoadingCredentials) {
      console.log("Waiting for credentials to load...");
      return;
    }
    
    // Extract parameters from the URL
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');
    const savedState = sessionStorage.getItem('fortnox_oauth_state');

    // Detailed logging for debugging
    console.log("Fortnox callback processing with params:", { 
      code: code ? "present" : "missing", 
      codeLength: code ? code.length : 0, 
      error: errorParam,
      errorDesc: errorDescription,
      statePresent: !!state,
      savedStatePresent: !!savedState,
      stateMatch: state === savedState,
      credentials: storedCredentials ? {
        clientIdPresent: !!storedCredentials.clientId,
        clientSecretPresent: !!storedCredentials.clientSecret,
      } : 'none'
    });
    
    // Check if we have an error from Fortnox
    if (errorParam) {
      console.error("Fortnox returned an error:", errorParam, errorDescription);
      setStatus('error');
      setError(errorDescription || 'Unknown error occurred during Fortnox authorization');
      if (onError) onError(new Error(errorDescription || 'Unknown error occurred'));
      return;
    }

    // Check if we have a code parameter from Fortnox
    if (!code) {
      console.log("No authorization code found in URL");
      return; // This might be an initial load, so just return
    }

    // Verify state parameter to prevent CSRF attacks
    if (state && savedState && state !== savedState) {
      console.error("State mismatch - possible CSRF attack");
      console.error("Received state:", state);
      console.error("Expected state:", savedState);
      setStatus('error');
      setError("Security verification failed - state mismatch");
      setErrorDetails("The state parameter in the callback URL doesn't match the one stored in session storage. This could indicate a security issue.");
      if (onError) onError(new Error("State mismatch - security verification failed"));
      return;
    }

    // Check if we don't have a saved state (warn but proceed anyway)
    if (!savedState && state) {
      console.warn("No saved state found in session storage - possible security risk, but continuing");
    }

    // Clean up the state from session storage
    if (savedState) {
      console.log("Clearing saved state from session storage");
      sessionStorage.removeItem('fortnox_oauth_state');
    }

    // Check if we have valid credentials from database
    if (!storedCredentials || !storedCredentials.clientId || !storedCredentials.clientSecret) {
      console.error("No valid Fortnox credentials found in database", storedCredentials);
      setStatus('error');
      setError("Missing Fortnox API credentials");
      setErrorDetails("Please check your Fortnox client ID and client secret in the settings form above, save them, and try connecting again.");
      if (onError) onError(new Error("Missing Fortnox API credentials"));
      return;
    }

    if (!redirectUri) {
      console.error("Redirect URI not set");
      setStatus('error');
      setError("Application configuration error: Redirect URI not set");
      if (onError) onError(new Error("Redirect URI not set"));
      return;
    }

    // We have a code and all required parameters, proceed with token exchange
    handleAuthorizationCode(code, storedCredentials.clientId, storedCredentials.clientSecret);
  }, [searchParams, storedCredentials, redirectUri, user, onError, onSuccess, isLoadingCredentials]);

  const handleAuthorizationCode = async (code: string, clientId: string, clientSecret: string) => {
    try {
      setStatus('processing');
      console.log("Processing authorization code, using redirect URI:", redirectUri);
      console.log("Using client ID:", clientId ? `${clientId.substring(0, 5)}...` : "missing");
      console.log("Client secret present:", !!clientSecret);

      // Add validation for client credentials length
      if (!clientId || clientId.trim().length < 5) {
        throw new Error("Client ID appears to be invalid (too short)");
      }
      
      if (!clientSecret || clientSecret.trim().length < 5) {
        throw new Error("Client Secret appears to be invalid (too short)");
      }

      // Exchange the code for tokens
      console.log("Calling exchangeCodeForTokens...");
      const tokenData = await exchangeCodeForTokens(
        code,
        clientId,
        clientSecret,
        redirectUri
      );
      
      console.log("Token exchange successful, received token data:", {
        accessTokenPresent: !!tokenData.accessToken,
        refreshTokenPresent: !!tokenData.refreshToken,
        expiresAt: tokenData.expiresAt
      });

      // Verify we got the tokens
      if (!tokenData.accessToken || !tokenData.refreshToken) {
        throw new Error("Incomplete token data received from Fortnox");
      }

      // Save the credentials in the database
      console.log("Saving credentials to database...");
      await saveFortnoxCredentials({
        clientId,
        clientSecret,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
      });
      
      console.log("Credentials saved successfully");
      
      // Force refresh queries to make sure we get the latest data
      queryClient.invalidateQueries({ queryKey: ["fortnox-credentials"] });
      queryClient.invalidateQueries({ queryKey: ["fortnox-connection-status"] });

      setStatus('success');
      toast.success("Successfully connected to Fortnox");
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error handling Fortnox callback:", error);
      
      let errorMessage = "Failed to exchange code for tokens";
      let errorDetail = "";
      let requiresRetry = false;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetail = error.stack || "";
        
        // Check if this is an expired code error
        if (
          errorMessage.includes('invalid_grant') || 
          errorMessage.includes('expired')
        ) {
          errorMessage = "Authorization code has expired";
          errorDetail = "The code from Fortnox is no longer valid. Please try connecting again.";
          requiresRetry = true;
        }
      } else if (typeof error === 'object' && error !== null) {
        // Fixed this part to properly type check
        const errorObj = error as Record<string, unknown>;
        
        if ('error' in errorObj && errorObj.error === 'invalid_grant') {
          errorMessage = "Authorization code has expired";
          errorDetail = "The code from Fortnox is no longer valid. Please try connecting again.";
          requiresRetry = true;
        } else if ('message' in errorObj && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
        
        // Check for request_needs_retry flag from our backend
        if ('request_needs_retry' in errorObj && errorObj.request_needs_retry) {
          requiresRetry = true;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Better network error detection and messaging
      if (
        typeof errorMessage === 'string' && (
          errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Network') || 
          errorMessage.includes('CORS') ||
          errorMessage.includes('cross-origin')
        )
      ) {
        errorMessage = "Network error connecting to Fortnox API";
        errorDetail = "This could be due to CORS restrictions or network connectivity issues.";
      }
      
      setStatus('error');
      setError(errorMessage);
      setErrorDetails(errorDetail);
      setNeedsRetry(requiresRetry);
      
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // Function to retry the Fortnox connection
  const handleRetry = () => {
    // Clear URL parameters and navigate back to the settings page
    toast.info("Restarting Fortnox connection process...");
    navigate("/settings?tab=fortnox", { replace: true });
    
    // Short delay before refreshing to ensure state is reset
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  // Render different UI based on status
  if (status === 'idle') {
    if (isLoadingCredentials) {
      return (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <AlertTitle>Loading credentials</AlertTitle>
          <AlertDescription>
            Please wait while we load your Fortnox credentials...
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  if (status === 'processing') {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        <AlertTitle>Processing</AlertTitle>
        <AlertDescription>
          Please wait while we connect your Fortnox account...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'success') {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Connection successful</AlertTitle>
        <AlertDescription>
          Your Fortnox account has been successfully connected.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection failed</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error || 'An unknown error occurred while connecting to Fortnox.'}</p>
          
          {errorDetails && (
            <p className="text-sm mt-1">{errorDetails}</p>
          )}
          
          {error?.includes('redirect_uri_mismatch') && (
            <div className="mt-2">
              <p className="font-medium">Please make sure this exact redirect URI is registered in Fortnox:</p>
              <code className="mt-1 block bg-gray-700 text-white p-2 rounded-md text-xs overflow-auto">
                {redirectUri}
              </code>
            </div>
          )}
          
          {error?.includes('Missing Fortnox API credentials') && (
            <div className="mt-2">
              <p className="font-medium">Please enter your Client ID and Client Secret in the form above, save them, and try connecting again.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  // Focus on the client ID field in the form
                  const clientIdField = document.querySelector('[name="fortnoxClientId"]') as HTMLInputElement;
                  if (clientIdField) {
                    clientIdField.focus();
                  }
                  
                  // Switch to the form section
                  const saveButton = document.querySelector('button[type="submit"]');
                  if (saveButton) {
                    saveButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                Go to credentials form
              </Button>
            </div>
          )}
          
          {error?.includes('Network error') && (
            <div className="mt-2">
              <p className="font-medium">This is likely due to CORS restrictions from your browser.</p>
              <p className="text-sm mt-1">We're using a Supabase Edge Function to handle this request. Please check that your Client ID and Client Secret are correct.</p>
              <Button
                variant="outline" 
                size="sm"
                className="mt-2 flex items-center gap-1"
                onClick={handleRetry}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                <span>Try again</span>
              </Button>
            </div>
          )}
          
          {(error?.includes('invalid_grant') || error?.includes('expired') || needsRetry) && (
            <div className="mt-2">
              <p className="font-medium">The authorization code has expired or is invalid.</p>
              <p className="text-sm mt-1">Authorization codes can only be used once and expire quickly. Please try connecting again.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-1"
                onClick={handleRetry}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                <span>Try again</span>
              </Button>
            </div>
          )}
          
          {error?.includes('state mismatch') && (
            <div className="mt-2">
              <p className="font-medium">Security verification failed.</p>
              <p className="text-sm mt-1">The state parameter doesn't match what was expected. Please try connecting again.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-1"
                onClick={handleRetry}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                <span>Try again</span>
              </Button>
            </div>
          )}
          
          {error?.includes('Edge function error') && (
            <div className="mt-2">
              <p className="font-medium">There was an error with the Edge Function.</p>
              <p className="text-sm mt-1">Check that your Client ID and Client Secret are correct and that you've saved them before connecting.</p>
              <Button
                variant="outline" 
                size="sm"
                className="mt-2 flex items-center gap-1"
                onClick={handleRetry}
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                <span>Try again</span>
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
