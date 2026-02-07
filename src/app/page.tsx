"use client";

/**
 * Main dashboard page.
 * Orchestrates all components: map, filters, search, detail panel, stats.
 * This is the single entry point – all state lives here or in hooks.
 */

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { ServiceRequest, BBox } from "@/types";
import { useFilters } from "@/hooks/useFilters";
import { useRequests } from "@/hooks/useRequests";
import { useTheme } from "@/hooks/useTheme";
import { exportToCSV } from "@/lib/api";
import Header from "@/components/layout/Header";
import FilterPanel from "@/components/filters/FilterPanel";
import DetailPanel from "@/components/detail/DetailPanel";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import AnalyticsSummary from "@/components/ui/AnalyticsSummary";

// Dynamic import for map (avoids SSR issues with mapbox-gl)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-surface-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-label-tertiary border-t-accent
                        rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-label-secondary">Loading map...</p>
      </div>
    </div>
  ),
});

function DashboardContent() {
  const { theme, toggleTheme, mounted } = useTheme();
  const {
    filters,
    setFilters,
    resetFilters,
    setDatePreset,
    toggleComplaintType,
    toggleStatus,
    toggleBorough,
    toggleAgency,
    activeFilterCount,
  } = useFilters();

  // Map viewport bounding box – drives data fetching
  const [bbox, setBbox] = useState<BBox | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [flyTarget, setFlyTarget] = useState<{
    center: [number, number];
    zoom?: number;
    bbox?: BBox;
  } | null>(null);

  const { requests, total, stats, loading, error, refresh, hasMore, loadMore } =
    useRequests(filters, bbox);

  const handleBoundsChange = useCallback((newBbox: BBox) => {
    setBbox(newBbox);
  }, []);

  const handleSelectRequest = useCallback((request: ServiceRequest | null) => {
    setSelectedRequest(request);
    // If selecting a request, fly to it
    if (request) {
      setFlyTarget({
        center: [Number(request.longitude), Number(request.latitude)],
        zoom: 16,
      });
    }
  }, []);

  const handleSearch = useCallback(
    (center: [number, number], searchBbox?: BBox) => {
      setFlyTarget({ center, bbox: searchBbox });
      // Clear fly target after animation (to allow subsequent searches)
      setTimeout(() => setFlyTarget(null), 1500);
    },
    []
  );

  const handleExport = useCallback(() => {
    if (requests.length === 0) return;
    exportToCSV(requests);
  }, [requests]);

  // Don't render until theme is resolved (prevents flash)
  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-surface-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-label-tertiary border-t-accent
                        rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Map canvas – fills entire screen */}
      <MapView
        requests={requests}
        theme={theme}
        showHeatmap={showHeatmap}
        onBoundsChange={handleBoundsChange}
        onSelectRequest={handleSelectRequest}
        selectedRequest={selectedRequest}
        flyTo={flyTarget}
      />

      {/* Loading indicator */}
      <LoadingOverlay loading={loading} />

      {/* Top bar */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((p) => !p)}
        onSearch={handleSearch}
        onExport={handleExport}
        onRefresh={refresh}
        onToggleFilters={() => setFiltersOpen((p) => !p)}
        filtersOpen={filtersOpen}
        loading={loading}
      />

      {/* Left filter panel */}
      <FilterPanel
        open={filtersOpen}
        filters={filters}
        stats={stats}
        onToggleComplaintType={toggleComplaintType}
        onToggleStatus={toggleStatus}
        onToggleBorough={toggleBorough}
        onToggleAgency={toggleAgency}
        onSetDatePreset={setDatePreset}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Right detail panel */}
      <DetailPanel
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      {/* Analytics summary */}
      <AnalyticsSummary stats={stats} visible={!selectedRequest} />

      {/* Bottom status bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-3 text-xs pointer-events-auto">
          <span className="text-label-secondary">
            Showing{" "}
            <span className="font-semibold text-label-primary">
              {requests.length.toLocaleString()}
            </span>
            {total > requests.length && (
              <>
                {" "}of{" "}
                <span className="font-semibold text-label-primary">
                  {total.toLocaleString()}
                </span>
              </>
            )}
            {" "}requests
          </span>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-accent font-medium hover:text-accent-hover transition-apple"
            >
              Load more
            </button>
          )}
          {error && (
            <span className="text-red-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-surface-secondary flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-label-tertiary border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
