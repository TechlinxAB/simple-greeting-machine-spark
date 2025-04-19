
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
