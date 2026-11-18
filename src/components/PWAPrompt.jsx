import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X, WifiOff, Loader2, CheckCircle2 } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const HOUR = 60 * 60 * 1000;
const INSTALLING_TIMEOUT = 90 * 1000; // stop showing the spinner after 90s

// Shared look for every notice: bright card, soft orange border and shadow
const CARD =
  "flex gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-xl shadow-orange-500/10";
const ICON_BOX =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600";
const PRIMARY_BTN =
  "rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 active:bg-orange-700";
const CLOSE_BTN = "shrink-0 text-gray-400 hover:text-gray-700";

export default function PWAPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [slowInstall, setSlowInstall] = useState(false);
  const installTimer = useRef(null);

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

    // Fired by the browser when the install has actually finished
    const onInstalled = () => {
      clearTimeout(installTimer.current);
      setInstallEvent(null);
      setInstalling(false);
      setSlowInstall(false);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(installTimer.current);
    };
  }, []);

  // "Installed" message hides itself
  useEffect(() => {
    if (!installed) return;
    const t = setTimeout(() => setInstalled(false), 8000);
    return () => clearTimeout(t);
  }, [installed]);

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
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);

    if (outcome === "accepted") {
      setInstalling(true);
      setSlowInstall(false);
      clearTimeout(installTimer.current);
      // The browser gives no progress, so after a while we point people to the app list.
      installTimer.current = setTimeout(() => setSlowInstall(true), INSTALLING_TIMEOUT);
    }
  };

  const dismissInstall = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setInstallEvent(null);
  };

  if (!needRefresh && !installEvent && !showOfflineReady && !installing && !installed) {
    return null;
  }

  return (
    <div
      className="fixed left-4 right-4 z-[9999] mx-auto flex max-w-md flex-col gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      {needRefresh && (
        <div className={`${CARD} items-center`}>
          <span className={ICON_BOX}>
            <RefreshCw size={16} />
          </span>
          <span className="flex-1 font-medium">A new version is ready.</span>
          <button onClick={() => updateServiceWorker(true)} className={PRIMARY_BTN}>
            Update
          </button>
          <button onClick={() => setNeedRefresh(false)} aria-label="Later" className={CLOSE_BTN}>
            <X size={16} />
          </button>
        </div>
      )}

      {installEvent && (
        <div className={`${CARD} items-center`}>
          <span className={ICON_BOX}>
            <Download size={16} />
          </span>
          <span className="flex-1 font-medium">Install CHEMALUK on this device.</span>
          <button onClick={install} className={PRIMARY_BTN}>
            Install
          </button>
          <button onClick={dismissInstall} aria-label="Dismiss" className={CLOSE_BTN}>
            <X size={16} />
          </button>
        </div>
      )}

      {installing && (
        <div className={`${CARD} items-start`}>
          <span className={ICON_BOX}>
            <Loader2 size={16} className="animate-spin" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Installing CHEMALUK…</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {slowInstall
                ? "Taking longer than usual. Check your app list for CHEMALUK, it may already be there."
                : "This can take up to a minute. Keep using the app, we'll tell you when it's ready."}
            </p>
            {/* Indeterminate bar: the browser gives no real progress value */}
            {!slowInstall && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-orange-500" />
              </div>
            )}
          </div>
          <button onClick={() => setInstalling(false)} aria-label="Hide" className={CLOSE_BTN}>
            <X size={16} />
          </button>
        </div>
      )}

      {installed && (
        <div className={`${CARD} items-start border-green-200 shadow-green-500/10`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 size={16} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">CHEMALUK is installed.</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Find it in your app list. Long-press the icon to add it to your home screen.
            </p>
          </div>
          <button onClick={() => setInstalled(false)} aria-label="Close" className={CLOSE_BTN}>
            <X size={16} />
          </button>
        </div>
      )}

      {showOfflineReady && (
        <div className={`${CARD} items-center`}>
          <span className={ICON_BOX}>
            <WifiOff size={16} />
          </span>
          <span className="flex-1 font-medium">Ready to work offline.</span>
        </div>
      )}
    </div>
  );
}
