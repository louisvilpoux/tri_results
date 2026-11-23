"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown, RotateCcw } from "lucide-react";

import { SIMULATOR_PARAM_PREFIX } from "@/lib/simulator";
import { formatGap } from "@/lib/time";
import type { RaceTimes, TimedAthlete } from "@/types/race";


type SexeFilter = "" | "M" | "F";

/**
 * Temps saisi → secondes : « 1:35:00 » (h:mm:ss) ou « 95:00 », « 32:00 » (minutes:secondes).
 * null si la case est vide, undefined si le temps est mal écrit.
 */
function parseTime(text: string): number | null | undefined {
  const value = text.trim();
  if (!value) return null;
  const match = value.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return undefined;
  const parts = match.slice(1).filter((part) => part !== undefined).map(Number);
  if (parts.slice(1).some((part) => part > 59)) return undefined;
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
}

/** Nombre de valeurs strictement plus petites que `value` dans un tableau trié. */
function countFaster(sorted: number[], value: number): number {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function timesOf(athletes: TimedAthlete[], key: string): number[] {
  return athletes
    .map((athlete) => athlete[key])
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
}

interface Placement {
  label: string;
  place: number;
  count: number;
  /** Écarts en secondes au premier et à la médiane. */
  gapFirst: number;
  gapMedian: number;
}

/** Place d'un temps parmi des temps triés : 1 + nombre de classés plus rapides. */
function placement(label: string, sorted: number[], value: number): Placement | null {
  if (sorted.length === 0) return null;
  return {
    label,
    place: countFaster(sorted, value) + 1,
    count: sorted.length,
    gapFirst: value - sorted[0],
    gapMedian: value - sorted[Math.ceil(sorted.length / 2) - 1],
  };
}

/**
 * Bloc « Et moi ? » de la page classement : l'utilisateur saisit ses temps et voit où il se
 * serait classé, au général, dans chaque segment, chez les hommes ou les femmes et dans une
 * catégorie. Les temps des classés (GET /api/races/{id}/times) ne sont chargés qu'à l'ouverture ;
 * le calcul se fait ensuite dans le navigateur, à chaque frappe. Les temps saisis sont gardés
 * dans l'adresse (moi_swim=…) pour pouvoir partager la simulation.
 */
export function RaceSimulator({
  raceId,
  initialTimes,
}: {
  raceId: string;
  initialTimes: Record<string, string>;
}) {
  const [open, setOpen] = useState(Object.keys(initialTimes).length > 0);
  const [data, setData] = useState<RaceTimes | null>(null);
  const [failed, setFailed] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>(initialTimes);
  const [sexe, setSexe] = useState<SexeFilter>("");
  const [categorie, setCategorie] = useState("");

  useEffect(() => {
    if (!open || data || failed) return;
    fetch(`/api/races/${raceId}/times`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((times: RaceTimes) => setData(times))
      .catch(() => setFailed(true));
  }, [open, data, failed, raceId]);

  // Temps saisis gardés dans l'adresse, sans recharger la page.
  useEffect(() => {
    const url = new URL(window.location.href);
    [...url.searchParams.keys()]
      .filter((key) => key.startsWith(SIMULATOR_PARAM_PREFIX))
      .forEach((key) => url.searchParams.delete(key));
    Object.entries(inputs).forEach(([key, value]) => {
      if (value.trim()) url.searchParams.set(`${SIMULATOR_PARAM_PREFIX}${key}`, value.trim());
    });
    window.history.replaceState(null, "", url);
  }, [inputs]);

  return (
    <section className="space-y-4" aria-labelledby="simulateur-titre">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left hover:border-[#FC6B32]"
      >
        <span>
          <span
            id="simulateur-titre"
            className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            <Calculator size={22} aria-hidden className="text-[#FC6B32]" />
            Et moi ?
          </span>
          <span className="mt-1 block text-sm text-gray-500">
            Saisis tes temps pour voir où tu te serais classé dans cette épreuve.
          </span>
        </span>
        <ChevronDown
          size={20}
          aria-hidden
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
          {failed && <p className="text-sm text-red-600">Impossible de charger les temps.</p>}
          {!failed && !data && <p className="text-sm text-gray-500">Chargement des temps…</p>}
          {data && (
            <SimulatorBody
              data={data}
              inputs={inputs}
              setInputs={setInputs}
              sexe={sexe}
              setSexe={setSexe}
              categorie={categorie}
              setCategorie={setCategorie}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SimulatorBody({
  data,
  inputs,
  setInputs,
  sexe,
  setSexe,
  categorie,
  setCategorie,
}: {
  data: RaceTimes;
  inputs: Record<string, string>;
  setInputs: (inputs: Record<string, string>) => void;
  sexe: SexeFilter;
  setSexe: (sexe: SexeFilter) => void;
  categorie: string;
  setCategorie: (categorie: string) => void;
}) {
  // temps triés de chaque segment et du total, calculés une fois
  const sorted = useMemo(() => {
    const keys = ["total", ...data.segments.map((segment) => segment.key)];
    return Object.fromEntries(keys.map((key) => [key, timesOf(data.athletes, key)]));
  }, [data]);
  const byTotal = useMemo(
    () =>
      data.athletes
        .filter((athlete) => typeof athlete.total === "number")
        .sort((a, b) => (a.total as number) - (b.total as number) || a.clt - b.clt),
    [data]
  );
  const categories = useMemo(
    () =>
      [...new Set(data.athletes.map((athlete) => athlete.categorie).filter(Boolean))].sort() as
        string[],
    [data]
  );

  // dans l'ordre de la course : natation, T1, vélo, T2, course à pied
  const [t1, t2] = data.transitions;
  const fields =
    data.segments.length === 3 && t1 && t2
      ? [data.segments[0], t1, data.segments[1], t2, data.segments[2]]
      : [...data.segments, ...data.transitions];
  const parsed = Object.fromEntries(
    [...fields.map((field) => field.key), "total"].map((key) => [key, parseTime(inputs[key] ?? "")])
  );

  // Total : celui saisi, sinon la somme des segments quand tous sont remplis (transitions
  // comptées si elles le sont).
  const segmentsFilled = data.segments.every((segment) => typeof parsed[segment.key] === "number");
  const computedTotal =
    data.segments.length > 0 && segmentsFilled
      ? fields.reduce((sum, field) => sum + ((parsed[field.key] as number | null) ?? 0), 0)
      : null;
  const totalTyped = (inputs.total ?? "").trim() !== "";
  const total = totalTyped ? parsed.total : computedTotal;

  const setInput = (key: string, value: string) => setInputs({ ...inputs, [key]: value });
  const hasInput = Object.values(inputs).some((value) => value.trim() !== "");

  const rows: Placement[] = [];
  if (typeof total === "number") {
    const general = placement("Général", sorted.total, total);
    if (general) rows.push(general);
    if (sexe) {
      const subset = timesOf(
        data.athletes.filter((athlete) => athlete.sexe === sexe),
        "total"
      );
      const bySex = placement(sexe === "M" ? "Hommes" : "Femmes", subset, total);
      if (bySex) rows.push(bySex);
    }
    if (categorie) {
      const subset = timesOf(
        data.athletes.filter((athlete) => athlete.categorie === categorie),
        "total"
      );
      const byCategory = placement(`Catégorie ${categorie}`, subset, total);
      if (byCategory) rows.push(byCategory);
    }
  }
  for (const segment of data.segments) {
    const value = parsed[segment.key];
    if (typeof value === "number") {
      const row = placement(segment.label, sorted[segment.key], value);
      if (row) rows.push(row);
    }
  }

  const faster = typeof total === "number" ? countFaster(sorted.total, total) : 0;
  const ahead = typeof total === "number" && faster > 0 ? byTotal[faster - 1] : null;
  const behind = typeof total === "number" ? byTotal[faster] ?? null : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map((field) => (
          <TimeInput
            key={field.key}
            label={field.label}
            value={inputs[field.key] ?? ""}
            invalid={parsed[field.key] === undefined}
            onChange={(value) => setInput(field.key, value)}
          />
        ))}
        <TimeInput
          label={totalTyped || data.segments.length === 0 ? "Total" : "Total (calculé)"}
          value={totalTyped ? inputs.total : computedTotal !== null ? formatTime(computedTotal) : ""}
          placeholder={data.segments.length > 0 ? "automatique" : "hh:mm:ss"}
          invalid={totalTyped && parsed.total === undefined}
          onChange={(value) => setInput("total", value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-gray-500">
          Sexe
          <select
            value={sexe}
            onChange={(event) => setSexe(event.target.value as SexeFilter)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-semibold text-[#17202E]"
          >
            <option value="">—</option>
            <option value="M">Homme</option>
            <option value="F">Femme</option>
          </select>
        </label>
        {categories.length > 0 && (
          <label className="flex items-center gap-2 text-gray-500">
            Catégorie
            <select
              value={categorie}
              onChange={(event) => setCategorie(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-semibold text-[#17202E]"
            >
              <option value="">—</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
        {totalTyped && data.segments.length > 0 && (
          <button
            type="button"
            onClick={() => setInput("total", "")}
            className="text-xs font-semibold text-[#FC6B32] hover:underline"
          >
            Recalculer le total depuis les segments
          </button>
        )}
        {(hasInput || sexe || categorie) && (
          <button
            type="button"
            // vide les temps (et donc les paramètres moi_… de l'adresse), le sexe et la catégorie
            onClick={() => {
              setInputs({});
              setSexe("");
              setCategorie("");
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#FC6B32] hover:text-[#FC6B32]"
          >
            <RotateCcw size={14} aria-hidden />
            Réinitialiser
          </button>
        )}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-3 font-semibold" />
                <th className="py-2 pr-3 text-right font-semibold">Place</th>
                <th className="py-2 pr-3 text-right font-semibold">Top</th>
                <th className="py-2 pr-3 text-right font-semibold">Écart au premier</th>
                <th className="py-2 text-right font-semibold">Écart à la médiane</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-semibold text-[#17202E]">{row.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    <span className="font-bold">{row.place}ᵉ</span>
                    <span className="text-gray-400"> / {row.count}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {Math.max(1, Math.ceil((row.place / row.count) * 100))} %
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {formatGap(row.gapFirst)}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {formatGap(row.gapMedian)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Saisis un temps (ex. « 1:35:00 » ou « 32:00 ») pour voir ta place.
        </p>
      )}

      {(ahead || behind) && (
        <p className="text-sm text-gray-600">
          {ahead && (
            <>
              Juste devant : <Neighbour athlete={ahead} />
            </>
          )}
          {ahead && behind && " · "}
          {behind && (
            <>
              Juste derrière : <Neighbour athlete={behind} />
            </>
          )}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Comparaison avec les classés de cette édition (sans les temps suspects) : elle ne tient
        pas compte des conditions du jour ni des écarts de parcours.
      </p>
    </>
  );
}

function TimeInput({
  label,
  value,
  invalid,
  placeholder = "hh:mm:ss",
  onChange,
}: {
  label: string;
  value: string;
  invalid: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-gray-500">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        aria-invalid={invalid}
        className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm text-[#17202E] ${
          invalid ? "border-red-400" : "border-gray-200"
        }`}
      />
      {invalid && <span className="mt-1 block font-normal text-red-600">Format : 1:35:00</span>}
    </label>
  );
}

function Neighbour({ athlete }: { athlete: TimedAthlete }) {
  const time = typeof athlete.total === "number" ? formatTime(athlete.total) : "";
  const label = `${athlete.clt}ᵉ ${athlete.nom}`;
  return (
    <span className="whitespace-nowrap">
      {athlete.athlete_id ? (
        <Link
          href={`/athletes/${athlete.athlete_id}`}
          className="font-semibold text-[#17202E] hover:text-[#FC6B32]"
        >
          {label}
        </Link>
      ) : (
        <span className="font-semibold text-[#17202E]">{label}</span>
      )}{" "}
      <span className="font-mono tabular-nums text-gray-500">{time}</span>
    </span>
  );
}
