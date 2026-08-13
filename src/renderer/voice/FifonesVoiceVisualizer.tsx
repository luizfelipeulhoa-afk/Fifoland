import { Canvas } from "@react-three/fiber";
import { EnergySphere } from "./EnergySphere";
import { OrbitParticles } from "./OrbitParticles";
import type { AudioEnergy } from "./types";
import { useVoiceVisualController } from "./useVoiceVisualController";

interface FifonesVoiceVisualizerProps {
  state: string;
  userEnergy: AudioEnergy;
  assistantEnergy: AudioEnergy;
  disabled?: boolean;
  className?: string;
}

export function FifonesVoiceVisualizer({
  state: rawState,
  userEnergy,
  assistantEnergy,
  disabled = false,
  className = ""
}: FifonesVoiceVisualizerProps) {
  const controller = useVoiceVisualController(rawState, disabled);

  return (
    <div
      className={`fifones-voice-visualizer state-${controller.state} ${className}`}
      role="img"
      aria-label={controller.label}
      data-reduced-motion={controller.reducedMotion ? "true" : "false"}
    >
      {controller.webGlAvailable ? (
        <Canvas
          aria-hidden="true"
          className="fifones-voice-canvas"
          camera={{ position: [0, 0, controller.quality.cameraZ], fov: 43, near: 0.1, far: 40 }}
          dpr={controller.quality.pixelRatio}
          frameloop={controller.visible ? "always" : "never"}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={0.28} />
          <pointLight position={[2.5, 2.3, 3]} color="#ff36c8" intensity={3.2} distance={9} />
          <pointLight position={[-2.5, -1.8, 3]} color="#2288ff" intensity={3.6} distance={9} />
          <OrbitParticles
            variant="user"
            count={controller.quality.particlesPerOrbit}
            state={controller.state}
            energy={userEnergy}
            reducedMotion={controller.reducedMotion}
          />
          <OrbitParticles
            variant="assistant"
            count={controller.quality.particlesPerOrbit}
            state={controller.state}
            energy={assistantEnergy}
            reducedMotion={controller.reducedMotion}
          />
          <EnergySphere
            state={controller.state}
            userEnergy={userEnergy}
            assistantEnergy={assistantEnergy}
            segments={controller.quality.sphereSegments}
            reducedMotion={controller.reducedMotion}
          />
        </Canvas>
      ) : (
        <div className="fifones-voice-fallback" aria-hidden="true">
          <i className="fallback-orbit user" />
          <i className="fallback-orbit assistant" />
          <i className="fallback-core" />
        </div>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {controller.label}
      </span>
    </div>
  );
}
