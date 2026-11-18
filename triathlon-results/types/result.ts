// Types alignés sur le modèle SQLAlchemy `Result` de l'API (api/main.py).

export interface RaceResult {
  id: number;
  athlete_id: number;
  epreuve_id: number;
  nom_athlete: string;
  sexe: string | null;
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
