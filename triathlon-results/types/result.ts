// Types alignés sur le modèle SQLAlchemy `Result` de l'API (api/main.py).

export interface RaceResult {
  id: number;
  athlete_id: number;
  epreuve_id: number;
  nom_athlete: string;
  sexe: string | null;
  /** Résultat d'une équipe (bike&run, relais) : pas de profil d'athlète. */
  equipe: boolean;
  cat: string | null;
  categorie: string | null;

  clt: number | null;
  rang_global: string | null;
  clt_cat: string | null;

  swim_time: string | null;
  bike_time: string | null;
  run_time: string | null;
  t1_time: string | null;
  t2_time: string | null;
  total_time: string | null;

  date_epreuve: string;
  year_epreuve: string;
  name_epreuve: string;
  format_epreuve: string;
  type_epreuve: string;

  url: string | null;
  source: string | null;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

export interface RaceResultsResponse {
  items: RaceResult[];
  pagination: Pagination;
}

// Colonnes triables acceptées par GET /races/{id}/results (paramètre sort_by).
export const RACE_RESULT_SORT_COLUMNS = [
  "clt",
  "nom_athlete",
  "swim_time",
  "t1_time",
  "bike_time",
  "t2_time",
  "run_time",
  "total_time",
] as const;

export type RaceResultSortBy = (typeof RACE_RESULT_SORT_COLUMNS)[number];

export type SortOrder = "asc" | "desc";

export type Sexe = "M" | "F";

// Paramètres du classement, lus depuis l'URL de la page et transmis à l'API.
export interface RaceResultsQuery {
  limit: number;
  offset: number;
  sortBy: RaceResultSortBy;
  order: SortOrder;
  sexe: Sexe | null;
  categorie: string | null;
  q: string | null;
}

// Disciplines dont le classement n'affiche que le temps total : leurs temps intermédiaires ne
// correspondent pas aux colonnes natation / T1 / vélo / T2 / course d'un triathlon.
export const DISCIPLINES_WITHOUT_SPLITS = ["aquathlon", "bike&run", "swimrun"];
