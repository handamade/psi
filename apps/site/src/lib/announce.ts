/** Each Astro island is its own React root, so a CopyButton in one island
 * cannot reach the ToastProvider in another through context. Islands
 * dispatch this event instead; DocsShell owns the one provider and speaks
 * it (CopyButton announces nothing by design, D86). */
export const ANNOUNCE_EVENT = "psi-site:announce";

export function announce(message: string): void {
  window.dispatchEvent(new CustomEvent<string>(ANNOUNCE_EVENT, { detail: message }));
}
