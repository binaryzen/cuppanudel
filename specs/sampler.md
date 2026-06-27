# Cuppanudel — Sampler Specification
## Spec v0.1

---

## Motivation

A guitarist practising with a metronome or backing loop needs to capture
moments from a performance without interrupting their flow. The sampler's
job is to be invisible until needed: always listening, ready to bottle a
phrase on demand, and then get out of the way again. Once captured, the
player should be able to loop it back in sync with the session, trim the
edges, and file it away — or discard it and play on.

This document models the concepts, parameters, processes, and edge cases
that an implementation must resolve before any code is written.

---

## User Stories

### Core capture flow

| ID | Story |
|----|-------|
| U1 | As a guitarist, I want the app to be *always* listening so I can grab a phrase I just played without having to plan ahead. |
| U2 | As a guitarist, I want to capture "the last 2 bars" with a single tap so I never have to find a record button before I play. |
| U3 | As a guitarist, I want to mark the start of an interesting phrase and then mark its end, for longer or irregular passages. |
| U4 | As a guitarist, I want captured samples to loop back in sync with the metronome so I can play over them. |
| U5 | As a guitarist, I want to trim the start and end of a captured phrase to remove dead air without destructively editing the source. |
| U6 | As a guitarist, I want to organise related samples into sets (e.g., "verse riff variations") so the list stays navigable. |
| U7 | As a guitarist, I want to export a sample or a whole set as audio files so I can use them outside the app. |
| U8 | As a guitarist, I want to import a backing track or reference recording so I can practise against it inside the same session. |
| U9 | As a guitarist, I want the session BPM and time-signature to be remembered with each captured sample so I know the context it was recorded in. |
| U10 | As a guitarist, I want to adjust the gain and pitch of a sample independently without re-recording. |

### Friction cases (must not happen)

| ID | Anti-story |
|----|------------|
| A1 | I should not have to remember to press Record before playing something interesting. |
| A2 | I should not lose a just-played phrase because I wasn't fast enough to tap Capture. |
| A3 | I should not hear drift between a looping sample and the metronome after a few measures. |
| A4 | I should not have to enter millisecond values anywhere. |
| A5 | I should not need to understand AudioBuffers or sample rates to trim a phrase. |

---

## Conceptual Model

### Entities

```
Session
 ├── TempoContext          (BPM, beatsPerMeasure, beat offsets/volumes)
 ├── LiveBuffer            (rolling ring of raw PCM, always recording from mic)
 ├── SamplePool            (all samples owned by this session)
 │    ├── Sample           (one contiguous audio clip + metadata)
 │    └── ...
 └── SampleSet[]           (named groups of Sample references)
      ├── SampleSet
      │    ├── name
      │    └── sampleIds[]
      └── ...
```

### LiveBuffer

A continuously-filling ring buffer of microphone PCM. It is always
recording from the moment the AudioContext starts. Its only purpose is to
hold recent audio long enough for the user to say "give me the last N bars"
after the fact.

The live buffer is **not** a sample. It is ephemeral infrastructure. A
sample is created from it by capture.

### Sample

A discrete, immutable audio clip with metadata. Once created, its raw audio
does not change (trim points adjust a window into it, not the buffer itself).

### SampleSet

A named, ordered list of Sample IDs. A sample may belong to multiple sets.
Sets exist for organisation only; they carry no audio data. The default set
(always present, cannot be deleted) collects samples that have not been
placed in any user-named set.

### Session Context Snapshot

At capture time the following values are frozen into the sample's metadata:

| Field | Source |
|-------|--------|
| `capturedBpm` | `tc.bpm` at capture instant |
| `capturedBeatsPerMeasure` | `tc.beatsPerMeasure` at capture instant |
| `capturedSampleRate` | `AudioContext.sampleRate` |

These are informational and used by loop-sync logic. They do not change when
the user later adjusts the session BPM.

---

## Live Buffer

### Behaviour

