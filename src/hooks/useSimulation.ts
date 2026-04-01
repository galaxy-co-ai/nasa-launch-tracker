"use client";

import { useMemo } from "react";
import type { SimSpeed, TelemetryState } from "@/types/mission";
import { useMET } from "./useMET";
import { computeSimulation } from "@/lib/simulation";

export function useSimulation(simSpeed: SimSpeed): TelemetryState {
  const { met } = useMET(simSpeed);
  return useMemo(() => computeSimulation(met), [met]);
}
