/**
 * Declarative mapping between TempoContext properties and knob integer positions.
 *
 * toKnob(tcValue)   → integer the knob dial should display
 * fromKnob(knobInt) → value to store on tc
 *
 * Adding a new bound property: add one entry here.  main.js wires it
 * automatically; the contract test covers it automatically.
 */
export const TC_KNOB_BINDINGS = [
    {
        key:       'bpm',
        toKnob:    v => v,
        fromKnob:  v => v,
        testValue: 180,
    },
    {
        key:       'beatsPerMeasure',
        toKnob:    v => v,
        fromKnob:  v => v,
        testValue: 6,
    },
    {
        key:       'visualDelayMs',
        toKnob:    v => v,
        fromKnob:  v => v,
        testValue: 50,
    },
    {
        key:       'audioLatencyMs',
        toKnob:    v => v,
        fromKnob:  v => v,
        testValue: 100,
    },
    {
        key:       'snapThreshold',
        toKnob:    v => Math.round(v / 0.005),
        fromKnob:  v => v * 0.005,
        testValue: 4,
    },
    {
        key:       'waveformStride',
        toKnob:    v => v,
        fromKnob:  v => v,
        testValue: 3,
    },
];
