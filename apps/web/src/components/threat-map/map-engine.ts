import type { Map as MaplibreMap } from "maplibre-gl";
import {
  SEVERITY_COLORS,
  SEVERITY_STYLE,
  SEVERITY_ORDER,
  type EnrichedThreat,
  type MapFocusRequest,
  type MapProjectionMode,
  type SeverityKey,
  type ThreatArc,
} from "./types";

export type ThreatLayer = MaplibreMap | any;

export const DEFAULT_VIEW = {
  center: [10, 22] as [number, number],
  zoom: 1.45,
  pitch: 35,
  bearing: -12,
};

const CLUSTER_SOURCE = "msx-threats-clustered";
const ARC_SOURCE = "msx-arcs";
const HEAT_SOURCE = "msx-heat";
const SELECTION_SOURCE = "msx-selection";
const TERRAIN_SOURCE = "msx-terrain-dem";

const CLUSTER_LAYERS = ["msx-cluster-circle", "msx-cluster-count"];
const THREAT_LAYERS = ["msx-threat-glow", "msx-threat-dot", "msx-arc-glow", "msx-arc-line"];
const PULSE_LAYERS: Record<SeverityKey, string> = {
  critical: "msx-pulse-critical",
  high: "msx-pulse-high",
  medium: "msx-pulse-medium",
  low: "msx-pulse-low",
  info: "msx-pulse-info",
};

const SEVERITY_MATCH: any[] = [
  "match",
  ["get", "severity"],
  "critical",
  SEVERITY_COLORS.critical,
  "high",
  SEVERITY_COLORS.high,
  "medium",
  SEVERITY_COLORS.medium,
  "low",
  SEVERITY_COLORS.low,
  SEVERITY_COLORS.low,
];

function pointFeature(threat: EnrichedThreat) {
  return {
    type: "Feature" as const,
    properties: {
      id: threat.id,
      ip: threat.ip,
      severity: threat.severity,
      color: SEVERITY_COLORS[threat.severity] ?? SEVERITY_COLORS.low,
      country: threat.country,
      city: threat.city,
      caseNumber: threat.case_number,
      abuseScore: threat.abuse_score,
      campaignName: threat.campaignName,
    },
    geometry: { type: "Point" as const, coordinates: [threat.lng, threat.lat] },
  };
}

export function buildThreatsGeoJson(threats: EnrichedThreat[]) {
  return {
    type: "FeatureCollection" as const,
    features: threats.filter((t) => typeof t.lng === "number" && typeof t.lat === "number" && !isNaN(t.lng) && !isNaN(t.lat)).map(pointFeature),
  };
}

/**
 * Interpolates great circle arc points between [lng1, lat1] and [lng2, lat2]
 * to produce smooth curved trajectories on 3D globe and 2D map.
 */
function interpolateGreatCircle(from: [number, number], to: [number, number], segments = 24): [number, number][] {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const d2r = Math.PI / 180;
  const r2d = 180 / Math.PI;
  const phi1 = lat1 * d2r;
  const lambda1 = lng1 * d2r;
  const phi2 = lat2 * d2r;
  const lambda2 = lng2 * d2r;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((phi1 - phi2) / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin((lambda1 - lambda2) / 2) ** 2
    )
  );

  if (d < 1e-5) return [from, to];

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lambda = Math.atan2(y, x);
    coords.push([lambda * r2d, phi * r2d]);
  }
  return coords;
}

export function buildArcGeoJson(arcs: ThreatArc[]) {
  return {
    type: "FeatureCollection" as const,
    features: arcs.map((arc) => ({
      type: "Feature" as const,
      properties: {
        id: arc.id,
        severity: arc.severity,
        color: SEVERITY_COLORS[arc.severity] ?? SEVERITY_COLORS.high,
        campaign: arc.campaignId,
        campaignName: arc.campaignName,
        label: arc.label,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: interpolateGreatCircle(arc.from, arc.to, 24),
      },
    })),
  };
}

export function buildHeatGeoJson(threats: EnrichedThreat[]) {
  return {
    type: "FeatureCollection" as const,
    features: threats.filter((t) => typeof t.lng === "number" && typeof t.lat === "number").map((threat) => ({
      type: "Feature" as const,
      properties: { score: threat.abuse_score || 20 },
      geometry: { type: "Point" as const, coordinates: [threat.lng, threat.lat] },
    })),
  };
}

