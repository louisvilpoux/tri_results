"use client";

import { useState } from "react";
import { ChevronDown, Gauge } from "lucide-react";

import { ChoiceGroup } from "@/components/shared/choice-group";
import { categoryLabel, categoryShort } from "@/lib/categories";
import type { HistogramBar, RaceStats, SegmentBenchmarks } from "@/types/race";

type SexeFilter = "tous" | "M" | "F";

const SEXE_LABELS: Record<SexeFilter, string> = { tous: "Tous", M: "Hommes", F: "Femmes" };

/**
 * Bloc « Repères » de la page classement : niveau de l'épreuve pour le temps total et chaque
 * segment (onglets), pour tous les classés ou par sexe. Calculé par GET /races/{id}/stats sur les
 * classés avec un temps valide. myTimes : temps saisis dans « Et moi ? » (secondes, par clé de
 * segment et « total »), placés dans l'histogramme.
 */
export function RaceBenchmarks({
  stats,
  myTimes = {},
}: {
  stats: RaceStats;
  myTimes?: Record<string, number>;
}) {
  const [sexe, setSexe] = useState<SexeFilter>("tous");
  const [activeKey, setActiveKey] = useState(stats.segments[0]?.key);
  // Répartition et 3ᵉ par catégorie repliés pour que le classement reste près du haut de page.
  // Ils ne s'ouvrent plus seuls quand un temps est saisi dans « Et moi ? » : le bloc, au-dessus du
  // formulaire, poussait la page pendant la saisie (U19). Le bouton propose alors d'y voir son
  // temps.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasMyTimes = Object.keys(myTimes).length > 0;

  // Le choix hommes / femmes n'est proposé que si l'épreuve a des classés des deux sexes.
  const sexes: SexeFilter[] =
    stats.par_sexe.M.length > 0 && stats.par_sexe.F.length > 0 ? ["tous", "M", "F"] : ["tous"];
  const segments = sexe === "tous" ? stats.segments : stats.par_sexe[sexe];
  const segment = segments.find((item) => item.key === activeKey) ?? segments[0];
  if (!segment) return null;

  return (
    <section className="space-y-4" aria-labelledby="reperes-titre">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="reperes-titre"
            className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            <Gauge size={22} aria-hidden className="text-[#FC6B32]" />
            Repères
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {segment.classes.toLocaleString("fr-FR")}{" "}
            {sexe === "F" ? "classée" : "classé"}
            {segment.classes > 1 && "s"}
            {sexe !== "tous" && ` (${SEXE_LABELS[sexe].toLowerCase()})`} avec un temps
            {segment.key === "total" ? "" : ` de ${segment.label.toLowerCase()}`}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sexes.length > 1 && (
            <ChoiceGroup
              label="Sexe"
              options={sexes.map((value) => ({ value, label: SEXE_LABELS[value] }))}
              selected={sexe}
              onSelect={setSexe}
            />
          )}
          {segments.length > 1 && (
            <ChoiceGroup
              label="Temps"
              options={segments.map((item) => ({ value: item.key, label: item.label }))}
              selected={segment.key}
              onSelect={setActiveKey}
            />
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <BenchmarkTiles segment={segment} />
        {(segment.histogramme || segment.categories.length > 0) && (
          <>
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              aria-expanded={detailsOpen}
              aria-controls="reperes-details"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#FC6B32]"
            >
              {detailsOpen
                ? "Masquer la répartition et le 3ᵉ de chaque catégorie"
                : hasMyTimes
                  ? "Voir ton temps dans la répartition et le 3ᵉ de chaque catégorie"
                  : "Voir la répartition et le 3ᵉ de chaque catégorie"}
              <ChevronDown
                size={16}
                aria-hidden
                className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {detailsOpen && (
              <div id="reperes-details" className="space-y-4">
                {segment.histogramme && (
                  <Histogram bars={segment.histogramme.barres} myTime={myTimes[segment.key]} />
                )}
                <CategoryThirds segment={segment} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BenchmarkTiles({ segment }: { segment: SegmentBenchmarks }) {
  const tiles: { label: string; value: string | null; hint?: string }[] = [
    { label: "Vainqueur", value: segment.vainqueur },
    { label: "Podium (3ᵉ)", value: segment.podium, hint: "moins de 3 classés" },
    { label: "Top 10 %", value: segment.top10, hint: "dans le podium : moins de 31 classés" },
    { label: "Top 25 %", value: segment.top25, hint: "dans le podium : moins de 13 classés" },
    { label: "Médiane", value: segment.mediane },
    { label: "Dernier classé", value: segment.dernier },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg bg-[#F5F6F8] px-3 py-2.5">
          <dt className="text-xs font-semibold text-gray-500">{tile.label}</dt>
          <dd
            className="mt-1 font-mono text-lg font-bold tabular-nums text-[#17202E]"
            title={tile.value ? undefined : tile.hint}
          >
            {tile.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** « 04:10:00 » → « 4h10 » ; « 00:25:00 » → « 25 min ». */
function shortTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}

function toSeconds(value: string): number {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/** 9 060 → « 2h31 » ; 1 500 → « 25 min ». */
function shortSeconds(value: number): string {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}

/**
 * Position d'un temps dans l'histogramme, en % de la largeur (barres de même largeur) ;
 * ramenée au bord quand le temps est hors de la répartition.
 */
function positionInBars(bars: HistogramBar[], value: number): { percent: number; index: number } {
  // index -1 : hors de toutes les barres, aucune n'est mise en évidence
  if (value < toSeconds(bars[0].debut)) return { percent: 0, index: -1 };
  if (value >= toSeconds(bars[bars.length - 1].fin)) return { percent: 100, index: -1 };
  const index = bars.findIndex((bar) => value < toSeconds(bar.fin));
  const start = toSeconds(bars[index].debut);
  const width = toSeconds(bars[index].fin) - start;
  const inside = Math.min(Math.max((value - start) / width, 0), 1);
  return { percent: ((index + inside) / bars.length) * 100, index };
}

function Histogram({ bars, myTime }: { bars: HistogramBar[]; myTime?: number }) {
  const max = Math.max(...bars.map((bar) => bar.count));
  const first = bars[0];
  const last = bars[bars.length - 1];
  const mine = myTime === undefined ? null : positionInBars(bars, myTime);
  // étiquette alignée vers l'intérieur près des bords, pour ne pas sortir du cadre
  const labelAlign =
    mine === null ? "" : mine.percent < 15 ? "left-0" : mine.percent > 85 ? "right-0" : "-translate-x-1/2";

  return (
    <figure className="space-y-1.5">
      <figcaption className="text-xs font-semibold text-gray-500">Répartition des temps</figcaption>
      <div
        className={`relative flex h-28 items-end gap-px ${mine ? "mt-6" : ""}`}
        role="img"
        aria-label={`Répartition des temps de ${shortTime(first.debut)} à ${shortTime(last.fin)}${
          myTime === undefined ? "" : `, ton temps : ${shortSeconds(myTime)}`
        }`}
      >
        {bars.map((bar, index) => (
          <div
            key={bar.debut}
            className={`flex-1 rounded-t-sm ${
              mine?.index === index ? "bg-[#17202E]" : "bg-[#FC6B32]/80 hover:bg-[#FC6B32]"
            }`}
            style={{ height: `${max ? (bar.count / max) * 100 : 0}%`, minHeight: bar.count ? 2 : 0 }}
            title={`${shortTime(bar.debut)} – ${shortTime(bar.fin)} : ${bar.count} classé${
              bar.count > 1 ? "s" : ""
            }`}
          />
        ))}
        {mine && myTime !== undefined && (
          <div
            className="pointer-events-none absolute -top-6 bottom-0"
            style={{ left: `${mine.percent}%` }}
            aria-hidden
          >
            <div className="absolute bottom-0 top-5 w-0.5 -translate-x-1/2 bg-[#17202E]" />
            <span
              className={`absolute top-0 whitespace-nowrap rounded bg-[#17202E] px-1.5 py-0.5 text-xs font-bold text-white ${labelAlign}`}
            >
              Toi · {shortSeconds(myTime)}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs tabular-nums text-gray-400">
        <span>{shortTime(first.debut)}</span>
        <span>{shortTime(last.fin)}</span>
      </div>
    </figure>
  );
}

function CategoryThirds({ segment }: { segment: SegmentBenchmarks }) {
  if (segment.categories.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-500">3ᵉ de chaque catégorie</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
        {segment.categories.map((category) => (
          <li
            key={`${category.categorie}-${category.sexe ?? ""}`}
            className="flex items-baseline justify-between gap-2"
          >
            <span
              className="font-semibold text-[#17202E]"
              title={
                categoryLabel(category.categorie) +
                (category.sexe ? (category.sexe === "M" ? ", hommes" : ", femmes") : "")
              }
            >
              {categoryShort(category.categorie)}
              {category.sexe && (
                <span className="ml-1 font-normal text-gray-500">
                  {category.sexe === "M" ? "H" : "F"}
                </span>
              )}
              <span className="ml-1 text-xs font-normal text-gray-400">({category.classes})</span>
            </span>
            <span
              className="font-mono tabular-nums text-gray-600"
              title={category.troisieme ? undefined : "moins de 3 classés"}
            >
              {category.troisieme ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
