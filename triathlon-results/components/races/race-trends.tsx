"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";

import { ChoiceGroup } from "@/components/shared/choice-group";
import { capitalize } from "@/lib/format";
import type { EditionSummary, RaceTrends, TrendSeries } from "@/types/race";

type SexeFilter = "tous" | "M" | "F";

const SEXE_LABELS: Record<SexeFilter, string> = { tous: "Tous", M: "Hommes", F: "Femmes" };

const MEDIAN_COLOR = "#FC6B32";
const TOP10_COLOR = "#17202E";

function seriesKey(series: TrendSeries): string {
  return `${series.type_epreuve}|${series.format_epreuve}`;
}

function seriesLabel(series: TrendSeries): string {
  return `${capitalize(series.type_epreuve)} ${series.format_epreuve}`;
}

function toSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Durée lisible pour les axes : « 5h29 », « 34 min ». */
function shortDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}

/** Écart avec l'édition précédente : « +2:13 », « −0:58 », « +1:02:05 ». */
function signedGap(current: string | null, previous: string | null): string | null {
  const a = toSeconds(current);
  const b = toSeconds(previous);
  if (a === null || b === null) return null;
  const gap = Math.abs(a - b);
  const hours = Math.floor(gap / 3600);
  const minutes = Math.floor((gap % 3600) / 60);
  const seconds = String(gap % 60).padStart(2, "0");
  const value =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
      : `${minutes}:${seconds}`;
  return a === b ? "=" : `${a > b ? "+" : "−"}${value}`;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)} %`;
}

/**
 * Bloc « Tendances » de la page course : pour une discipline et un format, médiane et top 10 %
 * du temps total, médiane de chaque segment et part de classés, édition par édition
 * (GET /races/{id}/trends).
 */
export function RaceTrendsBlock({
  trends,
  currentYear,
  initialKey,
}: {
  trends: RaceTrends;
  currentYear: string | null;
  initialKey?: string;
}) {
  const [selectedKey, setSelectedKey] = useState(initialKey ?? seriesKey(trends.series[0]));
  const [sexe, setSexe] = useState<SexeFilter>("tous");

  const series =
    trends.series.find((item) => seriesKey(item) === selectedKey) ?? trends.series[0];
  if (!series) return null;

  const years = series.editions.map((edition) => edition.year);
  const summaries: EditionSummary[] = series.editions.map((edition) => edition[sexe]);
  const hasBothSexes = series.editions.some(
    (edition) => edition.M.classes > 0 && edition.F.classes > 0
  );

  return (
    <section className="space-y-4" aria-labelledby="tendances-titre">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="tendances-titre"
            className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            <TrendingUp size={22} aria-hidden className="text-[#FC6B32]" />
            Tendances
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {series.editions.length} éditions de {seriesLabel(series)}, sur les classés avec un
            temps.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasBothSexes && (
            <ChoiceGroup
              label="Sexe"
              options={(["tous", "M", "F"] as SexeFilter[]).map((value) => ({
                value,
                label: SEXE_LABELS[value],
              }))}
              selected={sexe}
              onSelect={setSexe}
            />
          )}
          {trends.series.length > 1 && (
            <ChoiceGroup
              label="Format"
              options={trends.series.map((item) => ({
                value: seriesKey(item),
                label: seriesLabel(item),
              }))}
              selected={seriesKey(series)}
              onSelect={setSelectedKey}
            />
          )}
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500">Temps total par édition</p>
            <Legend
              items={[
                { label: "Médiane", color: MEDIAN_COLOR },
                { label: "Top 10 %", color: TOP10_COLOR },
              ]}
            />
          </div>
          <LineChart
            years={years}
            currentYear={currentYear}
            height={220}
            lines={[
              {
                label: "Médiane",
                color: MEDIAN_COLOR,
                values: summaries.map((summary) => toSeconds(summary.mediane)),
              },
              {
                label: "Top 10 %",
                color: TOP10_COLOR,
                values: summaries.map((summary) => toSeconds(summary.top10)),
              },
            ]}
            format={shortDuration}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">
            Segments (médianes) par édition
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {series.segments.map((segment) => (
              <SmallChart
                key={segment.key}
                title={segment.label}
                years={years}
                currentYear={currentYear}
                values={summaries.map((summary) => toSeconds(summary.segments[segment.key]))}
                format={shortDuration}
              />
            ))}
          </div>
        </div>

        <EditionsTable series={series} summaries={summaries} currentYear={currentYear} />

        <p className="text-xs text-gray-400">
          Une évolution peut venir d’un changement de parcours ou de la météo, pas seulement du
          niveau des participants ; les éditions peuvent venir de sources différentes.
        </p>
      </div>
    </section>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex gap-4 text-xs text-gray-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartLine {
  label: string;
  color: string;
  values: (number | null)[];
}

/**
 * Courbes en SVG, sans bibliothèque : une colonne par édition (espacement régulier, même si des
 * années manquent), axe vertical ajusté aux valeurs. Une édition sans valeur coupe la courbe.
 * L'édition affichée sur la page est soulignée.
 */
function LineChart({
  years,
  currentYear,
  lines,
  height,
  format,
  compact = false,
}: {
  years: string[];
  currentYear: string | null;
  lines: ChartLine[];
  height: number;
  format: (value: number) => string;
  compact?: boolean;
}) {
  // Le SVG est dessiné à la largeur réelle du conteneur (mesurée), pour que le texte garde
  // la même taille sur téléphone et sur grand écran.
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(compact ? 240 : 600);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const padding = compact
    ? { top: 10, right: 10, bottom: 20, left: 44 }
    : { top: 12, right: 16, bottom: 24, left: 52 };
  const values = lines
    .flatMap((line) => line.values)
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <p className="text-xs text-gray-400">Pas de donnée.</p>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const margin = (max - min) * 0.1 || Math.max(max * 0.05, 1);
  const low = min - margin;
  const high = max + margin;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  // marge de 12 px de part et d'autre, pour que les points ne touchent ni l'axe ni le bord
  const inset = 12;
  const x = (index: number) =>
    padding.left +
    inset +
    (years.length > 1
      ? (index / (years.length - 1)) * (innerWidth - 2 * inset)
      : (innerWidth - 2 * inset) / 2);
  const y = (value: number) => padding.top + (1 - (value - low) / (high - low)) * innerHeight;

  // graduations : du plus petit au plus grand temps (2 en petit format, 4 sinon)
  const ticks = compact
    ? [min, max]
    : [0, 1, 2, 3].map((step) => min + (step / 3) * (max - min));
  // Années écrites sous l'axe : l'édition affichée d'abord, puis la première, la dernière et
  // les autres, en sautant celles qui toucheraient une année déjà écrite (34 px d'écart).
  const yearCandidates = [
    years.indexOf(currentYear ?? ""),
    0,
    years.length - 1,
    ...(compact ? [] : years.map((_, index) => index)),
  ].filter((index, position, list) => index >= 0 && list.indexOf(index) === position);
  // centre du texte : la première année part de son point vers la droite, la dernière
  // vers la gauche
  const labelCenter = (index: number) =>
    x(index) + (index === 0 ? 14 : index === years.length - 1 ? -14 : 0);
  const shownYears = new Set<number>();
  for (const index of yearCandidates) {
    const farEnough = [...shownYears].every(
      (shown) => Math.abs(labelCenter(shown) - labelCenter(index)) >= 34
    );
    if (farEnough) shownYears.add(index);
  }
  const showYear = (_year: string, index: number) => shownYears.has(index);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block max-w-full"
        role="img"
        aria-label={lines
          .map(
            (line) =>
              `${line.label} : ` +
              years
                .map((year, index) =>
                  line.values[index] === null
                    ? null
                    : `${year} ${format(line.values[index] as number)}`
                )
                .filter(Boolean)
                .join(", ")
          )
          .join(". ")}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="#E5E7EB"
            />
            <text
              x={padding.left - 6}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-gray-400 text-[11px]"
            >
              {format(tick)}
            </text>
          </g>
        ))}

        {years.map((year, index) =>
          showYear(year, index) ? (
            <text
              key={year}
              x={x(index)}
              y={height - 6}
              // première et dernière années alignées sur les bords, pour ne pas être coupées
              textAnchor={index === 0 ? "start" : index === years.length - 1 ? "end" : "middle"}
              className={
                year === currentYear
                  ? "fill-[#17202E] text-[11px] font-bold"
                  : "fill-gray-400 text-[11px]"
              }
            >
              {year}
            </text>
          ) : null
        )}

        {lines.map((line) => {
          // une édition sans valeur coupe la courbe en plusieurs morceaux
          const pieces: string[] = [];
          let current = "";
          line.values.forEach((value, index) => {
            if (value === null) {
              if (current) pieces.push(current);
              current = "";
            } else {
              current += `${current ? "L" : "M"}${x(index)},${y(value)}`;
            }
          });
          if (current) pieces.push(current);

          return (
            <g key={line.label}>
              {pieces.map((piece) => (
                <path key={piece} d={piece} fill="none" stroke={line.color} strokeWidth={2} />
              ))}
              {line.values.map((value, index) =>
                value === null ? null : (
                  <circle
                    key={years[index]}
                    cx={x(index)}
                    cy={y(value)}
                    r={years[index] === currentYear ? 5 : 3.5}
                    fill={years[index] === currentYear ? line.color : "white"}
                    stroke={line.color}
                    strokeWidth={2}
                  >
                    <title>{`${line.label} ${years[index]} : ${format(value)}`}</title>
                  </circle>
                )
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SmallChart({
  title,
  years,
  currentYear,
  values,
  format,
}: {
  title: string;
  years: string[];
  currentYear: string | null;
  values: (number | null)[];
  format: (value: number) => string;
}) {
  return (
    <div className="rounded-lg bg-[#F5F6F8] p-3">
      <p className="text-xs font-semibold text-[#17202E]">{title}</p>
      <LineChart
        years={years}
        currentYear={currentYear}
        lines={[{ label: title, color: MEDIAN_COLOR, values }]}
        height={140}
        format={format}
        compact
      />
    </div>
  );
}

function EditionsTable({
  series,
  summaries,
  currentYear,
}: {
  series: TrendSeries;
  summaries: EditionSummary[];
  currentYear: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            <th className="py-2 pr-3 font-semibold">Édition</th>
            <th className="py-2 pr-3 text-right font-semibold">Classés</th>
            <th className="py-2 pr-3 text-right font-semibold">Médiane</th>
            <th className="py-2 pr-3 text-right font-semibold">Écart</th>
            <th className="py-2 pr-3 text-right font-semibold">Top 10 %</th>
            <th className="py-2 text-right font-semibold">Écart</th>
          </tr>
        </thead>
        <tbody>
          {series.editions.map((edition, index) => {
            const summary = summaries[index];
            const previous = index > 0 ? summaries[index - 1] : null;
            return (
              <tr
                key={edition.year}
                className={`border-b border-gray-100 ${
                  edition.year === currentYear ? "bg-[#FC6B32]/5 font-semibold" : ""
                }`}
              >
                <td className="py-2 pr-3">
                  <Link
                    href={`/races/${edition.race_id}/results`}
                    className="font-semibold text-[#17202E] hover:text-[#FC6B32]"
                  >
                    {edition.year}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-gray-600">
                  {summary.classes}
                  <span className="ml-1 text-xs text-gray-400">
                    ({percent(summary.taux_classes)})
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">
                  {summary.mediane ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs tabular-nums text-gray-500">
                  {signedGap(summary.mediane, previous?.mediane ?? null) ?? ""}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">
                  {summary.top10 ?? "—"}
                </td>
                <td className="py-2 text-right font-mono text-xs tabular-nums text-gray-500">
                  {signedGap(summary.top10, previous?.top10 ?? null) ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
