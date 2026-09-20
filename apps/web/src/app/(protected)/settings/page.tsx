"use client";
import { useState } from "react";
import { Settings, User, Shield, Bell, Database, Cpu, Palette, Server, Save, ChevronRight } from "lucide-react";
import { api, buildApiUrl } from "@/lib/api";

const SECTIONS = [
  { id: "profile",   label: "Profile",           icon: User },
  { id: "security",  label: "Security",          icon: Shield },
  { id: "notifs",    label: "Notifications",     icon: Bell },
  { id: "api",       label: "API Status",        icon: Server },
  { id: "ti",        label: "Threat Intelligence", icon: Database },
  { id: "ai",        label: "AI Preferences",    icon: Cpu },
  { id: "appearance",label: "Appearance",        icon: Palette },
];

export default function SettingsPage() {
  const [section, setSection] = useState("profile");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const seedDemo = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      await api.seedDemoData();
      setSeedMsg("Demo data seeded successfully. Refresh the dashboard.");
    } catch (e: any) {
      setSeedMsg(`Error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const renderSection = () => {
    if (section === "profile") return (
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-200">Analyst Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Display Name", placeholder: "Senior SOC Analyst", type: "text" },
            { label: "Email Address", placeholder: "analyst@soc.local", type: "email" },
            { label: "Role / Title", placeholder: "Security Operations", type: "text" },
            { label: "Team", placeholder: "Threat Detection & Response", type: "text" },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/30">
          <Save className="w-4 h-4" /> Save Profile
        </button>
      </div>
    );

    if (section === "api") return (
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-200">API & Integration Status</h2>
        <div className="space-y-3">
          {[
            { label: "MailSentinel X API", url: buildApiUrl('/health'), desc: "FastAPI backend — email parsing, risk scoring, case management" },
            { label: "AbuseIPDB", url: "https://api.abuseipdb.com", desc: "IP reputation lookups. Requires ABUSEIPDB_API_KEY in .env" },
            { label: "VirusTotal", url: "https://www.virustotal.com/api/v3", desc: "URL and hash scanning. Requires VIRUSTOTAL_API_KEY in .env" },
            { label: "ip-api.com", url: "https://ip-api.com", desc: "Free-tier IP geolocation. No key required." },
            { label: "Gemini AI", url: "https://generativelanguage.googleapis.com", desc: "AI SOC Copilot. Requires GEMINI_API_KEY in .env" },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div>
                <p className="text-sm font-semibold text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{s.desc}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 status-blink" />
                <span className="text-emerald-400">Connected</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/25">
          <p className="text-xs font-bold text-amber-400 mb-1">Configuration Note</p>
          <p className="text-xs text-slate-400">API keys are configured in <code className="font-mono bg-slate-800 px-1 rounded">services/api/.env</code>. Do not modify backend files from this UI.</p>
        </div>
      </div>
    );

    if (section === "ti") return (
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-200">Threat Intelligence Providers</h2>
        <div className="space-y-3">
          {[
            { name: "AbuseIPDB", status: "Configured", detail: "IP reputation, abuse reports" },
            { name: "VirusTotal", status: "Configured", detail: "URL, hash, domain scanning" },
            { name: "RDAP / WHOIS", status: "Active", detail: "Domain registration intelligence" },
            { name: "ip-api.com", status: "Active", detail: "IP geolocation (free tier)" },
          ].map(p => (
            <div key={p.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div>
                <p className="text-sm font-semibold text-slate-200">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{p.detail}</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">{p.status}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demo Data</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={seedDemo}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-60"
            >
              {seeding ? "Seeding…" : "Seed Demo Data"}
            </button>
            <button
              onClick={() => api.resetDemoData()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-red-400 text-xs font-bold hover:bg-slate-800 transition-all"
            >
              Reset Demo Data
            </button>
          </div>
          {seedMsg && <p className={`text-xs font-mono ${seedMsg.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>{seedMsg}</p>}
        </div>
      </div>
    );

    if (section === "appearance") return (
      <div className="space-y-5">
        <h2 className="text-base font-bold text-slate-200">Appearance</h2>
        <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/20">
          <p className="text-sm font-semibold text-blue-400">Dark Mode Active</p>
          <p className="text-xs text-slate-500 mt-1">MailSentinel X uses a fixed premium dark SOC theme optimized for security operations environments. Light mode is not available.</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Accent Color</p>
          <div className="flex gap-3">
            {[["#3b82f6", "Blue (Default)"], ["#06b6d4", "Cyan"], ["#8b5cf6", "Violet"], ["#22c55e", "Green"]].map(([c, l]) => (
              <button key={c} className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 hover:border-white transition-colors" style={{ background: c }} />
                <span className="text-[10px] text-slate-500">{l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <div className="py-12 text-center text-sm text-slate-500">
        <Settings className="w-8 h-8 mx-auto mb-3 text-slate-700" />
        Configuration for <span className="font-semibold capitalize">{section}</span> is managed via environment configuration.<br />
        <span className="text-xs font-mono">See services/api/.env for backend settings.</span>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
        <Settings className="w-5 h-5 text-slate-400" />
        Settings
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <nav className="divide-y divide-slate-800/40">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition-colors ${isActive ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-l-2 border-transparent"}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {s.label}
                  </span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400/60" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-2xl">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
