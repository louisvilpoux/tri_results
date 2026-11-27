import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  type FeedbackPayload,
} from "@/lib/feedback";

/**
 * POST /api/feedback : envoie par e-mail un retour d'utilisateur (bug, donnée fausse, idée, avis)
 * avec l'API transactionnelle de Brevo (https://developers.brevo.com/reference/sendtransacemail).
 *
 * Variables d'environnement (serveur uniquement, voir deploiement.md) :
 * - BREVO_API_KEY : clé API Brevo ;
 * - FEEDBACK_TO : adresse qui reçoit les retours ;
 * - FEEDBACK_FROM : expéditeur validé dans Brevo (Senders, domains & dedicated IPs).
 * Sans ces variables, en développement, le retour est seulement écrit dans la console du serveur ;
 * en production, la route répond 503.
 *
 * Anti-spam sans CAPTCHA : champ piège `website`, longueur limitée, et au plus
 * RATE_LIMIT_MAX envois par heure et par adresse IP.
 */

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const schema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(FEEDBACK_MESSAGE_MIN).max(FEEDBACK_MESSAGE_MAX),
  email: z.union([z.literal(""), z.email().max(200)]),
  page: z.string().max(2000),
  context: z.string().max(300),
  viewport: z.string().max(50),
  website: z.string().max(200),
});

// Envois récents par adresse IP. En mémoire : suffisant avec un seul conteneur, remis à zéro
// à chaque redéploiement.
const recentSends = new Map<string, number[]>();

function isRateLimited(ip: string, now: number): boolean {
  const recent = (recentSends.get(ip) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    recentSends.set(ip, recent);
    return true;
  }
  recentSends.set(ip, [...recent, now]);
  return false;
}

function clientIp(request: NextRequest): string {
  // Traefik (Coolify) ajoute l'adresse du visiteur en tête de X-Forwarded-For.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

function emailSubject(feedback: FeedbackPayload): string {
  const where = feedback.context || new URL(feedback.page, "http://ranked").pathname;
  return `[RANKED] ${FEEDBACK_KIND_LABELS[feedback.kind]} — ${where}`.slice(0, 200);
}

function emailText(feedback: FeedbackPayload, userAgent: string): string {
  const header = [`Type : ${FEEDBACK_KIND_LABELS[feedback.kind]}`];
  if (feedback.context) header.push(`Concerne : ${feedback.context}`);
  header.push(`Page : ${feedback.page || "inconnue"}`);
  header.push(`Réponse à : ${feedback.email || "non demandée"}`);

  const footer = [
    `Fenêtre : ${feedback.viewport || "inconnue"}`,
    `Navigateur : ${userAgent || "inconnu"}`,
  ];

  return [header.join("\n"), feedback.message, `—\n${footer.join("\n")}`].join("\n\n");
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ detail: "Requête invalide" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ detail: "Formulaire incomplet ou trop long" }, { status: 422 });
  }
  const feedback = parsed.data;

  // Robot : on fait comme si l'envoi avait réussi, sans rien envoyer.
  if (feedback.website) {
    return Response.json({ ok: true });
  }

  if (isRateLimited(clientIp(request), Date.now())) {
    return Response.json(
      { detail: "Trop de messages envoyés. Réessaie dans une heure." },
      { status: 429 }
    );
  }

  const subject = emailSubject(feedback);
  const text = emailText(feedback, request.headers.get("user-agent") ?? "");

  const apiKey = process.env.BREVO_API_KEY;
  const to = process.env.FEEDBACK_TO;
  const from = process.env.FEEDBACK_FROM;
  if (!apiKey || !to || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[feedback] envoi désactivé (variables Brevo absentes)\n${subject}\n${text}`);
      return Response.json({ ok: true });
    }
    console.error("[feedback] BREVO_API_KEY, FEEDBACK_TO ou FEEDBACK_FROM manquante");
    return Response.json({ detail: "Envoi indisponible" }, { status: 503 });
  }

  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "RANKED", email: from },
        to: [{ email: to }],
        ...(feedback.email && { replyTo: { email: feedback.email } }),
        subject,
        textContent: text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`[feedback] Brevo a répondu ${response.status} : ${await response.text()}`);
      return Response.json({ detail: "Envoi impossible" }, { status: 502 });
    }
  } catch (error) {
    console.error("[feedback] Brevo injoignable", error);
    return Response.json({ detail: "Envoi impossible" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
