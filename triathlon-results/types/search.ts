// Types alignés sur GET /search, GET /events et GET /athletes (api/main.py).
import type { Pagination } from "@/types/result";

export type SearchType = "all" | "athletes" | "races";

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

/** GET /events : liste des courses, avec les valeurs disponibles pour les filtres. */
export interface EventListResponse {
  items: RaceHit[];
  pagination: Pagination;
  filters: {
    years: string[];
    types: string[];
    /** Formats (colonne format_epreuve), hors sources au format non fiable. */
    formats: string[];
  };
}

/** GET /athletes : liste des athlètes (un par unified_id). */
export interface AthleteListResponse {
  items: AthleteHit[];
  pagination: Pagination;
}

export interface SearchResponse {
  q: string;
  type: SearchType;
  limit: number;
  offset: number;
  athletes?: SearchGroup<AthleteHit>;
  races?: SearchGroup<RaceHit>;
}
