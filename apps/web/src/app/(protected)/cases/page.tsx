"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Inbox, Search, RefreshCw, ArrowRight, ChevronUp, ChevronDown,
  Filter
} from "lucide-react";
import { api } from "@/lib/api";
import { CaseResponse } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

type SortField = "risk_score" | "created_at" | "case_number";
type SortDir = "asc" | "desc";

const SortBtn = ({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) => (
  <button
    onClick={() => onSort(field)}
    className="flex items-center gap-1 hover:text-blue-400 transition-colors"
  >
    {label}
    {sortField === field ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-30" />}
  </button>
);

export default function CasesPage() {
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCases({
        search: search || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        page,
        page_size: pageSize,
      });
      setCases(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, severityFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const sorted = [...cases].sort((a, b) => {
    let diff = 0;
    if (sortField === "risk_score") diff = a.risk_score - b.risk_score;
    else if (sortField === "created_at") diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else diff = a.case_number.localeCompare(b.case_number);
    return sortDir === "asc" ? diff : -diff;
  });

const handleSort = (field: SortField) => {
    setSortDir(sortField === field && sortDir === "asc" ? "desc" : "asc");
    setSortField(field);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-blue-400" />
            Case Investigations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? "Loading…" : `${total} total case${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/investigate"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
          >
            New Investigation
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search case ID, title, subject…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          {[
            { val: statusFilter, set: (v: string) => { setStatusFilter(v); setPage(1); }, label: "Status", opts: [["", "All Status"], ["open", "Open"], ["investigating", "Investigating"], ["resolved", "Resolved"], ["closed", "Closed"]] },
            { val: severityFilter, set: (v: string) => { setSeverityFilter(v); setPage(1); }, label: "Severity", opts: [["", "All Severity"], ["critical", "Critical"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]] },
          ].map(({ val, set, opts }) => (
            <select
              key={opts[0][1]}
              value={val}
              onChange={e => set(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50"
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8"><ErrorState message={error} onRetry={load} /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full soc-table">
                <thead>
                  <tr>
                    <th><SortBtn field="case_number" label="Case Ref" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                    <th>Subject / Title</th>
                    <th>Threat Type</th>
                    <th>Severity</th>
                    <th><SortBtn field="risk_score" label="Risk Score" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                    <th>Status</th>
                    <th><SortBtn field="created_at" label="Created" sortField={sortField} sortDir={sortDir} onSort={handleSort} /></th>
                    <th className="text-right pr-5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-4"><Skeleton className="h-3" /></td>
                      ))}</tr>
                    ))
                  ) : sorted.length === 0 ? (
                    <tr><td colSpan={8}>
                      <EmptyState icon={Inbox} title="No cases found" description="Adjust filters or upload an email to start investigating." />
                    </td></tr>
                  ) : (
                    sorted.map(c => (
                      <tr key={c.id} className="group">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-blue-400 font-bold">{c.case_number}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-200 font-medium max-w-[220px] truncate">{c.title}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-slate-800/60 text-slate-400 border border-slate-700/50">
                            {c.threat_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4"><SeverityBadge severity={c.severity} /></td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-black ${c.risk_score >= 76 ? "text-red-400" : c.risk_score >= 51 ? "text-orange-400" : c.risk_score >= 26 ? "text-yellow-400" : "text-emerald-400"}`}>
                              {c.risk_score}
                            </span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full max-w-[60px]">
                              <div className={`h-1.5 rounded-full ${c.risk_score >= 76 ? "bg-red-500" : c.risk_score >= 51 ? "bg-orange-500" : c.risk_score >= 26 ? "bg-yellow-500" : "bg-emerald-500"}`}
                                style={{ width: `${c.risk_score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={c.status} /></td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"
                          >
                            Inspect <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 font-mono">Page {page} of {totalPages} — {total} total</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
