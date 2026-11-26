import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AthleteBestTimes } from "@/components/athletes/athlete-best-times";
import { AthleteProgressionBlock } from "@/components/athletes/athlete-progression";
import { AthleteHeader } from "@/components/athletes/athlete-header";
import { ReportErrorButton } from "@/components/feedback/feedback-button";
import { AthleteResultsFilters } from "@/components/athletes/athlete-results-filters";
import { AthleteResultsTable } from "@/components/athletes/athlete-results-table";
import { AthleteStats } from "@/components/athletes/athlete-stats";
import {
  ATHLETE_TAB_PARAM,
  AthleteTabs,
  parseAthleteTab,
  type AthleteTab,
} from "@/components/athletes/athlete-tabs";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ApiError, getAthlete, getAthleteProgression, getAthleteResults } from "@/lib/api";
import {
  buildAthleteUrl,
  parseAthleteResultsQuery,
  type AthleteResultsSearchParams,
} from "@/lib/athlete-results-query";
import { athleteMetadata } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirections";

interface PageProps {
  params: Promise<{ id: string }>;
  // + onglet affiché (?vue=records, ?vue=progression)
  searchParams: Promise<AthleteResultsSearchParams & { [ATHLETE_TAB_PARAM]?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    return athleteMetadata(await getAthlete(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("athletes", id);
    }
    return {}; // erreur d'API : la page affiche elle-même le message
  }
}

export default async function AthletePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  const query = parseAthleteResultsQuery(urlParams);
  const tab = parseAthleteTab(urlParams[ATHLETE_TAB_PARAM]);

  let data;

  try {
    // Seules les données de l'onglet affiché sont chargées.
    const [athlete, results, progression] = await Promise.all([
      getAthlete(id),
      tab === "resultats" ? getAthleteResults(id, query) : null,
      // La progression est un plus : son échec n'empêche pas d'afficher le profil.
      tab === "progression" ? getAthleteProgression(id).catch(() => null) : null,
    ]);
    data = { athlete, results, progression };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("athletes", id);
    }

    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">Impossible de charger le profil</h1>
        <p className="mt-2 text-sm text-gray-500">
          Vérifie que ton API FastAPI est démarrée et que son adresse est correctement configurée.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  const { athlete, results, progression } = data;
  // L'onglet Résultats garde les filtres, le tri et la page de l'historique.
  const tabHrefs: Record<AthleteTab, string> = {
    resultats: buildAthleteUrl(id, query),
    records: `/athletes/${id}?${ATHLETE_TAB_PARAM}=records`,
    progression: `/athletes/${id}?${ATHLETE_TAB_PARAM}=progression`,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
        >
          <ArrowLeft size={16} />
          Retour à l’accueil
        </Link>
        <ReportErrorButton context={`Athlète ${id} — ${athlete.nom ?? "sans nom"}`} />
      </div>

      <AthleteHeader athlete={athlete} />
      <AthleteStats athlete={athlete} />

      <div className="space-y-6">
        <AthleteTabs
          active={tab}
          hrefs={tabHrefs}
          counts={{ resultats: athlete.nb_races, records: athlete.best_times.length }}
        />

        {results && (
          <section className="space-y-4" aria-label="Historique des résultats">
            <AthleteResultsFilters athlete={athlete} query={query} />

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <AthleteResultsTable athleteId={id} query={query} results={results.items} />
              <PaginationBar
                pagination={results.pagination}
                shownCount={results.items.length}
                previousHref={buildAthleteUrl(id, query, {
                  offset: Math.max(query.offset - query.limit, 0),
                })}
                nextHref={buildAthleteUrl(id, query, { offset: query.offset + query.limit })}
              />
            </div>
          </section>
        )}

        {tab === "records" &&
          (athlete.best_times.length > 0 ? (
            <AthleteBestTimes bestTimes={athlete.best_times} />
          ) : (
            <EmptyTab>Aucun temps total publié pour cet athlète.</EmptyTab>
          ))}

        {tab === "progression" &&
          (progression && progression.series.length > 0 ? (
            <AthleteProgressionBlock progression={progression} />
          ) : (
            <EmptyTab>
              La progression apparaît dès que l’athlète a couru au moins deux fois le même format
              (par exemple deux triathlons M) avec un temps publié.
            </EmptyTab>
          ))}
      </div>
    </div>
  );
}

function EmptyTab({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
      {children}
    </p>
  );
}
