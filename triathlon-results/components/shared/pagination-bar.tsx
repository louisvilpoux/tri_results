import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Pagination } from "@/types/result";

interface PaginationBarProps {
  pagination: Pagination;
  shownCount: number;
  previousHref: string;
  nextHref: string;
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

/** Bas de tableau : position dans la liste et liens Précédent / Suivant. */
export function PaginationBar({ pagination, shownCount, previousHref, nextHref }: PaginationBarProps) {
  const { total, limit, offset, has_next: hasNext } = pagination;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">
      <p className="text-sm text-gray-500">
        Affichage de {total === 0 ? 0 : offset + 1} à {Math.min(offset + shownCount, total)} sur{" "}
        {total} résultats
      </p>

      <div className="flex items-center gap-2">
        <PageLink label="Précédent" disabled={offset === 0} href={previousHref} />
        <span className="px-2 text-sm font-semibold text-gray-600">
          {currentPage} / {totalPages}
        </span>
        <PageLink label="Suivant" disabled={!hasNext} href={nextHref} />
      </div>
    </div>
  );
}
