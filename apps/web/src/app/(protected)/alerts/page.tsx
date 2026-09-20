"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Filter, RefreshCw } from "lucide-react";

const MOCK_ALERTS = [
  { id: "ALT-001", title: "Critical BEC Campaign Detected", body: "3 emails targeting CFO with wire transfer request. Shared infrastructure confirmed.", case: "case-002", severity: "critical", status: "open", source: "AI Engine", time: "2 min ago" },
  { id: "ALT-002", title: "Malicious IP Relay Identified", body: "185.234.72.19 — AbuseIPDB confidence 98%. Added to threat blocklist.", case: "case-001", severity: "high", status: "open", source: "Threat Intel", time: "8 min ago" },
  { id: "ALT-003", title: "New Phishing Kit Infrastructure", body: "Domain micros0ft-verify.com registered 2 days ago. 14/70 VT engines flagged.", case: "case-001", severity: "high", status: "acknowledged", source: "Threat Intel", time: "15 min ago" },
  { id: "ALT-004", title: "SPF/DKIM/DMARC Triple Failure", body: "All three authentication checks failed. High probability of domain spoofing.", case: "case-003", severity: "medium", status: "open", source: "Auth Analyzer", time: "31 min ago" },
  { id: "ALT-005", title: "Suspicious Attachment Hash Matched", body: "SHA-256 matched to known Emotet dropper in threat database.", case: "case-003", severity: "critical", status: "open", source: "Hash DB", time: "1 hr ago" },
  { id: "ALT-006", title: "Threat Intelligence Sync Completed", body: "1,204 new IOCs ingested from AbuseIPDB and VirusTotal feeds.", case: null, severity: "info", status: "resolved", source: "System", time: "2 hr ago" },
  { id: "ALT-007", title: "Campaign Cluster Detected", body: "7 related emails share originating IP. Auto-grouped into campaign MSX-CAMP-001.", case: "case-002", severity: "high", status: "open", source: "Campaign Engine", time: "3 hr ago" },
];

const SEV_CONFIG: Record<string, any> = {
  critical: { cls: "sev-critical", icon: AlertTriangle, dot: "bg-red-400" },
  high:     { cls: "sev-high",     icon: AlertCircle, dot: "bg-orange-400" },
  medium:   { cls: "sev-medium",   icon: AlertCircle, dot: "bg-yellow-400" },
  info:     { cls: "sev-info",     icon: Info, dot: "bg-blue-400" },
};

const STATUS_CLS: Record<string, string> = {
  open:         "bg-red-500/10 text-red-400 border border-red-500/25",
  acknowledged: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  resolved:     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
};

export default function AlertsPage() {
  const [sevFilter, setSevFilter] = useState("");
  const [statFilter, setStatFilter] = useState("");

  const filtered = MOCK_ALERTS.filter(a =>
    (!sevFilter || a.severity === sevFilter) &&
    (!statFilter || a.status === statFilter)
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-red-400" />
            Alert Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} alert{filtered.length !== 1 ? "s" : ""} — SOC triage queue</p>
        </div>
        <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Critical", count: MOCK_ALERTS.filter(a => a.severity === "critical").length, cls: "text-red-400", bg: "bg-red-500/10 border-red-500/25" },
          { label: "High",     count: MOCK_ALERTS.filter(a => a.severity === "high").length,     cls: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/25" },
          { label: "Medium",   count: MOCK_ALERTS.filter(a => a.severity === "medium").length,   cls: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/25" },
          { label: "Info",     count: MOCK_ALERTS.filter(a => a.severity === "info").length,     cls: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => setSevFilter(f => f === item.label.toLowerCase() ? "" : item.label.toLowerCase())}
            className={`glass-panel p-4 rounded-2xl border flex items-center gap-3 transition-all hover:scale-[1.02] cursor-pointer ${item.bg}`}
          >
            <span className={`text-2xl font-black font-mono ${item.cls}`}>{item.count}</span>
            <span className={`text-xs font-bold ${item.cls}`}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="glass-panel p-3 rounded-2xl flex items-center gap-3">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        {[
          { val: sevFilter, set: setSevFilter, opts: [["","All Severity"],["critical","Critical"],["high","High"],["medium","Medium"],["info","Info"]] },
          { val: statFilter, set: setStatFilter, opts: [["","All Status"],["open","Open"],["acknowledged","Acknowledged"],["resolved","Resolved"]] },
        ].map(({ val, set, opts }) => (
          <select key={opts[0][1]} value={val} onChange={e => set(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none">
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className={`glass-panel glass-panel-hover p-5 rounded-2xl flex items-start gap-4 ${alert.status === "resolved" ? "opacity-60" : ""}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.cls}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg.cls}`}>{alert.severity}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${STATUS_CLS[alert.status] || ""}`}>{alert.status}</span>
                  <span className="text-[10px] text-slate-600 font-mono">{alert.source}</span>
                  <span className="text-[10px] text-slate-600 font-mono ml-auto">{alert.time}</span>
                </div>
                <p className="text-sm font-semibold text-slate-200">{alert.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{alert.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {alert.case && (
                  <Link href={`/cases/${alert.case}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[11px] font-semibold hover:bg-blue-600/30 transition-colors">
                    Open Case
                  </Link>
                )}
                {alert.status === "open" && (
                  <button className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 transition-colors">
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
