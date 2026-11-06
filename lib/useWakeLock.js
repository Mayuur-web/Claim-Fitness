// Hook to keep screen awake during runs via the Screen Wake Lock API

import { useEffect, useRef } from 'react';

export function useWakeLock(enabled = false) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let isSubscribed = true;

    async function requestLock() {
      try {
        if (!wakeLockRef.current && isSubscribed) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('Wake lock request failed:', err);
      }
    }

    requestLock();

    // Re-acquire lock if tab switches back into foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && isSubscribed) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}