- Recording begins automatically when `AudioContext` + mic stream are
  initialised (after the user's first gesture / Start press).
- The buffer holds the most recent `LIVE_BUFFER_MEASURES` measures of
  audio, computed as:
  ```
  capacityFrames = ceil(LIVE_BUFFER_MEASURES × (beatsPerMeasure / bpm × 60) × sampleRate)
  ```
- `LIVE_BUFFER_MEASURES` default: **16** (configurable; four measures is the
  minimum useful capture; sixteen covers a complete verse or chorus phrase).
- The buffer is a ring: when full, the oldest samples are overwritten.
- Write position is tagged with `AudioContext.currentTime` to allow
  measure-aligned trimming at capture time.

### Measure-Boundary Tagging

Each "wrap" of the metronome measure boundary is logged as a pair:
```
{ measureIndex: number, audioTime: number }
```
stored in a small circular log (last `LIVE_BUFFER_MEASURES + 2` entries).
This log is what makes "snap to measure boundary" possible at capture time.
The metronome scheduler writes a tag each time it schedules beat 1.

### BPM Changes During Buffering

When the user changes BPM while the live buffer is filling:
- Existing audio frames are **not** re-tagged. Their measure boundary log
  entries remain valid for the BPM in effect when they were recorded.
- New frames accumulate at the new BPM.
- A capture spanning a BPM change boundary will contain mixed-tempo audio.
  The sample's `capturedBpm` reflects the BPM **at the moment Capture is
  tapped**.
- The UI should warn when a capture's selected range spans a BPM change
  (detectable because two consecutive measure-boundary log entries have
  different inter-entry durations).

### Metronome Stopped

When the metronome is not running, the live buffer still fills (mic is
always on). Measure-boundary log entries are not written. Captures during
this state use ad-hoc (manual) mode only; "snap to last N measures" is
unavailable because there are no measure boundaries to snap to.

The UI should disable snap-mode capture buttons when the metronome is
stopped and explain why.

### Memory Budget

```
maxFrames = LIVE_BUFFER_MEASURES × maxBeatsPerMeasure × (maxBpm/60) × sampleRate
          = 16 × 8 × (300/60) × 48000
          = 16 × 8 × 5 × 48000
          ≈ 30.7 M frames × 2 bytes/frame (Int16) ≈ 61 MB
```

Float32 (native Web Audio) doubles that to ~123 MB. The implementation
should use `Float32Array` to avoid conversion overhead. 123 MB is
acceptable for a dedicated practice session tab; document it in code.

If the computed capacity exceeds 200 MB the cap silently clamps to
the frame count that fits in 200 MB.

---

## Capture Modes

### Mode 1 — Snap (most common)

User taps **Grab last N** (where N is a preset like 1, 2, 4 bars shown as
quick-tap buttons).

1. Look up the Nth-to-last measure boundary in the log.
2. Read from that frame to the current write position.
3. Construct a Sample with `startFrame=0`, `endFrame=totalFrames`,
   `capturedMeasures=N`.
4. Add to pool; open trim panel immediately so user can adjust.

Edge: if fewer than N complete measures exist in the buffer (session just
started), capture what is available and note the shortfall in the sample
label.

### Mode 2 — Punch-in / Punch-out (manual range)

User taps **Mark Start** → plays → taps **Mark End**.

- Mark Start records `AudioContext.currentTime` at press.
- Mark End records `AudioContext.currentTime` at press.
- Frame range computed from the two timestamps against the live buffer's
  write-position history.
- There is no minimum length. Very short captures (< 100 ms) emit a console
  warning but are not rejected.

Edge: if the buffer has wrapped past the start mark (i.e., start mark is
older than `LIVE_BUFFER_MEASURES` measures), the operation fails with an
in-UI message: "Too long — the start of your selection has been overwritten.
Shorten the range or increase the live buffer size."

### Mode 3 — Ad-hoc Grab (one tap, no alignment)

User taps **Grab now**: captures the last fixed duration (default 4 bars'
worth of time at current BPM) from the current write position, without
measure-boundary snapping.

Useful when the metronome is off or the phrase is intentionally non-metric.

### Mode 4 — Trigger Record (forward-facing, optional)

User taps **Arm → Record** to begin writing from that point forward, then
taps **Stop** to end. This is the traditional record-button model, provided
as a fallback for users who prefer it.

The resulting audio is stored as a Sample like any other mode.
The live buffer continues filling in parallel (they share the same mic stream
node but write to different destinations).

---

## Sample Entity

```
Sample {
    id:                     string       // UUID
    label:                  string       // editable by user
    bufferId:               string       // key into BufferTable
    startFrame:             number       // trim in-point (frames, inclusive)
    endFrame:               number       // trim out-point (frames, exclusive)
    capturedBpm:            number
    capturedBeatsPerMeasure: number
    capturedSampleRate:     number
    capturedMeasures:       number | null  // null for ad-hoc/punch modes
    gain:                   number       // 0.0 – 2.0, default 1.0
    detune:                 number       // cents, −1200..+1200, default 0
    loopMode:               'none' | 'sync' | 'free'
    loopStart:              number       // frames relative to startFrame
    loopEnd:                number       // frames relative to startFrame
    fadeInFrames:           number       // 0 = no fade
    fadeOutFrames:          number       // 0 = no fade
    createdAt:              number       // Date.now() at capture
}
```

`loopStart` and `loopEnd` default to `0` and `endFrame - startFrame`
(full clip). The trim in/out points and loop points are independent: you
can trim a sample shorter than its loop region (loop region clamps to trim
bounds at playback time) or set a loop sub-region inside a larger trim.

---

## Sample Playback

Playback uses `AudioBufferSourceNode`. Parameters applied at node creation:

| Sample field | Node property |
|-------------|---------------|
| `gain` | `GainNode.gain.value` |
| `detune` | `AudioBufferSourceNode.detune.value` |
| `loopMode !== 'none'` | `loop = true` |
| `loopStart` | `loopStart = (startFrame + loopStart) / sampleRate` |
| `loopEnd` | `loopEnd = (startFrame + loopEnd) / sampleRate` |
| `fadeInFrames` | Linear ramp via `GainNode` (0 → gain over fadeInFrames/sr seconds) |
| `fadeOutFrames` | Linear ramp scheduled before `loopEnd` or `endFrame` |

`offset` passed to `sourceNode.start()` = `startFrame / sampleRate`.
`duration` passed = `(endFrame - startFrame) / sampleRate` (only for
non-looping playback; looping nodes run until stopped).

### Loop Sync Mode

When `loopMode === 'sync'`:

1. The loop restarts at the next measure boundary as measured by
   `TempoContext`.
2. At play-press: compute `timeToNextMeasure` from `AudioContext.currentTime`
   and the metronome's next scheduled beat-1 time.
3. Schedule `sourceNode.start(nextMeasureTime)`.
4. Loop period = `capturedMeasures × (capturedBeatsPerMeasure / capturedBpm × 60)`.
5. If session BPM differs from `capturedBpm` by more than 5%: display a
   persistent warning badge on the sample: "⚠ BPM mismatch (recorded at
   N bpm)". The sample plays at its natural tempo regardless — no time-stretch
   is applied (it would require an AudioWorklet and is out of scope for the
   POC).

