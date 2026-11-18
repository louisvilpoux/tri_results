import Form from "next/form";
import Link from "next/link";

import { buildAthleteUrl, hasActiveAthleteFilters } from "@/lib/athlete-results-query";
import { capitalize } from "@/lib/format";
import type { AthleteProfile, AthleteResultsQuery } from "@/types/athlete";

const FIELD_CLASS =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#17202E] " +
  "outline-none focus:border-[#FC6B32] focus:ring-2 focus:ring-[#FC6B32]/20";

interface AthleteResultsFiltersProps {
  athlete: AthleteProfile;
  query: AthleteResultsQuery;
}

/**
 * Formulaire GET : les filtres sont écrits dans l'URL et la page est rendue à nouveau
 * côté serveur. Le tri courant est conservé, la pagination repart à 1.
 */
export function AthleteResultsFilters({ athlete, query }: AthleteResultsFiltersProps) {
  const athleteId = String(athlete.id);

  return (
    <Form
      action={`/athletes/${athleteId}`}
      scroll={false}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="sort_by" value={query.sortBy} />
      <input type="hidden" name="order" value={query.order} />

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
        Saison
        <select name="annee" defaultValue={query.year ?? ""} className={FIELD_CLASS}>
          <option value="">Toutes</option>
          {athlete.seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
        Discipline
        <select name="discipline" defaultValue={query.discipline ?? ""} className={FIELD_CLASS}>
          <option value="">Toutes</option>
          {athlete.disciplines.map((discipline) => (
            <option key={discipline.type_epreuve} value={discipline.type_epreuve}>
              {capitalize(discipline.type_epreuve)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="h-10 rounded-lg bg-[#FC6B32] px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
        >
          Appliquer
        </button>

        {hasActiveAthleteFilters(query) && (
          <Link
            href={buildAthleteUrl(athleteId, query, { year: null, discipline: null, offset: 0 })}
            scroll={false}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold leading-10 text-gray-600 hover:border-[#FC6B32] hover:text-[#FC6B32]"
          >
            Réinitialiser
          </Link>
        )}
      </div>
    </Form>
  );
}
