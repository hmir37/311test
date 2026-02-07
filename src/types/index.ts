/**
 * Core type definitions for NYC 311 Service Request data.
 * Aligned with the Socrata API schema at data.cityofnewyork.us.
 */

export interface ServiceRequest {
  unique_key: string;
  created_date: string;
  closed_date?: string;
  agency: string;
  agency_name: string;
  complaint_type: string;
  descriptor?: string;
  location_type?: string;
  incident_zip?: string;
  incident_address?: string;
  street_name?: string;
  cross_street_1?: string;
  cross_street_2?: string;
  city?: string;
  borough: string;
  latitude: number;
  longitude: number;
  status: string;
  resolution_description?: string;
  resolution_action_updated_date?: string;
  community_board?: string;
  facility_type?: string;
  park_facility_name?: string;
  park_borough?: string;
}

/** GeoJSON-ready point for map rendering */
export interface RequestPoint {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: ServiceRequest;
}

export interface RequestCollection {
  type: "FeatureCollection";
  features: RequestPoint[];
}

/** Filter state – drives all data queries and URL params */
export interface FilterState {
  complaintTypes: string[];
  statuses: string[];
  agencies: string[];
  boroughs: string[];
  dateRange: DateRange;
  /** Resolution time filter in hours (optional advanced filter) */
  maxResolutionHours?: number;
}

export interface DateRange {
  preset: DatePreset | "custom";
  start: string; // ISO date string
  end: string;   // ISO date string
}

export type DatePreset = "24h" | "7d" | "30d" | "90d" | "1y";

/** Bounding box for viewport queries: [west, south, east, north] */
export type BBox = [number, number, number, number];

/** Summary stats for current view */
export interface ViewStats {
  total: number;
  topComplaintTypes: { type: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  boroughBreakdown: { borough: string; count: number }[];
}

/** Map viewport state */
export interface ViewportState {
  center: [number, number];
  zoom: number;
  bounds?: BBox;
}

/** Search result from geocoding */
export interface SearchResult {
  label: string;
  center: [number, number];
  bbox?: BBox;
  type: "address" | "intersection" | "zipcode" | "neighborhood" | "borough";
}

/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
  total: number;
  hasMore: boolean;
}