When the metronome is stopped, `sync` mode falls back to `free` (starts
immediately, loops at natural length).

### Free Loop Mode

Loop starts immediately on play-press. Loop period = natural audio duration
of the trim window. No synchronisation with the metronome.

---

## Trim Tool

The trim tool is a singleton panel (one open at a time). It edits
`startFrame`, `endFrame`, `loopStart`, `loopEnd`, `fadeInFrames`,
`fadeOutFrames` non-destructively.

### Operations

| Operation | Effect |
|-----------|--------|
| Drag in-point handle | Adjust `startFrame`; cannot exceed `endFrame − minFrames` |
| Drag out-point handle | Adjust `endFrame`; cannot be less than `startFrame + minFrames` |
| Drag loop-start handle | Adjust `loopStart` (clamped to 0 .. `loopEnd - minFrames`) |
| Drag loop-end handle | Adjust `loopEnd` (clamped to `loopStart + minFrames` .. `endFrame - startFrame`) |
| Fade-in slider | Set `fadeInFrames` (0 .. `endFrame - startFrame`) |
| Fade-out slider | Set `fadeOutFrames` (0 .. `endFrame - startFrame`) |
| Play/stop button | Preview current trim region |
| Duplicate | Create new Sample referencing the same `bufferId`, copying current trim/loop params |
| Crop | Create new AudioBuffer from `[startFrame, endFrame)`, replace `bufferId` with new buffer, reset trim to `[0, newLength)` |
| Discard changes | Revert `startFrame/endFrame/loopStart/loopEnd/fadeInFrames/fadeOutFrames` to values at panel-open time |

`minFrames` = 100 (prevents zero-length clips).

### Waveform Display

The trim panel renders a waveform thumbnail of the full buffer (not just
the trim window) at the width of the panel. Trim and loop handles are
overlaid as draggable vertical bars. The playhead animates during preview
playback.

