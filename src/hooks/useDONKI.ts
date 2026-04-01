"use client";

import { useState, useEffect } from "react";
import type { DonkiEvent } from "@/types/mission";

interface DONKIState {
  events: DonkiEvent[];
  solarActivity: string;
  loading: boolean;
}

export function useDONKI(): DONKIState {
  const [state, setState] = useState<DONKIState>({
    events: [],
    solarActivity: "QUIET",
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchDONKI() {
      try {
        const res = await fetch("/api/donki");
        if (res.ok && mounted) {
          const data = await res.json();
          setState({
            events: data.events || [],
            solarActivity: data.solarActivity || "QUIET",
            loading: false,
          });
        }
      } catch {
        if (mounted) setState((s) => ({ ...s, loading: false }));
      }
    }

    fetchDONKI();
    const interval = setInterval(fetchDONKI, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return state;
}
