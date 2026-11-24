/** "2025-03-30" → "30 mars 2025". */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/** Période d'une course : "18 juin 2022" ou "17 – 19 juin 2022" sur plusieurs jours. */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatRange(startDate, endDate);
}

/** "2025-03-30" → "30/03/2025", pour les tableaux denses. */
export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${date}T12:00:00`));
}

// prolivesport code les non-classés avec 0 ou une valeur entre 99991 et 99999
// (même règle que STATUS_RANK_MIN dans api/main.py).
const STATUS_RANK_MIN = 99990;

export function isValidRank(rank: number): boolean {
  return rank > 0 && rank < STATUS_RANK_MIN;
}

/**
 * Classement affichable : `clt` s'il est valide ; sinon `rang_global` s'il porte un
 * statut texte (ex. "DNF") ; sinon "NC" (non classé) ou "—" si rien n'est renseigné.
 */
export function formatRank(clt: number | null, rangGlobal: string | null): string {
  if (clt !== null && isValidRank(clt)) return String(clt);
  if (rangGlobal && !/^\d+$/.test(rangGlobal)) return rangGlobal;
  if (clt !== null || rangGlobal) return "NC";
  return "—";
}

/** 1 → "1er", 2 → "2e". */
export function formatOrdinal(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}

/** "triathlon" → "Triathlon". */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