The waveform is rendered to a canvas once on panel open (or on Crop), not
on every frame.

---

## Import / Export

### Export

| Format | Scope | Notes |
|--------|-------|-------|
| WAV (16-bit PCM) | Single sample | Exports `[startFrame, endFrame)` at `capturedSampleRate`. Metadata not embedded. |
| WAV | All samples in a set | ZIP bundle (one WAV per sample, named `{setName}/{label}.wav`). Requires browser ZIP support or a small inline encoder. |
| YAML workspace | Session | Already covered by `workspace.md`; sample metadata (not audio) only. |

Metadata (BPM, measures, loop params) is exported as a sidecar `.json`
alongside each WAV when exporting a set bundle.

### Import

| Source | Handling |
|--------|----------|
| Local file picker (WAV, MP3, OGG, FLAC, AIFF) | `decodeAudioData` → new AudioBuffer → new Sample. `capturedBpm` and `capturedBeatsPerMeasure` default to current session values; user edits label. |
| Drag-and-drop onto sample list | Same as file picker. |
| Sidecar `.json` alongside a WAV | If present, reads `capturedBpm`, `capturedBeatsPerMeasure`, loop params from it. |

Unsupported formats (MP4 video, PDF, etc.) are silently ignored with a
brief status message: "Skipped: {filename} — unsupported format."

---

## Sample Sets

### Set Operations

| Operation | Notes |
|-----------|-------|
| Create set | User provides a name. Name must be unique within session. |
| Rename set | Updates `name` field; no audio impact. |
| Delete set | Removes the set; samples in it are **not** deleted, they move to the default set. |
| Add sample to set | A sample can appear in multiple sets. |
| Remove sample from set | Removes reference only. |
| Reorder samples within set | Sets maintain an ordered list; drag-to-reorder in UI. |

The default set (label: "Unsorted") always exists. Deleting the default
set is not permitted.

---

## UI Layout Sketch

```
┌─────────────────────────────────────────────┐
│ SAMPLER                              ▾ [≡]  │  ← collapsible section header
├─────────────────────────────────────────────┤
│ LIVE BUFFER                                 │
│ ┌─────────────────────────────────────────┐ │
│ │   [waveform scroll strip, last N bars]  │ │
│ └─────────────────────────────────────────┘ │
│  [1 bar] [2 bars] [4 bars]  [Mark Start ●]  │
│                             [Mark End   ■]  │
│  Metronome off → snap buttons greyed out    │
├─────────────────────────────────────────────┤
│ SET: Unsorted                    [+ New Set]│
│ ┌────┬────────────┬──────┬──────┬─────────┐ │
│ │ ▶  │ waveform   │ 2.0s │ ↺ ×1 │ ✎ 🗑  │ │
│ │    │ label      │      │ sync │         │ │
│ └────┴────────────┴──────┴──────┴─────────┘ │
│ ┌────┬────────────┬──────┬──────┬─────────┐ │
│ │ ▶  │ waveform   │ 4.0s │ ↺ fr │ ✎ 🗑  │ │
│ └────┴────────────┴──────┴──────┴─────────┘ │
│ [Import…]                       [Export Set]│
├─────────────────────────────────────────────┤
│ TRIM — "verse riff take 3"       [× Close] │
│ ┌─────────────────────────────────────────┐ │
│ │ waveform canvas (full buffer)           │ │
│ │  ├── in-point ──── loop ──── out-point ─┤ │
│ └─────────────────────────────────────────┘ │
│ Fade in: [──●──] 20 ms   Fade out: [──●──] │
│ [▶ Preview] [Duplicate] [Crop] [Discard]    │
└─────────────────────────────────────────────┘
```

The live buffer strip and sample list are always visible (within the
collapsible section). The trim panel slides in below the list when a sample
is opened for editing; it is not a modal overlay.

### Sample Row

Each row in the sample list contains:
- Play/stop toggle button
- Inline waveform thumbnail (canvas, rendered once)
- Duration label (derived from trim window: `(endFrame - startFrame) / sampleRate`)
- Loop mode badge: `↺ sync`, `↺ free`, or blank (no loop)
- BPM mismatch badge (⚠) when `loopMode === 'sync'` and BPM differs > 5%
- Rename button → inline text field
- Delete button → confirm on second press

