# LaneMap — Cuppanudel New Feature Work
## Task 01-sa-spec-review

### Dependency Analysis Notes

The following data-dependency rules govern lane ordering:

1. **`config/property-mapper.js`** has no dependencies on any other new module. It is
   a pure utility used by every serializing component. It must be complete before any
   component that calls `validateAndApply` or `serialize` can be implemented.

2. **`config/sample-provider-registry.js`** and **`BuiltinClickProvider`** must exist
   before the metronome can be refactored to use `SampleProvider`. The registry depends
   on the `SampleProvider` interface contract being defined (which is a spec artifact,
   not a code artifact — no implementation dependency).

3. **Test infrastructure** (a minimal in-browser test runner) must exist before any
   unit tests can be written. It has no code-level dependency on new features but must
   precede all testing lanes.

4. **Metronome refactor** (`SampleProvider` integration) depends on the registry and
   `BuiltinClickProvider` being implemented and initialized correctly.

5. **Workspace serialization** (`config/workspace.js`) depends on `property-mapper.js`
   and on all component `exportConfig`/`importConfig` methods being defined (which in
   turn depend on the property-mapper).

6. **Context menus** depend on the workspace serialization infrastructure (`jsyaml`
   available, `exportConfig`/`importConfig` methods defined on components).

7. **Tempo Presets** depends on `TempoContext` additions (`clickProviderRef`,
   `beatAccents` formal field) and on `localStorage` serialization (which reuses the
   property-mapper). It also needs a preset UI slot in `index.html`.

8. **Alignment Monitor** has no dependency on any of the above — it reads the shared
   waveform `AnalyserNode` and `tc` (existing objects). It can be implemented in
   parallel with everything else after test infrastructure is in place.

9. **File Import / ContentService** depends on `BufferTable` (existing, stable) and
   `createMediaPool()` (existing). It does not depend on `SampleProvider` or the
   workspace infrastructure. It can proceed in parallel with those lanes.

10. **`MediaPoolSampleProvider`** depends on both the `SampleProvider` interface (lane B)
    and the `ContentService` / file-import flow (lane D), because its `getSample()`
    uses `pool.getBuffer()` which is stable today, but the sample-set assignment UI
    depends on the content browser being in place to populate the pool with imported
    clips. Implementation of the class itself can proceed earlier; the UI wiring waits
    for lane D.

11. **`main.js` wiring** for all new modules is the final integration step. It depends
    on every feature lane being individually complete.

