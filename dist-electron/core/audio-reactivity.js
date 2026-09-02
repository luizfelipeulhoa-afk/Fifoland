"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRms = calculateRms;
exports.normalizeAudioLevel = normalizeAudioLevel;
exports.calculateFrequencyBands = calculateFrequencyBands;
function calculateRms(samples) {
    if (samples.length === 0)
        return 0;
    let sum = 0;
    for (const sample of samples) {
        const centered = (sample - 128) / 128;
        sum += centered * centered;
    }
    return Math.sqrt(sum / samples.length);
}
function normalizeAudioLevel(rms, noiseFloor = 0.012) {
    const audible = Math.max(0, rms - noiseFloor);
    return Math.min(1, Math.max(0, audible * 5.8));
}
function calculateFrequencyBands(samples, sampleRate = 48_000, fftSize = 1_024) {
    if (samples.length === 0 || sampleRate <= 0 || fftSize <= 0) {
        return { bass: 0, mid: 0, treble: 0 };
    }
    const binWidth = sampleRate / fftSize;
    let bass = 0;
    let bassCount = 0;
    let mid = 0;
    let midCount = 0;
    let treble = 0;
    let trebleCount = 0;
    for (let index = 0; index < samples.length; index += 1) {
        const frequency = index * binWidth;
        if (frequency > 8_000)
            break;
        if (frequency <= 250) {
            bass += samples[index];
            bassCount += 1;
        }
        else if (frequency <= 2_000) {
            mid += samples[index];
            midCount += 1;
        }
        else {
            treble += samples[index];
            trebleCount += 1;
        }
    }
    const normalize = (sum, count) => count === 0 ? 0 : Math.min(1, Math.pow(sum / count / 255, 0.82));
    return {
        bass: normalize(bass, bassCount),
        mid: normalize(mid, midCount),
        treble: normalize(treble, trebleCount)
    };
}
