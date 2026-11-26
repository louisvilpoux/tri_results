"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, TriangleAlert } from "lucide-react";

import { ChoiceGroup } from "@/components/shared/choice-group";
import { LineChart } from "@/components/shared/line-chart";
import { capitalize, formatShortDate } from "@/lib/format";
import { formatGap, shortDuration, signedGap, toSeconds } from "@/lib/time";
import type { AthleteProgression, ProgressionRace, ProgressionSeries } from "@/types/athlete";

const LINE_COLOR = "#FC6B32";

// Étendue minimale des axes (U8 du retour utilisateur du 23/11/2026) : passer du top 3 % au top
// 4 % ne doit pas tracer une chute sur toute la hauteur du graphique.
const RANK_MIN_SPAN = 20; // points de pourcentage
const GAP_MIN_SPAN = 10 * 60; // 10 minutes autour de la médiane

/** Graduation du classement : « 0 % » pour la référence, « 6 % » sinon. */
function rankTick(value: number): string {
  return value <= 0 ? "0 %" : `${Math.max(1, Math.ceil(value))} %`;
}

function seriesKey(series: ProgressionSeries): string {
  return `${series.type_epreuve}|${series.format_epreuve}`;
}

function mostRun(series: ProgressionSeries[]): ProgressionSeries {
  return series.reduce((best, item) => (item.courses.length > best.courses.length ? item : best));
}

function seriesLabel(series: ProgressionSeries): string {
  return `${capitalize(series.type_epreuve)} ${series.format_epreuve}`;
}

/** Classement en pourcentage : 12e sur 200 → « Top 6 % » (arrondi au-dessus, au moins 1 %). */
function topPercent(share: number): string {
  return `Top ${Math.max(1, Math.ceil(share * 100))} %`;
}

function raceName(race: ProgressionRace): string {
  return `${race.name_epreuve} ${race.date ? formatShortDate(race.date) : race.year}`;
}

/**
 * Bloc « Progression » du profil (GET /athletes/{id}/progression) : pour un format couru au
 * moins deux fois, temps de natation, vélo, course à pied et classement en pourcentage à chaque
 * course, au fil des saisons ; puis comparaison des éditions d'une même course.
 */
export function AthleteProgressionBlock({ progression }: { progression: AthleteProgression }) {
  // Les formats arrivent dans l'ordre des disciplines puis des distances (XS → XXL) ; le plus
  // couru est affiché par défaut (le premier dans cet ordre en cas d'égalité).
  const [selectedKey, setSelectedKey] = useState(() => seriesKey(mostRun(progression.series)));
  // course choisie sur un graphique, montrée sur tous (U9)
  const [selectedRace, setSelectedRace] = useState<number | null>(null);
  const series =
    progression.series.find((item) => seriesKey(item) === selectedKey) ?? progression.series[0];
  if (!series) return null;

  const races = series.courses;
  const labels = races.map((race) => race.year);
  const names = races.map(raceName);
  const last = races.length - 1;
  // courses dont les temps intermédiaires de la source ont été retirés (incohérents, D12)
  const retired = races.filter((race) => race.segments_retires);
  const retiredCount = retired.length;
  const retiredNames = retired.map((race) => `${race.name_epreuve} ${race.year}`).join(", ");

  return (
    <section className="space-y-4" aria-labelledby="progression-titre">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="progression-titre"
            className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            <TrendingUp size={22} aria-hidden className="text-[#FC6B32]" />
            Progression
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {races.length} courses classées en {seriesLabel(series)}, de la plus ancienne à la
            plus récente.
          </p>
        </div>
        {progression.series.length > 1 && (
          <ChoiceGroup
            label="Format"
            options={progression.series.map((item) => ({
              value: seriesKey(item),
              label: seriesLabel(item),
            }))}
            selected={seriesKey(series)}
            onSelect={(key) => {
              setSelectedKey(key);
              setSelectedRace(null);
            }}
          />
        )}
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {series.segments.map((segment) => (
            <ChartCard key={segment.key} title={segment.label}>
              <LineChart
                labels={labels}
                pointNames={names}
                highlight={last}
                selected={selectedRace}
                onSelectedChange={setSelectedRace}
                lines={[
                  {
                    label: segment.label,
                    color: LINE_COLOR,
                    values: races.map((race) => toSeconds(race.segments[segment.key])),
                  },
                ]}
                height={140}
                format={shortDuration}
                compact
              />
            </ChartCard>
          ))}
          <ChartCard title="Classement (top %)">
            <LineChart
              labels={labels}
              pointNames={names}
              highlight={last}
              selected={selectedRace}
              onSelectedChange={setSelectedRace}
              lines={[
                {
                  label: "Classement",
                  color: LINE_COLOR,
                  values: races.map((race) =>
                    race.pourcentage === null ? null : race.pourcentage * 100
                  ),
                },
              ]}
              height={140}
              format={(value) => topPercent(value / 100)}
              tickFormat={rankTick}
              compact
              minSpan={RANK_MIN_SPAN}
              reference={0}
            />
          </ChartCard>
        </div>

        {retiredCount > 0 && series.segments.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
            {retiredCount === 1
              ? "1 course n’a pas de point sur les graphiques de segments : "
              : `${retiredCount} courses n’ont pas de point sur les graphiques de segments : `}
            leurs temps intermédiaires publiés par la source sont incohérents (
            {retiredNames}) et ne sont pas utilisés. Le classement est cependant bien pris en compte.
          </p>
        )}

        <p className="text-xs text-gray-400">
          Sur tous les graphiques, plus bas = plus rapide ou mieux classé. Les temps d’une course
          à l’autre ne sont pas directement comparables (parcours, distances réelles,
          conditions) : le classement en pourcentage (place / classés) est le repère le plus
          fiable.
        </p>

        {series.memes_courses.length > 0 && (
          <SameRace key={seriesKey(series)} series={series} />
        )}
      </div>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#F5F6F8] p-3">
      <p className="text-xs font-semibold text-[#17202E]">{title}</p>
      {children}
    </div>
  );
}

