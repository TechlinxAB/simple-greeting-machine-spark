
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  LOGO_DATA_URL_KEY, 
  DEFAULT_LOGO_PATH, 
  getStoredLogoAsDataUrl,
  getSystemLogoDataUrl,
  LOGO_BUCKET_NAME
} from '@/utils/logoUtils';
import { supabase } from '@/lib/supabase';

/**
 * A hook that provides access to the cached logo data URL
 * with automatic refresh when local storage changes
 */
export function useCachedLogo() {
  const queryClient = useQueryClient();
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  // Cache the initial local storage value
  const initialCachedLogo = typeof window !== 'undefined' 
    ? localStorage.getItem(LOGO_DATA_URL_KEY) 
    : null;
  
  const [cachedLogo, setCachedLogo] = useState<string | null>(initialCachedLogo);

  // Force refresh function (exposed in the hook return value)
  const refreshLogo = useCallback(() => {
    console.log("Manually refreshing logo");
    setRefreshTimestamp(Date.now());
    queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
  }, [queryClient]);

  // Query for logo data
  const { data: logoDataUrl, isLoading } = useQuery({
    queryKey: ['app-logo-data', refreshTimestamp],
    queryFn: async () => {
      console.log("Fetching logo data, timestamp:", refreshTimestamp);
      
      // First try to get from localStorage
      const cached = localStorage.getItem(LOGO_DATA_URL_KEY);
      if (cached) {
        console.log("Using cached logo from localStorage");
        return cached;
      }
      
      // Otherwise fetch from server
      try {
        console.log("Fetching logo from server");
        const dataUrl = await getSystemLogoDataUrl();
        if (dataUrl) {
          console.log("Server logo fetched successfully");
          localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
          return dataUrl;
        }
      } catch (error) {
        console.error('Failed to fetch logo:', error);
      }
      
      console.log("Using default logo path");
      return DEFAULT_LOGO_PATH;
    },
    staleTime: 30000 // Reduce stale time to 30 seconds for more frequent refreshes
  });

  // Set up real-time subscription for logo changes in system_settings
  useEffect(() => {
    // Listen for storage events to update across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOGO_DATA_URL_KEY) {
        console.log("Storage event detected for logo");
        setCachedLogo(e.newValue);
        setRefreshTimestamp(Date.now());
      }
    };

    // Set up Supabase real-time subscription for system_settings changes
    const settingsChannel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'id=eq.app_settings'
        },
        (payload) => {
          console.log("System settings changed, refreshing logo");
          refreshLogo();
        }
      )
      .subscribe();

    // Set up storage subscription for logo changes
    const storageChannel = supabase
      .channel('storage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'storage',
          table: 'objects',
          filter: `bucket_id=eq.${LOGO_BUCKET_NAME}`
        },
        (payload) => {
          console.log("Storage changed for logo bucket:", payload);
          refreshLogo();
        }
      )
      .subscribe();

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(storageChannel);
    };
  }, [refreshLogo]);

  // Update from query result
  useEffect(() => {
    if (logoDataUrl && logoDataUrl !== cachedLogo) {
      console.log("Updating cached logo from query result");
      setCachedLogo(logoDataUrl);
    }
  }, [logoDataUrl, cachedLogo]);

  return {
    logoUrl: logoDataUrl || DEFAULT_LOGO_PATH,
    isLoading,
    refreshLogo
  };
}
