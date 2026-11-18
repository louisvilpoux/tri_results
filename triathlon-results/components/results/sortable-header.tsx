import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildRaceResultsUrl } from "@/lib/results-query";
import type { RaceResultSortBy, RaceResultsQuery } from "@/types/result";

interface SortableHeaderProps {
  raceId: string;
  query: RaceResultsQuery;
  column: RaceResultSortBy;
  label: string;
  align?: "left" | "right";
}

/** En-tête de colonne cliquable : un clic trie par cette colonne, un second inverse l'ordre. */
export function SortableHeader({
  raceId,
  query,
  column,
  label,
  align = "left",
}: SortableHeaderProps) {
  const isActive = query.sortBy === column;
  const nextOrder = isActive && query.order === "asc" ? "desc" : "asc";
  const href = buildRaceResultsUrl(raceId, query, {
    sortBy: column,
    order: nextOrder,
    offset: 0,
  });

  const Icon = !isActive ? ArrowUpDown : query.order === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (query.order === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-4", align === "right" && "text-right")}
    >
      <Link
        href={href}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase transition-colors hover:text-[#FC6B32]",
          isActive && "text-[#17202E]"
        )}
      >
        {label}
        <Icon
          size={13}
          aria-hidden
          className={isActive ? "text-[#FC6B32]" : "text-gray-300"}
        />
      </Link>
    </th>
  );
}
