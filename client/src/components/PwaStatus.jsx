import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UPDATE_EVENT } from '@/utils/registerServiceWorker';

const INSTALL_DISMISSED_AT = 'taskkollecta:pwa-install-dismissed-at';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function installPromptWasRecentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_AT));
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS;
}

export function PwaStatus() {
  const [installEvent, setInstallEvent] = useState(null);
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      if (!installPromptWasRecentlyDismissed()) setInstallEvent(event);
    };
    const handleInstalled = () => setInstallEvent(null);
    const handleUpdate = (event) => setUpdateRegistration(event.detail);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_AT, String(Date.now()));
    setInstallEvent(null);
  };

  const applyUpdate = () => {
    updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  if (isOnline && !updateRegistration && !installEvent) return null;

  let icon = <WifiOff className="h-5 w-5 shrink-0 text-amber-400" />;
  let title = 'You are offline';
  let description = 'Previously opened pages remain available. Changes need a connection.';
  let action = null;

  if (updateRegistration) {
    icon = <RefreshCw className="h-5 w-5 shrink-0 text-indigo-400" />;
    title = 'Update ready';
    description = 'Reload to use the latest version of TaskKollecta.';
    action = <Button size="sm" onClick={applyUpdate}>Reload</Button>;
  } else if (installEvent) {
    icon = <Download className="h-5 w-5 shrink-0 text-indigo-400" />;
    title = 'Install TaskKollecta';
    description = 'Add it to your device for faster, app-like access.';
    action = <Button size="sm" onClick={installApp}>Install</Button>;
  }

  return (
    <aside
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/95 p-3 text-zinc-50 shadow-2xl backdrop-blur md:bottom-5 md:p-4"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-zinc-400 md:text-sm">{description}</p>
      </div>
      {action}
      {installEvent && (
        <Button
          aria-label="Dismiss install prompt"
          className="h-8 w-8 shrink-0 text-zinc-400 hover:text-white"
          onClick={dismissInstall}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </aside>
  );
}
