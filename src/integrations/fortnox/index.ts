
// Re-export all Fortnox integration functionality
// This file serves as the main entry point for the Fortnox integration

// Types
export type { FortnoxCredentials, SystemSettings, TokenMigrationResponse, TokenMigrationError, RefreshResult } from './types';

// Authentication
export { 
  exchangeCodeForTokens,
  refreshAccessToken,
  forceTokenRefresh
} from './auth';

// Credentials management
export {
  saveFortnoxCredentials,
  getFortnoxCredentials,
  isFortnoxConnected,
  disconnectFortnox,
  isLegacyToken
} from './credentials';

// Migration
export {
  migrateLegacyToken
} from './migration';

// API client
export {
  fortnoxApiRequest,
  getFortnoxResource,
  createFortnoxResource,
  updateFortnoxResource
} from './api-client';

// Resources (re-export any resource-specific functions)
export * from './invoices';
