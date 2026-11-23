import type { NextRequest } from "next/server";

import { ApiError, SUGGEST_FILTERS, suggest } from "@/lib/api";
import type { SuggestFilters } from "@/lib/api";
import type { SuggestType } from "@/types/search";

const TYPES: SuggestType[] = ["all", "athletes", "courses"];

/**
 * GET /api/suggest?q=…&type=…(&s=…&year=…) : relaie GET /suggest de l'API au navigateur, qui ne connaît pas
 * l'adresse de l'API (API_BASE_URL est réservée au serveur). Utilisé par les suggestions du
 * champ de recherche et des champs de filtre des listes (`components/search/suggest-input.tsx`).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ detail: "Recherche trop courte" }, { status: 422 });
  }
  const typeParam = request.nextUrl.searchParams.get("type") ?? "all";
  const type = TYPES.find((value) => value === typeParam) ?? "all";
  // filtres déjà appliqués sur la liste (sexe ; année, discipline, format)
  const filters: SuggestFilters = {};
  for (const name of SUGGEST_FILTERS) {
    filters[name] = request.nextUrl.searchParams.get(name);
  }
  try {
    return Response.json(await suggest(q.slice(0, 100), type, filters));
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    return Response.json({ detail: "Suggestions indisponibles" }, { status });
  }
}
