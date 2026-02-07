"use client";

/**
 * Subtle loading indicator overlaid on the map.
 * Apple-style: thin progress bar at top + minimal spinner.
 */

import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  loading: boolean;
}

export default function LoadingOverlay({ loading }: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
        <div
          className="h-full bg-accent animate-pulse"
          style={{
            animation: "loading-bar 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </>
  );
}
