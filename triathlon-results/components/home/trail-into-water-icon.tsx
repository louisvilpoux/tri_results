import { createLucideIcon } from "lucide-react";

/**
 * Sentier qui descend jusqu'à l'eau (swimrun : on enchaîne course et nage en milieu naturel).
 * lucide-react n'a pas d'icône équivalente : celle-ci reprend son style
 * (grille 24 × 24, trait de 2, extrémités arrondies) pour rester homogène avec les autres.
 */
export const TrailIntoWater = createLucideIcon("trail-into-water", [
  // Sentier sinueux qui part du haut et descend vers l'eau.
  ["path", { d: "M17 2c-3.5 0-6 1.3-6 3.5S16 8 16 10.5 12.5 14 9 14", key: "trail" }],
  // Eau : deux vagues.
  [
    "path",
    {
      d: "M2 17c.6.5 1.2 1 2.5 1C7 18 7 16 9.5 16c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      key: "wave-1",
    },
  ],
  [
    "path",
    {
      d: "M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      key: "wave-2",
    },
  ],
]);
