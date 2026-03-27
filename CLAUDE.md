# CLAUDE.md

## Project Overview

**Cuppanudel** is a browser-based instrument practice application. It provides real-time
microphone input monitoring, a metronome with lookahead scheduling, sample recording/playback,
pitch detection (tuner), and visual feedback (oscilloscope, peak meter, beat grid).

No build system, no framework, no npm packages. Pure vanilla JS + Web Audio API + ES modules.

## Repository Layout

```
specs/          # Requirements and architecture docs — read these first for context
poc/            # Current throwaway proof-of-concept (single-page app)
app/            # Future production build (not yet started)
```

The `poc/` is intentionally throwaway. When `app/` work begins, do not port patterns
uncritically — consult `specs/` for the intended design.

## Running the POC

Microphone access requires a secure context. Serve locally:

```bash
python -m http.server 8000
# then open http://localhost:8000/poc/
```

Click **Start** to trigger the user gesture that initializes `AudioContext` and requests mic.

There are no build, test, or lint commands yet.

## Code Architecture

### Module Map (`poc/`)

| Path | Responsibility |
|------|---------------|
| `main.js` | Wires everything; RAF loop; event handlers |
| `constants.js` | `MAX_SAMPLES=64`, `MAX_RECORD_DURATION_MS=30000` |
| `audio/input-provider.js` | `getUserMedia()` → `{ context, source }` |
| `audio/analyzer.js` | Waveform `AnalyserNode` (fftSize 2048) |
| `audio/frequency-analyzer.js` | Pitch `AnalyserNode` (fftSize 8192) + parabolic interpolation |
| `audio/recorder.js` | `ScriptProcessorNode`-based recording; dynamic + fixed modes |
| `timing/tempo-context.js` | `TempoContext`: bpm, beatsPerMeasure, beatOffsets, beatVolumes, visualDelayMs |
| `timing/metronome.js` | Lookahead scheduler (25 ms window, `setInterval` 25 ms) |
| `pool/media-pool.js` | `BufferTable` + `SampleClip` CRUD; playback node tracking |
| `ui/knob.js` | Canvas rotary knob (270° sweep, vertical drag) |
| `visualizers/*.js` | Oscilloscope, LED peak meter, tuner display, thumbnail, beat grid |

### Key Design Decisions

- **Two clocks**: `AudioContext.currentTime` (hardware-locked) for scheduling;
  `requestAnimationFrame` (~60 Hz) for display. They are deliberately independent.
  The *visual delay* knob (0–100 ms) compensates screen latency by advancing the playhead.
- **No pub/sub**: Visualizers read shared mutable state (`tc`, `pool`) each RAF frame.
- **`ScriptProcessorNode`** is deprecated but used in POC. Port to `AudioWorklet` in `app/`.
- **Two analyzer nodes**: waveform (lower fftSize) and pitch (higher fftSize, 0.8 smoothing)
  run in parallel off the same source.

## Constraints to Keep in Mind

- `AudioContext` must be created (or resumed) inside a user gesture handler.
- Microphone (`getUserMedia`) requires `localhost` or HTTPS — never plain `http://`.
- `AnalyserNode` is read-only; it does not route audio to the output, so there is no
  microphone feedback risk.
- All files are ES modules (`type="module"` in HTML); no bundler means no bare specifiers.

## Specs

Before adding any significant feature, read:

- `specs/requirements.md` — detailed module and feature requirements (v0.2)
- `specs/project-structure.md` — intended directory layout and browser constraints

These are the source of truth for intended behaviour, even where the POC diverges.
