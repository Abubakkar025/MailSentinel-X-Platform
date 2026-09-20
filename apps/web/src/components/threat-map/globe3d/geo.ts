import * as THREE from "three";

export const GLOBE_RADIUS = 100;

/**
 * Standard three.js atlas-aligned conversion used by the official Earth
 * examples. Longitude/Latitude are projected onto a spherical surface so
 * markers/arcs line up with the equirectangular day texture.
 */
export function latLonToVector3(lat: number, lng: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export type LngLat = [number, number]; // [lng, lat]

/** Haversine great-circle distance in kilometres. */
export function geoDistanceKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Elevation (0..1 of globe radius) for a great-circle arc. Longer routes need
 * a higher apex to stay visible above the limb without clipping into clouds.
 */
export function arcElevation(a: LngLat, b: LngLat): number {
  const dist = geoDistanceKm(a, b);
  return Math.min(0.62, 0.2 + (dist / 20000) * 0.45);
}

/** Sample a lifted cubic bezier between two surface points at t in [0,1]. */
export function sampleArcPoint(from: THREE.Vector3, to: THREE.Vector3, t: number, lift: number): THREE.Vector3 {
  const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + lift);
  const curve = new THREE.CubicBezierCurve3(from.clone().multiplyScalar(1.02), mid, mid, to.clone().multiplyScalar(1.02));
  return curve.getPoint(Math.min(1, Math.max(0, t)));
}