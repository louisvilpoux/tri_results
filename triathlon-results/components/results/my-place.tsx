"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import {
  MY_ROW_ID,
  formatClock,
  useMySimulation,
  type MySimulation,
} from "@/components/results/my-simulation";
import { isValidRank } from "@/lib/format";
import { toSeconds } from "@/lib/time";
import type { RaceResult, RaceResultsQuery } from "@/types/result";

/**
 * Temps total en secondes d'un classé, null s'il manque, s'il est suspect ou si la ligne n'est
 * pas classée (statuts prolivesport 0 et 99991-99999, qui ont parfois un temps) : ces lignes ne
 * suivent pas l'ordre des temps.
 */
function totalSeconds(result: RaceResult): number | null {
  if (result.temps_suspect || result.clt === null || !isValidRank(result.clt)) return null;
  return toSeconds(result.total_time);
}

/**
 * Où placer la ligne « Toi » dans la page de classement affichée : index de la ligne avant
 * laquelle l'insérer, « before » / « after » quand la place est sur une page précédente ou
 * suivante, « unordered » quand le classement de la source ne suit pas l'ordre des temps sur
 * cette page, null quand l'insertion n'a pas de sens (pas de total saisi, tri autre que le
 * classement, recherche par nom, épreuve sans temps).
 */
export function locateMe(
  mine: MySimulation | null,
  query: RaceResultsQuery,
  results: RaceResult[],
  hasNext: boolean,
  sansTemps: boolean
): number | "before" | "after" | "unordered" | null {
  const total = mine?.times.total;
  if (total === undefined || sansTemps || query.q !== null) return null;
  if (!["clt", "total_time"].includes(query.sortBy) || query.order !== "asc") return null;

  // Ma ligne est placée d'après les temps. Quelques sources (environ 2 % des épreuves, par
  // exemple Ventouxman 2026) classent autrement que par le temps total publié (pénalités, autre
  // temps de référence) : dans ce cas aucun endroit du classement n'est juste.
  const times = results.map(totalSeconds).filter((seconds) => seconds !== null);
  if (times.some((seconds, i) => i > 0 && seconds < times[i - 1])) return "unordered";

  // Comme dans « Et moi ? », un temps égal au mien est classé derrière moi.
  const index = results.findIndex((result) => {
    const seconds = totalSeconds(result);
    return seconds !== null && seconds >= total;
  });
  if (index === -1) return hasNext ? "after" : results.length;
  if (index === 0 && query.offset > 0) return "before";
  return index;
}

/**
 * Bandeau au-dessus du classement quand un temps est saisi dans « Et moi ? » : rappelle la place
 * et mène à la ligne « Toi », sur cette page ou sur celle où elle se trouve.
 */
export function MyPlaceBanner({
  query,
  results,
  hasNext,
  sansTemps,
  filtered,
}: {
  query: RaceResultsQuery;
  results: RaceResult[];
  hasNext: boolean;
  sansTemps: boolean;
  filtered: boolean;
}) {
  const router = useRouter();
  const { mine, setScrollToMe } = useMySimulation();
  const location = locateMe(mine, query, results, hasNext, sansTemps);
  if (!mine || mine.place === null || mine.times.total === undefined) return null;
  const place = mine.place;

  const onThisPage = typeof location === "number";
  const unordered = location === "unordered";
  // La page de ma place n'est connue que sur le classement complet : avec un filtre, les rangs
  // des lignes ne se suivent plus.
  const canJump = (location === "before" || location === "after" || unordered) && !filtered;

  function showMyRow() {
    if (onThisPage) {
      document.getElementById(MY_ROW_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Adresse courante (avec les temps moi_… de « Et moi ? »), à la page de ma place ; classement
    // trié par temps total quand celui de la source ne suit pas l'ordre des temps.
    const url = new URL(window.location.href);
    if (unordered) {
      url.searchParams.set("sort_by", "total_time");
      url.searchParams.delete("order");
    }
    const offset = Math.floor((place - 1) / query.limit) * query.limit;
    if (offset > 0) url.searchParams.set("offset", String(offset));
    else url.searchParams.delete("offset");
    // le classement fait défiler jusqu'à la ligne quand elle apparaît sur la nouvelle page
    setScrollToMe(true);
    router.push(`${url.pathname}${url.search}`, { scroll: false });
  }

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#17202E] px-4 py-3 text-sm text-gray-300">
      <MapPin size={16} aria-hidden className="shrink-0 text-[#FC6B32]" />
      <span>
        Avec{" "}
        <span className="font-mono font-bold text-white">{formatClock(mine.times.total)}</span>, tu
        serais <span className="font-bold text-white">{mine.place}ᵉ</span> sur{" "}
        {mine.count.toLocaleString("fr-FR")} classés au temps total.
        {unordered && (
          <span className="mt-1 block text-xs text-gray-400">
            Sur cette épreuve, le classement publié ne suit pas toujours l&apos;ordre des temps
            totaux (pénalités ou autre temps de référence) : ta ligne n&apos;y a pas de place
            juste.
          </span>
        )}
      </span>
      {(onThisPage || canJump) && (
        <button
          type="button"
          onClick={showMyRow}
          className="ml-auto font-semibold text-[#FC6B32] hover:underline"
        >
          {onThisPage ? "Voir ma ligne" : unordered ? "Trier par temps total" : "Aller à ma place"}
        </button>
      )}
    </p>
  );
}
