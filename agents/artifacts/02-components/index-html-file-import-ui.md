```yaml
id: index-html-file-import-ui
lane: lane-d
purpose: >
  Adds the DOM elements required for the file import feature to poc/index.html: a drag-
  and-drop target region on the sample browser panel and a hidden file input element used
  as the fallback picker trigger. No JavaScript logic lives here; wiring is done in lane-wire.
scope:
  includes:
    - "Hidden <input type='file' id='import-file-input' accept='audio/*' multiple> element for programmatic trigger by LocalFileProvider"
    - "A visible 'Import File' button with id='import-file-btn' in the sample browser panel"
    - "The sample browser panel element receives the attribute or class that marks it as a drop target (e.g. data-drop-target='audio' or class addition 'audio-drop-target') for drag-and-drop wiring in main.js"
    - "A <div id='import-drop-overlay'> child of the sample browser panel, hidden by default, to show drag-over visual feedback when files are dragged over the panel"
  excludes:
    - "JavaScript event handlers — owned by lane-wire (main.js)"
    - "CSS for drag-over states — implementation detail"
    - "Content browser sidebar or provider tab strip — full content browser UI is a future feature; this is the minimal import entry point"
    - "Any changes outside the sample browser panel area"
interface: |
  // DOM elements added to poc/index.html:

  // Inside or adjacent to the sample browser panel:
  //   <input type="file" id="import-file-input" accept="audio/*" multiple style="display:none">
  //   <button id="import-file-btn">Import File</button>
  //   <div id="import-drop-overlay" hidden></div>

  // The sample browser panel element must have id="sample-browser-panel" (if not already
  // present, add it) so main.js can attach dragover/drop listeners by id.

  // ID contract (consumed by main.js and LocalFileProvider):
  //   document.getElementById('import-file-input')  → HTMLInputElement (type=file)
  //   document.getElementById('import-file-btn')    → HTMLButtonElement
  //   document.getElementById('import-drop-overlay') → HTMLDivElement
  //   document.getElementById('sample-browser-panel') → HTMLElement (the sample list container)
success_criteria:
  - "document.getElementById('import-file-input') returns a non-null HTMLInputElement with type='file' and accept='audio/*'"
  - "document.getElementById('import-file-btn') returns a non-null HTMLButtonElement"
  - "document.getElementById('import-drop-overlay') returns a non-null element"
  - "document.getElementById('sample-browser-panel') returns a non-null element that contains the sample list"
  - "The import-file-input element is not visible at page load (display:none or hidden attribute)"
failure_criteria:
  - "Missing or misspelled element ids constitute a DOM contract failure that will cause silent null-reference failures in main.js wiring"
  - "Making import-file-input visible by default (not hidden) constitutes a UI layout failure"
dependencies:
  requires: []
  must_not_require:
    - "any JavaScript module"
```
