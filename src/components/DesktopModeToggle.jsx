import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import {
  getDesktopMode,
  isPhone,
  setDesktopMode,
  subscribeViewMode,
} from "../lib/viewMode";

// Shows only on phones. Use inline anywhere, or pass `floating` for a corner button.
export default function DesktopModeToggle({ floating = false, className = "" }) {
  const [desktop, setDesktop] = useState(getDesktopMode());

  useEffect(() => subscribeViewMode(() => setDesktop(getDesktopMode())), []);

  if (!isPhone()) return null;

  const base =
    "flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-gray-800";
  const pos = floating
    ? "fixed right-3 z-[9998]"
    : "";

  return (
    <button
      type="button"
      onClick={() => setDesktopMode(!desktop)}
      className={`${base} ${pos} ${className}`}
      style={
        floating
          ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }
          : undefined
      }
      aria-pressed={desktop}
    >
      {desktop ? (
        <>
          <Smartphone size={14} className="text-orange-400" />
          Phone view
        </>
      ) : (
        <>
          <Monitor size={14} className="text-orange-400" />
          Desktop view
        </>
      )}
    </button>
  );
}
