"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud, Zap, Cpu, XCircle, CheckCircle2, ArrowRight,
  FileText, Shield, Globe2, Link2, AlertTriangle, ShieldCheck, MailCheck, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSystem } from "@/lib/event-bus";
import { useEvidence } from "@/lib/evidence";
import { InvestigationResult } from "@/lib/types";
import { RiskGauge, getScoreColor } from "@/components/ui/risk-gauge";
import { AuthBadge } from "@/components/ui/status-badge";

type Stage = "idle" | "running" | "done" | "error";

const PIPELINE_STEPS = [
  { key: "upload", label: "Uploading file to secure parser", sub: "Transfer + SHA-256 fingerprint" },
  { key: "synth", label: "Parsing RFC 5322 mail structure", sub: "Headers, body, attachments, auth-results" },
  { key: "intel", label: "Correlating indicators", sub: "IP, domain, URL, geo, abuse databases" },
  { key: "score", label: "Scoring risk + classifying threat", sub: "Explainable rule factors → verdict" },
] as const;

const MAX_SIZE_MB = 10;

function validateFile(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() || "";
  if (!["eml", "msg"].includes(ext)) {
    return "Unsupported file type. Upload a raw RFC 5322 email saved as .eml (or .msg).";
  }
  if (f.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File exceeds the ${MAX_SIZE_MB}MB size limit.`;
  }
  if (f.size === 0) {
    return "The uploaded file is empty.";
  }
  return null;
}

export default function InvestigatePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushEvent = useSystem((s) => s.pushEvent);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setError(validateFile(f));
      setFile(f);
    }
  };

  const runPipeline = useCallback(async () => {
    if (!file) return;
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setResult(null);
    setStage("running");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const res = await api.uploadEml(file);
      useEvidence.getState().registerCaseDetail(res);
      useSystem.getState().setApiOnline(true);
      useSystem.getState().setTiAvailable(true);
      pushEvent({
        type: "case",
        severity: res.risk_assessment.severity,
        title: `Analysis complete — ${res.case.case_number}`,
        body: `${(res.email.subject || "No subject").slice(0, 60)} · risk ${res.risk_assessment.score} · ${res.risk_assessment.threat_type}`,
        link: `/cases/${res.case.id}`,
      });
      setStage("done");
      setResult(res);
      toast.success("Investigation complete", {
        description: `${res.case.case_number} · risk ${res.risk_assessment.score}/100 · ${res.risk_assessment.threat_type}`,
      });
    } catch (e: any) {
      setStage("error");
      setError(e?.message || "Investigation pipeline failed.");
      toast.error("Pipeline failed", { description: e?.message || "Analysis engine could not process the file." });
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [file, pushEvent]);

  const isRunning = stage === "running";

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-blue-400" />
            Email Investigation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Upload a raw RFC 5322 .eml file to run the automated forensic analysis pipeline</p>
        </div>
        {result && (
          <button
            onClick={() => router.push(`/cases/${result.case.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/30"
          >
            Open Investigation Console <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload zone */}
      {!result && (
        <div className="glass-panel p-8 rounded-2xl space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-500/8 scale-[1.01]"
                : file
                  ? "border-emerald-500/60 bg-emerald-500/5"
                  : "border-slate-700/60 hover:border-slate-600 bg-slate-900/30"
            }`}
          >
            <input type="file" accept=".eml,.msg" onChange={e => e.target.files?.[0] && (() => { const f = e.target.files![0]; setError(validateFile(f)); setFile(f); })()} className="hidden" id="eml-upload" />
            <label htmlFor="eml-upload" className="flex flex-col items-center cursor-pointer">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${file && !error ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-blue-600/15 border border-blue-500/25 text-blue-400"}`}>
                {file && !error ? <CheckCircle2 className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
              </div>
              {file ? (
                <>
                  <p className="text-base font-bold text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB · {file.type || "raw message"}</p>
                  <button
                    onClick={(e) => { e.preventDefault(); setFile(null); setError(null); }}
                    className="mt-2 text-[11px] text-red-400 hover:text-red-300 font-medium"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-slate-200">Drop .EML File Here</p>
                  <p className="text-xs text-slate-500 mt-1.5 text-center max-w-xs">Or click to select from disk. Maximum {MAX_SIZE_MB}MB. Files are never executed — static analysis only.</p>
                </>
              )}
            </label>
          </div>

          {/* Validation error */}
          {error && stage === "idle" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Pipeline stages */}
          {stage === "running" && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">Pipeline in progress… {elapsed}s elapsed</span>
                <span className="text-[10px] text-slate-600 font-mono ml-auto">single request · server-side analysis</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 animate-glow" style={{ width: "100%" }} />
              </div>
              {PIPELINE_STEPS.map((s) => (
                <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl bg-blue-600/8 border border-blue-500/20">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Cpu className="w-3 h-3 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-200 font-semibold block">{s.label}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {stage === "error" && error && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold animate-fade-in">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <XCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{error}</span>
              </div>
              <button
                onClick={runPipeline}
                disabled={isRunning}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 hover:bg-red-500/25 text-red-300 text-xs font-bold transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Analysis
              </button>
            </div>
          )}

          {/* CTA */}
          <div className="flex justify-center">
            <button
              onClick={runPipeline}
              disabled={!file || isRunning || (!!error && stage === "idle")}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? <><Cpu className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Zap className="w-4 h-4" /> Run Investigation Pipeline</>}
            </button>
          </div>

          {/* Security disclaimer */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>Uploaded files are processed with <strong className="text-slate-400">static analysis only</strong>. No code execution. The pipeline runs the following stages: <strong className="text-slate-400">upload + fingerprint</strong> → <strong className="text-slate-400">RFC 5322 parse</strong> → <strong className="text-slate-400">indicator correlation</strong> → <strong className="text-slate-400">risk scoring</strong>.</span>
          </div>
        </div>
      )}

      {/* Result summary */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* Verdict hero */}
          <div className={`glass-panel p-6 rounded-2xl border ${getScoreColor(result.risk_assessment.score).bg}`}>
            <div className="flex items-center gap-6 flex-wrap">
              <RiskGauge score={result.risk_assessment.score} size="lg" />
              <div className="flex-1 min-w-48 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-2xl font-black uppercase tracking-wide ${getScoreColor(result.risk_assessment.score).text}`}>
                    {result.risk_assessment.severity}
                  </span>
                  <span className="text-lg text-slate-500">—</span>
                  <span className="text-base font-bold text-slate-300 capitalize">{result.risk_assessment.threat_type.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm font-semibold text-slate-300">{result.email.subject || "No Subject"}</p>
                <p className="text-xs text-slate-500 font-mono">{result.email.from_address}</p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <AuthBadge result={result.email.auth_results?.spf_result ?? 'none'} label="SPF" />
                  <AuthBadge result={result.email.auth_results?.dkim_result ?? 'none'} label="DKIM" />
                  <AuthBadge result={result.email.auth_results?.dmarc_result ?? 'none'} label="DMARC" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Case</div>
                <div className="text-sm font-black font-mono text-blue-400">{result.case.case_number}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase font-bold mt-3">Evidence ID</div>
                <div className="text-xs font-mono text-emerald-400">{result.forensic_evidence_id}</div>
              </div>
            </div>
          </div>

          {/* Risk factors */}
          <div className="glass-panel p-5 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Risk Factor Breakdown
            </h3>
            <div className="space-y-2">
              {result.risk_assessment.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
                  <span className={`px-2 py-0.5 rounded font-black font-mono text-[11px] ${f.triggered ? "bg-red-500/15 text-red-400 border border-red-500/25" : "bg-slate-800/70 text-slate-500 border border-slate-700/50"} shrink-0`}>
                    {f.points > 0 ? `+${f.points}pts` : "0 pts"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200">{f.name}</p>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">{f.evidence}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 capitalize bg-slate-800 px-2 py-0.5 rounded shrink-0">{f.category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl text-center">
              <Globe2 className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-100">{result.ip_locations.length}</div>
              <div className="text-[11px] text-slate-500">IP locations</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <Link2 className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-100">{result.domain_intel.length}</div>
              <div className="text-[11px] text-slate-500">Domains profiled</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <Shield className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-100">{result.url_scans.length}</div>
              <div className="text-[11px] text-slate-500">URLs scanned</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center">
              <FileText className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-slate-100">{result.attachments.length}</div>
              <div className="text-[11px] text-slate-500">Attachments</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-slate-400">
            <MailCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Fingerprint <strong className="font-mono text-emerald-400">{result.email.file_sha256 ? result.email.file_sha256.slice(0, 24) : result.sha256_fingerprint?.slice(0, 24) || "—"}…</strong> recorded for chain-of-custody. Open the console for the full investigation: timeline, attack graph, Sentinel AI and the analyst decision log.</span>
          </div>

          <button
            onClick={() => { setResult(null); setFile(null); setStage("idle"); }}
            className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm hover:bg-slate-900 hover:text-slate-200 transition-colors"
          >
            Analyze Another Email
          </button>
        </div>
      )}
    </div>
  );
}