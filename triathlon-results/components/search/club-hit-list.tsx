import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import type { ClubHit } from "@/types/search";

/**
 * Liste des athlètes d'un club (filtre club de la page Athlètes), au nom exact : elle compte
 * le même nombre d'athlètes que le club trouvé (sinon « LILLE TRIATHLON » prendrait aussi
 * « US LILLE TRIATHLON »). otherFilters : filtres de la page Athlètes déjà appliqués (sexe,
 * nom), gardés quand on choisit un club dans son champ Club.
 */
export function clubHref(club: string, otherFilters: Record<string, string | null> = {}): string {
  const params = new URLSearchParams(
    Object.entries(otherFilters).filter((entry): entry is [string, string] => !!entry[1])
  );
  params.set("club", club);
  params.set("club_exact", "1");
  return `/athletes?${params}`;
}

/** Clubs trouvés par la recherche globale ; chacun ouvre la liste de ses athlètes. */
export function ClubHitList({ clubs }: { clubs: ClubHit[] }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {clubs.map((club) => (
        <li key={club.club}>
          <Link
            href={clubHref(club.club)}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-orange-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Users size={18} aria-hidden />
            </span>

            <span className="min-w-0 flex-1 truncate font-semibold text-[#17202E] group-hover:text-[#FC6B32]">
              {club.club}
            </span>

            <span className="shrink-0 text-right text-sm font-bold tabular-nums text-[#17202E]">
              {club.nb_athletes.toLocaleString("fr-FR")} athlète{club.nb_athletes > 1 && "s"}
            </span>

            <ChevronRight size={18} aria-hidden className="shrink-0 text-gray-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
