
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  isLegacyToken?: boolean;
}

export interface RefreshResult {
  success: boolean;
  message: string;
  credentials?: Partial<FortnoxCredentials>;
  error?: any;
  requiresReconnect?: boolean;
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
