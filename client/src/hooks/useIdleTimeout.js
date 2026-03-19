import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000;   // 2 hours
const WARNING_BEFORE = 60 * 1000;           // show warning 60s before logout
const ACTIVITY_KEY = 'lastActivity';        // localStorage key

/**
 * Logs the user out after 2 hours of inactivity.
 * Persists a lastActivity timestamp in localStorage so that
 * closing the browser and returning later still triggers logout.
 * Also checks on visibility change (tab switch / wake from sleep).
 */
export function useIdleTimeout(user, logout) {
  const timerRef = useRef(null);
  const warningRef = useRef(null);
  const toastIdRef = useRef(null);

  const doLogout = useCallback(() => {
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    localStorage.removeItem(ACTIVITY_KEY);
    logout();
    toast.info('You have been logged out due to inactivity.');
  }, [logout]);

  // Check if the stored last-activity is older than the idle timeout
  const checkExpired = useCallback(() => {
    const last = parseInt(localStorage.getItem(ACTIVITY_KEY), 10);
    if (last && Date.now() - last >= IDLE_TIMEOUT) {
      doLogout();
      return true;
    }
    return false;
  }, [doLogout]);

  const resetTimer = useCallback(() => {
    // Stamp current time
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());

    // Clear any existing timers
    if (warningRef.current) clearTimeout(warningRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Set warning timer (fires 60s before logout)
    warningRef.current = setTimeout(() => {
      toastIdRef.current = toast.warning(
        'You will be logged out in 60 seconds due to inactivity.',
        { duration: WARNING_BEFORE }
      );
    }, IDLE_TIMEOUT - WARNING_BEFORE);

    // Set logout timer
    timerRef.current = setTimeout(doLogout, IDLE_TIMEOUT);
  }, [doLogout]);

  useEffect(() => {
    if (!user) return;

    // On mount: check if idle timeout already passed while away
    if (checkExpired()) return;

    // If no previous activity recorded, set it now
    if (!localStorage.getItem(ACTIVITY_KEY)) {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    }

    // Listen for user activity
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // Check on tab focus / wake from sleep
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpired();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimer, checkExpired]);
}

