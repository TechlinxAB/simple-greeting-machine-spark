
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  isLegacyToken?: boolean;
  expiresAt?: string; // Add this property to track token expiration
}

export interface RefreshResult {
  success: boolean;
  message: string;
  credentials?: Partial<FortnoxCredentials>;
  error?: any;
  requiresReconnect?: boolean;
  // Add these properties to match the return values from refreshAccessToken
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface TokenMigrationResponse {
  success: boolean;
  message: string;
  newCredentials?: Partial<FortnoxCredentials>;
}

export interface TokenMigrationError {
  error: string;
  message: string;
  details?: any;
}

export interface SystemSettings {
  id: string;
  settings: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Token refresh history log entry
export interface TokenRefreshLog {
  id: string;
  success: boolean;
  message?: string;
  token_length?: number;
  session_id?: string;
  created_at: string;
  updated_at: string;
}
