"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert, LayoutDashboard, Search, Inbox, Globe2,
  Target, FileText, Settings, Zap, ChevronRight,
  Bell, Shield, Activity, Map, Database, ChevronLeft,
  AlertCircle, BookOpen, Wifi, WifiOff
} from "lucide-react";
import { api } from "@/lib/api";

const NAV_SECTIONS = [
  {
    label: "SOC Operations",
    items: [
      { name: "Overview",          href: "/dashboard",    icon: LayoutDashboard },
      { name: "Investigate",       href: "/investigate",  icon: Search,         badge: null },
      { name: "Cases",             href: "/cases",        icon: Inbox },
      { name: "Alerts",            href: "/alerts",       icon: Bell,           badge: "3" },
    ]
  },
  {
    label: "Intelligence",
    items: [
      { name: "Threat Intelligence", href: "/threat-intel", icon: Database },
      { name: "Threat Map",          href: "/threat-map",   icon: Map },
      { name: "Campaigns",           href: "/campaigns",    icon: Target },
    ]
  },
  {
    label: "Forensics & Reports",
    items: [
      { name: "Forensics",  href: "/forensics", icon: BookOpen },
      { name: "Reports",    href: "/reports",   icon: FileText },
      { name: "Settings",   href: "/settings",  icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        await api.getHealth();
        if (mounted) setApiOnline(true);
      } catch {
        if (mounted) setApiOnline(false);
      }
    };
    checkHealth();
    const t = setInterval(checkHealth, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <aside
      className="h-screen flex flex-col fixed left-0 top-0 z-40 w-64"
      style={{ background: "rgba(5, 8, 17, 0.97)", borderRight: "1px solid rgba(30, 41, 59, 0.6)" }}
    >
      <div className="h-16 flex items-center px-4 justify-between border-b border-slate-800/60">
        <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/35 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-1">
              MailSentinel <span className="text-blue-400 font-black">X</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">AI SOC Platform</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5" role="navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3 h-3 text-blue-400/60 ml-auto" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800/60 p-3 space-y-2">
        <Link
          href="/investigate"
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/30"
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>New Investigation</span>
        </Link>
        <div className="px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          {apiOnline === null ? (
            <><Activity className="w-3.5 h-3.5 text-slate-500 animate-pulse" /><span className="text-[10px] text-slate-500 font-mono">Connecting...</span></>
          ) : apiOnline ? (
            <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-mono">API Online</span></>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-[10px] text-red-400 font-mono">API Offline</span></>
          )}
          <span className="text-[10px] text-slate-600 font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}