// Locks the installed app to portrait on phones only.
// Desktops and tablets are left free to resize and rotate.
const PHONE_MAX_SHORT_SIDE = 600; // CSS px; tablets are wider than this

export default function lockPhoneOrientation() {
  try {
    const shortSide = Math.min(window.screen.width, window.screen.height);
    const isPhone = shortSide < PHONE_MAX_SHORT_SIDE;
    const orientation = window.screen && window.screen.orientation;

    if (!orientation) return;

    if (isPhone && typeof orientation.lock === "function") {
      // Only succeeds in the installed app (standalone/fullscreen) on Android.
      // In a normal browser tab it rejects, which we ignore on purpose.
      orientation.lock("portrait").catch(() => {});
    }
  } catch {
    /* orientation API unavailable — do nothing */
  }
}
