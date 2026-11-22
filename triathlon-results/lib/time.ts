/** Durées « hh:mm:ss » des résultats : conversions et écritures pour les graphiques. */

export function toSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Durée lisible pour les axes : « 5h29 », « 34 min ». */
export function shortDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}

/** Écart signé en secondes : « +2:13 », « −0:58 », « +1:02:05 », « = ». */
export function formatGap(gap: number): string {
  if (gap === 0) return "=";
  const absolute = Math.abs(gap);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const seconds = String(absolute % 60).padStart(2, "0");
  const value =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
      : `${minutes}:${seconds}`;
  return `${gap > 0 ? "+" : "−"}${value}`;
}

/** Écart entre deux temps « hh:mm:ss » (null si l'un manque). */
export function signedGap(current: string | null, previous: string | null): string | null {
  const a = toSeconds(current);
  const b = toSeconds(previous);
  return a === null || b === null ? null : formatGap(a - b);
}
