# Cuppanudel — Browser-Based Instrument Practice App
## Requirements Spec (v0.2 — updated to reflect POC)

---

## Platform & Methodology

- Browser-based, built with HTML + JavaScript
- Leverages native Web Audio API (`AudioContext`, `AnalyserNode`, `MediaStreamSourceNode`, `ScriptProcessorNode`)
- POC architecture: shared mutable state objects (tempo context, media pool) read by visualizers and written by controllers; no formal pub/sub — visualizers poll on each RAF frame
- ES modules (`type="module"`), no bundler, served via local HTTP (required for mic access)

---

## Modules

### 1. Tempo Context (`timing/tempo-context.js`)
Holds canonical timing state. Mutated directly by UI controllers; read by metronome and metro display.

| Field | Type | Description |
|---|---|---|
| `bpm` | `int` | Beats per minute (20–300) |
| `beatsPerMeasure` | `int` | Number of beats per measure (1–13) |
| `beatOffsets` | `float[]` | Normalized 0–1 position of each beat within the measure |
| `beatVolumes` | `float[]` | Per-beat gain 0–1 (0 = silent, skipped entirely) |
| `visualDelayMs` | `float` | Visual playhead advance in ms to compensate display latency (0–100) |

`setBeatsPerMeasure(tc, n)` resets both `beatOffsets` (even spacing) and `beatVolumes` (all 1.0).

---

### 2. Metronome (`timing/metronome.js`)
Lookahead scheduler using `AudioContext.currentTime`. Reads `beatOffsets` and `beatVolumes` per beat so live edits take effect on the next scheduled beat.

- **Lookahead:** 25ms; scheduler polls every 25ms via `setInterval`
- **Click sound:** noise burst (8ms, `AudioBuffer` of white noise) + sine tone body (70ms); downbeat uses 1200 Hz / 0.5 gain, other beats use 900 Hz / 0.3 gain; both scaled by `beatVolumes[i]`; beat skipped entirely if volume < 0.01
- **Playhead position:** `getPlayheadPosition()` returns normalized 0–1 position in current measure, computed from `AudioContext.currentTime + visualDelayMs/1000 - playbackStartTime`, modulo measure duration

---

### 3. Audio Input Provider (`audio/input-provider.js`)
- `getUserMedia({ audio: true })` → `MediaStream`
- Creates `AudioContext` and `MediaStreamSourceNode`
- Returns `{ context, source }` — single `AudioContext` instance for the session

---

### 4. Recorder (`audio/recorder.js`)
Two recording modes, both capturing raw mono PCM via `ScriptProcessorNode`.

**Dynamic mode:** accumulates `Float32Array` chunks into a growing array; concatenates on stop.

**Fixed mode:** pre-allocates a `Float32Array` of `durationSeconds * sampleRate` frames; auto-stops and fires a callback when full.

SPN output routed through a `gain=0` node to prevent mic feedback. Chunk size computed from `CHUNK_SIZE_MS` rounded to nearest power of 2 in samples.

---

### 5. Frequency Analyzer (`audio/frequency-analyzer.js`)
Separate `AnalyserNode` from the waveform analyser — uses `fftSize = 8192` for ~5.4 Hz/bin resolution at 44.1 kHz.

- `smoothingTimeConstant = 0.8` to reduce jitter
- Finds peak bin above –60 dB threshold (skipping first 5 bins to avoid DC/sub-bass noise)
- Parabolic interpolation on the peak bin for sub-bin frequency accuracy
- Connected only to mic source (not playback) — tuner reads the instrument, not playback

---

### 6. Waveform Monitor (`audio/analyzer.js`)
`AnalyserNode` with `fftSize = 2048`. Connected to mic source. Playback nodes also connect to it so the waveform canvas shows the combined live signal. Output not connected to destination (no feedback). Used by waveform visualizer and peak meter.

> **Note:** Stream Windower and Waveform Sampler as distinct modules were subsumed by `AnalyserNode` — `getFloatTimeDomainData()` serves as both the windower and downsampler for POC purposes.

---

### 7. Tuner (inline in `visualizers/tuner-display.js`)
- Converts Hz → MIDI note number: `midi = 12 * log2(freq / 440) + 69`
- Rounds to nearest semitone; computes cents deviation
- Note names: chromatic 12-tone, A4 = 440 Hz reference
- In-tune threshold: ±5 cents

---

## Visualizers

### Waveform (`visualizers/waveform.js`)
Canvas oscilloscope. Reads `getFloatTimeDomainData()` from the shared waveform `AnalyserNode` each RAF frame. Pre-allocated `Float32Array` buffer. Draws a continuous line, sample index → x, amplitude → y centered on canvas midline.

### Peak Meter (`visualizers/peak-meter.js`)
Horizontal LED-style bar. 40 segments with color zones: green (0–70%), yellow (70–85%), red (85–100%). Peak hold: locks at highest recent segment for 1200ms then decays at 0.4 segments/frame. White indicator segment marks the peak. RMS computed fresh each frame from time-domain data.

