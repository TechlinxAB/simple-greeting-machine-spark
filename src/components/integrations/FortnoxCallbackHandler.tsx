
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  exchangeCodeForTokens, 
  saveFortnoxCredentials,
  FortnoxCredentials
} from "@/integrations/fortnox/api";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
      code: code ? `${code.substring(0, 5)}...` : undefined, 
      error: errorParam,
      errorDesc: errorDescription,
      state: state ? '(present)' : '(not present)',
      savedState: savedState ? '(present)' : '(not present)'
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
      setStatus('error');
      setError("Security verification failed - please try connecting again");
      if (onError) onError(new Error("State mismatch - security verification failed"));
      return;
    }

    // Clean up the state from session storage
    if (savedState) {
      console.log("Clearing saved state from session storage");
      sessionStorage.removeItem('fortnox_oauth_state');
    } else {
      console.warn("No saved state found in session storage - possible security risk");
    }

    // Validate that we have all required parameters to proceed
    if (!clientId || !clientSecret) {
      console.error("Missing required OAuth credentials:", { 
        clientIdExists: !!clientId, 
        clientSecretExists: !!clientSecret 
      });
      setStatus('error');
      setError("Missing Fortnox API credentials. Please check your Fortnox client ID and secret in the settings form above, save them, and try connecting again.");
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
      if (error instanceof Error) {
        errorMessage = error.message;
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
        errorMessage = "Network error connecting to Fortnox API. This could be due to CORS restrictions or network connectivity issues.";
        
        // Additional guidance for CORS issues
        console.error("This is likely a CORS issue. The browser is preventing direct API calls to Fortnox from your frontend.");
        console.error("Consider implementing a server-side proxy or edge function to handle the token exchange.");
      }
      
      setStatus('error');
      setError(errorMessage);
      
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
            </div>
          )}
          
          {error?.includes('Network error') && (
            <div className="mt-2">
              <p className="font-medium">This is likely due to CORS restrictions from your browser.</p>
              <p className="text-sm mt-1">We're using a Supabase Edge Function to handle this request, but there might be an issue with it.</p>
            </div>
          )}
          
          {error?.includes('Edge function error') && (
            <div className="mt-2">
              <p className="font-medium">There was an error with the Edge Function.</p>
              <p className="text-sm mt-1">Check that your Client ID and Client Secret are correct and that you've saved them before connecting.</p>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
