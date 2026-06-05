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
| `beatAccents` | `bool[]` | Per-beat accent flag; true = hi tick (index 1), false = lo tick (index 0) |
| `visualDelayMs` | `float` | Visual playhead advance in ms to compensate display latency (0–100) |
| `audioLatencyMs` | `float` | Microphone input latency in ms (0–200); shifts the alignment waveform left so notes played on the beat appear under the beat marker |
| `clickProviderRef` | `string` | ID of the active `SampleProvider`; default `"built-in:default"` |
| `snapThreshold` | `float` | Grid snap radius in normalised offset space (0.0–0.025); 0 = off |
| `waveformStride` | `int` | Column spacing for the alignment waveform (1–8); 1 = solid fill, higher = sparser columns |

`setBeatsPerMeasure(tc, n)` resets both `beatOffsets` (even spacing) and `beatVolumes` (all 1.0).

---

### 2. Metronome (`timing/metronome.js`)
Lookahead scheduler using `AudioContext.currentTime`. Reads `beatOffsets` and `beatVolumes` per beat so live edits take effect on the next scheduled beat.

- **Lookahead:** 25ms; scheduler polls every 25ms via `setInterval`
- **Click sound:** resolved via `SampleProvider` (see `specs/workspace.md §4`). The
  metronome holds a reference to the active provider (determined by `tc.clickProviderRef`)
  and calls `provider.getSample(isAccent ? 1 : 0)` each scheduled event to get a
  pre-decoded `AudioBuffer`. The built-in default provider (`"built-in:default"`)
  synthesises the existing noise burst + sine tone on init and caches both buffers.
  Direct synthesis inside the scheduler is removed in favour of this interface.
- **Beat skipped:** volume < 0.01 or `getSample()` returns null → no node created
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
Canvas rotary knob. 270° sweep, 7-o'clock min to 5-o'clock max. Vertical mouse drag changes value (drag up = increase). `onChange(roundedValue)` fires on both drag and `setValue()`. Each knob is accompanied by `−`/`+` fine-tune buttons. Knobs in use:

| Label | tc field | Range | Step |
|---|---|---|---|
| BPM | `bpm` | 20–500 | 1 |
| BEATS | `beatsPerMeasure` | 1–18 | 1 |
| VIS DLY | `visualDelayMs` | 0–100 ms | 1 |
| SNAP | `snapThreshold` | steps 0–5 (× 0.005) | 1 step |
| MIC LAT | `audioLatencyMs` | 0–200 ms | 5 |
| STRIDE | `waveformStride` | 1–8 | 1 |

### App Header

Compact single-row header:
- **Version label**: `cuppanudel <version>` (small, dim). Version string loaded from `poc/version.js` at startup. See `specs/version-management.md`.
- **Start button**: initialises `AudioContext` and mic on first click.
- **Hamburger button (≡)**: toggles a dropdown containing workspace actions (Export Workspace, Copy YAML). Closes on outside click.

### Metronome Panel Controls

- **Start/stop button**: icon-only (`▶` / `■`), lives in the panel header row.
- **Collapsible CONTROLS section**: wraps the knob dials and the sample-set picker. Toggle state persisted in `localStorage` under key `cn.metro.controls.collapsed`.
- **Collapsible PRESETS section**: wraps the preset bank (M+/MR/M slots). Toggle state persisted under `cn.metro.presets.collapsed`.

### Sample Set Picker (`ui/sample-set-picker.js`)
Rendered inside the collapsible CONTROLS section of the metro panel (not as a standalone element). Allows selecting which `SampleProvider` is used for click sounds.

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

## Planned Features

---

### Alignment Monitor (Waveform in Beat Grid)

**Module**: `poc/visualizers/alignment-monitor.js`

An offscreen canvas layer composited into the beat-grid canvas by `metro-display.js`.
Shows a rolling waveform trace aligned to the measure timeline so the user can visually
judge whether notes are landing on the beat.

**As built:**

- Draws peak amplitude bars (`getFloatTimeDomainData()` peak, no RMS) as 1 px columns.
- X-axis matches the beat-grid coordinate space (`PAD_L` / `PAD_R` from `metro-display.js`).
  X position is derived from `getPlayheadPosition()` normalized 0–1 within the measure.
