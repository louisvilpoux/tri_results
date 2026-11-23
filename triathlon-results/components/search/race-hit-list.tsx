import Link from "next/link";
import { ChevronRight, Flag } from "lucide-react";

import { capitalize, formatDateRange } from "@/lib/format";
import type { RaceHit } from "@/types/search";

export function RaceHitList({ races }: { races: RaceHit[] }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {races.map((race) => (
        <li key={race.id}>
          <Link
            href={`/races/${race.id}`}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-orange-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FC6B32]">
              <Flag size={18} aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-[#17202E] group-hover:text-[#FC6B32]">
                {race.name_epreuve ?? "Course"}
              </span>
              <span className="block truncate text-sm text-gray-500">
                {[
                  race.date_start && race.date_end && formatDateRange(race.date_start, race.date_end),
                  race.lieu_epreuve,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>

            <span className="hidden shrink-0 flex-wrap justify-end gap-1.5 sm:flex">
              {race.types.map((type) => (
                <span
                  key={type}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600"
                >
                  {capitalize(type)}
                </span>
              ))}
            </span>

            <ChevronRight size={18} aria-hidden className="shrink-0 text-gray-300" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
