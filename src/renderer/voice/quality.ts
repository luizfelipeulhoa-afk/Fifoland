export interface VoiceQuality {
  particlesPerOrbit: number;
  pixelRatio: number;
  sphereSegments: number;
  cameraZ: number;
}

export function resolveVoiceQuality(): VoiceQuality {
  if (typeof window === "undefined") {
    return { particlesPerOrbit: 540, pixelRatio: 1, sphereSegments: 32, cameraZ: 6.3 };
  }
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const narrow = window.matchMedia("(max-width: 720px)").matches;
  const constrained = memory <= 4 || cores <= 4 || narrow;
  return constrained
    ? {
        particlesPerOrbit: 560,
        pixelRatio: Math.min(window.devicePixelRatio, 1.25),
        sphereSegments: 24,
        cameraZ: narrow ? 8.6 : 6.3
      }
    : {
        particlesPerOrbit: 1100,
        pixelRatio: Math.min(window.devicePixelRatio, 1.75),
        sphereSegments: 40,
        cameraZ: 6.3
      };
}

export function supportsWebGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
