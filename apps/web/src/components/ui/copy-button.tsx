"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  value: string;
  truncate?: boolean;
  className?: string;
}

export function CopyButton({ value, truncate = true, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors group ${className}`}
    >
      <span className="font-mono text-[11px] text-slate-300 group-hover:text-slate-100">
        {truncate ? `${value.slice(0, 12)}…${value.slice(-6)}` : value}
      </span>
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
}

export function HashDisplay({ hash, label }: { hash: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-slate-500 uppercase font-bold">{label}:</span>}
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(hash);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="font-mono text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
        title={hash}
      >
        <span>{hash.slice(0, 16)}…{hash.slice(-8)}</span>
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
      </button>
    </div>
  );
}
