import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioEnergy, FifonesVoiceState } from "./types";

interface EnergySphereProps {
  state: FifonesVoiceState;
  userEnergy: AudioEnergy;
  assistantEnergy: AudioEnergy;
  segments: number;
  reducedMotion: boolean;
}

const STATE_COLORS: Record<FifonesVoiceState, string> = {
  idle: "#6d41ff",
  listening: "#ff35cd",
  thinking: "#9a4dff",
  speaking: "#2f8cff",
  error: "#ff3c54",
  disabled: "#46516d"
};

function createFilaments(): THREE.BufferGeometry {
  const segmentCount = 54;
  const positions = new Float32Array(segmentCount * 2 * 3);
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = (index / segmentCount) * Math.PI * 2;
    const latitude = Math.sin(index * 2.13) * 0.68;
    const radius = 0.16 + ((index * 37) % 17) / 100;
    const next = angle + 0.12 + ((index * 19) % 9) / 90;
    const offset = index * 6;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = latitude * radius;
    positions[offset + 2] = Math.sin(angle) * radius;
    positions[offset + 3] = Math.cos(next) * (radius + 0.14);
    positions[offset + 4] = (latitude + Math.sin(index * 4.7) * 0.13) * radius;
    positions[offset + 5] = Math.sin(next) * (radius + 0.14);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function EnergySphere({
  state,
  userEnergy,
  assistantEnergy,
  segments,
  reducedMotion
}: EnergySphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);
  const sparkRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const filamentRef = useRef<THREE.LineBasicMaterial>(null);
  const filamentGroupRef = useRef<THREE.LineSegments>(null);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const outerTargetColor = useMemo(() => new THREE.Color(), []);
  const coreTargetColor = useMemo(() => new THREE.Color(), []);
  const filamentGeometry = useMemo(createFilaments, []);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const outer = outerRef.current;
    const core = coreRef.current;
    const spark = sparkRef.current;
    const halo = haloRef.current;
    const filament = filamentRef.current;
    const filamentGroup = filamentGroupRef.current;
    if (!group || !outer || !core || !spark || !halo || !filament || !filamentGroup) return;

    const elapsed = clock.getElapsedTime();
    const relevant = state === "speaking" ? assistantEnergy : userEnergy;
    const procedural = relevant.analyzable ? 0 : state === "idle" ? 0.025 : 0.075;
    const energy = state === "disabled" ? 0 : Math.max(relevant.level, procedural);
    const pulse = reducedMotion ? 0 : Math.sin(elapsed * (state === "thinking" ? 4.2 : 1.65)) * 0.018;
    const targetScale = 1 + pulse + energy * 0.13;
    const smoothing = 1 - Math.exp(-delta * 7);

    group.scale.x = THREE.MathUtils.lerp(group.scale.x, targetScale, smoothing);
    group.scale.y = THREE.MathUtils.lerp(group.scale.y, targetScale, smoothing);
    group.scale.z = THREE.MathUtils.lerp(group.scale.z, targetScale, smoothing);
    group.rotation.y += reducedMotion ? 0 : delta * (state === "thinking" ? 0.34 : 0.12);
    group.rotation.x = Math.sin(elapsed * 0.31) * 0.07;

    targetColor.set(STATE_COLORS[state]);
    outerTargetColor.copy(targetColor).multiplyScalar(0.12);
    coreTargetColor.copy(targetColor).multiplyScalar(0.24);
    core.color.lerp(coreTargetColor, smoothing);
    core.emissive.lerp(targetColor, smoothing);
    core.emissiveIntensity = THREE.MathUtils.lerp(core.emissiveIntensity, 1.35 + energy * 3.8, smoothing);
    spark.color.lerp(targetColor, smoothing);
    spark.opacity = state === "disabled" ? 0.18 : 0.76 + energy * 0.2;
    outer.color.lerp(outerTargetColor, smoothing * 0.45);
    outer.emissive.lerp(targetColor, smoothing * 0.4);
    outer.emissiveIntensity = 0.16 + energy * 0.42;
    halo.color.lerp(targetColor, smoothing);
    halo.opacity = state === "disabled" ? 0.035 : 0.055 + energy * 0.12;
    filament.color.lerp(targetColor, smoothing);
    filament.opacity = state === "disabled" ? 0.04 : 0.32 + energy * 0.58;
    filamentGroup.rotation.z += reducedMotion ? 0 : delta * (0.18 + energy * 0.72);
  });

  return (
    <group ref={groupRef}>
      <pointLight color="#596cff" intensity={5} distance={5} decay={2} />
      <mesh renderOrder={2}>
        <sphereGeometry args={[0.73, segments, segments]} />
        <meshPhysicalMaterial
          ref={outerRef}
          color="#17162a"
          emissive="#4c22a0"
          emissiveIntensity={0.18}
          roughness={0.12}
          metalness={0.45}
          transmission={0.42}
          thickness={0.7}
          transparent
          opacity={0.82}
          depthWrite
        />
      </mesh>
      <mesh renderOrder={1}>
        <sphereGeometry args={[0.52, segments, segments]} />
        <meshStandardMaterial
          ref={coreRef}
          color="#6846ff"
          emissive="#6846ff"
          emissiveIntensity={2.4}
          roughness={0.26}
          metalness={0.15}
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={0.2} renderOrder={5}>
        <sphereGeometry args={[0.72, 18, 18]} />
        <meshBasicMaterial
          ref={sparkRef}
          color="#b996ff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <lineSegments ref={filamentGroupRef} geometry={filamentGeometry} renderOrder={4}>
        <lineBasicMaterial
          ref={filamentRef}
          color="#dfcfff"
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          toneMapped={false}
        />
      </lineSegments>
      <mesh scale={1.7} renderOrder={0}>
        <sphereGeometry args={[0.72, 20, 20]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#6f4dff"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
