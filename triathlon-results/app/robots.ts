import type { MetadataRoute } from "next";

/** robots.txt : tout est explorable sauf la recherche (pages sans contenu propre). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/search" },
  };
}
