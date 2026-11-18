import { CalendarDays, Shield, User } from "lucide-react";

import { capitalize } from "@/lib/format";
import type { AthleteProfile } from "@/types/athlete";

const SEXE_LABELS = { M: "Homme", F: "Femme" } as const;

export function AthleteHeader({ athlete }: { athlete: AthleteProfile }) {
  const { seasons } = athlete;
  // seasons est trié de la plus récente à la plus ancienne.
  const seasonRange =
    seasons.length === 0
      ? null
      : seasons.length === 1
        ? seasons[0]
        : `${seasons[seasons.length - 1]} – ${seasons[0]}`;

  return (
    <section className="rounded-2xl bg-[#17202E] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">Profil athlète</p>

      <h1 className="mt-3 text-3xl font-black sm:text-4xl">{athlete.nom ?? "Athlète"}</h1>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
        {athlete.club && (
          <span className="flex items-center gap-2">
            <Shield size={16} aria-hidden />
            {athlete.club}
          </span>
        )}

        {athlete.sexe && (
          <span className="flex items-center gap-2">
            <User size={16} aria-hidden />
            {SEXE_LABELS[athlete.sexe]}
          </span>
        )}

        {seasonRange && (
          <span className="flex items-center gap-2">
            <CalendarDays size={16} aria-hidden />
            {seasonRange}
          </span>
        )}
      </div>

      {athlete.disciplines.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Disciplines">
          {athlete.disciplines.map((discipline) => (
            <li
              key={discipline.type_epreuve}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold"
            >
              {capitalize(discipline.type_epreuve)}
              <span className="ml-1.5 text-[#FC6B32]">{discipline.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
