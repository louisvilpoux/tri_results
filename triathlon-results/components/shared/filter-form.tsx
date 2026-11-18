import Form from "next/form";
import Link from "next/link";

/** Classe commune des champs de filtre (select, input). */
export const FILTER_FIELD_CLASS =
  "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#17202E] " +
  "outline-none focus:border-[#FC6B32] focus:ring-2 focus:ring-[#FC6B32]/20";

interface FilterFormProps {
  /** Page cible du formulaire GET (les champs deviennent des paramètres d'URL). */
  action: string;
  /** Lien « Réinitialiser », affiché seulement si des filtres sont actifs. */
  resetHref?: string;
  children: React.ReactNode;
}

/** Barre de filtres : champs + bouton « Appliquer » (+ « Réinitialiser » si besoin). */
export function FilterForm({ action, resetHref, children }: FilterFormProps) {
  return (
    <Form
      action={action}
      scroll={false}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {children}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="h-10 rounded-lg bg-[#FC6B32] px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
        >
          Appliquer
        </button>

        {resetHref && (
          <Link
            href={resetHref}
            scroll={false}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold leading-10 text-gray-600 hover:border-[#FC6B32] hover:text-[#FC6B32]"
          >
            Réinitialiser
          </Link>
        )}
      </div>
    </Form>
  );
}

/** Libellé + champ, empilés. */
export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-gray-500">
      {label}
      {children}
    </label>
  );
}
