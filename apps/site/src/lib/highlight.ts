import { codeToHtml, createCssVariablesTheme } from "shiki";

/** Shiki emits var(--shiki-*) instead of colours; docs.css maps each one
 * to a --psi-* token, so code follows the theme like everything else. */
export const psiShikiTheme = createCssVariablesTheme({
  name: "psi",
  variablePrefix: "--shiki-",
  variableDefaults: {},
  fontStyle: true,
});

export async function highlight(
  code: string,
  lang: "tsx" | "ts" | "bash" | "css" | "json" | "html",
): Promise<string> {
  return codeToHtml(code.trimEnd(), { lang, theme: psiShikiTheme });
}
