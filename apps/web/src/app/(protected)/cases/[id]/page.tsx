"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldAlert, ArrowLeft, FileText, Bot, Activity, Network, Download, Send, CheckCircle2,
  XCircle, AlertTriangle, Globe2, Lock, Cpu, RefreshCw, Search, ExternalLink, Copy, Building2,
  Link2, HardDrive, Target, FileJson, ChevronRight, ShieldCheck, Zap, Info, Clock, Check, StopCircle, CornerDownRight, Play, Eye, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "@/components/threat-graph/custom-nodes";
import { api } from "@/lib/api";
import { InvestigationResult, ForensicEvent, CaseStatus } from "@/lib/types";
import { SeverityBadge, StatusBadge, AuthBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton, HashDisplay } from "@/components/ui/copy-button";
import { RiskGauge, getScoreColor } from "@/components/ui/risk-gauge";

function ResultCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">{label}</p>
      <div className="text-xs text-slate-200">{children}</div>
    </div>
  );
}

export default function CaseCommandCenter() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [detail, setDetail] = useState<InvestigationResult | null>(null);
  const [timeline, setTimeline] = useState<ForensicEvent[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Header Tabs
  const [headerView, setHeaderView] = useState<"structured" | "raw">("structured");
  
  // Actions
  const [actionLoading, setActionLoading] = useState(false);

  // AI State
  const [aiInput, setAiInput] = useState("");
  const [aiMsgs, setAiMsgs] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, t, g] = await Promise.all([
        api.getCaseDetail(caseId),
        api.getCaseTimeline(caseId).catch(() => []),
        api.getCaseGraph(caseId).catch(() => ({ nodes: [], edges: [] })),
      ]);
      setDetail(d);
      setTimeline(t);
      setGraphData(g);
    } catch (e: any) {
      setError(e.message || "Failed to load case data.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
  }, [aiMsgs, aiThinking]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      if (action === "report") {
        window.open(api.getReportUrl(caseId), "_blank");
        toast.success("Report generated successfully");
      } else {
        await api.updateCase(caseId, { status: action as CaseStatus });
        setDetail(prev => prev ? { ...prev, case: { ...prev.case, status: action as CaseStatus } } : prev);
        toast.success(`Case status updated to ${action}`);
      }
    } catch (e: any) {
      toast.error(`Action failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const askAi = async (prompt: string) => {
    if (!prompt.trim() || aiThinking) return;
    setAiInput("");
    setAiMsgs(p => [...p, { role: "user", content: prompt }]);
    setAiThinking(true);
    try {
      const resp = await api.sendAiQuery(caseId, prompt);
      setAiMsgs(p => [...p, { role: "ai", content: resp.response }]);
    } catch (e: any) {
      setAiMsgs(p => [...p, { role: "ai", content: `Error: ${e.message}` }]);
    } finally {
      setAiThinking(false);
    }
  };

  if (error) return <div className="p-10"><ErrorState message={error} onRetry={load} /></div>;
  if (loading || !detail) return <div className="p-10 space-y-6">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-64 w-full" />)}</div>;

  const c = detail.case;
  const r = detail.risk_assessment;
  const e = detail.email;

  const renderAiContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-slate-200 mt-3 mb-1">{line.replace('## ', '')}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-slate-300 mt-2">{line.replace('### ', '')}</h4>;
      if (line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-slate-300">{line.replace('* ', '')}</li>;
      if (line.startsWith('1. ') || line.match(/^\d+\. /)) return <li key={i} className="ml-4 list-decimal text-slate-300">{line.replace(/^\d+\. /, '')}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="mb-1 text-slate-300">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-20">
      {/* ── STICKY QUICK ACTION BAR & HEADER ── */}
      <div className="sticky top-16 z-20 glass-panel p-4 rounded-b-2xl border-t-0 shadow-lg shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-6 mb-6 rounded-t-none border-x-0 mx-[-24px] px-8">
        <div>
          <button onClick={() => router.back()} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300 flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3 h-3" /> Back to Cases
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Case <span className="font-mono text-blue-400">{c.case_number}</span>
            </h1>
            <SeverityBadge severity={c.severity} />
            <StatusBadge status={c.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.status !== "investigating" && <button onClick={() => handleAction("investigating")} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors">Acknowledge</button>}
          {c.status !== "resolved" && <button onClick={() => handleAction("resolved")} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">Resolve</button>}
          {c.status !== "closed" && <button onClick={() => handleAction("closed")} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors">Close</button>}
          <div className="w-px h-6 bg-slate-800 mx-2" />
          <button onClick={() => handleAction("report")} disabled={actionLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-md shadow-blue-900/30">
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </button>
        </div>
      </div>

      {/* ── FIRST VIEWPORT: COMMAND CENTER ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* LEFT: OVERVIEW & EVIDENCE */}
        <div className="xl:col-span-1 space-y-6 flex flex-col">
          {/* Premium Risk Hero */}
          <div className={`glass-panel p-6 rounded-2xl border flex flex-col items-center text-center shadow-lg transition-all ${getScoreColor(r.score).bg} hover:shadow-2xl hover:scale-[1.02]`}>
            <RiskGauge score={r.score} size="lg" />
            <h2 className={`mt-4 text-2xl font-black uppercase tracking-widest ${getScoreColor(r.score).text} ${r.score >= 76 ? 'animate-pulse' : ''}`}>{r.severity}</h2>
            <p className="text-sm font-bold text-slate-300 capitalize mt-1">{r.threat_type.replace(/_/g, " ")}</p>
            <div className="mt-5 w-full space-y-2 text-left">
              <p className="text-[10px] text-slate-500 uppercase font-bold text-center mb-2">Primary Risk Factors</p>
              {r.factors.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-xs bg-slate-900/40 p-2 rounded-lg border border-slate-800/40">
                  <span className="text-slate-300 truncate font-medium" title={f.name}>{f.name}</span>
                  <span className="font-mono text-red-400 font-bold">+{f.points}</span>
                </div>
              ))}
              {r.factors.length > 4 && <div className="text-center text-[10px] text-slate-500 mt-2">+{r.factors.length - 4} more factors</div>}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="glass-panel p-5 rounded-2xl flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Executive Summary</h3>
            <div className="space-y-4">
              <ResultCard label="Subject"><span className="font-medium text-slate-200">{e.subject || "No Subject"}</span></ResultCard>
              <ResultCard label="Sender"><span className="font-mono text-amber-400 break-all">{e.from_address}</span></ResultCard>
              <ResultCard label="Authentication">
                <div className="flex flex-col gap-1.5 mt-1">
                  <AuthBadge result={e.auth_results.spf_result} label="SPF" />
                  <AuthBadge result={e.auth_results.dkim_result} label="DKIM" />
                  <AuthBadge result={e.auth_results.dmarc_result} label="DMARC" />
                </div>
              </ResultCard>
            </div>
          </div>
        </div>

        {/* CENTER: THREAT GRAPH */}
        <div className="xl:col-span-2 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[500px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-400" />
              Threat Relationship Graph
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">{graphData.nodes.length} Nodes · {graphData.edges.length} Edges</span>
          </div>
          <div className="flex-1 w-full bg-[#070b14] relative">
            <ReactFlow
              nodes={graphData.nodes}
              edges={graphData.edges.map(edge => ({ ...edge, type: "smoothstep", animated: true, style: { stroke: "#334155", strokeWidth: 2 } }))}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#1e293b" gap={16} size={1} />
              <Controls className="react-flow__controls" />
              <MiniMap className="react-flow__minimap" maskColor="rgba(5, 8, 17, 0.7)" nodeColor="#3b82f6" />
            </ReactFlow>
          </div>
        </div>

        {/* RIGHT: SENTINEL AI COPILOT */}
        <div className="xl:col-span-1 glass-panel rounded-2xl flex flex-col overflow-hidden h-[500px] xl:h-auto border border-violet-500/20">
          <div className="flex items-center justify-between px-5 py-3 border-b border-violet-500/20 bg-violet-500/5">
            <div>
              <h3 className="text-sm font-bold text-violet-400 flex items-center gap-2">
                <Bot className="w-4 h-4" /> Sentinel AI
              </h3>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">Case-aware investigation assistant</p>
            </div>
            <button onClick={() => setAiMsgs([])} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500" title="Clear">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm panel-scroll" ref={aiScrollRef}>
            {aiMsgs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Sparkles className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-semibold mb-1">How can I help?</p>
                  <p className="text-xs text-slate-500">I have full context on Case {c.case_number}.</p>
                </div>
                <div className="flex flex-col gap-2 w-full mt-4">
                  {[
                    "Why is this email dangerous?",
                    "Summarize the threat indicators",
                    "What should I investigate next?",
                    "Draft an executive summary"
                  ].map(p => (
                    <button key={p} onClick={() => askAi(p)} className="text-left px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              aiMsgs.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "ai" && <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1"><Bot className="w-4 h-4 text-violet-400" /></div>}
                  <div className={`p-3 rounded-xl max-w-[85%] text-xs ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-slate-900/80 border border-slate-800 text-slate-300 rounded-tl-sm"}`}>
                    {m.role === "user" ? m.content : renderAiContent(m.content)}
                  </div>
                </div>
              ))
            )}
            {aiThinking && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1"><Bot className="w-4 h-4 text-violet-400 animate-pulse" /></div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs rounded-tl-sm flex items-center gap-2">
                  <div className="flex gap-1"><span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" /><span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{animationDelay:"0.15s"}} /><span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{animationDelay:"0.3s"}} /></div>
                  Analyzing case data...
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-800/60 bg-slate-900/40">
            <div className="relative flex items-center">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && askAi(aiInput)}
                placeholder="Ask Sentinel AI..."
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-3 pr-10 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button onClick={() => askAi(aiInput)} disabled={!aiInput.trim() || aiThinking} className="absolute right-2 p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECOND VIEWPORT: THREAT INTEL IOC CARDS ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          Extracted Indicators of Compromise (IOCs)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* IPs */}
          {detail.ip_locations.map(ip => (
            <div key={ip.ip_address} className="glass-panel p-4 rounded-xl border-l-4 border-l-violet-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-violet-400 font-bold text-sm"><Network className="w-4 h-4" /> {ip.ip_address}</div>
                
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="text-slate-300">{ip.city}, {ip.country}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ASN / ISP</span><span className="text-slate-300">{ip.asn_org || "Unknown"}</span></div>
              </div>
            </div>
          ))}
          {/* Domains */}
          {detail.domain_intel && detail.domain_intel.map(dom => (
            <div key={dom.domain_name} className="glass-panel p-4 rounded-xl border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm"><Globe2 className="w-4 h-4" /> {dom.domain_name}</div>
                {dom.is_suspicious && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded uppercase">Suspicious</span>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Registrar</span><span className="text-slate-300 truncate max-w-[120px]">{dom.registrar || "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Age</span><span className="text-slate-300">{dom.age_days ? `${dom.age_days} days` : "Unknown"}</span></div>
              </div>
            </div>
          ))}
          {/* URLs */}
          {detail.url_scans.map(url => (
            <div key={url.url} className="glass-panel p-4 rounded-xl border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm"><Link2 className="w-4 h-4" /> {url.domain || "URL"}</div>
                {url.is_malicious && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded uppercase">Malicious</span>}
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded break-all mb-2">{url.url}</div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">VT Detections</span><span className="text-slate-300 font-bold">{url.detection_count} / {url.total_engines}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THIRD VIEWPORT: RECONSTRUCT ATTACK TIMELINE & HEADERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attack Timeline */}
        <div className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-5">
            <Play className="w-4 h-4 text-emerald-400" />
            Attack Reconstruction Timeline
          </h3>
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-5">
            {timeline.length === 0 ? <p className="text-xs text-slate-500 pl-4">No events recorded.</p> : timeline.map((evt, i) => (
              <div key={i} className="relative pl-6">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center absolute -left-[15px] top-0 ring-4 ring-[#050811]">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{evt.event_type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-400">{evt.details.message || "Event recorded"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Structured Headers */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-blue-400" />
              Email Headers & Delivery
            </h3>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button onClick={() => setHeaderView("structured")} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${headerView === "structured" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>Structured</button>
              <button onClick={() => setHeaderView("raw")} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors ${headerView === "raw" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>Raw Source</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto panel-scroll pr-2">
            {headerView === "structured" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                  {Object.entries((e as any).headers || {}).filter(([k]) => !['Received', 'Authentication-Results'].includes(k)).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex border-b border-slate-800/40 pb-2">
                      <span className="text-slate-500 w-32 shrink-0">{k}:</span>
                      <span className="text-slate-300 break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
                {(e as any).received_hops && (e as any).received_hops.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Received Chain (Hops)</h4>
                    {(e as any).received_hops.map((hop: any, i: number) => (
                      <div key={i} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                        <div className="flex justify-between text-slate-500"><span>Hop {hop.hop_index}</span><span>{hop.timestamp || "Unknown time"}</span></div>
                        <div className="flex items-start gap-2"><CornerDownRight className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" /><span className="text-slate-300 break-all">{hop.raw}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all p-4 bg-[#03050a] rounded-xl border border-slate-800/60">
                {e.raw_headers}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}