export function buildSelectionGeoJson(threat: EnrichedThreat | null) {
  if (!threat || typeof threat.lng !== "number" || typeof threat.lat !== "number") {
    return { type: "FeatureCollection" as const, features: [] };
  }
  return {
    type: "FeatureCollection" as const,
    features: [pointFeature(threat)],
  };
}

export function firstSymbolLayerId(map: ThreatLayer): string | undefined {
  const layers = map.getStyle?.()?.layers || [];
  const symbol = layers.find((l: any) => l.type === "symbol");
  return symbol?.id;
}

function addSourceIfMissing(map: ThreatLayer, id: string, spec: any) {
  if (!map.getSource(id)) {
    try {
      map.addSource(id, spec);
    } catch {
      // best-effort
    }
  }
}

function addLayerIfMissing(map: ThreatLayer, layer: any, beforeId?: string) {
  if (!map.getLayer(layer.id)) {
    try {
      map.addLayer(layer, beforeId);
    } catch {
      // best-effort
    }
  }
}

export function ensureThreatSources(map: ThreatLayer) {
  addSourceIfMissing(map, CLUSTER_SOURCE, {
    type: "geojson",
    data: buildThreatsGeoJson([]),
    cluster: true,
    clusterMaxZoom: 7,
    clusterRadius: 40,
  });
  addSourceIfMissing(map, ARC_SOURCE, { type: "geojson", data: buildArcGeoJson([]) });
  addSourceIfMissing(map, HEAT_SOURCE, { type: "geojson", data: buildHeatGeoJson([]) });
  addSourceIfMissing(map, SELECTION_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
}

export function addOverlayLayers(map: ThreatLayer) {
  ensureThreatSources(map);

  // Curved Campaign Arcs (Glow + Line)
  addLayerIfMissing(map, {
    id: "msx-arc-glow",
    type: "line",
    source: ARC_SOURCE,
    layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
    paint: {
      "line-color": SEVERITY_MATCH,
      "line-width": 5.5,
      "line-opacity": 0.22,
      "line-blur": 2,
    },
  });

  addLayerIfMissing(map, {
    id: "msx-arc-line",
    type: "line",
    source: ARC_SOURCE,
    layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
    paint: {
      "line-color": SEVERITY_MATCH,
      "line-width": 1.8,
      "line-opacity": 0.65,
      "line-dasharray": [2, 1.5],
    },
  });

  // Clusters
  addLayerIfMissing(map, {
    id: "msx-cluster-circle",
    type: "circle",
    source: CLUSTER_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#102a4d",
        5,
        "#1b3a6b",
        15,
        "#7f1d1d",
      ],
      "circle-opacity": 0.9,
      "circle-stroke-color": [
        "step",
        ["get", "point_count"],
        "#38bdf8",
        5,
        "#60a5fa",
        15,
        "#f87171",
      ],
      "circle-stroke-width": 1.5,
      "circle-radius": [
        "step",
        ["get", "point_count"],
        16,
        5,
        22,
        15,
        28,
      ],
    },
  });

  addLayerIfMissing(map, {
    id: "msx-cluster-count",
    type: "symbol",
    source: CLUSTER_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 11,
    },
    paint: {
      "text-color": "#f8fafc",
      "text-halo-color": "#050811",
      "text-halo-width": 1.5,
    },
  });

  // Threat Marker Glow
  addLayerIfMissing(map, {
    id: "msx-threat-glow",
    type: "circle",
    source: CLUSTER_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 14,
      "circle-opacity": 0.28,
      "circle-blur": 0.8,
    },
  });

  // Threat Marker Solid Dot
  addLayerIfMissing(map, {
    id: "msx-threat-dot",
    type: "circle",
    source: CLUSTER_SOURCE,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 4.5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
    },
  });

  // Ripple Pulse Layers per Severity
  for (const sev of SEVERITY_ORDER) {
    addLayerIfMissing(map, {
      id: PULSE_LAYERS[sev],
      type: "circle",
      source: CLUSTER_SOURCE,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "severity"], sev]],
      paint: {
        "circle-color": SEVERITY_COLORS[sev],
        "circle-radius": 15,
        "circle-opacity": 0.35,
        "circle-blur": 1.1,
      },
    });
  }

  // Selected Indicator Halo & Target
  addLayerIfMissing(map, {
    id: "msx-selection-ring",
    type: "circle",
    source: SELECTION_SOURCE,
    paint: {
      "circle-color": "#1d4ed8",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 8, 28],
      "circle-opacity": 0.35,
      "circle-stroke-color": "#60a5fa",
      "circle-stroke-width": 2,
    },
  });

  addLayerIfMissing(map, {
    id: "msx-selection-dot",
    type: "circle",
    source: SELECTION_SOURCE,
    paint: {
      "circle-color": "#93c5fd",
      "circle-radius": 5.5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
}

export function setThreatsData(map: ThreatLayer, threats: EnrichedThreat[]) {
  const source = map.getSource?.(CLUSTER_SOURCE);
  if (source) source.setData(buildThreatsGeoJson(threats));
}

export function setArcsData(map: ThreatLayer, arcs: ThreatArc[]) {
  const source = map.getSource?.(ARC_SOURCE);
  if (source) source.setData(buildArcGeoJson(arcs));
}

export function setSelectionData(map: ThreatLayer, threat: EnrichedThreat | null) {
  const source = map.getSource?.(SELECTION_SOURCE);
  if (source) source.setData(buildSelectionGeoJson(threat));
}

export function setLayerVisibility(map: ThreatLayer, ids: string[], visible: boolean) {
  for (const id of ids) {
    if (map.getLayer?.(id)) {
      try {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      } catch {
        // best-effort
      }
    }
  }
}

export function setHeatmapEnabled(map: ThreatLayer, enabled: boolean) {
  const id = "msx-heat-layer";
  if (enabled && !map.getLayer?.(id)) {
    const beforeId = firstSymbolLayerId(map);
    addLayerIfMissing(
      map,
      {
        id,
        type: "heatmap",
        source: HEAT_SOURCE,
        paint: {
          "heatmap-weight": ["+", 0.5, ["/", ["get", "score"], 100]],
          "heatmap-intensity": 1.2,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 24, 7, 50],
          "heatmap-opacity": 0.6,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(7, 13, 24, 0)",
            0.2,
            "#1e3a8a",
            0.45,
            "#6d28d9",
            0.7,
            "#c2410c",
            0.95,
            "#ef4444",
          ],
        },
      },
      beforeId
    );
  } else if (!enabled && map.getLayer?.(id)) {
    try {
      map.removeLayer(id);
    } catch {
      // best-effort
    }
  }
}

