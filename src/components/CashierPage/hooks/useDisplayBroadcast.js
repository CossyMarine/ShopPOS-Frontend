import { useEffect } from "react";
import { postDisplayCart } from "../displayApi";

export default function useDisplayBroadcast(cart) {
  useEffect(() => {
    const t = setTimeout(() => postDisplayCart(cart), 250); // debounce rapid scans
    return () => clearTimeout(t);
  }, [cart]);
}
