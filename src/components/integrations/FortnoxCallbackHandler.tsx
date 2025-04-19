
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { exchangeCodeForTokens } from "@/integrations/fortnox/auth";
import { saveFortnoxCredentials, getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { getRedirectUri } from "@/config/environment";

interface FortnoxCallbackHandlerProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FortnoxCallbackHandler({ onSuccess, onError }: FortnoxCallbackHandlerProps) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const stateParam = searchParams.get("state");
        
        console.log("Fortnox callback received:", {
          hasCode: !!code,
          hasError: !!errorParam,
          hasState: !!stateParam,
          codeLength: code?.length
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
        console.log("Authorization code:", code);
        console.log("Authorization code length:", code.length);
        
        const tokens = await exchangeCodeForTokens(
          code,
          credentials.clientId,
          credentials.clientSecret,
          redirectUri
        );
        
        if (!tokens || !tokens.accessToken) {
          throw new Error("Failed to get access token from Fortnox");
        }
        
        console.log("🔑 Received tokens from Fortnox:", {
          accessTokenLength: tokens.accessToken.length,
          refreshTokenLength: tokens.refreshToken?.length || 0,
          accessTokenPreview: `${tokens.accessToken.substring(0, 20)}...${tokens.accessToken.substring(tokens.accessToken.length - 20)}`,
          refreshTokenPreview: tokens.refreshToken ? 
            `${tokens.refreshToken.substring(0, 10)}...${tokens.refreshToken.substring(tokens.refreshToken.length - 5)}` : 
            'none'
        });
        
        // Save tokens
        console.log("Saving Fortnox tokens...");
        await saveFortnoxCredentials({
          ...credentials,
          ...tokens,
          isLegacyToken: false
        });
        
        // Verify tokens were saved correctly
        const savedCredentials = await getFortnoxCredentials();
        if (savedCredentials) {
          console.log("✅ Saved credentials verification:", {
            accessTokenLength: savedCredentials.accessToken?.length || 0,
            refreshTokenLength: savedCredentials.refreshToken?.length || 0,
            accessTokenMatches: savedCredentials.accessToken === tokens.accessToken,
            refreshTokenMatches: savedCredentials.refreshToken === tokens.refreshToken
          });
          
          if (savedCredentials.accessToken !== tokens.accessToken || 
              (tokens.refreshToken && savedCredentials.refreshToken !== tokens.refreshToken)) {
            console.error("⚠️ Token mismatch after save!");
          }
        }
        
        console.log("Fortnox connection successful!");
        setStatus("success");
        
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
        }
        
        setErrorMessage(message);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
    
    handleCallback();
  }, [searchParams, onSuccess, onError]);

  // Render appropriate status indicator
  if (status === "processing") {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        <AlertTitle className="text-blue-800">Processing Fortnox Connection...</AlertTitle>
        <AlertDescription className="text-blue-700">
          Please wait while we finish connecting to your Fortnox account.
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
