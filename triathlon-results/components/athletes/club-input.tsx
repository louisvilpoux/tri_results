"use client";

import { useState } from "react";

import { SuggestInput } from "@/components/search/suggest-input";

/**
 * Champ « Club » de la page Athlètes. Ouverte depuis un club de la recherche, la liste est
 * celle du club au nom exact (club_exact=1) ; ce mode est gardé quand on applique un autre
 * filtre (sexe, nom), et quitté dès que le nom du club est modifié : le club contient alors
 * les mots saisis. Suggestions pendant la saisie comme pour le nom (5 clubs, GET /suggest
 * ?type=clubs) : un club suggéré ouvre la liste de ce club au nom exact, en gardant le sexe et
 * le nom déjà filtrés ; Entrée sans suggestion choisie applique le filtre.
 */
export function ClubInput({
  defaultValue,
  exact,
  otherFilters,
  id,
  inputClassName,
}: {
  defaultValue: string;
  exact: boolean;
  /** Filtres déjà appliqués (sexe, nom), gardés quand on choisit un club suggéré. */
  otherFilters: Record<string, string | null>;
  id: string;
  inputClassName: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <SuggestInput
      id={id}
      type="clubs"
      name="club"
      clubLinkFilters={otherFilters}
      onValueChange={setValue}
      defaultValue={defaultValue}
      placeholder="ex. Vendôme triathlon"
      className="sm:w-64"
      inputClassName={`${inputClassName} w-full`}
      panelClassName="left-0 w-full sm:w-96"
    >
      {exact && value === defaultValue && <input type="hidden" name="club_exact" value="1" />}
    </SuggestInput>
  );
}
