import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LOGO_DATA_URL_KEY, DEFAULT_LOGO_PATH, getStoredLogoAsDataUrl } from '@/utils/logoUtils';

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
        const dataUrl = await getStoredLogoAsDataUrl();
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

  // Listen for storage events to update across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOGO_DATA_URL_KEY) {
        setCachedLogo(e.newValue);
        queryClient.invalidateQueries({ queryKey: ['app-logo-data'] });
        queryClient.invalidateQueries({ queryKey: ['app-logo-dataurl'] });
        queryClient.invalidateQueries({ queryKey: ['app-logo-settings'] });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
      queryClient.invalidateQueries({ queryKey: ['app-logo-dataurl'] });
      queryClient.invalidateQueries({ queryKey: ['app-logo-settings'] });
    }
  };
}
