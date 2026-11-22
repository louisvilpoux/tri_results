import type { MetadataRoute } from "next";

import { getSitemapAthletesCount } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt : tout est explorable sauf la recherche (pages sans contenu propre). Liste les
 * sitemaps : /sitemap.xml (courses et classements) et les fichiers d'athlètes qui contiennent
 * des URL (app/athletes/sitemap.ts).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let athletePages = 0;
  try {
    athletePages = (await getSitemapAthletesCount()).pages;
  } catch {
    // API indisponible : seul le sitemap des courses est annoncé
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: "/search" },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      ...Array.from(
        { length: athletePages },
        (_, page) => `${SITE_URL}/athletes/sitemap/${page}.xml`
      ),
    ],
  };
}
