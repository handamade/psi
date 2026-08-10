declare module "*.module.css" {
  const c: Record<string, string>;
  export default c;
}

// Ambient stub for the `process.env.NODE_ENV` dev-mode checks in Table.tsx
// (D62, Task 5) and Pagination.tsx (D78). Vite replaces the expression at
// carries no `@types/node` dependency, so `tsc` needs `process` declared to
// type-check the reference without pulling in the full Node type surface.
declare const process: { env: { NODE_ENV?: string } };
