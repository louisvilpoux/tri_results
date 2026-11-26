"use client";

import { Flag, MessageSquareText } from "lucide-react";

import { FeedbackDialog } from "@/components/feedback/feedback-dialog";

/** Bouton flottant « Un avis ? Un bug ? », présent sur toutes les pages (layout racine). */
export function FeedbackButton() {
  return (
    <FeedbackDialog
      trigger={
        <button
          type="button"
          aria-label="Un avis ? Un bug ?"
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-[#17202E] p-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#FC6B32] sm:px-4 sm:py-2.5"
        >
          <MessageSquareText size={18} aria-hidden />
          <span className="hidden sm:inline">Un avis ? Un bug ?</span>
        </button>
      }
    />
  );
}

/**
 * Lien « Signaler une erreur » d'une page précise (classement, profil) : la fenêtre s'ouvre sur
 * « Donnée fausse » et le message dit ce qui est signalé.
 */
export function ReportErrorButton({ context }: { context: string }) {
  return (
    <FeedbackDialog
      preset={{ kind: "donnee", context }}
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
        >
          <Flag size={16} aria-hidden />
          Signaler une erreur
        </button>
      }
    />
  );
}
