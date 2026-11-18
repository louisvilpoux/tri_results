import Link from "next/link";

import { SortableHeader } from "@/components/results/sortable-header";
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

function getRank(result: Pick<RaceResult, "clt" | "rang_global">) {
  return result.clt ?? result.rang_global ?? "—";
}

interface ResultsTableProps {
  raceId: string;
  query: RaceResultsQuery;
  results: RaceResult[];
}

export function ResultsTable({ raceId, query, results }: ResultsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500">
          <tr>
            <SortableHeader raceId={raceId} query={query} column="clt" label="Clt." />
            <SortableHeader raceId={raceId} query={query} column="nom_athlete" label="Athlète" />
            <th scope="col" className="px-4 py-4 uppercase">Catégorie</th>
            <th scope="col" className="px-4 py-4 uppercase">Sexe</th>

            {TIME_COLUMNS.map((column) => (
              <SortableHeader
                key={column.value}
                raceId={raceId}
                query={query}
                column={column.value}
                label={column.label}
                align="right"
              />
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {results.map((result) => (
            <tr key={result.id} className="transition-colors hover:bg-orange-50/40">
              <td className="px-4 py-4 font-bold text-[#FC6B32]">{getRank(result)}</td>

              <td className="px-4 py-4">
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

              <td className="px-4 py-4 text-gray-500">{result.sexe ?? "—"}</td>

              {TIME_COLUMNS.map((column) => (
                <td
                  key={column.value}
                  className={
                    column.value === "total_time"
                      ? "px-4 py-4 text-right font-mono font-bold text-[#17202E]"
                      : "px-4 py-4 text-right font-mono text-gray-600"
                  }
                >
                  {result[column.value] ?? "—"}
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
