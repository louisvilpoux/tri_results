"use client";

import { useState } from "react";

import { RaceBenchmarks } from "@/components/results/race-benchmarks";
import { RaceSimulator } from "@/components/results/race-simulator";
import type { RaceStats } from "@/types/race";

/**
 * « Repères » et « Et moi ? » de la page classement. Les temps saisis dans « Et moi ? » sont
 * placés dans l'histogramme des Repères, juste au-dessus (U16, retour utilisateur du
 * 23/11/2026) : la page étant un composant serveur, ce composant client partage ces temps.
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
  const [myTimes, setMyTimes] = useState<Record<string, number>>({});

  return (
    <>
      <RaceBenchmarks stats={stats} myTimes={myTimes} />
      <RaceSimulator
        raceId={raceId}
        initialTimes={initialTimes}
        initialSexe={initialSexe}
        initialCategorie={initialCategorie}
        onTimesChange={setMyTimes}
      />
    </>
  );
}
