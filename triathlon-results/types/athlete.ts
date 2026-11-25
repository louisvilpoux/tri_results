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
  /** Classés de l'épreuve (rang valide) : dénominateur de la place, comme dans la progression. */
  classes: number;
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

// Progression d'un athlète (GET /athletes/{id}/progression).

export interface ProgressionRace {
  race_id: number;
  name_epreuve: string;
  date: string | null;
  year: string;
  total: string | null;
  /** Temps de chaque segment, par clé (swim, bike, run ; run1, bike, run2 en duathlon). */
  segments: Record<string, string>;
  /** Temps intermédiaires publiés par la source mais incohérents, retirés (D12). */
  segments_retires: boolean;
  clt: number;
  /** Nombre de classés de l'épreuve. */
  classes: number;
  /** Place / classés (0 à 1) : 12e sur 200 → 0,06. */
  pourcentage: number | null;
  /** Médiane du temps total de l'épreuve. */
  mediane: string | null;
  /** Temps de l'athlète moins la médiane, en secondes (négatif : plus rapide). */
  ecart_mediane: number | null;
}

/** Une discipline et un format couru au moins deux fois. */
export interface ProgressionSeries {
  type_epreuve: string;
  format_epreuve: string;
  segments: { key: string; label: string }[];
  /** Dans l'ordre chronologique. */
  courses: ProgressionRace[];
  /** Courses faites au moins deux fois (années différentes), la plus répétée d'abord. */
  memes_courses: { name_epreuve: string; editions: number }[];
}

export interface AthleteProgression {
  id: number;
  /** Format le plus couru d'abord. */
  series: ProgressionSeries[];
}
