import type { Metadata } from "next";

import { RaceHitList } from "@/components/search/race-hit-list";
import { FILTER_FIELD_CLASS, FilterField, FilterForm } from "@/components/shared/filter-form";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { listEvents } from "@/lib/api";
import { capitalize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Toutes les courses de triathlon, duathlon et bike & run : dates, lieux, formats et " +
    "classements, filtrables par saison et par discipline.",
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ annee?: string; discipline?: string; offset?: string }>;
}

interface RacesQuery {
  year: string | null;
  discipline: string | null;
  offset: number;
}

function parseQuery(params: Awaited<PageProps["searchParams"]>): RacesQuery {
  const offset = Number(params.offset);
  return {
    year: params.annee && /^\d{4}$/.test(params.annee) ? params.annee : null,
    discipline: params.discipline || null,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

function buildRacesUrl(query: RacesQuery): string {
  const params = new URLSearchParams();
  if (query.year) params.set("annee", query.year);
  if (query.discipline) params.set("discipline", query.discipline);
  if (query.offset > 0) params.set("offset", String(query.offset));
  const search = params.toString();
  return `/races${search ? `?${search}` : ""}`;
}

export default async function RacesPage({ searchParams }: PageProps) {
  const query = parseQuery(await searchParams);

  let data;
  try {
    data = await listEvents({ ...query, limit: PAGE_SIZE });
  } catch (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">Impossible de charger les courses</h1>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  const { items, pagination, filters } = data;
  const hasFilters = query.year !== null || query.discipline !== null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">Explorer</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-gray-500">
          {pagination.total.toLocaleString("fr-FR")} course{pagination.total > 1 && "s"}, les plus
          récentes d’abord.
        </p>
      </section>

      <FilterForm action="/races" resetHref={hasFilters ? "/races" : undefined}>
        <FilterField label="Saison">
          <select name="annee" defaultValue={query.year ?? ""} className={FILTER_FIELD_CLASS}>
            <option value="">Toutes</option>
            {filters.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Discipline">
          <select
            name="discipline"
            defaultValue={query.discipline ?? ""}
            className={FILTER_FIELD_CLASS}
          >
            <option value="">Toutes</option>
            {filters.types.map((type) => (
              <option key={type} value={type}>
                {capitalize(type)}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      {items.length > 0 ? (
        <div className="space-y-4">
          <RaceHitList races={items} />
          <PaginationBar
            pagination={pagination}
            shownCount={items.length}
            previousHref={buildRacesUrl({
              ...query,
              offset: Math.max(query.offset - PAGE_SIZE, 0),
            })}
            nextHref={buildRacesUrl({ ...query, offset: query.offset + PAGE_SIZE })}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
          Aucune course ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
