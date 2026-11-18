import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Trophy } from "lucide-react";

import { ResultsFilters } from "@/components/results/results-filters";
import { ResultsPagination } from "@/components/results/results-pagination";
import { ResultsTable } from "@/components/results/results-table";
import { ApiError, getRace, getRaceCategories, getRaceResults } from "@/lib/api";
import {
  hasActiveFilters,
  parseRaceResultsQuery,
  type RaceResultsSearchParams,
} from "@/lib/results-query";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<RaceResultsSearchParams>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default async function RaceResultsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = parseRaceResultsQuery(await searchParams);

  let data;

  try {
    const [race, categories, results] = await Promise.all([
      getRace(id),
      getRaceCategories(id),
      getRaceResults(id, query),
    ]);
    data = { race, categories, results };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">Impossible de charger les résultats</h1>
        <p className="mt-2 text-sm text-gray-500">
          Vérifie que ton API FastAPI est démarrée et que son adresse est correctement configurée.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  const { race, categories, results } = data;
  const { items, pagination } = results;
  const filtered = hasActiveFilters(query);

  return (
    <div className="space-y-8">
      {/* Retour */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
      >
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      {/* En-tête de course */}
      <section className="rounded-2xl bg-[#17202E] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
              Classement officiel
            </p>

            <h1 className="mt-3 text-3xl font-black capitalize sm:text-4xl">
              {race.name_epreuve ?? "Résultats de la course"}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-sm text-gray-300">
              {race.date_epreuve && (
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDate(race.date_epreuve)}
                </span>
              )}

              {race.format_epreuve && (
                <span className="flex items-center gap-2">
                  <Trophy size={16} />
                  Format {race.format_epreuve}
                </span>
              )}

              {race.lieu_epreuve && (
                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  {race.lieu_epreuve}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-5 sm:min-w-40">
            <p className="text-xs font-medium text-gray-300">
              {filtered ? "Résultats filtrés" : "Participants"}
            </p>
            <p className="mt-1 text-3xl font-black">{pagination.total}</p>
          </div>
        </div>
      </section>

      {/* Classement */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Classement général</h2>

        <ResultsFilters raceId={id} query={query} categories={categories} />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ResultsTable raceId={id} query={query} results={items} />
          <ResultsPagination
            raceId={id}
            query={query}
            pagination={pagination}
            shownCount={items.length}
          />
        </div>
      </section>
    </div>
  );
}
