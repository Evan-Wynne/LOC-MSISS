"use client";

import { useEffect, useState } from "react";
import { snapshot, startPolling, subscribe, type LocState } from "./loc";
import { CHAIN_MODE } from "./config";

// Re-renders when the data store changes. Starts empty on the server so the
// first client render matches, then hydrates from localStorage (mock mode) or
// /api/chain, polled every 5s (chain mode).
export function useLoc(): LocState | null {
  const [s, setS] = useState<LocState | null>(null);
  useEffect(() => {
    const unsub = subscribe(() => setS({ ...snapshot() }));
    startPolling();
    setS({ ...snapshot() });
    return unsub;
  }, []);
  if (CHAIN_MODE && !s?.ready) return null;
  return s;
}
