"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Filtres du classement sur mobile (U6, retour utilisateur du 23/11/2026) : la recherche reste
 * visible, sexe, catégorie, nombre par page et boutons sont repliés derrière « Filtres ». Sur
 * grand écran tout reste sur une ligne : les deux conteneurs s'effacent (lg:contents) et leurs
 * champs rejoignent la ligne du formulaire.
 */
export function FiltersPanel({
  search,
  activeCount,
  children,
}: {
  /** Champ de recherche, toujours visible. */
  search: ReactNode;
  /** Filtres actifs (sexe, catégorie), affichés sur le bouton. */
  activeCount: number;
  /** Champs repliés sur mobile. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-end gap-2 lg:contents">
        {search}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="filtres-classement"
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold lg:hidden",
            activeCount > 0
              ? "border-[#FC6B32] text-[#FC6B32]"
              : "border-gray-200 text-gray-600 hover:border-[#FC6B32] hover:text-[#FC6B32]"
          )}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filtres
          {activeCount > 0 && (
            <span className="rounded-full bg-[#FC6B32] px-1.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            aria-hidden
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      <div
        id="filtres-classement"
        className={cn("grid-cols-3 gap-2 lg:contents", open ? "grid" : "hidden")}
      >
        {children}
      </div>
    </>
  );
}
