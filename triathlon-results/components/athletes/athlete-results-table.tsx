import Link from "next/link";

import { SortableHeader, nextSortOrder } from "@/components/shared/sortable-header";
import { buildAthleteUrl } from "@/lib/athlete-results-query";
import { capitalize, formatRank, formatShortDate } from "@/lib/format";
import type { AthleteResult, AthleteResultSortBy, AthleteResultsQuery } from "@/types/athlete";
import { SOURCES_WITHOUT_RELIABLE_FORMAT } from "@/types/result";

interface AthleteResultsTableProps {
  athleteId: string;
  query: AthleteResultsQuery;
  results: AthleteResult[];
}

function hasReliableFormat(result: AthleteResult): boolean {
  return !SOURCES_WITHOUT_RELIABLE_FORMAT.includes(result.source ?? "");
}

function isPodium(clt: number | null): boolean {
  return clt !== null && clt >= 1 && clt <= 3;
}

export function AthleteResultsTable({ athleteId, query, results }: AthleteResultsTableProps) {
  function sortHeader(column: AthleteResultSortBy, label: string, align?: "left" | "right") {
    const isActive = query.sortBy === column;
    // Les dates se lisent naturellement de la plus récente à la plus ancienne.
    const defaultOrder = column === "date_epreuve" ? "desc" : "asc";
    const href = buildAthleteUrl(athleteId, query, {
      sortBy: column,
      order: nextSortOrder(isActive, query.order, defaultOrder),
      offset: 0,
    });

    return (
      <SortableHeader label={label} href={href} isActive={isActive} order={query.order} align={align} />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500">
          <tr>
            {sortHeader("date_epreuve", "Date")}
            <th scope="col" className="px-4 py-4 uppercase">Épreuve</th>
            <th scope="col" className="px-4 py-4 uppercase">Format</th>
            <th scope="col" className="px-4 py-4 uppercase">Catégorie</th>
            {sortHeader("clt", "Clt.", "right")}
            {sortHeader("total_time", "Temps", "right")}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {results.map((result) => (
            <tr key={result.id} className="transition-colors hover:bg-orange-50/40">
              <td className="whitespace-nowrap px-4 py-4 tabular-nums text-gray-500">
                {result.date_epreuve ? formatShortDate(result.date_epreuve) : "—"}
              </td>

              <td className="px-4 py-4">
                <Link
                  href={`/races/${result.epreuve_id}/results`}
                  className="font-semibold capitalize text-[#17202E] hover:text-[#FC6B32]"
                >
                  {result.name_epreuve}
                </Link>
              </td>

              <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                {result.type_epreuve ? capitalize(result.type_epreuve) : "—"}
                {result.format_epreuve && hasReliableFormat(result) && (
                  <span className="ml-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                    {result.format_epreuve}
                  </span>
                )}
              </td>

              <td className="px-4 py-4 text-gray-500">{result.categorie ?? result.cat ?? "—"}</td>

              <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                <span
                  className={
                    isPodium(result.clt) ? "font-black text-[#FC6B32]" : "font-bold text-[#17202E]"
                  }
                >
                  {formatRank(result.clt, result.rang_global)}
                </span>
                <span className="text-gray-400"> / {result.participants}</span>
              </td>

              <td className="px-4 py-4 text-right font-mono font-bold text-[#17202E]">
                {result.total_time ?? "—"}
              </td>
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
