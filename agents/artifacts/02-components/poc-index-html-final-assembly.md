```yaml
id: poc/index-html-final-assembly
lane: lane-wire
purpose: >
  Ensures poc/index.html contains all DOM elements required by the fully integrated app:
  the global header (Export/Copy Workspace), panel header context-menu hooks, alignment
  monitor canvas, preset bank container, and file import controls. Verifies all per-lane
  HTML changes are present and consistent. Also ensures poc/lib/js-yaml.min.js is loaded
  as a plain <script> before the module scripts.
scope:
  includes:
    - "Verification and integration of all DOM additions from lane-c (global header), lane-d (file import UI), lane-f (preset bank container), lane-g (alignment monitor canvas)"
    - "Addition of <script src='lib/js-yaml.min.js'></script> before all <script type='module'> elements"
    - "All panel header elements have class 'panel-header' for context menu attachment"
    - "Correct stacking: alignment-monitor canvas before beat-grid canvas in DOM order"
    - "No duplicate id attributes"
    - "main.js remains the sole <script type='module'> entry point"
  excludes:
    - "jsyaml library source — that is a manual vendoring step (copy poc/lib/js-yaml.min.js from js-yaml GitHub releases)"
    - "Any inline JavaScript"
    - "CSS rules beyond structural correctness"
    - "Feature implementation — all logic is in JS modules"
interface: |
  // poc/index.html final DOM contract:

  // Required elements (all must be present and correctly id'd):
  //   <script src="lib/js-yaml.min.js"></script>         (before module scripts)
  //   <header>
  //     <button id="export-workspace-btn">Export Workspace</button>
  //     <button id="copy-workspace-btn">Copy YAML</button>
  //   </header>
  //   <div id="metro-panel"> ... </div>                   (class="panel-header" on its header)
  //   <canvas id="alignment-monitor" width="400" height="68"></canvas>  (before beat-grid)
  //   <canvas id="beat-grid" width="400" height="68"></canvas>
  //   <div id="preset-bank-container"></div>
  //   <button id="preset-save-btn">Save Preset</button>
  //   <div id="sample-browser-panel"> ... </div>
  //   <input type="file" id="import-file-input" accept="audio/*" multiple style="display:none">
  //   <button id="import-file-btn">Import File</button>
  //   <div id="import-drop-overlay" hidden></div>
  //   <script type="module" src="main.js"></script>       (last script element)
success_criteria:
  - "js-yaml.min.js <script> tag appears before any <script type='module'> in the document"
  - "typeof jsyaml === 'object' after page load (jsyaml global exposed by the UMD script)"
  - "All element ids listed in the interface contract resolve to non-null elements via getElementById"
  - "alignment-monitor canvas appears before beat-grid canvas in DOM order within the metro panel"
  - "No duplicate id attributes in the document"
  - "metro panel header element has class 'panel-header'"
  - "There is exactly one <script type='module'> element and it points to main.js"
failure_criteria:
  - "If jsyaml global is not defined at page load (js-yaml.min.js missing or loaded after module scripts), workspace YAML export/import will throw ReferenceError — this constitutes an assembly failure"
  - "Any missing element id from the contract list will cause a null-reference error in main.js — constitutes an assembly failure"
  - "alignment-monitor canvas appearing after beat-grid in DOM without lower z-index means it occludes the beat grid — constitutes a stacking failure"
dependencies:
  requires:
    - "index-html-global-toolbar"
    - "index-html-file-import-ui"
    - "index-html-preset-bank-dom"
    - "index-html-alignment-monitor-dom"
    - "poc/main.js-refactor"
  must_not_require:
    - "any JavaScript module (HTML only)"
```
