
import { useEffect, useState } from 'react';
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
  const [cachedLogo, setCachedLogo] = useState<string | null>(
    localStorage.getItem(LOGO_DATA_URL_KEY)
  );

  // Query for logo data
  const { data: logoDataUrl, isLoading } = useQuery({
    queryKey: ['app-logo-data'],
    queryFn: async () => {
      // First try to get from localStorage
      const cached = localStorage.getItem(LOGO_DATA_URL_KEY);
      if (cached) return cached;
      
      // Otherwise fetch from server
      try {
        const dataUrl = await getSystemLogoDataUrl();
        if (dataUrl) {
          localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
          return dataUrl;
        }
      } catch (error) {
        console.error('Failed to fetch logo:', error);
      }
      
      return DEFAULT_LOGO_PATH;
    },
    staleTime: 60000
  });

  // Set up real-time subscription for logo changes in system_settings
  useEffect(() => {
    // Listen for storage events to update across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOGO_DATA_URL_KEY) {
        setCachedLogo(e.newValue);
        queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
        }
      )
      .subscribe();

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(storageChannel);
    };
  }, [queryClient]);

  // Update from query result
  useEffect(() => {
    if (logoDataUrl && logoDataUrl !== cachedLogo) {
      setCachedLogo(logoDataUrl);
    }
  }, [logoDataUrl, cachedLogo]);

  return {
    logoUrl: logoDataUrl || DEFAULT_LOGO_PATH,
    isLoading,
    refreshLogo: () => {
      queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
    }
  };
}
