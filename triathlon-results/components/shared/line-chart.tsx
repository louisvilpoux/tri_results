"use client";

import { useEffect, useRef, useState } from "react";

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
}) {
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

  // Libellés sous l'axe : le point mis en valeur d'abord, puis le premier, le dernier et les
  // autres (en petit format, seulement s'il y a 6 points ou moins) ; un même libellé une seule
  // fois ; pas à moins de 34 px d'un libellé déjà écrit.
  const candidates = [
    highlight ?? -1,
    0,
    count - 1,
    ...(compact && count > 6 ? [] : labels.map((_, index) => index)),
  ].filter((index, position, list) => index >= 0 && list.indexOf(index) === position);
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
                    r={index === highlight ? 5 : 3.5}
                    fill={index === highlight ? line.color : "white"}
                    stroke={line.color}
                    strokeWidth={2}
                  >
                    <title>{`${line.label} — ${names[index]} : ${format(value)}`}</title>
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
