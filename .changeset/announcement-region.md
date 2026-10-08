---
"@handamade/psi-react": minor
---

`ToastRegion` is a region landmark, and its live wrappers speak only what is
new (D90). No prop changes.

- **The region element sets `role="region"`**, after the spread, so a `role`
  passed in does not displace it. It is always named — `aria-label` defaults to
  "Notifications" — so it is always a valid landmark. Before, it was a `div`
  with a name and no role, which ARIA prohibits; axe reports it as
  `aria-prohibited-attr` (WCAG 4.1.2).
- **Both live wrappers set `aria-atomic="false"`.** `role="status"` and
  `role="alert"` carry an implicit `aria-atomic="true"`, so a screen reader
  could speak the whole wrapper on each change; a message added beside another
  made it speak both again. Now it speaks the added node, one `Toast` or one
  `Announcement`.
