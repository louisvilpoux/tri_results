import Link from "next/link";

import { SortableHeader, nextSortOrder } from "@/components/shared/sortable-header";
import { TotalTime } from "@/components/shared/total-time";
import { formatRank } from "@/lib/format";
import { buildRaceResultsUrl } from "@/lib/results-query";
import type { RaceResult, RaceResultSortBy, RaceResultsQuery } from "@/types/result";

type TimeColumn = Extract<RaceResultSortBy, `${string}_time`>;

const TIME_COLUMNS: { label: string; value: TimeColumn }[] = [
  { label: "Natation", value: "swim_time" },
  { label: "T1", value: "t1_time" },
  { label: "Vélo", value: "bike_time" },
  { label: "T2", value: "t2_time" },
  { label: "Course", value: "run_time" },
  { label: "Total", value: "total_time" },
];

/**
 * En duathlon (et cross duathlon), la colonne natation contient la première course à pied et la
 * colonne course la seconde : elles s'appellent Course 1 et Course 2, comme dans les repères.
 */
const DUATHLON_LABELS: Partial<Record<TimeColumn, string>> = {
  swim_time: "Course 1",
  run_time: "Course 2",
};

/** Sur mobile, seuls le rang, l'athlète et le temps total sont affichés. */
const DESKTOP_ONLY = "hidden md:table-cell";
const CELL = "px-3 py-4 sm:px-4";

interface ResultsTableProps {
  raceId: string;
  query: RaceResultsQuery;
  results: RaceResult[];
  /** false : seul le temps total est affiché (aquathlon, bike&run, swimrun). */
  showSplits: boolean;
  /** Discipline de l'épreuve (« duathlon »…), pour le nom des colonnes de segments. */
  discipline?: string | null;
  /**
   * Épreuve sans temps total publié : ni classement ni temps total, segments non triables
   * (participants par ordre alphabétique, voir races_without_time dans api/main.py).
   */
  sansTemps?: boolean;
}

export function ResultsTable({
  raceId,
  query,
  results,
  showSplits,
  discipline,
  sansTemps = false,
}: ResultsTableProps) {
  const isDuathlon = (discipline ?? "").includes("duathlon");
  const timeColumns = (
    showSplits ? TIME_COLUMNS : TIME_COLUMNS.filter((column) => column.value === "total_time")
  )
    .filter((column) => !(sansTemps && column.value === "total_time"))
    .map((column) => ({
      ...column,
      label: (isDuathlon && DUATHLON_LABELS[column.value]) || column.label,
    }));

  function sortHeader(
    column: RaceResultSortBy,
    label: string,
    align?: "left" | "right",
    className?: string
  ) {
    const isActive = query.sortBy === column;
    const href = buildRaceResultsUrl(raceId, query, {
      sortBy: column,
      order: nextSortOrder(isActive, query.order),
      offset: 0,
    });

    return (
      <SortableHeader
        key={column}
        label={label}
        href={href}
        isActive={isActive}
        order={query.order}
        align={align}
        className={className}
      />
    );
  }

  // Bike&run, relais : chaque ligne du classement est une équipe.
  const isTeamRace = results.length > 0 && results.every((result) => result.equipe);

  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${showSplits ? "md:min-w-[1000px]" : ""}`}>
        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500">
          <tr>
            {!sansTemps && sortHeader("clt", "Clt.")}
            {sortHeader("nom_athlete", isTeamRace ? "Équipe" : "Athlète")}
            <th scope="col" className={`${CELL} uppercase ${DESKTOP_ONLY}`}>Catégorie</th>
            <th scope="col" className={`${CELL} uppercase ${DESKTOP_ONLY}`}>Sexe</th>
            {timeColumns.map((column) =>
              sansTemps ? (
                // Pas de tri par temps : sans temps total, un tri par segment ressemblerait à un
                // classement que la source n'a pas publié.
                <th
                  key={column.value}
                  scope="col"
                  className={`${CELL} text-right uppercase ${DESKTOP_ONLY}`}
                >
                  {column.label}
                </th>
              ) : (
                sortHeader(
                  column.value,
                  column.label,
                  "right",
                  column.value === "total_time" ? undefined : DESKTOP_ONLY
                )
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {results.map((result) => (
            <tr key={result.id} className="transition-colors hover:bg-orange-50/40">
              {!sansTemps && (
                <td className={`${CELL} whitespace-nowrap font-bold text-[#FC6B32]`}>
                  {formatRank(result.clt, result.rang_global)}
                </td>
              )}

              <td className={CELL}>
                {result.equipe ? (
                  // Une équipe n'a pas de profil d'athlète.
                  <span className="font-semibold text-[#17202E]">{result.nom_athlete}</span>
                ) : (
                  <Link
                    href={`/athletes/${result.athlete_id}`}
                    className="font-semibold text-[#17202E] hover:text-[#FC6B32]"
                  >
                    {result.nom_athlete}
                  </Link>
                )}
              </td>

              <td className={`${CELL} ${DESKTOP_ONLY}`}>
                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                  {result.categorie ?? result.cat ?? "—"}
                </span>
              </td>

              <td className={`${CELL} text-gray-500 ${DESKTOP_ONLY}`}>{result.sexe ?? "—"}</td>

              {timeColumns.map((column) => (
                <td
                  key={column.value}
                  className={
                    column.value === "total_time"
                      ? `${CELL} text-right font-mono font-bold text-[#17202E]`
                      : `${CELL} text-right font-mono text-gray-600 ${DESKTOP_ONLY}`
                  }
                >
                  {column.value === "total_time" ? (
                    <TotalTime time={result.total_time} suspect={result.temps_suspect} />
                  ) : (
                    (result[column.value] ?? "—")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {results.length === 0 && (
        <div className="p-12 text-center text-sm text-gray-500">Aucun résultat trouvé.</div>
      )}
    </div>
  );
}
