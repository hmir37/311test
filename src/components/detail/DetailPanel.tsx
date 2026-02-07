"use client";

/**
 * Detail panel / side sheet for a selected 311 service request.
 * Slides in from the right with full request metadata.
 */

import { ServiceRequest } from "@/types";
import {
  X,
  MapPin,
  Clock,
  Building,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";
import {
  formatDateTime,
  getResolutionTime,
  getStatusColor,
  getStatusLabel,
  cn,
} from "@/lib/utils";

interface DetailPanelProps {
  request: ServiceRequest | null;
  onClose: () => void;
}

export default function DetailPanel({ request, onClose }: DetailPanelProps) {
  if (!request) return null;

  const statusColor = getStatusColor(request.status);
  const resolutionTime = getResolutionTime(request.created_date, request.closed_date);

  return (
    <div
      className="absolute top-16 md:top-[72px] right-3 md:right-4 bottom-4 z-20
                 w-[360px] glass rounded-2xl overflow-hidden flex flex-col
                 animate-slide-in-right"
      role="dialog"
      aria-label="Request details"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-separator">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: statusColor }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: statusColor }}
            >
              {getStatusLabel(request.status)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-label-primary leading-tight">
            {request.complaint_type}
          </h2>
          {request.descriptor && (
            <p className="text-sm text-label-secondary mt-1">{request.descriptor}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-apple
                     text-label-tertiary hover:text-label-primary flex-shrink-0 ml-3"
          aria-label="Close details"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <QuickStat
            label="Created"
            value={formatDateTime(request.created_date)}
            icon={<Calendar className="w-3.5 h-3.5" />}
          />
          <QuickStat
            label="Resolution Time"
            value={resolutionTime}
            icon={<Clock className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Location */}
        <DetailSection title="Location" icon={<MapPin className="w-4 h-4" />}>
          {request.incident_address && (
            <DetailRow label="Address" value={request.incident_address} />
          )}
          {request.city && <DetailRow label="City" value={request.city} />}
          {request.borough && (
            <DetailRow
              label="Borough"
              value={
                request.borough.charAt(0) +
                request.borough.slice(1).toLowerCase()
              }
            />
          )}
          {request.incident_zip && (
            <DetailRow label="ZIP Code" value={request.incident_zip} />
          )}
          {request.cross_street_1 && request.cross_street_2 && (
            <DetailRow
              label="Cross Streets"
              value={`${request.cross_street_1} & ${request.cross_street_2}`}
            />
          )}
          {request.community_board && (
            <DetailRow label="Community Board" value={request.community_board} />
          )}
        </DetailSection>

        {/* Request Info */}
        <DetailSection title="Request Info" icon={<FileText className="w-4 h-4" />}>
          <DetailRow label="ID" value={`#${request.unique_key}`} mono />
          <DetailRow label="Complaint Type" value={request.complaint_type} />
          {request.descriptor && (
            <DetailRow label="Descriptor" value={request.descriptor} />
          )}
          {request.location_type && (
            <DetailRow label="Location Type" value={request.location_type} />
          )}
        </DetailSection>

        {/* Agency */}
        <DetailSection title="Agency" icon={<Building className="w-4 h-4" />}>
          <DetailRow label="Agency" value={request.agency} />
          <DetailRow label="Agency Name" value={request.agency_name} />
          {request.facility_type && (
            <DetailRow label="Facility Type" value={request.facility_type} />
          )}
        </DetailSection>

        {/* Resolution */}
        {(request.resolution_description || request.closed_date) && (
          <DetailSection
            title="Resolution"
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            {request.closed_date && (
              <DetailRow
                label="Closed Date"
                value={formatDateTime(request.closed_date)}
              />
            )}
            {request.resolution_description && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-wider text-label-tertiary mb-1 font-medium">
                  Resolution
                </div>
                <p className="text-xs text-label-secondary leading-relaxed">
                  {request.resolution_description}
                </p>
              </div>
            )}
          </DetailSection>
        )}

        {/* Coordinates */}
        <DetailSection title="Coordinates" icon={<Tag className="w-4 h-4" />}>
          <DetailRow label="Latitude" value={String(request.latitude)} mono />
          <DetailRow label="Longitude" value={String(request.longitude)} mono />
        </DetailSection>
      </div>
    </div>
  );
}

/** Section grouping within the detail panel */
function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-label-tertiary">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-label-tertiary">
          {title}
        </h3>
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

/** Single key-value row */
function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-label-tertiary flex-shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-label-primary text-right",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Compact stat card */
function QuickStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface-secondary/50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-label-tertiary">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-label-tertiary font-medium">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold text-label-primary">{value}</div>
    </div>
  );
}
