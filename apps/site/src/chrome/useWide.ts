import { useLayoutEffect, useState } from "react";

/** `breakpoints.md` (D31). docs.css and chrome.css bake the same 960px. */
export const WIDE = "(min-width: 960px)";

/** A media query's state. The server and the first client render use
 * `serverDefault`, so hydration never mismatches; the real value lands
 * before paint. */
export function useMatchMedia(query: string, serverDefault: boolean): boolean {
  const [matches, setMatches] = useState(serverDefault);
  useLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}
