import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Info, MapPin, TriangleAlert, Trophy } from "lucide-react";

import { MyPlaceBanner } from "@/components/results/my-place";
import { MySimulationProvider } from "@/components/results/my-simulation";
import { RaceInsights } from "@/components/results/race-insights";
import { ResultsFilters } from "@/components/results/results-filters";
import { ResultsTable } from "@/components/results/results-table";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ApiError, getRace, getRaceCategories, getRaceResults, getRaceStats } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  SIMULATOR_CATEGORIE_PARAM,
  SIMULATOR_KEYS,
  SIMULATOR_PARAM_PREFIX,
  SIMULATOR_SEXE_PARAM,
} from "@/lib/simulator";
import { raceResultsMetadata } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirections";
import { DISCIPLINES_WITHOUT_SPLITS } from "@/types/result";
import {
  buildRaceResultsUrl,
  hasActiveFilters,
  parseRaceResultsQuery,
  type RaceResultsSearchParams,
} from "@/lib/results-query";

interface PageProps {
  params: Promise<{ id: string }>;
  // + temps saisis dans le simulateur « Et moi ? » (moi_swim, moi_total…)
  searchParams: Promise<RaceResultsSearchParams & Partial<Record<string, string>>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    return raceResultsMetadata(await getRace(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("races", id, "/results");
    }
    return {}; // erreur d'API : la page affiche elle-même le message
  }
}

export default async function RaceResultsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  const query = parseRaceResultsQuery(urlParams);
  // temps saisis dans le simulateur, lus clé par clé (l'objet des paramètres ne s'énumère pas)
  const simulatorTimes: Record<string, string> = {};
  for (const key of SIMULATOR_KEYS) {
    const value = urlParams[`${SIMULATOR_PARAM_PREFIX}${key}`];
    if (typeof value === "string" && value.trim()) simulatorTimes[key] = value;
  }
  // sexe et catégorie choisis dans le simulateur (moi_sexe, moi_categorie)
  const sexeParam = urlParams[SIMULATOR_SEXE_PARAM];
  const simulatorSexe = sexeParam === "M" || sexeParam === "F" ? sexeParam : "";
  const categorieParam = urlParams[SIMULATOR_CATEGORIE_PARAM];
  const simulatorCategorie = typeof categorieParam === "string" ? categorieParam.trim() : "";

  let data;

  try {
    const [race, categories, results, stats] = await Promise.all([
      getRace(id),
      getRaceCategories(id),
      getRaceResults(id, query),
      // Les repères sont un plus : leur échec n'empêche pas d'afficher le classement.
      getRaceStats(id).catch(() => null),
    ]);
    data = { race, categories, results, stats };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("races", id, "/results");
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

  const { race, categories, results, stats } = data;
  const { items, pagination } = results;
  const filtered = hasActiveFilters(query);
  // Aucun temps total publié par la source : la page liste les participants, sans classement.
  const sansTemps = race.sans_temps;

  return (
    <div className="space-y-8">
      {/* Retour à la course (tous ses formats) */}
      <Link
        href={`/races/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
      >
        <ArrowLeft size={16} />
        Retour à la course
      </Link>

      {/* En-tête de course */}
      <section className="rounded-2xl bg-[#17202E] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
              {sansTemps ? "Participants" : "Classement officiel"}
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
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

      {/* « Et moi ? », Repères et classement partagent la simulation (ligne « Toi ») */}
      <MySimulationProvider>
        {stats && stats.segments.length > 0 && (
          <RaceInsights
            stats={stats}
            raceId={id}
            initialTimes={simulatorTimes}
            initialSexe={simulatorSexe}
            initialCategorie={simulatorCategorie}
          />
        )}

        {/* Classement */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold tracking-tight">
            {sansTemps ? "Participants" : "Classement général"}
          </h2>

          {sansTemps && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
              Temps et classement non publiés par la source : les participants sont listés par ordre
              alphabétique.
            </p>
          )}

          {race.temps_suspects > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0" />
              {race.temps_non_fiables
                ? "La source ne publie pas de temps total fiable pour cette épreuve (temps de tour " +
                  "ou temps intermédiaire à la place du total) : temps et classement sont donnés " +
                  "tels quels, sans repères."
                : "Certains temps de cette épreuve semblent erronés dans la source. Ils sont " +
                  "signalés dans le classement."}
            </p>
          )}

          {race.classement_hors_ordre && !race.temps_non_fiables && (
            <p className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-gray-400" />
              Le classement publié par la source ne suit pas l&apos;ordre des temps totaux (départs
              par vagues, temps officiel ou pénalités) : un athlète peut être classé devant un autre
              plus rapide. Le classement de la source est gardé ; trier par temps total donne
              l&apos;ordre des temps.
            </p>
          )}

          <MyPlaceBanner
            query={query}
            results={items}
            hasNext={pagination.has_next}
            sansTemps={sansTemps}
            filtered={filtered}
          />

          <ResultsFilters raceId={id} query={query} categories={categories} />

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <ResultsTable
              raceId={id}
              query={query}
              results={items}
              hasNext={pagination.has_next}
              // Colonnes natation / T1 / vélo / T2 / course seulement quand la discipline s'y prête
              // et que la source a publié au moins un temps intermédiaire.
              showSplits={
                race.avec_segments && !DISCIPLINES_WITHOUT_SPLITS.includes(race.type_epreuve ?? "")
              }
              discipline={race.type_epreuve}
              sansTemps={sansTemps}
            />
            <PaginationBar
              pagination={pagination}
              shownCount={items.length}
              previousHref={buildRaceResultsUrl(id, query, {
                offset: Math.max(query.offset - query.limit, 0),
              })}
              nextHref={buildRaceResultsUrl(id, query, { offset: query.offset + query.limit })}
            />
          </div>
        </section>
      </MySimulationProvider>
    </div>
  );
}
