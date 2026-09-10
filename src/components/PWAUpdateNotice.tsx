import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../context/ToastContext';

// Mounts the PWA service worker and surfaces update/offline-ready state via the existing toast system.
export const PWAUpdateNotice: React.FC = () => {
  const { addToast } = useToast();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version every 30 minutes while the app stays open
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (offlineReady) {
      addToast('RelateFlows is ready to work offline.', 'success');
      setOfflineReady(false);
    }
  }, [offlineReady, addToast, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      addToast('A new version is available — updating…', 'info');
      const timer = setTimeout(() => {
        updateServiceWorker(true);
        setNeedRefresh(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, addToast, setNeedRefresh, updateServiceWorker]);

  return null;
};
