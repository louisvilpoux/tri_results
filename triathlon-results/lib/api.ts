import type { Race } from "@/types/race";
import type { RaceResultsQuery, RaceResultsResponse } from "@/types/result";

const API_BASE_URL = process.env.API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Appel GET commun vers l'API FastAPI : gère l'URL de base et les erreurs HTTP. */
async function apiGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("La variable API_BASE_URL est manquante.");
  }

  const search = params?.toString();
  const response = await fetch(`${API_BASE_URL}${path}${search ? `?${search}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Erreur API : ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export function getRace(raceId: string): Promise<Race> {
  return apiGet<Race>(`/races/${raceId}`);
}

export function getRaceCategories(raceId: string): Promise<string[]> {
  return apiGet<string[]>(`/races/${raceId}/categories`);
}

export function getRaceResults(
  raceId: string,
  query: RaceResultsQuery
): Promise<RaceResultsResponse> {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
    sort_by: query.sortBy,
    order: query.order,
  });

  if (query.sexe) params.set("s", query.sexe);
  if (query.categorie) params.set("categorie", query.categorie);
  if (query.q) params.set("q", query.q);

  return apiGet<RaceResultsResponse>(`/races/${raceId}/results`, params);
}
