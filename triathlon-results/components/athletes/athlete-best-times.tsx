import Link from "next/link";
import { Timer } from "lucide-react";

import { capitalize, formatShortDate } from "@/lib/format";
import type { AthleteBestTime } from "@/types/athlete";

/** Meilleur temps total par discipline et format. */
export function AthleteBestTimes({ bestTimes }: { bestTimes: AthleteBestTime[] }) {
  if (bestTimes.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Meilleurs temps</h2>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bestTimes.map((best) => (
          <li
            key={`${best.type_epreuve}-${best.format_epreuve}`}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#FC6B32]">
              <Timer size={14} aria-hidden />
              {best.type_epreuve ? capitalize(best.type_epreuve) : "Épreuve"}
              {best.format_epreuve && ` · ${best.format_epreuve}`}
            </p>

            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#17202E]">
              {best.total_time}
            </p>

            <Link
              href={`/races/${best.epreuve_id}/results`}
              className="mt-2 block truncate text-sm font-semibold text-gray-600 hover:text-[#FC6B32]"
            >
              {best.name_epreuve ?? "Voir le classement"}
            </Link>

            {best.date_epreuve && (
              <p className="mt-0.5 text-xs text-gray-400">{formatShortDate(best.date_epreuve)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
