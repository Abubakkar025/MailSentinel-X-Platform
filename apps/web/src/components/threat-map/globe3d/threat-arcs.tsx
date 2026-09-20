"use client";

import * as THREE from "three";
import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { arcElevation, GLOBE_RADIUS, latLonToVector3 } from "./geo";
import { SEVERITY_COLORS, type SeverityKey, type ThreatArc } from "../types";

interface ArcMeshProps {
  arc: ThreatArc;
  reduceMotion: boolean;
}

function ArcMesh({ arc, reduceMotion }: ArcMeshProps) {
  const dotRef = useRef<THREE.Mesh>(null);

  const { curve, color } = useMemo(() => {
    const from = latLonToVector3(arc.from[1], arc.from[0], GLOBE_RADIUS * 1.03);
    const to = latLonToVector3(arc.to[1], arc.to[0], GLOBE_RADIUS * 1.03);
    const lift = arcElevation(arc.from, arc.to) * GLOBE_RADIUS;
    const mid = from.clone().add(to).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + lift);
    const c = new THREE.CubicBezierCurve3(from, mid, mid, to);
    return {
      curve: c,
      color: SEVERITY_COLORS[(arc.severity as SeverityKey) ?? "medium"] ?? "#eab308",
    };
  }, [arc]);

  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 56, 0.34, 6, false), [curve]);
  const offset = useMemo(() => {
    const seed = Math.abs(arc.from[0] * 12.9898 + arc.from[1] * 78.233 + arc.to[0] * 3.7);
    return (seed % 1 + 1) % 1;
  }, [arc]);

  useEffect(() => () => tubeGeometry.dispose(), [tubeGeometry]);

  useFrame(({ clock }) => {
    const dot = dotRef.current;
    if (!dot || reduceMotion) return;
    const t = (clock.getElapsedTime() * 0.075 + offset) % 1;
    dot.position.copy(curve.getPoint(t));
  });

  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.62}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={dotRef} scale={[1.7, 1.7, 1.7]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

const MemoArcMesh = memo(ArcMesh);

interface ArcsProps {
  arcs: ThreatArc[];
  visible: boolean;
  reduceMotion: boolean;
}

export function ThreatArcs({ arcs, visible, reduceMotion }: ArcsProps) {
  if (!visible || arcs.length === 0) return null;
  return (
    <group>
      {arcs.map((arc) => (
        <MemoArcMesh key={arc.id} arc={arc} reduceMotion={reduceMotion} />
      ))}
    </group>
  );
}