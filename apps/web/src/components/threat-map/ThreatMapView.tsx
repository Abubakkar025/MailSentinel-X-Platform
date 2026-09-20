"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getMapProviderChain,
  getMapTheme,
  getTerrainConfig,
  isDevelopmentTerrain,
  loadMapLib,
  probeTileHealth,
  type MapProvider,
} from "./map-lib";
import {
  addOverlayLayers,
  applyTerrain,
  DEFAULT_VIEW,
  expandCluster,
  focusMap,
  queryThreatAtPoint,
  setArcsData,
  setHeatData,
  setHeatmapEnabled,
  setLayerVisibility,
  setProjectionMode,
  setSelectionData,
  setThreatsData,
  toggleBuildings,
  updatePulse,
  type ThreatLayer,
} from "./map-engine";
import { ControlPanel } from "./control-panel";
import {
  MapErrorOverlay,
  MapFilterEmptyOverlay,
  MapLoadingOverlay,
  MapStatusBar,
  MapStatusPill,
  MapWebGLErrorOverlay,
  type MapStatus,
} from "./map-overlays";
import { SelectedIndicatorPanel } from "./selected-panel";
import type { EnrichedThreat, MapFocusRequest, MapProjectionMode, ThreatMapData } from "./types";

interface ThreatMapViewProps {
  data: ThreatMapData | null;
  loading: boolean;
  apiError: string | null;
  focus: MapFocusRequest | null;
  onSelectThreat?: (threat: EnrichedThreat | null) => void;
  onOpenCase?: () => void;
  selected?: EnrichedThreat | null;
}

const CURSOR_LAYERS = [
  "msx-threat-dot",
  "msx-threat-glow",
  "msx-pulse-critical",
  "msx-pulse-high",
  "msx-pulse-medium",
  "msx-pulse-low",
  "msx-cluster-circle",
];

const THREAT_VIS_IDS = ["msx-threat-glow", "msx-threat-dot", "msx-cluster-circle", "msx-cluster-count"];
const ARC_VIS_IDS = ["msx-arc-glow", "msx-arc-line"];

/** If no style-load, tile-health, or probe verdict within this window, advance providers. */
const PROVIDER_WATCHDOG_MS = 30_000;

