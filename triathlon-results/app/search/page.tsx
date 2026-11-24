import type { Metadata } from "next";
import Link from "next/link";

import { AthleteHitList } from "@/components/search/athlete-hit-list";
import { ClubHitList } from "@/components/search/club-hit-list";
import { RaceHitList } from "@/components/search/race-hit-list";
import { SearchForm } from "@/components/search/search-form";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { searchSite } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SearchResponse, SearchType } from "@/types/search";

const PREVIEW_SIZE = 6; // résultats par groupe dans l'onglet « Tout »
const PAGE_SIZE = 20; // résultats par page dans les onglets « Athlètes », « Clubs » et « Courses »

interface SearchParams {
  q?: string;
  type?: string;
  offset?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

function parseQuery(params: SearchParams) {
  const offset = Number(params.offset);
  return {
    q: (params.q ?? "").trim(),
    type: (params.type === "athletes" || params.type === "races" || params.type === "clubs"
      ? params.type
      : "all") as SearchType,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

function buildSearchUrl(q: string, type: SearchType, offset = 0): string {
  const params = new URLSearchParams({ q });
  if (type !== "all") params.set("type", type);
  if (offset > 0) params.set("offset", String(offset));
  return `/search?${params.toString()}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = parseQuery(await searchParams);
  return {
    title: q ? `Recherche « ${q} »` : "Recherche",
    // Les pages de résultats de recherche n'ont pas vocation à être indexées.
    robots: { index: false, follow: true },
  };
}

function Tab({ href, label, count, active }: { href: string; label: string; count?: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b-2 px-1 pb-3 text-sm font-bold transition-colors",
        active
          ? "border-[#FC6B32] text-[#17202E]"
          : "border-transparent text-gray-500 hover:text-[#FC6B32]"
      )}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 tabular-nums text-gray-400">{count}</span>}
    </Link>
  );
}

function GroupHeader({ title, total, moreHref }: { title: string; total: number; moreHref?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-xl font-extrabold tracking-tight">
        {title} <span className="tabular-nums text-gray-400">{total}</span>
      </h2>
      {moreHref && (
        <Link href={moreHref} className="text-sm font-bold text-[#FC6B32] hover:underline">
          Tout voir
        </Link>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
      {children}
    </p>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, type, offset } = parseQuery(await searchParams);

  const header = (
    <section className="space-y-4">
      <h1 className="text-3xl font-black tracking-tight">Recherche</h1>
      <SearchForm key={q} variant="page" defaultValue={q} autoFocus={!q} />
    </section>
  );

  if (q.length < 2) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState>Saisis au moins 2 caractères : nom d’un athlète, d’un club ou d’une course.</EmptyState>
      </div>
    );
  }

  let overview: SearchResponse;
  let page: SearchResponse;

  try {
    // L'aperçu donne les compteurs des onglets ; un onglet précis charge en plus sa page.
    [overview, page] = await Promise.all([
      searchSite(q, "all", PREVIEW_SIZE, 0),
      type === "all" ? Promise.resolve(null) : searchSite(q, type, PAGE_SIZE, offset),
    ]).then(([all, typed]) => [all, typed ?? all]);
  } catch (error) {
    return (
      <div className="space-y-8">
        {header}
        <div className="rounded-xl border border-red-200 bg-white p-8">
          <p className="text-xl font-bold text-red-600">Impossible de lancer la recherche</p>
          <p className="mt-3 text-xs text-gray-400">
            {error instanceof Error ? error.message : "Erreur inconnue"}
          </p>
        </div>
      </div>
    );
  }

  const athleteTotal = overview.athletes?.total ?? 0;
  const raceTotal = overview.races?.total ?? 0;
  const clubTotal = overview.clubs?.total ?? 0;
  const clubs = page.clubs;
  const athletes = page.athletes;
  const races = page.races;

  return (
    <div className="space-y-8">
      {header}

      <nav aria-label="Type de résultats" className="flex gap-6 border-b border-gray-200">
        <Tab href={buildSearchUrl(q, "all")} label="Tout" active={type === "all"} />
        <Tab
          href={buildSearchUrl(q, "athletes")}
          label="Athlètes"
          count={athleteTotal}
          active={type === "athletes"}
        />
        <Tab
          href={buildSearchUrl(q, "clubs")}
          label="Clubs"
          count={clubTotal}
          active={type === "clubs"}
        />
        <Tab
          href={buildSearchUrl(q, "races")}
          label="Courses"
          count={raceTotal}
          active={type === "races"}
        />
      </nav>

      {athleteTotal + raceTotal + clubTotal === 0 && (
        <EmptyState>Aucun athlète, aucun club ni aucune course ne correspond à « {q} ».</EmptyState>
      )}

      {athletes && athletes.total > 0 && (
        <section className="space-y-4">
          <GroupHeader
            title="Athlètes"
            total={athletes.total}
            moreHref={
              type === "all" && athletes.total > PREVIEW_SIZE
                ? buildSearchUrl(q, "athletes")
                : undefined
            }
          />
          <AthleteHitList athletes={athletes.items} />
          {type === "athletes" && (
            <PaginationBar
              pagination={{
                total: athletes.total,
                limit: PAGE_SIZE,
                offset,
                has_next: offset + PAGE_SIZE < athletes.total,
              }}
              shownCount={athletes.items.length}
              previousHref={buildSearchUrl(q, "athletes", Math.max(offset - PAGE_SIZE, 0))}
              nextHref={buildSearchUrl(q, "athletes", offset + PAGE_SIZE)}
            />
          )}
        </section>
      )}

      {clubs && clubs.total > 0 && (
        <section className="space-y-4">
          <GroupHeader
            title="Clubs"
            total={clubs.total}
            moreHref={
              type === "all" && clubs.total > PREVIEW_SIZE ? buildSearchUrl(q, "clubs") : undefined
            }
          />
          <ClubHitList clubs={clubs.items} />
          {type === "clubs" && (
            <PaginationBar
              pagination={{
                total: clubs.total,
                limit: PAGE_SIZE,
                offset,
                has_next: offset + PAGE_SIZE < clubs.total,
              }}
              shownCount={clubs.items.length}
              previousHref={buildSearchUrl(q, "clubs", Math.max(offset - PAGE_SIZE, 0))}
              nextHref={buildSearchUrl(q, "clubs", offset + PAGE_SIZE)}
            />
          )}
        </section>
      )}

      {races && races.total > 0 && (
        <section className="space-y-4">
          <GroupHeader
            title="Courses"
            total={races.total}
            moreHref={
              type === "all" && races.total > PREVIEW_SIZE ? buildSearchUrl(q, "races") : undefined
            }
          />
          <RaceHitList races={races.items} />
          {type === "races" && (
            <PaginationBar
              pagination={{
                total: races.total,
                limit: PAGE_SIZE,
                offset,
                has_next: offset + PAGE_SIZE < races.total,
              }}
              shownCount={races.items.length}
              previousHref={buildSearchUrl(q, "races", Math.max(offset - PAGE_SIZE, 0))}
              nextHref={buildSearchUrl(q, "races", offset + PAGE_SIZE)}
            />
          )}
        </section>
      )}
    </div>
  );
}
