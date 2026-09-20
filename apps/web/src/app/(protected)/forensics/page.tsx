"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BookOpen, RefreshCw, Clock, Shield, CheckCircle2, FileText, Search, Cpu, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { CaseResponse, ForensicEvent } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { HashDisplay } from "@/components/ui/copy-button";

const EVENT_ICON: Record<string, any> = {
  file_uploaded:   { icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/15" },
  email_parsed:    { icon: Search,      color: "text-purple-400",  bg: "bg-purple-500/15" },
  ai_analysis:     { icon: Cpu,         color: "text-violet-400",  bg: "bg-violet-500/15" },
  risk_scored:     { icon: Shield,      color: "text-amber-400",   bg: "bg-amber-500/15" },
  report_generated:{ icon: FileText,    color: "text-emerald-400", bg: "bg-emerald-500/15" },
  default:         { icon: Activity,    color: "text-slate-400",   bg: "bg-slate-800/50" },
};

export default function ForensicsPage() {
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<ForensicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
const res = await api.getCases({ page_size: 50 });
      setCases(res.items);
      if (res.items.length > 0) {
        setSelectedCase((cur) => cur ?? res.items[0].id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
    const t = setTimeout(() => { loadCases(); }, 0);
    return () => clearTimeout(t);
  }, [loadCases]);

  useEffect(() => {
    if (!selectedCase) return;
    const t = setTimeout(() => {
      setTimelineLoading(true);
      api.getCaseTimeline(selectedCase)
        .then(setTimeline)
        .catch(() => setTimeline([]))
        .finally(() => setTimelineLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [selectedCase]);

  const sc = cases.find(c => c.id === selectedCase);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Forensic Evidence Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Digital chain-of-custody, evidence integrity verification, and immutable audit logs</p>
        </div>
        <button onClick={loadCases} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadCases} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case selector */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Evidence Item</h2>
          </div>
          <div className="divide-y divide-slate-800/40 overflow-y-auto max-h-[60vh]">
            {loading ? Array.from({length:5}).map((_,i) => (
              <div key={i} className="p-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-48" /></div>
            )) : cases.length === 0 ? (
              <EmptyState icon={BookOpen} title="No cases" description="Upload an email to create forensic evidence." />
            ) : cases.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-slate-800/30 transition-colors ${selectedCase === c.id ? "bg-blue-600/10 border-l-2 border-blue-500" : "border-l-2 border-transparent"}`}
              >
                <div className="font-mono text-[11px] text-blue-400 font-bold">{c.case_number}</div>
                <div className="text-xs text-slate-300 truncate mt-0.5">{c.title}</div>
                <div className="text-[10px] text-slate-600 font-mono mt-1">{new Date(c.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Evidence detail + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Evidence header */}
          {sc && (
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Evidence Record — {sc.case_number}
                </h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Integrity Verified
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                {[
                  { label: "Case ID", val: sc.id, mono: true },
                  { label: "Case Number", val: sc.case_number, mono: true },
                  { label: "Status", val: sc.status, mono: false },
                  { label: "Ingested", val: new Date(sc.created_at).toLocaleString(), mono: true },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{item.label}</span>
                    <span className={`text-slate-200 ${item.mono ? "font-mono text-[11px]" : "text-xs font-semibold"}`}>{item.val}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href={`/cases/${sc.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
                  Open Investigation Console
                </Link>
                <a href={api.getReportUrl(sc.id)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-800 transition-all">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Forensic Report
                </a>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="glass-panel p-5 rounded-2xl">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-5">
              <Clock className="w-4 h-4 text-blue-400" />
              Chain-of-Custody Event Log
            </h2>
            {timelineLoading ? (
              <div className="space-y-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : timeline.length === 0 ? (
              <EmptyState icon={Clock} title="No events recorded" description="Timeline will populate as analysis steps complete." />
            ) : (
              <div className="relative border-l-2 border-slate-800 ml-4 space-y-5">
                {timeline.map((evt, i) => {
                  const cfg = EVENT_ICON[evt.event_type] || EVENT_ICON.default;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="relative pl-6">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center absolute -left-[15px] top-0 ring-2 ring-[#070b14] ${cfg.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="glass-panel p-4 rounded-xl text-xs space-y-1.5 bg-slate-900/60">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-200 uppercase tracking-wide text-[11px] font-mono">
                            {evt.event_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">{new Date(evt.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-400 font-mono text-[11px]">Actor: <span className="text-slate-300">{evt.actor}</span></p>
                        {evt.evidence_hash && <HashDisplay hash={evt.evidence_hash} label="Hash" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
