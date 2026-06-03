```yaml
id: index-html-global-toolbar
lane: lane-c
purpose: >
  Adds a <header> element at the top of poc/index.html containing the app title and the
  Export Workspace and Copy YAML action buttons. This is the only required DOM change for
  global workspace export; no JavaScript logic lives here.
scope:
  includes:
    - "<header> element positioned above the panel stack in index.html"
    - "App title text inside the header"
    - "Button with id='export-workspace-btn' labelled 'Export Workspace'"
    - "Button with id='copy-workspace-btn' labelled 'Copy YAML'"
    - "Both buttons initially enabled (they require no audio init)"
    - "Right-click / long-press context menu triggers on panel header bars (existing elements — add class 'panel-header' to the relevant elements so ui/context-menu can target them by class)"
  excludes:
    - "JavaScript event handler wiring — owned by lane-wire (main.js)"
    - "CSS styling beyond structural placement — styling is an implementation detail"
    - "Context menu DOM elements — those are injected dynamically by ui/context-menu"
    - "Edit Config modal DOM — injected by ui/edit-config-modal at runtime"
interface: |
  // DOM elements added to poc/index.html:

  // <header> element containing:
  //   - app title (h1 or span)
  //   - <button id="export-workspace-btn">Export Workspace</button>
  //   - <button id="copy-workspace-btn">Copy YAML</button>

  // Existing panel header elements must have class 'panel-header' added so
  // ui/context-menu can attach listeners by querying '.panel-header'.
  // Example: the metronome panel header div receives class="panel-header"

  // ID contract (consumed by main.js):
  //   document.getElementById('export-workspace-btn') → HTMLButtonElement
  //   document.getElementById('copy-workspace-btn') → HTMLButtonElement
success_criteria:
  - "document.getElementById('export-workspace-btn') returns a non-null HTMLButtonElement"
  - "document.getElementById('copy-workspace-btn') returns a non-null HTMLButtonElement"
  - "Both buttons are within a <header> element that appears before the first panel in the DOM"
  - "Both buttons are enabled (not disabled attribute) at page load"
  - "At least the metronome panel header element has class 'panel-header'"
failure_criteria:
  - "If either button id is misspelled or absent, main.js wiring in lane-wire will silently fail with a null reference — this constitutes a DOM contract failure"
  - "Placing the header inside a panel rather than above all panels in the stacking order constitutes a structural failure"
dependencies:
  requires: []
  must_not_require:
    - "any JavaScript module"
```
