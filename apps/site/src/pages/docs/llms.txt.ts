import type { APIRoute } from "astro";
import { allTwins } from "../../lib/twins";

export const GET: APIRoute = async () => {
  const twins = await allTwins();
  const body = [
    "# Psi docs",
    "",
    "> Every page of the Psi docs as markdown. Generated at build from the same data as the HTML pages.",
    "",
    ...twins.map((t) => `- [${t.title}](https://psi.kurkin.de${t.url}): ${t.summary}`),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
