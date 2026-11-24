import { CalendarDays, Layers, MapPin } from "lucide-react";

import { RaceEditions } from "@/components/races/race-editions";
import { formatDateRange } from "@/lib/format";
import type { RaceEvent } from "@/types/race";

export function RaceEventHeader({ event }: { event: RaceEvent }) {
  const formatCount = event.formats.length;

  return (
    <section className="rounded-2xl bg-[#17202E] p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FC6B32]">
            Course{event.year_epreuve && ` · Édition ${event.year_epreuve}`}
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {event.name_epreuve ?? "Course"}
          </h1>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
            {event.date_start && event.date_end && (
              <span className="flex items-center gap-2">
                <CalendarDays size={16} aria-hidden />
                {formatDateRange(event.date_start, event.date_end)}
              </span>
            )}

            {event.lieu_epreuve && (
              <span className="flex items-center gap-2">
                <MapPin size={16} aria-hidden />
                {event.lieu_epreuve}
              </span>
            )}

            <span className="flex items-center gap-2">
              <Layers size={16} aria-hidden />
              {formatCount} format{formatCount > 1 && "s"}
            </span>
          </div>

          <div className="mt-5">
            <RaceEditions editions={event.editions} currentYear={event.year_epreuve} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 p-5 sm:min-w-40">
          <p className="text-xs font-medium text-gray-300">Participants</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{event.participants}</p>
        </div>
      </div>
    </section>
  );
}
