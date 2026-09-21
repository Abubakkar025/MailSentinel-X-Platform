"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Activity, ExternalLink, GitBranch, Globe2, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";
import { useSystem } from "@/lib/event-bus";
import type { Campaign, CaseListResponse, CaseResponse, GeoThreat, RiskSeverity } from "@/lib/types";
import { SEVERITY_COLORS, SEVERITY_ORDER, type EnrichedThreat, type MapFocusRequest, type ThreatArc, type ThreatDataMode, type ThreatMapData } from "@/components/threat-map/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const ThreatGlobeView = dynamic(
  () => import("@/components/threat-map/globe3d/ThreatGlobeView").then((m) => m.ThreatGlobeView),
  { ssr: false }
);

function enrichThreats(
  geo: GeoThreat[],
  cases: CaseResponse[],
  campaigns: Campaign[],
  details: Map<string, { asn?: string; asnOrg?: string; usageType?: string; isMalicious?: boolean }>
): EnrichedThreat[] {
  const caseByNumber = new Map(cases.map((c) => [c.case_number, c]));
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  return geo.map((t) => {
    const c = caseByNumber.get(t.case_number);
    const campaign = c?.campaign_id ? campaignById.get(c.campaign_id) : undefined;
    const ipInCampaigns = campaigns.filter((camp) => {
      const ips = camp.shared_indicators?.ips as string[] | undefined;
      return Array.isArray(ips) && ips.includes(t.ip);
    });
    const relatedCases = campaign ? cases.filter((x) => x.campaign_id === campaign.id && x.case_number !== t.case_number).length : 0;
    const d = details.get(t.ip);
    return {
      ...t,
      id: `${t.ip}`,
      caseId: c?.id,
      title: c?.title,
      campaignId: c?.campaign_id ?? campaign?.id,
      campaignName: campaign?.name,
      createdAt: c?.created_at,
      isDemo: c?.is_demo ?? t.is_demo ?? false,
      asn: d?.asn,
      asnOrg: d?.asnOrg,
      usageType: d?.usageType,
      isMalicious: d?.isMalicious,
      relatedCases,
      relatedCampaigns: ipInCampaigns.length,
    };
  });
}

function buildArcs(threats: EnrichedThreat[]): ThreatArc[] {
  const byCampaign = new Map<string, EnrichedThreat[]>();
  for (const t of threats) {
    if (!t.campaignId || !t.lat || !t.lng) continue;
    const list = byCampaign.get(t.campaignId) ?? [];
    if (!list.some((x) => x.ip === t.ip)) list.push(t);
    byCampaign.set(t.campaignId, list);
  }

  const arcs: ThreatArc[] = [];
  for (const [campaignId, members] of byCampaign) {
    if (members.length < 2) continue;
    const ordered = [...members].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    const sample = Math.min(3, ordered.length);
    const worst = ordered.reduce<RiskSeverity>((acc, t) => (SEVERITY_ORDER.indexOf(t.severity) < SEVERITY_ORDER.indexOf(acc) ? t.severity : acc), "low");
    const pairs: Array<[EnrichedThreat, EnrichedThreat]> = [];
    for (let i = 0; i < sample - 1; i++) pairs.push([ordered[i], ordered[i + 1]]);
    if (pairs.length === 0 && ordered.length > 1) pairs.push([ordered[0], ordered[ordered.length - 1]]);
    pairs.forEach(([from, to], i) => {
      arcs.push({
        id: `${campaignId}-${i}`,
        fromId: from.id,
        toId: to.id,
        from: [from.lng, from.lat],
        to: [to.lng, to.lat],
        severity: worst,
        campaignId,
        campaignName: from.campaignName,
        label: from.campaignName ?? campaignId,
      });
    });
  }
  return arcs.slice(0, 12);
}

type ThreatIntelStatus = "loading" | "online" | "degraded" | "offline";

