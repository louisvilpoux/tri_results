"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Simulation « Et moi ? » en cours, partagée entre le simulateur, les Repères (histogramme) et le
 * classement (ligne « Toi »). La page classement est un composant serveur : ce contexte client
 * entoure ces trois blocs pour qu'ils voient les mêmes temps.
 */
export interface MySimulation {
  /** Temps valides en secondes, par clé : total, segments (swim, bike, run…) et t1, t2. */
  times: Record<string, number>;
  sexe: "" | "M" | "F";
  categorie: string;
  /** Place au général (1 + classés plus rapides) et nombre de classés ; null sans total. */
  place: number | null;
  count: number;
}

const MySimulationContext = createContext<{
  mine: MySimulation | null;
  setMine: (mine: MySimulation | null) => void;
  /** Demande de défilement jusqu'à la ligne « Toi » (« Aller à ma place »). */
  scrollToMe: boolean;
  setScrollToMe: (value: boolean) => void;
}>({ mine: null, setMine: () => {}, scrollToMe: false, setScrollToMe: () => {} });

export function MySimulationProvider({ children }: { children: ReactNode }) {
  const [mine, setMine] = useState<MySimulation | null>(null);
  const [scrollToMe, setScrollToMe] = useState(false);
  return (
    <MySimulationContext.Provider value={{ mine, setMine, scrollToMe, setScrollToMe }}>
      {children}
    </MySimulationContext.Provider>
  );
}

export function useMySimulation() {
  return useContext(MySimulationContext);
}

/** Identifiant de la ligne « Toi » du classement, cible de « Voir ma ligne ». */
export const MY_ROW_ID = "toi";

/** 18 000 → « 05:00:00 », comme les temps du classement. */
export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
}
