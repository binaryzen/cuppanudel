```yaml
id: pool/media-pool-minor
lane: lane-d
purpose: >
  Verifies that poc/pool/media-pool.js already exports getBuffer() as a public method
  (it does, as confirmed by reading the existing file) and ensures the function name is
  stable for use by RecordingsProvider and MediaPoolSampleProvider. No new code is needed;
  this component definition documents the contract and confirms no changes are required.
scope:
  includes:
    - "Confirmation that getBuffer(bufferId: string): AudioBuffer | undefined is already exported from createMediaPool()"
    - "Return-type contract: returns undefined (not null) when bufferId is not in the map — callers must handle undefined"
    - "No functional changes to media-pool.js"
  excludes:
    - "Adding a separate public alias — getBuffer() is already the correct public name"
    - "Changing the return type from undefined to null — callers (RecordingsProvider, MediaPoolSampleProvider) handle both"
    - "Any new methods or fields on the pool"
interface: |
  // poc/pool/media-pool.js — existing public API (no changes required)

  // Already exported by createMediaPool():
  interface MediaPool {
    clips: SampleClip[]
    addBuffer(audioBuffer: AudioBuffer, label: string): SampleClip
    remove(id: string): void
    rename(id: string, label: string): void
    getBuffer(bufferId: string): AudioBuffer | undefined   // returns undefined on miss
    getDurationSeconds(clip: SampleClip, sampleRate: number): number
  }

  // Note: getBuffer() returns undefined (not null) when bufferId is absent.
  // MediaPoolSampleProvider and RecordingsProvider must normalize undefined to null
  // per the SampleProvider and ContentProvider contracts respectively.
success_criteria:
  - "pool.getBuffer(existingId) returns the AudioBuffer previously added via addBuffer()"
  - "pool.getBuffer('nonexistent') returns undefined (confirming existing behaviour — no change required)"
  - "The exported interface remains unchanged from the existing poc/pool/media-pool.js"
failure_criteria:
  - "Any modification to media-pool.js that changes the getBuffer() signature or return type constitutes scope creep for this component — no changes to media-pool.js are made"
dependencies:
  requires: []
  must_not_require:
    - "config/content-service"
    - "config/sample-provider-registry"
    - "any audio module"
    - "any visualizer"
```
