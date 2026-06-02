```yaml
id: index-html-alignment-monitor-dom
lane: lane-g
purpose: >
  Adds the alignment-monitor <canvas> element to poc/index.html, positioned behind the
  beat-grid canvas in the DOM so beat-grid handles and grid lines remain visually on top.
  No JavaScript logic lives here.
scope:
  includes:
    - "<canvas id='alignment-monitor' width='400' height='68'> added immediately before (or behind in stacking) the beat-grid canvas in the metro panel DOM"
    - "Canvas must be positioned so it visually underlies the beat-grid canvas via CSS (position:absolute or DOM order with same parent)"
    - "Default dimensions match the beat-grid canvas default: 400×68 px"
  excludes:
    - "JavaScript wiring — owned by lane-wire (main.js)"
    - "CSS animation or transitions on the canvas — implementation detail"
    - "Any interaction handlers on the canvas — it is a read-only visualizer"
interface: |
  // DOM element added to poc/index.html (inside metro panel, before beat-grid canvas):

  //   <canvas id="alignment-monitor" width="400" height="68"></canvas>

  // Must appear before (in DOM order) or be positioned below (z-index) the element
  // with id="beat-grid" so beat-grid elements render on top.

  // ID contract (consumed by main.js):
  //   document.getElementById('alignment-monitor') → HTMLCanvasElement
success_criteria:
  - "document.getElementById('alignment-monitor') returns a non-null HTMLCanvasElement"
  - "The canvas element is inside the metro panel DOM subtree"
  - "The alignment-monitor canvas appears visually behind the beat-grid canvas (either by DOM order before beat-grid, or by CSS z-index lower than beat-grid)"
  - "Default width=400, height=68 attributes match the beat-grid defaults"
failure_criteria:
  - "If alignment-monitor canvas is positioned on top of beat-grid canvas with higher z-index, beat-grid interaction will be blocked — this constitutes a failure"
  - "Missing or misspelled id causes a null reference in main.js wiring"
dependencies:
  requires: []
  must_not_require:
    - "any JavaScript module"
```
