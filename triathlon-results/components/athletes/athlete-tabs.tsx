import Link from "next/link";
import { History, Timer, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Onglets du profil ; « resultats » est l'onglet par défaut (absent de l'URL). */
export const ATHLETE_TABS = ["resultats", "records", "progression"] as const;
export type AthleteTab = (typeof ATHLETE_TABS)[number];

/** Paramètre d'URL de l'onglet : /athletes/42?vue=progression. */
export const ATHLETE_TAB_PARAM = "vue";

export function parseAthleteTab(value: string | undefined): AthleteTab {
  return ATHLETE_TABS.find((tab) => tab === value) ?? "resultats";
}

/** shortLabel : libellé sur mobile, pour que les trois onglets tiennent sur la largeur. */
const TAB_LABELS: Record<AthleteTab, { label: string; shortLabel?: string; icon: LucideIcon }> = {
  resultats: { label: "Résultats", icon: History },
  records: { label: "Meilleurs temps", shortLabel: "Records", icon: Timer },
  progression: { label: "Progression", icon: TrendingUp },
};

/**
 * Onglets du profil athlète : l'historique des résultats d'abord, les analyses ensuite, pour ne
 * plus avoir à les faire défiler. Ce sont des liens (onglet dans l'URL, partageable) : la page
 * est rendue côté serveur avec le seul contenu de l'onglet choisi.
 */
export function AthleteTabs({
  active,
  hrefs,
  counts,
}: {
  active: AthleteTab;
  hrefs: Record<AthleteTab, string>;
  counts: Partial<Record<AthleteTab, number>>;
}) {
  return (
    <nav aria-label="Sections du profil" className="border-b border-gray-200">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {ATHLETE_TABS.map((tab) => {
          const { label, shortLabel, icon: Icon } = TAB_LABELS[tab];
          const isActive = tab === active;
          const count = counts[tab];

          return (
            <li key={tab} className="shrink-0">
              <Link
                href={hrefs[tab]}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition-colors sm:px-4",
                  isActive
                    ? "border-[#FC6B32] text-[#17202E]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-[#17202E]"
                )}
              >
                <Icon
                  size={16}
                  aria-hidden
                  // icônes et compteurs masqués sur mobile, pour la même raison que shortLabel
                  className={cn("hidden sm:block", isActive ? "text-[#FC6B32]" : "text-gray-400")}
                />
                {shortLabel ? (
                  <>
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                ) : (
                  label
                )}
                {count !== undefined && (
                  <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600 sm:inline">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
