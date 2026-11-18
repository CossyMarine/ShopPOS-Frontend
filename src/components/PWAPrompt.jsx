import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X, WifiOff } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const HOUR = 60 * 60 * 1000;

export default function PWAPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR);
    },
  });

  // Chrome/Edge/Android fire this when the app is installable
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        /* storage unavailable — show the prompt */
      }
      if (!dismissed) setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // "Ready to work offline" shows briefly, once
  useEffect(() => {
    if (!offlineReady) return;
    setShowOfflineReady(true);
    const t = setTimeout(() => {
      setShowOfflineReady(false);
      setOfflineReady(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setInstallEvent(null);
  };

  if (!needRefresh && !installEvent && !showOfflineReady) return null;

  return (
    <div
      className="fixed left-4 right-4 z-[9999] mx-auto flex max-w-md flex-col gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      {needRefresh && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          <RefreshCw size={16} className="shrink-0 text-orange-400" />
          <span className="flex-1">A new version is ready.</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold hover:bg-orange-600"
          >
            Update
          </button>
          <button onClick={() => setNeedRefresh(false)} aria-label="Later" className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {installEvent && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          <Download size={16} className="shrink-0 text-orange-400" />
          <span className="flex-1">Install CHEMALUK on this device.</span>
          <button
            onClick={install}
            className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-bold hover:bg-orange-600"
          >
            Install
          </button>
          <button onClick={dismissInstall} aria-label="Dismiss" className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {showOfflineReady && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          <WifiOff size={16} className="shrink-0 text-orange-400" />
          <span className="flex-1">Ready to work offline.</span>
        </div>
      )}
    </div>
  );
}
