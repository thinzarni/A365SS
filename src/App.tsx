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

export let isMsalSupported = false;
let msalInstance: PublicClientApplication | null = null;
let msalPromise: Promise<void> = Promise.resolve();

try {
  if (typeof window !== 'undefined' && window.crypto) {
    msalInstance = new PublicClientApplication(msalConfig);
    msalPromise = msalInstance.initialize();
    isMsalSupported = true;
  } else {
    console.warn("Cryptography API disabled; MSAL will not be initialized.");
  }
} catch (e) {
  console.warn('MSAL init error', e);
}

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

  useEffect(() => {
    let currentVersion: string | null = null;
    let isChecking = false;

    const checkVersion = async () => {
      if (import.meta.env.DEV || isChecking) return;
      isChecking = true;
      try {
        const res = await fetch(`/version.json?t=${new Date().getTime()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();

        if (!currentVersion) {
          currentVersion = data.version;
        } else if (currentVersion !== data.version) {
          window.location.reload();
        }
      } catch (err) {
        /* Ignore offline/fetch errors */
      } finally {
        isChecking = false;
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // Check every 5 minutes

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };
    window.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const content = (
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
  );

  if (isMsalSupported && msalInstance) {
    return <MsalProvider instance={msalInstance}>{content}</MsalProvider>;
  }

  return content;
}