export function setHeatData(map: ThreatLayer, threats: EnrichedThreat[]) {
  const source = map.getSource?.(HEAT_SOURCE);
  if (source) source.setData(buildHeatGeoJson(threats));
}

export function toggleBuildings(map: ThreatLayer, enabled: boolean) {
  const id = "msx-buildings-3d";
  if (enabled && !map.getLayer?.(id)) {
    // Building vector data is available in both OpenFreeMap (openmaptiles) and
    // CARTO (carto) styles. Height property names differ per provider, so we
    // coalesce render_height/height (and render_min_height/min_height) to keep
    // real building heights without hardcoding a single schema.
    const sourceName = ["openmaptiles", "carto"].find((s) => map.getSource?.(s)) ?? null;
    if (!sourceName) return;
    const beforeId = firstSymbolLayerId(map);
    addLayerIfMissing(
      map,
      {
        id,
        type: "fill-extrusion",
        source: sourceName,
        "source-layer": "building",
        minzoom: 13,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "render_height"], ["get", "height"], 0],
            0,
            "#161d30",
            30,
            "#1d2a45",
            90,
            "#24385c",
            200,
            "#2c4870",
          ],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 6],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], ["get", "min_height"], 0],
          "fill-extrusion-opacity": 0.82,
          "fill-extrusion-vertical-gradient": true,
        },
      },
      beforeId
    );
    return;
  }
  if (!enabled && map.getLayer?.(id)) {
    try {
      map.removeLayer(id);
    } catch {
      // best-effort
    }
  }
}

