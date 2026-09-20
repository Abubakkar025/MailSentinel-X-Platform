"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { create } from "zustand";
import {
  Command,
  CornerDownLeft,
  FileSearch,
  Globe,
  Hash,
  Loader2,
  Mail,
  Network,
  Search,
  Send,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useEvidence, type IndexedCase } from "@/lib/evidence";
import { SeverityBadge } from "./status-badge";

export const usePalette = create<{ open: boolean; setOpen: (v: boolean) => void }>(
  (set) => ({
    open: false,
    setOpen: (v) => set({ open: v }),
  })
);

interface CommandItem {
  group: "Cases" | "Indicators" | "Campaigns" | "Jump to";
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  caseRef?: IndexedCase;
}

const isHash = (v: string) => /^[a-f0-9]{32,64}$/i.test(v);

export function CommandPalette() {
  const { open, setOpen } = usePalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const loadIndex = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const [casesRes, campaigns] = await Promise.all([
        api.getCases({ page_size: 50 }),
        api.getCampaigns(),
      ]);
      useEvidence.getState().registerCases(casesRes.items);
      useEvidence.getState().registerCampaigns(campaigns);
    } catch {
      /* keep whatever evidence we already have */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      loadIndex();
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }, 0);
    return () => clearTimeout(t);
  }, [open, loadIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!usePalette.getState().open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const out: CommandItem[] = [];

    if (!q) {
      out.push(
        {
          group: "Jump to",
          label: "Open Dashboard",
          icon: <ShieldCheck className="w-4 h-4 text-blue-400" />,
          action: () => router.push("/dashboard"),
        },
        {
          group: "Jump to",
          label: "Start a New Investigation",
          icon: <Send className="w-4 h-4 text-sky-400" />,
          action: () => router.push("/investigate"),
        },
        {
          group: "Jump to",
          label: "Triage Open Alerts",
          icon: <Target className="w-4 h-4 text-red-400" />,
          action: () => router.push("/alerts"),
        },
        {
          group: "Jump to",
          label: "Threat Intelligence",
          icon: <Globe className="w-4 h-4 text-emerald-400" />,
          action: () => router.push("/threat-intel"),
        },
        {
          group: "Jump to",
          label: "Threat Map",
          icon: <Network className="w-4 h-4 text-violet-400" />,
          action: () => router.push("/threat-map"),
        },
        {
          group: "Jump to",
          label: "Open Reports",
          icon: <FileSearch className="w-4 h-4 text-amber-400" />,
          action: () => router.push("/reports"),
        }
      );
      return out;
    }

    const { cases: caseHits, campaigns } = useEvidence.getState().search(q);
    caseHits.slice(0, 6).forEach((c) => {
      out.push({
        group: "Cases",
        label: c.title,
        sublabel: `${c.case_number} · ${c.threat_type} · risk ${c.risk_score}`,
        icon: <FileSearch className="w-4 h-4 text-blue-400" />,
        action: () => router.push(`/cases/${c.id}`),
        caseRef: c,
      });
    });

    const seen = new Set<string>();
    useEvidence
      .getState()
      .all()
      .forEach((c) => {
        [...c.ips.map((v) => ["ip", v] as const), ...c.domains.map((v) => ["domain", v] as const)]
          .filter(([_, v]) => v.toLowerCase().includes(q))
          .forEach(([kind, v]) => {
            const key = `${kind}:${v}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (out.length >= 12) return;
            out.push({
              group: "Indicators",
              label: v,
              sublabel: `${kind} · seen in ${c.case_number}`,
              icon:
                kind === "ip" ? (
                  <Network className="w-4 h-4 text-violet-400" />
                ) : (
                  <Globe className="w-4 h-4 text-emerald-400" />
                ),
              action: () => router.push(`/threat-intel?q=${encodeURIComponent(v)}`),
            });
          });
        [...c.hashes.map((v) => ["hash", v] as const)]
          .filter(([_, v]) => v.toLowerCase().includes(q) || isHash(q))
          .forEach(([kind, v]) => {
            const key = `${kind}:${v}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (out.length >= 12) return;
            out.push({
              group: "Indicators",
              label: v.slice(0, 14) + "…",
              sublabel: `sha256 · seen in ${c.case_number}`,
              icon: <Hash className="w-4 h-4 text-cyan-400" />,
              action: () => router.push(`/threat-intel?q=${encodeURIComponent(v)}`),
            });
          });
        if (c.from_address) {
          const v = c.from_address;
          if (!seen.has(`email:${v}`) && v.toLowerCase().includes(q)) {
            seen.add(`email:${v}`);
            if (out.length < 12) {
              out.push({
                group: "Indicators",
                label: v,
                sublabel: `sender · seen in ${c.case_number}`,
                icon: <Mail className="w-4 h-4 text-orange-400" />,
                action: () => router.push(`/threat-intel?q=${encodeURIComponent(v)}`),
              });
            }
          }
        }
      });

    campaigns.slice(0, 4).forEach((c) => {
      out.push({
        group: "Campaigns",
        label: c.name,
        sublabel: `${c.id} · ${c.case_count} case(s)`,
        icon: <Users className="w-4 h-4 text-pink-400" />,
        action: () => router.push(`/campaigns?campaign=${encodeURIComponent(c.id)}`),
      });
    });

    return out;
  }, [query, router]);

  useEffect(() => {
    const t = setTimeout(() => setActive(0), 0);
    return () => clearTimeout(t);
  }, [items.length]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const onSelect = (item: CommandItem) => {
    setOpen(false);
    item.action();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) onSelect(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[16vh] bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-panel w-full max-w-xl rounded-2xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/60">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search cases, IPs, domains, hashes, campaigns…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none"
            aria-label="Search"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-700/70">
              <Command className="w-3 h-3" />K
            </kbd>
          )}
        </div>

        <div
          ref={listRef}
          className="max-h-[42vh] overflow-y-auto p-2 space-y-0.5"
          role="listbox"
        >
          {items.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-400">No matches</p>
              <p className="text-xs text-slate-600 mt-1">
                Nothing in this session&apos;s evidence index matches{" "}
                <span className="font-mono text-slate-400">&quot;{query}&quot;</span>
              </p>
            </div>
          )}
          {items.map((item, i) => {
            const prev: CommandItem | undefined = items[i - 1];
            return (
              <div key={`${item.group}-${item.label}-${i}`}>
                {(!prev || prev.group !== item.group) && (
                  <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {item.group}
                  </p>
                )}
                <button
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onSelect(item)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors ${
                    i === active
                      ? "bg-blue-500/10 border border-blue-500/25"
                      : "border border-transparent"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      i === active ? "bg-blue-500/15" : "bg-slate-800/70"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-slate-100 truncate">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="block text-[11px] text-slate-500 truncate">
                        {item.sublabel}
                      </span>
                    )}
                  </span>
                  {item.caseRef && <SeverityBadge severity={item.caseRef.severity as any} />}
                  {i === active && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-700/60 text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-slate-800 border border-slate-700 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-slate-800 border border-slate-700 font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 rounded bg-slate-800 border border-slate-700 font-mono">esc</kbd> close
          </span>
          <span className="ml-auto text-slate-700">session evidence index</span>
        </div>
      </div>
    </div>
  );
}