
// Re-export all Fortnox integration functionality
// This file serves as the main entry point for the Fortnox integration

// Types
export { FortnoxCredentials, SystemSettings } from './types';

// Authentication
export { 
  exchangeCodeForTokens,
  refreshAccessToken
} from './auth';

// Credentials management
export {
  saveFortnoxCredentials,
  getFortnoxCredentials,
  isFortnoxConnected,
  disconnectFortnox
} from './credentials';

// API client
export {
  fortnoxApiRequest,
  getFortnoxResource,
  createFortnoxResource,
  updateFortnoxResource
} from './api-client';

// Resources (re-export any resource-specific functions)
export * from './invoices';
