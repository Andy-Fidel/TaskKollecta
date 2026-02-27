import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000;   // 2 hours
const WARNING_BEFORE = 60 * 1000;           // show warning 60s before logout

/**
 * Logs the user out after 2 hours of inactivity.
 * Resets on mouse, keyboard, scroll, click, or touch activity.
 * Shows a 60-second countdown warning before auto-logout.
 */
export function useIdleTimeout(user, logout) {
  const timerRef = useRef(null);
  const warningRef = useRef(null);
  const toastIdRef = useRef(null);

  const doLogout = useCallback(() => {
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    logout();
    toast.info('You have been logged out due to inactivity.');
  }, [logout]);

  const resetTimer = useCallback(() => {
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

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimer]);
}
