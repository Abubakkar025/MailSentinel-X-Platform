"use client";

export type MaplibreGL = any;

let cachedLib: MaplibreGL | null = null;

export function getMapLibModule(): MaplibreGL | null {
  return cachedLib;
}

export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export async function loadMapLib(): Promise<MaplibreGL> {
  if (cachedLib) return cachedLib;
  if (typeof window === "undefined") {
    throw new Error("MapLibre GL cannot be initialized during SSR");
  }
  const mod: any = await import("maplibre-gl");
  const lib: MaplibreGL = "Map" in mod ? mod : (mod.default ?? mod);
  cachedLib = lib;
  return lib;
}

export interface TerrainConfig {
  source: string;
  tiles: string[];
  maxzoom: number;
  exaggeration: number;
}

export type MapProviderId = "configured" | "maptiler" | "carto" | "openfreemap" | "demotiles";

export interface MapProvider {
  id: MapProviderId;
  name: string;
  styleUrl: string;
  development?: boolean;
}

export const MAP_STYLES = {
  carto_positron: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  carto_dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  openfreemap_dark: "https://tiles.openfreemap.org/styles/dark",
  demotiles: "https://demotiles.maplibre.org/style.json",
};

/**
 * Tile health probe:
 * Some free tile sources (e.g. OpenFreeMap) can return HTTP 200 with empty
 * bodies, which MapLibre silently consumes — producing a black globe with no
 * geometry and no style-load error. We probe one world tile so the map can
 * automatically advance to the next provider in the chain.
 */
const PROBE_ZOOM = 2;
const PROBE_X = 2;
const PROBE_Y = 1;
const PROBE_TIMEOUT_MS = 12_000;
const PROBE_TILE_ACCEPT =
  "application/x-protobuf,application/vnd.mapbox-vector-tile,image/png,image/webp,image/jpeg,*/*;q=0.8";

async function resolveTileTemplate(source: any): Promise<string | null> {
  if (!source) return null;
  if (Array.isArray(source.tiles) && source.tiles.length > 0) return source.tiles[0];
  if (typeof source.url === "string") {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const res = await fetch(source.url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const tileset: any = await res.json();
      if (Array.isArray(tileset.tiles) && tileset.tiles.length > 0) return tileset.tiles[0];
      if (Array.isArray(tileset.data?.tiles) && tileset.data.tiles.length > 0) return tileset.data.tiles[0];
    } catch {
      return null;
    }
  }
  return null;
}

export async function probeTileHealth(style: any): Promise<boolean> {
  try {
    const sources: Record<string, any> = style?.sources ?? {};
    const entry = Object.values(sources).find(
      (s: any) => s && (s.type === "vector" || s.type === "raster" || s.type === "raster-dem")
    );
    if (!entry) return true;
    const template = await resolveTileTemplate(entry);
    if (!template) return true;
    const url = template
      .replace("{z}", String(PROBE_ZOOM))
      .replace("{x}", String(PROBE_X))
      .replace("{y}", String(PROBE_Y))
      .replace("{r}", "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: PROBE_TILE_ACCEPT },
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0;
  } catch {
    return false;
  }
}

/**
 * Ordered basemap provider chain:
 *   1. NEXT_PUBLIC_MAP_STYLE_URL           (explicit frontend override, if set)
 *   2. NEXT_PUBLIC_MAPTILER_KEY            (dataviz-dark, if configured)
 *   3. CARTO Positron (Light)              (default primary — verified healthy)
 *   4. CARTO Dark Matter                   (fallback tone for OLED dashboards)
 *   5. OpenFreeMap Dark                    (fallback, free, no token)
 *   6. MapLibre Demo Tiles                 (development last resort; low-zoom world)
 *
 * The map engine walks the chain automatically whenever a provider fails the
 * style-load or tile health probe, so the globe is never left black.
 */
export function getMapProviderChain(): MapProvider[] {
  const chain: MapProvider[] = [];
  const explicit = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (explicit && explicit.trim()) {
    chain.push({ id: "configured", name: "Configured Style", styleUrl: explicit.trim() });
  }
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key && key.trim()) {
    chain.push({
      id: "maptiler",
      name: "MapTiler",
      styleUrl: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${key.trim()}`,
    });
  }
  chain.push({ id: "carto", name: "CARTO Positron (Light)", styleUrl: MAP_STYLES.carto_positron });
  chain.push({ id: "carto", name: "CARTO Dark Matter", styleUrl: MAP_STYLES.carto_dark });
  chain.push({ id: "openfreemap", name: "OpenFreeMap Dark", styleUrl: MAP_STYLES.openfreemap_dark });
  chain.push({ id: "demotiles", name: "MapLibre Demo Vector", styleUrl: MAP_STYLES.demotiles, development: true });
  return chain;
}

export function getPrimaryMapProvider(): MapProvider {
  return getMapProviderChain()[0];
}

export function getMapStyleUrl(): string {
  return getPrimaryMapProvider().styleUrl;
}

export function getFallbackMapStyleUrl(): string {
  const chain = getMapProviderChain();
  return chain[1]?.styleUrl ?? chain[0].styleUrl;
}

/**
 * Terrain/lift configuration.
 *
 * A real raster-dem provider is used when NEXT_PUBLIC_MAP_TERRAIN_TILES is set.
 * Otherwise a public development DEM (MapLibre demo terrain tiles, real
 * elevation data) is used so the Terrain toggle works out of the box. This dev
 * source is clearly flagged and never masquerades as production intelligence.
 */
const DEV_TERRAIN_TILES = "https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png";
const DEV_TERRAIN_MAXZOOM = 14;

export function getTerrainConfig(): TerrainConfig | null {
  const configured = process.env.NEXT_PUBLIC_MAP_TERRAIN_TILES;
  if (configured && configured.trim()) {
    const parsed = Number(process.env.NEXT_PUBLIC_MAP_TERRAIN_EXAGGERATION || 1.15);
    const maxzoom = Number(process.env.NEXT_PUBLIC_MAP_TERRAIN_MAXZOOM || DEV_TERRAIN_MAXZOOM);
    return {
      source: "msx-terrain-dem",
      tiles: [configured.trim()],
      maxzoom: Number.isFinite(maxzoom) && maxzoom > 0 ? maxzoom : DEV_TERRAIN_MAXZOOM,
      exaggeration: Number.isFinite(parsed) && parsed > 0 ? parsed : 1.15,
    };
  }
  return {
    source: "msx-terrain-dem",
    tiles: [DEV_TERRAIN_TILES],
    maxzoom: DEV_TERRAIN_MAXZOOM,
    exaggeration: 1.15,
  };
}

export function isDevelopmentTerrain(): boolean {
  const configured = process.env.NEXT_PUBLIC_MAP_TERRAIN_TILES;
  return !(configured && configured.trim());
}

export interface MapTheme {
  sky: Record<string, string | number>;
  light: Record<string, unknown>;
}

export function getMapTheme(): MapTheme {
  return {
    sky: {
      "sky-color": "#030611",
      "horizon-color": "#0c1830",
      "fog-color": "#050813",
      "fog-ground-blend": 0.35,
      "horizon-fog-blend": 0.65,
      "sky-horizon-blend": 0.85,
      "atmosphere-blend": 0.45,
    },
    light: {
      anchor: "viewport",
      color: "#e2e8f0",
      intensity: 0.65,
      position: [1.2, 0.8, 1.1],
    },
  };
}