function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${pulse ? "status-blink" : ""}`}
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  );
}

/**
 * Per-service state derived from real fetch/renderer outcomes — never hard-coded.
 * API comes from the shared health poll, Threat Intel from this page's load()
 * results, Globe from the renderer itself. Services stay independent: the globe
 * does not go offline just because threat intel does.
 */
function ServiceStatusRow({
  apiOnline,
  tiStatus,
  globeOnline,
  dataMode,
}: {
  apiOnline: boolean | null;
  tiStatus: ThreatIntelStatus;
  globeOnline: boolean | null;
  dataMode: ThreatDataMode;
}) {
  const api = apiOnline === null ? { label: "API CHECKING", color: "#eab308", pulse: true }
    : apiOnline ? { label: "API ONLINE", color: "#22c55e", pulse: false }
    : { label: "API OFFLINE", color: "#ef4444", pulse: false };
  const ti = tiStatus === "loading" ? { label: "TI CHECKING", color: "#eab308", pulse: true }
    : tiStatus === "online" ? { label: "THREAT INTEL ONLINE", color: "#22c55e", pulse: false }
    : tiStatus === "degraded" ? { label: "TI DEGRADED", color: "#f59e0b", pulse: false }
    : { label: "TI OFFLINE", color: "#ef4444", pulse: false };
  const globe = globeOnline === null ? { label: "GLOBE CHECKING", color: "#eab308", pulse: true }
    : { label: "GLOBE ONLINE", color: "#22c55e", pulse: false };
  const mode = dataMode === "live" ? { label: "LIVE", color: "#22c55e" }
    : dataMode === "mixed" ? { label: "MIXED DATA", color: "#f59e0b" }
    : dataMode === "demo" ? { label: "DEMO DATA", color: "#eab308" }
    : { label: "NO DATA", color: "#64748b" };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5">
      <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: api.color }}>
        <StatusDot color={api.color} pulse={api.pulse} /> {api.label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: ti.color }}>
        <StatusDot color={ti.color} pulse={ti.pulse} /> {ti.label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: globe.color }}>
        <StatusDot color={globe.color} pulse={globe.pulse} /> {globe.label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: mode.color }}>
        <StatusDot color={mode.color} /> {mode.label}
      </span>
    </div>
  );
}

interface ActiveFilter {
  kind: "severity" | "country" | "campaign" | "asn";
  value: string;
}

const asnKey = (t: Pick<EnrichedThreat, "asnOrg" | "asn">) => t.asnOrg || t.asn || "Unattributed";

const POLL_INTERVAL_MS = 60_000;

export default function ThreatMapPage() {
  const router = useRouter();

  const [allThreats, setAllThreats] = useState<EnrichedThreat[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<EnrichedThreat | null>(null);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocusRequest | null>(null);
  const [tiStatus, setTiStatus] = useState<ThreatIntelStatus>("loading");
  const [globeOnline, setGlobeOnline] = useState<boolean | null>(null);
  const apiOnline = useSystem((s) => s.apiOnline);
  const events = useSystem((s) => s.events);
  const loadingRef = useRef(false);
  const lastLoadRef = useRef(0);
  const lastSeenEventRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setApiError(null);
    setTiStatus("loading");
    let geo: GeoThreat[];
    try {
      geo = await api.getGeoThreats();
    } catch (e: any) {
      setApiError(e?.message || "Threat intelligence API unavailable.");
      setTiStatus("offline");
      useSystem.getState().setTiAvailable(false);
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    useSystem.getState().setApiOnline(true);

    // Fail-safe: only map indicators with valid coordinates. Never fabricate a position.
    const mappable = geo.filter(
      (t) => Number.isFinite(t.lat) && Number.isFinite(t.lng) && !(t.lat === 0 && t.lng === 0)
    );

    const enrichment = await Promise.allSettled([
      api.getCases({ page_size: 100 }),
      api.getCampaigns(),
    ]);

    const enrichmentOk = enrichment.every((r) => r.status === "fulfilled");
    setTiStatus(enrichmentOk ? "online" : "degraded");
    useSystem.getState().setTiAvailable(true);

    const caseList = enrichment[0].status === "fulfilled" ? (enrichment[0].value as CaseListResponse).items : [];
    const campList = enrichment[1].status === "fulfilled" ? (enrichment[1].value as Campaign[]) : [];

    const caseByNumber = new Map(caseList.map((c) => [c.case_number, c.id]));
    const detailTargets = mappable
      .slice(0, 6)
      .map((t) => ({ ip: t.ip, caseId: caseByNumber.get(t.case_number) }))
      .filter((x): x is { ip: string; caseId: string } => Boolean(x.caseId));

    const detailResults = await Promise.allSettled(detailTargets.map((d) => api.getCaseDetail(d.caseId)));
    const details = new Map<string, { asn?: string; asnOrg?: string; usageType?: string; isMalicious?: boolean }>();
    detailResults.forEach((r, i) => {
      if (r.status === "rejected" || !r.value) return;
      const inv = r.value;
      const loc = (inv.ip_locations ?? []).find((l) => l.ip_address === detailTargets[i].ip) ?? inv.ip_locations?.[0];
      const rep = (inv.ip_reputations ?? []).find((rp) => rp.ip_address === detailTargets[i].ip);
      details.set(detailTargets[i].ip, {
        asn: loc?.asn,
        asnOrg: loc?.asn_org,
        usageType: rep?.usage_type,
        isMalicious: rep?.is_malicious,
      });
    });

    const enriched = enrichThreats(mappable, caseList, campList, details);
    setAllThreats(enriched);
    setCampaigns(campList);
    // Timestamp reflects this actual successful refresh (client-side only, no SSR markup).
    setLastUpdated(
      new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    lastLoadRef.current = Date.now();
    setSelected((prev) => (prev && enriched.some((t) => t.ip === prev.ip) ? prev : null));
    setLoading(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Safe polling: reuse the existing loader, skip hidden tabs and overlapping loads.
  // Filters, selection and camera are preserved because load() never resets them.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Event-driven refresh: a new investigation/case elsewhere publishes a
  // case/threat event on the shared bus — refetch so its marker appears.
  useEffect(() => {
    const latest = events[0];
    if (!latest || (latest.type !== "case" && latest.type !== "threat")) return;
    if (lastSeenEventRef.current === latest.id) return;
    lastSeenEventRef.current = latest.id;
    const at = new Date(latest.time).getTime();
    if (Number.isFinite(at) && at > lastLoadRef.current && !document.hidden) {
      void load();
    }
  }, [events, load]);

  const filteredThreats = useMemo(() => {
    const active = (kind: ActiveFilter["kind"]) => filters.find((f) => f.kind === kind)?.value;
    const sev = active("severity");
    const country = active("country");
    const campaign = active("campaign");
    const asn = active("asn");
    return allThreats.filter(
      (t) =>
        (!sev || t.severity === sev) &&
        (!country || (t.country || "Unknown") === country) &&
        (!campaign || t.campaignId === campaign) &&
        (!asn || asnKey(t) === asn)
    );
  }, [allThreats, filters]);

  const arcs = useMemo(() => buildArcs(filteredThreats), [filteredThreats]);

  const stats = useMemo(() => {
    const bySeverity = new Map<RiskSeverity, number>();
    for (const t of allThreats) bySeverity.set(t.severity, (bySeverity.get(t.severity) ?? 0) + 1);
    const byCountry = new Map<string, { count: number; worst: RiskSeverity }>();
    for (const t of allThreats) {
      const key = t.country || "Unknown";
      const prev = byCountry.get(key) ?? { count: 0, worst: "low" as RiskSeverity };
      prev.count += 1;
      if (SEVERITY_ORDER.indexOf(t.severity) < SEVERITY_ORDER.indexOf(prev.worst)) prev.worst = t.severity;
      byCountry.set(key, prev);
    }
    const countryRisk = (key: string) => {
      let worst: RiskSeverity = "low";
      for (const t of allThreats) {
        if ((t.country || "Unknown") === key && SEVERITY_ORDER.indexOf(t.severity) < SEVERITY_ORDER.indexOf(worst)) {
          worst = t.severity;
        }
      }
      return worst;
    };
    const byAsn = new Map<string, { count: number; worst: RiskSeverity }>();
    for (const t of allThreats) {
      const key = asnKey(t);
      const prev = byAsn.get(key) ?? { count: 0, worst: "low" as RiskSeverity };
      prev.count += 1;
      if (SEVERITY_ORDER.indexOf(t.severity) < SEVERITY_ORDER.indexOf(prev.worst)) prev.worst = t.severity;
      byAsn.set(key, prev);
    }
    const activeCampaigns = campaigns.filter((c) => c.is_active !== false).slice(0, 5);
    return {
      bySeverity,
      byCountry: [...byCountry.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5),
      countryRisk,
      byAsn: [...byAsn.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5),
      activeCampaigns,
    };
  }, [allThreats, campaigns]);

  const applyFilter = useCallback((kind: ActiveFilter["kind"], value: string) => {
    setFilters((prev) => {
      const existing = prev.find((f) => f.kind === kind);
      if (existing?.value === value) return prev.filter((f) => f.kind !== kind);
      return [...prev.filter((f) => f.kind !== kind), { kind, value }];
    });
  }, []);

  const countryCentroid = useCallback((country: string): [number, number] => {
    const pts = allThreats.filter((t) => (t.country || "Unknown") === country);
    if (pts.length === 0) return [0, 0];
    return [pts.reduce((s, p) => s + p.lng, 0) / pts.length, pts.reduce((s, p) => s + p.lat, 0) / pts.length];
  }, [allThreats]);

  const campaignCentroid = useCallback((campaignId: string): [number, number] => {
    const pts = allThreats.filter((t) => t.campaignId === campaignId);
    if (pts.length === 0) return [0, 0];
    return [pts.reduce((s, p) => s + p.lng, 0) / pts.length, pts.reduce((s, p) => s + p.lat, 0) / pts.length];
  }, [allThreats]);

  const asnCentroid = useCallback((asn: string): [number, number] => {
    const pts = allThreats.filter((t) => asnKey(t) === asn);
    if (pts.length === 0) return [0, 0];
    return [pts.reduce((s, p) => s + p.lng, 0) / pts.length, pts.reduce((s, p) => s + p.lat, 0) / pts.length];
  }, [allThreats]);

  const dataMode: ThreatDataMode = useMemo(() => {
    if (apiError) return "unavailable";
    if (allThreats.length === 0) return loading ? "unavailable" : "live";
    const demoCount = allThreats.filter((t) => t.isDemo).length;
    if (demoCount === 0) return "live";
    if (demoCount === allThreats.length) return "demo";
    return "mixed";
  }, [allThreats, apiError, loading]);

  const datus: ThreatMapData | null = loading ? null : {
    threats: filteredThreats,
    arcs,
    campaigns,
    totalThreats: allThreats.length,
    geolocated: allThreats.length,
    lastUpdated,
    isDemo: dataMode === "demo" || dataMode === "mixed",
    dataMode,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-blue-400" />
            Global Threat Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {filteredThreats.length} of {allThreats.length} geolocated threat IPs · {arcs.length} campaign relation{arcs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-[10px] font-mono">
            {SEVERITY_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLORS[s] }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            ))}
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {apiError && <ErrorState title="Threat Intelligence Offline" message={apiError} onRetry={load} />}

      <ServiceStatusRow apiOnline={apiOnline} tiStatus={tiStatus} globeOnline={globeOnline} dataMode={dataMode} />

      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => {
            const label =
              f.kind === "severity"
                ? `Severity: ${f.value}`
                : f.kind === "country"
                  ? `Country: ${f.value}`
                  : f.kind === "asn"
                    ? `ASN: ${f.value}`
                    : `Campaign: ${f.value}`;
            return (
              <span
                key={`${f.kind}:${f.value}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 font-mono text-[10px] text-blue-300"
              >
                {label}
                <button
                  onClick={() => setFilters((prev) => prev.filter((x) => !(x.kind === f.kind && x.value === f.value)))}
                  className="text-blue-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            onClick={() => {
              setFilters([]);
              setFocus({ kind: "reset" });
            }}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-wider"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-1 space-y-4">
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> By Severity
            </h2>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
            ) : (
              SEVERITY_ORDER.map((sev) => {
                const count = stats.bySeverity.get(sev) ?? 0;
                const pct = allThreats.length > 0 ? (count / allThreats.length) * 100 : 0;
                const active = filters.some((f) => f.kind === "severity" && f.value === sev);
                return (
                  <button
                    key={sev}
                    onClick={() => applyFilter("severity", sev)}
                    className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors ${active ? "border border-blue-500/40 bg-blue-500/10" : "hover:bg-slate-800/50"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs capitalize text-slate-400">{sev}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: SEVERITY_COLORS[sev] }}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: SEVERITY_COLORS[sev] }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl space-y-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Countries</h2>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
            ) : stats.byCountry.length === 0 ? (
              <p className="text-xs text-slate-600">No data</p>
            ) : (
              stats.byCountry.map(([country, { count }]) => {
                const active = filters.some((f) => f.kind === "country" && f.value === country);
                const worst = stats.countryRisk(country);
                return (
                  <button
                    key={country}
                    onClick={() => {
                      applyFilter("country", country);
                      setFocus({ kind: "country", value: country, coords: countryCentroid(country) });
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${active ? "border border-blue-500/40 bg-blue-500/10" : "hover:bg-slate-800/50"}`}
                  >
                    <span className="text-xs text-slate-400 truncate flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_COLORS[worst] }} />
                      {country}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{count}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl space-y-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Carriers / ASN</h2>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
            ) : stats.byAsn.length === 0 ? (
              <p className="text-xs text-slate-600">Enrichment pending</p>
            ) : (
              stats.byAsn.map(([asn, { count, worst }]) => {
                const active = filters.some((f) => f.kind === "asn" && f.value === asn);
                return (
                  <button
                    key={asn}
                    onClick={() => {
                      applyFilter("asn", asn);
                      setFocus({ kind: "asn", value: asn, coords: asnCentroid(asn) });
                    }}
                    title="Filter map to this infrastructure"
                    className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${active ? "border border-blue-500/40 bg-blue-500/10" : "hover:bg-slate-800/50"}`}
                  >
                    <span className="text-xs text-slate-400 truncate flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_COLORS[worst] }} />
                      {asn}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{count}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="glass-panel p-4 rounded-2xl space-y-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" /> Active Campaigns
            </h2>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
            ) : stats.activeCampaigns.length === 0 ? (
              <p className="text-xs text-slate-600">No active campaigns</p>
            ) : (
              stats.activeCampaigns.map((campaign) => {
                const members = allThreats.filter((t) => t.campaignId === campaign.id);
                const active = filters.some((f) => f.kind === "campaign" && f.value === campaign.id);
                const worst = members.reduce<RiskSeverity>(
                  (acc, t) => (SEVERITY_ORDER.indexOf(t.severity) < SEVERITY_ORDER.indexOf(acc) ? t.severity : acc),
                  "low"
                );
                return (
                  <button
                    key={campaign.id}
                    disabled={members.length === 0}
                    onClick={() => {
                      applyFilter("campaign", campaign.id);
                      setFocus({ kind: "campaign", value: campaign.id, coords: campaignCentroid(campaign.id) });
                    }}
                    className={`w-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                      active ? "border border-blue-500/40 bg-blue-500/10" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="text-xs text-slate-400 truncate flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_COLORS[worst] }} />
                      {campaign.name}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{members.length}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="xl:col-span-3">
          <ThreatGlobeView
            data={datus}
            loading={loading}
            apiError={apiError}
            focus={focus}
            selected={selected}
            onSelectThreat={setSelected}
            onEngineStatus={setGlobeOnline}
            onOpenCase={() => {
              if (selected?.case_number) router.push(`/cases?search=${encodeURIComponent(selected.case_number)}`);
              else router.push("/cases");
            }}
          />

          {selected && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
              <span>
                Selected <span className="text-blue-400 font-bold">{selected.ip}</span> · {selected.city}, {selected.country}
              </span>
              <span className="inline-flex items-center gap-1">
                Abuse score <b className="text-slate-300">{selected.abuse_score}</b>
              </span>
              <span>
                Case <span className="text-blue-400">{selected.case_number}</span>
              </span>
              {selected.campaignName && (
                <span className="inline-flex items-center gap-1 text-amber-400/80">
                  <GitBranch className="w-3 h-3" /> {selected.campaignName}
                </span>
              )}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/cases?search=${encodeURIComponent(selected.case_number)}`);
                }}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
              >
                Open case <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {!loading && !apiError && allThreats.length === 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500">
                No threat indicators geolocated yet. Upload emails with public IPs to populate the global threat map.
              </p>
            </div>
          )}

          <p className="mt-3 text-[9px] text-slate-600 italic">Approximate infrastructure geolocation only — not an exact physical location.</p>
        </div>
      </div>
    </div>
  );
}