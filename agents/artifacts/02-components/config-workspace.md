```yaml
id: config/workspace
lane: lane-c
purpose: >
  Orchestrates workspace-level export and import. It owns the top-level YAML schema
  structure, drives serialization by delegating to component exportConfig/importConfig
  methods, handles file-drop import with size-gating and YAML/JSON parsing, and provides
  the Export and Copy YAML actions triggered from the page header.
scope:
  includes:
    - "exportWorkspace(components) — calls each component's exportConfig(), assembles the full YAML object, returns jsyaml.dump() string"
    - "importWorkspace(text, filename, components) — size check (caller passes file.size), parse (YAML or JSON by filename extension), validate via validateAndApply per section, show confirmation if values differ, call importConfig in dependency order"
    - "Deep equality helper used only internally: strict === for scalar, |a-b|<1e-6 for float, recursive for arrays"
    - "Document-level dragover/drop listener registration (attach/detach)"
    - "Error toast helper (renders a transient DOM element with the error message)"
    - "Confirmation dialog helper (returns a Promise<boolean>)"
    - "Import dependency order: sampleSets → global → metronome → presets"
    - "File size cap: 1 MB (1_048_576 bytes); reject with error toast if exceeded"
    - "YAML parsed with jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA }); JSON with JSON.parse()"
    - "Unknown top-level sections are silently ignored; missing sections leave current state untouched"
    - "Module file at poc/config/workspace.js"
  excludes:
    - "jsyaml library itself — vendored at poc/lib/js-yaml.min.js, loaded as a plain script"
    - "Property-level validation — delegated to validateAndApply in config/property-mapper"
    - "Per-component exportConfig/importConfig implementations — owned by each component"
    - "Context menu UI — owned by ui/context-menu"
    - "Preset bank UI or preset localStorage I/O — owned by config/preset-store"
    - "SampleProvider registration during import — driven by sampleSets importConfig"
interface: |
  // poc/config/workspace.js

  // Workspace component interface (contract for components that participate):
  interface WorkspaceComponent {
    exportConfig(): Record<string, unknown>
    importConfig(slice: Record<string, unknown>): string[]
  }

  // Components map shape: key = workspace section name, value = component instance.
  interface WorkspaceComponents {
    global: WorkspaceComponent         // owns visualDelayMs, snapThreshold
    metronome: WorkspaceComponent      // owns bpm, beatsPerMeasure, beatOffsets, beatVolumes, beatAccents, clickProviderRef
    sampleSets: WorkspaceComponent     // owns sampleSets array
    presets: WorkspaceComponent        // owns presets array
  }

  // Assembles and serialises the full workspace to a YAML string.
  // Always writes all sections explicitly (including empty sampleSets: [] and presets: []).
  // Adds version: 1 at the top level.
  function exportWorkspace(components: WorkspaceComponents): string

  // Triggers a browser file download of the workspace as 'workspace.yaml'.
  function downloadWorkspace(components: WorkspaceComponents): void

  // Writes the workspace YAML string to the clipboard via navigator.clipboard.writeText.
  // Returns a Promise that rejects if clipboard write fails.
  function copyWorkspace(components: WorkspaceComponents): Promise<void>

  // Parses and applies a workspace from text.
  // filename: used only to determine parse mode (.json → JSON.parse, else → jsyaml).
  // fileSize: checked against 1 MB cap; if exceeded, shows error toast and resolves false.
  // Returns true if workspace was applied, false if cancelled, rejected on hard error.
  // Shows confirmation dialog if any imported value differs from current state.
  // Calls component.importConfig() in dependency order on Apply.
  async function importWorkspace(
    text: string,
    filename: string,
    fileSize: number,
    components: WorkspaceComponents
  ): Promise<boolean>

  // Registers document-level dragover + drop listeners that call importWorkspace
  // on any dropped .yaml, .yml, or .json file.
  // Returns an unregister function (removes the listeners).
  function registerDropTarget(components: WorkspaceComponents): () => void
success_criteria:
  - "exportWorkspace(components) returns a YAML string that when parsed with jsyaml.load contains keys: version, global, metronome, sampleSets, presets"
  - "exportWorkspace(components) always includes sampleSets: [] when sampleSets.exportConfig() returns an empty array"
  - "importWorkspace called with a 1_048_577-byte file shows an error toast with text 'File too large for a workspace config' and returns false without parsing"
  - "importWorkspace called with a valid YAML string containing only a metronome section calls metronome.importConfig() and does not call global.importConfig() or sampleSets.importConfig()"
  - "importWorkspace applies sections in order: sampleSets before global before metronome before presets"
  - "importWorkspace called with a .json filename uses JSON.parse instead of jsyaml.load"
  - "If validateAndApply returns errors for the metronome section, importWorkspace shows an error panel listing each error string and returns false without calling any importConfig"
  - "If all imported values equal current state (deep equality), importWorkspace applies without showing a confirmation dialog and returns true"
  - "If any imported value differs, importWorkspace shows a confirmation dialog; Cancel returns false without calling importConfig"
  - "Unknown top-level YAML keys are ignored; no error is shown"
  - "A version field that is not 1 logs a console.warn but import proceeds"
failure_criteria:
  - "If jsyaml.load throws (malformed YAML), importWorkspace shows an error toast with the parser's message and returns false — must not rethrow to the document drop handler"
  - "If JSON.parse throws (malformed JSON), same error-toast behaviour"
  - "If a .yaml file contains valid JSON, importWorkspace treats it as a user error and attempts YAML parse, which will succeed on valid JSON (JSON is valid YAML); this is not a failure case"
  - "If a .json file contains valid YAML that is not valid JSON, JSON.parse will throw — show error toast; do not attempt YAML fallback parse"
  - "downloadWorkspace must use URL.createObjectURL + a temporary <a> click — calling document.write or opening a new window constitutes a failure"
  - "copyWorkspace must use navigator.clipboard.writeText — using document.execCommand('copy') constitutes a failure"
dependencies:
  requires:
    - "config/property-mapper"
    - "timing/tempo-context-additions"
  must_not_require:
    - "timing/metronome"
    - "audio/builtin-click-provider"
    - "ui/context-menu"
    - "ui/edit-config-modal"
    - "config/preset-store"
```