- **Audio latency correction**: `audioLatencyMs` is subtracted from the playhead fraction
  so that a note played on the beat appears under the beat marker despite microphone delay.
  Formula: `adjustedPos = ((pos - latFrac) % 1 + 1) % 1`.
- **Column density**: `waveformStride` (1–8) controls spacing. Stride 1 fills every pixel
  between `prevX` and the current `x` each frame → solid waveform. Higher stride = sparser.
- **Ghost measure**: on downbeat wrap (`x < prevX − 2`), fills the offscreen canvas with
  `rgba(10,10,10,0.55)` (dims the previous measure) rather than clearing.
- **Freeze on stop**: when metronome is not running, `draw()` returns without clearing,
  preserving the last frame for post-performance inspection.
- Composited by `metro-display.js` via `ctx.drawImage(waveformLayer, ...)` before
  reference grid and beat handles are drawn.

---

### File Import (Loops and Backing Tracks)

Users need to load audio files from external sources — in particular loops exported from
hardware looper pedals — and play them back inside the app. This closes the loop (no pun
intended) between the media pool, which can record and play, and external audio assets.

Key requirements:

- Accept audio files via `<input type="file">` or drag-and-drop onto the sample browser.
- Supported formats: WAV, MP3, OGG, M4A, AIFF — whatever `AudioContext.decodeAudioData`
  accepts in the target browser.
- Decoded `AudioBuffer` is inserted into the `BufferTable`; a `SampleClip` entry is
  created with the filename as the default label.
- Files that exceed `MAX_RECORD_DURATION_MS` (30 s) are accepted with a warning; that
  constant is tuned for recording latency and should not gate import.
- Loop files from hardware loopers are often unnormalised — import should not alter gain;
  the per-clip `gain` field is the user's tool for level matching.
- Drag-and-drop should work on the sample browser panel (desktop) and via the file picker
  on mobile (no drag support there).
- See `specs/content-service.md` for the broader abstraction that file import belongs to.

Resolves open question: *"File input: audio file playback as an alternative stream source?"*

---

### Tempo Presets

Users have recurring configurations (time signature, swing feel, accent pattern, BPM) for
different songs or practice contexts. They need to save and recall them instantly without
re-dialling everything by hand.

Key requirements:

- A preset stores the full `TempoContext` snapshot: `bpm`, `beatsPerMeasure`,
  `beatOffsets`, `beatVolumes`, `beatAccents`, `clickProviderRef`.
- **Slot count**: `MAX_PRESETS = 8` (added to `constants.js`). Eight slots in a compact row.
- Each slot has a short user-editable name (instrument/song name, genre, etc.); empty
  slots show "—" and are overwritable.
- **Canonical storage**: `localStorage` under key `cuppanudel.presets.v1` (JSON array of
  8 entries, null for empty slots). The workspace YAML `presets` section is the portable
  export form. On workspace import, the imported `presets` array overwrites localStorage.
- **Save:** one-tap on the desired slot while in "save mode" (a Save button in the preset
  bank activates save mode, highlights the bank for slot selection). Write current `tc`
  snapshot to that slot in localStorage.
- **Recall:** tapping a filled slot outside save mode applies the snapshot:
  - If the metronome is running: stop it immediately, apply the new config, restart from
    beat 0. No smooth transition; immediate stop-restart.
  - If the metronome is stopped: apply the config only; do not auto-start.
- Slots are shown in a compact horizontal row in the metro panel. Full preset name visible
  on hover (desktop) or long-press (mobile).
- Preset UI degrades gracefully if `localStorage` is unavailable (private browsing on iOS):
  show empty slots, disable Save button, allow in-memory recall of presets loaded via
  workspace import.

Resolves open question: *"Persist session settings across page loads?"* (metronome config covered here; global session persistence separate).

---

## Open Questions

- [x] **File input: audio file playback** → addressed in Planned Features above
- [ ] Multiple simultaneous visualizers on screen?
- [x] **Session Context reactive vs polled** → resolved: polled (RAF loop); sufficient for POC
- [ ] Target instruments beyond guitar (pitch range, display conventions)?
- [ ] Persist global session settings across page loads (tuning reference, visual delay, etc.)?
- [ ] Port recorder from `ScriptProcessorNode` to `AudioWorklet` for `app/`
- [ ] Fundamental frequency detection (autocorrelation / HPS) for more accurate tuner on guitar low strings
- [ ] Framework choice for `app/` build
