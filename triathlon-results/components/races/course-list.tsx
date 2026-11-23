import Link from "next/link";
import { ChevronRight, Flag } from "lucide-react";

import { capitalize, formatDateRange } from "@/lib/format";
import type { CourseEdition, CourseHit } from "@/types/search";

/** Nombre d'années écrites sur une ligne ; les autres sont sur la page de l'édition. */
const MAX_YEARS = 8;

/**
 * Liste des courses (/races) : une ligne par course et non par édition (U13 du retour
 * utilisateur du 23/11/2026). Le nom mène à l'édition mise en avant (la plus récente, ou celle
 * de la saison filtrée) ; une puce par année mène à chaque édition.
 */
export function CourseList({ courses }: { courses: CourseHit[] }) {
  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {courses.map((course) => (
        <li key={course.name_epreuve ?? course.edition.id}>
          <CourseRow course={course} />
        </li>
      ))}
    </ul>
  );
}

function CourseRow({ course }: { course: CourseHit }) {
  const { edition, editions } = course;
  const href = `/races/${edition.id}`;
  const years = editions.map((item) => item.year_epreuve).filter(Boolean);
  const span =
    editions.length > 1 ? `${editions.length} éditions, ${years.at(-1)}–${years[0]}` : null;

  return (
    <div className="flex gap-4 px-5 py-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FC6B32]">
        <Flag size={18} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <Link
            href={href}
            className="block truncate font-semibold text-[#17202E] hover:text-[#FC6B32]"
          >
            {course.name_epreuve ?? "Course"}
          </Link>
          <p className="truncate text-sm text-gray-500">
            {[
              edition.date_start &&
                edition.date_end &&
                formatDateRange(edition.date_start, edition.date_end),
              course.lieu_epreuve,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {span && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-gray-400">{span}</span>
            {visibleEditions(editions, edition.id).map((item) => (
              <EditionChip
                key={item.id}
                edition={item}
                current={item.id === edition.id}
                courseName={course.name_epreuve}
              />
            ))}
            {editions.length > MAX_YEARS && (
              <Link href={href} className="text-xs font-semibold text-gray-400 hover:text-[#FC6B32]">
                +{editions.length - MAX_YEARS}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 flex-wrap content-start justify-end gap-1.5 sm:flex">
        {course.types.map((type) => (
          <span
            key={type}
            className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600"
          >
            {capitalize(type)}
          </span>
        ))}
      </div>

      <Link href={href} aria-hidden tabIndex={-1} className="self-center text-gray-300 hover:text-[#FC6B32]">
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}

/** Les années les plus récentes, en gardant toujours l'édition mise en avant. */
function visibleEditions(editions: CourseEdition[], currentId: number): CourseEdition[] {
  const shown = editions.slice(0, MAX_YEARS);
  if (shown.some((item) => item.id === currentId)) return shown;
  const current = editions.find((item) => item.id === currentId);
  return current ? [...shown.slice(0, MAX_YEARS - 1), current] : shown;
}

function EditionChip({
  edition,
  current,
  courseName,
}: {
  edition: CourseEdition;
  current: boolean;
  courseName: string | null;
}) {
  return (
    <Link
      href={`/races/${edition.id}`}
      aria-label={`${courseName ?? "Course"} ${edition.year_epreuve ?? ""}`}
      className={
        current
          ? "rounded-md bg-[#FC6B32] px-2 py-0.5 text-xs font-bold tabular-nums text-white"
          : "rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600 hover:bg-orange-50 hover:text-[#FC6B32]"
      }
    >
      {edition.year_epreuve}
    </Link>
  );
}
