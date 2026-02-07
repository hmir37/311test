"use client";

/**
 * Optional auto-refresh hook.
 * Calls refresh() at a configurable interval (default: 5 minutes).
 */

import { useEffect, useRef } from "react";

export function useAutoRefresh(
  refresh: () => void,
  enabled: boolean,
  intervalMs = 5 * 60 * 1000
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => refreshRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
