"use client";

/**
 * Core map component using MapLibre GL (free, no token needed).
 * Renders 311 requests as clustered points with a toggleable heatmap layer.
 * Supports smooth pan/zoom, hover previews, and click-to-detail.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import { ServiceRequest, FilterState, BBox } from "@/types";
import { toGeoJSON } from "@/lib/api";
import {
  NYC_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLES,
  HEATMAP_COLORS,
  CLUSTER_COLORS,
} from "@/lib/constants";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { throttle } from "@/lib/utils";

// Use maplibre-compatible approach – mapbox-gl can load non-Mapbox styles
// No access token needed for CARTO basemaps
(mapboxgl as any).accessToken = "not-needed";

interface MapViewProps {
  requests: ServiceRequest[];
  theme: "light" | "dark";
  showHeatmap: boolean;
  onBoundsChange: (bbox: BBox) => void;
  onSelectRequest: (request: ServiceRequest | null) => void;
  selectedRequest: ServiceRequest | null;
  flyTo?: { center: [number, number]; zoom?: number; bbox?: BBox } | null;
}

export default function MapView({
  requests,
  theme,
  showHeatmap,
  onBoundsChange,
  onSelectRequest,
  selectedRequest,
  flyTo,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Use refs for callback props to avoid re-initializing the map
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const onSelectRequestRef = useRef(onSelectRequest);
  onSelectRequestRef.current = onSelectRequest;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Memoize GeoJSON to avoid recomputing on every render
  const geojson = useMemo(() => toGeoJSON(requests), [requests]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[themeRef.current],
      center: NYC_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
      // @ts-ignore - maplibre compatibility
      transformRequest: (url: string) => ({ url }),
    });

    // Minimal controls, positioned for Apple-like UX
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      setMapLoaded(true);

      // --- Clustered point source ---
      map.addSource("requests", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // --- Heatmap source (separate, unclustered) ---
      map.addSource("requests-heat", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // --- Heatmap layer ---
      map.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "requests-heat",
        maxzoom: 15,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            9, 0.5,
            14, 2,
          ],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            ...HEATMAP_COLORS,
          ],
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            9, 8,
            14, 20,
          ],
          "heatmap-opacity": 0.7,
        },
        layout: {
          visibility: "none",
        },
      });

      // --- Cluster circles ---
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "requests",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            ...CLUSTER_COLORS.flatMap(([threshold, color]) => [threshold, color]).slice(1),
          ] as any,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16, 100, 22, 500, 28, 1000, 34,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.5)",
        },
      });

      // --- Cluster count labels ---
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "requests",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // --- Individual (unclustered) points ---
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "requests",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#0071e3",
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 3,
            14, 5,
            18, 8,
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.8)",
        },
      });

      // Selected point highlight
      map.addLayer({
        id: "selected-point",
        type: "circle",
        source: "requests",
        filter: ["==", ["get", "unique_key"], ""],
        paint: {
          "circle-color": "#ff9500",
          "circle-radius": 10,
          "circle-opacity": 1,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    // --- Interaction handlers ---

    // Hover preview on unclustered points
    map.on("mouseenter", "unclustered-point", (e) => {
      map.getCanvas().style.cursor = "pointer";
      if (!e.features?.[0]) return;

      const feat = e.features[0];
      const props = feat.properties as any;
      const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      // Remove previous popup
      popupRef.current?.remove();

      const statusColor = getStatusColor(props.status);
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: "request-popup",
        maxWidth: "260px",
      })
        .setLngLat(coords)
        .setHTML(
          `<div style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <div style="font-size: 13px; font-weight: 600; color: var(--label-primary); margin-bottom: 4px;">
              ${props.complaint_type}
            </div>
            <div style="font-size: 11px; color: var(--label-secondary); margin-bottom: 6px;">
              ${props.incident_address || "No address"}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${statusColor};"></span>
              <span style="color: var(--label-secondary);">${getStatusLabel(props.status)}</span>
              <span style="color: var(--label-tertiary);">·</span>
              <span style="color: var(--label-tertiary);">${formatDate(props.created_date)}</span>
            </div>
          </div>`
        )
        .addTo(map);

      popupRef.current = popup;
    });

    map.on("mouseleave", "unclustered-point", () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    // Click on unclustered point → open detail
    map.on("click", "unclustered-point", (e) => {
      if (!e.features?.[0]) return;
      const props = e.features[0].properties as any;
      // Parse stringified properties back
      const request: ServiceRequest = {
        ...props,
        latitude: Number(props.latitude),
        longitude: Number(props.longitude),
      };
      onSelectRequestRef.current(request);
    });

    // Click on cluster → zoom in
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
      if (!features[0]) return;
      const clusterId = features[0].properties?.cluster_id;
      (map.getSource("requests") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom! });
        }
      );
    });

    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    // Click on map background → deselect
    map.on("click", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["unclustered-point", "clusters"],
      });
      if (features.length === 0) {
        onSelectRequestRef.current(null);
      }
    });

    // Bounds change → notify parent (throttled)
    const emitBounds = throttle(() => {
      const b = map.getBounds();
      if (!b) return;
      onBoundsChangeRef.current([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    }, 500);

    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Only run once

  // Update map style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Store current center/zoom before style change
    const center = map.getCenter();
    const zoom = map.getZoom();

    map.setStyle(MAP_STYLES[theme]);

    // Re-add sources and layers after style loads
    map.once("style.load", () => {
      addSourcesAndLayers(map, geojson, showHeatmap);
      map.setCenter(center);
      map.setZoom(zoom);
    });
  }, [theme, geojson, showHeatmap, mapLoaded]);

  // Update data when requests change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("requests") as mapboxgl.GeoJSONSource | undefined;
    const heatSource = map.getSource("requests-heat") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(geojson);
    }
    if (heatSource) {
      heatSource.setData(geojson);
    }
  }, [geojson, mapLoaded]);

  // Toggle heatmap visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layer = map.getLayer("heatmap-layer");
    if (layer) {
      map.setLayoutProperty(
        "heatmap-layer",
        "visibility",
        showHeatmap ? "visible" : "none"
      );
    }
  }, [showHeatmap, mapLoaded]);

  // Fly to location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;

    if (flyTo.bbox) {
      map.fitBounds(flyTo.bbox as [number, number, number, number], {
        padding: 60,
        duration: 1200,
      });
    } else {
      map.flyTo({
        center: flyTo.center,
        zoom: flyTo.zoom || 15,
        duration: 1200,
      });
    }
  }, [flyTo]);

  // Highlight selected request
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layer = map.getLayer("selected-point");
    if (layer) {
      map.setFilter("selected-point", [
        "==",
        ["get", "unique_key"],
        selectedRequest?.unique_key || "",
      ]);
    }
  }, [selectedRequest, mapLoaded]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      role="application"
      aria-label="Map showing NYC 311 service requests"
    />
  );
}

/** Helper to re-add sources and layers (needed after style change) */
function addSourcesAndLayers(
  map: mapboxgl.Map,
  geojson: any,
  showHeatmap: boolean
) {
  if (!map.getSource("requests")) {
    map.addSource("requests", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
  }
  if (!map.getSource("requests-heat")) {
    map.addSource("requests-heat", {
      type: "geojson",
      data: geojson,
    });
  }

  if (!map.getLayer("heatmap-layer")) {
    map.addLayer({
      id: "heatmap-layer",
      type: "heatmap",
      source: "requests-heat",
      maxzoom: 15,
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 14, 2],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          ...HEATMAP_COLORS,
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 20],
        "heatmap-opacity": 0.7,
      },
      layout: { visibility: showHeatmap ? "visible" : "none" },
    });
  }

  if (!map.getLayer("clusters")) {
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "requests",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step", ["get", "point_count"],
          ...CLUSTER_COLORS.flatMap(([t, c]) => [t, c]).slice(1),
        ] as any,
        "circle-radius": ["step", ["get", "point_count"], 16, 100, 22, 500, 28, 1000, 34],
        "circle-opacity": 0.85,
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.5)",
      },
    });
  }

  if (!map.getLayer("cluster-count")) {
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "requests",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Semibold"],
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("unclustered-point")) {
    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "requests",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": "#0071e3",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 5, 18, 8],
        "circle-opacity": 0.8,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(255,255,255,0.8)",
      },
    });
  }

  if (!map.getLayer("selected-point")) {
    map.addLayer({
      id: "selected-point",
      type: "circle",
      source: "requests",
      filter: ["==", ["get", "unique_key"], ""],
      paint: {
        "circle-color": "#ff9500",
        "circle-radius": 10,
        "circle-opacity": 1,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
}
