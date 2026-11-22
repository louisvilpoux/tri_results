import Form from "next/form";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  // Champ compact du header.
  header: {
    form: "w-64 lg:w-72",
    input: "h-10 rounded-lg pl-9 pr-3 text-sm",
    icon: 17,
    button: null,
  },
  // Grand champ du bandeau de la page d'accueil (fond sombre).
  hero: {
    form: "w-full max-w-xl",
    input: "h-14 rounded-xl pl-11 pr-28 text-sm shadow-lg sm:pr-36 sm:text-base",
    icon: 20,
    button: "h-11 px-3.5 text-sm sm:px-5",
  },
  // Champ en haut de la page /search.
  page: {
    form: "w-full",
    input: "h-12 rounded-xl pl-11 pr-32 text-base",
    icon: 19,
    button: "h-9 px-4 text-sm",
  },
} as const;

interface SearchFormProps {
  variant: keyof typeof VARIANTS;
  defaultValue?: string;
  autoFocus?: boolean;
}

/** Formulaire GET vers /search : la recherche se lance avec Entrée ou le bouton. */
export function SearchForm({ variant, defaultValue, autoFocus }: SearchFormProps) {
  const styles = VARIANTS[variant];

  return (
    <Form action="/search" role="search" className={cn("relative", styles.form)}>
      <Search
        size={styles.icon}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        name="q"
        required
        minLength={2}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        aria-label="Rechercher un athlète ou une course"
        placeholder="Athlète, course ou ville…"
        className={cn(
          "w-full border border-gray-200 bg-white text-[#17202E] outline-none",
          "placeholder:text-gray-400 focus:border-[#FC6B32] focus:ring-2 focus:ring-[#FC6B32]/20",
          styles.input
        )}
      />
      {styles.button && (
        <button
          type="submit"
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#FC6B32] font-bold text-white transition-colors hover:bg-orange-600",
            styles.button
          )}
        >
          Rechercher
        </button>
      )}
    </Form>
  );
}
