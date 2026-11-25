"use client";

import Link from "next/link";
import { Fragment, useEffect } from "react";

import { locateMe } from "@/components/results/my-place";
import {
  MY_ROW_ID,
  formatClock,
  useMySimulation,
  type MySimulation,
} from "@/components/results/my-simulation";
import { CategoryCell } from "@/components/shared/category-cell";
import { SortableHeader, nextSortOrder } from "@/components/shared/sortable-header";
import { TotalTime } from "@/components/shared/total-time";
import { categoryLabel, categoryShort } from "@/lib/categories";
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

/** Clés des temps de « Et moi ? » pour chaque colonne (duathlon : run1 et run2). */
const SIMULATOR_KEYS_BY_COLUMN: Record<TimeColumn, string[]> = {
  swim_time: ["swim", "run1"],
  t1_time: ["t1"],
  bike_time: ["bike"],
  t2_time: ["t2"],
  run_time: ["run", "run2"],
  total_time: ["total"],
};

/** Sur mobile, seuls le rang, l'athlète et le temps total sont affichés. */
const DESKTOP_ONLY = "hidden md:table-cell";
const CELL = "px-3 py-4 sm:px-4";

interface ResultsTableProps {
  raceId: string;
  query: RaceResultsQuery;
  results: RaceResult[];
  /** Une page suivante existe : sert à savoir si la ligne « Toi » est plus loin. */
  hasNext: boolean;
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
  hasNext,
  showSplits,
  discipline,
  sansTemps = false,
}: ResultsTableProps) {
  // Ligne « Toi » : temps saisi dans « Et moi ? », inséré à sa place dans le classement.
  const { mine, scrollToMe, setScrollToMe } = useMySimulation();
  const myIndex = locateMe(mine, query, results, hasNext, sansTemps);
  const showMine = mine !== null && typeof myIndex === "number";

  // Arrivée par « Aller à ma place » : défilement jusqu'à la ligne dès qu'elle est affichée.
  useEffect(() => {
    if (!showMine || !scrollToMe) return;
    document.getElementById(MY_ROW_ID)?.scrollIntoView({ block: "center" });
    setScrollToMe(false);
  }, [showMine, scrollToMe, setScrollToMe]);

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
          {results.map((result, index) => (
            <Fragment key={result.id}>
              {showMine && myIndex === index && (
                <MyRow mine={mine} timeColumns={timeColumns} sansTemps={sansTemps} />
              )}
              <tr className="transition-colors hover:bg-orange-50/40">
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
                    <CategoryCell fftri={result.categorie_fftri} source={result.categorie} />
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
            </Fragment>
          ))}
          {showMine && myIndex === results.length && (
            <MyRow mine={mine} timeColumns={timeColumns} sansTemps={sansTemps} />
          )}
        </tbody>
      </table>

      {results.length === 0 && (
        <div className="p-12 text-center text-sm text-gray-500">Aucun résultat trouvé.</div>
      )}
    </div>
  );
}

/** Ligne « Toi » : mêmes colonnes que le classement, avec les temps saisis dans « Et moi ? ». */
function MyRow({
  mine,
  timeColumns,
  sansTemps,
}: {
  mine: MySimulation;
  timeColumns: { label: string; value: TimeColumn }[];
  sansTemps: boolean;
}) {
  return (
    <tr id={MY_ROW_ID} className="scroll-mt-24 bg-[#17202E] text-white">
      {!sansTemps && (
        <td
          className={`${CELL} whitespace-nowrap font-bold text-[#FC6B32]`}
          title="Place estimée à partir de ton temps total"
        >
          {mine.place ?? "—"}
        </td>
      )}
      <td className={CELL}>
        <span className="font-bold">Toi</span>
        <span className="ml-2 text-xs text-gray-400">temps saisi dans « Et moi ? »</span>
      </td>
      <td className={`${CELL} ${DESKTOP_ONLY}`}>
        {mine.categorie ? (
          <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold">
            <span title={categoryLabel(mine.categorie)}>{categoryShort(mine.categorie)}</span>
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className={`${CELL} text-gray-300 ${DESKTOP_ONLY}`}>{mine.sexe || "—"}</td>
      {timeColumns.map((column) => {
        const key = SIMULATOR_KEYS_BY_COLUMN[column.value].find((item) => item in mine.times);
        const time = key === undefined ? "—" : formatClock(mine.times[key]);
        return (
          <td
            key={column.value}
            className={
              column.value === "total_time"
                ? `${CELL} text-right font-mono font-bold`
                : `${CELL} text-right font-mono text-gray-300 ${DESKTOP_ONLY}`
            }
          >
            {time}
          </td>
        );
      })}
    </tr>
  );
}
