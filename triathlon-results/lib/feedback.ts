/**
 * Retours des utilisateurs (bug, donnée fausse, idée, avis), envoyés par e-mail par
 * POST /api/feedback (`app/api/feedback/route.ts`). Partagé par le formulaire et la route.
 */

export const FEEDBACK_KINDS = ["bug", "donnee", "idee", "avis"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug",
  donnee: "Donnée fausse",
  idee: "Idée",
  avis: "Avis général",
};

export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 2000;

/** Corps de POST /api/feedback. */
export interface FeedbackPayload {
  kind: FeedbackKind;
  message: string;
  /** Facultatif : pour répondre à l'utilisateur. */
  email: string;
  /** Adresse complète de la page (paramètres compris, ex. une simulation « Et moi ? »). */
  page: string;
  /** Ce qui est signalé quand le formulaire part d'une page précise (épreuve, athlète). */
  context: string;
  /** Largeur de la fenêtre, pour savoir si le retour vient d'un mobile. */
  viewport: string;
  /** Champ piège invisible : un robot le remplit, un humain non. */
  website: string;
}

/** Ce qu'un lien « Signaler une erreur » pré-remplit. */
export interface FeedbackPreset {
  kind: FeedbackKind;
  context: string;
}
