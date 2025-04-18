
import { Json } from "@/integrations/supabase/types";

// Interface for Fortnox OAuth config
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  refreshTokenExpiresAt?: number; // New field for refresh token expiration
  isLegacyToken?: boolean;        // Flag to indicate if this is a legacy token
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

// Interface for token migration response
export interface TokenMigrationResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

// Interface for token migration error
export interface TokenMigrationError {
  status: number;
  message: string;
  details?: string;
}
