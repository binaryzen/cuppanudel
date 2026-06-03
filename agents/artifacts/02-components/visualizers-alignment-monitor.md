```yaml
id: visualizers/alignment-monitor
lane: lane-g
purpose: >
  Renders a continuously scrolling waveform history canvas behind the beat-grid canvas,
  showing 2 measures of raw amplitude data aligned to the beat-grid coordinate space.
  Allows the user to visually judge whether their playing is early, on-time, or late
  relative to the metronome beat markers.
scope:
  includes:
    - "createAlignmentMonitor(analyser, canvas, tc, getMetronomeState) factory"
    - "Ring buffer of Float32Array, one entry per canvas pixel column, holding ALIGN_MEASURES * canvasWidth columns"
    - "ALIGN_MEASURES = 2 named constant (at top of module)"
    - "Each RAF frame: compute column advance from measureStart and nextBeatTime; shift ring buffer by that count; fill new columns from analyser.getFloatTimeDomainData() peak-per-column sample"
    - "draw(): clear canvas, render ring buffer columns left-to-right at opacity 0.35; most-recent measure columns at slightly brighter opacity (~0.55)"
    - "X-axis coordinate space mirrors the beat-grid: column 0 = measure start, column canvasWidth-1 = one measure width"
    - "Y-axis: amplitude 0 → canvas midline; full-scale = canvas height/2"
    - "Raw amplitude (peak of absolute sample values per column), no RMS smoothing"
    - "Scroll is derived from measureStart and nextBeatTime (same scheduler variables), not getPlayheadPosition()"
    - "Module file at poc/visualizers/alignment-monitor.js"
    - "Canvas must be placed behind beat-grid canvas in DOM (lower z-index or earlier in DOM order)"
  excludes:
    - "Beat-grid overlays, markers, or draggable handles — owned by metro-display.js"
    - "getPlayheadPosition() — not used here; scroll derived directly from scheduler time variables"
    - "RMS smoothing — raw peak amplitude only"
    - "Freeze-on-downbeat mode — continuous draw only"
    - "User-configurable history depth at runtime — ALIGN_MEASURES is a compile-time constant"
    - "Any audio node creation or routing"
interface: |
  // poc/visualizers/alignment-monitor.js

  // Constant exported for testability:
  const ALIGN_MEASURES: number  // = 2

  // Metronome state accessor — passed in to avoid importing metronome directly:
  interface MetronomeState {
    measureStart: number      // AudioContext.currentTime of current measure start
    nextBeatTime: number      // AudioContext.currentTime of the next scheduled beat
    isRunning: boolean
    beatsPerMeasure: number   // from tc, for measure duration calculation
  }

  // Creates the alignment monitor.
  // analyser: the shared waveform AnalyserNode (fftSize 2048).
  // canvas: the <canvas> element behind the beat-grid canvas.
  // tc: the shared TempoContext (reads bpm, beatsPerMeasure, visualDelayMs).
  // getMetronomeState: called each frame to get measureStart, nextBeatTime, isRunning.
  function createAlignmentMonitor(
    analyser: AnalyserNode,
    canvas: HTMLCanvasElement,
    tc: TempoContext,
    getMetronomeState: () => MetronomeState
  ): AlignmentMonitor

  interface AlignmentMonitor {
    // Called once per RAF frame. Updates ring buffer and redraws canvas.
    draw(): void

    // Clears the ring buffer and the canvas (e.g., when metronome stops).
    reset(): void
  }
success_criteria:
  - "createAlignmentMonitor returns an object with draw() and reset() methods"
  - "draw() called when getMetronomeState().isRunning === false clears the canvas and returns without error"
  - "draw() called when isRunning === true fills new columns proportional to playhead advance since last frame"
  - "Ring buffer length === ALIGN_MEASURES * canvas.width; ring buffer is allocated once and reused"
  - "draw() renders canvas columns at opacity 0.35 for older measure, ~0.55 for the most-recent measure"
  - "reset() zeroes the ring buffer and clears the canvas"
  - "After ALIGN_MEASURES measures of playback, the ring buffer is fully populated (no uninitialized columns visible)"
  - "Column advance per frame is computed as: (measureStart advancement since last frame) / measureDuration * canvasWidth — not from getPlayheadPosition()"
  - "ALIGN_MEASURES exported constant equals 2"
  - "draw() does not allocate new Float32Array on each call — the analyser buffer and ring buffer are pre-allocated"
failure_criteria:
  - "draw() must not throw if getMetronomeState returns isRunning:false — blank canvas only"
  - "If canvas.width is 0, draw() returns without error — no division-by-zero crash"
  - "Using getPlayheadPosition() for scroll position constitutes a spec violation — drift will appear on BPM changes"
  - "Allocating a new Float32Array inside the RAF draw loop constitutes a performance failure"
  - "Rendering at full opacity (no transparency) constitutes a failure — beat-grid elements must remain legible through the overlay"
dependencies:
  requires:
    - "timing/tempo-context-additions"
  must_not_require:
    - "timing/metronome"
    - "config/property-mapper"
    - "config/workspace"
    - "any UI module"
    - "pool/media-pool"
```
