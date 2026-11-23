"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

export interface ChartLine {
  label: string;
  color: string;
  values: (number | null)[];
}

/**
 * Courbes en SVG, sans bibliothèque (tendances d'une course, progression d'un athlète).
 *
 * - Un point par entrée de `labels` (année d'une édition, saison d'une course), espacés
 *   régulièrement ; une valeur manquante coupe la courbe.
 * - `highlight` : index du point mis en valeur (édition affichée, dernière course).
 * - Sur tous les graphiques, les valeurs augmentent vers le haut (U7 du retour utilisateur du
 *   23/11/2026 : le classement s'affichait à l'envers des temps) : plus bas = plus rapide ou
 *   mieux classé.
 * - Échelle (U8) : l'axe couvre au moins `minSpan` (par défaut 10 % de la plus grande valeur),
 *   pour qu'un petit écart (du top 3 % au top 4 %) ne trace pas une chute sur toute la hauteur ;
 *   `reference` (0 pour un pourcentage ou un écart à la médiane) est toujours dans l'axe et
 *   écrit en graduation.
 * - Le SVG est dessiné à la largeur réelle du conteneur (mesurée), pour que le texte garde la
 *   même taille sur téléphone et sur grand écran.
 * - Sous l'axe, un libellé n'est écrit qu'une fois (plusieurs courses la même saison) et à au
 *   moins 34 px d'un autre.
 * - Valeurs lisibles sans infobulle (U9 du retour utilisateur du 23/11/2026 : l'infobulle native
 *   était lente sur ordinateur et invisible sur mobile) : une ligne au-dessus du graphique écrit
 *   le nom et la valeur du point actif. Par défaut, le point mis en valeur (sinon le dernier) ;
 *   le survol, un toucher ou les flèches du clavier en choisissent un autre, repéré par un trait
 *   vertical. `selected` et `onSelectedChange` partagent ce choix entre plusieurs graphiques
 *   (toucher une course sur le graphique natation la montre aussi sur vélo, course à pied…).
 */
