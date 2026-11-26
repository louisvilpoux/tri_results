/**
 * Mesure d'audience avec Umami (https://umami.is) : sans cookie ni donnée personnelle, donc sans
 * bandeau de consentement. Les pages vues sont comptées par le script lui-même (y compris les
 * navigations sans rechargement) ; trackEvent ajoute les événements métier ci-dessous.
 *
 * Inactif sans NEXT_PUBLIC_UMAMI_WEBSITE_ID (lue au build) : le script n'est pas chargé et
 * trackEvent ne fait rien. Changer d'outil ne touche que ce fichier et components/shared/analytics.
 */

export const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
export const UMAMI_SCRIPT_URL =
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js";

/** Événements métier et leurs données. */
export interface AnalyticsEvents {
  /** Recherche affichée sur /search : onglet et nombre de résultats (0 : contenu manquant ?). */
  search: { type: string; results: number };
  /** Suggestion ouverte depuis un champ de recherche. */
  suggestion_open: { kind: "athlete" | "club" | "race" | "search" };
  /** Ouverture du simulateur « Et moi ? » d'une course. */
  simulator_open: { race_id: string };
  /** Retour envoyé par la fenêtre « Un avis ? Un bug ? » (le contenu n'est pas transmis). */
  feedback_sent: { kind: string };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Record<string, string | number>) => void };
  }
}

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  data: AnalyticsEvents[Name]
): void {
  if (typeof window === "undefined") return;
  // script absent (variable non définie, bloqueur de publicité) : l'événement est ignoré
  window.umami?.track(name, data);
}
