import Link from "next/link";

import { cn } from "@/lib/utils";
import type { RaceEdition } from "@/types/race";

interface RaceEditionsProps {
  editions: RaceEdition[];
  currentYear: string | null;
}

/**
 * Liens vers les autres années de la même course (même nom), affichés dans l'en-tête sombre de
 * la page course : on change d'édition sans faire défiler la page.
 */
export function RaceEditions({ editions, currentYear }: RaceEditionsProps) {
  if (editions.length < 2) return null;

  return (
    <nav aria-label="Autres éditions">
      {/* mobile : une seule ligne qui défile, pour ne pas allonger l'en-tête */}
      <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {editions.map((edition) => {
          const isCurrent = edition.year_epreuve === currentYear;

          return (
            <li key={edition.year_epreuve}>
              <Link
                href={`/races/${edition.race_id}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "inline-block rounded-lg border px-3 py-1.5 text-sm font-bold tabular-nums transition-colors",
                  isCurrent
                    ? "border-[#FC6B32] bg-[#FC6B32] text-white"
                    : "border-white/15 bg-white/5 text-gray-300 hover:border-[#FC6B32] hover:text-white"
                )}
              >
                {edition.year_epreuve}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
