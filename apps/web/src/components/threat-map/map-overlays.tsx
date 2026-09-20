"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Globe2,
  Loader2,
  Radio,
  RefreshCw,
  ShieldAlert,
  GitBranch,
} from "lucide-react";
import type { ThreatMapData } from "./types";

export type MapStatus = "booting" | "loading" | "online" | "error" | "nowebgl";

const STATUS_META: Record<MapStatus, { label: string; color: string; pulse?: boolean }> = {
  booting: { label: "INITIALIZING 3D GLOBE", color: "#eab308", pulse: true },
  loading: { label: "LOADING BASEMAP", color: "#38bdf8", pulse: true },
  online: { label: "MAP ONLINE · 3D GLOBE", color: "#22c55e", pulse: true },
  error: { label: "MAP PROVIDER UNAVAILABLE", color: "#ef4444" },
  nowebgl: { label: "3D MAP UNAVAILABLE", color: "#ef4444" },
};

export function MapStatusPill({ status, engine }: { status: MapStatus; engine?: string }) {
  const meta = STATUS_META[status];
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-slate-800/80 bg-[#070d1c]/90 px-2.5 py-1.5 backdrop-blur-md">
      <span
        className={`h-2 w-2 rounded-full ${meta.pulse ? "status-blink" : ""}`}
        style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: meta.color }}>
        {meta.label}
      </span>
      {engine && (
        <span className="rounded border border-slate-700/70 bg-slate-800/50 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.14em] text-slate-300">
          ENGINE {engine}
        </span>
      )}
    </div>
  );
}

export function MapLoadingOverlay({ stage }: { stage: "basemap" | "indicators" }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#050811]/75 backdrop-blur-[2px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-slate-300 uppercase">
        {stage === "basemap" ? "Initializing Global Vector Basemap…" : "Loading Threat Indicators…"}
      </p>
      <p className="font-mono text-[9px] text-slate-500">Connecting to secure geospatial infrastructure</p>
    </div>
  );
}

export function MapErrorOverlay({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050811]/80 backdrop-blur-[2px]">
      <div className="mx-4 max-w-sm rounded-2xl border border-red-500/30 bg-[#0b0f1d]/95 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-200">Map Data Source Unavailable</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-400">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}

export function MapWebGLErrorOverlay() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050811]/80 backdrop-blur-[2px]">
      <div className="mx-4 max-w-sm rounded-2xl border border-red-500/30 bg-[#0b0f1d]/95 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
          <ShieldAlert className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-sm font-bold text-slate-200">WebGL Acceleration Not Available</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-400">
          This 3D geospatial visualization requires WebGL hardware acceleration. Please check your browser settings or graphics drivers.
        </p>
      </div>
    </div>
  );
}

export function MapFilterEmptyOverlay() {
  return (
    <div className="pointer-events-none absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-slate-800/90 bg-[#070d1c]/95 px-3.5 py-1.5 font-mono text-[10px] tracking-wider text-amber-400/90 shadow-xl backdrop-blur-sm">
      NO THREAT INDICATORS MATCH CURRENT FILTERS
    </div>
  );
}

export interface ThreatIntelStatus {
  loading: boolean;
  blocked: boolean;
  data: ThreatMapData | null;
  threatsVisible: boolean;
  arcsVisible: boolean;
  heatmapEnabled: boolean;
  error: string | null;
  terrainDev?: boolean;
}

function StatChip({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${accent ? "text-blue-400" : "text-slate-500"}`} />
      <span className="font-mono text-[10px] font-bold text-slate-200">{value}</span>
      <span className="font-mono text-[9px] tracking-wider text-slate-500 uppercase">{label}</span>
    </div>
  );
}

export function MapStatusBar({ status }: { status: ThreatIntelStatus }) {
  const { loading, blocked, data, threatsVisible, arcsVisible, heatmapEnabled, error, terrainDev } = status;

  let dotColor = "#64748b";
  let label = "THREAT INTELLIGENCE OFFLINE";
  let tagColor = "#64748b";
  if (loading) {
    dotColor = "#eab308";
    label = "SYNCING THREAT INTEL";
    tagColor = "#eab308";
  } else if (blocked) {
    dotColor = "#ef4444";
    label = "THREAT INTEL OFFLINE";
    tagColor = "#ef4444";
  } else {
    dotColor = "#22c55e";
    label = "LIVE INTELLIGENCE";
    tagColor = "#22c55e";
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-12rem)] flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-800/80 bg-[#070d1c]/90 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {!blocked && !loading && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: dotColor }} />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: dotColor }} />
        </span>
        <span className="font-mono text-[9px] font-bold tracking-[0.18em]" style={{ color: tagColor }}>
          {label}
        </span>
      </div>

      {!blocked && data && (
        <>
          <StatChip icon={Radio} value={data.geolocated} label={`${data.totalThreats} total`} accent />
          <StatChip icon={Activity} value={data.arcs.length} label="arcs" />
          <StatChip icon={GitBranch} value={data.campaigns.length} label="campaigns" />
          {data.isDemo && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-amber-400">
              DEMO DATA
            </span>
          )}
          {terrainDev && (
            <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-sky-400">
              DEV TERRAIN
            </span>
          )}
          <span className="font-mono text-[9px] tracking-wider text-slate-500">UPD {data.lastUpdated ?? "—"}</span>
        </>
      )}

      {blocked && error && (
        <span className="max-w-52 truncate font-mono text-[9px] text-red-400/90">{error}</span>
      )}

      <div className="hidden items-center gap-3 sm:flex">
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: threatsVisible ? "#38bdf8" : "#475569" }}>
          <Globe2 className="h-3 w-3" /> Threats {threatsVisible ? "on" : "off"}
        </span>
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: arcsVisible ? "#38bdf8" : "#475569" }}>
          <GitBranch className="h-3 w-3" /> Arcs {arcsVisible ? "on" : "off"}
        </span>
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: heatmapEnabled ? "#38bdf8" : "#475569" }}>
          <Activity className="h-3 w-3" /> Heatmap {heatmapEnabled ? "on" : "off"}
        </span>
      </div>
    </div>
  );
}