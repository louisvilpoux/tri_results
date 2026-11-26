import * as Sentry from "@sentry/nextjs";

/**
 * Suivi des erreurs côté serveur (rendu des pages, routes /api, proxy) avec Sentry.
 *
 * Inactif sans la variable SENTRY_DSN : rien n'est envoyé en développement. Le même DSN que le
 * navigateur (NEXT_PUBLIC_SENTRY_DSN) convient. Voir instrumentation-client.ts pour le navigateur.
 */
export function register(): void {
  const dsn = process.env.SENTRY_DSN;
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    // ni adresse IP, ni cookies, ni en-têtes, ni corps de requête des visiteurs dans Sentry
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
  });
}

/** Erreurs levées pendant le rendu ou dans une route : transmises à Sentry. */
export const onRequestError = Sentry.captureRequestError;
