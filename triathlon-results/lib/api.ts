import type { RaceResultsResponse } from "@/types/result";

const API_BASE_URL = process.env.API_BASE_URL;

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