export function applyTerrain(map: ThreatLayer, enabled: boolean, tiles: string[], exaggeration: number) {
  if (!map.setTerrain) return;
  if (enabled && tiles.length > 0) {
    if (!map.getSource?.(TERRAIN_SOURCE)) {
      try {
        map.addSource(TERRAIN_SOURCE, {
          type: "raster-dem",
          tiles,
          maxzoom: 14,
          tileSize: 256,
        });
      } catch {
        // best-effort
      }
    }
    try {
      map.setTerrain({ source: TERRAIN_SOURCE, exaggeration });
    } catch {
      // best-effort
    }
  } else {
    try {
      map.setTerrain(null);
    } catch {
      // no terrain active
    }
    if (map.getSource?.(TERRAIN_SOURCE)) {
      try {
        map.removeSource(TERRAIN_SOURCE);
      } catch {
        // best-effort
      }
    }
  }
}

export function setProjectionMode(map: ThreatLayer, mode: MapProjectionMode) {
  if (!map?.setProjection) return;
  try {
    map.setProjection({ type: mode === "globe" ? "globe" : "mercator" });
  } catch (e) {
    console.warn("Failed to set projection:", e);
  }
}

function pulseLayer(map: ThreatLayer, layerId: string, tempo: number, nowMs: number) {
  if (!map.getLayer?.(layerId)) return;
  const phase = (nowMs / 1000) * tempo * Math.PI * 2;
  const wave = (Math.sin(phase) + 1) / 2;
  const radius = 8 + 10 * wave;
  const opacity = 0.15 + 0.35 * (1 - wave);
  try {
    map.setPaintProperty(layerId, "circle-radius", radius);
    map.setPaintProperty(layerId, "circle-opacity", opacity);
  } catch {
    // best-effort
  }
}

export function updatePulse(map: ThreatLayer, nowMs: number) {
  for (const sev of SEVERITY_ORDER) {
    pulseLayer(map, PULSE_LAYERS[sev], SEVERITY_STYLE[sev].tempo, nowMs);
  }
  const wave = (Math.sin((nowMs / 1000) * 0.04 * Math.PI * 2) + 1) / 2;
  if (map.getLayer?.("msx-arc-line")) {
    try {
      map.setPaintProperty("msx-arc-line", "line-opacity", 0.4 + 0.35 * wave);
    } catch {
      // best-effort
    }
  }
}

export function focusMap(map: ThreatLayer, request: MapFocusRequest) {
  if (!map?.easeTo) return;
  switch (request.kind) {
    case "reset":
      map.easeTo({ ...DEFAULT_VIEW, duration: 1200 });
      break;
    case "ip":
      if (request.coords && Array.isArray(request.coords)) {
        map.easeTo({ center: request.coords, zoom: 4.8, pitch: 45, duration: 1400 });
      }
      break;
    case "country":
    case "campaign":
      if (request.coords && Array.isArray(request.coords)) {
        map.easeTo({ center: request.coords, zoom: 3.2, pitch: 35, duration: 1400 });
      }
      break;
  }
}

export const THREAT_LAYER_IDS = [...CLUSTER_LAYERS, ...THREAT_LAYERS, ...Object.values(PULSE_LAYERS)];

export function queryThreatAtPoint(map: ThreatLayer, point: { x: number; y: number }) {
  if (!map?.queryRenderedFeatures) return null;
  try {
    const features = map.queryRenderedFeatures(point, {
      layers: [
        "msx-threat-dot",
        "msx-threat-glow",
        "msx-pulse-critical",
        "msx-pulse-high",
        "msx-pulse-medium",
        "msx-pulse-low",
        "msx-cluster-circle",
      ],
    });
    if (features.length === 0) return null;
    const top = features[0];
    if (top.properties?.cluster) {
      return {
        cluster: true as const,
        id: top.properties.cluster_id as number,
        x: top.geometry.coordinates[0] as number,
        y: top.geometry.coordinates[1] as number,
      };
    }
    return {
      cluster: false as const,
      id: top.properties?.id as string | undefined,
      ip: top.properties?.ip as string | undefined,
    };
  } catch {
    return null;
  }
}

export function expandCluster(map: ThreatLayer, cluster: any) {
  const src = map.getSource?.(CLUSTER_SOURCE);
  if (!src?.getClusterExpansionZoom) return;
  src.getClusterExpansionZoom(cluster.id, (err: any, zoom: number) => {
    if (err || zoom == null) return;
    map.easeTo({ center: [cluster.x, cluster.y], zoom: zoom + 0.8, duration: 800 });
  });
}

export { CLUSTER_SOURCE, HEAT_SOURCE, SELECTION_SOURCE, TERRAIN_SOURCE };