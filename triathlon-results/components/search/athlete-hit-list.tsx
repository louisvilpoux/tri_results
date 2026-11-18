import Link from "next/link";
import { ChevronRight, User } from "lucide-react";

import type { AthleteHit } from "@/types/search";

export function AthleteHitList({ athletes }: { athletes: AthleteHit[] }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {athletes.map((athlete) => (
        <li key={athlete.id}>
          <Link
            href={`/athletes/${athlete.id}`}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-orange-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <User size={18} aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-[#17202E] group-hover:text-[#FC6B32]">
                {athlete.nom ?? "Athlète"}
              </span>
              {athlete.club && (
                <span className="block truncate text-sm text-gray-500">{athlete.club}</span>
              )}
            </span>

            <span className="hidden shrink-0 text-right text-sm sm:block">
              <span className="block font-bold tabular-nums text-[#17202E]">
                {athlete.nb_races} course{athlete.nb_races > 1 && "s"}
              </span>
              {athlete.last_season && (
                <span className="block text-xs text-gray-400">Dernière saison {athlete.last_season}</span>
              )}
            </span>

            <ChevronRight size={18} aria-hidden className="shrink-0 text-gray-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
