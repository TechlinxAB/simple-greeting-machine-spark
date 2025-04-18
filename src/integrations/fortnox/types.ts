
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // timestamp for access token expiration
  refreshTokenExpiresAt?: number; // timestamp for refresh token expiration
  migratedToJwt?: boolean; // flag to track if we've migrated to JWT
  migrationSkipped?: boolean; // flag to indicate we should skip migration attempts
  migrationLastAttempt?: number; // timestamp of last migration attempt
  migrationAttemptCount?: number; // number of times we've attempted migration
  migrationError?: string; // last migration error message
  tokenType?: string; // token type (bearer, jwt)
  scope?: string; // token scope
  authFlow?: string; // auth flow used (authorization_code_grant)
}

export interface SystemSettings {
  id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FortnoxError {
  error: string;
  error_description?: string;
  error_hint?: string;
  http_status?: number;
  raw_response?: string;
  parsed_response?: any;
  request_needs_retry?: boolean;
  missing_fields?: string[];
  requires_reconnect?: boolean;
  fortnox_error?: any;
}

export interface FortnoxMigrationResponse {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

export interface FortnoxClientData {
  clientId: string;
  clientSecret: string;
  isValid: boolean;
  connectionStatus?: boolean;
  error?: string;
}

export interface FortnoxTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}
