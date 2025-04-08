
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setError(errorDescription || 'Unknown error occurred');
      if (onError) onError(new Error(errorDescription || 'Unknown error occurred'));
      return;
    }

    if (code) {
      handleAuthorizationCode(code);
    }
  }, [searchParams, clientId, clientSecret]);

  const handleAuthorizationCode = async (code: string) => {
    try {
      setStatus('processing');
      
      // Generate the current URL for the redirect (should match what was used in the auth request)
      const redirectUri = `${window.location.origin}/settings?tab=fortnox`;

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
      setError((error as Error).message || 'Failed to exchange code for tokens');
      
      if (onError) onError(error as Error);
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
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
