/**
 * NYC 311 Socrata API Client
 *
 * Fetches live data from data.cityofnewyork.us using SoQL.
 * No API token required for public datasets (subject to throttling).
 * We include an app token header when available for higher rate limits.
 */

import { ServiceRequest, FilterState, BBox, RequestPoint, RequestCollection } from "@/types";
import { subHours, subDays, subMonths, format } from "date-fns";

const BASE_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const COUNT_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const APP_TOKEN = process.env.NEXT_PUBLIC_NYC_APP_TOKEN || "";

const HEADERS: Record<string, string> = {
  Accept: "application/json",
  ...(APP_TOKEN ? { "X-App-Token": APP_TOKEN } : {}),
};

/** Max records per request – Socrata hard limit is 50,000 */
const PAGE_SIZE = 2000;

/** Build a SoQL $where clause from filter state */
function buildWhereClause(filters: FilterState, bbox?: BBox): string {
  const clauses: string[] = [];

  // Always require geocoded records
  clauses.push("latitude IS NOT NULL");
  clauses.push("longitude IS NOT NULL");

  // Bounding box spatial filter
  if (bbox) {
    const [west, south, east, north] = bbox;
    clauses.push(`latitude >= ${south}`);
    clauses.push(`latitude <= ${north}`);
    clauses.push(`longitude >= ${west}`);
    clauses.push(`longitude <= ${east}`);
  }

  // Date range
  const { start, end } = getDateBounds(filters.dateRange);
  clauses.push(`created_date >= '${start}'`);
  clauses.push(`created_date <= '${end}'`);

  // Complaint types
  if (filters.complaintTypes.length > 0) {
    const types = filters.complaintTypes.map((t) => `'${t.replace(/'/g, "''")}'`).join(",");
    clauses.push(`complaint_type IN (${types})`);
  }

  // Statuses
  if (filters.statuses.length > 0) {
    const statuses = filters.statuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(",");
    clauses.push(`status IN (${statuses})`);
  }

  // Agencies
  if (filters.agencies.length > 0) {
    const agencies = filters.agencies.map((a) => `'${a.replace(/'/g, "''")}'`).join(",");
    clauses.push(`agency IN (${agencies})`);
  }

  // Boroughs
  if (filters.boroughs.length > 0) {
    const boros = filters.boroughs.map((b) => `'${b.replace(/'/g, "''")}'`).join(",");
    clauses.push(`borough IN (${boros})`);
  }

  // Resolution time advanced filter
  if (filters.maxResolutionHours) {
    clauses.push(
      `closed_date <= date_trunc_ymd(created_date) + ${filters.maxResolutionHours * 3600}`
    );
  }

  return clauses.join(" AND ");
}

/** Resolve date range preset to actual ISO bounds */
function getDateBounds(range: FilterState["dateRange"]): { start: string; end: string } {
  const now = new Date();
  const endStr = format(now, "yyyy-MM-dd'T'HH:mm:ss");

  if (range.preset !== "custom") {
    let startDate: Date;
    switch (range.preset) {
      case "24h":
        startDate = subHours(now, 24);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "1y":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }
    return {
      start: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
      end: endStr,
    };
  }

  return { start: range.start, end: range.end || endStr };
}

/** Fetch 311 requests with filtering, pagination, and bbox */
export async function fetchRequests(
  filters: FilterState,
  bbox?: BBox,
  offset = 0,
  limit = PAGE_SIZE
): Promise<{ data: ServiceRequest[]; hasMore: boolean }> {
  const where = buildWhereClause(filters, bbox);
  const params = new URLSearchParams({
    $where: where,
    $order: "created_date DESC",
    $limit: String(limit),
    $offset: String(offset),
    $select:
      "unique_key,created_date,closed_date,agency,agency_name,complaint_type,descriptor," +
      "location_type,incident_zip,incident_address,street_name,cross_street_1,cross_street_2," +
      "city,borough,latitude,longitude,status,resolution_description," +
      "resolution_action_updated_date,community_board,facility_type,park_facility_name,park_borough",
  });

  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);

  const data: ServiceRequest[] = await res.json();
  return { data, hasMore: data.length === limit };
}

