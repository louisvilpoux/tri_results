const API_BASE_URL = process.env.API_BASE_URL;

export interface RaceResult {
  id: number;
  athlete_id: number;
  epreuve_id: number;

  clt: number | null;
  rang_global: string | null;
  nom_athlete: string;

  cat: string | null;

  sexe: string | null;
  categorie: string | null;

  swim_time: string | null;
  bike_time: string | null;
  run_time: string | null;
  t1_time: string | null;
  t2_time: string | null;
  total_time: string | null;

  date_epreuve: string;
  name_epreuve: string;
  format_epreuve: string;
  type_epreuve: string;
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

interface GetRaceResultsParams {
  limit: number;
  offset: number;
  sort_by: string;
  order: string;
}

export async function getRaceResults(
  raceId: string,
  params: GetRaceResultsParams
): Promise<RaceResultsResponse> {
  if (!API_BASE_URL) {
    throw new Error("La variable API_BASE_URL est manquante.");
  }

  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
    sort_by: params.sort_by,
    order: params.order,
  });

  const response = await fetch(
    `${API_BASE_URL}/races/${raceId}/results?${query.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Erreur API : ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}