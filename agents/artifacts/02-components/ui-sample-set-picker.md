```yaml
id: ui/sample-set-picker
lane: lane-e
purpose: >
  Renders the "Click Sound" row in the metro panel showing the active provider label, and
  manages the provider picker dropdown and two-slot assignment flow for creating or
  selecting sample sets. It is the user-facing surface for configuring which SampleProvider
  the metronome uses.
scope:
  includes:
    - "createSampleSetPicker(target, registry, pool, tc, onProviderChange) factory"
    - "Display of the current active provider label (resolved from tc.clickProviderRef via registry)"
    - "Tapping the row opens a dropdown listing all registered providers by label"
    - "'New sample set…' option in the dropdown lets the user name a new set"
    - "Two-slot assignment view: slot 0 (lo click) and slot 1 (hi click), each showing a scrollable list of pool clips"
    - "Tapping a clip assigns it to the slot; tapping outside or pressing Escape cancels assignment"
    - "On confirmation, calls onProviderChange(newProvider) so main.js can register and apply the provider"
    - "Module file at poc/ui/sample-set-picker.js"
    - "Picker dropdown dismisses on Escape or outside click"
  excludes:
    - "Creating or registering the MediaPoolSampleProvider instance — that is the responsibility of the onProviderChange callback in main.js"
    - "Saving the sample set to workspace YAML — owned by config/workspace"
    - "Any audio synthesis or decoding"
    - "Drag-and-drop slot assignment — spec says tap-to-assign only"
    - "Full ARIA/keyboard-nav beyond Escape key — deferred to app/"
interface: |
  // poc/ui/sample-set-picker.js

  // Subset of SampleProviderRegistry consumed by this component:
  interface RegistryRef {
    list(): SampleProvider[]
    get(id: string): SampleProvider | undefined
  }

  // Subset of MediaPool consumed by this component:
  interface PoolRef {
    clips: SampleClip[]
    getBuffer(bufferId: string): AudioBuffer | undefined
  }

  // Subset of TempoContext consumed by this component:
  interface TcRef {
    clickProviderRef: string
  }

  // Callback invoked when the user completes a new sample set or selects an existing provider.
  // newProvider is the fully constructed MediaPoolSampleProvider (for new sets) or null
  // if the user selected an existing provider by id. selectedId is always set.
  type ProviderChangeCallback = (selectedId: string, newProvider: SampleProvider | null) => void

  // Creates the Click Sound row UI inside `target`.
  // Renders a clickable label showing the active provider.
  // Returns a controller for external updates.
  function createSampleSetPicker(
    target: HTMLElement,
    registry: RegistryRef,
    pool: PoolRef,
    tc: TcRef,
    onProviderChange: ProviderChangeCallback
  ): SampleSetPickerController

  interface SampleSetPickerController {
    // Refreshes the displayed provider label from tc.clickProviderRef.
    update(): void

    // Disposes all event listeners.
    dispose(): void
  }
success_criteria:
  - "The rendered row shows the label of the provider identified by tc.clickProviderRef (e.g., 'Default (synthesised)' for 'built-in:default')"
  - "Tapping the row opens a dropdown listing all providers returned by registry.list()"
  - "Selecting an existing provider from the dropdown calls onProviderChange(provider.id, null) and closes the dropdown"
  - "Selecting 'New sample set…' opens a name-input prompt, then shows the two-slot assignment view"
  - "In the slot assignment view, tapping a pool clip assigns it to the current slot; the slot row updates to show the clip label"
  - "Pressing Escape during slot assignment cancels without changing tc.clickProviderRef"
  - "After both slots are assigned and the user confirms, onProviderChange is called with a new MediaPoolSampleProvider instance"
  - "update() refreshes the displayed label to match the current tc.clickProviderRef without reopening the dropdown"
failure_criteria:
  - "If tc.clickProviderRef names an unregistered provider, the row must display a fallback label (e.g., 'Unknown provider') rather than crashing"
  - "If the user cancels the 'New sample set…' name prompt, the UI returns to its previous state with no side effects"
  - "The slot assignment dropdown must show only clips from pool.clips — it must not show non-clip items or crash on an empty pool"
  - "Leaving a slot unassigned and confirming must not pass a malformed provider to onProviderChange — confirm button must be disabled until both slots are assigned"
dependencies:
  requires:
    - "config/sample-provider-registry"
    - "pool/media-pool"
    - "audio/media-pool-sample-provider"
    - "timing/tempo-context-additions"
  must_not_require:
    - "config/property-mapper"
    - "config/workspace"
    - "any visualizer"
    - "timing/metronome"
```
