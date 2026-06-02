```yaml
id: config/preset-store
lane: lane-f
purpose: >
  Manages persistent storage of tempo presets in localStorage and provides in-memory
  access to the preset array. Reads and writes a JSON array of MAX_PRESETS (8) entries
  under the key 'cuppanudel.presets.v1'. Degrades gracefully when localStorage is
  unavailable by operating on an in-memory array only.
scope:
  includes:
    - "createPresetStore() factory — initialises from localStorage on creation; falls back to in-memory if unavailable"
    - "load() — returns the current in-memory preset array (MAX_PRESETS=8 entries, null for empty slots)"
    - "save(index, snapshot) — writes a TempoContext snapshot to slot index; persists to localStorage"
    - "clear(index) — sets slot index to null; persists to localStorage"
    - "replaceAll(presetsArray) — overwrites all slots from a workspace import; persists to localStorage; used by importConfig"
    - "exportConfig() — returns the presets array as a plain JS object for workspace serialization"
    - "importConfig(obj) — validates and applies an imported presets section; calls replaceAll; returns error strings"
    - "Graceful degradation: if localStorage throws (unavailable), Save is marked as disabled via a getter; load() returns in-memory array"
    - "localStorage key: 'cuppanudel.presets.v1'"
    - "MAX_PRESETS = 8 (imported from constants.js)"
    - "Module file at poc/config/preset-store.js"
  excludes:
    - "UI for rendering the preset bank — owned by ui/preset-bank"
    - "Applying the preset to tc (i.e., writing fields of tc) — owned by ui/preset-bank or main.js"
    - "Metronome stop/restart on recall — owned by main.js"
    - "Property-mapper schema for preset fields — the presets array is stored as plain JSON; importConfig uses validateAndApply for each entry"
interface: |
  // poc/config/preset-store.js

  // Snapshot shape: subset of TempoContext that is persisted per preset.
  interface PresetSnapshot {
    name: string                  // short user-editable label; may be empty string for unnamed
    bpm: number
    beatsPerMeasure: number
    beatOffsets: number[]
    beatVolumes: number[]
    beatAccents: boolean[]
    clickProviderRef: string
  }

  interface PresetStore {
    // Returns current in-memory array of MAX_PRESETS entries. null = empty slot.
    load(): (PresetSnapshot | null)[]

    // Writes snapshot to slot at index (0–MAX_PRESETS-1). Persists to localStorage.
    // Throws RangeError if index is out of bounds.
    save(index: number, snapshot: PresetSnapshot): void

    // Clears the slot at index. Persists to localStorage.
    // Throws RangeError if index is out of bounds.
    clear(index: number): void

    // Replaces all slots atomically from an external source (workspace import).
    // presetsArray must have exactly MAX_PRESETS entries (null for empty slots).
    // Persists to localStorage.
    replaceAll(presetsArray: (PresetSnapshot | null)[]): void

    // Returns the presets array as a plain JS object for workspace export.
    exportConfig(): { presets: (PresetSnapshot | null)[] }

    // Validates and applies imported presets object (from workspace YAML).
    // Returns error string array; empty = success. Uses validateAndApply internally.
    importConfig(obj: Record<string, unknown>): string[]

    // True if localStorage is available. False if private browsing mode blocks it.
    readonly storageAvailable: boolean
  }

  function createPresetStore(): PresetStore

  export { createPresetStore }
success_criteria:
  - "createPresetStore() initialises with 8 null slots when localStorage is empty or unavailable"
  - "createPresetStore() loads existing presets from localStorage key 'cuppanudel.presets.v1' if present and valid JSON"
  - "save(0, snapshot) writes snapshot to slot 0 and persists the updated array to localStorage"
  - "load() after save(0, snapshot) returns an array where index 0 equals snapshot"
  - "clear(0) sets slot 0 to null and persists"
  - "load() returns exactly 8 entries at all times"
  - "replaceAll([...8 entries...]) overwrites all slots and persists"
  - "exportConfig() returns an object with a 'presets' key containing the current 8-entry array"
  - "importConfig({presets: [...8 valid entries...]}) calls replaceAll and returns []"
  - "storageAvailable returns false when localStorage.setItem throws (simulated private browsing)"
  - "When storageAvailable is false, save() operates only on in-memory array — no throw, no unhandled error"
  - "importConfig with a preset entry missing 'bpm' returns an error string array containing a message about the missing field"
failure_criteria:
  - "save(index) with index < 0 or index >= MAX_PRESETS throws RangeError('PresetStore: index out of bounds: <index>')"
  - "If localStorage contains malformed JSON, createPresetStore() resets to 8 null slots and logs console.warn — must not throw"
  - "importConfig with a presets array of wrong length (not MAX_PRESETS) returns an error string — must not partially apply"
  - "save() when storageAvailable is false must not throw — it silently writes in-memory only"
dependencies:
  requires:
    - "config/property-mapper"
    - "timing/tempo-context-additions"
  must_not_require:
    - "config/workspace"
    - "ui/preset-bank"
    - "timing/metronome"
    - "any audio module"
    - "any visualizer"
```
