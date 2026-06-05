export function createTempoContext() {
    return {
        bpm:             120,
        beatsPerMeasure: 4,
        beatOffsets:     [0, 0.25, 0.5, 0.75],  // normalized 0–1 positions in measure
        beatVolumes:     [0.5, 0.5, 0.5, 0.5],  // per-beat gain 0–1
        beatAccents:     [true, false, false, false],  // true = hi tick
        visualDelayMs:   0,
        audioLatencyMs:  0,
        clickProviderRef: 'built-in:default',   // SampleProvider id
        snapThreshold:   3 * 0.005,             // float, 0.0–0.025; default = step 3
        waveformStride:  1,                     // int 1–8; 1 = solid fill, higher = sparser columns
    };
}

// Resets beatOffsets, beatVolumes and beatAccents to even spacing / full volume for n beats
export function setBeatsPerMeasure(tc, n) {
    tc.beatsPerMeasure = n;
    tc.beatOffsets = Array.from({ length: n }, (_, i) => i / n);
    tc.beatVolumes = Array.from({ length: n }, () => 1);
    tc.beatAccents = Array.from({ length: n }, (_, i) => i === 0);
}
