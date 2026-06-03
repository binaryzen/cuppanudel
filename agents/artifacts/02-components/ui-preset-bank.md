```yaml
id: ui/preset-bank
lane: lane-f
purpose: >
  Renders an 8-slot compact horizontal preset bank in the metro panel. Handles Save mode
  (tap Save button to enter, tap slot to write current tc), Recall mode (tap a filled slot
  to apply that snapshot to tc and restart the metronome if running). Shows slot names,
  visual feedback for filled vs empty vs save-mode states.
scope:
  includes:
    - "createPresetBank(container, store, tc, metronome) factory — renders 8 slot buttons into container"
    - "Save button that toggles save mode (highlights all slots for selection)"
    - "In save mode, tapping a slot calls store.save(index, snapshotFrom(tc)), updates UI, exits save mode"
    - "In normal mode, tapping a filled slot calls applyPreset(snapshot, tc, metronome)"
    - "applyPreset: writes snapshot fields to tc; if metronome.isRunning() calls metronome.restart(); else does nothing to metronome"
    - "Slot label shows preset.name if set; shows '—' for empty slots"
    - "Hover (desktop) shows full preset name in a tooltip; long-press (mobile) shows full name"
    - "Empty slots are visually distinct from filled slots"
    - "Module file at poc/ui/preset-bank.js"
    - "render() method to refresh all slot labels and states from store.load()"
  excludes:
    - "localStorage I/O — owned entirely by config/preset-store"
    - "Metronome scheduling logic — owned by timing/metronome"
    - "Preset name editing UI (inline rename) — out of scope for POC; names are set during Save"
    - "Workspace import/export of presets — owned by config/preset-store.importConfig/exportConfig"
    - "Full ARIA/keyboard-nav — deferred to app/"
interface: |
  // poc/ui/preset-bank.js

  // Subset of PresetStore consumed by this component:
  interface StoreRef {
    load(): (PresetSnapshot | null)[]
    save(index: number, snapshot: PresetSnapshot): void
    storageAvailable: boolean
  }

  // Subset of TempoContext consumed and written by this component:
  interface TcRef {
    bpm: number
    beatsPerMeasure: number
    beatOffsets: number[]
    beatVolumes: number[]
    beatAccents: boolean[]
    clickProviderRef: string
  }

  // Subset of Metronome consumed by this component:
  interface MetronomeRef {
    isRunning(): boolean
    restart(): void
  }

  // Creates the preset bank UI inside `container`.
  function createPresetBank(
    container: HTMLElement,
    store: StoreRef,
    tc: TcRef,
    metronome: MetronomeRef
  ): PresetBankController

  interface PresetBankController {
    // Refreshes all slot button labels and states from store.load().
    render(): void

    // Disposes all event listeners.
    dispose(): void
  }

  // Snapshot builder (internal helper — not exported):
  // function snapshotFrom(tc: TcRef): PresetSnapshot
success_criteria:
  - "createPresetBank renders exactly 8 slot buttons inside container"
  - "A slot where store.load()[i] === null shows '—' as its label"
  - "A slot where store.load()[i].name === 'Rock 4/4' shows 'Rock 4/4' as its label"
  - "Clicking the Save button puts the bank in save mode — all slot buttons are visually highlighted"
  - "In save mode, clicking slot 3 calls store.save(3, snapshot) where snapshot.bpm === tc.bpm, then exits save mode"
  - "In normal mode, clicking a filled slot 0 writes all preset fields (bpm, beatsPerMeasure, beatOffsets, beatVolumes, beatAccents, clickProviderRef) to tc"
  - "Recall when metronome.isRunning() === true calls metronome.restart() after applying tc fields"
  - "Recall when metronome.isRunning() === false does NOT call metronome.restart()"
  - "render() updates slot labels to match current store.load() without re-creating the DOM buttons"
  - "When store.storageAvailable is false, the Save button is disabled"
failure_criteria:
  - "Clicking an empty slot in normal mode must be a no-op — applying a null preset constitutes a failure"
  - "Clicking a slot in save mode must not trigger recall — save mode and recall are mutually exclusive"
  - "If metronome is null (passed as null before audio init), applyPreset must not throw — it skips the restart check"
  - "snapshotFrom(tc) must include clickProviderRef — omitting it constitutes a failure per spec"
dependencies:
  requires:
    - "config/preset-store"
    - "timing/tempo-context-additions"
    - "timing/metronome-refactor"
  must_not_require:
    - "config/workspace"
    - "config/property-mapper"
    - "any audio provider module"
    - "any visualizer"
```
