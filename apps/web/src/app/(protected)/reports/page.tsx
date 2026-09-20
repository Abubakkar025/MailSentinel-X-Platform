"use client";
import { useState, useEffect, useCallback } from "react";
import { FileText, Download, ExternalLink, RefreshCw, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { CaseResponse } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function ReportsPage() {
  const [cases, setCases] = useState<CaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCases({ page_size: 50 });
      setCases(res.items);
    } catch (e: any) {
      setError(e.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleGenerate = async (caseId: string) => {
    setGenerating(caseId);
    try {
      window.open(api.getReportUrl(caseId), "_blank");
    } finally {
      setTimeout(() => setGenerating(null), 1500);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            Forensic Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate, view and download 10-section forensic HTML reports</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8"><ErrorState message={error} onRetry={load} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full soc-table">
              <thead>
                <tr>
                  <th>Case Ref</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length: 6}).map((_, i) => (
                    <tr key={i}>{Array.from({length: 7}).map((_, j) => (
                      <td key={j} className="py-4 px-4"><Skeleton className="h-3" /></td>
                    ))}</tr>
                  ))
                ) : cases.length === 0 ? (
                  <tr><td colSpan={7}>
                    <EmptyState icon={FileText} title="No reports available" description="Analyze emails to generate forensic reports." />
                  </td></tr>
                ) : cases.map(c => (
                  <tr key={c.id}>
                    <td className="py-4 px-4 font-mono text-[11px] text-blue-400 font-bold">{c.case_number}</td>
                    <td className="py-4 px-4 text-xs text-slate-200 max-w-[200px] truncate font-medium">{c.title}</td>
                    <td className="py-4 px-4"><SeverityBadge severity={c.severity} /></td>
                    <td className="py-4 px-4 font-mono text-sm font-black text-slate-200">{c.risk_score}</td>
                    <td className="py-4 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-4 px-4 font-mono text-[10px] text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <a
                          href={api.getReportUrl(c.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </a>
                        <a
                          href={api.getReportManifestUrl(c.id)}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" /> JSON
                        </a>
                        <button
                          onClick={() => handleGenerate(c.id)}
                          disabled={generating === c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                        >
                          {generating === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          Generate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
