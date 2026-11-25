import { TriangleAlert } from "lucide-react";

export const SUSPECT_TIME_MESSAGE =
  "Temps anormal pour cette épreuve (moins de la moitié du temps médian, plus court que celui " +
  "d'athlètes mieux classés, ou bien plus long que celui des classés voisins) : probablement " +
  "une erreur de la source ou un athlète arrêté avant l'arrivée.";

/**
 * Temps total d'un résultat. Un temps suspect (voir transform/temps_totaux.sql) est grisé et
 * précédé d'une alerte, expliquée au survol et aux lecteurs d'écran.
 */
export function TotalTime({ time, suspect }: { time: string | null; suspect?: boolean }) {
  if (!time) return <>—</>;
  if (!suspect) return <>{time}</>;

  return (
    <span title={SUSPECT_TIME_MESSAGE} className="inline-flex items-center gap-1 text-gray-400">
      <TriangleAlert size={14} aria-hidden className="shrink-0 text-amber-500" />
      {time}
      <span className="sr-only"> ({SUSPECT_TIME_MESSAGE})</span>
    </span>
  );
}
