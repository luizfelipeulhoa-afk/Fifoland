import { describe, expect, it } from "vitest";
import {
  calculateFrequencyBands,
  calculateRms,
  normalizeAudioLevel
} from "../src/core/audio-reactivity";

describe("audio reactivity", () => {
  it("returns zero for silence", () => {
    expect(calculateRms(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(normalizeAudioLevel(0)).toBe(0);
  });

  it("normalizes quiet and loud audio into a bounded level", () => {
    expect(normalizeAudioLevel(0.01)).toBe(0);
    expect(normalizeAudioLevel(0.1)).toBeGreaterThan(0);
    expect(normalizeAudioLevel(10)).toBe(1);
  });

  it("separates bass, mid and treble energy", () => {
    const bassSamples = new Uint8Array(512);
    bassSamples.fill(255, 0, 6);
    const bass = calculateFrequencyBands(bassSamples, 48_000, 1_024);
    expect(bass.bass).toBeGreaterThan(0.9);
    expect(bass.mid).toBe(0);
    expect(bass.treble).toBe(0);

    const midSamples = new Uint8Array(512);
    midSamples.fill(255, 6, 43);
    const mid = calculateFrequencyBands(midSamples, 48_000, 1_024);
    expect(mid.mid).toBeGreaterThan(0.9);

    const trebleSamples = new Uint8Array(512);
    trebleSamples.fill(255, 43, 171);
    const treble = calculateFrequencyBands(trebleSamples, 48_000, 1_024);
    expect(treble.treble).toBeGreaterThan(0.9);
  });
});
