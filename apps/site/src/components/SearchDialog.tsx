import { useEffect, useRef, useState } from "react";
import { Dialog, Field, Input } from "@handamade/psi-react";

import { announce } from "../lib/announce";

interface Hit {
  url: string;
  title: string;
  excerpt: string;
}
interface Pagefind {
  search: (q: string) => Promise<{
    results: { data: () => Promise<{ url: string; meta: { title: string }; excerpt: string }> }[];
  }>;
}

let pagefind: Promise<Pagefind> | null = null;
function loadPagefind(): Promise<Pagefind> {
  // Loaded on first open only; the path is outside Vite's graph on purpose.
  // A rejected import is dropped from the cache so the next search retries it.
  pagefind ??= (import(/* @vite-ignore */ "/pagefind/pagefind.js" as string) as Promise<Pagefind>).catch(
    (err: unknown) => {
      pagefind = null;
      throw err;
    },
  );
  return pagefind;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || query.trim() === "") {
      setHits([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("searching");
    loadPagefind()
      .then((pf) => pf.search(query))
      .then((res) => Promise.all(res.results.slice(0, 8).map((r) => r.data())))
      .then((data) => {
        if (cancelled) return;
        setHits(data.map((d) => ({ url: d.url, title: d.meta.title, excerpt: d.excerpt })));
        setStatus("done");
        announce(data.length === 0 ? "No results" : `${data.length} ${data.length === 1 ? "result" : "results"}`);
      })
      .catch(() => {
        if (cancelled) return;
        setHits([]);
        setStatus("error");
        announce("Search is unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  return (
    <Dialog open={open} onClose={onClose} title="Search" width={560} initialFocus={inputRef}>
      <Field label="Search the docs">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </Field>
      <ul className="search-results">
        {hits.map((h) => (
          <li key={h.url}>
            <a href={h.url}>
              <span className="search-result-title">{h.title}</span>
              {/* Pagefind's excerpt is its own escaped HTML with <mark> highlights. */}
              <span
                className="search-result-excerpt"
                dangerouslySetInnerHTML={{ __html: h.excerpt }}
              />
            </a>
          </li>
        ))}
        {status === "done" && hits.length === 0 && <li className="search-empty">No results</li>}
        {status === "error" && <li className="search-empty">Search is unavailable</li>}
      </ul>
    </Dialog>
  );
}
