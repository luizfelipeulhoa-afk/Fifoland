import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { AudioEnergy, FifonesVoiceState } from "./types";

interface OrbitParticlesProps {
  variant: "user" | "assistant";
  count: number;
  state: FifonesVoiceState;
  energy: AudioEnergy;
  reducedMotion: boolean;
}

interface ParticleSeed {
  angle: Float32Array;
  thickness: Float32Array;
  phase: Float32Array;
  size: Float32Array;
}

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createSeeds(count: number): ParticleSeed {
  const angle = new Float32Array(count);
  const thickness = new Float32Array(count);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    angle[index] = (index / count) * Math.PI * 2 + (seeded(index, 1) - 0.5) * 0.035;
    thickness[index] = (seeded(index, 2) - 0.5) * 2;
    phase[index] = seeded(index, 3) * Math.PI * 2;
    size[index] = 0.72 + seeded(index, 4) * 0.58;
  }
  return { angle, thickness, phase, size };
}

export function OrbitParticles({
  variant,
  count,
  state,
  energy,
  reducedMotion
}: OrbitParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => createSeeds(count), [count]);
  const isUser = variant === "user";

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    const elapsed = clock.getElapsedTime();
    const active = isUser ? state === "listening" : state === "speaking";
    const subdued = isUser && state === "speaking";
    const disabled = state === "disabled";
    const procedural = energy.analyzable ? 0 : active ? 0.1 + Math.sin(elapsed * 2.7) * 0.035 : 0;
    const level = disabled ? 0 : Math.max(energy.level, procedural);
    const bass = disabled ? 0 : Math.max(energy.bass, procedural * 0.65);
    const mid = disabled ? 0 : Math.max(energy.mid, procedural * 0.8);
    const treble = disabled ? 0 : Math.max(energy.treble, procedural * 0.55);
    const activity = active ? 1 : subdued ? 0.24 : 0.48;
    const speed = reducedMotion ? 0 : state === "thinking" ? 0.22 : active ? 0.16 : 0.085;
    const radius = 2.18 + bass * 0.18 * activity;
    const minorRadius = 0.76 + bass * 0.12 * activity;

    group.rotation.x = (isUser ? 0.58 : -0.58) + Math.sin(elapsed * 0.18) * 0.025;
    group.rotation.z = (isUser ? 0.43 : -0.43) + Math.sin(elapsed * 0.13) * 0.02;
    group.rotation.y = (isUser ? 0.18 : -0.18) + elapsed * speed * (isUser ? 0.06 : -0.06);

    for (let index = 0; index < count; index += 1) {
      const baseAngle = seeds.angle[index];
      const angle = baseAngle + elapsed * speed * (isUser ? 1 : -1);
      const wave = Math.sin(baseAngle * 8 - elapsed * (isUser ? 4.6 : 5.2));
      const pulse = Math.max(0, wave) * mid * activity;
      const noise = Math.sin(baseAngle * 5 + elapsed * 0.55 + seeds.phase[index]) * 0.025;
      const thickness = seeds.thickness[index] * (0.14 + bass * 0.055 * activity);
      const radial = radius + thickness + noise + pulse * 0.085;
      const vertical = minorRadius + thickness * 0.32;

      dummy.position.set(
        Math.cos(angle) * radial,
        Math.sin(angle) * vertical,
        Math.sin(angle * 2 + seeds.phase[index]) * 0.14 + thickness * 0.55
      );
      const sparkle = Math.max(0, Math.sin(elapsed * 10.5 + seeds.phase[index])) * treble;
      const scale =
        (0.008 + seeds.size[index] * 0.0055) *
        (disabled ? 0.58 : 1) *
        (1 + level * 0.4 * activity + sparkle * 0.5 * activity);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, 0, angle);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = disabled ? 0.18 : subdued ? 0.42 : active ? 0.9 : 0.62;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial
          color={isUser ? "#ff38c8" : "#2f8dff"}
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
