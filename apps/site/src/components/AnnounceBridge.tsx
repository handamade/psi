import { useEffect } from "react";
import { useToast } from "@handamade/psi-react";

import { ANNOUNCE_EVENT } from "../lib/announce";

/** Speaks every `announce()` through the nearest ToastProvider. Mount exactly one
 * per page: DocsShell owns the docs pages', CanopyIsland the homepage's. Not in
 * SiteChrome, which every page renders, or a docs page would speak twice. */
export function AnnounceBridge() {
  const toast = useToast();
  useEffect(() => {
    const onAnnounce = (e: Event) => toast.announce((e as CustomEvent<string>).detail);
    window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
    return () => window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
  }, [toast]);
  return null;
}
