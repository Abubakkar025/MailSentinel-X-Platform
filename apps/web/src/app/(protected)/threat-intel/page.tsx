"use client";
import { useState } from "react";
import { Database, Search, Globe2, Link2, Server, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { HashDisplay } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";

type TITab = "ip" | "domain" | "url";

function ResultCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/60">
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">{label}</p>
      <div className="text-xs text-slate-200">{children}</div>
    </div>
  );
}

export default function ThreatIntelPage() {
  const [tab, setTab] = useState<TITab>("ip");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const placeholders: Record<TITab, string> = {
    ip: "e.g. 185.220.101.47",
    domain: "e.g. secure-login-verify.tk",
    url: "e.g. https://phish.example.com/login",
  };

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      let data: any;
      if (tab === "ip") data = await api.getIpIntel(query.trim());
      else if (tab === "domain") data = await api.getDomainIntel(query.trim());
      else data = await api.getUrlIntel(query.trim());
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Threat intelligence provider returned an error.");
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;
    if (tab === "ip") {
      const r = result;
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${r.geo?.is_malicious || r.abuse_score > 50 ? "sev-critical" : "sev-info"}`}>
              {r.geo?.is_malicious || r.abuse_score > 50 ? "⚠ MALICIOUS" : "✓ CLEAN"}
            </div>
            <span className="font-mono text-xl text-slate-200 font-bold">{r.ip_address || query}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultCard label="Country">{r.geo?.country || r.country || "—"}</ResultCard>
            <ResultCard label="City">{r.geo?.city || "—"}</ResultCard>
            <ResultCard label="ISP / ASN">{r.geo?.isp || r.isp || r.geo?.asn_org || "—"}</ResultCard>
            <ResultCard label="Abuse Score">
              <span className={`font-mono font-black text-lg ${(r.abuse_score || 0) > 50 ? "text-red-400" : "text-emerald-400"}`}>
                {r.abuse_score || 0}
              </span>
              <span className="text-slate-500 text-xs"> / 100</span>
            </ResultCard>
            <ResultCard label="Total Reports">
              <span className="font-mono">{r.total_reports ?? "—"}</span>
            </ResultCard>
            <ResultCard label="Usage Type">{r.usage_type || "—"}</ResultCard>
          </div>
          <ResultCard label="Geo Coordinates">
            <span className="font-mono">{r.geo?.latitude ?? "—"}, {r.geo?.longitude ?? "—"}</span>
            <span className="ml-2 text-[10px] text-slate-600">(approximate infrastructure location)</span>
          </ResultCard>
        </div>
      );
    }
    if (tab === "domain") {
      const r = result;
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${r.is_suspicious ? "sev-critical" : "sev-info"}`}>
              {r.is_suspicious ? "⚠ SUSPICIOUS" : "✓ CLEAN"}
            </div>
            <span className="font-mono text-xl text-slate-200 font-bold">{r.domain_name || query}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultCard label="Registrar">{r.registrar || "—"}</ResultCard>
            <ResultCard label="Registration Date">{r.registration_date || "—"}</ResultCard>
            <ResultCard label="Age">
              <span className={`font-mono font-bold ${(r.age_days || 999) < 30 ? "text-red-400" : "text-emerald-400"}`}>
                {r.age_days !== undefined ? `${r.age_days} days` : "—"}
              </span>
              {r.is_newly_registered && <span className="ml-2 sev-high text-[10px] px-1.5 py-0.5 rounded">New</span>}
            </ResultCard>
          </div>
        </div>
      );
    }
    if (tab === "url") {
      const r = result;
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${r.is_malicious ? "sev-critical" : "sev-info"}`}>
              {r.is_malicious ? "⚠ MALICIOUS" : "✓ CLEAN"}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultCard label="Domain">{r.domain || "—"}</ResultCard>
            <ResultCard label="VT Detections">
              <span className={`font-mono font-black text-lg ${r.detection_count > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {r.detection_count} / {r.total_engines}
              </span>
            </ResultCard>
            <ResultCard label="Threat Type">{r.threat_type || "None"}</ResultCard>
            <ResultCard label="URL Shortened">{r.is_shortened ? "Yes" : "No"}</ResultCard>
          </div>
          <ResultCard label="Full URL">
            <span className="font-mono text-[11px] text-amber-300 break-all">{r.url || query}</span>
          </ResultCard>
        </div>
      );
    }
  };

  const tabs: { id: TITab; label: string; icon: any }[] = [
    { id: "ip",     label: "IP Address",  icon: Server  },
    { id: "domain", label: "Domain",      icon: Globe2  },
    { id: "url",    label: "URL Scanner", icon: Link2   },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
          <Database className="w-5 h-5 text-blue-400" />
          Threat Intelligence
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Query live threat intelligence providers — AbuseIPDB, VirusTotal, RDAP, ip-api.com</p>
      </div>

      {/* Tab bar */}
      <div className="glass-panel p-1.5 rounded-2xl flex gap-1 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setResult(null); setError(null); setQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Lookup box */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && lookup()}
              placeholder={placeholders[tab]}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500/60 transition-all"
            />
          </div>
          <button
            onClick={lookup}
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/30"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Lookup
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          <Clock className="w-3 h-3" />
          Results are cached for 1 hour. External APIs may be unavailable in offline mode.
        </div>
      </div>

      {/* Results */}
      {error && <div className="glass-panel p-5 rounded-2xl"><ErrorState title="Provider Unavailable" message={error} onRetry={lookup} /></div>}

      {result && (
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Intelligence Report
          </h2>
          {renderResult()}
        </div>
      )}
    </div>
  );
}
