import Link from "next/link";

import { cn } from "@/lib/utils";
import { buildRaceResultsUrl } from "@/lib/results-query";
import type { Pagination, RaceResultsQuery } from "@/types/result";

interface ResultsPaginationProps {
  raceId: string;
  query: RaceResultsQuery;
  pagination: Pagination;
  shownCount: number;
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "rounded-lg border px-4 py-2 text-sm font-semibold",
        disabled
          ? "pointer-events-none border-gray-100 text-gray-300"
          : "border-gray-200 text-gray-700 hover:border-[#FC6B32] hover:text-[#FC6B32]"
      )}
    >
      {label}
    </Link>
  );
}

export function ResultsPagination({
  raceId,
  query,
  pagination,
  shownCount,
}: ResultsPaginationProps) {
  const { total, has_next: hasNext } = pagination;
  const totalPages = Math.max(Math.ceil(total / query.limit), 1);
  const currentPage = Math.floor(query.offset / query.limit) + 1;

  return (
    <div className="flex flex-col justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">
      <p className="text-sm text-gray-500">
        Affichage de {total === 0 ? 0 : query.offset + 1} à{" "}
        {Math.min(query.offset + shownCount, total)} sur {total} résultats
      </p>

      <div className="flex items-center gap-2">
        <PageLink
          label="Précédent"
          disabled={query.offset === 0}
          href={buildRaceResultsUrl(raceId, query, {
            offset: Math.max(query.offset - query.limit, 0),
          })}
        />

        <span className="px-2 text-sm font-semibold text-gray-600">
          {currentPage} / {totalPages}
        </span>

        <PageLink
          label="Suivant"
          disabled={!hasNext}
          href={buildRaceResultsUrl(raceId, query, { offset: query.offset + query.limit })}
        />
      </div>
    </div>
  );
}
