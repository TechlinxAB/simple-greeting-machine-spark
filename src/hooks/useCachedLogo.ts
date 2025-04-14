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
  const [retryCount, setRetryCount] = useState(0);
  const [isErrorState, setIsErrorState] = useState(false);

  // Cache the initial local storage value
  const initialCachedLogo = typeof window !== 'undefined' 
    ? localStorage.getItem(LOGO_DATA_URL_KEY) 
    : null;
  
  const [cachedLogo, setCachedLogo] = useState<string | null>(initialCachedLogo);

  // Force refresh function (exposed in the hook return value)
  const refreshLogo = useCallback(() => {
    console.log("Manually refreshing logo");
    setRefreshTimestamp(Date.now());
    setRetryCount(0);
    setIsErrorState(false);
    queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
  }, [queryClient]);

  // Query for logo data
  const { data: logoDataUrl, isLoading, error } = useQuery({
    queryKey: ['app-logo-data', refreshTimestamp, retryCount],
    queryFn: async () => {
      console.log("Fetching logo data, timestamp:", refreshTimestamp, "retry:", retryCount);
      
      // First try to get from localStorage
      const cached = localStorage.getItem(LOGO_DATA_URL_KEY);
      if (cached && !isErrorState) {
        console.log("Using cached logo from localStorage");
        
        // Verify the cached URL is valid by performing a quick HEAD request
        try {
          if (cached.startsWith('http')) {
            const response = await fetch(cached, { method: 'HEAD' });
            if (!response.ok) {
              console.warn("Cached logo URL is invalid, will fetch from server");
              localStorage.removeItem(LOGO_DATA_URL_KEY);
              throw new Error("Invalid cached logo URL");
            }
          }
          return cached;
        } catch (e) {
          console.warn("Error validating cached logo:", e);
          // Continue to fetch from server
        }
      }
      
      // Otherwise fetch from server
      try {
        console.log("Fetching logo from server");
        const dataUrl = await getSystemLogoDataUrl();
        if (dataUrl) {
          console.log("Server logo fetched successfully");
          localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
          setIsErrorState(false);
          return dataUrl;
        }
      } catch (error) {
        console.error('Failed to fetch logo:', error);
        setIsErrorState(true);
        if (cached) {
          console.log("Using potentially invalid cached logo as fallback");
          return cached;
        }
      }
      
      console.log("Using default logo path");
      setIsErrorState(false);
      return DEFAULT_LOGO_PATH;
    },
    staleTime: 30000, // Reduce stale time to 30 seconds for more frequent refreshes
    retry: 2,
    retryDelay: 1000,
    onError: (err) => {
      console.error("Error fetching logo:", err);
      setIsErrorState(true);
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
      }
    }
  });

  // Handle errors from the query
  useEffect(() => {
    if (error) {
      console.error("Logo fetch error in effect:", error);
      if (cachedLogo) {
        console.log("Using cached logo as fallback after error");
      }
    }
  }, [error, cachedLogo]);

  // Set up real-time subscription for logo changes in system_settings
  useEffect(() => {
    // Listen for storage events to update across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOGO_DATA_URL_KEY) {
        console.log("Storage event detected for logo");
        setCachedLogo(e.newValue);
        setRefreshTimestamp(Date.now());
        setIsErrorState(false);
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
      setIsErrorState(false);
    }
  }, [logoDataUrl, cachedLogo]);

  return {
    logoUrl: isErrorState && cachedLogo ? cachedLogo : (logoDataUrl || DEFAULT_LOGO_PATH),
    isLoading,
    isError: isErrorState,
    refreshLogo
  };
}
