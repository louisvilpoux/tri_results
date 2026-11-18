import {
  ATHLETE_RESULT_SORT_COLUMNS,
  type AthleteResultSortBy,
  type AthleteResultsQuery,
} from "@/types/athlete";

const DEFAULT_QUERY: AthleteResultsQuery = {
  limit: 20,
  offset: 0,
  sortBy: "date_epreuve",
  order: "desc",
  year: null,
  discipline: null,
};

export type AthleteResultsSearchParams = Partial<
  Record<"offset" | "sort_by" | "order" | "annee" | "discipline", string>
>;

function isSortColumn(value: string | undefined): value is AthleteResultSortBy {
  return ATHLETE_RESULT_SORT_COLUMNS.some((column) => column === value);
}

/** Convertit les paramètres de l'URL en requête valide (valeurs par défaut sinon). */
export function parseAthleteResultsQuery(
  params: AthleteResultsSearchParams
): AthleteResultsQuery {
  const offset = Number(params.offset);

  return {
    limit: DEFAULT_QUERY.limit,
    offset: Number.isInteger(offset) && offset > 0 ? offset : DEFAULT_QUERY.offset,
    sortBy: isSortColumn(params.sort_by) ? params.sort_by : DEFAULT_QUERY.sortBy,
    order: params.order === "asc" ? "asc" : params.order === "desc" ? "desc" : DEFAULT_QUERY.order,
    year: params.annee && /^\d{4}$/.test(params.annee) ? params.annee : null,
    discipline: params.discipline || null,
  };
}

export function hasActiveAthleteFilters(query: AthleteResultsQuery): boolean {
  return query.year !== null || query.discipline !== null;
}

/** Construit l'URL du profil ; seules les valeurs non par défaut y figurent. */
export function buildAthleteUrl(
  athleteId: string,
  query: AthleteResultsQuery,
  changes: Partial<AthleteResultsQuery> = {}
): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();

  if (next.year) params.set("annee", next.year);
  if (next.discipline) params.set("discipline", next.discipline);
  if (next.sortBy !== DEFAULT_QUERY.sortBy) params.set("sort_by", next.sortBy);
  if (next.order !== DEFAULT_QUERY.order) params.set("order", next.order);
  if (next.offset > 0) params.set("offset", String(next.offset));

  const search = params.toString();
  return `/athletes/${athleteId}${search ? `?${search}` : ""}`;
}
