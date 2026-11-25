// Natation probablement annulée (D14, retour utilisateur du 25/11/2026) : un duathlon couru à la
// place du triathlon habituel (transform/natation_annulee.sql). La source ne le dit pas : c'est
// déduit des éditions voisines, d'où « probablement ».

/** Étiquette courte, à côté du format (historique, meilleurs temps, cartes de format). */
export const SWIM_CANCELLED_LABEL = "Natation annulée ?";

/** Explication, au survol de l'étiquette et dans le bandeau du classement. */
export const SWIM_CANCELLED_MESSAGE =
  "Natation probablement annulée : cette épreuve est publiée comme un duathlon, alors que " +
  "l'édition précédente et la suivante de ce format sont des triathlons. Le triathlon a sans " +
  "doute été couru en duathlon cette année ; les temps sont rangés en duathlon.";
