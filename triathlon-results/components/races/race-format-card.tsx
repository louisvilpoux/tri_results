import Link from "next/link";
import { ArrowRight, Medal, Users } from "lucide-react";

import { capitalize, formatShortDate } from "@/lib/format";
import type { PodiumLeader, RaceFormat } from "@/types/race";

function LeaderLine({ label, leader }: { label: string; leader: PodiumLeader }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        {leader.equipe ? (
          // Une équipe n'a pas de profil d'athlète.
          <p className="truncate font-semibold text-[#17202E]">{leader.nom_athlete ?? "Équipe"}</p>
        ) : (
          <Link
            href={`/athletes/${leader.athlete_id}`}
            className="block truncate font-semibold text-[#17202E] hover:text-[#FC6B32]"
          >
            {leader.nom_athlete ?? "Athlète"}
          </Link>
        )}
      </div>
      {leader.total_time && (
        <span className="shrink-0 font-mono font-bold tabular-nums text-[#17202E]">
          {leader.total_time}
        </span>
      )}
    </div>
  );
}

export function RaceFormatCard({ raceFormat }: { raceFormat: RaceFormat }) {
  const formatLabel = raceFormat.format_epreuve ?? "Format non précisé";

  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#FC6B32]">
            {raceFormat.type_epreuve ? capitalize(raceFormat.type_epreuve) : "Épreuve"}
          </p>
          <h3 className="mt-1 text-2xl font-black text-[#17202E]">{formatLabel}</h3>
          {raceFormat.date_epreuve && (
            <p className="mt-1 text-xs text-gray-400">{formatShortDate(raceFormat.date_epreuve)}</p>
          )}
        </div>

        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          <Users size={13} aria-hidden />
          {raceFormat.participants}
        </span>
      </div>

      {(raceFormat.winner || raceFormat.first_woman) && (
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            <Medal size={14} aria-hidden className="text-[#FC6B32]" />
            Podium
          </p>
          {raceFormat.winner && (
            <LeaderLine
              label={raceFormat.winner.equipe ? "Équipe gagnante" : "Vainqueur"}
              leader={raceFormat.winner}
            />
          )}
          {raceFormat.first_woman && (
            <LeaderLine
              label={raceFormat.first_woman.equipe ? "Première équipe féminine" : "Première femme"}
              leader={raceFormat.first_woman}
            />
          )}
        </div>
      )}

      <Link
        href={`/races/${raceFormat.id}/results`}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#17202E] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#FC6B32]"
      >
        Voir le classement
        <ArrowRight size={16} aria-hidden />
      </Link>
    </li>
  );
}
