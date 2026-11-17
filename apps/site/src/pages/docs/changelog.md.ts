import type { APIRoute } from "astro";
import { UPDATES } from "../../content/updates";
import { changelogMd } from "../../lib/changelog";

export const GET: APIRoute = () =>
  new Response(changelogMd(UPDATES), { headers: { "content-type": "text/markdown; charset=utf-8" } });
