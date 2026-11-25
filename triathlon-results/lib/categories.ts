// Catégories d'âge FFTRI communes aux sources (colonne categorie_fftri, calculée dans
// transform/ par categorie_fftri ; Q5 de l'audit du 25/11/2026). Chaque source publie les siennes
// (« MS3 », « M30-34 », « S3M », « SE », « MA »…) ; elles sont ramenées à ces codes, sans le sexe.

/** Ordre des âges, comme CATEGORY_ORDER dans l'API. */
export const CATEGORY_ORDER = [
  "MP", "PO", "PU", "BE", "MI", "CA", "JU",
  "S1", "S2", "S3", "S4", "SE",
  ...Array.from({ length: 10 }, (_, index) => `V${index + 1}`),
  "VE",
];

export function sortCategories(codes: string[]): string[] {
  const rank = (code: string) => {
    const index = CATEGORY_ORDER.indexOf(code);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };
  return [...codes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

const YOUTH: Record<string, string> = {
  MP: "Mini-poussins",
  PO: "Poussins",
  PU: "Pupilles",
  BE: "Benjamins",
  MI: "Minimes",
  CA: "Cadets",
  JU: "Juniors",
};

/** Code court affiché dans les tableaux : « S3 », « V1 », « JU » ; « Senior » et « Master » pour
 * les catégories publiées sans niveau (SE, VE). */
export function categoryShort(code: string): string {
  if (code === "SE") return "Senior";
  if (code === "VE") return "Master";
  return code;
}

/** Libellé complet : « S3 · 30-34 ans », « V1 · 40-44 ans », « Juniors », « Senior (niveau non
 * publié) ». */
export function categoryLabel(code: string): string {
  if (code in YOUTH) return YOUTH[code];
  if (code === "SE") return "Senior (niveau non publié)";
  if (code === "VE") return "Master (niveau non publié)";
  const level = code.match(/^([SV])(\d+)$/);
  if (!level) return code;
  const start = (level[1] === "S" ? 20 : 40) + (Number(level[2]) - 1) * 5;
  return `${code} · ${start}-${start + 4} ans`;
}

/** Infobulle d'une cellule : libellé complet et catégorie telle que publiée par la source. */
export function categoryTitle(code: string, source: string | null): string {
  const published = source?.replace(/^\d+\//, "").trim();
  return published && published !== code
    ? `${categoryLabel(code)} (publiée : ${published})`
    : categoryLabel(code);
}