### Capture Quick Buttons

"1 bar", "2 bars", "4 bars" snap buttons are the primary capture affordance.
They are large, touch-friendly (min 44px height), and placed at the top of
the sampler section so a guitarist can tap without looking.

The current live buffer position is shown as a small scrolling waveform
strip above the capture buttons. This gives visual confirmation that the
mic is active.

---

## Integration Points

### Metronome

`TempoContext` exposes:
- `bpm` — read at capture time for `capturedBpm`
- `beatsPerMeasure` — read at capture time
- The metronome scheduler writes measure-boundary timestamps to the live
  buffer's boundary log

### MediaPool / BufferTable

Captured audio is stored as an `AudioBuffer` in the existing `BufferTable`.
Sample metadata (trim, loop, gain, etc.) is stored in the `SampleClip` array
(see `pool/media-pool.js`), extended with the fields from the Sample entity
above.

The existing `SampleClip` structure should gain:
- `capturedBpm`, `capturedBeatsPerMeasure`, `capturedSampleRate`,
  `capturedMeasures` fields
- `loopMode` field (extend existing `loop: boolean` → `loopMode: string`)
- `fadeInFrames`, `fadeOutFrames` fields
- `createdAt` timestamp

Migration of existing `SampleClip` instances: set `loopMode = loop ? 'free' :
'none'`, all new fields to their defaults.

### Workspace Persistence

The YAML workspace schema (see `specs/workspace.md`) stores sample metadata
but not audio data. New fields (`capturedBpm`, `loopMode`, `fadeInFrames`,
`fadeOutFrames`, etc.) are added to the schema. Audio is re-imported on
workspace load via `ContentProvider` or skipped with a warning if the file
is unavailable.

---

## Decisions

| Decision | Resolution |
|----------|-----------|
| **Live buffer sources** | Mic input only. Playback audio is not mixed into the live buffer — doing so risks feedback loops and complicates the audio graph. The user captures their own performance, not "what the session sounded like." |
| **Live buffer size** | Fixed at `LIVE_BUFFER_MEASURES = 16`. No UI control. A session-level config editor is a planned future component; `LIVE_BUFFER_MEASURES` is a candidate setting for it when that ships. |
| **Time-stretching** | Deferred. The BPM mismatch warning remains the POC behaviour. Time-stretching (pitch-preserving, phase-vocoder or similar) is a desirable later feature exposed as a per-sample toggle, implemented as an `AudioWorklet`. The spec and `loopMode` schema should accommodate it without structural change: add `'stretch'` as a future `loopMode` value. |
| **Undo/redo** | Trim operations use the **command pattern**: every mutating operation (move trim handle, set fade, crop) is an object with `execute()` and `undo()` methods pushed onto a per-panel history stack. The UI exposes Undo / Redo buttons (and Ctrl-Z / Ctrl-Shift-Z). History is scoped to the current trim panel session; it does not persist across page reloads. |
| **Multi-channel** | Single channel (mono) throughout. Stereo imports are downmixed to mono at `decodeAudioData`. Multi-channel is out of scope indefinitely. |
| **Drag handle hit targets** | Canvas controls with small visual indicators (trim handles, loop markers) must separate visual radius from hit radius, identical to the pattern specified for beat handles in `specs/ui-interaction-model.md`. This separation must be encapsulated so it applies consistently to every canvas drag control across the app — not re-implemented per component. A shared `createDragHandle({ x, y, visualRadius, hitRadius, ... })` utility or equivalent is the target shape. |
| **Concurrent playback** | Multiple samples may play simultaneously. `MediaPool` already supports concurrent `AudioBufferSourceNode` instances; no architectural change required. |
| **Name collision on import** | Always create a new sample — never overwrite. Label deduplication: strip any trailing ` (N)` suffix from the candidate label, collect all existing labels that match `base` or `base (N)`, find the highest N among them (0 if none), and append ` (N+1)`. Examples: `"riff"` → `"riff (2)"` → `"riff (3)"`, not `"riff (2) (2)"`. |
| **Export ZIP** | Use the Compression Streams API (`CompressionStream('deflate-raw')` + manual ZIP structure). No external library. Target: Chrome 80+, Firefox 113+, Safari 17.2+. Older browsers fall back to individual per-file WAV downloads with an in-UI notice. |

---

## Open Questions

_(none outstanding)_
