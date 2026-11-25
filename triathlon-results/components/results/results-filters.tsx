import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";

import { FiltersPanel } from "@/components/results/filters-panel";
import { categoryLabel } from "@/lib/categories";
import { PAGE_SIZES, buildRaceResultsUrl, hasActiveFilters } from "@/lib/results-query";
import type { RaceResultsQuery } from "@/types/result";

const FIELD_CLASS =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#17202E] " +
  "outline-none focus:border-[#FC6B32] focus:ring-2 focus:ring-[#FC6B32]/20";

interface ResultsFiltersProps {
  raceId: string;
  query: RaceResultsQuery;
  categories: string[];
}

/**
 * Formulaire GET : à la validation, les filtres sont écrits dans l'URL et la page est
 * rendue à nouveau côté serveur. Le tri courant est conservé, la pagination repart à 1.
 * Sur mobile, seule la recherche est visible (Entrée la lance) ; les autres champs sont
 * derrière le bouton « Filtres » (FiltersPanel).
 */
export function ResultsFilters({ raceId, query, categories }: ResultsFiltersProps) {
  const activeCount = Number(query.sexe !== null) + Number(query.categorie !== null);

  return (
    <Form
      action={`/races/${raceId}/results`}
      scroll={false}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-end"
    >
      <input type="hidden" name="sort_by" value={query.sortBy} />
      <input type="hidden" name="order" value={query.order} />

      <FiltersPanel
        activeCount={activeCount}
        search={
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-semibold text-gray-500">
            {/* libellé masqué sur mobile : le texte indicatif suffit */}
            <span className="sr-only lg:not-sr-only">Athlète</span>
            <span className="relative">
              <Search
                size={16}
                aria-hidden
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                name="q"
                enterKeyHint="search"
                defaultValue={query.q ?? ""}
                placeholder="Rechercher un nom (2 caractères min.)"
                className={`${FIELD_CLASS} w-full pl-9`}
              />
            </span>
          </label>
        }
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
          Sexe
          <select name="sexe" defaultValue={query.sexe ?? ""} className={FIELD_CLASS}>
            <option value="">Tous</option>
            <option value="M">Hommes</option>
            <option value="F">Femmes</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
          Catégorie
          <select name="categorie" defaultValue={query.categorie ?? ""} className={FIELD_CLASS}>
            <option value="">Toutes</option>
            {categories.map((categorie) => (
              <option key={categorie} value={categorie}>
                {categoryLabel(categorie)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
          Par page
          <select name="limit" defaultValue={String(query.limit)} className={FIELD_CLASS}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-3 flex items-center gap-2">
          <button
            type="submit"
            className="h-10 rounded-lg bg-[#FC6B32] px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
          >
            Appliquer
          </button>

          {hasActiveFilters(query) && (
            <Link
              href={buildRaceResultsUrl(raceId, query, {
                sexe: null,
                categorie: null,
                q: null,
                offset: 0,
              })}
              scroll={false}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold leading-10 text-gray-600 hover:border-[#FC6B32] hover:text-[#FC6B32]"
            >
              Réinitialiser
            </Link>
          )}
        </div>
      </FiltersPanel>
    </Form>
  );
}
