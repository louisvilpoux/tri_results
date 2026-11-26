"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, User, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { clubHref } from "@/components/search/club-hit-list";
import { trackEvent, type AnalyticsEvents } from "@/lib/analytics";
import { capitalize } from "@/lib/format";
import type { SuggestFilters } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CourseHit, SuggestResponse, SuggestType } from "@/types/search";

/** Attente après la dernière frappe avant de demander des suggestions. */
const DEBOUNCE_MS = 250;
const MIN_LENGTH = 2;

interface SuggestInputProps {
  /** Suggestions demandées : tout (recherche globale), athlètes, courses ou clubs (listes). */
  type: SuggestType;
  /** Nom du paramètre envoyé par le formulaire (`q` par défaut, `club` pour le champ Club). */
  name?: string;
  /** Filtres de la page gardés dans le lien d'un club suggéré (page Athlètes). */
  clubLinkFilters?: Record<string, string | null>;
  /** Appelé à chaque frappe (le champ Club suit ainsi les modifications du nom). */
  onValueChange?: (value: string) => void;
  /** Filtres déjà appliqués sur la liste, repris par les suggestions. */
  filters?: SuggestFilters;
  defaultValue?: string;
  autoFocus?: boolean;
  /** Le champ est requis (recherche globale) ; vide, il retire le filtre (listes). */
  required?: boolean;
  id?: string;
  placeholder: string;
  ariaLabel?: string;
  /** Dernière ligne « Voir tous les résultats pour « … » » vers /search. */
  showSearchLink?: boolean;
  /** Bloc qui contient le champ et la liste (positionné). */
  className?: string;
  inputClassName: string;
  /** Position et largeur de la liste sous le champ. */
  panelClassName: string;
  /** Éléments placés après le champ, par-dessus (icône, bouton). */
  children?: ReactNode;
}

interface Option {
  href: string;
  /** Sorte de suggestion, pour la mesure d'audience (lib/analytics.ts). */
  kind: AnalyticsEvents["suggestion_open"]["kind"];
  content: ReactNode;
  /** Titre du groupe (« Athlètes », « Clubs », « Courses ») sur sa première suggestion. */
  group?: string;
}

/**
 * Champ `q` avec suggestions pendant la saisie (U4 du retour utilisateur du 23/11/2026), pour
 * un formulaire GET : à partir de 2 caractères et 250 ms sans frappe, 5 athlètes et/ou 5
 * courses, et dans la recherche globale 3 clubs au plus (GET /api/suggest, relais de
 * GET /suggest) ; un club ouvre la liste de ses athlètes. Clavier : ↑ ↓ parcourent les
 * suggestions, Entrée ouvre celle choisie (sinon envoie le formulaire, avec ses autres
 * filtres), Échap ferme. Modèle « combobox » d'ARIA. Sans JavaScript, le formulaire fonctionne
 * comme un champ ordinaire.
 */
