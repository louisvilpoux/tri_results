// Types alignés sur GET /search (api/main.py).

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

export interface SearchResponse {
  q: string;
  type: SearchType;
  limit: number;
  offset: number;
  athletes?: SearchGroup<AthleteHit>;
  races?: SearchGroup<RaceHit>;
}
