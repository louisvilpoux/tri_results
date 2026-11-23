// Simulateur « Et moi ? » de la page classement (components/results/race-simulator.tsx).
// Constantes partagées entre la page (serveur) et le composant (client) : un composant
// « use client » ne peut pas exporter de valeurs ordinaires vers un composant serveur.

/** Paramètre d'URL d'un temps saisi : ?moi_swim=00:32:00&moi_total=05:01:30… */
export const SIMULATOR_PARAM_PREFIX = "moi_";

/** Clés des temps saisissables (segments, transitions, total), lues une à une dans l'URL. */
export const SIMULATOR_KEYS = ["swim", "run1", "t1", "bike", "t2", "run", "run2", "total"];

/**
 * Sexe et catégorie choisis, gardés dans l'URL avec le même préfixe (moi_sexe=M,
 * moi_categorie=MV1) pour ne pas se mélanger aux filtres du classement (s, categorie).
 */
export const SIMULATOR_SEXE_PARAM = `${SIMULATOR_PARAM_PREFIX}sexe`;
export const SIMULATOR_CATEGORIE_PARAM = `${SIMULATOR_PARAM_PREFIX}categorie`;
