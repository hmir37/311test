"use client";

/**
 * Data fetching hook for 311 requests.
 * Handles debounced fetching, bounding-box queries, pagination, and stats.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ServiceRequest, FilterState, BBox, ViewStats } from "@/types";
import {
  fetchRequests,
  fetchRequestCount,
  fetchTopComplaintTypes,
  fetchStatusBreakdown,
} from "@/lib/api";

interface UseRequestsReturn {
  requests: ServiceRequest[];
  total: number;
  stats: ViewStats | null;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
  refresh: () => void;
}

export function useRequests(filters: FilterState, bbox?: BBox): UseRequestsReturn {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Track the latest request to prevent stale updates
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Core fetch: load first page of requests + stats.
   * Uses a ref-based debounce to avoid hammering the API on rapid filter/pan changes.
   */
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(
    (f: FilterState, b: BBox | undefined, rid: number) => {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          setError(null);

          const [requestsRes, countRes, topTypes, statusBreak] = await Promise.all([
            fetchRequests(f, b, 0),
            fetchRequestCount(f, b),
            fetchTopComplaintTypes(f, b),
            fetchStatusBreakdown(f, b),
          ]);

          if (rid !== requestId.current) return;

          setRequests(requestsRes.data);
          setHasMore(requestsRes.hasMore);
          setTotal(countRes);
          setOffset(requestsRes.data.length);

          setStats({
            total: countRes,
            topComplaintTypes: topTypes.map((t) => ({
              type: t.complaint_type,
              count: parseInt(t.count, 10),
            })),
            statusBreakdown: statusBreak.map((s) => ({
              status: s.status,
              count: parseInt(s.count, 10),
            })),
            boroughBreakdown: [],
          });
        } catch (err) {
          if (rid !== requestId.current) return;
          setError(err instanceof Error ? err.message : "Failed to fetch data");
        } finally {
          if (rid === requestId.current) setLoading(false);
        }
      }, 400);
    },
    []
  );

  // Re-fetch when filters or bbox change
  useEffect(() => {
    const rid = ++requestId.current;
    fetchData(filters, bbox, rid);
  }, [filters, bbox, fetchData]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    try {
      setLoading(true);
      const res = await fetchRequests(filters, bbox, offset);
      setRequests((prev) => [...prev, ...res.data]);
      setHasMore(res.hasMore);
      setOffset((prev) => prev + res.data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoading(false);
    }
  }, [filters, bbox, offset, hasMore, loading]);

  // Manual refresh
  const refresh = useCallback(() => {
    const rid = ++requestId.current;
    fetchData(filters, bbox, rid);
  }, [filters, bbox, fetchData]);

  return { requests, total, stats, loading, error, loadMore, hasMore, refresh };
}
