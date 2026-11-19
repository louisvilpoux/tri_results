import { createLucideIcon } from "lucide-react";

/**
 * Personne debout qui tient son vélo par le guidon (bike & run).
 * lucide-react n'a pas d'icône équivalente : celle-ci reprend son style
 * (grille 24 × 24, trait de 2, extrémités arrondies) pour rester homogène avec les autres.
 */
export const PersonWithBike = createLucideIcon("person-with-bike", [
  // Personne : tête, corps, jambes, bras tendu vers le guidon.
  ["circle", { cx: "4", cy: "4.5", r: "1.5", key: "head" }],
  ["path", { d: "M4 7.5V13", key: "body" }],
  ["path", { d: "m2 20.5 2-7.5 2 7.5", key: "legs" }],
  ["path", { d: "m4 9.5 7.5 1", key: "arm" }],
  // Vélo : roues, cadre, fourche et guidon, selle.
  ["circle", { cx: "10.5", cy: "17.5", r: "3", key: "front-wheel" }],
  ["circle", { cx: "19.5", cy: "17.5", r: "3", key: "rear-wheel" }],
  ["path", { d: "M19.5 17.5H15l-3-5h5.5l2 5M15 17.5l2.5-5 .5-1.5", key: "frame" }],
  ["path", { d: "m10.5 17.5 1-7h1.5", key: "fork" }],
  ["path", { d: "M17 11h2.5", key: "saddle" }],
]);
