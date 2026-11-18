import type { Metadata } from "next";

import { formatDate } from "@/lib/format";
import type { AthleteProfile } from "@/types/athlete";
import type { Race, RaceEvent } from "@/types/race";

/** Adresse publique du site, utilisée pour les URL canoniques et Open Graph. */
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "PACE";

export const OPEN_GRAPH_DEFAULTS = {
  type: "website",
  siteName: SITE_NAME,
  locale: "fr_FR",
} as const;

/** Titre et description communs aux balises classiques et Open Graph. */
function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    // Next remplace l'objet openGraph du layout : on répète donc les champs communs.
    openGraph: { ...OPEN_GRAPH_DEFAULTS, title, description, url: path },
  };
}

function plural(count: number, word: string): string {
  return `${count.toLocaleString("fr-FR")} ${word}${count > 1 ? "s" : ""}`;
}

/**
 * Une course est accessible depuis l'id de chacun de ses formats : l'URL canonique
 * utilise l'épreuve de référence de l'édition (la même que dans les listes).
 */
export function canonicalRaceId(event: RaceEvent): number {
  const edition = event.editions.find((item) => item.year_epreuve === event.year_epreuve);
  return edition?.race_id ?? event.id;
}

export function raceEventMetadata(event: RaceEvent): Metadata {
  const name = event.name_epreuve ?? "Course";
  const title = event.year_epreuve && !name.includes(event.year_epreuve)
    ? `${name} ${event.year_epreuve}`
    : name;

  const details = [
    event.date_start ? `le ${formatDate(event.date_start)}` : null,
    event.lieu_epreuve ? `à ${event.lieu_epreuve}` : null,
  ].filter(Boolean);
  const description =
    `Résultats et classements de ${title}${details.length ? ` ${details.join(" ")}` : ""} : ` +
    `${plural(event.formats.length, "format")}, ${plural(event.participants, "participant")}.`;

  return pageMetadata(title, description, `/races/${canonicalRaceId(event)}`);
}

export function raceResultsMetadata(race: Race): Metadata {
  const name = race.name_epreuve ?? "Course";
  const title = `Classement ${name}${race.format_epreuve ? ` (${race.format_epreuve})` : ""}`;
  const description =
    `Classement complet de ${name}` +
    (race.date_epreuve ? ` du ${formatDate(race.date_epreuve)}` : "") +
    " : rangs, catégories et temps de natation, vélo et course à pied.";

  return pageMetadata(title, description, `/races/${race.id}/results`);
}

export function athleteMetadata(athlete: AthleteProfile): Metadata {
  const name = athlete.nom ?? "Athlète";
  const seasons = athlete.seasons.length
    ? ` entre ${athlete.seasons[athlete.seasons.length - 1]} et ${athlete.seasons[0]}`
    : "";
  const description =
    `Résultats de ${name}${athlete.club ? ` (${athlete.club})` : ""} : ` +
    `${plural(athlete.nb_races, "course")}${seasons}, ` +
    `${plural(athlete.nb_podiums, "podium")} et meilleurs temps par format.`;

  return pageMetadata(name, description, `/athletes/${athlete.id}`);
}
