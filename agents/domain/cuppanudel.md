# Domain Context: Cuppanudel

## Project Summary

Cuppanudel is a browser-based instrument practice application. Features include:
real-time microphone input monitoring, a metronome with lookahead scheduling,
sample recording and playback, pitch detection (tuner), and visual feedback
(oscilloscope, peak meter, beat grid). There is no build system, no framework,
and no npm packages. All code is pure vanilla JavaScript with ES modules.

## Technology Stack

| Concern | Technology / Constraint |
|---|---|
| Language | JavaScript ES2022 modules — `type="module"` in HTML |
| Audio | Web Audio API: AudioContext, AnalyserNode, AudioBufferSourceNode, GainNode, ScriptProcessorNode |
| Rendering | Canvas 2D API |
| Styling | Plain CSS; no preprocessor |
| Storage | localStorage only; no backend, no database |
| Config serialization | YAML via vendored js-yaml UMD at `poc/lib/js-yaml.min.js` |
| Testing | No framework yet; a minimal test runner will be defined as part of implementation |
| Serving | `python -m http.server 8000`; mic requires localhost or HTTPS |

## Repository Layout

```
specs/                  # Authoritative requirements — READ BEFORE DESIGNING
poc/                    # Active proof-of-concept (all implementation work here)
  audio/                # Audio graph modules
    input-provider.js   # getUserMedia → { context, source }
    analyzer.js         # Waveform AnalyserNode (fftSize 2048)
    frequency-analyzer.js  # Pitch AnalyserNode (fftSize 8192)
    recorder.js         # ScriptProcessorNode-based recording
  timing/
    tempo-context.js    # TempoContext — canonical timing/metronome state
    metronome.js        # Lookahead scheduler
  pool/
    media-pool.js       # BufferTable + SampleClip CRUD + playback
  ui/
    knob.js             # Canvas rotary knob with touch overlay
  visualizers/
    metro-display.js    # Beat grid canvas (handles, grid lines, playhead)
    waveform.js         # Oscilloscope
    peak-meter.js       # LED peak meter
    tuner-display.js    # Tuner canvas
    thumbnail.js        # Waveform thumbnail for sample browser
  config/               # TO BE CREATED — serialization and provider registry
  lib/                  # TO BE CREATED — vendored third-party files (js-yaml)
  main.js               # Session wiring; RAF loop; event handlers
  index.html            # Single-page app shell
  constants.js          # MAX_SAMPLES=64, MAX_RECORD_DURATION_MS=30000
agents/                 # This agent system
app/                    # Future production build — not started; ignore
```

## Hard Browser Constraints

- `AudioContext` must be created or resumed inside a user gesture handler. This is a
  browser security requirement with no workaround.
- Microphone access requires `localhost` or HTTPS — never plain `http://`.
- `AnalyserNode` is read-only. It does not route to output. No feedback risk.
- No bare module specifiers. No `import 'lodash'`. All dependencies must be vendored
  under `poc/lib/` and imported with a relative path.
- `type="module"` scripts are always deferred. Order of `<script>` tags still matters
  for UMD globals (e.g., `jsyaml` must be loaded before module scripts that use it).

## Shared State Pattern

The POC uses shared mutable state objects polled by RAF — not a reactive system:

- **`tc` (TempoContext)**: All timing/metronome config. Mutated by UI; read by
  metronome scheduler and metro display each RAF frame.
- **`pool` (MediaPool)**: Decoded AudioBuffers and SampleClips. Mutated by recorder
  and file import; read by sample browser and playback.

There is no event bus. Visualizers call `draw()` every RAF frame and read shared
state directly. New components follow this pattern unless a spec requires otherwise.

## Coding Conventions

- Pure ES modules. No CommonJS. Named exports only; no default exports from files
  with multiple exports.
- No comments explaining *what* code does. Only *why* — non-obvious constraints,
  hidden invariants, browser workarounds.
- No unused variables, no dead code, no backwards-compatibility shims.
- Avoid `class` syntax unless the module specifically warrants object identity. Prefer
  factory functions and plain objects (e.g., `createKnob(...)` returns an object).
- Error messages are human-readable strings. No numeric error codes.
- Canvas hit-test coordinates must account for CSS scaling:
  `logical_x = client_x * (canvas.width / canvas.getBoundingClientRect().width)`
- All tap detection: `!hasMoved (< 20px) AND duration < 250ms`.
- Touch event handlers that call `e.preventDefault()` must register with
  `{ passive: false }`.

## Specifications (source of truth)

Read in this order before defining or implementing anything:

1. `specs/requirements.md` — module-level requirements, TempoContext schema,
   metronome behavior, media pool schema
2. `specs/workspace.md` — workspace YAML schema, property-mapper spec,
   SampleProvider interface, context menu spec
3. `specs/content-service.md` — ContentProvider / ContentService / SampleSet
4. `specs/ui-interaction-model.md` — compact/expanded paradigm, touch targets,
   keyboard nav
5. `specs/project-structure.md` — directory layout, browser constraints

Where specs and existing POC code differ, **the specs take precedence.**

## Definition of Done

A component is done when all of the following are true:

1. All unit tests for the component pass.
2. All integration tests that involve the component pass.
3. The Staff Engineer has approved the test implementation (TestReview verdict = approved).
4. No new `console.error` or unhandled Promise rejections are introduced.
5. The relevant spec section is updated if implemented behavior differs from the spec
   (with coordinator approval for any spec change).
6. The component is wired into `poc/main.js` or the appropriate entry point if it
   requires session-level initialization.
