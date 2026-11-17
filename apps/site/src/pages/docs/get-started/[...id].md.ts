import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { guideMd } from "../../../lib/markdown";

export async function getStaticPaths() {
  const guides = await getCollection("guides");
  return guides.map((entry) => ({ params: { id: entry.id }, props: { entry } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(guideMd((props.entry as { id: string }).id), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
