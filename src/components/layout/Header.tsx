"use client";

/**
 * Top bar: product name, global search, theme toggle, and action buttons.
 * Glass-morphism overlay that floats above the map.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Sun,
  Moon,
  Layers,
  Download,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { geocode } from "@/lib/api";
import { BBox } from "@/types";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onSearch: (center: [number, number], bbox?: BBox) => void;
  onExport: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
  loading: boolean;
}

interface SearchResultItem {
  label: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

export default function Header({
  theme,
  onToggleTheme,
  showHeatmap,
  onToggleHeatmap,
  onSearch,
  onExport,
  onRefresh,
  onToggleFilters,
  filtersOpen,
  loading,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced geocoding search using a ref-based timer
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback((query: string) => {
    clearTimeout(searchTimerRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await geocode(query);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    doSearch(value);
  };

  const handleResultClick = (result: SearchResultItem) => {
    setSearchQuery(result.label.split(",")[0]); // Show short label
    setShowResults(false);
    onSearch(result.center, result.bbox);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="flex items-center gap-3 p-3 md:p-4">
        {/* Left: Menu + Brand */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleFilters}
            className={cn(
              "glass rounded-xl p-2.5 transition-apple",
              "hover:bg-accent-subtle",
              filtersOpen && "bg-accent-subtle"
            )}
            aria-label={filtersOpen ? "Close filters" : "Open filters"}
          >
            {filtersOpen ? (
              <X className="w-4.5 h-4.5 text-label-primary" />
            ) : (
              <Menu className="w-4.5 h-4.5 text-label-primary" />
            )}
          </button>
          <div className="glass rounded-xl px-4 py-2.5 hidden md:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-sm font-semibold text-label-primary tracking-tight">
              NYC 311
            </span>
          </div>
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 max-w-lg mx-auto pointer-events-auto">
          <div className="glass rounded-xl flex items-center px-3.5 gap-2.5">
            <Search className="w-4 h-4 text-label-tertiary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search address, ZIP, neighborhood..."
              className="w-full py-2.5 bg-transparent text-sm text-label-primary
                         placeholder:text-label-tertiary outline-none"
              aria-label="Search location"
              role="combobox"
              aria-expanded={showResults}
              aria-controls="search-results"
            />
            {searchLoading && (
              <div className="w-4 h-4 border-2 border-label-tertiary border-t-accent
                              rounded-full animate-spin flex-shrink-0" />
            )}
          </div>

          {/* Search results dropdown */}
          {showResults && (
            <div
              ref={dropdownRef}
              id="search-results"
              role="listbox"
              className="absolute top-full mt-2 left-0 right-0 glass rounded-xl
                         overflow-hidden animate-scale-in"
            >
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 text-sm text-label-primary
                             hover:bg-accent-subtle transition-apple border-b
                             border-separator last:border-0"
                >
                  <div className="font-medium truncate">
                    {result.label.split(",")[0]}
                  </div>
                  <div className="text-xs text-label-secondary truncate mt-0.5">
                    {result.label.split(",").slice(1).join(",").trim()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleHeatmap}
            className={cn(
              "glass rounded-xl p-2.5 transition-apple",
              "hover:bg-accent-subtle",
              showHeatmap && "bg-accent-subtle"
            )}
            aria-label={showHeatmap ? "Hide heatmap" : "Show heatmap"}
            title={showHeatmap ? "Hide heatmap" : "Show heatmap"}
          >
            <Layers
              className={cn(
                "w-4 h-4",
                showHeatmap ? "text-accent" : "text-label-secondary"
              )}
            />
          </button>

          <button
            onClick={onRefresh}
            className="glass rounded-xl p-2.5 transition-apple hover:bg-accent-subtle"
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-label-secondary",
                loading && "animate-spin"
              )}
            />
          </button>

          <button
            onClick={onExport}
            className="glass rounded-xl p-2.5 transition-apple hover:bg-accent-subtle hidden md:flex"
            aria-label="Export CSV"
            title="Export visible data as CSV"
          >
            <Download className="w-4 h-4 text-label-secondary" />
          </button>

          <button
            onClick={onToggleTheme}
            className="glass rounded-xl p-2.5 transition-apple hover:bg-accent-subtle"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4 text-label-secondary" />
            ) : (
              <Sun className="w-4 h-4 text-label-secondary" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
