# Project Structure & Browser Constraints

---

## Actual POC Directory Layout

```
cuppanudel/
├── specs/                             # planning & reference docs
│   ├── requirements.md
│   └── project-structure.md
└── poc/                               # throwaway POC — ES modules, no bundler
    ├── index.html                     # single page, all UI
    ├── main.js                        # wires all modules; owns RAF loop
    ├── constants.js                   # MAX_RECORD_DURATION_MS, MAX_SAMPLES, CHUNK_SIZE_MS
    ├── audio/
    │   ├── input-provider.js          # getUserMedia → { context, source }
    │   ├── analyzer.js                # waveform AnalyserNode (fftSize 2048)
    │   ├── frequency-analyzer.js      # pitch AnalyserNode (fftSize 8192) + parabolic interp
    │   └── recorder.js                # SPN-based recorder, dynamic + fixed modes
    ├── timing/
    │   ├── tempo-context.js           # bpm, beatsPerMeasure, beatOffsets, beatVolumes, visualDelayMs
    │   └── metronome.js               # lookahead scheduler + synthesized click
    ├── pool/
    │   └── media-pool.js              # BufferTable + SampleClip CRUD
    ├── ui/
    │   └── knob.js                    # canvas rotary knob, vertical-drag interaction
    └── visualizers/
        ├── waveform.js                # oscilloscope canvas
        ├── peak-meter.js              # 40-segment LED bar + peak hold
        ├── tuner-display.js           # note name, cents bar, needle
        ├── thumbnail.js               # peak-envelope waveform thumbnail (generated once at save)
        └── metro-display.js           # beat grid, draggable handles, playhead, flash
```

### What was simplified vs original plan

| Planned | Actual | Reason |
|---|---|---|
| `Stream Windower` | Not a separate module | `AnalyserNode.getFloatTimeDomainData()` serves the same role |
| `Waveform Sampler` | Not a separate module | `AnalyserNode` downsamples implicitly; thumbnail uses a one-shot peak-envelope pass |
| `context/session.js` | Not built | State held in `tc`, `pool`, and local vars in `main.js`; RAF polling is sufficient |
| `Timing Controller` | Folded into `metronome.js` | No separate controller needed at POC scale |

---

## Post-POC App Layout (placeholder)

```
app/
└── src/
    ├── context/       # reactive session state (TBD)
    ├── audio/         # ported audio pipeline (AudioWorklet replaces SPN)
    ├── timing/
    ├── pool/
    ├── ui/
    └── visualizers/
```

Framework choice deferred until POC lessons are digested.

---

## Browser Constraints

### 1. Secure Context Required
`getUserMedia` (microphone) and `AudioWorklet` both require **HTTPS or localhost**.
Opening `index.html` directly as a `file://` URL will fail for mic access.
**Mitigation:** run a minimal local HTTP server:
```bash
npx serve poc/          # recommended
python -m http.server   # then open localhost:8000/poc/
```

### 2. AudioContext Must Be Started by User Gesture
Browsers block `AudioContext` creation/resume until a user interaction (click, keypress).
**Mitigation:** all audio pipeline init is gated behind the **Start** button. The metronome UI and beat grid are available before Start — only audio scheduling and mic access are deferred.

### 3. Microphone Permission
`getUserMedia` triggers a browser permission prompt. Rejection throws — handled with a visible error on the Start button label.

### 4. ScriptProcessorNode is Deprecated
Used in the POC recorder. Runs on the main thread; large buffer sizes (derived from `CHUNK_SIZE_MS`) keep callback pressure low. Port to `AudioWorklet` in `app/` — requires a separate `.js` processor file and `audioContext.audioWorklet.addModule()`.

### 5. AnalyserNode Constraints

| Property | Constraint |
|---|---|
| `fftSize` | Power of 2, 32–32768 |
| `frequencyBinCount` | Always `fftSize / 2` |
| `smoothingTimeConstant` | 0–1; pitch analyzer uses 0.8 to reduce jitter |
| Data access | `getFloatTimeDomainData()` / `getFloatFrequencyData()` write into pre-allocated `Float32Array` — never allocate inside RAF |

Two `AnalyserNode` instances in use:
- **Waveform analyser** (`fftSize 2048`): mic + playback → waveform canvas + peak meter
- **Pitch analyser** (`fftSize 8192`): mic only → tuner

### 6. Two Separate Clocks
`AudioContext.currentTime` — high-resolution, audio-hardware-locked. Used for metronome scheduling.
`requestAnimationFrame` — display-rate (~60Hz), not synchronized to audio. Used for all canvas rendering.
These run independently. The visual delay knob bridges them: the playhead is drawn at `audioTime + visualDelayMs/1000` to compensate for screen latency.

### 7. RAF and Tab Visibility
RAF throttles/pauses when the tab is hidden; audio and metronome scheduling continue unaffected. Acceptable for a practice tool.

### 8. Single AudioContext Per Page
Treated as a singleton. All nodes belong to the same context. Created once on first user gesture.

### 9. AudioBufferSourceNode is One-Shot
Cannot be restarted after `.stop()` or natural end. Each playback creates a new node. Active nodes tracked in `playing: Map<id, AudioBufferSourceNode>`; `onended` cleans up automatically.

### 10. Multiple AnalyserNode Inputs
An `AnalyserNode` mixes all connected inputs. Playback nodes connect to the waveform analyser (in addition to `destination`) so playback appears in the waveform and peak meter without feedback risk — the analyser output goes nowhere.

### 11. File Input (Future)
`<input type="file">` + `FileReader` + `AudioContext.decodeAudioData` works without HTTPS.
Structurally compatible with the existing Audio Input Provider abstraction.