```yaml
lanes:
  - id: lane-infra
    label: "Test Infrastructure"
    components:
      - test-runner          # minimal in-browser test harness (no external framework)
                             # entry point: poc/test/runner.js or similar
    depends_on: []
    can_parallelize: false
    notes: >
      Must be the first lane to complete. All subsequent lanes depend on it for unit
      testing. A minimal harness (assert functions + pass/fail reporting in the browser
      console or a dedicated test page) is sufficient; no DOM runner needed.

  - id: lane-a
    label: "Property Mapper"
    components:
      - config/property-mapper.js    # validateAndApply, serialize
    depends_on: [lane-infra]
    can_parallelize: false
    notes: >
      Pure utility; no Web Audio or DOM dependency. Can be fully unit-tested in isolation.
      Must be complete before any component-level serialization work begins.

  - id: lane-b
    label: "SampleProvider Infrastructure"
    components:
      - config/sample-provider-registry.js    # module-level singleton registry
      - audio/builtin-click-provider.js       # BuiltinClickProvider (synthesises 2 buffers)
      - timing/metronome.js (refactor)        # replace playClick() with getSample() calls
      - timing/tempo-context.js (additions)  # add clickProviderRef field
    depends_on: [lane-infra]
    can_parallelize: false
    notes: >
      These four pieces form a dependency chain within the lane:
        1. Define SampleProvider interface (no code — spec contract).
        2. Implement registry (no AudioContext dependency at module init).
        3. Implement BuiltinClickProvider (needs AudioContext only in init()).
        4. Refactor metronome to call getSample() instead of playClick().
      The registry and built-in provider must be tested before the metronome refactor
      lands, because a broken provider silences all metronome output.

  - id: lane-c
    label: "Workspace Serialization & Context Menus"
    components:
      - config/workspace.js                  # exportWorkspace(), importWorkspace()
      - ui/context-menu.js                   # dropdown, dismiss logic
      - ui/edit-config-modal.js              # textarea modal, Apply/Cancel/Copy
      - index.html (global toolbar DOM)      # Export / Copy Workspace trigger elements
    depends_on: [lane-a, lane-b]
    can_parallelize: true
    notes: >
      Depends on lane-a (property-mapper) for validateAndApply and serialize.
      Depends on lane-b because the metronome's exportConfig/importConfig must reference
      clickProviderRef, which is added in lane-b.
      Within this lane, the context-menu UI (ui/context-menu.js, ui/edit-config-modal.js)
      can be implemented in parallel with the workspace serialization logic
      (config/workspace.js), because neither calls the other directly — the glue is in
      main.js (lane-wire).
      js-yaml must be vendored at poc/lib/js-yaml.min.js and loaded in index.html before
      this lane can be integration-tested, but it does not block unit tests of the
      property-mapper or workspace module.

  - id: lane-d
    label: "File Import / Content Service"
    components:
      - config/content-service.js           # ContentService registry
      - audio/local-file-provider.js        # LocalFileProvider (file picker + decodeAudioData)
      - audio/recordings-provider.js        # RecordingsProvider (wraps existing pool)
      - pool/media-pool.js (minor)          # add getBuffer() public alias if not already named
      - index.html (file import UI)         # <input type="file"> or drop target wiring
    depends_on: [lane-infra]
    can_parallelize: true
    notes: >
      No dependency on lane-a or lane-b. The pool is already stable. ContentService is
      a new registry (similar in shape to SampleProviderRegistry but independent).
      LocalFileProvider and RecordingsProvider can be developed in parallel within the
      lane.
      LooperImportProvider is a thin wrapper over LocalFileProvider and can be deferred
      or treated as a follow-on task within this lane.
      Drag-and-drop onto the sample browser panel (desktop) and <input type="file"> (mobile)
      are both wired in index.html / main.js as part of this lane's integration step.

  - id: lane-e
    label: "MediaPoolSampleProvider"
    components:
      - audio/media-pool-sample-provider.js  # getSample() backed by pool clips
      - ui/sample-set-picker.js              # "Click Sound" row + provider picker UI
      - poc/visualizers/ (no change)         # no new visualizer needed
    depends_on: [lane-b, lane-d]
    can_parallelize: false
    notes: >
      Depends on lane-b (SampleProvider interface and registry must exist to register
      MediaPoolSampleProvider instances).
      Depends on lane-d because the sample-set assignment UI relies on clips being
      importable into the pool (file import closes the loop for loop files).
      The MediaPoolSampleProvider class itself (audio/media-pool-sample-provider.js) can
      be coded and unit-tested as soon as lane-b defines the interface — the UI wiring
      waits for lane-d.

  - id: lane-f
    label: "Tempo Presets"
    components:
      - config/preset-store.js              # localStorage read/write, named slots
      - ui/preset-bank.js                   # slot grid UI, save/recall controls
      - index.html (preset bank DOM)        # slot grid container in metro panel
    depends_on: [lane-a, lane-b]
    can_parallelize: true
    notes: >
      Depends on lane-a (property-mapper) for serializing/deserializing the TempoContext
      snapshot per preset.
      Depends on lane-b because presets store clickProviderRef, which is added to
      TempoContext in lane-b.
      localStorage I/O (config/preset-store.js) and the slot grid UI (ui/preset-bank.js)
      can be developed in parallel within the lane.
      Must degrade gracefully if localStorage is unavailable (private browsing on iOS):
      show empty slots, disable Save, allow Recall of in-memory presets only.
      Preset bank size must be resolved as a constant (MAX_PRESETS in constants.js) before
      implementation begins — see SpecReview gap.

  - id: lane-g
    label: "Alignment Monitor"
    components:
      - visualizers/alignment-monitor.js    # ring-buffer waveform canvas, scroll by playhead
      - index.html (alignment monitor DOM)  # new canvas element behind beat grid
    depends_on: [lane-infra]
    can_parallelize: false
    notes: >
      No dependency on any other new feature lane. Reads only the shared waveform
      AnalyserNode (existing) and tc (existing). Can be developed and tested entirely
      independently.
      Three open questions from the spec (measure count, continuous vs freeze-on-downbeat,
      RMS vs raw) must be resolved as defaults before implementation begins — see SpecReview
      gap. Suggested defaults: 2 measures, continuous draw, raw amplitude.
      The canvas must be layered behind the beat-grid canvas in the DOM so beat-grid
      handles and grid lines remain on top.

  - id: lane-wire
    label: "Integration Wiring (main.js)"
    components:
      - poc/main.js (refactor + additions)  # wire all new modules into the session
      - poc/index.html (final assembly)     # ensure all new DOM elements are present
    depends_on: [lane-b, lane-c, lane-d, lane-e, lane-f, lane-g]
    can_parallelize: false
    notes: >
      This lane is the final integration step. It cannot begin until all feature lanes
      are individually tested and approved. Its sole responsibility is wiring: importing
      new modules, calling init() sequences in the correct order, and connecting new UI
      elements to their handlers.
      main.js refactoring (decomposition into per-panel wiring modules) should be treated
      as a pre-condition task within this lane before new wiring is added.

critical_path:
  - lane-infra       # test runner must exist first
  - lane-a           # property-mapper: no downstream lane can serialize without it
  - lane-b           # SampleProvider: metronome refactor; prerequisite for lane-c, lane-e, lane-f
  - lane-c           # workspace serialization + context menus: longest chain post lane-b
  - lane-wire        # final integration: waits for all lanes

# Rationale for critical path:
# lane-infra → lane-a → lane-b → lane-c → lane-wire is the longest dependency chain.
# lane-d (file import) and lane-g (alignment monitor) can run in parallel starting from
# lane-infra without blocking the critical path.
# lane-e (MediaPoolSampleProvider) blocks on both lane-b and lane-d; its completion is
# required before lane-wire but it is not on the critical path because lane-c also
# blocks lane-wire and lane-c's chain is longer.
# lane-f (Tempo Presets) blocks on lane-a and lane-b; not on critical path for same reason.
```
