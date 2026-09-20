"use client";
import { useEffect, useState, useCallback } from "react";
import { Target, RefreshCw, Shield, Globe2, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Campaign } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
      if (data.length > 0) setSelected(data[0]);
    } catch (e: any) {
      setError(e.message || "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const sevDot = (s: string) => {
    if (s === "critical") return "bg-red-500";
    if (s === "high") return "bg-orange-500";
    if (s === "medium") return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Target className="w-5 h-5 text-purple-400" />
            Campaign Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Correlated threat actor campaigns grouped by shared infrastructure and indicators</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign list */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Campaigns</h2>
          </div>
          <div className="divide-y divide-slate-800/40">
            {loading ? (
              Array.from({length:3}).map((_,i) => <div key={i} className="p-4 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-48" /></div>)
            ) : campaigns.length === 0 ? (
              <EmptyState icon={Target} title="No campaigns" description="Campaigns are auto-detected when related threats share infrastructure." />
            ) : campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-4 hover:bg-slate-800/30 transition-colors ${selected?.id === c.id ? "bg-purple-600/10 border-l-2 border-purple-500" : "border-l-2 border-transparent"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${sevDot(c.severity)} ${c.is_active ? "status-blink" : ""}`} />
                  <span className="text-xs font-bold text-slate-200 truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={c.severity} />
                  <span className="text-[10px] font-mono text-slate-500">{c.case_count} case{c.case_count !== 1 ? "s" : ""}</span>
                  {c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">Active</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Campaign detail */}
        <div className="lg:col-span-2 space-y-5">
          {selected ? (
            <>
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={selected.severity} />
                      <span className="text-[10px] font-mono text-slate-500 capitalize">{selected.threat_type.replace(/_/g, " ")}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-100">{selected.name}</h2>
                    {selected.description && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{selected.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selected.is_active && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-blink" /> Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Linked Cases", val: selected.case_count, color: "text-blue-400" },
                    { label: "Threat Type", val: selected.threat_type.replace(/_/g, " "), color: "text-purple-400" },
                    { label: "Status", val: selected.is_active ? "Active" : "Inactive", color: selected.is_active ? "text-emerald-400" : "text-slate-500" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/60">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{label}</p>
                      <p className={`text-base font-black font-mono ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared indicators */}
              {Object.keys(selected.shared_indicators || {}).length > 0 && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-blue-400" />
                    Shared Threat Indicators
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(selected.shared_indicators).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 uppercase font-bold w-20 shrink-0">{key}:</span>
                        <span className="font-mono text-xs text-slate-200 break-all">{Array.isArray(val) ? val.join(", ") : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link href="/cases"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-blue-500/30 bg-blue-600/10 text-blue-400 text-sm font-semibold hover:bg-blue-600/20 transition-all">
                View All Related Cases <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <div className="glass-panel p-10 rounded-2xl">
              <EmptyState icon={Target} title="Select a campaign" description="Click a campaign on the left to see detailed intelligence." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
