import { RaceHitList } from "@/components/search/race-hit-list";
import { listEvents } from "@/lib/api";

const LATEST_RACES_COUNT = 6;

/** Les dernières courses ayant des résultats (même ordre que la page /races). */
export async function LatestRaces() {
  let races;
  try {
    const data = await listEvents({
      year: null,
      discipline: null,
      limit: LATEST_RACES_COUNT,
      offset: 0,
    });
    races = data.items;
  } catch {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
        Les dernières compétitions sont momentanément indisponibles.
      </p>
    );
  }

  if (races.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
        Aucune compétition pour le moment.
      </p>
    );
  }

  return <RaceHitList races={races} />;
}

/** Squelette affiché pendant le chargement des dernières courses. */
export function LatestRacesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement des dernières compétitions"
      className="space-y-px overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      {Array.from({ length: LATEST_RACES_COUNT }, (_, index) => (
        <div key={index} className="h-[72px] animate-pulse bg-gray-50" />
      ))}
    </div>
  );
}
