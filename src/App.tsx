import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './config/msal-config';
import { router } from './router';
import './i18n';
import './styles/global.css';

import { useAuthStore } from './stores/auth-store';
import { useTranslation } from 'react-i18next';

const msalInstance = new PublicClientApplication(msalConfig);
const msalPromise = msalInstance.initialize();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [ready, setReady] = useState(false);
  const { i18n } = useTranslation();
  const language = useAuthStore((state) => state.language);

  useEffect(() => {
    msalPromise.then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        {ready ? <RouterProvider router={router} /> : null}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
          }}
        />
      </QueryClientProvider>
    </MsalProvider>
  );
}
