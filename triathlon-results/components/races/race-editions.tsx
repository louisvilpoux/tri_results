import Link from "next/link";

import { cn } from "@/lib/utils";
import type { RaceEdition } from "@/types/race";

interface RaceEditionsProps {
  editions: RaceEdition[];
  currentYear: string | null;
}

/** Liens vers les autres années de la même course (même nom). */
export function RaceEditions({ editions, currentYear }: RaceEditionsProps) {
  if (editions.length < 2) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Autres éditions</h2>

      <ul className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const isCurrent = edition.year_epreuve === currentYear;

          return (
            <li key={edition.year_epreuve}>
              <Link
                href={`/races/${edition.race_id}`}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "inline-block rounded-lg border px-4 py-2 text-sm font-bold tabular-nums transition-colors",
                  isCurrent
                    ? "border-[#FC6B32] bg-[#FC6B32] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#FC6B32] hover:text-[#FC6B32]"
                )}
              >
                {edition.year_epreuve}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
