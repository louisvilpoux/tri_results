"use client";

import { Dialog } from "@base-ui/react/dialog";
import { CheckCircle2, X } from "lucide-react";
import { useState, type FormEvent, type ReactElement } from "react";

import { FILTER_FIELD_CLASS } from "@/components/shared/filter-form";
import { trackEvent } from "@/lib/analytics";
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  type FeedbackKind,
  type FeedbackPayload,
  type FeedbackPreset,
} from "@/lib/feedback";

type Status = "idle" | "sending" | "sent" | "error";

const PLACEHOLDERS: Record<FeedbackKind, string> = {
  bug: "Ce que tu as fait, ce qui s'est passé, ce que tu attendais…",
  donnee: "Quel résultat, quel temps ou quelle catégorie est faux, et la bonne valeur si tu la connais…",
  idee: "Ce qui te manque sur PACE…",
  avis: "Ce que tu aimes, ce que tu n'aimes pas…",
};

/**
 * Fenêtre « Un avis ? Un bug ? » : le retour est envoyé par e-mail (POST /api/feedback), avec
 * l'adresse de la page en cours. `trigger` est l'élément qui l'ouvre (bouton flottant du layout ou
 * lien « Signaler une erreur ») ; `preset` choisit le type et dit ce qui est signalé.
 */
export function FeedbackDialog({
  trigger,
  preset,
}: {
  trigger: ReactElement;
  preset?: FeedbackPreset;
}) {
  const defaultKind = preset?.kind ?? "bug";
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function reset() {
    setKind(defaultKind);
    setMessage("");
    setEmail("");
    setWebsite("");
    setStatus("idle");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    const payload: FeedbackPayload = {
      kind,
      message,
      email: email.trim(),
      page: window.location.href,
      context: preset?.context ?? "",
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      website,
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail ?? "Envoi impossible");
      }
      setStatus("sent");
      trackEvent("feedback_sent", { kind });
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Envoi impossible");
    }
  }

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        // un message envoyé n'est plus affiché à la réouverture ; un brouillon est gardé
        if (!open && status === "sent") reset();
      }}
    >
      <Dialog.Trigger render={trigger} />

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#17202E]/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />

        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none transition-all data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-extrabold tracking-tight text-[#17202E]">
                {preset?.kind === "donnee" ? "Signaler une erreur" : "Un avis ? Un bug ?"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-500">
                {preset?.context
                  ? `Concerne : ${preset.context}`
                  : "Ton message nous arrive directement, avec la page où tu es."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-[#17202E]"
            >
              <X size={20} aria-hidden />
            </Dialog.Close>
          </div>

          {status === "sent" ? (
            <div className="mt-6 space-y-4 text-center">
              <CheckCircle2 size={40} aria-hidden className="mx-auto text-emerald-600" />
              <p className="font-semibold text-[#17202E]">Merci, ton message est bien parti.</p>
              {email && (
                <p className="text-sm text-gray-500">Nous te répondrons à {email.trim()}.</p>
              )}
              <Dialog.Close className="h-10 rounded-lg bg-[#FC6B32] px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600">
                Fermer
              </Dialog.Close>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-[#17202E]">Type</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FEEDBACK_KINDS.map((value) => (
                    <label
                      key={value}
                      className="cursor-pointer rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 has-checked:border-[#FC6B32] has-checked:bg-[#FC6B32] has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-[#FC6B32]/30"
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={value}
                        checked={kind === value}
                        onChange={() => setKind(value)}
                        className="sr-only"
                      />
                      {FEEDBACK_KIND_LABELS[value]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="text-sm font-semibold text-[#17202E]">Message</span>
                <textarea
                  required
                  minLength={FEEDBACK_MESSAGE_MIN}
                  maxLength={FEEDBACK_MESSAGE_MAX}
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={PLACEHOLDERS[kind]}
                  className={`${FILTER_FIELD_CLASS} mt-1.5 h-auto w-full resize-y py-2`}
                />
                <span className="mt-1 block text-right text-xs text-gray-400 tabular-nums">
                  {message.length} / {FEEDBACK_MESSAGE_MAX}
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#17202E]">
                  E-mail <span className="font-normal text-gray-400">(facultatif)</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="si tu veux une réponse"
                  autoComplete="email"
                  className={`${FILTER_FIELD_CLASS} mt-1.5 w-full`}
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Utilisé uniquement pour te répondre.
                </span>
              </label>

              {/* champ piège pour les robots, invisible et hors du parcours au clavier */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {status === "error" && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}. Réessaie dans un instant.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Dialog.Close className="h-10 rounded-lg px-4 text-sm font-semibold text-gray-500 hover:bg-gray-100">
                  Annuler
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="h-10 rounded-lg bg-[#FC6B32] px-5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                >
                  {status === "sending" ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
