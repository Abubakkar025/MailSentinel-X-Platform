"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { GLOBE_RADIUS } from "./geo";
import type { EarthTextureSet } from "./textures";

export const SUN_DIRECTION = new THREE.Vector3(0.85, 0.45, 0.3).normalize();

interface EarthSceneProps {
  textures: EarthTextureSet;
  cloudsVisible: boolean;
  atmosphereVisible: boolean;
  nightVisible: boolean;
  reduceMotion: boolean;
}

const NIGHT_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NIGHT_FRAG = /* glsl */ `
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    float sun = max(dot(normalize(vNormalW), normalize(sunDirection)), 0.0);
    float night = 1.0 - smoothstep(0.0, 0.22, sun);
    vec3 light = texture2D(nightTexture, vUv).rgb;
    float alpha = (length(light) * night) * 0.92 + 0.012;
    gl_FragColor = vec4(light * night * 1.25, alpha);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDirW = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec3 vNormalW;
  varying vec3 vViewDirW;
  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewDirW)));
    float glow = pow(rim, 3.0) * intensity;
    gl_FragColor = vec4(glowColor, glow * 0.5);
  }
`;

export function EarthScene({ textures, cloudsVisible, atmosphereVisible, nightVisible, reduceMotion }: EarthSceneProps) {
  const cloudsRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (cloudsRef.current && cloudsVisible && !reduceMotion) {
      cloudsRef.current.rotation.y += delta * 0.012;
    }
  });

  const dayMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        map: textures.day ?? undefined,
        specularMap: textures.specular ?? undefined,
        bumpMap: textures.bump ?? undefined,
        bumpScale: 0.55,
        shininess: 7,
        specular: new THREE.Color(0x223344),
        color: 0xffffff,
      }),
    [textures]
  );

  const nightMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: NIGHT_VERT,
        fragmentShader: NIGHT_FRAG,
        uniforms: {
          nightTexture: { value: textures.night },
          sunDirection: { value: SUN_DIRECTION.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [textures.night]
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: {
          glowColor: { value: new THREE.Color(0x2f81ff) },
          intensity: { value: 1.35 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    []
  );

  return (
    <group>
      {/* Solid day sphere — provides the occluder depth for other passes. */}
      <mesh material={dayMaterial} raycast={() => null}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
      </mesh>

      {/* Emissive night-lights visible only on the dark side. */}
      {nightVisible && (
        <mesh material={nightMaterial}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.002, 96, 64]} />
        </mesh>
      )}

      {/* Slow-drifting cloud layer. */}
      {cloudsVisible && textures.clouds && (
        <mesh ref={cloudsRef} raycast={() => null}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.025, 96, 64]} />
          <meshLambertMaterial map={textures.clouds} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}

      {/* Fresnel atmosphere glow just above the limb. */}
      {atmosphereVisible && (
        <mesh material={atmosphereMaterial} raycast={() => null}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.045, 64, 48]} />
        </mesh>
      )}
    </group>
  );
}

export function EarthLights() {
  return (
    <>
      <ambientLight intensity={0.22} color="#3a4a66" />
      <directionalLight
        position={[SUN_DIRECTION.x * 300, SUN_DIRECTION.y * 300, SUN_DIRECTION.z * 300]}
        intensity={3.0}
        color="#fff3e0"
      />
    </>
  );
}