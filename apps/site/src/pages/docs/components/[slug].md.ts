import type { APIRoute } from "astro";
import { componentPages, type ComponentPage } from "../../../content/component-pages";
import { componentPageMd } from "../../../lib/markdown";

export function getStaticPaths() {
  return componentPages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}

export const GET: APIRoute = ({ props }) => {
  const page = props.page as ComponentPage;
  return new Response(componentPageMd(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
