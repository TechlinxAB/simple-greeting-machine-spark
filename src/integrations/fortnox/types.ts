
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // timestamp for access token expiration
  refreshTokenExpiresAt?: number; // timestamp for refresh token expiration
  migratedToJwt?: boolean; // flag to track if we've migrated to JWT
}

export interface SystemSettings {
  id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}
