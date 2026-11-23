"use client";

import Link from "next/link";
import { useState } from "react";
import { TrendingUp } from "lucide-react";

import { ChoiceGroup } from "@/components/shared/choice-group";
import { LineChart } from "@/components/shared/line-chart";
import { capitalize } from "@/lib/format";
import { shortDuration, signedGap, toSeconds } from "@/lib/time";
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

/** Index de l'édition affichée dans la liste des années (undefined si absente). */
function highlightIndex(years: string[], currentYear: string | null): number | undefined {
  const index = currentYear ? years.indexOf(currentYear) : -1;
  return index >= 0 ? index : undefined;
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
  // édition choisie sur un graphique, montrée sur tous (U9)
  const [selectedEdition, setSelectedEdition] = useState<number | null>(null);

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
              onSelect={(key) => {
                setSelectedKey(key);
                setSelectedEdition(null);
              }}
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
            labels={years}
            highlight={highlightIndex(years, currentYear)}
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
            selected={selectedEdition}
            onSelectedChange={setSelectedEdition}
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
                selected={selectedEdition}
                onSelectedChange={setSelectedEdition}
              />
            ))}
          </div>
        </div>

        <EditionsTable series={series} summaries={summaries} currentYear={currentYear} />

        <p className="text-xs text-gray-400">
          Plus bas = plus rapide. Une évolution peut venir d’un changement de parcours ou de la
          météo, pas seulement du niveau des participants ; les éditions peuvent venir de sources
          différentes.
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

function SmallChart({
  title,
  years,
  currentYear,
  values,
  format,
  selected,
  onSelectedChange,
}: {
  title: string;
  years: string[];
  currentYear: string | null;
  values: (number | null)[];
  format: (value: number) => string;
  selected: number | null;
  onSelectedChange: (index: number | null) => void;
}) {
  return (
    <div className="rounded-lg bg-[#F5F6F8] p-3">
      <p className="text-xs font-semibold text-[#17202E]">{title}</p>
      <LineChart
        labels={years}
        highlight={highlightIndex(years, currentYear)}
        lines={[{ label: title, color: MEDIAN_COLOR, values }]}
        height={140}
        format={format}
        compact
        selected={selected}
        onSelectedChange={onSelectedChange}
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
