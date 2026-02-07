"use client";

/**
 * Compact analytics summary widget overlaid on the map.
 * Shows a mini bar chart of top complaint types in the current view.
 * Apple-style: minimal, glass-morphism, subtle.
 */

import { ViewStats } from "@/types";
import { formatNumber, getComplaintColor, cn } from "@/lib/utils";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface AnalyticsSummaryProps {
  stats: ViewStats | null;
  visible: boolean;
}

export default function AnalyticsSummary({ stats, visible }: AnalyticsSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  if (!visible || !stats || stats.topComplaintTypes.length === 0) return null;

  const maxCount = stats.topComplaintTypes[0]?.count || 1;

  return (
    <div className="absolute bottom-14 right-4 z-10 w-72 pointer-events-auto">
      <div className="glass rounded-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent-subtle
                     transition-apple"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-label-tertiary" />
            <span className="text-xs font-semibold text-label-primary">
              Top Complaints
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-label-tertiary" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-label-tertiary" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-3 space-y-2">
            {stats.topComplaintTypes.slice(0, 6).map((item, i) => (
              <div key={item.type} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-label-secondary truncate flex-1 mr-2">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-label-tertiary font-mono flex-shrink-0">
                    {formatNumber(item.count)}
                  </span>
                </div>
                <div className="h-1 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: getComplaintColor(item.type),
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
