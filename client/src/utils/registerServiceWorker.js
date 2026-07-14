const UPDATE_EVENT = 'taskkollecta:pwa-update';

function announceUpdate(registration) {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: registration }));
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        announceUpdate(registration);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            announceUpdate(registration);
          }
        });
      });

      const checkForUpdate = () => registration.update().catch(() => undefined);
      const updateTimer = window.setInterval(checkForUpdate, 60 * 60 * 1000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });

      window.addEventListener('pagehide', () => window.clearInterval(updateTimer), { once: true });
    } catch (error) {
      console.warn('TaskKollecta could not enable offline support.', error);
    }
  }, { once: true });
}

export { UPDATE_EVENT };
