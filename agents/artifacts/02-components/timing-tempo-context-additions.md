```yaml
id: timing/tempo-context-additions
lane: lane-b
purpose: >
  Adds three new fields to TempoContext (clickProviderRef, beatAccents formalisation,
  snapThreshold) and updates setBeatsPerMeasure to reset beatAccents. These fields
  complete the TempoContext schema so workspace serialization and the SampleProvider
  lookup can reference them.
scope:
  includes:
    - "clickProviderRef field: string, default 'built-in:default'"
    - "snapThreshold field: float, default 0, range 0.0–0.025"
    - "beatAccents field: already present informally in the POC — formalised with correct default ([true, false, ...] for n beats)"
    - "createTempoContext() updated to include all three new fields with their defaults"
    - "setBeatsPerMeasure(tc, n) updated to reset beatAccents alongside beatOffsets and beatVolumes"
    - "setBeatsPerMeasure does NOT reset clickProviderRef or snapThreshold"
    - "Module file: poc/timing/tempo-context.js (in-place modification)"
  excludes:
    - "Serialization schema descriptors for these fields — owned by config/workspace"
    - "Any UI for editing these fields"
    - "Any registry lookup or provider resolution — owned by main.js and metronome"
    - "Validation of field values — owned by config/property-mapper via validateAndApply"
interface: |
  // poc/timing/tempo-context.js (modified)

  interface TempoContext {
    bpm: number                 // int, 20–300
    beatsPerMeasure: number     // int, 1–13
    beatOffsets: number[]       // float[], length = beatsPerMeasure, normalized 0–1
    beatVolumes: number[]       // float[], length = beatsPerMeasure, 0–1
    beatAccents: boolean[]      // bool[], length = beatsPerMeasure; index 0 = true (accent), rest = false
    visualDelayMs: number       // float, 0–100
    clickProviderRef: string    // SampleProvider id; default 'built-in:default'
    snapThreshold: number       // float, 0.0–0.025; 0 = off
  }

  // Returns a new TempoContext with all fields set to their defaults.
  function createTempoContext(): TempoContext

  // Resets beatsPerMeasure, beatOffsets (even spacing), beatVolumes (all 1.0),
  // and beatAccents (index 0 = true, rest = false) for n beats.
  // Does NOT modify clickProviderRef or snapThreshold.
  function setBeatsPerMeasure(tc: TempoContext, n: number): void
success_criteria:
  - "createTempoContext() returns an object with clickProviderRef === 'built-in:default'"
  - "createTempoContext() returns an object with snapThreshold === 0"
  - "createTempoContext() returns an object with beatAccents === [true, false, false, false] (default 4 beats)"
  - "setBeatsPerMeasure(tc, 3) sets tc.beatAccents to [true, false, false]"
  - "setBeatsPerMeasure(tc, 1) sets tc.beatAccents to [true]"
  - "setBeatsPerMeasure(tc, 3) sets tc.beatOffsets to [0, 0.333..., 0.666...]"
  - "setBeatsPerMeasure(tc, 3) sets tc.beatVolumes to [1, 1, 1]"
  - "setBeatsPerMeasure(tc, 3) does NOT modify tc.clickProviderRef"
  - "setBeatsPerMeasure(tc, 3) does NOT modify tc.snapThreshold"
  - "After setBeatsPerMeasure(tc, 5), tc.beatAccents.length === 5 and tc.beatAccents[0] === true and tc.beatAccents[1] === false"
failure_criteria:
  - "If createTempoContext() is called and the returned object does not contain clickProviderRef, any consumer that references tc.clickProviderRef will see undefined — this constitutes a spec failure"
  - "If setBeatsPerMeasure resets clickProviderRef or snapThreshold, that constitutes a failure (those fields must survive a beatsPerMeasure change)"
dependencies:
  requires: []
  must_not_require:
    - "config/sample-provider-registry"
    - "audio/builtin-click-provider"
    - "timing/metronome"
    - "config/property-mapper"
    - "any DOM or browser API"
```
