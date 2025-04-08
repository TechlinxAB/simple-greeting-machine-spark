import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  exchangeCodeForTokens, 
  saveFortnoxCredentials
} from "@/integrations/fortnox/api";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface FortnoxCallbackHandlerProps {
  clientId: string;
  clientSecret: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FortnoxCallbackHandler({ 
  clientId, 
  clientSecret,
  onSuccess,
  onError
}: FortnoxCallbackHandlerProps) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Set the redirect URI when component mounts - must match exactly what was used in auth request
  useEffect(() => {
    const baseUrl = window.location.origin;
    const redirectPath = "/settings?tab=fortnox";
    setRedirectUri(`${baseUrl}${redirectPath}`);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      console.error("User not authenticated in callback handler");
      setStatus('error');
      setError("You must be logged in to complete the Fortnox authorization process");
      return;
    }
    
    // Log the full URL to debug
    console.log("Current URL in callback handler:", window.location.href);
    
    // Extract parameters from the URL
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const state = searchParams.get('state');
    const savedState = sessionStorage.getItem('fortnox_oauth_state');

    // Detailed logging for debugging
    console.log("Fortnox callback processing with params:", { 
      codeLength: code ? code.length : 0, 
      error: errorParam,
      errorDesc: errorDescription,
      statePresent: !!state,
      savedStatePresent: !!savedState,
      stateMatch: state === savedState
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
      console.warn("No saved state found in session storage - possible security risk");
      // Continue anyway since we have the code - this is just a warning
    }

    // Clean up the state from session storage
    if (savedState) {
      console.log("Clearing saved state from session storage");
      sessionStorage.removeItem('fortnox_oauth_state');
    }

    // Validate that we have all required parameters to proceed
    if (!clientId || !clientSecret) {
      console.error("Missing required OAuth credentials:", { 
        clientIdPresent: !!clientId, 
        clientSecretPresent: !!clientSecret 
      });
      setStatus('error');
      setError("Missing Fortnox API credentials");
      setErrorDetails("Please check your Fortnox client ID and secret in the settings form above, save them, and try connecting again.");
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
    handleAuthorizationCode(code);
  }, [searchParams, clientId, clientSecret, redirectUri, user, onError, onSuccess]);

  const handleAuthorizationCode = async (code: string) => {
    try {
      setStatus('processing');
      console.log("Processing authorization code, using redirect URI:", redirectUri);
      console.log("Using client ID:", clientId ? `${clientId.substring(0, 3)}...` : "missing");
      console.log("Client secret present:", !!clientSecret);

      // Add validation for client credentials length
      if (!clientId || clientId.trim().length < 5) {
        throw new Error("Client ID appears to be invalid (too short)");
      }
      
      if (!clientSecret || clientSecret.trim().length < 5) {
        throw new Error("Client Secret appears to be invalid (too short)");
      }

      // Exchange the code for tokens
      const tokenData = await exchangeCodeForTokens(
        code,
        clientId,
        clientSecret,
        redirectUri
      );

      console.log("Token exchange successful, saving credentials");

      // Verify we got the tokens
      if (!tokenData.accessToken || !tokenData.refreshToken) {
        throw new Error("Incomplete token data received from Fortnox");
      }

      // Save the credentials in the database
      await saveFortnoxCredentials({
        clientId,
        clientSecret,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
      });

      setStatus('success');
      toast.success("Successfully connected to Fortnox");
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error handling Fortnox callback:", error);
      
      let errorMessage = "Failed to exchange code for tokens";
      let errorDetail = "";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetail = error.stack || "";
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Better network error detection and messaging
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Network') || 
          errorMessage.includes('CORS') ||
          errorMessage.includes('cross-origin')) {
        errorMessage = "Network error connecting to Fortnox API";
        errorDetail = "This could be due to CORS restrictions or network connectivity issues.";
        
        // Additional guidance for CORS issues
        console.error("This is likely a CORS issue. The browser is preventing direct API calls to Fortnox from your frontend.");
      }
      
      // Look for Fortnox API errors
      if (errorMessage.includes('Fortnox API error')) {
        errorDetail = "The Fortnox API rejected the request. Please check your client ID, client secret, and redirect URI.";
      }
      
      // Handle edge function errors
      if (errorMessage.includes('Edge function error')) {
        errorDetail = "There was a problem with the server function that handles Fortnox authentication. Please check the logs for more details.";
      }
      
      setStatus('error');
      setError(errorMessage);
      setErrorDetails(errorDetail);
      
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  // Render different UI based on status
  if (status === 'idle') {
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
                onClick={() => navigate("/settings?tab=fortnox", { replace: true })}
              >
                <span>Try again</span>
              </Button>
            </div>
          )}
          
          {error?.includes('invalid_grant') && (
            <div className="mt-2">
              <p className="font-medium">The authorization code has expired or is invalid.</p>
              <p className="text-sm mt-1">Authorization codes can only be used once and expire quickly. Please try connecting again.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  // Clear the URL parameters but keep the tab
                  navigate("/settings?tab=fortnox", { replace: true });
                  // Reload the page
                  window.location.reload();
                }}
              >
                Try again
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
                className="mt-2"
                onClick={() => {
                  // Clear the URL parameters but keep the tab
                  navigate("/settings?tab=fortnox", { replace: true });
                }}
              >
                Try again
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
                className="mt-2"
                onClick={() => navigate("/settings?tab=fortnox", { replace: true })}
              >
                Try again
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
