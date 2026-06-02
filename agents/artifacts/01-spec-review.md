# SpecReview — Cuppanudel New Feature Work
## Task 01-sa-spec-review

```yaml
scope:
  - specs/requirements.md §Planned Features (Alignment Monitor, File Import, Tempo Presets)
  - specs/workspace.md §1 Workspace
  - specs/workspace.md §2 Serialization — Property Mapper
  - specs/workspace.md §3 Component Context Menus
  - specs/workspace.md §4 SampleProvider
  - specs/workspace.md §5 TempoContext additions
  - specs/workspace.md §6 Sample Set Management
  - specs/content-service.md (full)
  - specs/ui-interaction-model.md (full)
  - specs/project-structure.md (full)

gaps:
  - location: "specs/workspace.md §1 Workspace — YAML schema"
    description: >
      The `global` section in the YAML schema includes `snapThreshold` (0.0–0.025), but
      `snapThreshold` is not a field in the `TempoContext` spec (§5) nor in the
      `requirements.md` TempoContext table. It is added to `tc` inline in `main.js`
      (`tc.snapThreshold = 0`) outside of `createTempoContext()`. There is no spec entry
      for which module owns `snapThreshold`, what its serialization schema entry looks like,
      or whether it belongs in `global` or `metronome`. The property-mapper schema
      descriptor for this field is absent.

  - location: "specs/workspace.md §1 Workspace — Import flow"
    description: >
      The import flow specifies a JSON fallback ("A .json file with the same schema is also
      accepted — step 1 branches on extension") but gives no detail on which JSON parsing
      path to use, how to detect JSON vs YAML when the MIME type is ambiguous, or whether
      JSON-embedded comments (none in JSON, but often in user-edited files) are handled. The
      property-mapper and error-reporting path are identical for both; only step 1 diverges.
      A single sentence spec is insufficient for implementors to handle edge cases (file with
      `.json` extension containing YAML, `.yaml` containing JSON, etc.).

  - location: "specs/workspace.md §1 Workspace — Export"
    description: >
      The "Copy workspace YAML" and "Export workspace" triggers are described as appearing
      in a "global toolbar or page context menu," but no such toolbar or page-level context
      menu element exists in the current `index.html` or is specced in `ui-interaction-model.md`.
      There is no spec for what DOM element(s) house the global toolbar, what triggers the
      page-level context menu (right-click on `<body>`? a dedicated button?), or where in the
      visual layout it lives. The implementor cannot determine the HTML structure needed.

  - location: "specs/workspace.md §6 Sample Set Management"
    description: >
      The sample-set UI sketch describes "assign media pool clips to slot 0 and slot 1 via
      the existing sample browser," but no interaction flow is specified for how the user
      selects a clip from the browser and assigns it to a numbered slot. There is no spec
      for the assignment gesture (drag? click to select then confirm? dedicated picker?),
      the visual state of an unassigned slot, or how the user saves/cancels the assignment.
      This is the primary UI surface for `MediaPoolSampleProvider` creation and cannot be
      implemented without this detail.

  - location: "specs/requirements.md §Planned Features — Alignment Monitor"
    description: >
      Three open questions are listed inline without resolution: (1) number of measures
      of history, (2) continuous draw vs freeze-on-downbeat, (3) RMS-smoothed vs raw
      amplitude. These are not cosmetic — they determine the ring-buffer size, the capture
      strategy, and the draw algorithm respectively. Calling them "open" in a spec handed to
      implementors creates guesswork. At minimum, a default decision for each should be
      specified, with the option marked as configurable later.

  - location: "specs/requirements.md §Planned Features — Alignment Monitor"
    description: >
      No module path is specified for the Alignment Monitor. Based on project structure it
      would be a new visualizer at `poc/visualizers/alignment-monitor.js`, but this is not
      stated. The spec also does not describe whether it is a new canvas element layered
      behind the existing beat grid canvas or a second canvas sharing the same DOM slot, nor
      which HTML element it attaches to or how the render loop in `main.js` wires it.

  - location: "specs/requirements.md §Planned Features — Tempo Presets"
    description: >
      The preset bank size is "8–16 slots suggested; exact count TBD." A range is not an
      implementable requirement. Constants like `MAX_PRESETS` belong in `constants.js`; the
      spec should commit to a value (or make it a named constant) before implementation.
      Without this, the sample browser slot grid layout, localStorage key structure, and
      preset-bank array initialization are all undefined.

  - location: "specs/requirements.md §Planned Features — Tempo Presets"
    description: >
      The spec says "metronome restarts from beat 0 at the new BPM" on recall, but does not
      specify whether recall during a running metronome is an implicit stop+restart or
      whether it smoothly transitions (e.g., completes the current measure). This affects
      user experience during live practice and must be decided before implementation.

  - location: "specs/workspace.md §2 Property Mapper"
    description: >
      The `exactLength` field descriptor is typed as `string` (name of another field) but
      no mechanism is described for how `validateAndApply` resolves that named field. It
      must look up the value in `source` (the raw YAML object), but the spec does not
      clarify: does it look up the field in `source` or `target`? What happens if the
      named field is itself missing or invalid at the time `exactLength` is checked? The
      order-dependency within the schema walk is unspecified.

  - location: "specs/workspace.md §4 SampleProvider — BuiltinClickProvider"
    description: >
      The `BuiltinClickProvider` spec defines the buffers' frequency, gain, and duration,
      but does not specify which module file it lives in. The registry lives at
      `config/sample-provider-registry.js`. The built-in provider could live in the same
      file, in `audio/builtin-click-provider.js`, or in a `config/` subdirectory. No path
      is specified, leaving the Staff Engineer to guess.

  - location: "specs/content-service.md §Built-In Providers — LocalFileProvider"
    description: >
      `LocalFileProvider.browse()` is specified to open a file picker and return
      `ContentItem` wrappers. However, `browse()` is also described as returning "a flat
      or nested list of ContentItems available from this source" (§Extension Points —
      Pagination). A picker-triggered browse does not return a persistent list — it is a
      one-shot modal. These two descriptions are incompatible. If `browse()` opens a picker,
      it cannot also serve as a "list currently available items" source for a sidebar that
      renders without user interaction. The content browser UI contract assumes the latter.

  - location: "specs/content-service.md §UI Contract"
    description: >
      The UI contract says "the user selects a provider; the browser calls `provider.browse()`
      and renders the returned items." For `LocalFileProvider` this immediately opens a file
      picker. It is not stated whether this is intentional (provider selection = picker
      trigger) or an oversight. If intentional, the sidebar/tab-strip model described does
      not apply to file-picker providers in the same way as enumerable providers
      (`RecordingsProvider`). No spec differentiates these two provider archetypes.

  - location: "specs/content-service.md §Open Questions"
    description: >
      The `ContentItem.metadata` loop-point question is unresolved ("If so, the media pool
      SampleClip schema needs loopStart/loopEnd frame fields — currently not present"). This
      is a schema gap that blocks implementing `LooperImportProvider` with any metadata
      awareness. For POC scope, a resolution ("not in POC, deferred to app/") would prevent
      the implementor from designing the interface ambiguously.

  - location: "specs/ui-interaction-model.md §Architectural Requirements"
    description: >
      The focusable-proxy pattern and full ARIA/keyboard-nav requirements are marked "for
      app/", but the context menu spec (`workspace.md §3`) requires keyboard nav (`Escape`
      key, `Ctrl/Cmd+Enter`) that applies to the POC now. There is no spec clarifying which
      accessibility requirements apply to the POC and which are deferred. The implementor
      will either under-build (no ARIA on new POC components) or over-build (full proxy
      pattern not yet warranted).

ambiguities:
  - location: "specs/workspace.md §1 Workspace — Import flow, step 5"
    description: >
      "Skip confirmation if imported values are identical to current state." This requires
      a deep equality check between the parsed YAML object and the current live state for
      all serialisable fields. The spec does not define what "identical" means for float
      arrays (exact bit equality? tolerance?), nor does it specify which comparison
      algorithm to use. Floating-point values stored in YAML (e.g., `0.33333`) vs those
      computed in JS may never be bitwise equal.
    question: >
      Should the identity check use strict equality (===) per scalar, or a tolerance-based
      comparison for floats? If tolerance-based, what is the epsilon?

  - location: "specs/workspace.md §3 Component Context Menus — Paste Config"
    description: >
      "Paste Config" reads from the clipboard. On mobile Safari and in non-secure contexts,
      `navigator.clipboard.readText()` either requires an explicit user permission prompt or
      is unavailable. The spec does not define a fallback for environments where clipboard
      read is blocked, nor does it say whether the "Paste Config" menu item should be
      greyed out or hidden when clipboard access is unavailable.
    question: >
      Should "Paste Config" be hidden/disabled if `navigator.clipboard.readText` is
      unavailable, or should it fall back to a manual text-entry dialog?

  - location: "specs/workspace.md §4 SampleProvider — registry initialization"
    description: >
      The registry spec says "`BuiltinClickProvider` is registered at startup." The metronome
      spec says the metronome holds a reference to the active provider "determined by
      `tc.clickProviderRef`" and is resolved "at metronome start (or provider-swap) time."
      But `main.js` creates the metronome before the AudioContext exists (the `tc` and
      `metroDisplay` are wired at module load; the metronome is created inside the Start
      button handler after AudioContext is available). The registry and `BuiltinClickProvider`
      need to be initialized before `AudioContext` exists (for registration), but `init(ctx)`
      on the provider needs `AudioContext`. The spec does not clarify when the registry is
      initialized, when `BuiltinClickProvider.init()` is called, and in what order relative
      to metronome creation.
    question: >
      Should the registry be a module-level singleton initialized at import time (sans
      AudioContext), with provider `init()` called lazily when the AudioContext is first
      available (inside the Start handler), or should registry initialization be deferred
      entirely until after Start?

  - location: "specs/workspace.md §1 Workspace + specs/requirements.md §Planned Features — Tempo Presets"
    description: >
      The workspace YAML schema includes a `presets` top-level key. The Tempo Presets
      planned feature says presets persist to `localStorage`. The workspace spec says
      workspace export "writes all sections explicitly, including presets." It is unclear
      whether presets are serialized in the workspace YAML (making them portable) OR stored
      only in `localStorage` (making them device-local), OR both (dual-write, which risks
      divergence). The spec presents both as true simultaneously without resolving the
      authority question: if the workspace YAML has different presets than `localStorage`,
      which wins on import?
    question: >
      Are presets canonical in the workspace YAML (with localStorage as a cache) or
      canonical in localStorage (with workspace YAML as an export snapshot)? If both,
      which authority wins on workspace import?

  - location: "specs/workspace.md §2 Property Mapper — `validateAndApply` return contract"
    description: >
      The spec states "if valid (or clamped): write `target[key] = <value or clamped value>`"
      and "if errors are returned, state must not be partially modified." But the function
      signature `validateAndApply(schema, source, target)` writes to `target` in-place as
      it walks the schema. To satisfy the no-partial-write requirement, the implementation
      must buffer all successful writes and apply them only after the full walk completes
      with no errors. The spec does not describe this buffering strategy, leaving implementors
      to discover the invariant from the component contract rather than the function spec.
    question: >
      Should `validateAndApply` buffer writes internally (collect all validated values, then
      apply atomically) or should the caller be responsible for passing a scratch object as
      `target` and merging into real state only on success?

  - location: "specs/content-service.md §ContentProvider — browse() return shape"
    description: >
      The extension points section says `browse()` may return either `ContentItem[]` (flat)
      or `{ items, nextPage }` (paginated). The main interface definition says
      `browse(): Promise<ContentItem[]>`. These are inconsistent return types. If the UI
      must handle both, the interface type union must be specified in the interface
      definition, not buried in a later extension-points section.
    question: >
      Should `browse()` always return `ContentItem[]` for POC (no pagination), with
      pagination added to the interface definition when needed for app/, or should the
      interface already accommodate both shapes via a union type?

risks:
  - type: functional
    description: >
      The metronome's `playClick()` function synthesizes noise and oscillator nodes on
      every beat, allocating new AudioBuffer and OscillatorNode objects at scheduling time.
      The SampleProvider refactor replaces this with `getSample()` returning pre-decoded
      AudioBuffers. If `init()` on `BuiltinClickProvider` is not called (or fails) before
      the metronome starts, `getSample()` will return null and every beat will be silent.
      The spec requires `getSample()` to be synchronous after `init()` resolves, but does
      not specify what the metronome should do if it is asked to start before `init()`
      completes (e.g., if the user clicks Start and immediately clicks the metro Play).
    mitigation: >
      Specify that metronome.start() must await provider.init() and that the Start button
      handler in main.js calls BuiltinClickProvider.init(ctx) before enabling the metro
      Play button. Add a guard in the scheduler: if getSample() returns null for the
      built-in provider (indicating init() has not resolved), log an error and return rather
      than silently skipping the beat.

  - type: functional
    description: >
      `importConfig()` must be idempotent — no partial writes if errors are returned. The
      `validateAndApply` function writes to `target` as it walks schema fields. If the spec
      is interpreted naively (write on validation success per field), a schema with a valid
      first half and an invalid second half will partially mutate `tc` before returning
      errors. This would leave the metronome in an inconsistent state (e.g., `bpm` changed
      but `beatOffsets` length mismatched).
    mitigation: >
      Clarify in the property-mapper spec that `validateAndApply` must collect all
      validated key/value pairs first, then write them to `target` only if the error array
      is empty. Alternatively, spec that callers pass a scratch object as `target` and merge
      themselves. Either approach is acceptable; the choice must be explicit.

  - type: functional
    description: >
      The `MediaPoolSampleProvider.getSample()` uses `slots.find(s => s.index === index)`
      which returns `undefined` if no slot matches, then accesses `.clipId` on undefined —
      a runtime TypeError. The spec has a typo: `const slot = slots.find(...); return slot ?
      pool.getBuffer(slot.clipId) : null;` is shown correctly, but the surrounding prose
      says "returns the AudioBuffer for the clip at the given slot index" without noting the
      null-vs-undefined distinction. If `pool.getBuffer()` receives `undefined` as a key it
      will return `undefined`, not `null`, which the metronome's `if (buf && ...)` guard
      handles, but inconsistent null/undefined returns across providers is a latent bug.
    mitigation: >
      Specify in the SampleProvider interface that `getSample()` returns `AudioBuffer | null`
      (never `undefined`). Add a coercion note: providers must normalize missing lookups to
      `null` explicitly. Test: `getSample(-1)` and `getSample(999)` must return `null`, not
      `undefined`.

  - type: functional
    description: >
      The `getPlayheadPosition()` in `metronome.js` computes elapsed time relative to
      `playbackStart`, but `playbackStart` is set at the moment `start()` is called, and
      the measure-start offset tracking is done via `measureStart`. The formula `((elapsed
      % dur) + dur) % dur / dur` uses `playbackStart`, not `measureStart`, which means the
      returned position drifts from the actual beat-grid position as tempo changes cause
      `measureStart` to advance non-linearly. This is a pre-existing issue, but the
      Alignment Monitor feature (which relies on `getPlayheadPosition()` for ring-buffer
      scroll) amplifies it: visual misalignment between the scrolling waveform and the beat
      markers would appear whenever `beatsPerMeasure` or `bpm` changes mid-session.
    mitigation: >
      Spec the Alignment Monitor to derive its scroll position from `measureStart` and
      `nextBeatTime` (same variables the scheduler uses) rather than from
      `getPlayheadPosition()`. Alternatively, refactor `getPlayheadPosition()` to use
      `measureStart` as the modulo base, and test that position remains correct after
      a mid-session BPM change.

  - type: maintainability
    description: >
      `main.js` currently wires all modules inline with module-scoped let/const variables.
      Adding SampleProviderRegistry, ContentService, workspace import/export, context menus,
      preset bank, and Alignment Monitor to the same file will make it unmanageable.
      The spec does not define where session-level wiring for new modules goes, or whether
      `main.js` is refactored into sub-wirers. The "no formal session context" note in
      requirements.md is appropriate for the current POC but does not scale to the new
      feature scope.
    mitigation: >
      Add a spec note (or task) that `main.js` should be decomposed into at least a wiring
      module per panel (metro panel wiring, sample browser wiring, global/workspace wiring)
      before implementing more than one new planned feature. This is a maintainability
      pre-condition, not a hard blocker, but should be scoped as early work.

  - type: security
    description: >
      `jsyaml.load()` (the default parse mode) executes JavaScript when the YAML contains
      `!!js/function` or similar type tags, which is a known YAML deserialization attack
      vector. The spec says to use `jsyaml.load()` without specifying safe-load mode. A
      user who is tricked into importing a malicious workspace YAML file could trigger
      arbitrary code execution in the browser tab (same origin as the app).
    mitigation: >
      Replace `jsyaml.load()` with `jsyaml.safeLoad()` (or pass `{ schema: jsyaml.CORE_SCHEMA }`
      in newer js-yaml versions that deprecated `safeLoad`). Document this as a required
      constraint in the workspace serialization spec. The property-mapper validation layer
      does not protect against this because the attack occurs at parse time, before
      validation.

  - type: security
    description: >
      The drag-and-drop workspace import listens on the entire `document` for drop events
      and treats any `.yaml`/`.yml` file as a workspace import attempt. There is no
      rate-limiting, no file size check, and no check that the drop originated from user
      intent (as opposed to a page embedded in an iframe receiving a drop event from an
      outer frame). A very large YAML file could cause a long synchronous parse on the main
      thread, freezing the audio scheduler.
    mitigation: >
      Add a file size cap (e.g., 1 MB) before calling `FileReader.readAsText`. If the file
      exceeds the cap, show an error toast and stop. Specify this limit in the workspace
      import spec. The 1 MB cap is generous for a config-only YAML file (typical workspace
      YAML will be under 10 KB) and prevents trivial DoS.

  - type: maintainability
    description: >
      The `SampleProviderRegistry` is specified as a module-level singleton. ES modules
      are cached by the runtime, so the singleton is effectively global for the page lifetime.
      This makes unit-testing the registry and providers that depend on it difficult: tests
      that register a provider in one test case will see it in all subsequent cases unless
      the module cache is busted between tests. The spec gives no guidance on how to reset
      or mock the registry in tests.
    mitigation: >
      Expose a `reset()` or `clear()` method on the registry for use in test teardown only
      (do not expose it in the production API surface). Document in the spec that the
      registry is not intended to be cleared in production — only in tests. Alternatively,
      accept a registry instance as a parameter to modules that consume it
      (dependency-injection style), which also aids testability.

verdict: needs-revision
```
