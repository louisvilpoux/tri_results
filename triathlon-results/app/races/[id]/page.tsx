import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RaceEditions } from "@/components/races/race-editions";
import { RaceEventHeader } from "@/components/races/race-event-header";
import { RaceFormatCard } from "@/components/races/race-format-card";
import { ApiError, getRaceEvent } from "@/lib/api";
import { raceEventMetadata } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirections";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    return raceEventMetadata(await getRaceEvent(id));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("races", id);
    }
    return {}; // erreur d'API : la page affiche elle-même le message
  }
}

export default async function RacePage({ params }: PageProps) {
  const { id } = await params;

  let event;

  try {
    event = await getRaceEvent(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await redirectOrNotFound("races", id);
    }

    return (
      <div className="rounded-xl border border-red-200 bg-white p-8">
        <h1 className="text-xl font-bold text-red-600">Impossible de charger la course</h1>
        <p className="mt-2 text-sm text-gray-500">
          Vérifie que ton API FastAPI est démarrée et que son adresse est correctement configurée.
        </p>
        <p className="mt-3 text-xs text-gray-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
      >
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <RaceEventHeader event={event} />

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Formats</h2>

        {event.formats.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {event.formats.map((raceFormat) => (
              <RaceFormatCard key={raceFormat.id} raceFormat={raceFormat} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500">
            Aucun résultat disponible pour cette course.
          </p>
        )}
      </section>

      <RaceEditions editions={event.editions} currentYear={event.year_epreuve} />
    </div>
  );
}
