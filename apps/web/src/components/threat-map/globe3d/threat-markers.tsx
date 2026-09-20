"use client";

import * as THREE from "three";
import { memo, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLOBE_RADIUS, latLonToVector3 } from "./geo";
import { SEVERITY_COLORS, SEVERITY_STYLE, type EnrichedThreat, type SeverityKey } from "../types";
import { createGlowTexture } from "./textures";

export type DensityMode = "points" | "heat" | "campaigns" | "infra";

const MARKER_ELEV = GLOBE_RADIUS * 1.008;

function isInfrastructure(t: EnrichedThreat): boolean {
  const usage = (t.usageType ?? "").toLowerCase();
  return (
    usage.includes("data center") ||
    usage.includes("hosting") ||
    usage.includes("cloud") ||
    Boolean(t.asnOrg || t.asn)
  );
}

const GlowMap = new Map<string, THREE.CanvasTexture>();

function getGlowTexture(): THREE.CanvasTexture {
  if (!GlowMap.has("tint")) {
    GlowMap.set("tint", createGlowTexture("rgba(255,255,255,1.0)", "rgba(255,255,255,0)"));
  }
  return GlowMap.get("tint")!;
}

interface ThreatSpriteProps {
  threat: EnrichedThreat;
  color: string;
  tempo: number;
  baseScale: number;
  opacity: number;
  pulse: boolean;
  reduceMotion: boolean;
  selected: boolean;
  onSelect: (threat: EnrichedThreat) => void;
  onHover: (threat: EnrichedThreat | null) => void;
}

function ThreatSprite({
  threat,
  color,
  tempo,
  baseScale,
  opacity,
  pulse,
  reduceMotion,
  selected,
  onSelect,
  onHover,
}: ThreatSpriteProps) {
  const ref = useRef<THREE.Sprite>(null);
  const phase = useMemo(
    () => Math.PI * 2 * ((((threat.lat + 180) % 360) / 360 + ((threat.lng + 90) % 180) / 180) % 1),
    [threat.lat, threat.lng]
  );
  const position = useMemo(() => latLonToVector3(threat.lat, threat.lng, MARKER_ELEV), [threat.lat, threat.lng]);

  useFrame(({ clock }) => {
    const sprite = ref.current;
    if (!sprite) return;
    const t = clock.getElapsedTime();
    let k = selected ? 1.38 : 1;
    if (pulse && !reduceMotion && !selected) {
      k = 1 + 0.24 * (0.5 + 0.5 * Math.sin(t * tempo * 60 + phase));
    }
    sprite.scale.set(baseScale * k, baseScale * k, 1);
  });

  return (
    <sprite
      ref={ref}
      position={position}
      scale={[baseScale, baseScale, 1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(threat);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(threat);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
    >
      <spriteMaterial
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

const MemoThreatSprite = memo(ThreatSprite);

interface ThreatMarkersProps {
  threats: EnrichedThreat[];
  densityMode: DensityMode;
  selectedId: string | null;
  reduceMotion: boolean;
  onSelect: (threat: EnrichedThreat | null) => void;
}

export function ThreatMarkers({ threats, densityMode, selectedId, reduceMotion, onSelect }: ThreatMarkersProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const heat = densityMode === "heat";
  const baseScale = heat ? 7.5 : 3.1;
  const opacity = heat ? 0.16 : 0.92;
  const pulse = !heat;

  const visible = useMemo(() => {
    if (densityMode === "campaigns") return threats.filter((t) => t.campaignId);
    if (densityMode === "infra") return threats.filter(isInfrastructure);
    return threats;
  }, [threats, densityMode]);

  const hovered = useMemo(
    () => (hoverId ? visible.find((t) => t.id === hoverId) ?? null : null),
    [hoverId, visible]
  );
  const selected = useMemo(
    () => (selectedId ? threats.find((t) => t.id === selectedId) ?? null : null),
    [selectedId, threats]
  );

  return (
    <group>
      {visible.map((t) => {
        const key = t.severity as SeverityKey;
        const color = SEVERITY_COLORS[key] ?? "#3b82f6";
        const tempo = SEVERITY_STYLE[key]?.tempo ?? 0.024;
        return (
          <MemoThreatSprite
            key={t.id}
            threat={t}
            color={color}
            tempo={tempo}
            baseScale={baseScale}
            opacity={opacity}
            pulse={pulse}
            reduceMotion={reduceMotion}
            selected={selectedId === t.id}
            onSelect={(threat) => onSelect(threat)}
            onHover={(threat) => setHoverId(threat ? threat.id : null)}
          />
        );
      })}

      {hovered && hovered.id !== selectedId && (
        <SelectionRing position={latLonToVector3(hovered.lat, hovered.lng, MARKER_ELEV)} color="#e2e8f0" opacity={0.55} />
      )}
      {selected && (
        <SelectionRing
          position={latLonToVector3(selected.lat, selected.lng, MARKER_ELEV)}
          color={SEVERITY_COLORS[(selected.severity as SeverityKey) ?? "high"] ?? "#38bdf8"}
        />
      )}
    </group>
  );
}

interface SelectionRingProps {
  position: THREE.Vector3;
  color: string;
  opacity?: number;
  pulseScale?: number;
}

export function SelectionRing({ position, color, opacity = 0.95, pulseScale = 1 }: SelectionRingProps) {
  const ref = useRef<THREE.Group>(null);
  const quaternion = useMemo(() => {
    const norm = position.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), norm);
  }, [position]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(1 + 0.15 * Math.sin(clock.getElapsedTime() * 3));
  });

  return (
    <group ref={ref} position={position} quaternion={quaternion} scale={pulseScale}>
      <mesh>
        <torusGeometry args={[3.4, 0.32, 8, 56]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}