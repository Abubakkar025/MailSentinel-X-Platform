"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Eye, GitBranch, MapPin, Network, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { SEVERITY_COLORS, type EnrichedThreat } from "./types";

interface SelectedPanelProps {
  threat: EnrichedThreat;
  onClear: () => void;
  onOpenCase: () => void;
}

function Row({ label, value, mono = false, children }: { label: string; value?: React.ReactNode; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`truncate text-right ${mono ? "font-mono" : ""} text-[11px] text-slate-200`}>{children ?? value}</span>
    </div>
  );
}

export function SelectedIndicatorPanel({ threat, onClear, onOpenCase }: SelectedPanelProps) {
  const sevColor = SEVERITY_COLORS[threat.severity] || "#94a3b8";
  const [copied, setCopied] = useState(false);

  const reputation = threat.isMalicious === true
    ? { label: "Malicious", color: "#f87171" }
    : threat.isMalicious === false && (threat.abuse_score ?? 0) === 0
      ? { label: "Not flagged", color: "#34d399" }
      : { label: "Unknown", color: "#94a3b8" };

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(threat.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="msx-selected-panel absolute bottom-3 right-3 z-20 w-72 animate-scale-in rounded-xl border border-slate-700/80 bg-[#070d1c]/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <span className="truncate font-mono text-[11px] font-bold text-slate-100">{threat.ip}</span>
          <button
            onClick={copyIp}
            aria-label="Copy IP"
            title="Copy IP"
            className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <button
          onClick={onClear}
          aria-label="Close"
          className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Row label="Severity">
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
            style={{ color: sevColor, background: `${sevColor}1a`, border: `1px solid ${sevColor}44` }}
          >
            {threat.severity}
          </span>
        </Row>
        <Row label="Location" value={`${threat.city || "—"}, ${threat.country || "—"}`} />
        <Row label="Coordinates" value={`${threat.lat ?? "—"}, ${threat.lng ?? "—"}`} mono />
        <Row label="Abuse Score">
          <span className={`font-mono font-bold ${threat.abuse_score && threat.abuse_score > 50 ? "text-red-400" : "text-emerald-400"}`}>
            {threat.abuse_score ?? "—"} / 100
          </span>
        </Row>
        <Row label="Reputation">
          <span className="font-mono text-[10px] font-bold" style={{ color: reputation.color }}>
            {reputation.label}
          </span>
        </Row>
        <Row label="Case">
          <span onClick={onOpenCase} className="cursor-pointer font-mono font-bold text-blue-400 hover:text-blue-300">
            {threat.case_number || "—"}
          </span>
        </Row>
        {threat.asn || threat.asnOrg ? (
          <Row label="Carrier / ASN">
            <span className="flex items-center justify-end gap-1 text-slate-300 truncate max-w-[140px]" title={[threat.asnOrg, threat.asn].filter(Boolean).join(" · ")}>
              <Network className="h-3 w-3 shrink-0 text-slate-500" />
              {[threat.asnOrg, threat.asn].filter(Boolean).join(" · ")}
            </span>
          </Row>
        ) : null}
        {threat.usageType ? <Row label="Usage Type" value={threat.usageType} /> : null}
        {threat.campaignName ? (
          <Row label="Campaign">
            <Link
              href="/campaigns"
              className="flex items-center justify-end gap-1 text-amber-400/90 font-medium truncate max-w-[140px] hover:text-amber-300"
              title={threat.campaignName}
            >
              <GitBranch className="h-3 w-3 shrink-0 text-amber-400" />
              {threat.campaignName}
            </Link>
          </Row>
        ) : null}
        {threat.createdAt ? <Row label="First Seen" value={new Date(threat.createdAt).toLocaleDateString()} /> : null}
        <Row label="Source">
          <span className={`font-mono text-[9px] font-bold tracking-widest ${threat.isDemo ? "text-amber-400" : "text-emerald-400"}`}>
            {threat.isDemo ? "DEMO" : "LIVE"}
          </span>
        </Row>
        <Row
          label="Correlated"
          value={`${threat.relatedCases} case${threat.relatedCases === 1 ? "" : "s"} · ${threat.relatedCampaigns} campaign${threat.relatedCampaigns === 1 ? "" : "s"}`}
          mono
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onOpenCase}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 px-2 py-1.5 text-[10px] font-semibold text-blue-300 transition-colors hover:bg-blue-600/30"
        >
          Open Case <ExternalLink className="h-3 w-3" />
        </button>
        <Link
          href={`/threat-intel`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-slate-700/60"
        >
          <Eye className="h-3 w-3 text-cyan-400" /> Intel
        </Link>
      </div>
    </div>
  );
}