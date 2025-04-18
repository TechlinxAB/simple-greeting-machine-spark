
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { exchangeCodeForTokens } from "@/integrations/fortnox/auth";
import { saveFortnoxCredentials, getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { getRedirectUri } from "@/config/environment";
import { toast } from "sonner";

interface FortnoxCallbackHandlerProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FortnoxCallbackHandler({ onSuccess, onError }: FortnoxCallbackHandlerProps) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Clear any previous error messages
        setErrorMessage(null);
        
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const stateParam = searchParams.get("state");
        
        console.log("Fortnox callback received:", {
          hasCode: !!code,
          hasError: !!errorParam,
          hasState: !!stateParam
        });

        // Check for error from Fortnox
        if (errorParam) {
          const message = errorDescription ? 
            `Fortnox error: ${errorParam} - ${errorDescription}` : 
            `Fortnox error: ${errorParam}`;
          
          console.error(message);
          setStatus("error");
          setErrorMessage(message);
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        // Check for missing code
        if (!code) {
          const message = "Missing authorization code from Fortnox";
          console.error(message);
          setStatus("error");
          setErrorMessage(message);
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        // Verify state parameter
        let expectedState: string | null = null;
        try {
          // Get the state from sessionStorage
          const stateJson = sessionStorage.getItem('fortnox_oauth_state');
          if (stateJson) {
            try {
              const stateData = JSON.parse(stateJson);
              expectedState = stateData.state;
              
              // Log state verification
              console.log("Verifying OAuth state:", {
                receivedState: stateParam,
                expectedState: expectedState,
                storedOrigin: stateData.origin,
                currentOrigin: window.location.origin
              });
              
              // Check for domain mismatch and log it (but don't fail)
              if (stateData.origin && stateData.origin !== window.location.origin) {
                console.warn(
                  "OAuth redirect received on different origin than initiated.",
                  "Initiated on:", stateData.origin,
                  "Received on:", window.location.origin
                );
              }
            } catch (parseError) {
              console.error("Error parsing stored OAuth state:", parseError);
              // Fallback to using raw value if JSON parsing fails
              expectedState = stateJson;
            }
          }
          
          if (stateParam !== expectedState) {
            console.error("State parameter mismatch", {
              received: stateParam,
              expected: expectedState
            });
            throw new Error("Security validation failed: state parameter mismatch");
          }
        } catch (stateError) {
          console.error("State verification error:", stateError);
          setStatus("error");
          setErrorMessage("Security validation failed. Please try connecting again.");
          
          if (onError) {
            onError(new Error("State verification failed"));
          }
          return;
        }
        
        // Get existing credentials to access client ID and secret
        const credentials = await getFortnoxCredentials();
        
        if (!credentials || !credentials.clientId || !credentials.clientSecret) {
          const message = "Missing client credentials. Please set up your Fortnox API keys first.";
          console.error(message);
          setStatus("error");
          setErrorMessage(message);
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        // Get the redirect URI using our common function
        const redirectUri = getRedirectUri();
        console.log("Using redirect URI for token exchange:", redirectUri);
        
        // Exchange code for tokens
        console.log("Exchanging authorization code for tokens...");
        let tokens;
        try {
          tokens = await exchangeCodeForTokens(
            code,
            credentials.clientId,
            credentials.clientSecret,
            redirectUri
          );
        } catch (tokenError) {
          console.error("Error exchanging code for tokens:", tokenError);
          
          // If the error suggests the authorization code has expired, we might need to try again
          const errorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
          
          if ((errorMsg.includes('invalid_grant') || errorMsg.includes('expired')) && retryCount < 2) {
            setIsRetrying(true);
            setRetryCount(prev => prev + 1);
            
            // Let the user know we're retrying
            toast.info("Authorization code may have timed out. Retrying connection...");
            
            // Try connecting again after a delay
            setTimeout(() => {
              window.location.href = `/settings?tab=fortnox&retry=${Date.now()}`;
            }, 2000);
            return;
          }
          
          throw tokenError;
        }
        
        if (!tokens || !tokens.accessToken) {
          throw new Error("Failed to get access token from Fortnox");
        }
        
        // Save tokens
        console.log("Saving Fortnox tokens...");
        await saveFortnoxCredentials({
          ...credentials,
          ...tokens,
        });
        
        console.log("Fortnox connection successful!");
        setStatus("success");
        
        // Show success message
        toast.success("Successfully connected to Fortnox!");
        
        if (onSuccess) {
          onSuccess();
        }
        
        // Clean up the state from sessionStorage
        sessionStorage.removeItem('fortnox_oauth_state');
        
      } catch (error) {
        console.error("Error processing Fortnox callback:", error);
        setStatus("error");
        
        let message = "Failed to connect to Fortnox";
        if (error instanceof Error) {
          message = error.message;
          
          // Make error messages more user-friendly
          if (message.includes("invalid_grant")) {
            message = "Authorization code has expired. Please try connecting again.";
          } else if (message.includes("invalid_client")) {
            message = "Invalid API credentials. Please check your Fortnox client ID and secret.";
          } else if (message.includes("network error") || message.includes("Failed to fetch")) {
            message = "Network error. Please check your internet connection and try again.";
          }
        }
        
        setErrorMessage(message);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
    
    handleCallback();
  }, [searchParams, onSuccess, onError, retryCount]);

  // Render appropriate status indicator
  if (status === "processing") {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        <AlertTitle className="text-blue-800">
          {isRetrying ? "Retrying Fortnox Connection..." : "Processing Fortnox Connection..."}
        </AlertTitle>
        <AlertDescription className="text-blue-700">
          {isRetrying 
            ? `Attempting to connect again (attempt ${retryCount}/2)...`
            : "Please wait while we finish connecting to your Fortnox account."}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (status === "success") {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <AlertTitle className="text-green-800">Fortnox Connected Successfully</AlertTitle>
        <AlertDescription className="text-green-700">
          Your application is now connected to Fortnox and can access your data.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="bg-red-50 border-red-200">
      <XCircle className="h-5 w-5 text-red-500" />
      <AlertTitle className="text-red-800">Connection Failed</AlertTitle>
      <AlertDescription className="text-red-700">
        {errorMessage || "Failed to connect to Fortnox. Please try again."}
      </AlertDescription>
    </Alert>
  );
}
