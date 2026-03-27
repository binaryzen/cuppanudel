export function createTempoContext() {
    return {
        bpm:             120,
        beatsPerMeasure: 4,
        beatOffsets:     [0, 0.25, 0.5, 0.75],  // normalized 0–1 positions in measure
        beatVolumes:     [0.5, 0.5, 0.5, 0.5],  // per-beat gain 0–1
        beatAccents:     [true, false, false, false],  // true = hi tick
        visualDelayMs:   0,
    };
}

// Resets beatOffsets, beatVolumes and beatAccents to even spacing / full volume for n beats
export function setBeatsPerMeasure(tc, n) {
    tc.beatsPerMeasure = n;
    tc.beatOffsets = Array.from({ length: n }, (_, i) => i / n);
    tc.beatVolumes = Array.from({ length: n }, () => 1);
    tc.beatAccents = Array.from({ length: n }, (_, i) => i === 0);
}