export function SuggestInput({
  type,
  name = "q",
  clubLinkFilters,
  onValueChange,
  filters,
  defaultValue,
  autoFocus,
  required,
  id,
  placeholder,
  ariaLabel,
  showSearchLink = false,
  className,
  inputClassName,
  panelClassName,
  children,
}: SuggestInputProps) {
  const router = useRouter();
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<SuggestResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  const enabled = query.length >= MIN_LENGTH;
  // filtres en texte stable, pour ne relancer la requête que s'ils changent
  const filterParams = new URLSearchParams(
    Object.entries(filters ?? {}).filter((entry): entry is [string, string] => !!entry[1])
  ).toString();

  // Une requête par pause dans la frappe ; la précédente est annulée, pour qu'une réponse
  // ancienne ne remplace jamais une plus récente.
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams(filterParams);
        params.set("q", query);
        params.set("type", type);
        const response = await fetch(`/api/suggest?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        setSuggestions((await response.json()) as SuggestResponse);
        setActive(-1);
      } catch {
        // requête annulée ou API indisponible : le champ reste un champ ordinaire
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled, type, filterParams]);

  const current = enabled && suggestions !== null ? suggestions : null;
  const words = searchWords(query);
  const athletes = current?.athletes ?? [];
  const clubs = current?.clubs ?? [];
  const courses = current?.courses ?? [];
  // titre de groupe seulement quand plusieurs sortes de suggestions sont possibles
  const groupTitle = (title: string, index: number) =>
    type === "all" && index === 0 ? title : undefined;
  const options: Option[] = [
    ...athletes.map((athlete, index) => ({
      group: groupTitle("Athlètes", index),
      href: `/athletes/${athlete.id}`,
      kind: "athlete" as const,
      content: (
        <SuggestionRow
          icon={<User size={15} aria-hidden />}
          title={<Highlight text={athlete.nom ?? "Athlète"} words={words} />}
          detail={[
            athlete.club,
            `${athlete.nb_races} course${athlete.nb_races > 1 ? "s" : ""}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ),
    })),
    ...clubs.map((club, index) => ({
      group: groupTitle("Clubs", index),
      href: clubHref(club.club, clubLinkFilters),
      kind: "club" as const,
      content: (
        <SuggestionRow
          icon={<Users size={15} aria-hidden />}
          title={<Highlight text={club.club} words={words} />}
          detail={`${club.nb_athletes.toLocaleString("fr-FR")} athlètes`}
        />
      ),
    })),
    ...courses.map((course, index) => ({
      group: groupTitle("Courses", index),
      href: `/races/${course.edition.id}`,
      kind: "race" as const,
      content: (
        <SuggestionRow
          icon={<Flag size={15} aria-hidden />}
          title={<Highlight text={course.name_epreuve ?? "Course"} words={words} />}
          detail={
            <>
              {course.lieu_epreuve && <Highlight text={course.lieu_epreuve} words={words} />}
              {course.lieu_epreuve && " · "}
              {editionText(course)}
              {course.types.length > 0 && ` · ${course.types.map(capitalize).join(", ")}`}
            </>
          }
        />
      ),
    })),
    ...(showSearchLink
      ? [
          {
            href: `/search?${new URLSearchParams({ q: query })}`,
            kind: "search" as const,
            content: (
              <span className="block px-3 py-2.5 text-sm font-semibold text-[#FC6B32]">
                Voir tous les résultats pour « {query} »
              </span>
            ),
          },
        ]
      : []),
  ];
  const empty = athletes.length === 0 && clubs.length === 0 && courses.length === 0;
  const expanded = open && current !== null;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (expanded) event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!current || options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      // -1 : retour au champ, sans suggestion choisie
      setActive((index) => ((index + 1 + step + options.length + 1) % (options.length + 1)) - 1);
    } else if (event.key === "Enter") {
      if (expanded && active >= 0) {
        event.preventDefault();
        trackEvent("suggestion_open", { kind: options[active].kind });
        router.push(options[active].href);
      }
      // sans suggestion choisie, Entrée envoie le formulaire
      close();
    }
  }

  return (
    <div
      className={cn("relative", className)}
      onBlur={() => {
        // laisse le temps à un clic sur une suggestion d'être pris en compte
        blurTimer.current = setTimeout(close, 150);
      }}
      onFocus={() => clearTimeout(blurTimer.current)}
    >
      <input
        id={id}
        type="search"
        name={name}
        required={required}
        minLength={MIN_LENGTH}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={inputClassName}
      />
      {children}

      <div
        className={cn(
          "absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white text-left font-normal text-[#17202E] shadow-xl",
          panelClassName,
          !expanded && "hidden"
        )}
      >
        <ul id={listId} role="listbox" aria-label="Suggestions" className="py-1">
          {options.map((option, index) => (
            <li
              key={option.href}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              className={cn(
                index > 0 && option.group && "border-t border-gray-100",
                showSearchLink && index === options.length - 1 && "border-t border-gray-100",
                index === active && "bg-orange-50"
              )}
            >
              {option.group && <GroupLabel>{option.group}</GroupLabel>}
              <Link
                href={option.href}
                tabIndex={-1}
                onClick={() => {
                  trackEvent("suggestion_open", { kind: option.kind });
                  close();
                }}
                onMouseEnter={() => setActive(index)}
                className="block hover:bg-orange-50"
              >
                {option.content}
              </Link>
            </li>
          ))}
        </ul>
        {empty && (
          <p className="border-t border-gray-100 px-3 py-2.5 text-sm text-gray-500">
            {type === "athletes"
              ? "Aucun athlète ne correspond."
              : type === "courses"
                ? "Aucune course ne correspond."
                : type === "clubs"
                ? "Aucun club ne correspond (clubs d’au moins 3 athlètes)."
                : "Aucun athlète, club ni course ne correspond."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Éditions d'une course suggérée et celle que le lien ouvre : la dernière, ou celle de la
 * saison filtrée sur la page Courses (« 10 éditions, édition 2017 »).
 */
function editionText(course: CourseHit): string | null {
  const year = course.edition.year_epreuve;
  if (course.editions.length <= 1) return year;
  const isLatest = course.editions[0].id === course.edition.id;
  return `${course.editions.length} éditions, ${isLatest ? "dernière en" : "édition"} ${year}`;
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="block px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-gray-400"
    >
      {children}
    </span>
  );
}

function SuggestionRow({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
}) {
  return (
    <span className="flex items-center gap-3 px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FC6B32]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-gray-500">{detail}</span>
      </span>
    </span>
  );
}

/** Mots saisis, découpés comme côté API (tirets, apostrophes, virgules, espaces). */
function searchWords(query: string): string[] {
  return normalize(query)
    .split(/[-‐‑‒–—−'‘’_,\s]+/)
    .filter(Boolean);
}

/** Minuscules sans accents, caractère par caractère (même longueur que le texte). */
function normalize(text: string): string {
  return Array.from(text, (char) => {
    const plain = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return plain.length === 1 ? plain : char.toLowerCase();
  }).join("");
}

/** Texte avec les mots saisis en gras, sans tenir compte des accents ni des majuscules. */
function Highlight({ text, words }: { text: string; words: string[] }) {
  const chars = Array.from(text);
  const plain = normalize(text);
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const word of words) {
    let from = plain.indexOf(word);
    while (from >= 0) {
      marked.fill(true, from, from + word.length);
      from = plain.indexOf(word, from + word.length);
    }
  }
  const parts: { text: string; bold: boolean }[] = [];
  chars.forEach((char, index) => {
    const last = parts.at(-1);
    if (last && last.bold === marked[index]) last.text += char;
    else parts.push({ text: char, bold: marked[index] });
  });
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? (
          <strong key={index} className="font-extrabold text-[#FC6B32]">
            {part.text}
          </strong>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}
