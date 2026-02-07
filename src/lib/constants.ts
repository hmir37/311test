/**
 * Application constants
 */

/** Default map center: NYC City Hall */
export const NYC_CENTER: [number, number] = [-74.006, 40.7128];

/** Default map zoom */
export const DEFAULT_ZOOM = 11;

/** NYC bounding box */
export const NYC_BOUNDS: [number, number, number, number] = [
  -74.26, 40.47, -73.7, 40.92,
];

/** Boroughs */
export const BOROUGHS = [
  "MANHATTAN",
  "BROOKLYN",
  "QUEENS",
  "BRONX",
  "STATEN ISLAND",
] as const;

/** Common statuses */
export const STATUSES = [
  "Open",
  "Closed",
  "Pending",
  "In Progress",
  "Assigned",
] as const;

/** Date range presets */
export const DATE_PRESETS = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
] as const;

/** Mapbox style URLs (using free OSM-based styles to avoid requiring a token) */
export const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

/**
 * Heatmap color ramp – Apple-inspired, restrained gradients.
 * Goes from transparent → soft blue → warm amber → soft red at peak density.
 */
export const HEATMAP_COLORS = [
  0, "rgba(0,0,0,0)",
  0.1, "rgba(0,113,227,0.15)",
  0.3, "rgba(0,113,227,0.35)",
  0.5, "rgba(255,149,0,0.5)",
  0.7, "rgba(255,59,48,0.6)",
  1, "rgba(255,59,48,0.8)",
];

/** Cluster colors by size */
export const CLUSTER_COLORS: [number, string][] = [
  [0, "#0071e3"],      // blue for small clusters
  [100, "#5856d6"],    // indigo
  [500, "#ff9500"],    // amber
  [1000, "#ff3b30"],   // red for large clusters
];
