
import { Json } from "@/integrations/supabase/types";

// Interface for Fortnox OAuth config
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Interface for storing system settings
export interface SystemSettings {
  fortnoxCredentials?: FortnoxCredentials;
  appSettings?: {
    appName: string;
    primaryColor: string;
    secondaryColor: string;
  };
}
