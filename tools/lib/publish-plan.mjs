// Pure helpers for tools/publish.mjs, kept apart so they can be tested
// without packing or touching the registry.

const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];

/**
 * Order packages so each comes after every package in the set it depends on.
 * Independent packages keep the order they were given in. A cycle throws:
 * there is no safe order to publish it in.
 *
 * @param {{ name: string, dir: string, json: Record<string, unknown> }[]} pkgs
 */
export function publishOrder(pkgs) {
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const internalDeps = (p) =>
    DEP_FIELDS.flatMap((field) => Object.keys(p.json[field] ?? {})).filter(
      (dep) => dep !== p.name && byName.has(dep),
    );

  const ordered = [];
  const state = new Map(); // name -> "visiting" | "done"
  const visit = (p, path) => {
    const s = state.get(p.name);
    if (s === "done") return;
    if (s === "visiting") throw new Error(`publish order: dependency cycle ${[...path, p.name].join(" -> ")}`);
    state.set(p.name, "visiting");
    for (const dep of internalDeps(p)) visit(byName.get(dep), [...path, p.name]);
    state.set(p.name, "done");
    ordered.push(p);
  };
  for (const p of pkgs) visit(p, []);
  return ordered;
}

/**
 * Every dependency spec a packed package.json still carries in pnpm's own
 * protocols. A tarball with one of these cannot be installed by a consumer.
 *
 * @param {Record<string, unknown>} json the package.json read from the tarball
 * @returns {string[]} entries as "field.name@spec"
 */
export function workspaceLeaks(json) {
  return DEP_FIELDS.flatMap((field) =>
    Object.entries(json[field] ?? {})
      .filter(([, spec]) => typeof spec === "string" && /^(workspace|catalog):/.test(spec))
      .map(([name, spec]) => `${field}.${name}@${spec}`),
  );
}
