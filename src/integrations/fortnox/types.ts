
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
}
