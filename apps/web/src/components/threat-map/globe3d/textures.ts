import * as THREE from "three";

export interface EarthTextureSet {
  day: THREE.Texture | null;
  specular: THREE.Texture | null;
  bump: THREE.Texture | null;
  night: THREE.Texture | null;
  clouds: THREE.Texture | null;
}

const BASE = "/threat-map/textures";

function makeProceduralDay(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = THREE.SRGBColorSpace;
    return empty;
  }
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0b1f44");
  gradient.addColorStop(0.28, "#123060");
  gradient.addColorStop(0.5, "#0c2550");
  gradient.addColorStop(0.72, "#123060");
  gradient.addColorStop(1, "#0b1f44");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Ocean shimmer + coarse landmass hint so the "offline" day map is still
  // recognisably a planet rather than a flat disc.
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 26;
    ctx.fillStyle = Math.random() > 0.5 ? "#1d4e89" : "#0a1833";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.18;
  const blobs: Array<[number, number, number]> = [
    [560, 300, 90],
    [640, 300, 60],
    [590, 330, 40],
    [840, 200, 70],
    [180, 230, 60],
    [300, 150, 55],
  ];
  for (const [x, y, r] of blobs) {
    ctx.fillStyle = "#2c5c2e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeProceduralAlpha(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx?.fillRect(0, 0, 512, 256);
  if (ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 46; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, 6 + Math.random() * 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeProceduralNight(): THREE.CanvasTexture {
  // Sparse dim citylight speckle — keeps the night pass honest-looking offline.
  const base = makeProceduralAlpha();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return base;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 512, 256);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, `rgba(255, ${200 + Math.random() * 55}, 140, ${0.25 + Math.random() * 0.6})`);
    g.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

async function loadWithFallback(url: string, fallback: () => THREE.Texture): Promise<THREE.Texture> {
  if (typeof window === "undefined") return fallback();
  try {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (tex) => resolve(tex),
        undefined,
        (err) => reject(new Error(err instanceof ErrorEvent ? err.message : "texture load failed"))
      );
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  } catch {
    return fallback();
  }
}

/**
 * Loads the self-hosted texture set, replacing any failed asset with a
 * procedural canvas texture so the globe ALWAYS renders (even fully offline).
 */
export async function loadEarthTextures(): Promise<EarthTextureSet> {
  const [day, specular, bump, night, clouds] = await Promise.all([
    loadWithFallback(`${BASE}/earth_day.jpg`, makeProceduralDay),
    loadWithFallback(`${BASE}/earth_specular.jpg`, () => {
      const empty = document.createElement("canvas");
      empty.width = 32;
      empty.height = 16;
      return new THREE.CanvasTexture(empty);
    }),
    loadWithFallback(`${BASE}/earth_bump.jpg`, () => {
      const empty = document.createElement("canvas");
      empty.width = 32;
      empty.height = 16;
      return new THREE.CanvasTexture(empty);
    }),
    loadWithFallback(`${BASE}/earth_night.png`, makeProceduralNight),
    loadWithFallback(`${BASE}/earth_clouds.png`, makeProceduralAlpha),
  ]);
  return { day, specular, bump, night, clouds };
}

export function createGlowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, inner.replace(/1\)$/, "0.7)"));
    g.addColorStop(0.75, outer);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}