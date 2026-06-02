```yaml
id: poc/main.js-refactor
lane: lane-wire
purpose: >
  Wires all new modules into the session by importing them, calling init sequences in the
  correct order, and connecting new UI elements to their event handlers. Also decomposes
  the existing monolithic main.js into per-panel wiring blocks (metro, sample-browser,
  global) as a maintainability pre-condition before adding new wiring. This is the final
  integration step; no new feature logic lives here.
scope:
  includes:
    - "Import of all new modules: config/sample-provider-registry, audio/builtin-click-provider, timing/metronome-refactor (updated createMetronome), timing/tempo-context-additions (updated createTempoContext/setBeatsPerMeasure)"
    - "Import of config/content-service, audio/local-file-provider, audio/recordings-provider"
    - "Import of config/workspace, ui/context-menu, ui/edit-config-modal"
    - "Import of config/preset-store, ui/preset-bank"
    - "Import of visualizers/alignment-monitor"
    - "Import of audio/media-pool-sample-provider, ui/sample-set-picker"
    - "Decomposition of inline wiring into named init functions: initMetroPanel(), initSampleBrowser(), initGlobalWorkspace()"
    - "Start button handler: calls builtinClickProvider.init(ctx) before metronome.start() is enabled; gates metro Play button on init() resolution"
    - "ContentService registration: register localFileProvider and createRecordingsProvider(pool) after pool is created"
    - "Context menu: createContextMenu() called on each .panel-header element with its component and the edit modal opener"
    - "Edit config modal: createEditConfigModal() called once; reference passed to context menu factory"
    - "Preset bank: createPresetBank() called with container, store, tc, and metronome reference"
    - "Alignment monitor: createAlignmentMonitor() called with analyserNode, canvas, tc, and getMetronomeState() accessor"
    - "Alignment monitor draw() added to RAF loop"
    - "Import file button click: calls localFileProvider.browse() → import() → pool.addBuffer() → renderPool()"
    - "Audio file drag-and-drop onto sample-browser-panel: reads file → decodes → pool.addBuffer() → renderPool()"
    - "Export Workspace button: calls downloadWorkspace(components)"
    - "Copy YAML button: calls copyWorkspace(components)"
    - "Document drop target: registerDropTarget(components) called after page load"
    - "Sample set picker: createSampleSetPicker() wired to metro panel; onProviderChange registers provider and updates tc.clickProviderRef"
    - "Module file: poc/main.js (in-place modification)"
  excludes:
    - "New feature logic — all logic lives in the imported modules"
    - "New HTML elements — all DOM additions are in lane-specific index.html changes"
    - "jsyaml vendoring — a manual step (copy file to poc/lib/); not wired in main.js"
    - "Any audio synthesis, visualization algorithms, or serialization logic"
interface: |
  // poc/main.js (no exported API — this is the top-level entry point)

  // Internal structure (after decomposition):

  // initMetroPanel(): void
  //   - creates TempoContext (with new fields), MetroDisplay, Knobs, SampleSetPicker,
  //     PresetBank; attaches panel-header context menu

  // initSampleBrowser(): void
  //   - registers ContentProviders; wires import-file-btn, drag-and-drop on
  //     sample-browser-panel; calls renderPool() after any import

  // initGlobalWorkspace(ctx): void
  //   - registers drop target; wires Export and Copy buttons; creates EditConfigModal

  // Start button handler (async):
  //   1. createInputProvider() → { context, source }
  //   2. createAnalyzer, createRecorder, createWaveformVisualizer, createPeakMeter, createTunerDisplay
  //   3. await builtinClickProvider.init(ctx)
  //   4. createMetronome(context, tc, builtinClickProvider)
  //   5. createAlignmentMonitor(analyserNode, alignCanvas, tc, getMetronomeState)
  //   6. initGlobalWorkspace(ctx)
  //   7. Enable metro Play button
  //   8. startRenderLoop()

  // getMetronomeState(): MetronomeState
  //   - returns { measureStart, nextBeatTime, isRunning, beatsPerMeasure }
  //   - references internal metronome state; returns safe defaults when metronome is null

  // RAF loop (startRenderLoop):
  //   waveform.draw(), peakMeter.draw(ts), tuner.draw(),
  //   metroDisplay.draw(playhead), alignmentMonitor?.draw()
success_criteria:
  - "After Start button click, builtinClickProvider.init(ctx) is called with the newly created AudioContext before metronome.start() is enabled"
  - "After Start button click, createMetronome is called with (context, tc, builtinClickProvider) — not the old 2-argument form"
  - "Metro Play button is disabled until builtinClickProvider.init() resolves"
  - "Clicking 'Import File' calls localFileProvider.browse() and adds the decoded buffer to pool, then calls renderPool()"
  - "Dropping a .wav file onto the sample browser panel decodes it via AudioContext.decodeAudioData and calls pool.addBuffer()"
  - "Clicking 'Export Workspace' triggers a file download named 'workspace.yaml'"
  - "Clicking 'Copy YAML' writes workspace YAML to clipboard"
  - "Dropping a .yaml file on the document body triggers importWorkspace; on Apply, tc fields are updated"
  - "createEditConfigModal() is called exactly once; the returned controller is passed to each context menu"
  - "Alignment monitor draw() is called in the RAF loop after audio init"
  - "PresetBank recall updates tc fields and calls metronome.restart() if metronome is running"
failure_criteria:
  - "If builtinClickProvider.init(ctx) rejects, the Start button must show the error message and re-enable — must not leave the app in a broken state"
  - "Calling createMetronome without a clickProvider argument (using the old 2-arg form) constitutes a wiring failure"
  - "If alignment monitor canvas id is wrong, createAlignmentMonitor must not be called with a null canvas — add a guard with a console.error"
  - "Registering the same ContentProvider twice must be caught (registry throws) — main.js must not call register() inside the RAF loop or in a code path that executes more than once"
dependencies:
  requires:
    - "test-runner"
    - "config/property-mapper"
    - "config/sample-provider-registry"
    - "audio/builtin-click-provider"
    - "timing/metronome-refactor"
    - "timing/tempo-context-additions"
    - "config/workspace"
    - "ui/context-menu"
    - "ui/edit-config-modal"
    - "config/content-service"
    - "audio/local-file-provider"
    - "audio/recordings-provider"
    - "audio/media-pool-sample-provider"
    - "ui/sample-set-picker"
    - "config/preset-store"
    - "ui/preset-bank"
    - "visualizers/alignment-monitor"
    - "index-html-global-toolbar"
    - "index-html-file-import-ui"
    - "index-html-preset-bank-dom"
    - "index-html-alignment-monitor-dom"
  must_not_require:
    - "any module not yet created (no forward references)"
```
