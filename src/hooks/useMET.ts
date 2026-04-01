"use client";

import { useState, useEffect, useRef } from "react";
import type { SimSpeed } from "@/types/mission";
import { T0 } from "@/lib/mission";

interface METState {
  met: number; // seconds since T-0 (negative = pre-launch)
  realTime: Date;
}

/**
 * Reactive Mission Elapsed Time hook.
 * Ticks every second. When simSpeed > 1, MET advances faster than wall clock.
 * On speed change, captures base values so MET doesn't jump.
 */
export function useMET(simSpeed: SimSpeed): METState {
  const baseRef = useRef({
    wallTime: Date.now(),
    met: (Date.now() - T0.getTime()) / 1000,
  });

  const [state, setState] = useState<METState>(() => ({
    met: (Date.now() - T0.getTime()) / 1000,
    realTime: new Date(),
  }));

  // Recapture base when speed changes
  useEffect(() => {
    baseRef.current = {
      wallTime: Date.now(),
      met: state.met,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSpeed]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const wallElapsed = (now - baseRef.current.wallTime) / 1000;
      const met = baseRef.current.met + wallElapsed * simSpeed;
      setState({ met, realTime: new Date(now) });
    }, 1000);

    return () => clearInterval(interval);
  }, [simSpeed]);

  return state;
}
