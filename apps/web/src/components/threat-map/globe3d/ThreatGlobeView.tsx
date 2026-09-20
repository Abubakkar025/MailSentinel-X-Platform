"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { EarthLights, EarthScene } from "./earth-scene";
import { GLOBE_RADIUS, latLonToVector3 } from "./geo";
import { ThreatArcs } from "./threat-arcs";
import { DensityMode, ThreatMarkers } from "./threat-markers";
import { GlobeControlPanel } from "./globe-control-panel";
import { loadEarthTextures, type EarthTextureSet } from "./textures";
import { ThreatMapView } from "../ThreatMapView";
import { SelectedIndicatorPanel } from "../selected-panel";
import {
  MapFilterEmptyOverlay,
  MapStatusBar,
  MapStatusPill,
  type MapStatus,
} from "../map-overlays";
import { SEVERITY_COLORS, type EnrichedThreat, type MapFocusRequest, type SeverityKey, type ThreatMapData } from "../types";

export interface ThreatGlobeViewProps {
  data: ThreatMapData | null;
  loading: boolean;
  apiError: string | null;
  focus: MapFocusRequest | null;
  onSelectThreat?: (threat: EnrichedThreat | null) => void;
  onOpenCase?: () => void;
  selected?: EnrichedThreat | null;
}

function detectWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function getReducedMotionPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(getReducedMotionPref);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useEarthTextures(): EarthTextureSet | null {
  const [textures, setTextures] = useState<EarthTextureSet | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadEarthTextures().then((set) => {
      if (!cancelled) setTextures(set);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return textures;
}

/** Rejects clicks on the planet body (clear selection) while markers stay pickable. */
function InteractionSurface({ onClear }: { onClear: () => void }) {
  return (
    <mesh onClick={(e) => { e.stopPropagation(); onClear(); }}>
      <sphereGeometry args={[GLOBE_RADIUS * 0.997, 48, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

interface CameraFocusEffectProps {
  focus: MapFocusRequest | null;
  resetSignal: number;
}

function CameraFocusEffect({ focus, resetSignal }: CameraFocusEffectProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;

  const targetGhost = useRef(new THREE.Vector3(0, 0, 0));
  const cameraGhost = useRef(new THREE.Vector3(0, 0, 300));

  useEffect(() => {
    const apply = (gridLat: number, gridLng: number, distanceScale: number) => {
      const pt = latLonToVector3(gridLat, gridLng, GLOBE_RADIUS);
      targetGhost.current.copy(pt);
      cameraGhost.current.copy(pt.clone().normalize().multiplyScalar(GLOBE_RADIUS * distanceScale));
    };
    if (focus === null || focus.kind === "reset") {
      targetGhost.current.set(0, 0, 0);
      cameraGhost.current.set(0, 0, 300);
      return;
    }
    const coords = focus.coords;
    if (coords) {
      apply(coords[1], coords[0], 2.05);
    }
  }, [focus, resetSignal]);

  useFrame(() => {
    if (!controls) return;
    controls.target.lerp(targetGhost.current, 0.07);
    camera.position.lerp(cameraGhost.current, 0.07);
    controls.update();
  });

  return null;
}

function GlobeScene({
  data,
  textures,
  densityMode,
  threatsVisible,
  arcsVisible,
  cloudsVisible,
  atmosphereVisible,
  nightVisible,
  autoRotate,
  reduceMotion,
  selected,
  focus,
  resetSignal,
  onSelectThreat,
}: {
  data: ThreatMapData | null;
  textures: EarthTextureSet;
  densityMode: DensityMode;
  threatsVisible: boolean;
  arcsVisible: boolean;
  cloudsVisible: boolean;
  atmosphereVisible: boolean;
  nightVisible: boolean;
  autoRotate: boolean;
  reduceMotion: boolean;
  selected?: EnrichedThreat | null;
  focus: MapFocusRequest | null;
  resetSignal: number;
  onSelectThreat?: (threat: EnrichedThreat | null) => void;
}) {
  const threats = data?.threats ?? [];
  const arcs = data?.arcs ?? [];

  const markerThreats = threatsVisible ? threats : [];
  const arcList = arcsVisible && densityMode !== "heat" ? arcs : [];

  return (
    <>
      <color attach="background" args={["#04070f"]} />
      <EarthLights />
      <Stars radius={350} depth={70} count={6000} factor={7} saturation={0} fade speed={0.35} />
      <EarthScene
        textures={textures}
        cloudsVisible={cloudsVisible}
        atmosphereVisible={atmosphereVisible}
        nightVisible={nightVisible}
        reduceMotion={reduceMotion}
      />
      <InteractionSurface onClear={() => onSelectThreat?.(null)} />
      <ThreatMarkers
        threats={markerThreats}
        densityMode={densityMode}
        selectedId={selected?.id ?? null}
        reduceMotion={reduceMotion}
        onSelect={(t) => onSelectThreat?.(t)}
      />
      <ThreatArcs arcs={arcList} visible={arcList.length > 0} reduceMotion={reduceMotion} />
      <CameraFocusEffect focus={focus} resetSignal={resetSignal} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        rotateSpeed={0.55}
        minDistance={GLOBE_RADIUS * 1.05}
        maxDistance={GLOBE_RADIUS * 6.5}
        autoRotate={autoRotate && !reduceMotion}
        autoRotateSpeed={0.8}
      />
    </>
  );
}

interface SocStripProps {
  data: ThreatMapData | null;
  densityMode: DensityMode;
}

function SocStrip({ data, densityMode }: SocStripProps) {
  const severityCounts = useMemo(() => {
    const counts = new Map<SeverityKey, number>();
    if (!data) return counts;
    for (const t of data.threats) {
      counts.set((t.severity as SeverityKey) ?? "low", (counts.get((t.severity as SeverityKey) ?? "low") ?? 0) + 1);
    }
    return counts;
  }, [data]);

  if (!data) return null;

  const modeLabel =
    densityMode === "points"
      ? "THREAT POINTS"
      : densityMode === "heat"
        ? "DENSITY HEAT"
        : densityMode === "campaigns"
          ? "CAMPAIGN CORRELATED"
          : "INFRASTRUCTURE";

  return (
    <div className="pointer-events-none absolute left-3 top-14 z-10 flex items-center gap-x-3 gap-y-1 flex-wrap max-w-[70%] rounded-xl border border-slate-800/80 bg-[#070d1c]/90 px-2.5 py-1.5 backdrop-blur-md">
      {(["critical", "high", "medium", "low"] as SeverityKey[]).map((sev) => {
        const count = severityCounts.get(sev) ?? 0;
        if (count === 0) return null;
        return (
          <span key={sev} className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLORS[sev], boxShadow: `0 0 6px ${SEVERITY_COLORS[sev]}` }} />
            {`${sev} ${count}`}
          </span>
        );
      })}
      <span className="font-mono text-[9px] tracking-[0.18em] text-blue-400/90 uppercase">· {modeLabel}</span>
      {data.totalThreats === 0 && <span className="font-mono text-[9px] tracking-wider text-slate-500">0 GEOLOCATED THREATS</span>}
    </div>
  );
}

interface GlobeBoundaryProps {
  onFail: () => void;
  children?: React.ReactNode;
}

class GlobeBoundary extends React.Component<GlobeBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function ThreatGlobeView({
  data,
  loading,
  apiError,
  focus,
  onSelectThreat,
  onOpenCase,
  selected,
}: ThreatGlobeViewProps) {
  const [mapStatus, setMapStatus] = useState<MapStatus>("booting");
  const [engineFailure, setEngineFailure] = useState<string | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [densityMode, setDensityMode] = useState<DensityMode>("points");
  const [threatsVisible, setThreatsVisible] = useState(true);
  const [arcsVisible, setArcsVisible] = useState(true);
  const [cloudsVisible, setCloudsVisible] = useState(true);
  const [atmosphereVisible, setAtmosphereVisible] = useState(true);
  const [nightVisible, setNightVisible] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const reduced = usePrefersReducedMotion();
  const textures = useEarthTextures();
  const webglWorks = useMemo(() => detectWebGL(), []);
  const fallback = engineFailed || !webglWorks;

  const handleEngineReady = () => {
    setMapStatus("online");
    setEngineFailure(null);
  };

  const handleEngineFail = () => {
    setEngineFailure("The 3D globe engine failed to initialize. Falling back to the 2D vector map.");
    setEngineFailed(true);
  };

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen?.();
    }
  };

  const openCase = onOpenCase ?? (() => {});

  if (fallback) {
    return (
      <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050811] shadow-2xl lg:h-[640px]">
        <ThreatMapView
          data={data}
          loading={loading}
          apiError={apiError}
          focus={focus}
          selected={selected}
          onSelectThreat={onSelectThreat}
          onOpenCase={openCase}
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-[110%] rounded-lg border border-amber-500/30 bg-[#0b0f1d]/95 px-3 py-1 font-mono text-[9px] font-bold tracking-[0.18em] text-amber-400 shadow-xl">
          ENGINE FALLBACK · MAPLIBRE 2D
        </div>
      </div>
    );
  }

  const filteredEmpty = mapStatus === "online" && threatsVisible && data !== null && data.threats.length === 0 && data.geolocated > 0;

  return (
    <div
      ref={stageRef}
      className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#04070f] shadow-2xl lg:h-[640px]"
    >
      <GlobeBoundary onFail={handleEngineFail}>
        <Canvas
          camera={{ position: [0, 0, 300], fov: 45, near: 1, far: 1800 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={handleEngineReady}
          onPointerMissed={() => onSelectThreat?.(null)}
          style={{ position: "absolute", inset: 0 }}
        >
          {textures && (
            <GlobeScene
              data={data}
              textures={textures}
              densityMode={densityMode}
              threatsVisible={threatsVisible}
              arcsVisible={arcsVisible}
              cloudsVisible={cloudsVisible}
              atmosphereVisible={atmosphereVisible}
              nightVisible={nightVisible}
              autoRotate={autoRotate}
              reduceMotion={reduced}
              selected={selected}
              focus={focus}
              resetSignal={resetSignal}
              onSelectThreat={onSelectThreat}
            />
          )}
        </Canvas>
      </GlobeBoundary>

      {!textures && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#04070f]/80">
          <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-slate-300 uppercase">Deploying Earth Texture Atlas…</p>
          <p className="font-mono text-[9px] text-slate-500">THREE.JS ENGINE · WEBGL GLOBE · SELF-HOSTED ASSETS</p>
        </div>
      )}

      {selected && mapStatus === "online" && (
        <SelectedIndicatorPanel threat={selected} onClear={() => onSelectThreat?.(null)} onOpenCase={openCase} />
      )}

      <MapStatusPill status={mapStatus} engine="THREE.JS" />

      <GlobeControlPanel
        densityMode={densityMode}
        threatsVisible={threatsVisible}
        arcsVisible={arcsVisible}
        cloudsVisible={cloudsVisible}
        atmosphereVisible={atmosphereVisible}
        nightVisible={nightVisible}
        autoRotate={autoRotate}
        onDensityMode={setDensityMode}
        onToggleThreats={() => setThreatsVisible((v) => !v)}
        onToggleArcs={() => setArcsVisible((v) => !v)}
        onToggleClouds={() => setCloudsVisible((v) => !v)}
        onToggleAtmosphere={() => setAtmosphereVisible((v) => !v)}
        onToggleNight={() => setNightVisible((v) => !v)}
        onToggleRotate={() => setAutoRotate((v) => !v)}
        onReset={() => setResetSignal((n) => n + 1)}
        onFullscreen={toggleFullscreen}
      />

      <SocStrip data={data} densityMode={densityMode} />

      <MapStatusBar
        status={{
          loading: loading && !apiError,
          blocked: Boolean(apiError) || (!loading && !data),
          data,
          threatsVisible: threatsVisible && densityMode !== "heat",
          arcsVisible: arcsVisible && densityMode !== "heat",
          heatmapEnabled: densityMode === "heat",
          error: apiError,
        }}
      />

      {filteredEmpty && <MapFilterEmptyOverlay />}

      {engineFailure && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center">
          <span className="rounded-lg border border-amber-500/30 bg-[#0b0f1d]/95 px-3 py-1.5 font-mono text-[9px] tracking-wider text-amber-400 shadow-xl">
            {engineFailure}
          </span>
        </div>
      )}
    </div>
  );
}