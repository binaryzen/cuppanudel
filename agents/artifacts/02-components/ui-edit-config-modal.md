```yaml
id: ui/edit-config-modal
lane: lane-c
purpose: >
  Provides a singleton modal dialog containing a textarea pre-filled with a component's
  current YAML config. The user can edit, Apply (parse+validate+apply), Cancel, or Copy
  the textarea content. Errors from Apply are shown inline; the modal stays open until
  the user explicitly closes it or Apply succeeds.
scope:
  includes:
    - "createEditConfigModal() factory — creates the singleton DOM overlay (called once at app init)"
    - "open(component) — pre-fills textarea with component.exportConfig() serialised via jsyaml.dump(); shows the modal"
    - "Apply action: parse textarea content with jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA }), call component.importConfig(parsed), show error list on failure, close on success"
    - "Cancel action: discard edits, close modal"
    - "Copy action: write textarea content to clipboard via navigator.clipboard.writeText()"
    - "Keyboard: Escape = Cancel, Ctrl/Cmd+Enter = Apply"
    - "Modal is fixed-position, z-index 600"
    - "Textarea is monospace font, min 320×200 px, resizable"
    - "Singleton — only one modal instance exists; calling open() while already open replaces the current component"
    - "Module file at poc/ui/edit-config-modal.js"
  excludes:
    - "YAML syntax highlighting — deferred to app/"
    - "Full ARIA/focus-trap pattern beyond Escape/Enter keyboard bindings — deferred to app/"
    - "Context menu trigger — owned by ui/context-menu, which calls open()"
    - "Any audio or timing logic"
interface: |
  // poc/ui/edit-config-modal.js

  // Component interface (contract — not defined here):
  interface EditConfigComponent {
    exportConfig(): Record<string, unknown>
    importConfig(obj: Record<string, unknown>): string[]
  }

  // Creates (and appends to document.body) the singleton modal DOM element.
  // Must be called once during app initialisation before open() is called.
  // Returns the controller object.
  function createEditConfigModal(): EditConfigModal

  interface EditConfigModal {
    // Opens the modal, pre-filling the textarea with the component's current config YAML.
    // Calling open() while modal is already open replaces the current component without
    // closing/reopening — the textarea is refreshed, error list is cleared.
    open(component: EditConfigComponent): void

    // Closes the modal without applying changes.
    close(): void

    // True if the modal is currently visible.
    isOpen(): boolean
  }
success_criteria:
  - "createEditConfigModal() appends a hidden <div> overlay to document.body with z-index 600"
  - "open(component) makes the overlay visible and fills the textarea with jsyaml.dump(component.exportConfig())"
  - "Clicking Apply with unchanged valid YAML calls component.importConfig(parsed), importConfig returns [], modal closes"
  - "Clicking Apply with YAML that causes importConfig to return ['bpm: required field missing'] shows that error string inside the modal and modal remains open"
  - "Clicking Cancel closes the modal without calling component.importConfig()"
  - "Pressing Escape while modal is open closes the modal (same as Cancel)"
  - "Pressing Ctrl+Enter while modal is open triggers Apply"
  - "Pressing Cmd+Enter (macOS) while modal is open triggers Apply"
  - "Clicking Copy writes the textarea's current content to clipboard"
  - "isOpen() returns false before open(), true after open(), false after close()"
  - "open() called while already open replaces the component and refreshes the textarea content"
failure_criteria:
  - "If jsyaml.load throws on malformed textarea content, Apply must show the parse error message inline inside the modal and keep modal open — must not close or throw to global scope"
  - "If Apply succeeds (importConfig returns []), the modal must close — remaining open after a successful Apply constitutes a failure"
  - "If clipboard.writeText fails for Copy, the error must be surfaced as an inline notification — must not throw to global scope"
  - "z-index lower than 600 constitutes a failure (must appear above fullscreen panel z-index 100 and knob overlay z-index 500)"
  - "Two modal overlays visible simultaneously constitutes a failure — the factory must enforce singleton"
dependencies:
  requires:
    - "config/property-mapper"
  must_not_require:
    - "config/workspace"
    - "ui/context-menu"
    - "timing/metronome"
    - "any audio module"
    - "any visualizer"
```
