import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types/result";

interface SortableHeaderProps {
  label: string;
  /** Lien vers la même page triée par cette colonne (ordre inversé si déjà active). */
  href: string;
  isActive: boolean;
  order: SortOrder;
  align?: "left" | "right";
  className?: string;
}

/** En-tête de colonne de tableau cliquable, avec l'icône du sens de tri. */
export function SortableHeader({
  label,
  href,
  isActive,
  order,
  align = "left",
  className,
}: SortableHeaderProps) {
  const Icon = !isActive ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (order === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-4 sm:px-4", align === "right" && "text-right", className)}
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

/** Ordre à appliquer au clic : inverse l'ordre si la colonne est déjà triée, sinon `defaultOrder`. */
export function nextSortOrder(
  isActive: boolean,
  currentOrder: SortOrder,
  defaultOrder: SortOrder = "asc"
): SortOrder {
  if (!isActive) return defaultOrder;
  return currentOrder === "asc" ? "desc" : "asc";
}
