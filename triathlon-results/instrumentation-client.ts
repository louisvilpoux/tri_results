import * as Sentry from "@sentry/nextjs";

/**
 * Suivi des erreurs JavaScript du navigateur avec Sentry, chargé avant l'application.
 *
 * Inactif sans NEXT_PUBLIC_SENTRY_DSN (lue au build) : rien n'est envoyé en développement.
 * Pas de cookie ni de replay de session : seules les erreurs et un échantillon des temps de
 * chargement et de navigation sont envoyés.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  // ni adresse IP, ni cookies, ni en-têtes, ni corps de requête des visiteurs dans Sentry
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
});

/** Mesure de chaque navigation entre pages (performance dans Sentry). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
