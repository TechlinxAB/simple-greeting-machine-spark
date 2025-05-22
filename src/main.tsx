
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@/i18n'; 
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createFavicon, setFavicon } from '@/utils/createFavicon';

// Create and set the favicon
const sidebarGreen = "#326c32"; // Same green as the sidebar
const faviconDataUrl = createFavicon("TD", sidebarGreen, "#ffffff");
setFavicon(faviconDataUrl);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
