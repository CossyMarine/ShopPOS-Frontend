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

  const card =
    "flex items-center gap-4 rounded-2xl border border-orange-200 bg-white px-5 py-4 text-gray-900 shadow-2xl";
  const iconWrap =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600";
  const primaryBtn =
    "rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-orange-600 active:scale-95 transition";
  const closeBtn =
    "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition";

  return (
    <div
      className="fixed left-4 right-4 z-[9999] mx-auto flex max-w-xl flex-col gap-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
    >
      {needRefresh && (
        <div className={card}>
          <div className={iconWrap}>
            <RefreshCw size={24} />
          </div>
          <div className="flex-1">
            <p className="text-base font-extrabold">Update available</p>
            <p className="text-sm text-gray-500">A new version is ready.</p>
          </div>
          <button onClick={() => updateServiceWorker(true)} className={primaryBtn}>
            Update
          </button>
          <button onClick={() => setNeedRefresh(false)} aria-label="Later" className={closeBtn}>
            <X size={20} />
          </button>
        </div>
      )}

      {installEvent && (
        <div className={card}>
          <div className={iconWrap}>
            <Download size={24} />
          </div>
          <div className="flex-1">
            <p className="text-base font-extrabold">Install CHEMALUK</p>
            <p className="text-sm text-gray-500">Add it to this device for faster access.</p>
          </div>
          <button onClick={install} className={primaryBtn}>
            Install
          </button>
          <button onClick={dismissInstall} aria-label="Dismiss" className={closeBtn}>
            <X size={20} />
          </button>
        </div>
      )}

      {showOfflineReady && (
        <div className={card}>
          <div className={iconWrap}>
            <WifiOff size={24} />
          </div>
          <p className="flex-1 text-base font-bold">Ready to work offline.</p>
        </div>
      )}
    </div>
  );
}
