"use client";

/**
 * Filter state management with URL synchronization.
 * All filter changes are reflected in the URL for deep linking and sharing.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterState, DateRange, DatePreset } from "@/types";
import { subHours, subDays, subMonths, format } from "date-fns";

/** Default filter state */
export const DEFAULT_FILTERS: FilterState = {
  complaintTypes: [],
  statuses: [],
  agencies: [],
  boroughs: [],
  dateRange: {
    preset: "30d",
    start: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss"),
    end: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
  },
};

/** Serialize filter state to URL search params */
function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.complaintTypes.length > 0)
    params.set("types", filters.complaintTypes.join("|"));
  if (filters.statuses.length > 0)
    params.set("status", filters.statuses.join("|"));
  if (filters.agencies.length > 0)
    params.set("agencies", filters.agencies.join("|"));
  if (filters.boroughs.length > 0)
    params.set("boroughs", filters.boroughs.join("|"));
  if (filters.dateRange.preset !== "30d")
    params.set("date", filters.dateRange.preset);
  if (filters.dateRange.preset === "custom") {
    params.set("from", filters.dateRange.start);
    params.set("to", filters.dateRange.end);
  }
  if (filters.maxResolutionHours)
    params.set("maxHours", String(filters.maxResolutionHours));

  return params;
}

/** Parse URL search params to filter state */
function paramsToFilters(params: URLSearchParams): FilterState {
  const preset = (params.get("date") || "30d") as DatePreset | "custom";
  const dateRange = getDateRange(
    preset,
    params.get("from") || undefined,
    params.get("to") || undefined
  );

  return {
    complaintTypes: params.get("types")?.split("|").filter(Boolean) || [],
    statuses: params.get("status")?.split("|").filter(Boolean) || [],
    agencies: params.get("agencies")?.split("|").filter(Boolean) || [],
    boroughs: params.get("boroughs")?.split("|").filter(Boolean) || [],
    dateRange,
    maxResolutionHours: params.get("maxHours")
      ? parseInt(params.get("maxHours")!, 10)
      : undefined,
  };
}

function getDateRange(
  preset: DatePreset | "custom",
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  const end = format(now, "yyyy-MM-dd'T'HH:mm:ss");

  if (preset === "custom") {
    return {
      preset: "custom",
      start: customStart || format(subDays(now, 30), "yyyy-MM-dd'T'HH:mm:ss"),
      end: customEnd || end,
    };
  }

  let startDate: Date;
  switch (preset) {
    case "24h": startDate = subHours(now, 24); break;
    case "7d": startDate = subDays(now, 7); break;
    case "30d": startDate = subDays(now, 30); break;
    case "90d": startDate = subDays(now, 90); break;
    case "1y": startDate = subMonths(now, 12); break;
    default: startDate = subDays(now, 30);
  }

  return {
    preset,
    start: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
    end,
  };
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  // Initialize from URL or defaults
  const [filters, setFiltersState] = useState<FilterState>(() => {
    if (typeof window === "undefined") return DEFAULT_FILTERS;
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) return paramsToFilters(params);
    return DEFAULT_FILTERS;
  });

  // Sync URL when filters change (skip initial render)
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    const params = filtersToParams(filters);
    const search = params.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    router.replace(url, { scroll: false });
  }, [filters, pathname, router]);

  const setFilters = useCallback((update: Partial<FilterState> | ((prev: FilterState) => FilterState)) => {
    setFiltersState((prev) => {
      if (typeof update === "function") return update(prev);
      return { ...prev, ...update };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const setDatePreset = useCallback((preset: DatePreset) => {
    const range = getDateRange(preset);
    setFiltersState((prev) => ({ ...prev, dateRange: range }));
  }, []);

  const toggleComplaintType = useCallback((type: string) => {
    setFiltersState((prev) => ({
      ...prev,
      complaintTypes: prev.complaintTypes.includes(type)
        ? prev.complaintTypes.filter((t) => t !== type)
        : [...prev.complaintTypes, type],
    }));
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setFiltersState((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const toggleBorough = useCallback((borough: string) => {
    setFiltersState((prev) => ({
      ...prev,
      boroughs: prev.boroughs.includes(borough)
        ? prev.boroughs.filter((b) => b !== borough)
        : [...prev.boroughs, borough],
    }));
  }, []);

  const toggleAgency = useCallback((agency: string) => {
    setFiltersState((prev) => ({
      ...prev,
      agencies: prev.agencies.includes(agency)
        ? prev.agencies.filter((a) => a !== agency)
        : [...prev.agencies, agency],
    }));
  }, []);

  const activeFilterCount =
    filters.complaintTypes.length +
    filters.statuses.length +
    filters.agencies.length +
    filters.boroughs.length +
    (filters.dateRange.preset !== "30d" ? 1 : 0) +
    (filters.maxResolutionHours ? 1 : 0);

  return {
    filters,
    setFilters,
    resetFilters,
    setDatePreset,
    toggleComplaintType,
    toggleStatus,
    toggleBorough,
    toggleAgency,
    activeFilterCount,
  };
}
