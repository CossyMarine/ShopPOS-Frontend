// Phone ⇄ Desktop view toggle, remembered per device.
const KEY = "pos-desktop-mode";
const EVENT = "pos-view-mode-change";
const PHONE_MAX_SHORT_SIDE = 600; // CSS px

const PHONE_VIEWPORT = "width=device-width, initial-scale=1.0, viewport-fit=cover";
const DESKTOP_VIEWPORT = "width=1280, initial-scale=1.0, viewport-fit=cover";

export function isPhone() {
  try {
    return Math.min(window.screen.width, window.screen.height) < PHONE_MAX_SHORT_SIDE;
  } catch {
    return false;
  }
}

export function getDesktopMode() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function setViewport(content) {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function setOrientation(desktop) {
  try {
    const o = window.screen && window.screen.orientation;
    if (!o) return;
    if (desktop) {
      if (typeof o.unlock === "function") o.unlock();
    } else if (isPhone() && typeof o.lock === "function") {
      // Only succeeds in the installed app on Android; ignored elsewhere.
      o.lock("portrait").catch(() => {});
    }
  } catch {
    /* orientation API unavailable */
  }
}

// Apply the saved mode. Call once at startup. Desktops/tablets are untouched.
export function applyViewMode() {
  if (!isPhone()) return;
  const desktop = getDesktopMode();
  setViewport(desktop ? DESKTOP_VIEWPORT : PHONE_VIEWPORT);
  setOrientation(desktop);
}

export function setDesktopMode(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? "1" : "0");
  } catch {
    /* storage unavailable — mode lasts until reload */
  }
  setViewport(enabled ? DESKTOP_VIEWPORT : PHONE_VIEWPORT);
  setOrientation(enabled);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeViewMode(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