### Tuner Display (`visualizers/tuner-display.js`)
Canvas. Shows note name + octave (large, left), Hz reading (small, below note), segmented color bar (center) with zone lighting and needle at cents deviation, cents label (right). In-tune (±5¢): note and needle turn green. No signal: shows `—`.

### Waveform Thumbnail (`visualizers/thumbnail.js`)
Generated once at sample-save time. Peak-envelope downsample: one max-abs value per output pixel column. Drawn to an 80×28 offscreen canvas, inserted directly into the sample list row.

### Metro Display (`visualizers/metro-display.js`)
Canvas beat grid (400×68). Two layers:

**Reference grid (fixed, based on even spacing):**
- Dashed lines at `i/N` — even beat positions; serve as "straight feel" reference
- Dotted lines at `i/N ± 1/3N` — triplet subdivisions within each beat interval

**Beat markers (interactive):**
- Beat 0: fixed x (downbeat, cyan); all beats: y-draggable for volume
- Beats 1+: x-draggable for swing/shuffle; constrained between neighbors with `MIN_GAP = 0.025`
- Handle y position encodes volume: `VOL_MAX_Y=10` (100%) to `VOL_MIN_Y=44` (0%)
- Faint vertical rail shows the drag range; fill line from handle to timeline shows volume level
- Flash on playhead crossing: white overlay on handle + line, decays over 200ms

**Playhead:** orange vertical line at `beatX(playheadPosition)`, spans full canvas height.

---

## UI Components

### Knob (`ui/knob.js`)
Canvas rotary knob. 270° sweep, 7-o'clock min to 5-o'clock max. Vertical mouse drag changes value (drag up = increase). `onChange(roundedValue)` fires on both drag and `setValue()`. Used for BPM (20–300), Beats (1–13), and Visual Delay (0–100ms). Each knob is accompanied by `−`/`+` fine-tune buttons that step by 1 unit.

---

## Media Pool

### Constants (`constants.js`)

| Constant | Value | Description |
|---|---|---|
| `MAX_RECORD_DURATION_MS` | 30000 | Max duration of a single recorded sample |
| `MAX_SAMPLES` | 64 | Max samples in the pool |
| `CHUNK_SIZE_MS` | 100 | Recorder chunk size target; snapped to nearest power-of-2 samples at runtime |

### BufferTable + SampleClip (`pool/media-pool.js`)
- `buffers: Map<id, AudioBuffer>` — raw PCM, never copied
- `clips: SampleClip[]` — lightweight references

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `label` | string | Display name (renameable) |
| `bufferId` | string | Key into BufferTable |
| `startFrame` | int | Start offset in samples |
| `endFrame` | int | End offset in samples (exclusive) |
| `gain` | float | Playback gain (default 1.0) |
| `detune` | int | Cents offset (default 0) |
| `loop` | boolean | Loop on playback |

Playback via `AudioBufferSourceNode` (one-shot; new node per play). Playing nodes tracked in a `Map<id, AudioBufferSourceNode>` so they can be stopped; playback nodes also connect to the waveform `AnalyserNode` for monitoring. Delete auto-stops playback first.

---

## Session Wiring (POC `main.js`)

No formal session context object — state is held in:
- `tc` — TempoContext (mutable, shared)
- `pool` — MediaPool
- `playing` — Map of active playback nodes
- Module-local variables for audio nodes and visualizer instances

RAF loop calls all visualizer `.draw()` methods each frame. Metronome runs on `setInterval` independent of RAF. `AudioContext` is a singleton created on first user gesture.

---

## POC Scope — Completed ✓

1. ✅ Audio input access — mic via `getUserMedia` + `MediaStreamSourceNode`
2. ✅ Frequency analysis — FFT with parabolic interpolation → predominant frequency → tuner
3. ✅ Waveform monitoring — `AnalyserNode` time-domain data → canvas oscilloscope
4. ✅ Peak meter — RMS → LED segment display with peak hold
5. ✅ Timing controller — lookahead scheduler on `AudioContext.currentTime`
6. ✅ Metronome — synthesized click, per-beat volume, shuffle via draggable offsets
7. ✅ Media pool — dynamic/fixed recording, sample browser with waveform thumbnails, playback

---

## Open Questions

- [ ] File input: audio file playback as an alternative stream source?
- [ ] Multiple simultaneous visualizers on screen?
- [x] **Session Context reactive vs polled** → resolved: polled (RAF loop); sufficient for POC
- [ ] Target instruments beyond guitar (pitch range, display conventions)?
- [ ] Persist session settings (BPM, tuning reference, etc.) across page loads?
- [ ] Port recorder from `ScriptProcessorNode` to `AudioWorklet` for `app/`
- [ ] Fundamental frequency detection (autocorrelation / HPS) for more accurate tuner on guitar low strings
- [ ] Framework choice for `app/` build