export function LineChart({
  labels,
  pointNames,
  highlight,
  lines,
  height,
  format,
  tickFormat = format,
  compact = false,
  minSpan,
  reference,
  selected,
  onSelectedChange,
}: {
  labels: string[];
  /** Nom de chaque point dans l'infobulle (nom de la course…) ; par défaut, son libellé. */
  pointNames?: string[];
  highlight?: number;
  lines: ChartLine[];
  height: number;
  /** Écriture d'une valeur dans l'infobulle et la description. */
  format: (value: number) => string;
  /** Écriture des graduations de l'axe vertical, plus courte si besoin ; par défaut `format`. */
  tickFormat?: (value: number) => string;
  compact?: boolean;
  /** Étendue minimale de l'axe vertical, dans l'unité des valeurs. */
  minSpan?: number;
  /** Valeur toujours comprise dans l'axe et écrite en graduation (0…). */
  reference?: number;
  /** Point choisi, partagé entre graphiques (null : point par défaut). */
  selected?: number | null;
  onSelectedChange?: (index: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(compact ? 240 : 600);
  const [ownSelected, setOwnSelected] = useState<number | null>(null);
  const controlled = onSelectedChange !== undefined;
  const choice = controlled ? (selected ?? null) : ownSelected;
  const select = (index: number | null) => {
    if (controlled) onSelectedChange(index);
    else setOwnSelected(index);
  };
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

  const count = labels.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Axe : les valeurs et la référence, sur une étendue d'au moins minSpan (élargie autour du
  // centre, sans passer sous la référence quand toutes les valeurs sont au-dessus), plus 8 %
  // de marge.
  let axisLow = reference === undefined ? min : Math.min(min, reference);
  let axisHigh = reference === undefined ? max : Math.max(max, reference);
  const span = Math.max(minSpan ?? Math.abs(max) * 0.1, axisHigh - axisLow, 1);
  const extra = span - (axisHigh - axisLow);
  axisLow -= extra / 2;
  axisHigh += extra / 2;
  if (reference !== undefined && min >= reference && axisLow < reference) {
    axisHigh += reference - axisLow;
    axisLow = reference;
  }
  const margin = span * 0.08;
  const low = axisLow - margin;
  const high = axisHigh + margin;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  // marge de 12 px de part et d'autre, pour que les points ne touchent ni l'axe ni le bord
  const inset = 12;
  const x = (index: number) =>
    padding.left +
    inset +
    (count > 1
      ? (index / (count - 1)) * (innerWidth - 2 * inset)
      : (innerWidth - 2 * inset) / 2);
  // les valeurs augmentent vers le haut
  const y = (value: number) => padding.top + (1 - (value - low) / (high - low)) * innerHeight;

  // Graduations : la plus petite et la plus grande valeur (4 graduations hors petit format),
  // puis la référence ; une graduation à moins de 14 px d'une autre n'est pas écrite (valeurs
  // très proches, comme le top 3 % et le top 4 %).
  const candidateTicks = [
    ...(compact ? [min, max] : [0, 1, 2, 3].map((step) => min + (step / 3) * (max - min))),
    ...(reference === undefined ? [] : [reference]),
  ];
  const ticks: number[] = [];
  for (const tick of candidateTicks) {
    if (ticks.every((other) => Math.abs(y(other) - y(tick)) >= 14)) ticks.push(tick);
  }

  // Libellés sous l'axe : le point mis en valeur d'abord, puis le premier, le dernier et tous
  // les autres, petit format compris (U9 : seules la première et la dernière année étaient
  // écrites au-delà de 6 points) ; un même libellé une seule fois ; pas à moins de 34 px d'un
  // libellé déjà écrit.
  const candidates = [highlight ?? -1, 0, count - 1, ...labels.map((_, index) => index)].filter(
    (index, position, list) => index >= 0 && list.indexOf(index) === position
  );
  // centre du texte : le premier libellé part de son point vers la droite, le dernier vers la
  // gauche
  const labelCenter = (index: number) =>
    x(index) + (index === 0 ? 14 : index === count - 1 ? -14 : 0);
  const shown = new Set<number>();
  for (const index of candidates) {
    const sameText = [...shown].some((other) => labels[other] === labels[index]);
    const farEnough = [...shown].every(
      (other) => Math.abs(labelCenter(other) - labelCenter(index)) >= 34
    );
    if (!sameText && farEnough) shown.add(index);
  }

  const names = pointNames ?? labels;

  // Point actif : celui choisi (survol, toucher, clavier), sinon le point mis en valeur, sinon
  // le dernier qui a une valeur.
  const lastWithValue = labels.reduce(
    (found, _, index) => (lines.some((line) => line.values[index] != null) ? index : found),
    count - 1
  );
  const active = choice !== null && choice < count ? choice : (highlight ?? lastWithValue);

  // point le plus proche d'une abscisse du conteneur (le SVG est à la taille du conteneur)
  const nearestIndex = (event: MouseEvent<SVGSVGElement>): number => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const step = count > 1 ? (innerWidth - 2 * inset) / (count - 1) : 1;
    const position = (event.clientX - left - padding.left - inset) / step;
    return Math.min(count - 1, Math.max(0, Math.round(position)));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key === "Home") select(0);
    else if (event.key === "End") select(count - 1);
    else if (event.key in moves)
      select(Math.min(count - 1, Math.max(0, active + moves[event.key])));
    else if (event.key === "Escape") select(null);
    else return;
    event.preventDefault();
  };

  return (
    <div ref={containerRef} className="w-full">
      <ActiveReadout
        name={names[active]}
        lines={lines}
        index={active}
        format={format}
        compact={compact}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block max-w-full cursor-crosshair rounded outline-none focus-visible:ring-2 focus-visible:ring-[#FC6B32]/50"
        tabIndex={0}
        // survol à la souris ; un toucher (ou un clic) choisit le point le plus proche
        onMouseMove={(event) => select(nearestIndex(event))}
        onMouseLeave={() => select(null)}
        onClick={(event) => select(nearestIndex(event))}
        onKeyDown={onKeyDown}
        role="img"
        aria-label={lines
          .map(
            (line) =>
              `${line.label} : ` +
              names
                .map((name, index) =>
                  line.values[index] === null
                    ? null
                    : `${name} ${format(line.values[index] as number)}`
                )
                .filter(Boolean)
                .join(", ")
          )
          .join(". ")}
      >
        {choice !== null && choice < count && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#9CA3AF"
            strokeDasharray="3 3"
          />
        )}

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
              {tickFormat(tick)}
            </text>
          </g>
        ))}

        {labels.map((label, index) =>
          shown.has(index) ? (
            <text
              key={index}
              x={x(index)}
              y={height - 6}
              // premier et dernier libellés alignés sur les bords, pour ne pas être coupés
              textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
              className={
                index === highlight
                  ? "fill-[#17202E] text-[11px] font-bold"
                  : "fill-gray-400 text-[11px]"
              }
            >
              {label}
            </text>
          ) : null
        )}

        {lines.map((line) => {
          // une valeur manquante coupe la courbe en plusieurs morceaux
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
                    key={index}
                    cx={x(index)}
                    cy={y(value)}
                    r={index === highlight || index === active ? 5 : 3.5}
                    fill={index === highlight || index === active ? line.color : "white"}
                    stroke={line.color}
                    strokeWidth={2}
                  />
                )
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Nom et valeur(s) du point actif, au-dessus du graphique. Hauteur fixe (une ligne, nom coupé
 * s'il est trop long) pour que la page ne bouge pas quand le point change.
 */
function ActiveReadout({
  name,
  lines,
  index,
  format,
  compact,
}: {
  name: string;
  lines: ChartLine[];
  index: number;
  format: (value: number) => string;
  compact: boolean;
}) {
  const valueText = (line: ChartLine) => {
    const value = line.values[index];
    return value == null ? "—" : format(value);
  };

  // une courbe : la valeur, puis le nom du point sur toute la largeur (la date d'une course
  // reste lisible dans une petite carte)
  if (lines.length === 1) {
    return (
      <p className="flex h-9 flex-col text-xs" title={name}>
        <span className="font-mono text-sm font-bold tabular-nums text-[#17202E]">
          {valueText(lines[0])}
        </span>
        <span className="truncate text-gray-500">{name}</span>
      </p>
    );
  }

  return (
    <p
      className={`flex h-5 items-baseline gap-x-3 overflow-hidden text-xs ${compact ? "" : "sm:text-sm"}`}
      title={name}
    >
      <span className="shrink-0 font-semibold text-[#17202E]">{name}</span>
      {lines.map((line) => (
        <span key={line.label} className="flex shrink-0 items-center gap-1.5 text-gray-500">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: line.color }}
          />
          {line.label}
          <span className="font-mono font-bold tabular-nums text-[#17202E]">
            {valueText(line)}
          </span>
        </span>
      ))}
    </p>
  );
}
