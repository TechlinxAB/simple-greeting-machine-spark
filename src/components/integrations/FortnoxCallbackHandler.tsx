
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

  // Set the redirect URI when component mounts - must match exactly what was used in auth request
  useEffect(() => {
    const baseUrl = window.location.origin;
    const redirectPath = "/settings?tab=fortnox";
    setRedirectUri(`${baseUrl}${redirectPath}`);
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setError(errorDescription || 'Unknown error occurred');
      if (onError) onError(new Error(errorDescription || 'Unknown error occurred'));
      return;
    }

    if (code && redirectUri && clientId && clientSecret) {
      handleAuthorizationCode(code);
    }
  }, [searchParams, clientId, clientSecret, redirectUri]);

  const handleAuthorizationCode = async (code: string) => {
    try {
      setStatus('processing');
      
      // Log the redirect URI for debugging
      console.log("Using callback redirect URI:", redirectUri);

      // Exchange the code for tokens
      const tokenData = await exchangeCodeForTokens(
        code,
        clientId,
        clientSecret,
        redirectUri
      );

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
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Failed to exchange code for tokens');
      
      if (onError) onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

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
        <AlertDescription>
          {error || 'An unknown error occurred while connecting to Fortnox.'}
          {error?.includes('redirect_uri_mismatch') && (
            <div className="mt-2">
              <p className="font-medium">Please make sure this exact redirect URI is registered in Fortnox:</p>
              <code className="mt-1 block bg-gray-700 text-white p-2 rounded-md text-xs overflow-auto">
                {redirectUri}
              </code>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
