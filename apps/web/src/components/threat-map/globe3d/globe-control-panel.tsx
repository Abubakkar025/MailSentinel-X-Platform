"use client";

import { Aperture, Cloud, GitBranch, Layers, LocateFixed, Maximize, Moon, RotateCw } from "lucide-react";
import type { DensityMode } from "./threat-markers";

interface GlobeControlPanelProps {
  densityMode: DensityMode;
  threatsVisible: boolean;
  arcsVisible: boolean;
  cloudsVisible: boolean;
  atmosphereVisible: boolean;
  nightVisible: boolean;
  autoRotate: boolean;
  onDensityMode: (mode: DensityMode) => void;
  onToggleThreats: () => void;
  onToggleArcs: () => void;
  onToggleClouds: () => void;
  onToggleAtmosphere: () => void;
  onToggleNight: () => void;
  onToggleRotate: () => void;
  onReset: () => void;
  onFullscreen: () => void;
}

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

function ControlButton({ icon, label, active, disabled, onClick, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`msx-map-control group relative ${active ? "msx-map-control-active" : ""} ${disabled ? "cursor-not-allowed opacity-35" : ""}`}
    >
      {icon}
      <span className="msx-tooltip pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700/70 bg-[#0b1222]/95 px-2 py-1 font-mono text-[9px] tracking-wider text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
        {label}
      </span>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 my-0.5 h-px bg-slate-800/80" />;
}

const DENSITY_OPTIONS: Array<{ value: DensityMode; label: string; title: string }> = [
  { value: "points", label: "PT", title: "Density: Threat Points" },
  { value: "heat", label: "HEAT", title: "Density: Heat Pool" },
  { value: "campaigns", label: "CAMP", title: "Density: Campaign Correlated" },
  { value: "infra", label: "INFRA", title: "Density: Infrastructure / Carrier" },
];

export function GlobeControlPanel(props: GlobeControlPanelProps) {
  return (
    <>
      {/* Density mode segmented selector (top center) */}
      <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-slate-800/80 bg-[#070d1c]/90 p-1 backdrop-blur-md">
        <span className="flex items-center gap-1 pl-1.5 pr-2 font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">
          <Layers className="h-3 w-3" /> Density
        </span>
        {DENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => props.onDensityMode(opt.value)}
            title={opt.title}
            aria-label={opt.title}
            className={`rounded-lg px-2 py-1 font-mono text-[9px] font-bold tracking-wider transition-colors ${
              props.densityMode === opt.value
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                : "text-slate-500 border border-transparent hover:bg-slate-800/60 hover:text-slate-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Layer / camera controls (right) */}
      <div className="msx-map-controls absolute right-3 top-3 z-20 flex flex-col gap-0.5 rounded-xl border border-slate-800/80 bg-[#070d1c]/90 p-1 backdrop-blur-md">
        <ControlButton
          icon={<Cloud className="h-4 w-4" />}
          label={props.cloudsVisible ? "Cloud Layer: On" : "Cloud Layer: Off"}
          active={props.cloudsVisible}
          onClick={props.onToggleClouds}
        />
        <ControlButton
          icon={<Aperture className="h-4 w-4" />}
          label={props.atmosphereVisible ? "Atmosphere Glow: On" : "Atmosphere Glow: Off"}
          active={props.atmosphereVisible}
          onClick={props.onToggleAtmosphere}
        />
        <ControlButton
          icon={<Moon className="h-4 w-4" />}
          label={props.nightVisible ? "Night Lights: On" : "Night Lights: Off"}
          active={props.nightVisible}
          onClick={props.onToggleNight}
        />
        <Divider />
        <ControlButton
          icon={<Layers className="h-4 w-4" />}
          label={props.threatsVisible ? "Threat Markers: Visible" : "Threat Markers: Hidden"}
          active={props.threatsVisible}
          onClick={props.onToggleThreats}
        />
        <ControlButton
          icon={<GitBranch className="h-4 w-4" />}
          label={props.arcsVisible ? "Campaign Correlated Arcs: On" : "Campaign Correlated Arcs: Off"}
          active={props.arcsVisible}
          onClick={props.onToggleArcs}
        />
        <Divider />
        <ControlButton
          icon={<RotateCw className="h-4 w-4" />}
          label={props.autoRotate ? "Auto-rotation: Active" : "Auto-rotation: Paused"}
          active={props.autoRotate}
          onClick={props.onToggleRotate}
        />
        <ControlButton
          icon={<LocateFixed className="h-4 w-4" />}
          label="Reset Camera View"
          onClick={props.onReset}
        />
        <ControlButton
          icon={<Maximize className="h-4 w-4" />}
          label="Toggle Fullscreen View"
          onClick={props.onFullscreen}
        />
      </div>
    </>
  );
}