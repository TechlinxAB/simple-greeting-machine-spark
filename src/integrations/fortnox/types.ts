
/**
 * Fortnox OAuth credentials
 */
export interface FortnoxCredentials {
  // OAuth flow identifiers
  clientId: string;
  clientSecret: string;
  
  // Legacy token (if applicable)
  accessToken?: string;
  refreshToken?: string;
  isLegacyToken?: boolean;
  
  // OAuth expiration time in milliseconds (epoch)
  expiresAt?: number;
  
  // OAuth expiration time in seconds (as returned by Fortnox)
  expiresIn?: number;
  
  // Refresh token expiration time in milliseconds (epoch)
  refreshTokenExpiresAt?: number;
  
  // Track refresh token failures
  refreshFailCount?: number;
  lastRefreshAttempt?: number;
}

/**
 * System settings structure from database
 */
export interface SystemSettings {
  id: string;
  settings: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Response from token migration endpoint
 */
export interface TokenMigrationResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Error from token migration endpoint
 */
export interface TokenMigrationError {
  error: string;
  error_description: string;
  status_code?: number;
}

/**
 * Fortnox token refresh result
 */
export interface RefreshResult {
  success: boolean;
  message: string;
  credentials?: Partial<FortnoxCredentials>;
  error?: any;
  requiresReconnect?: boolean;
}
