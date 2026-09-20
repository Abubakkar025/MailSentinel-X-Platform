"use client";

import {
  Flame,
  GitBranch,
  Globe2,
  Layers,
  LocateFixed,
  Map as MapIcon,
  Maximize,
  Mountain,
  RotateCw,
  Crosshair,
} from "lucide-react";
import type { MapProjectionMode } from "./types";

interface ControlPanelProps {
  mode: MapProjectionMode;
  terrainEnabled: boolean;
  terrainAvailable: boolean;
  terrainDev?: boolean;
  threatsVisible: boolean;
  heatmapEnabled: boolean;
  arcsVisible: boolean;
  buildingsEnabled: boolean;
  autoRotate: boolean;
  onToggleMode: () => void;
  onToggleTerrain: () => void;
  onToggleThreats: () => void;
  onToggleHeatmap: () => void;
  onToggleArcs: () => void;
  onToggleBuildings: () => void;
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
}

function ControlButton({ icon, label, active, disabled, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`msx-map-control group relative ${active ? "msx-map-control-active" : ""} ${disabled ? "cursor-not-allowed opacity-35" : ""}`}
    >
      {icon}
      <span
        className="msx-tooltip pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-700/70 bg-[#0b1222]/95 px-2 py-1 font-mono text-[9px] tracking-wider text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50"
      >
        {label}
      </span>
    </button>
  );
}

function Divider() {
  return <div className="mx-1 my-0.5 h-px bg-slate-800/80" />;
}

export function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="msx-map-controls absolute right-3 top-3 z-20 flex flex-col gap-0.5 rounded-xl border border-slate-800/80 bg-[#070d1c]/90 p-1 backdrop-blur-md">
      <ControlButton
        icon={props.mode === "globe" ? <Globe2 className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
        label={props.mode === "globe" ? "Projection: 3D Globe" : "Projection: 2D Flat Map"}
        onClick={props.onToggleMode}
      />
      <ControlButton
        icon={<Mountain className="h-4 w-4" />}
        label={
          props.terrainEnabled
            ? `3D Terrain: On${props.terrainDev ? " (development source)" : ""}`
            : `3D Terrain: Off${props.terrainDev ? " (development source)" : ""}`
        }
        active={props.terrainEnabled}
        disabled={!props.terrainAvailable}
        onClick={props.onToggleTerrain}
      />
      <ControlButton
        icon={<Layers className="h-4 w-4" />}
        label={props.buildingsEnabled ? "3D Buildings: On" : "3D Buildings: Off"}
        active={props.buildingsEnabled}
        onClick={props.onToggleBuildings}
      />
      <Divider />
      <ControlButton
        icon={<Crosshair className="h-4 w-4" />}
        label={props.threatsVisible ? "Threat Points: Visible" : "Threat Points: Hidden"}
        active={props.threatsVisible}
        onClick={props.onToggleThreats}
      />
      <ControlButton
        icon={<Flame className="h-4 w-4" />}
        label={props.heatmapEnabled ? "Threat Density Heatmap: On" : "Threat Density Heatmap: Off"}
        active={props.heatmapEnabled}
        onClick={props.onToggleHeatmap}
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
  );
}