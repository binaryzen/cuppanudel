```yaml
id: audio/media-pool-sample-provider
lane: lane-e
purpose: >
  Implements SampleProvider backed by media pool clips, allowing the user to use
  recorded or imported audio clips as metronome click sounds. getSample() returns the
  pre-decoded AudioBuffer for a named slot index directly from the pool, with no
  additional I/O. Created programmatically when the user configures a sample set via
  the sample-set picker.
scope:
  includes:
    - "createMediaPoolSampleProvider(id, label, slots, pool) factory function"
    - "id format: 'sample-set:<name>'"
    - "slots: Array<{ index: number, clipId: string }>"
    - "getSample(index): looks up slot by index, returns pool.getBuffer(slot.clipId) or null if slot not found or buffer missing"
    - "getSample() normalizes undefined returns from pool.getBuffer() to null"
    - "getSample() logs console.warn when a slot is found but its clipId is not in the pool"
    - "init(): returns Promise.resolve() — buffers are already decoded in the pool"
    - "count(): returns the number of slots configured"
    - "Module file at poc/audio/media-pool-sample-provider.js"
  excludes:
    - "UI for creating or managing sample sets — owned by ui/sample-set-picker"
    - "Registration into SampleProviderRegistry — owned by main.js wiring after user confirms the set"
    - "Workspace serialization schema for sampleSets — owned by config/workspace"
    - "Any audio synthesis or decoding"
interface: |
  // poc/audio/media-pool-sample-provider.js

  interface SlotAssignment {
    index: number      // 0 = lo click, 1 = hi click
    clipId: string     // id of the SampleClip in the media pool
  }

  // MediaPool interface subset (consumed by this provider):
  interface PoolRef {
    getBuffer(bufferId: string): AudioBuffer | undefined
    clips: SampleClip[]
  }

  // Creates a MediaPoolSampleProvider instance.
  // pool: the shared MediaPool instance.
  // slots: array of { index, clipId } assignments.
  function createMediaPoolSampleProvider(
    id: string,
    label: string,
    slots: SlotAssignment[],
    pool: PoolRef
  ): SampleProvider

  // Returns a SampleProvider where:
  interface SampleProvider {
    id: string
    label: string
    init(ctx: AudioContext): Promise<void>    // returns Promise.resolve() immediately
    getSample(index: number): AudioBuffer | null
    count(): number
  }
success_criteria:
  - "createMediaPoolSampleProvider('sample-set:woodblock', 'Woodblock Kit', [{index:0,clipId:'abc'},{index:1,clipId:'def'}], pool).id === 'sample-set:woodblock'"
  - "getSample(0) on a provider where slot 0 maps to clipId 'abc' and pool.getBuffer('abc') returns a valid AudioBuffer returns that AudioBuffer"
  - "getSample(1) returns the AudioBuffer for the clip at slot index 1"
  - "getSample(2) returns null when no slot with index 2 exists"
  - "getSample(-1) returns null"
  - "getSample(0) returns null (not undefined) when pool.getBuffer returns undefined for the slot's clipId"
  - "getSample(0) logs console.warn when the slot exists but pool.getBuffer returns undefined"
  - "init(ctx) returns a Promise that resolves immediately (synchronously resolved)"
  - "count() returns the number of slot assignments (e.g., 2 for a two-slot provider)"
  - "getSample() never returns undefined — only AudioBuffer or null"
failure_criteria:
  - "getSample() returning undefined instead of null constitutes a contract violation and must be caught in tests"
  - "If slots array is empty, getSample(0) returns null and count() returns 0 — no error thrown"
  - "createMediaPoolSampleProvider called without a required parameter (id, label, slots, or pool undefined) throws TypeError with a descriptive message"
dependencies:
  requires:
    - "pool/media-pool"
    - "config/sample-provider-registry"
  must_not_require:
    - "config/property-mapper"
    - "config/workspace"
    - "ui/sample-set-picker"
    - "any visualizer"
```
