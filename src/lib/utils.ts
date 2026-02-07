import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Debounce helper – returns a debounced version of fn */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Throttle helper – ensures fn runs at most once every ms */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (timer) clearTimeout(timer);
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/** Format a date string to a human-readable label */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date with time */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Calculate resolution time in human-readable form */
export function getResolutionTime(created: string, closed?: string): string {
  if (!closed) return "Open";
  const ms = new Date(closed).getTime() - new Date(created).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""}`;
}

/** Get a color for a complaint status */
export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "open":
      return "#ff9500"; // warm amber
    case "closed":
      return "#34c759"; // green
    case "pending":
      return "#5856d6"; // indigo
    case "in progress":
      return "#0a84ff"; // blue
    case "assigned":
      return "#af52de"; // purple
    default:
      return "#8e8e93"; // gray
  }
}

/** Get a readable label for status */
export function getStatusLabel(status: string): string {
  if (!status) return "Unknown";
  return status
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Format a large number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Generate a stable hash from a string (for consistent colors) */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Get a consistent muted color for a complaint type */
export function getComplaintColor(type: string): string {
  const colors = [
    "#0071e3", "#34c759", "#ff9500", "#ff3b30", "#5856d6",
    "#af52de", "#ff2d55", "#00c7be", "#30b0c7", "#a2845e",
  ];
  return colors[hashString(type) % colors.length];
}
