import {
  RACE_RESULT_SORT_COLUMNS,
  type RaceResultSortBy,
  type RaceResultsQuery,
} from "@/types/result";

export const PAGE_SIZES = [20, 50, 100] as const;

const DEFAULT_QUERY: RaceResultsQuery = {
  limit: 20,
  offset: 0,
  sortBy: "clt",
  order: "asc",
  sexe: null,
  categorie: null,
  q: null,
};

export type RaceResultsSearchParams = Partial<
  Record<"limit" | "offset" | "sort_by" | "order" | "sexe" | "categorie" | "q", string>
>;

function isSortColumn(value: string | undefined): value is RaceResultSortBy {
  return RACE_RESULT_SORT_COLUMNS.some((column) => column === value);
}

/** Convertit les paramètres de l'URL en requête valide (valeurs par défaut sinon). */
export function parseRaceResultsQuery(params: RaceResultsSearchParams): RaceResultsQuery {
  const limit = Number(params.limit);
  const offset = Number(params.offset);
  const q = params.q?.trim() ?? "";

  return {
    limit: PAGE_SIZES.some((size) => size === limit) ? limit : DEFAULT_QUERY.limit,
    offset: Number.isInteger(offset) && offset > 0 ? offset : DEFAULT_QUERY.offset,
    sortBy: isSortColumn(params.sort_by) ? params.sort_by : DEFAULT_QUERY.sortBy,
    order: params.order === "desc" ? "desc" : "asc",
    sexe: params.sexe === "M" || params.sexe === "F" ? params.sexe : null,
    categorie: params.categorie || null,
    // L'API exige au moins 2 caractères pour la recherche par nom.
    q: q.length >= 2 ? q : null,
  };
}

export function hasActiveFilters(query: RaceResultsQuery): boolean {
  return query.sexe !== null || query.categorie !== null || query.q !== null;
}

/** Construit l'URL de la page de résultats ; seules les valeurs non par défaut y figurent. */
export function buildRaceResultsUrl(
  raceId: string,
  query: RaceResultsQuery,
  changes: Partial<RaceResultsQuery> = {}
): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();

  if (next.sexe) params.set("sexe", next.sexe);
  if (next.categorie) params.set("categorie", next.categorie);
  if (next.q) params.set("q", next.q);
  if (next.sortBy !== DEFAULT_QUERY.sortBy) params.set("sort_by", next.sortBy);
  if (next.order !== DEFAULT_QUERY.order) params.set("order", next.order);
  if (next.limit !== DEFAULT_QUERY.limit) params.set("limit", String(next.limit));
  if (next.offset > 0) params.set("offset", String(next.offset));

  const search = params.toString();
  return `/races/${raceId}/results${search ? `?${search}` : ""}`;
}
