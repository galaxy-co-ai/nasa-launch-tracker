"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { View } from "@/types/mission";
import { TIMELINE } from "@/lib/mission";

const STORAGE_KEY = "mission-control-view";
const OVERRIDE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Auto-select best view based on mission phase (spec Section 8).
 * User can override; auto-select resumes after 30 min of inactivity.
 */
function getDefaultView(met: number): View {
  // During active events → LIVE
  if (met < 0) return "LIVE";
  if (met < TIMELINE.orbitInsert) return "LIVE";
  if (met > TIMELINE.tli - 300 && met < TIMELINE.tli + 600) return "LIVE";
  if (met > TIMELINE.lunarFlyby - 3600 && met < TIMELINE.freeReturn + 3600) return "LIVE";
  if (met > TIMELINE.reentry - 1800) return "LIVE";
  // Coast phases → TRACK
  return "TRACK";
}

export function useView(met: number) {
  const [view, setViewState] = useState<View>(() => {
    if (typeof window === "undefined") return getDefaultView(met);
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (stored && Date.now() - stored.timestamp < OVERRIDE_TIMEOUT) {
        return stored.view as View;
      }
    } catch { /* ignore */ }
    return getDefaultView(met);
  });

  const lastManualSwitch = useRef<number>(0);

  const setView = useCallback((v: View) => {
    setViewState(v);
    lastManualSwitch.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ view: v, timestamp: Date.now() }));
    } catch { /* ignore */ }
  }, []);

  // Auto-select if user hasn't manually switched in 30 min
  useEffect(() => {
    if (Date.now() - lastManualSwitch.current > OVERRIDE_TIMEOUT) {
      const defaultView = getDefaultView(met);
      setViewState(defaultView);
    }
  }, [met]);

  const isAutoSelected = Date.now() - lastManualSwitch.current > OVERRIDE_TIMEOUT;

  return { view, setView, isAutoSelected };
}
