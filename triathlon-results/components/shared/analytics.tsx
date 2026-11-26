"use client";

import Script from "next/script";
import { useEffect } from "react";

import {
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
  trackEvent,
  type AnalyticsEventName,
  type AnalyticsEvents,
} from "@/lib/analytics";

/** Script Umami, placé dans le layout racine ; rien sans NEXT_PUBLIC_UMAMI_WEBSITE_ID. */
export function AnalyticsScript() {
  if (!UMAMI_WEBSITE_ID) return null;
  return (
    <Script src={UMAMI_SCRIPT_URL} data-website-id={UMAMI_WEBSITE_ID} strategy="afterInteractive" />
  );
}

/**
 * Envoie un événement à l'affichage, depuis une page rendue côté serveur (la page de recherche,
 * par exemple). Un nouvel envoi a lieu quand les données changent.
 */
export function TrackEvent<Name extends AnalyticsEventName>({
  name,
  data,
}: {
  name: Name;
  data: AnalyticsEvents[Name];
}) {
  const key = JSON.stringify(data);
  useEffect(() => {
    if (!UMAMI_WEBSITE_ID) return;
    // Le script Umami se charge après l'hydratation : on attend qu'il soit prêt.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.umami || attempts >= 20) {
        window.clearInterval(timer);
        trackEvent(name, JSON.parse(key) as AnalyticsEvents[Name]);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [name, key]);
  return null;
}
