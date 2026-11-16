import type { APIRoute } from "astro";
import { componentPages, type ComponentPage } from "../../../content/component-pages";
import { examplesFor } from "../../../examples/registry";
import { componentPageMd } from "../../../lib/markdown";

export function getStaticPaths() {
  return componentPages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}

export const GET: APIRoute = ({ props }) => {
  const page = props.page as ComponentPage;
  return new Response(componentPageMd(page, examplesFor(page.slug)), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
