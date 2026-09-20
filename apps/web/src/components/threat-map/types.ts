import type { Campaign, GeoThreat } from "@/lib/types";

export type SeverityKey = "critical" | "high" | "medium" | "low" | "info";

export interface SeverityStyle {
  color: string;
  label: string;
  order: number;
  tempo: number;
}

export const SEVERITY_COLORS: Record<SeverityKey, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#22c55e",
};

export const SEVERITY_STYLE: Record<SeverityKey, SeverityStyle> = {
  critical: { color: "#ef4444", label: "Critical", order: 0, tempo: 0.05 },
  high: { color: "#f97316", label: "High", order: 1, tempo: 0.036 },
  medium: { color: "#eab308", label: "Medium", order: 2, tempo: 0.024 },
  low: { color: "#3b82f6", label: "Low", order: 3, tempo: 0.016 },
  info: { color: "#22c55e", label: "Info", order: 4, tempo: 0.016 },
};

export const SEVERITY_ORDER: SeverityKey[] = ["critical", "high", "medium", "low"];

export interface EnrichedThreat extends GeoThreat {
  id: string;
  caseId?: string;
  title?: string;
  campaignId?: string;
  campaignName?: string;
  createdAt?: string;
  isDemo?: boolean;
  asn?: string;
  asnOrg?: string;
  usageType?: string;
  isMalicious?: boolean;
  relatedCases: number;
  relatedCampaigns: number;
}

export interface ThreatArc {
  id: string;
  fromId: string;
  toId: string;
  from: [number, number];
  to: [number, number];
  severity: SeverityKey;
  campaignId: string;
  campaignName?: string;
  label: string;
}

export type MapProjectionMode = "globe" | "mercator";

export interface MapFocusRequest {
  kind: "country" | "ip" | "campaign" | "reset";
  value?: string;
  coords?: [number, number];
}

export interface ThreatMapData {
  threats: EnrichedThreat[];
  arcs: ThreatArc[];
  campaigns: Campaign[];
  totalThreats: number;
  geolocated: number;
  lastUpdated: string | null;
  isDemo: boolean;
}