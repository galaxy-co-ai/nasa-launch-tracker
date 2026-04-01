"use client";

import { useState, useEffect } from "react";
import type { DsnStation } from "@/types/mission";

interface DSNState {
  stations: DsnStation[];
  loading: boolean;
  error: boolean;
}

export function useDSN(): DSNState {
  const [state, setState] = useState<DSNState>({
    stations: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchDSN() {
      try {
        const res = await fetch("/api/dsn");
        if (res.ok && mounted) {
          const data = await res.json();
          setState({ stations: data.stations || [], loading: false, error: false });
        }
      } catch {
        if (mounted) setState((s) => ({ ...s, loading: false, error: true }));
      }
    }

    fetchDSN();
    const interval = setInterval(fetchDSN, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return state;
}
