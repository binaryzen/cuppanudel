```yaml
id: ui/context-menu
lane: lane-c
purpose: >
  Renders a lightweight native-style dropdown menu at the pointer position when triggered
  by right-click (desktop) or long-press (mobile) on a panel header. Provides Copy Config,
  Paste Config, and Edit Config items that delegate to the host component's exportConfig
  and importConfig methods. Dismisses on outside click, Escape, and item selection.
scope:
  includes:
    - "createContextMenu(target, component, openModal) factory — attaches right-click and long-press listeners to target element"
    - "Dropdown <div> positioned at pointer/touch coordinates, clamped to viewport with 8 px margins"
    - "Copy Config item: calls component.exportConfig(), serialises to YAML via jsyaml.dump(), writes to clipboard"
    - "Paste Config item: reads clipboard via navigator.clipboard.readText(), parses YAML, validates via component.importConfig(), shows inline error banner if invalid"
    - "Paste Config item: hidden (not greyed out) if navigator.clipboard.readText is unavailable or throws NotAllowedError"
    - "Edit Config item: calls openModal(component) to open the Edit Config modal (ui/edit-config-modal)"
    - "Long-press detection: pointerdown → 600 ms timer → open; cancel if movement > 20 px or pointerup fires first"
    - "Dismiss logic: click/tap outside the menu, Escape keydown, or item selection"
    - "Module file at poc/ui/context-menu.js"
  excludes:
    - "Edit Config modal implementation — owned by ui/edit-config-modal"
    - "YAML serialization/deserialization beyond the one-liner jsyaml.dump/load calls in Copy/Paste"
    - "Property-level validation — delegated to component.importConfig()"
    - "Any audio or timing logic"
    - "Full ARIA/focusable-proxy pattern — deferred to app/"
    - "Touch drag-start suppression beyond the 20 px hasMoved guard"
interface: |
  // poc/ui/context-menu.js

  // Component interface (contract — not defined here):
  interface ContextMenuComponent {
    exportConfig(): Record<string, unknown>
    importConfig(obj: Record<string, unknown>): string[]
  }

  // Attaches context menu trigger listeners (right-click + long-press) to `target`.
  // `openModal` is called with `component` when the user selects "Edit Config...".
  // Returns a dispose function that removes all attached listeners.
  function createContextMenu(
    target: HTMLElement,
    component: ContextMenuComponent,
    openModal: (component: ContextMenuComponent) => void
  ): { dispose(): void }

  // (internal) — shows the dropdown menu at (x, y), clamped to viewport.
  // Not exported; used only by the event handlers.
  // function showMenu(x: number, y: number): void

  // (internal) — hides the current menu if visible.
  // function hideMenu(): void
success_criteria:
  - "Right-clicking the target element opens a dropdown with exactly three items: 'Copy Config', 'Paste Config' (if clipboard available), 'Edit Config...'"
  - "Clicking 'Copy Config' calls component.exportConfig(), converts to YAML, writes to clipboard, then closes the menu"
  - "Clicking 'Edit Config...' calls openModal(component) and closes the menu"
  - "Pressing Escape while the menu is open closes the menu without triggering any action"
  - "Clicking outside the open menu closes it"
  - "A pointerdown held for 600 ms with < 20 px movement on a touch device opens the menu at the touch position"
  - "A pointerdown followed by > 20 px movement before 600 ms does NOT open the menu"
  - "dispose() removes all event listeners — a subsequent right-click on the target does not open a menu"
  - "When navigator.clipboard.readText is not available (undefined), the Paste Config item is absent from the rendered menu"
  - "When Paste Config is clicked and importConfig returns ['bpm: required field missing'], an inline error banner showing 'bpm: required field missing' appears inside the menu or immediately adjacent to it without closing the menu"
  - "When Paste Config is clicked and importConfig returns [], the menu closes with no error"
  - "The dropdown div is clamped so no edge is closer than 8 px to a viewport boundary"
failure_criteria:
  - "If navigator.clipboard.readText throws NotAllowedError, the error must be caught silently — no unhandled rejection, no visible error to the user; the Paste Config item should be hidden retroactively or the operation simply ignored"
  - "If clipboard.writeText fails for Copy Config, the failure must be caught and surfaced as a brief error toast — must not throw to the top level"
  - "Long-press must not also trigger a native context menu on mobile — event.preventDefault() must be called on the contextmenu event"
  - "Opening a second context menu while one is already open must close the first before opening the second — two menus visible simultaneously constitutes a failure"
dependencies:
  requires:
    - "config/property-mapper"
  must_not_require:
    - "config/workspace"
    - "timing/metronome"
    - "any audio module"
    - "any visualizer"
```
