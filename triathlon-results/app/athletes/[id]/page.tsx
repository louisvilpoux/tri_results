import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AthleteBestTimes } from "@/components/athletes/athlete-best-times";
import { AthleteProgressionBlock } from "@/components/athletes/athlete-progression";
import { AthleteHeader } from "@/components/athletes/athlete-header";
import { AthleteResultsFilters } from "@/components/athletes/athlete-results-filters";
import { AthleteResultsTable } from "@/components/athletes/athlete-results-table";
import { AthleteStats } from "@/components/athletes/athlete-stats";
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
  searchParams: Promise<AthleteResultsSearchParams>;
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
  const query = parseAthleteResultsQuery(await searchParams);

  let data;

  try {
    const [athlete, results, progression] = await Promise.all([
      getAthlete(id),
      getAthleteResults(id, query),
      // La progression est un plus : son échec n'empêche pas d'afficher le profil.
      getAthleteProgression(id).catch(() => null),
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
  const { items, pagination } = results;

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
      >
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <AthleteHeader athlete={athlete} />
      <AthleteStats athlete={athlete} />

      {/* Historique avant les analyses : c'est ce que l'on vient chercher sur un profil. */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Historique des résultats</h2>

        <AthleteResultsFilters athlete={athlete} query={query} />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <AthleteResultsTable athleteId={id} query={query} results={items} />
          <PaginationBar
            pagination={pagination}
            shownCount={items.length}
            previousHref={buildAthleteUrl(id, query, {
              offset: Math.max(query.offset - query.limit, 0),
            })}
            nextHref={buildAthleteUrl(id, query, { offset: query.offset + query.limit })}
          />
        </div>
      </section>

      <AthleteBestTimes bestTimes={athlete.best_times} />

      {progression && progression.series.length > 0 && (
        <AthleteProgressionBlock progression={progression} />
      )}
    </div>
  );
}