/** Fetch count of matching requests */
export async function fetchRequestCount(filters: FilterState, bbox?: BBox): Promise<number> {
  const where = buildWhereClause(filters, bbox);
  const params = new URLSearchParams({
    $select: "count(*) as count",
    $where: where,
  });

  const res = await fetch(`${COUNT_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const [row] = await res.json();
  return parseInt(row?.count || "0", 10);
}

/** Fetch top complaint types for current filters */
export async function fetchTopComplaintTypes(
  filters: FilterState,
  bbox?: BBox,
  limit = 10
): Promise<{ complaint_type: string; count: string }[]> {
  const where = buildWhereClause(filters, bbox);
  const params = new URLSearchParams({
    $select: "complaint_type, count(*) as count",
    $where: where,
    $group: "complaint_type",
    $order: "count DESC",
    $limit: String(limit),
  });

  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Fetch status breakdown */
export async function fetchStatusBreakdown(
  filters: FilterState,
  bbox?: BBox
): Promise<{ status: string; count: string }[]> {
  const where = buildWhereClause(filters, bbox);
  const params = new URLSearchParams({
    $select: "status, count(*) as count",
    $where: where,
    $group: "status",
    $order: "count DESC",
    $limit: "10",
  });

  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Fetch all distinct complaint types (for filter options) */
export async function fetchComplaintTypes(): Promise<string[]> {
  const params = new URLSearchParams({
    $select: "DISTINCT complaint_type",
    $order: "complaint_type ASC",
    $limit: "500",
    $where: `created_date > '${format(subDays(new Date(), 90), "yyyy-MM-dd")}'`,
  });

  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r: { complaint_type: string }) => r.complaint_type).filter(Boolean);
}

/** Fetch all distinct agencies */
export async function fetchAgencies(): Promise<string[]> {
  const params = new URLSearchParams({
    $select: "DISTINCT agency",
    $order: "agency ASC",
    $limit: "100",
    $where: `created_date > '${format(subDays(new Date(), 90), "yyyy-MM-dd")}'`,
  });

  const res = await fetch(`${BASE_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((r: { agency: string }) => r.agency).filter(Boolean);
}

/** Convert raw requests to GeoJSON FeatureCollection for map rendering */
export function toGeoJSON(requests: ServiceRequest[]): RequestCollection {
  return {
    type: "FeatureCollection",
    features: requests
      .filter((r) => r.latitude && r.longitude)
      .map(
        (r): RequestPoint => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(r.longitude), Number(r.latitude)],
          },
          properties: r,
        })
      ),
  };
}

/** Geocode an address/location using Nominatim (free, no key needed) */
export async function geocode(query: string): Promise<
  { label: string; center: [number, number]; bbox?: [number, number, number, number] }[]
> {
  // Append NYC context for better results
  const fullQuery = query.toLowerCase().includes("new york")
    ? query
    : `${query}, New York City, NY`;

  const params = new URLSearchParams({
    q: fullQuery,
    format: "json",
    addressdetails: "1",
    limit: "5",
    countrycodes: "us",
    viewbox: "-74.26,40.47,-73.7,40.92",
    bounded: "1",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "NYC311Dashboard/1.0" },
  });

  if (!res.ok) return [];
  const data = await res.json();

  return data.map(
    (r: {
      display_name: string;
      lat: string;
      lon: string;
      boundingbox?: string[];
    }) => ({
      label: r.display_name,
      center: [parseFloat(r.lon), parseFloat(r.lat)] as [number, number],
      bbox: r.boundingbox
        ? ([
            parseFloat(r.boundingbox[2]), // west (min lon)
            parseFloat(r.boundingbox[0]), // south (min lat)
            parseFloat(r.boundingbox[3]), // east (max lon)
            parseFloat(r.boundingbox[1]), // north (max lat)
          ] as [number, number, number, number])
        : undefined,
    })
  );
}

/** Export visible data to CSV */
export function exportToCSV(requests: ServiceRequest[], filename = "311-requests.csv"): void {
  const headers = [
    "Unique Key", "Created Date", "Closed Date", "Agency", "Complaint Type",
    "Descriptor", "Address", "Borough", "ZIP", "Status", "Resolution",
    "Latitude", "Longitude",
  ];

  const rows = requests.map((r) => [
    r.unique_key,
    r.created_date,
    r.closed_date || "",
    r.agency,
    r.complaint_type,
    r.descriptor || "",
    r.incident_address || "",
    r.borough,
    r.incident_zip || "",
    r.status,
    r.resolution_description || "",
    r.latitude,
    r.longitude,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
