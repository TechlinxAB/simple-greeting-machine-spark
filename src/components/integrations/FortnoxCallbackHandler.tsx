import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { exchangeCodeForTokens } from "@/integrations/fortnox/auth";
import { saveFortnoxCredentials, getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { getRedirectUri } from "@/config/environment";

type FlowStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "error";
  message?: string;
};

interface FortnoxCallbackHandlerProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FortnoxCallbackHandler({ onSuccess, onError }: FortnoxCallbackHandlerProps) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [steps, setSteps] = useState<FlowStep[]>([
    { id: "auth", label: "🔄 Attempting connection...", status: "pending" },
    { id: "tokens", label: "🔑 Receiving tokens from Fortnox", status: "pending" },
    { id: "save", label: "💾 Saving tokens to database", status: "pending" },
    { id: "verify", label: "✅ Verifying connection", status: "pending" }
  ]);
  
  const hasHandled = useRef(false);

  const updateStep = (id: string, update: Partial<FlowStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...update } : step
    ));
  };

  useEffect(() => {
    async function handleCallback() {
      if (hasHandled.current) return;
      hasHandled.current = true;
      
      const sessionId = Math.random().toString(36).substring(2, 8);
      console.log(`[${sessionId}] 🔄 Starting Fortnox callback handling process`);
      
      try {
        updateStep("auth", { status: "processing" });
        
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        const stateParam = searchParams.get("state");
        
        console.log(`[${sessionId}] Fortnox callback received:`, {
          hasCode: !!code,
          hasError: !!errorParam,
          hasState: !!stateParam,
          codeLength: code?.length
        });

        if (errorParam) {
          const message = errorDescription ? 
            `Fortnox error: ${errorParam} - ${errorDescription}` : 
            `Fortnox error: ${errorParam}`;
          
          console.error(`[${sessionId}] ${message}`);
          setStatus("error");
          setErrorMessage(message);
          updateStep("auth", { status: "error", message });
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        if (!code) {
          const message = "Missing authorization code from Fortnox";
          console.error(`[${sessionId}] ${message}`);
          setStatus("error");
          setErrorMessage(message);
          updateStep("auth", { status: "error", message });
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        console.log(`[${sessionId}] Code details:`, {
          length: code.length,
          preview: `${code.substring(0, 8)}...${code.substring(code.length - 8)}`
        });
        
        let expectedState: string | null = null;
        try {
          const stateJson = sessionStorage.getItem('fortnox_oauth_state');
          if (stateJson) {
            try {
              const stateData = JSON.parse(stateJson);
              expectedState = stateData.state;
              
              console.log(`[${sessionId}] Verifying OAuth state:`, {
                receivedState: stateParam,
                expectedState: expectedState,
                storedOrigin: stateData.origin,
                currentOrigin: window.location.origin
              });
              
              if (stateData.origin && stateData.origin !== window.location.origin) {
                console.warn(
                  `[${sessionId}] OAuth redirect received on different origin than initiated.`,
                  "Initiated on:", stateData.origin,
                  "Received on:", window.location.origin
                );
              }
            } catch (parseError) {
              console.error(`[${sessionId}] Error parsing stored OAuth state:`, parseError);
              expectedState = stateJson;
            }
          }
          
          if (stateParam !== expectedState) {
            console.error(`[${sessionId}] State parameter mismatch`, {
              received: stateParam,
              expected: expectedState
            });
            throw new Error("Security validation failed: state parameter mismatch");
          }
          
          updateStep("auth", { status: "success" });
        } catch (stateError) {
          console.error(`[${sessionId}] State verification error:`, stateError);
          setStatus("error");
          setErrorMessage("Security validation failed. Please try connecting again.");
          updateStep("auth", { status: "error", message: "Security validation failed" });
          
          if (onError) {
            onError(new Error("State verification failed"));
          }
          return;
        }
        
        const credentials = await getFortnoxCredentials();
        
        if (!credentials || !credentials.clientId || !credentials.clientSecret) {
          const message = "Missing client credentials. Please set up your Fortnox API keys first.";
          console.error(`[${sessionId}] ${message}`);
          setStatus("error");
          setErrorMessage(message);
          updateStep("tokens", { status: "error", message });
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        updateStep("tokens", { status: "processing" });
        
        const redirectUri = getRedirectUri();
        console.log(`[${sessionId}] Using redirect URI for token exchange:`, redirectUri);
        
        console.log(`[${sessionId}] Exchanging authorization code for tokens...`);
        console.log(`[${sessionId}] Authorization code:`, `${code.substring(0, 10)}...${code.substring(code.length - 10)}`);
        console.log(`[${sessionId}] Authorization code length:`, code.length);
        
        const tokens = await exchangeCodeForTokens(
          code,
          credentials.clientId,
          credentials.clientSecret,
          redirectUri
        );
        
        if (!tokens || !tokens.access_token) {
          const message = "Failed to get access token from Fortnox";
          console.error(`[${sessionId}] ${message}`);
          setStatus("error");
          setErrorMessage(message);
          updateStep("tokens", { status: "error", message });
          
          if (onError) {
            onError(new Error(message));
          }
          return;
        }
        
        updateStep("tokens", { status: "success" });
        
        console.log(`[${sessionId}] 🔑 Received tokens from Fortnox:`, {
          accessTokenLength: tokens.access_token.length,
          refreshTokenLength: tokens.refresh_token?.length || 0,
          accessTokenPreview: `${tokens.access_token.substring(0, 20)}...${tokens.access_token.substring(tokens.access_token.length - 20)}`,
          refreshTokenPreview: tokens.refresh_token ? 
            `${tokens.refresh_token.substring(0, 10)}...${tokens.refresh_token.substring(tokens.refresh_token.length - 5)}` : 
            'none'
        });
        
        updateStep("save", { status: "processing" });
        
        await saveFortnoxCredentials({
          ...credentials,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isLegacyToken: false
        });
        
        updateStep("save", { status: "success" });
        
        updateStep("verify", { status: "processing" });
        
        const savedCredentials = await getFortnoxCredentials();
        if (savedCredentials) {
          console.log(`[${sessionId}] ✅ Saved credentials verification:`, {
            accessTokenLength: savedCredentials.accessToken?.length || 0,
            refreshTokenLength: savedCredentials.refreshToken?.length || 0,
            accessTokenMatches: savedCredentials.accessToken === tokens.access_token,
            refreshTokenMatches: savedCredentials.refreshToken === tokens.refresh_token
          });
          
          if (savedCredentials.accessToken !== tokens.access_token || 
              (tokens.refresh_token && savedCredentials.refreshToken !== tokens.refresh_token)) {
            console.error(`[${sessionId}] ⚠️ Token mismatch after save!`);
            
            if (savedCredentials.accessToken !== tokens.access_token) {
              console.error(`[${sessionId}] Access token length - Original: ${tokens.access_token.length}, Saved: ${savedCredentials.accessToken?.length}`);
            }
            
            if (tokens.refresh_token && savedCredentials.refreshToken !== tokens.refresh_token) {
              console.error(`[${sessionId}] Refresh token length - Original: ${tokens.refresh_token.length}, Saved: ${savedCredentials.refreshToken?.length}`);
            }
            
            updateStep("verify", { 
              status: "success",
              message: "Connection established, but token verification showed minor discrepancies" 
            });
          } else {
            updateStep("verify", { status: "success" });
          }
        } else {
          updateStep("verify", { 
            status: "error",
            message: "Could not verify saved credentials" 
          });
        }
        
        console.log(`[${sessionId}] Fortnox connection successful!`);
        setStatus("success");
        
        if (onSuccess) {
          onSuccess();
        }
        
        sessionStorage.removeItem('fortnox_oauth_state');
        
      } catch (error) {
        console.error(`[${sessionId}] Error processing Fortnox callback:`, error);
        setStatus("error");
        
        let message = "Failed to connect to Fortnox";
        if (error instanceof Error) {
          message = error.message;
        }
        
        setErrorMessage(message);
        
        const currentStep = steps.find(s => s.status === "processing");
        if (currentStep) {
          updateStep(currentStep.id, { status: "error", message });
        }
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
    
    handleCallback();
  }, [searchParams, onSuccess, onError, steps]);

  const renderSteps = () => {
    return (
      <div className="space-y-2 mb-4">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-2">
            {step.status === "pending" && <div className="w-5 h-5 rounded-full border border-gray-300" />}
            {step.status === "processing" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            {step.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
            {step.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
            <div>
              <span className={
                step.status === "pending" ? "text-gray-500" :
                step.status === "processing" ? "text-blue-700" :
                step.status === "success" ? "text-green-700" :
                "text-red-700"
              }>
                {step.label}
              </span>
              {step.message && (
                <p className="text-xs mt-0.5 text-gray-600">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (status === "processing") {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        <AlertTitle className="text-blue-800">Processing Fortnox Connection...</AlertTitle>
        <AlertDescription className="text-blue-700">
          {renderSteps()}
          <p>Please wait while we finish connecting to your Fortnox account.</p>
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
          {renderSteps()}
          <p>Your application is now connected to Fortnox and can access your data.</p>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="bg-red-50 border-red-200">
      <XCircle className="h-5 w-5 text-red-500" />
      <AlertTitle className="text-red-800">Connection Failed</AlertTitle>
      <AlertDescription className="text-red-700">
        {renderSteps()}
        <p>{errorMessage || "Failed to connect to Fortnox. Please try again."}</p>
      </AlertDescription>
    </Alert>
  );
}
