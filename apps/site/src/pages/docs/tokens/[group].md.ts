import type { APIRoute } from "astro";
import { tokenPages, type TokenPage } from "../../../content/token-pages";
import { tokenPageMd } from "../../../lib/markdown";

export function getStaticPaths() {
  return tokenPages.map((page) => ({ params: { group: page.slug }, props: { page } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(tokenPageMd(props.page as TokenPage), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
