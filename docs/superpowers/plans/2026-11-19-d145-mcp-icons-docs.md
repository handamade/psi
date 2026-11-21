# MCP icons, hooks, hint ranking and page fixes (D145) — implementation plan

Spec: `docs/superpowers/specs/2026-11-19-d145-mcp-icons-docs-design.md`.
Test-first. Starts after #200 (D143) merges, on a branch from an up-to-date
`origin/main`: #200 rewrites `destructive-confirm.json`, `packages/mcp/src/types.ts`
and the llms files this plan also edits. Stay out of `CLAUDE.md`,
`tools/release-guard.mjs` and the root `llms.txt` (a parallel decision's).

1. **Manifest: icons.** `emit-manifest.test.ts`: `iconDetails.props` is one
   `size` prop (number, default 20); `iconDetails.attributes` is
   `SVGAttributes`; `iconDetails.keywords` has exactly the roster's keys, each
   non-empty; `attributes.json` has an `icons` set containing `viewBox`-free
   SVG names such as `strokeWidth` and `className`. Then
   `src/icons/keywords.json` (38 entries) and the emit code: docgen over all
   icon files in one `parse([...])`, throw on differing props or keyword keys.
2. **Manifest: hooks.** `emit-manifest.test.ts`: `hooks[0]` is `useToast`,
   returns `ToastHandle`, members `show`, `announce`, `dismiss`, `clear` with
   signatures and TSDoc; `types` holds `ToastOptions` (`message` required,
   `variant` default `"neutral"`) and `AnnounceOptions`. Then the TS-checker
   extraction (`HOOKS` list).
3. **Docs builder** (`packages/docs`). Tests in `component-pages.test.ts` and
   a new `icon-pages.test.ts`: the Toast page has `## useToast()` with the
   method table and both option tables; `iconsPageMd` lists 38 rows and the
   props table; `iconMd` has the import line. Then `DocsInput.icons`/`hooks`
   (from `node.ts`), `pages.ts` `hooks` on the toast page, the builders, and
   `DocsPages.icons` (`all`, `byName`). The site's HTML Toast page renders
   the same section through `mdToHtml`.
4. **emit-docs variant filter.** Test (new `emit-docs` assertions over the
   generated `docs/*.md`): Tag's section has no `ghost`/`outline`/
   `accent-subtle`; Card and Skeleton have no section; Button keeps all eight.
   Then the filter, and "(Tag only)" out of `guidance.ts`.
5. **Index + store.** `index-builder.test.ts`: `icons` and `hooks` in the
   index. `store.test.ts`: icon briefs and ids, `get` for `icon:`, `icons`,
   `hook:` and bare names, `suggest` knows them, `search` finds by name and
   keyword, `useToast` ranks `hook:useToast` first; overview has
   `component:*` with every name and the total, `icons:all`, every topic and
   pattern, pattern intros longer than one word at today's catalog, ≤ 6000 at
   the grown sizes. Then `types.ts`, `index-builder.ts`, `store.ts`; update
   `measure-overview-envelope.ts` to the new fixed rows.
6. **Hint.** `nearest.test.ts`: `hint` tiers, camel-word containment (two
   shared words), no match → null. `check.test.ts`: the Combobox
   `onValueChange` probe gets `onChange` and names `SegmentedControl`; an
   icon's unknown prop is found, its `size`/`className`/`strokeWidth`/
   `aria-label` pass; icons are no longer "not checked". Then `nearest.ts`,
   `check/rules.ts`, `CheckIndex`.
7. **Destructive confirm.** `presets.test.ts` (from #200) / pattern tests:
   the preset passes `check`, Cancel is `neutral`, Dialog carries
   `dismissible={false}` and `closeOnEscape`. Then the JSON, the docs
   example, and the `Dialog` `Default` story.
8. **Server text and llms.** Tool descriptions (`search`, `get`, `check`)
   name icons and hooks; `packages/mcp/llms.txt`, `packages/react/llms.txt`,
   `packages/mcp/README.md` where they describe ids. Changeset (react, docs,
   mcp, tokens; minor).
9. **Local MCP run.** `node packages/mcp/dist/cli.js` over stdio with the
   spec's probe table; record before/after.
10. **Gates**, all five:
    `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site`.
    **PR**: re-check D145 against every `## Decisions` entry on `origin/*`,
    open, arm auto-merge and read it back. `vr` will move the
    destructive-confirm preset story and `Dialog` `Default`: commit CI's
    renders from the `vr-baselines` artifact after looking at them.
