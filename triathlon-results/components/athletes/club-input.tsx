"use client";

import { useState } from "react";

/**
 * Champ « Club » de la page Athlètes. Ouverte depuis un club de la recherche, la liste est
 * celle du club au nom exact (club_exact=1) ; ce mode est gardé quand on applique un autre
 * filtre (sexe, nom), et quitté dès que le nom du club est modifié : le club contient alors
 * les mots saisis.
 */
export function ClubInput({
  defaultValue,
  exact,
  className,
}: {
  defaultValue: string;
  exact: boolean;
  className: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input
        type="search"
        name="club"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ex. Vendôme triathlon"
        className={className}
      />
      {exact && value === defaultValue && <input type="hidden" name="club_exact" value="1" />}
    </>
  );
}
