import type { APIRoute } from "astro";
import { overviewMd } from "../../lib/markdown";

export const GET: APIRoute = () => new Response(overviewMd(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
