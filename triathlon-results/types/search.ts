// Types alignés sur GET /search, GET /events, GET /courses et GET /athletes (api/main.py).
import type { Pagination } from "@/types/result";

export type SearchType = "all" | "athletes" | "races" | "clubs";

export interface AthleteHit {
  id: number;
  nom: string | null;
  club: string | null;
  nb_races: number;
  last_season: string | null;
}

export interface RaceHit {
  /** Épreuve représentative de la course : lien vers /races/{id}. */
  id: number;
  name_epreuve: string | null;
  year_epreuve: string | null;
  date_start: string | null;
  date_end: string | null;
  lieu_epreuve: string | null;
  types: string[];
}

export interface SearchGroup<T> {
  items: T[];
  total: number;
}

/** Valeurs proposées par les filtres de la liste des courses. */
export interface RaceListFilters {
  years: string[];
  types: string[];
  /** Formats (colonne format_epreuve), hors sources au format non fiable. */
  formats: string[];
}

/** GET /events : liste des éditions (nom + année), avec les valeurs des filtres. */
export interface EventListResponse {
  items: RaceHit[];
  pagination: Pagination;
  filters: RaceListFilters;
}

/** Édition d'une course : lien vers /races/{id}. */
export interface CourseEdition {
  id: number;
  year_epreuve: string | null;
}

/** Une course (même nom) et toutes ses éditions. */
export interface CourseHit {
  name_epreuve: string | null;
  lieu_epreuve: string | null;
  types: string[];
  /** Édition la plus récente qui répond aux filtres : lien principal, date. */
  edition: CourseEdition & { date_start: string | null; date_end: string | null };
  /** Toutes les éditions, de la plus récente à la plus ancienne. */
  editions: CourseEdition[];
}

/** GET /courses : une ligne par course (U13 du retour utilisateur du 23/11/2026). */
export interface CourseListResponse {
  items: CourseHit[];
  pagination: Pagination;
  filters: RaceListFilters;
}

/** GET /athletes : liste des athlètes (un par unified_id). */
export interface AthleteListResponse {
  items: AthleteHit[];
  pagination: Pagination;
}

/** Club trouvé par la recherche globale : son nombre d'athlètes (club actuel). */
export interface ClubHit {
  club: string;
  nb_athletes: number;
}

export interface SearchResponse {
  q: string;
  type: SearchType;
  limit: number;
  offset: number;
  athletes?: SearchGroup<AthleteHit>;
  races?: SearchGroup<RaceHit>;
  /** Avec type=all ou clubs : les clubs qui répondent à la recherche, les plus grands d'abord. */
  clubs?: SearchGroup<ClubHit>;
}

/** Suggestions demandées : tout (recherche globale), athlètes ou courses (listes). */
export type SuggestType = "all" | "athletes" | "courses";

/** GET /suggest : suggestions pendant la saisie (U4 du retour utilisateur du 23/11/2026). */
export interface SuggestResponse {
  q: string;
  athletes: AthleteHit[];
  /** Recherche globale seulement (type=all) : 3 clubs au plus. */
  clubs?: ClubHit[];
  courses: CourseHit[];
}
