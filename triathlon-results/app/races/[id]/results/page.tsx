import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Trophy,
} from "lucide-react";

import { getRaceResults } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    limit?: string;
    offset?: string;
    sort_by?: string;
    order?: string;
  }>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function getRank(result: {
  clt: string | null;
  rang_global: string | null;
}) {
  return result.clt ?? result.rang_global ?? "—";
}

function buildUrl(
  raceId: string,
  limit: number,
  offset: number,
  sortBy: string,
  order: string
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort_by: sortBy,
    order,
  });

  return `/races/${raceId}/results?${params.toString()}`;
}

export default async function RaceResultsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const limit = Math.min(
    Math.max(Number(query.limit) || 20, 1),
    100
  );

  const offset = Math.max(Number(query.offset) || 0, 0);
  const sortBy = query.sort_by || "clt";
  const order = query.order === "desc" ? "desc" : "asc";

  let data;

  try {
    data = await getRaceResults(id, {
      limit,
      offset,
      sort_by: sortBy,
      order,
    });
  } catch (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">
          Impossible de charger les résultats
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Vérifie que ton API FastAPI est démarrée et que son adresse
          est correctement configurée.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  const results = data.items;
  const pagination = data.pagination;

  const firstResult = results[0];

  const raceName = firstResult?.name_epreuve ?? "Résultats de la course";
  const raceFormat = firstResult?.format_epreuve ?? "";
  const raceDate = firstResult?.date_epreuve;

  const totalPages = Math.ceil(pagination.total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const previousOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;

  const columns = [
    { label: "Natation", value: "swim_time" },
    { label: "Vélo", value: "bike_time" },
    { label: "Course", value: "run_time" },
    { label: "Temps total", value: "total_time" },
  ];

  return (
    <div className="space-y-8">

      {/* Retour */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
      >
        <ArrowLeft size={16} />
        Retour à l'accueil
      </Link>

      {/* En-tête de course */}
      <section className="rounded-2xl bg-[#17202E] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
              Classement officiel
            </p>

            <h1 className="mt-3 text-3xl font-black capitalize sm:text-4xl">
              {raceName}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-sm text-gray-300">
              {raceDate && (
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatDate(raceDate)}
                </span>
              )}

              {raceFormat && (
                <span className="flex items-center gap-2">
                  <Trophy size={16} />
                  Format {raceFormat}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-5 sm:min-w-40">
            <p className="text-xs font-medium text-gray-300">
              Participants
            </p>
            <p className="mt-1 text-3xl font-black">
              {pagination.total}
            </p>
          </div>
        </div>
      </section>

      {/* Informations du classement */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Classement général
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {pagination.total} participants
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Page {currentPage} sur {Math.max(totalPages, 1)}
        </div>
      </section>

      {/* Tableau */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-4">Clt.</th>
                <th className="px-5 py-4">Athlète</th>
                <th className="px-4 py-4">Catégorie</th>
                <th className="px-4 py-4">Sexe</th>

                {columns.map((column) => (
                  <th key={column.value} className="px-4 py-4 text-right">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {results.map((result) => (
                <tr
                  key={result.id}
                  className="transition-colors hover:bg-orange-50/40"
                >
                  <td className="px-5 py-4 font-bold text-[#FC6B32]">
                    {getRank(result)}
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href={`/athletes/${result.athlete_id}`}
                      className="font-semibold text-[#17202E] hover:text-[#FC6B32]"
                    >
                      {result.nom_athlete}
                    </Link>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                      {result.categorie ?? result.cat ?? "—"}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-gray-500">
                    {result.sexe ?? "—"}
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-gray-600">
                    {result.swim_time ?? "—"}
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-gray-600">
                    {result.bike_time ?? "—"}
                  </td>

                  <td className="px-4 py-4 text-right font-mono text-gray-600">
                    {result.run_time ?? "—"}
                  </td>

                  <td className="px-4 py-4 text-right font-mono font-bold text-[#17202E]">
                    {result.total_time ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {results.length === 0 && (
            <div className="p-12 text-center text-sm text-gray-500">
              Aucun résultat trouvé.
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">

          <p className="text-sm text-gray-500">
            Affichage de {pagination.total === 0 ? 0 : offset + 1}
            {" à "}
            {Math.min(offset + results.length, pagination.total)}
            {" sur "}
            {pagination.total} résultats
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={buildUrl(id, limit, previousOffset, sortBy, order)}
              aria-disabled={offset === 0}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                offset === 0
                  ? "pointer-events-none border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-700 hover:border-[#FC6B32] hover:text-[#FC6B32]"
              }`}
            >
              Précédent
            </Link>

            <span className="px-2 text-sm font-semibold text-gray-600">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>

            <Link
              href={buildUrl(id, limit, nextOffset, sortBy, order)}
              aria-disabled={!pagination.has_next}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                !pagination.has_next
                  ? "pointer-events-none border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-700 hover:border-[#FC6B32] hover:text-[#FC6B32]"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}