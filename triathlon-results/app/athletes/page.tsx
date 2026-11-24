import type { Metadata } from "next";

import { ClubInput } from "@/components/athletes/club-input";
import { AthleteHitList } from "@/components/search/athlete-hit-list";
import { SuggestInput } from "@/components/search/suggest-input";
import { FILTER_FIELD_CLASS, FilterField, FilterForm } from "@/components/shared/filter-form";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { listAthletes } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

// URL canonique /athletes : les variantes filtrées (?q=…, ?sexe=…, ?club=…) ne sont pas des doublons.
export const metadata: Metadata = pageMetadata(
  "Athlètes",
  "Les athlètes de triathlon et duathlon : nombre de courses, club et dernière saison, " +
    "avec recherche par nom et par club.",
  "/athletes"
);

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    sexe?: string;
    club?: string;
    club_exact?: string;
    offset?: string;
  }>;
}

interface AthletesQuery {
  q: string | null;
  sexe: "M" | "F" | null;
  club: string | null;
  /** Club au nom exact (lien d'un club de la recherche), sinon le club contient les mots. */
  clubExact: boolean;
  offset: number;
}

function parseQuery(params: Awaited<PageProps["searchParams"]>): AthletesQuery {
  const offset = Number(params.offset);
  const q = params.q?.trim() ?? "";
  const club = params.club?.trim() ?? "";
  return {
    // L'API exige au moins 2 caractères pour filtrer par nom ou par club.
    q: q.length >= 2 ? q : null,
    sexe: params.sexe === "M" || params.sexe === "F" ? params.sexe : null,
    club: club.length >= 2 ? club : null,
    clubExact: club.length >= 2 && params.club_exact === "1",
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

function buildAthletesUrl(query: AthletesQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sexe) params.set("sexe", query.sexe);
  if (query.club) params.set("club", query.club);
  if (query.club && query.clubExact) params.set("club_exact", "1");
  if (query.offset > 0) params.set("offset", String(query.offset));
  const search = params.toString();
  return `/athletes${search ? `?${search}` : ""}`;
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const query = parseQuery(await searchParams);

  let data;
  try {
    data = await listAthletes({ ...query, limit: PAGE_SIZE });
  } catch (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">Impossible de charger les athlètes</h1>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  const { items, pagination } = data;
  const hasFilters = query.q !== null || query.sexe !== null || query.club !== null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">Explorer</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Athlètes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {pagination.total.toLocaleString("fr-FR")} athlète{pagination.total > 1 && "s"}, les
          plus actifs d’abord.
        </p>
      </section>

      <FilterForm action="/athletes" resetHref={hasFilters ? "/athletes" : undefined}>
        <FilterField label="Nom" htmlFor="filtre-nom">
          <SuggestInput
            key={query.q ?? ""}
            id="filtre-nom"
            type="athletes"
            filters={{ s: query.sexe }}
            defaultValue={query.q ?? ""}
            placeholder="2 caractères min."
            className="sm:w-72"
            inputClassName={`${FILTER_FIELD_CLASS} w-full`}
            panelClassName="left-0 w-full sm:w-96"
          />
        </FilterField>

        <FilterField label="Club" htmlFor="filtre-club">
          <ClubInput
            key={`${query.club ?? ""}|${query.clubExact}`}
            id="filtre-club"
            defaultValue={query.club ?? ""}
            exact={query.clubExact}
            otherFilters={{ q: query.q, sexe: query.sexe }}
            inputClassName={FILTER_FIELD_CLASS}
          />
        </FilterField>

        <FilterField label="Sexe">
          <select name="sexe" defaultValue={query.sexe ?? ""} className={FILTER_FIELD_CLASS}>
            <option value="">Tous</option>
            <option value="M">Hommes</option>
            <option value="F">Femmes</option>
          </select>
        </FilterField>
      </FilterForm>

      {items.length > 0 ? (
        <div className="space-y-4">
          <AthleteHitList athletes={items} />
          <PaginationBar
            pagination={pagination}
            shownCount={items.length}
            previousHref={buildAthletesUrl({
              ...query,
              offset: Math.max(query.offset - PAGE_SIZE, 0),
            })}
            nextHref={buildAthletesUrl({ ...query, offset: query.offset + PAGE_SIZE })}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
          Aucun athlète ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
