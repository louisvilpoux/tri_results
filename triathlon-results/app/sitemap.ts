import type { MetadataRoute } from "next";

import { getSitemapRaces } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

/**
 * /sitemap.xml : accueil, listes, pages course (une par nom + année, à leur URL canonique) et
 * pages classement (une par épreuve). Les athlètes sont dans app/athletes/sitemap.ts. Les id sont
 * stables d'une reconstruction de la base à l'autre (transform/ids_stables.sql).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { events, rankings } = await getSitemapRaces();
  const lastModified = (date: string | null) => date ?? undefined;

  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/races` },
    { url: `${SITE_URL}/athletes` },
    ...events.map((event) => ({
      url: `${SITE_URL}/races/${event.id}`,
      lastModified: lastModified(event.date),
    })),
    ...rankings.map((ranking) => ({
      url: `${SITE_URL}/races/${ranking.id}/results`,
      lastModified: lastModified(ranking.date),
    })),
  ];
}
