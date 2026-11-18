// Types alignés sur GET /athletes/{id} et GET /athletes/{id}/results (api/main.py).
import type { Pagination, RaceResult, SortOrder } from "@/types/result";

export interface AthleteDiscipline {
  type_epreuve: string;
  count: number;
}

export interface AthleteBestTime {
  type_epreuve: string | null;
  format_epreuve: string | null;
  total_time: string;
  epreuve_id: number;
  name_epreuve: string | null;
  date_epreuve: string | null;
}

export interface AthleteProfile {
  id: number;
  nom: string | null;
  club: string | null;
  sexe: "M" | "F" | null;
  nb_races: number;
  nb_podiums: number;
  nb_top10: number;
  best_rank: number | null;
  seasons: string[];
  disciplines: AthleteDiscipline[];
  best_times: AthleteBestTime[];
}

export interface AthleteResult extends RaceResult {
  participants: number;
}

export interface AthleteResultsResponse {
  items: AthleteResult[];
  pagination: Pagination;
}

export const ATHLETE_RESULT_SORT_COLUMNS = ["date_epreuve", "clt", "total_time"] as const;

export type AthleteResultSortBy = (typeof ATHLETE_RESULT_SORT_COLUMNS)[number];

// Paramètres de l'historique, lus depuis l'URL de la page et transmis à l'API.
export interface AthleteResultsQuery {
  limit: number;
  offset: number;
  sortBy: AthleteResultSortBy;
  order: SortOrder;
  year: string | null;
  discipline: string | null;
}
