"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert, Mail, AlertTriangle, Activity, Globe2, Link2,
  Server, Cpu, Zap, RefreshCw, TrendingUp, TrendingDown,
  ChevronRight, ArrowRight, CheckCircle2, XCircle, Clock, Shield, Search
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api";
import { DashboardStats, ThreatChartPoint, CaseResponse, GeoThreat } from "@/lib/types";
import { SeverityBadge, StatusBadge } from "@/components/ui/status-badge";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
const PIE_LABELS = ["Phishing", "BEC", "Malware", "Benign"];

function MetricCard({ label, value, icon: Icon, trend, trendVal, color }: any) {
  return (
    <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col gap-3 cursor-default animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-100 font-mono">{value ?? <Skeleton className="h-8 w-20" />}</div>
        {trendVal !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trendVal}</span>
            <span className="text-slate-600 font-normal">vs last 7d</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<ThreatChartPoint[]>([]);
  const [recent, setRecent] = useState<CaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, r] = await Promise.all([
        api.getDashboardStats(),
        api.getThreatChart(),
        api.getRecentCases(),
      ]);
      setStats(s);
      setChart(c);
      setRecent(r);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setNow(new Date());
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Pie data from stats
  const pieData = stats
    ? [
        { name: "Phishing", value: stats.phishing_count },
        { name: "BEC", value: stats.bec_count },
        { name: "Malware", value: Math.max(0, stats.threats_detected - stats.phishing_count - stats.bec_count) },
        { name: "Benign", value: Math.max(0, stats.total_analyzed - stats.threats_detected) },
      ]
    : [];

  const sevClass = (s: string) => {
    if (s === "critical") return "sev-critical";
    if (s === "high") return "sev-high";
    if (s === "medium") return "sev-medium";
    return "sev-low";
  };

  // Build live feed from recent cases (sorted descending)
  const liveFeed = useMemo(() => {
    return [...recent].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10).map(c => {
      let icon = Mail;
      let color = "text-blue-400";
      if (c.severity === "critical") { icon = AlertTriangle; color = "text-red-400"; }
      else if (c.severity === "high") { icon = ShieldAlert; color = "text-orange-400"; }
      else if (c.severity === "medium") { icon = Search; color = "text-yellow-400"; }
      
      let msg = `New case ingested: ${c.title || "Untitled"}`;
      if (c.status === "resolved") msg = `Case resolved: ${c.title}`;
      if (c.risk_score > 80) msg = `High risk threat detected (${c.risk_score}/100): ${c.title}`;

      return {
        id: c.id,
        icon,
        color,
        msg,
        time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        sev: c.severity,
        case_number: c.case_number
      };
    });
  }, [recent]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-400" />
            Security Operations Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Last sync: {now ? now.toLocaleTimeString() : "—"} — MailSentinel X v1.0.0
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* System health pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "API", online: !error },
              { label: "AI Engine", online: true },
              { label: "Threat Intel", online: true },
            ].map(({ label, online }) => (
              <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ${online ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/8" : "border-red-500/30 text-red-400 bg-red-500/8"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 status-blink" : "bg-red-400"}`} />
                {label}
              </div>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/investigate"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
          >
            <Zap className="w-3.5 h-3.5" /> New Investigation
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Emails Analyzed" value={stats?.total_analyzed ?? "—"} icon={Mail} trend="up" trendVal="+12%" color="bg-blue-500/15 text-blue-400" />
        <MetricCard label="Threats Detected" value={stats?.threats_detected ?? "—"} icon={ShieldAlert} trend="up" trendVal="+8%" color="bg-red-500/15 text-red-400" />
        <MetricCard label="Critical Incidents" value={stats?.critical_incidents ?? "—"} icon={AlertTriangle} trend="down" trendVal="-3%" color="bg-orange-500/15 text-orange-400" />
        <MetricCard label="Phishing Cases" value={stats?.phishing_count ?? "—"} icon={Activity} trend="up" trendVal="+5%" color="bg-amber-500/15 text-amber-400" />
        <MetricCard label="BEC Cases" value={stats?.bec_count ?? "—"} icon={Globe2} trend="up" trendVal="+2%" color="bg-purple-500/15 text-purple-400" />
        <MetricCard label="Active Campaigns" value="—" icon={Cpu} color="bg-cyan-500/15 text-cyan-400" />
      </div>

      {/* ── Chart Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-200">Threat Activity — Last 30 Days</h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              {[["Phishing","#ef4444"],["BEC","#f97316"],["Malware","#8b5cf6"],["Benign","#22c55e"]].map(([l,c]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{background:c}} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chart} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                <defs>
                  {[["phishing","#ef4444"],["bec","#f97316"],["malware","#8b5cf6"],["benign","#22c55e"]].map(([k,c]) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: 10, fontSize: 11 }} />
                <Area type="monotone" dataKey="phishing" stroke="#ef4444" fill="url(#g-phishing)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="bec" stroke="#f97316" fill="url(#g-bec)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="malware" stroke="#8b5cf6" fill="url(#g-malware)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="benign" stroke="#22c55e" fill="url(#g-benign)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-600">No chart data available</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="glass-panel p-5 rounded-2xl">
          <h2 className="text-sm font-bold text-slate-200 mb-4">Threat Distribution</h2>
          {loading ? (
            <div className="flex flex-col gap-3 mt-2">
              {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0c1322", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-slate-400">{PIE_LABELS[i]}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-200">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent Cases + Live Feed ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Recent Cases */}
        <div className="xl:col-span-3 glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
            <h2 className="text-sm font-bold text-slate-200">Recent Investigations</h2>
            <Link href="/cases" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
              All cases <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full soc-table">
              <thead><tr>
                <th>Case</th><th>Subject</th><th>Severity</th><th>Score</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  Array.from({length:5}).map((_,i) => (
                    <tr key={i}>{Array.from({length:6}).map((_,j) => (
                      <td key={j} className="py-4 px-4"><Skeleton className="h-3 w-full" /></td>
                    ))}</tr>
                  ))
                ) : recent.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-xs text-slate-600">No cases yet. Upload an email to investigate.</td></tr>
                ) : (
                  recent.slice(0,6).map(c => (
                    <tr key={c.id}>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-blue-400 font-bold">{c.case_number}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[180px] truncate font-medium">{c.title}</td>
                      <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${sevClass(c.severity)}`}>{c.severity}</span></td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-200">{c.risk_score}</td>
                      <td className="py-3.5 px-4"><StatusBadge status={c.status} /></td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/cases/${c.id}`} className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end">
                          Open <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Feed */}
        <div className="xl:col-span-2 glass-panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 status-blink" />
              Live Security Feed
            </h2>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="divide-y divide-slate-800/40 overflow-y-auto max-h-80">
            {loading ? (
               <div className="p-4 space-y-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : liveFeed.length === 0 ? (
               <div className="p-8 text-center text-xs text-slate-500">No recent security events.</div>
            ) : (
              liveFeed.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link href={`/cases/${item.id}`} key={i} className="flex gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors block cursor-pointer">
                    <Icon className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${sevClass(item.sev)}`}>{item.sev}</span>
                        <span className="text-[10px] font-mono text-slate-500">{item.case_number}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-snug truncate">{item.msg}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{item.time}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
