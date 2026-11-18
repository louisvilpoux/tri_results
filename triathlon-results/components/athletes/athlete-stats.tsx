import { formatOrdinal } from "@/lib/format";
import type { AthleteProfile } from "@/types/athlete";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-[#17202E]">{value}</p>
    </div>
  );
}

/** Chiffres clés, calculés par l'API sur les résultats dédoublonnés. */
export function AthleteStats({ athlete }: { athlete: AthleteProfile }) {
  return (
    <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <StatTile label="Courses" value={athlete.nb_races} />
      <StatTile label="Podiums" value={athlete.nb_podiums} />
      <StatTile label="Top 10" value={athlete.nb_top10} />
      <StatTile
        label="Meilleur clt."
        value={athlete.best_rank !== null ? formatOrdinal(athlete.best_rank) : "—"}
      />
      <StatTile label="Saisons" value={athlete.seasons.length} />
    </section>
  );
}
