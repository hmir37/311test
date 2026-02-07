"use client";

/**
 * Collapsible left panel with all filter controls.
 * Apple-style design: clean sections, subtle separators, pill-based multi-select.
 */

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Calendar,
  Building,
  MapPin,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn, formatNumber, getStatusColor, getComplaintColor } from "@/lib/utils";
import { FilterState, DatePreset, ViewStats } from "@/types";
import { BOROUGHS, STATUSES, DATE_PRESETS } from "@/lib/constants";
import { fetchComplaintTypes, fetchAgencies } from "@/lib/api";

interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  stats: ViewStats | null;
  onToggleComplaintType: (type: string) => void;
  onToggleStatus: (status: string) => void;
  onToggleBorough: (borough: string) => void;
  onToggleAgency: (agency: string) => void;
  onSetDatePreset: (preset: DatePreset) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export default function FilterPanel({
  open,
  filters,
  stats,
  onToggleComplaintType,
  onToggleStatus,
  onToggleBorough,
  onToggleAgency,
  onSetDatePreset,
  onReset,
  activeFilterCount,
}: FilterPanelProps) {
  const [complaintTypes, setComplaintTypes] = useState<string[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["date", "status", "complaints"])
  );
  const [complaintSearch, setComplaintSearch] = useState("");

  // Load filter options on mount
  useEffect(() => {
    fetchComplaintTypes().then(setComplaintTypes);
    fetchAgencies().then(setAgencies);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const filteredComplaintTypes = complaintTypes.filter((t) =>
    t.toLowerCase().includes(complaintSearch.toLowerCase())
  );

  if (!open) return null;

  return (
    <aside
      className="absolute top-16 md:top-[72px] left-3 md:left-4 bottom-4 z-20 w-[320px]
                 glass rounded-2xl overflow-hidden flex flex-col
                 animate-slide-up"
      role="complementary"
      aria-label="Filters"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
        <div>
          <h2 className="text-base font-semibold text-label-primary">Filters</h2>
          {activeFilterCount > 0 && (
            <p className="text-xs text-label-secondary mt-0.5">
              {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover
                       transition-apple font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="px-5 py-3 border-b border-separator bg-surface-secondary/50">
          <div className="text-2xl font-bold text-label-primary tracking-tight">
            {formatNumber(stats.total)}
          </div>
          <div className="text-xs text-label-secondary">requests in view</div>
        </div>
      )}

      {/* Scrollable filter sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Date Range */}
        <FilterSection
          title="Time Range"
          icon={<Calendar className="w-4 h-4" />}
          expanded={expandedSections.has("date")}
          onToggle={() => toggleSection("date")}
        >
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onSetDatePreset(preset.value as DatePreset)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-apple",
                  filters.dateRange.preset === preset.value
                    ? "bg-accent text-white"
                    : "bg-surface-tertiary text-label-secondary hover:bg-surface-tertiary/80"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Status */}
        <FilterSection
          title="Status"
          icon={<AlertCircle className="w-4 h-4" />}
          expanded={expandedSections.has("status")}
          onToggle={() => toggleSection("status")}
          count={filters.statuses.length}
        >
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((status) => {
              const active = filters.statuses.includes(status);
              const color = getStatusColor(status);
              const stat = stats?.statusBreakdown.find(
                (s) => s.status?.toLowerCase() === status.toLowerCase()
              );
              return (
                <button
                  key={status}
                  onClick={() => onToggleStatus(status)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                    "font-medium transition-apple",
                    active
                      ? "bg-accent text-white"
                      : "bg-surface-tertiary text-label-secondary hover:bg-surface-tertiary/80"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: active ? "#fff" : color }}
                  />
                  {status}
                  {stat && (
                    <span className={cn("text-[10px]", active ? "text-white/70" : "text-label-tertiary")}>
                      {formatNumber(stat.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Borough */}
        <FilterSection
          title="Borough"
          icon={<MapPin className="w-4 h-4" />}
          expanded={expandedSections.has("borough")}
          onToggle={() => toggleSection("borough")}
          count={filters.boroughs.length}
        >
          <div className="flex flex-wrap gap-2">
            {BOROUGHS.map((borough) => {
              const active = filters.boroughs.includes(borough);
              return (
                <button
                  key={borough}
                  onClick={() => onToggleBorough(borough)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-apple capitalize",
                    active
                      ? "bg-accent text-white"
                      : "bg-surface-tertiary text-label-secondary hover:bg-surface-tertiary/80"
                  )}
                >
                  {borough.charAt(0) + borough.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Complaint Types */}
        <FilterSection
          title="Complaint Type"
          icon={<AlertCircle className="w-4 h-4" />}
          expanded={expandedSections.has("complaints")}
          onToggle={() => toggleSection("complaints")}
          count={filters.complaintTypes.length}
        >
          <input
            type="text"
            value={complaintSearch}
            onChange={(e) => setComplaintSearch(e.target.value)}
            placeholder="Search types..."
            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary text-xs text-label-primary
                       placeholder:text-label-tertiary outline-none mb-2
                       focus:ring-1 focus:ring-ring transition-apple"
          />

          {/* Top complaint types from stats */}
          {stats && filters.complaintTypes.length === 0 && !complaintSearch && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-label-tertiary mb-2 font-medium">
                Top in View
              </div>
              {stats.topComplaintTypes.slice(0, 5).map((item) => (
                <button
                  key={item.type}
                  onClick={() => onToggleComplaintType(item.type)}
                  className="w-full flex items-center justify-between py-1.5 text-xs
                             text-label-secondary hover:text-label-primary transition-apple"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: getComplaintColor(item.type) }}
                    />
                    <span className="truncate">{item.type}</span>
                  </div>
                  <span className="text-label-tertiary text-[10px]">
                    {formatNumber(item.count)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
            {filteredComplaintTypes.slice(0, 50).map((type) => {
              const active = filters.complaintTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => onToggleComplaintType(type)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-apple",
                    active
                      ? "bg-accent text-white"
                      : "text-label-secondary hover:bg-surface-tertiary"
                  )}
                >
                  {type}
                </button>
              );
            })}
            {filteredComplaintTypes.length > 50 && (
              <div className="text-xs text-label-tertiary px-3 py-1">
                +{filteredComplaintTypes.length - 50} more...
              </div>
            )}
          </div>
        </FilterSection>

        {/* Agencies */}
        <FilterSection
          title="Agency"
          icon={<Building className="w-4 h-4" />}
          expanded={expandedSections.has("agencies")}
          onToggle={() => toggleSection("agencies")}
          count={filters.agencies.length}
        >
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
            {agencies.map((agency) => {
              const active = filters.agencies.includes(agency);
              return (
                <button
                  key={agency}
                  onClick={() => onToggleAgency(agency)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-apple",
                    active
                      ? "bg-accent text-white"
                      : "text-label-secondary hover:bg-surface-tertiary"
                  )}
                >
                  {agency}
                </button>
              );
            })}
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}

/** Collapsible filter section component */
function FilterSection({
  title,
  icon,
  expanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-separator">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent-subtle
                   transition-apple"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-label-secondary">{icon}</span>
          <span className="text-sm font-medium text-label-primary">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="bg-accent text-white text-[10px] font-semibold
                            px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {count}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-label-tertiary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-label-tertiary" />
        )}
      </button>
      {expanded && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}
