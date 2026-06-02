```yaml
id: index-html-preset-bank-dom
lane: lane-f
purpose: >
  Adds the container element and Save button for the preset bank to the metro panel in
  poc/index.html. The actual slot buttons are rendered dynamically by ui/preset-bank.
  No JavaScript logic lives here.
scope:
  includes:
    - "<div id='preset-bank-container'> inside the metro panel, below the beat grid"
    - "<button id='preset-save-btn'>Save Preset</button> adjacent to or inside the container"
    - "The container is the injection point for ui/preset-bank's slot buttons"
  excludes:
    - "JavaScript event handler wiring — owned by lane-wire (main.js)"
    - "The 8 slot buttons — injected dynamically by ui/preset-bank"
    - "CSS styling — implementation detail"
    - "Any elements outside the metro panel"
interface: |
  // DOM elements added to poc/index.html (inside the metro panel):

  //   <div id="preset-bank-container"></div>
  //   <button id="preset-save-btn">Save Preset</button>

  // ID contract (consumed by main.js and ui/preset-bank):
  //   document.getElementById('preset-bank-container') → HTMLDivElement
  //   document.getElementById('preset-save-btn') → HTMLButtonElement
success_criteria:
  - "document.getElementById('preset-bank-container') returns a non-null HTMLDivElement inside the metro panel"
  - "document.getElementById('preset-save-btn') returns a non-null HTMLButtonElement"
  - "Both elements are within the metro panel DOM subtree"
failure_criteria:
  - "Missing or misspelled element ids cause silent null references in main.js wiring — any id mismatch constitutes a failure"
  - "Placing the container outside the metro panel constitutes a layout failure"
dependencies:
  requires: []
  must_not_require:
    - "any JavaScript module"
```