export function ThreatMapView({ data, loading, apiError, focus, onSelectThreat, onOpenCase, selected }: ThreatMapViewProps) {
  const [mapStatus, setMapStatus] = useState<MapStatus>("booting");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mode, setMode] = useState<MapProjectionMode>("globe");
  const [terrainEnabled, setTerrainEnabled] = useState(false);
  const [threatsVisible, setThreatsVisible] = useState(true);
  const [heatmapEnabled, setHeatmapEnabledState] = useState(false);
  const [arcsVisible, setArcsVisible] = useState(true);
  const [buildingsEnabled, setBuildingsEnabled] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [online, setOnline] = useState(false);
  const [bootNonce, setBootNonce] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<ThreatLayer | null>(null);
  const dataRef = useRef<ThreatMapData | null>(data);

  const autoRotateRef = useRef(autoRotate);
  const modeRef = useRef<MapProjectionMode>(mode);
  const statusRef = useRef<MapStatus>("booting");
  const lastInteractRef = useRef(0);
  const rafRef = useRef(0);
  const lastDataKeyRef = useRef<string | null>(null);
  const watchdogRef = useRef(0);
  const providerChainRef = useRef<MapProvider[]>(getMapProviderChain());
  const providerIndexRef = useRef(0);

  const terrainCfg = useMemo(() => getTerrainConfig(), []);
  const terrainIsDev = useMemo(() => isDevelopmentTerrain(), []);
  const theme = useMemo(() => getMapTheme(), []);
  const providerChain = useMemo(() => getMapProviderChain(), []);

  useEffect(() => {
    providerChainRef.current = providerChain;
  }, [providerChain]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const markInteraction = useCallback(() => {
    lastInteractRef.current = performance.now();
  }, []);

  const setStatus = useCallback((s: MapStatus) => {
    statusRef.current = s;
    setMapStatus(s);
  }, []);

  const syncOverlayData = useCallback(
    (map: ThreatLayer) => {
      if (!map || !map.isStyleLoaded()) return;
      const threats = data?.threats ?? [];
      const arcs = data?.arcs ?? [];
      const key = threats.map((t) => t.id).join(",") + "|" + arcs.map((a) => a.id).join(",");
      if (key !== lastDataKeyRef.current) {
        lastDataKeyRef.current = key;
        setThreatsData(map, threats);
        setArcsData(map, arcs);
        setHeatData(map, threats);
      }
      setLayerVisibility(map, THREAT_VIS_IDS, threatsVisible);
      setLayerVisibility(map, ARC_VIS_IDS, arcsVisible && threatsVisible);
      setHeatmapEnabled(map, heatmapEnabled);
    },
    [data, threatsVisible, arcsVisible, heatmapEnabled]
  );

  const syncOverlayDataRef = useRef(syncOverlayData);
  useEffect(() => {
    syncOverlayDataRef.current = syncOverlayData;
  }, [syncOverlayData]);

  // Initialize MapLibre GL Map directly on DOM ref. Re-runs get a fresh map
  // (bootNonce) so "[Retry]" performs a clean re-initialization.
  useEffect(() => {
    let active = true;
    let map: ThreatLayer | null = null;
    let contentSeen = false;
    let finalized = false;

    providerIndexRef.current = 0;

    const clearWatchdog = () => {
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = 0;
      }
    };

    const startWatchdog = () => {
      clearWatchdog();
      watchdogRef.current = window.setTimeout(() => {
        if (!active) return;
        const m = mapInstanceRef.current;
        if (!m) return;
        if (statusRef.current === "online" || statusRef.current === "error" || statusRef.current === "nowebgl") return;
        // Only escalate when the current provider is producing no useable map
        // data at all. A slow-but-rendering provider is left alone; `finalize`
        // clears the watchdog as soon as the first real tiles arrive.
        if (contentSeen && finalized) return;
        console.warn("[threat-map] basemap provider produced no renderable tiles; advancing basemap provider.");
        applyProvider(m, providerIndexRef.current + 1);
      }, PROVIDER_WATCHDOG_MS);
    };

    const applyProvider = (m: ThreatLayer | null, index: number) => {
      if (!m) return;
      const chain = providerChainRef.current;
      if (index >= chain.length) {
        setStatus("error");
        setMapError("All basemap data sources are unreachable. Check your network connection and retry.");
        clearWatchdog();
        return;
      }
      providerIndexRef.current = index;
      const provider = chain[index];
      contentSeen = false;
      finalized = false;
      setOnline(false);
      setStatus("loading");
      console.info(
        `[threat-map] loading basemap provider: ${provider.name}${provider.development ? " (development fallback)" : ""}`
      );
      m.setStyle(provider.styleUrl);
      startWatchdog();
    };

    async function init() {
      if (!mapContainerRef.current) return;
      setStatus("loading");

      try {
        const lib = await loadMapLib();
        if (!active || !mapContainerRef.current) return;

        map = new lib.Map({
          container: mapContainerRef.current,
          style: providerChainRef.current[0].styleUrl,
          center: DEFAULT_VIEW.center,
          zoom: DEFAULT_VIEW.zoom,
          pitch: DEFAULT_VIEW.pitch,
          bearing: DEFAULT_VIEW.bearing,
          projection: { type: modeRef.current },
          renderWorldCopies: false,
          maxPitch: 70,
          antialias: true,
          attributionControl: false,
        });

        // Add custom compact attribution
        map.addControl(new lib.AttributionControl({ compact: true }), "bottom-right");

        mapInstanceRef.current = map;

        const doFinalize = () => {
          if (!active || mapInstanceRef.current !== map) return;
          if (finalized) return;
          finalized = true;
          contentSeen = true;
          clearWatchdog();

          // Sources are recreated on every style reload; force a data resync.
          lastDataKeyRef.current = null;
          addOverlayLayers(map);
          syncOverlayDataRef.current(map);

          // Re-assert globe projection, sky atmosphere, and lighting after any style swap.
          try {
            map.setProjection?.({ type: modeRef.current });
          } catch {
            // best-effort
          }
          try {
            map.setSky?.(theme.sky);
          } catch {
            // best-effort
          }
          try {
            map.setLight?.(theme.light);
          } catch {
            // best-effort
          }

          // Guard against providers that serve empty tile payloads (style "loads"
          // but the world renders black). Advance to the next provider when the
          // probe finds no data.
          probeTileHealth(map.getStyle?.())
            .then((healthy) => {
              if (!active || mapInstanceRef.current !== map) return;
              if (!healthy && providerIndexRef.current < providerChainRef.current.length - 1) {
                console.warn("[threat-map] provider returned empty tiles; advancing basemap provider.");
                applyProvider(map, providerIndexRef.current + 1);
                return;
              }
              setStatus("online");
              setMapError(null);
              setOnline(true);
              setLayerVisibility(map, THREAT_VIS_IDS, threatsVisible);
              setLayerVisibility(map, ARC_VIS_IDS, arcsVisible && threatsVisible);
              setHeatmapEnabled(map, heatmapEnabled);
            })
            .catch(() => {
              if (!active || mapInstanceRef.current !== map) return;
              setStatus("online");
              setMapError(null);
              setOnline(true);
            });
        };

        map.on("load", doFinalize);

        // The `load` event waits for the entire tile pyramid (including the
        // full-globe coverage used at low zooms) to finish. Some providers can
        // leave a single tile hanging, which would keep `load` pending forever
        // and the canvas black. Treat the first real source content plus a
        // rendered frame as "the map is online", then rely on the tile probe on
        // the `load` path to reject empty providers.
        map.on("sourcedata", (e: any) => {
          if (!active || mapInstanceRef.current !== map) return;
          if (e?.dataType === "source" && e?.sourceDataType === "content") {
            contentSeen = true;
            doFinalize();
          }
        });

        map.on("render", () => {
          if (!active || mapInstanceRef.current !== map) return;
          if (contentSeen) doFinalize();
        });

        map.on("error", (e: any) => {
          const msg = e?.error?.message || e?.message || "Map rendering encountered an issue";
          console.warn("[threat-map] MapLibre event error:", msg);
          if (/webgl/i.test(msg)) {
            setStatus("nowebgl");
            clearWatchdog();
            return;
          }
          if (!mapInstanceRef.current?.isStyleLoaded()) {
            console.warn("[threat-map] style failed to load; advancing basemap provider.");
            applyProvider(map, providerIndexRef.current + 1);
            return;
          }
          // Post-load errors (e.g. a few dropped tiles) are tolerated — the tile
          // probe already verified real geometry at load time.
        });

        map.on("click", (e: any) => {
          markInteraction();
          const feature = queryThreatAtPoint(map, e.point);
          if (feature?.cluster) {
            expandCluster(map, feature);
            return;
          }
          if (feature && !feature.cluster && feature.id) {
            const threat = dataRef.current?.threats.find((t) => t.id === feature.id);
            if (threat) onSelectThreat?.(threat);
            return;
          }
          onSelectThreat?.(null);
        });

        map.on("mousemove", (e: any) => {
          if (!map) return;
          const hit = queryThreatAtPoint(map, e.point) !== null;
          map.getCanvas().style.cursor = hit ? "pointer" : "grab";
        });

        map.on("movestart", markInteraction);
        map.on("wheel", markInteraction);
        map.on("mousedown", markInteraction);
        map.on("touchstart", markInteraction);

        startWatchdog();
      } catch (err: any) {
        console.error("[threat-map] Map initialization failed:", err);
        if (/webgl/i.test(err?.message || "")) {
          setStatus("nowebgl");
        } else {
          setStatus("error");
          setMapError(err?.message || "Failed to initialize map library.");
        }
      }
    }

    init();

    return () => {
      active = false;
      clearWatchdog();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // cleanup
        }
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootNonce]);

  // Sync projection mode (Globe vs 2D Mercator)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !online) return;
    setProjectionMode(map, mode);
  }, [mode, online]);

  // Sync data updates to overlay layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && online) syncOverlayData(map);
  }, [online, syncOverlayData]);

  // Terrain toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !online) return;
    applyTerrain(map, terrainEnabled, terrainCfg?.tiles ?? [], terrainCfg?.exaggeration ?? 1.15);
  }, [terrainEnabled, terrainCfg, online]);

  // 3D Buildings toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !online) return;
    toggleBuildings(map, buildingsEnabled);
  }, [buildingsEnabled, online]);

  // Layer visibility toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !online) return;
    setLayerVisibility(map, THREAT_VIS_IDS, threatsVisible);
    setLayerVisibility(map, ARC_VIS_IDS, arcsVisible && threatsVisible);
    setHeatmapEnabled(map, heatmapEnabled);
  }, [threatsVisible, arcsVisible, heatmapEnabled, online]);

  // Selected threat highlight
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !online) return;
    setSelectionData(map, selected ?? null);
  }, [selected, online]);

  // Camera focus animation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focus) return;
    focusMap(map, focus);
  }, [focus]);

  // Reset camera view
  const resetView = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markInteraction();
    map.easeTo({
      center: DEFAULT_VIEW.center,
      zoom: DEFAULT_VIEW.zoom,
      pitch: DEFAULT_VIEW.pitch,
      bearing: DEFAULT_VIEW.bearing,
      duration: 1200,
    });
  }, [markInteraction]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen?.();
    }
  }, []);

  // Retry: reset the provider chain and perform a clean re-initialization.
  const handleRetry = useCallback(() => {
    setOnline(false);
    setMapError(null);
    setStatus("loading");
    providerIndexRef.current = 0;
    setBootNonce((n) => n + 1);
  }, [setStatus]);

  // Pulse animations and auto-rotation RAF loop
  useEffect(() => {
    if (!online) return;
    const tick = (now: number) => {
      const map = mapInstanceRef.current;
      if (map && map.isStyleLoaded()) {
        updatePulse(map, now);
        if (autoRotateRef.current && now - lastInteractRef.current > 2400) {
          try {
            if (modeRef.current === "globe") {
              const c = map.getCenter();
              map.setCenter([c.lng + 0.04, c.lat]);
            } else {
              map.setBearing(map.getBearing() + 0.025);
            }
          } catch {
            // best-effort camera animation
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [online]);

  // Container ResizeObserver for robust layout & sidebar transitions
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    ro.observe(el);
    window.addEventListener("resize", markInteraction);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", markInteraction);
    };
  }, [markInteraction]);

  const threats = data?.threats ?? [];
  const filteredEmpty = online && threatsVisible && data !== null && threats.length === 0 && data.geolocated > 0;

  return (
    <div
      ref={stageRef}
      className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#050811] shadow-2xl lg:h-[640px]"
    >
      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} className="h-full w-full outline-none" tabIndex={0} />

      {/* Selected Threat Drawer */}
      {online && selected && (
        <SelectedIndicatorPanel
          threat={selected}
          onClear={() => onSelectThreat?.(null)}
          onOpenCase={onOpenCase ?? (() => {})}
        />
      )}

      {/* Overlays and Controls */}
      <MapStatusPill status={mapStatus} />

      <ControlPanel
        mode={mode}
        terrainEnabled={terrainEnabled}
        terrainAvailable={terrainCfg !== null}
        terrainDev={terrainIsDev}
        threatsVisible={threatsVisible}
        heatmapEnabled={heatmapEnabled}
        arcsVisible={arcsVisible}
        buildingsEnabled={buildingsEnabled}
        autoRotate={autoRotate}
        onToggleMode={() => setMode((m) => (m === "globe" ? "mercator" : "globe"))}
        onToggleTerrain={() => setTerrainEnabled((v) => !v)}
        onToggleThreats={() => setThreatsVisible((v) => !v)}
        onToggleHeatmap={() => setHeatmapEnabledState((v) => !v)}
        onToggleArcs={() => setArcsVisible((v) => !v)}
        onToggleBuildings={() => setBuildingsEnabled((v) => !v)}
        onToggleRotate={() => setAutoRotate((v) => !v)}
        onReset={resetView}
        onFullscreen={toggleFullscreen}
      />

      <MapStatusBar
        status={{
          loading: loading && !apiError,
          blocked: Boolean(apiError) || (!loading && !data),
          data,
          threatsVisible,
          arcsVisible,
          heatmapEnabled,
          error: apiError,
          terrainDev: terrainIsDev,
        }}
      />

      {(mapStatus === "booting" || mapStatus === "loading") && <MapLoadingOverlay stage="basemap" />}

      {mapStatus === "error" && (
        <MapErrorOverlay
          message={mapError ?? "Could not connect to vector basemap provider."}
          onRetry={handleRetry}
        />
      )}

      {mapStatus === "nowebgl" && <MapWebGLErrorOverlay />}

      {filteredEmpty && !loading && <MapFilterEmptyOverlay />}
    </div>
  );
}