/**
 * Comparaison des éditions d'une même course : temps, écarts avec la participation
 * précédente, place et écart à la médiane de l'édition (qui corrige l'effet d'un parcours ou
 * d'une météo différents).
 */
function SameRace({ series }: { series: ProgressionSeries }) {
  const [name, setName] = useState(series.memes_courses[0].name_epreuve);
  const [selectedEdition, setSelectedEdition] = useState<number | null>(null);
  const races = series.courses.filter((race) => race.name_epreuve === name);
  const labels = races.map((race) => race.year);
  const names = races.map(raceName);

  return (
    <div className="space-y-3 border-t border-gray-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold tracking-tight">Même course</h3>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <span className="sr-only">Course</span>
          <select
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSelectedEdition(null);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#17202E]"
          >
            {series.memes_courses.map((repeated) => (
              <option key={repeated.name_epreuve} value={repeated.name_epreuve}>
                {repeated.name_epreuve} ({repeated.editions} éditions)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 pr-3 font-semibold">Édition</th>
              <th className="py-2 pr-3 text-right font-semibold">Total</th>
              {series.segments.map((segment) => (
                <th key={segment.key} className="py-2 pr-3 text-right font-semibold">
                  {segment.label}
                </th>
              ))}
              <th className="py-2 pr-3 text-right font-semibold">Place</th>
              <th className="py-2 text-right font-semibold">Écart à la médiane</th>
            </tr>
          </thead>
          <tbody>
            {races.map((race, index) => {
              const previous = index > 0 ? races[index - 1] : null;
              return (
                <tr key={race.race_id} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/races/${race.race_id}/results`}
                      className="font-semibold text-[#17202E] hover:text-[#FC6B32]"
                    >
                      {race.year}
                    </Link>
                  </td>
                  <TimeCell value={race.total} previous={previous?.total ?? null} />
                  {series.segments.map((segment) => (
                    <TimeCell
                      key={segment.key}
                      value={race.segments[segment.key] ?? null}
                      previous={previous?.segments[segment.key] ?? null}
                    />
                  ))}
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {race.clt} / {race.classes}
                    {race.pourcentage !== null && (
                      <span className="block text-xs text-gray-400">
                        {topPercent(race.pourcentage)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {race.ecart_mediane === null ? "—" : formatGap(race.ecart_mediane)}
                    {race.mediane && (
                      <span className="block font-sans text-xs text-gray-400">
                        médiane {race.mediane}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title="Classement (top %)">
          <LineChart
            labels={labels}
            pointNames={names}
            highlight={races.length - 1}
            selected={selectedEdition}
            onSelectedChange={setSelectedEdition}
            lines={[
              {
                label: "Classement",
                color: LINE_COLOR,
                values: races.map((race) =>
                  race.pourcentage === null ? null : race.pourcentage * 100
                ),
              },
            ]}
            height={140}
            format={(value) => topPercent(value / 100)}
            tickFormat={rankTick}
            compact
            minSpan={RANK_MIN_SPAN}
            reference={0}
          />
        </ChartCard>
        <ChartCard title="Écart à la médiane">
          <LineChart
            labels={labels}
            pointNames={names}
            highlight={races.length - 1}
            selected={selectedEdition}
            onSelectedChange={setSelectedEdition}
            lines={[
              {
                label: "Écart à la médiane",
                color: LINE_COLOR,
                values: races.map((race) => race.ecart_mediane),
              },
            ]}
            height={140}
            format={(value) => formatGap(Math.round(value))}
            tickFormat={(value) =>
              Math.round(value) === 0 ? "méd." : formatGap(Math.round(value))
            }
            compact
            minSpan={GAP_MIN_SPAN}
            reference={0}
          />
        </ChartCard>
      </div>
    </div>
  );
}

/** Temps et écart avec la participation précédente (en dessous, en petit). */
function TimeCell({ value, previous }: { value: string | null; previous: string | null }) {
  const gap = signedGap(value, previous);
  return (
    <td className="py-2 pr-3 text-right font-mono tabular-nums">
      {value ?? "—"}
      {gap && <span className="block text-xs text-gray-400">{gap}</span>}
    </td>
  );
}
