import type { MetadataRoute } from "next";

import { getSitemapAthletes } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

/**
 * Nombre de fichiers sitemap d'athlètes, fixé ici plutôt que demandé à l'API : generateSitemaps
 * s'exécute au build, quand l'API n'est pas forcément joignable. 10 fichiers de 50 000 URL
 * (limite de Google) couvrent 500 000 athlètes (258 342 le 22/11/2026) ; les fichiers en trop
 * sont vides et app/robots.ts ne liste que ceux qui servent.
 */
export const ATHLETE_SITEMAPS = 10;

export async function generateSitemaps(): Promise<{ id: number }[]> {
  return Array.from({ length: ATHLETE_SITEMAPS }, (_, id) => ({ id }));
}

/** /athletes/sitemap/{id}.xml : profils d'athlètes, tranche `id` de 50 000. */
export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const page = Number(await props.id);
  const ids = await getSitemapAthletes(page);
  return ids.map((id) => ({ url: `${SITE_URL}/athletes/${id}` }));
}
