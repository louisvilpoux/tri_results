import { categoryShort, categoryTitle } from "@/lib/categories";

/**
 * Catégorie d'âge d'un résultat : code FFTRI commun aux sources (categorie_fftri), avec au survol
 * son libellé et la catégorie publiée par la source. Sans code FFTRI (élite, open, handisport…),
 * la catégorie de la source est affichée telle quelle.
 */
export function CategoryCell({
  fftri,
  source,
}: {
  fftri: string | null;
  source: string | null;
}) {
  if (fftri) {
    return <span title={categoryTitle(fftri, source)}>{categoryShort(fftri)}</span>;
  }
  const published = source?.replace(/^\d+\//, "").trim();
  return <>{published || "—"}</>;
}
