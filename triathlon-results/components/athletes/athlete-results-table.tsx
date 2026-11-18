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

/** Sur mobile : épreuve (date en dessous), rang et temps ; le reste à partir de `md`. */
const DESKTOP_ONLY = "hidden md:table-cell";
const CELL = "px-3 py-4 sm:px-4";

function isPodium(clt: number | null): boolean {
  return clt !== null && clt >= 1 && clt <= 3;
}

export function AthleteResultsTable({ athleteId, query, results }: AthleteResultsTableProps) {
  function sortHeader(
    column: AthleteResultSortBy,
    label: string,
    align?: "left" | "right",
    className?: string
  ) {
    const isActive = query.sortBy === column;
    // Les dates se lisent naturellement de la plus récente à la plus ancienne.
    const defaultOrder = column === "date_epreuve" ? "desc" : "asc";
    const href = buildAthleteUrl(athleteId, query, {
      sortBy: column,
      order: nextSortOrder(isActive, query.order, defaultOrder),
      offset: 0,
    });

    return (
      <SortableHeader
        label={label}
        href={href}
        isActive={isActive}
        order={query.order}
        align={align}
        className={className}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm md:min-w-[760px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500">
          <tr>
            {sortHeader("date_epreuve", "Date", "left", DESKTOP_ONLY)}
            <th scope="col" className={`${CELL} uppercase`}>Épreuve</th>
            <th scope="col" className={`${CELL} uppercase ${DESKTOP_ONLY}`}>Format</th>
            <th scope="col" className={`${CELL} uppercase ${DESKTOP_ONLY}`}>Catégorie</th>
            {sortHeader("clt", "Clt.", "right")}
            {sortHeader("total_time", "Temps", "right")}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {results.map((result) => (
            <tr key={result.id} className="transition-colors hover:bg-orange-50/40">
              <td className={`${CELL} whitespace-nowrap tabular-nums text-gray-500 ${DESKTOP_ONLY}`}>
                {result.date_epreuve ? formatShortDate(result.date_epreuve) : "—"}
              </td>

              <td className={CELL}>
                <Link
                  href={`/races/${result.epreuve_id}/results`}
                  className="font-semibold capitalize text-[#17202E] hover:text-[#FC6B32]"
                >
                  {result.name_epreuve}
                </Link>
                {result.date_epreuve && (
                  <p className="mt-0.5 text-xs tabular-nums text-gray-400 md:hidden">
                    {formatShortDate(result.date_epreuve)}
                  </p>
                )}
              </td>

              <td className={`${CELL} whitespace-nowrap text-gray-500 ${DESKTOP_ONLY}`}>
                {result.type_epreuve ? capitalize(result.type_epreuve) : "—"}
                {result.format_epreuve && hasReliableFormat(result) && (
                  <span className="ml-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                    {result.format_epreuve}
                  </span>
                )}
              </td>

              <td className={`${CELL} text-gray-500 ${DESKTOP_ONLY}`}>
                {result.categorie ?? result.cat ?? "—"}
              </td>

              <td className={`${CELL} whitespace-nowrap text-right tabular-nums`}>
                <span
                  className={
                    isPodium(result.clt) ? "font-black text-[#FC6B32]" : "font-bold text-[#17202E]"
                  }
                >
                  {formatRank(result.clt, result.rang_global)}
                </span>
                <span className="text-gray-400"> / {result.participants}</span>
              </td>

              <td className={`${CELL} text-right font-mono font-bold text-[#17202E]`}>
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
