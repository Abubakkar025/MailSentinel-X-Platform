"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ShieldCheck, ShieldAlert, Activity, Search, ChevronRight, X, AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSystem } from "@/lib/event-bus";

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "Overview",
  investigate: "Investigate",
  cases: "Cases",
  alerts: "Alerts",
  "threat-intel": "Threat Intelligence",
  "threat-map": "Threat Map",
  campaigns: "Campaigns",
  forensics: "Forensics",
  reports: "Reports",
  settings: "Settings",
};

const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: "critical", title: "Critical Threat Detected", body: "BEC campaign targeting finance@company.com", time: "2m ago" },
  { id: 2, type: "warning", title: "Malicious IP Flagged", body: "185.220.101.47 — AbuseIPDB score 98/100", time: "8m ago" },
  { id: 3, type: "info", title: "New Investigation Completed", body: "Case MSX-004 risk score: 76/100 HIGH", time: "14m ago" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [engineStatus, setEngineStatus] = useState<"ready" | "offline" | "checking">("checking");
  const setApiOnline = useSystem((s) => s.setApiOnline);

  const segments = pathname?.split("/").filter(Boolean) || [];

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        await api.getHealth();
        if (mounted) {
          setEngineStatus("ready");
          setApiOnline(true);
        }
      } catch {
        if (mounted) {
          setEngineStatus("offline");
          setApiOnline(false);
        }
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setApiOnline]);

  const notifIcon = (type: string) => {
    if (type === "critical") return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (type === "warning") return <AlertCircle className="w-4 h-4 text-amber-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!search.trim()) return;
      router.push(`/cases?search=${encodeURIComponent(search.trim())}`);
      toast.info(`Searching cases for "${search.trim()}"`);
    } else if (e.key === "Escape") {
      setSearch("");
    }
  };

  // Cmd/Ctrl + K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <header
      className="h-16 sticky top-0 z-30 px-6 flex items-center justify-between"
      style={{ background: "rgba(5, 8, 17, 0.90)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(30,41,59,0.55)", marginLeft: "256px" }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors font-medium">
          Home
        </Link>
        {segments.map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/");
          const label = BREADCRUMB_MAP[seg] || decodeURIComponent(seg);
          const isLast = i === segments.length - 1;
          return (
            <span key={seg} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-slate-700" />
              {isLast ? (
                <span className="text-slate-200 font-semibold">{label}</span>
              ) : (
                <Link href={href} className="text-slate-500 hover:text-slate-300 transition-colors">{label}</Link>
              )}
            </span>
          );
        })}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Global search */}
        <div className="relative hidden md:block group">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
          <input
            id="global-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search cases, IPs, hashes… (Cmd+K)"
            className="w-80 bg-slate-900/80 border border-slate-800/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/15 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>

        {/* Live SOC Status pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
          engineStatus === "ready"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : engineStatus === "offline"
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
        }`}>
          {engineStatus === "ready" ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : engineStatus === "offline" ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          )}
          <span className="font-mono text-[11px] hidden lg:inline">
            SOC Engine:{" "}
            <span className={engineStatus === "ready" ? "text-emerald-400 font-bold" : engineStatus === "offline" ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>
              {engineStatus === "ready" ? "Ready" : engineStatus === "offline" ? "Offline" : "Checking…"}
            </span>
          </span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5 ring-2 ring-[#050811]" />
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-800 shadow-2xl shadow-black/60 z-50 overflow-hidden animate-slide-up"
              style={{ background: "rgba(9,13,26,0.97)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <span className="text-xs font-bold text-slate-200">Alerts & Notifications</span>
                <Link href="/alerts" onClick={() => setShowNotifs(false)} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium">View all</Link>
              </div>
              <div className="divide-y divide-slate-800/40">
                {SAMPLE_NOTIFICATIONS.map(n => (
                  <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-slate-600 mt-1 font-mono">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800/70">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 border border-blue-400/30 flex items-center justify-center text-white text-[11px] font-bold shadow">
            SA
          </div>
          <div className="hidden lg:block">
            <div className="text-[11px] font-semibold text-slate-200">SOC Analyst</div>
            <div className="text-[10px] text-slate-500 font-mono">analyst@soc.local</div>
          </div>
        </div>
      </div>
    </header>
  );
}
