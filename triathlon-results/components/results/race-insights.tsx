"use client";

import { RaceBenchmarks } from "@/components/results/race-benchmarks";
import { useMySimulation } from "@/components/results/my-simulation";
import { RaceSimulator } from "@/components/results/race-simulator";
import type { RaceStats } from "@/types/race";

/**
 * « Repères » et « Et moi ? » de la page classement. Les temps saisis dans « Et moi ? » sont
 * placés dans l'histogramme des Repères, juste au-dessus (U16, retour utilisateur du
 * 23/11/2026) et dans le classement (ligne « Toi ») : la simulation passe par le contexte
 * MySimulationProvider, qui entoure ces blocs dans la page.
 */
export function RaceInsights({
  stats,
  raceId,
  initialTimes,
  initialSexe,
  initialCategorie,
}: {
  stats: RaceStats;
  raceId: string;
  initialTimes: Record<string, string>;
  initialSexe: "" | "M" | "F";
  initialCategorie: string;
}) {
  const { mine, setMine } = useMySimulation();

  return (
    <>
      <RaceBenchmarks stats={stats} myTimes={mine?.times} />
      <RaceSimulator
        raceId={raceId}
        initialTimes={initialTimes}
        initialSexe={initialSexe}
        initialCategorie={initialCategorie}
        onChange={setMine}
      />
    </>
  );
}
