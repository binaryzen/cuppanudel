# Cuppanudel — Workspace Config, Serialization, and Sound Providers
## Spec v0.1

---

## Scope

This spec covers four tightly coupled concerns:

1. **Workspace** — the complete non-media configuration of the application, exportable and
   importable as a YAML file.
2. **Serialization infrastructure** — a lightweight property-mapper used by all components
   to read/write their config slice.
3. **Component context menus** — per-panel UI for editing, copying, and pasting individual
   component configs as YAML.
4. **SampleProvider** — the generalised interface that replaces the metronome's hardcoded
   click synthesis, enabling configurable sound sets.

These four concerns share module boundaries and data formats, so they are specced together.

---

## 1. Workspace

### What a workspace is

A workspace is a snapshot of every component's serialisable, non-media state. It is
intentionally limited to *configuration* — not audio data, not recorded clips. The
canonical serialisation format is YAML.

A workspace YAML dropped onto the page restores everything a user configured: tempo,
feel, accent pattern, click sound reference, visual settings, and presets. It cannot
restore media-pool clips (those are session-local `AudioBuffer`s), but it can restore
references to them so the user knows which samples were assigned where.

### YAML schema

```yaml
version: 1                       # bump when schema changes in a breaking way

global:
  visualDelayMs: 20              # float, 0–100
  snapThreshold: 0.010           # float, 0.0–0.025

metronome:
  bpm: 120                       # int, 20–300
  beatsPerMeasure: 4             # int, 1–13
  beatOffsets:  [0.0, 0.25, 0.5, 0.75]    # float[], length = beatsPerMeasure
  beatVolumes:  [1.0, 0.8,  0.8, 0.8 ]    # float[], length = beatsPerMeasure
  beatAccents:  [true, false, false, false] # bool[],  length = beatsPerMeasure
  clickProviderRef: "built-in:default"     # SampleProvider id

sampleSets:                      # user-defined SampleSets (empty if none)
  - id: "sample-set:woodblock"
    label: "Woodblock Kit"
    slots:
      - index: 0
        clipId: "abc123"         # references a media pool clip by id
        label: "lo woodblock"
      - index: 1
        clipId: "def456"
        label: "hi woodblock"

presets:
  - name: "Rock 4/4"
    metronome:
      bpm: 120
      beatsPerMeasure: 4
      beatOffsets:  [0.0, 0.25, 0.5, 0.75]
      beatVolumes:  [1.0, 0.8,  0.8, 0.8 ]
      beatAccents:  [true, false, false, false]
      clickProviderRef: "built-in:default"
```

Rules:

- `version` is required on import; unknown future versions emit a warning but are still
  attempted (fields that match current schema are applied; unknown fields are ignored).
- Each top-level key is an independent section. A file that contains only `metronome:`
  is valid; absent sections leave current state untouched.
- Arrays whose length must equal `beatsPerMeasure` (`beatOffsets`, `beatVolumes`,
  `beatAccents`) are validated for length; length mismatch is an error (not a warning).
- `clickProviderRef` that names an unregistered provider falls back silently to
  `"built-in:default"` and logs a console warning.

### YAML library

No bundler means no npm. Vendor `js-yaml` as a single UMD file at `lib/js-yaml.min.js`
(MIT, available from the js-yaml GitHub releases). Load as a plain `<script>` before any
module scripts in `index.html`. Exposes `jsyaml.load()` and `jsyaml.dump()` as globals.
No other YAML dependency is needed.

### Export

Three paths, all producing the same YAML string:

| Trigger | Behaviour |
|---|---|
| "Export workspace" in global toolbar or page context menu | Triggers a browser file download as `workspace.yaml` using a Blob + object URL |
| "Copy workspace YAML" same menu | Writes string to clipboard via `navigator.clipboard.writeText()` |
| Component context menu → "Copy Config" | Writes only that component's section to clipboard |

Export always writes all sections explicitly, including `sampleSets: []` when empty, so
the file is a clear complete record.

### Import (file drop)

Drop target: the entire `document` (dragover + drop listeners). Any `.yaml` or `.yml`
file dropped anywhere on the page is treated as a workspace import attempt.

Flow:

1. Read file as text (`FileReader.readAsText`).
2. Parse with `jsyaml.load()`. If parse fails, show error toast; stop.
3. Validate with the property mapper (see §2). Collect all validation errors.
4. If errors exist, show error panel listing each field and reason; stop — do not apply any
   state.
5. If no errors, show a confirmation dialog: "Import workspace? This will replace your
   current settings." with Apply / Cancel. Skip confirmation if imported values are
   identical to current state.
6. On Apply, call each component's `importConfig(slice)` in dependency order:
   `sampleSets` first (so providers are registered before `clickProviderRef` is resolved),
   then `global`, then `metronome`, then `presets`.

A `.json` file with the same schema is also accepted (step 1 branches on extension).

---

## 2. Serialization — Property Mapper

### Module: `config/property-mapper.js`

A minimal, dependency-free utility. No schema language — just a plain JS array of field
descriptors passed by each component.

```js
// Field descriptor shape:
{
  key: string,          // property name in both YAML and JS object
  type: 'int' | 'float' | 'bool' | 'string' | 'int[]' | 'float[]' | 'bool[]',
  required: bool,       // default false; if true, absence is an error
  min?: number,         // inclusive lower bound (scalars and array elements)
  max?: number,         // inclusive upper bound
  minLength?: number,   // minimum array length
  maxLength?: number,   // maximum array length
  exactLength?: string, // name of another field whose value gives the required length
  default?: any,        // used during export when field is absent; not applied on import
}
```

### `validateAndApply(schema, source, target) → string[]`

Walks the schema entries. For each entry:

- If `required` and key absent in `source`: push `"<key>: required field missing"`.
- If key present:
  - Type-check. Wrong JS type → error: `"<key>: expected <type>, got <actualType>"`.
  - Range-check scalars: out of range → **clamp with warning** (not an error), e.g.
    `"<key>: 350 out of range 20–300, clamped to 300"`.
  - Array length check (`exactLength` or `minLength`/`maxLength`): mismatch → error.
  - Array element type and range: same rules applied per-element; element errors report
    as `"<key>[2]: ..."`.
  - If valid (or clamped): write `target[key] = <value or clamped value>`.

Returns the error string array. Empty array = success.

### `serialize(schema, source) → object`

Picks only keys named in `schema` from `source`. Applies `default` for absent fields.
Returns a plain JS object; caller passes it to `jsyaml.dump()`.

### Error messages

Human-readable, field-path qualified. Examples:

```
metronome.bpm: expected int, got "fast"
metronome.beatOffsets: length 3 does not match beatsPerMeasure (4)
metronome.beatVolumes[1]: 1.5 out of range 0–1, clamped to 1
```

---

## 3. Component Context Menus

### Trigger

| Device | Gesture |
|---|---|
| Desktop | Right-click on the panel header bar |
| Mobile | Long-press ≥ 600 ms on the panel header bar; must not also trigger a drag — use the same `hasMoved` guard (< 20 px movement during the press) |

A lightweight native-style dropdown `<div>` appears at the pointer/touch position, clamped
to viewport with 8 px margins. It dismisses on any click/tap outside it, on `Escape`, and
on item selection.

### Menu items (all components)

| Label | Action |
|---|---|
| Copy Config | Serialises this component's slice; writes YAML string to clipboard |
| Paste Config | Reads clipboard; parses; validates against this component's schema only; applies if valid; shows inline error banner if invalid |
| Edit Config… | Opens the Edit Config modal (see below) |

### Edit Config modal

- Fixed-positioned overlay, z-index 600 (above fullscreen panel z-index 100, above knob overlay z-index 500).
- `<textarea>` pre-filled with the component's current config YAML. Monospace font. Min 320×200 px, resizable.
- Footer buttons: **Apply** | **Cancel** | **Copy** (copies textarea content to clipboard).
- **Apply**: parse → validate → apply; on error, show inline error list inside the modal and keep it open.
- **Cancel**: discard all edits, close.
- `Escape` = Cancel. `Ctrl/Cmd+Enter` = Apply.
- The modal is a singleton — only one can be open at a time.

### Component contract

Each component exposes two methods consumed by the context menu infrastructure:

```js
component.exportConfig(): object
// Returns a plain JS object (the component's config slice).
// The context menu serialises this to YAML via jsyaml.dump().

component.importConfig(obj: object): string[]
// Parses and applies the given plain object (already parsed from YAML by the caller).
// Uses validateAndApply internally.
// Returns an array of error strings; empty = success.
// Must be idempotent: if errors are returned, state must not be partially modified.
```

The context menu infra does not call `jsyaml` itself — it calls `exportConfig()` /
`importConfig()` and handles the YAML serialisation wrapper. This way components are
testable independently of the YAML layer.

---

## 4. SampleProvider

### Motivation

The metronome currently synthesises click sounds inline in the scheduler loop. This makes
the sound non-configurable and couples synthesis logic to scheduling logic. The
`SampleProvider` interface decouples them: the metronome asks a provider for a pre-decoded
`AudioBuffer` by index; it does not care how that buffer was made.

### Interface

```js
interface SampleProvider {
  id: string          // globally unique; format: "<namespace>:<name>"
                      // built-ins use "built-in:*"; user-defined use "sample-set:*"
  label: string       // display name shown in UI

  // Must be called once before getSample(). May be async (decode, synthesize, fetch).
  init(ctx: AudioContext): Promise<void>

  // Returns the AudioBuffer for slot `index`, or null if index is out of range.
  // MUST be synchronous after init() resolves — called on the scheduler hot path.
  getSample(index: number): AudioBuffer | null

  // Optional. Number of slots this provider exposes.
  count?(): number
}
```

### Metronome usage (replacing hardcoded synthesis)

```js
// Scheduler loop — replaces the direct oscillator/buffer creation:
const accent = tc.beatAccents[currentBeat] ?? (currentBeat === 0);
const buf = clickProvider.getSample(accent ? 1 : 0);
if (buf && tc.beatVolumes[currentBeat] >= 0.01) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = tc.beatVolumes[currentBeat];
  src.connect(g).connect(ctx.destination);
  src.start(nextBeatTime);
}
```

`clickProvider` is resolved from the `SampleProviderRegistry` using
`tc.clickProviderRef` at metronome start (or provider-swap) time, then held for the
session. If the ref is invalid, it falls back to `"built-in:default"`.

### Built-in default provider (`BuiltinClickProvider`)

Synthesises and caches two `AudioBuffer`s in `init()`. Matches existing behaviour exactly:

| Index | Frequency | Gain | Duration |
|---|---|---|---|
| 0 (beat) | 900 Hz sine + 8 ms noise burst | 0.3 | 70 ms |
| 1 (accent) | 1200 Hz sine + 8 ms noise burst | 0.5 | 70 ms |

Buffers are generated once and reused; `getSample()` is a simple array lookup after init.

### SampleProviderRegistry

Module-level singleton at `config/sample-provider-registry.js`:

```js
const registry = {
  register(provider: SampleProvider): void,
  get(id: string): SampleProvider | undefined,
  list(): SampleProvider[],
}
```

`BuiltinClickProvider` is registered at startup with id `"built-in:default"`.

### MediaPoolSampleProvider

A provider backed by clips in the media pool. Created when the user configures a sample
set. `getSample()` returns the `AudioBuffer` for the clip at the given slot index.

```js
{
  id: "sample-set:<name>",
  label: string,
  slots: Array<{ index: number, clipId: string }>,
  getSample(index) {
    const slot = slots.find(s => s.index === index);
    return slot ? pool.getBuffer(slot.clipId) : null;
  },
  init() { return Promise.resolve(); }  // buffers already decoded in pool
}
```

When a workspace is imported and `sampleSets` is non-empty, a
`MediaPoolSampleProvider` is constructed for each entry and registered. If any `clipId`
is not in the current media pool, that slot returns `null` from `getSample()` and the
metronome falls through to silence for that slot (same as a muted beat). A console
warning names the missing clip.

---

## 5. TempoContext additions

Two new fields added to `TempoContext` to support the above:

| Field | Type | Default | Description |
|---|---|---|---|
| `clickProviderRef` | `string` | `"built-in:default"` | ID of the active `SampleProvider` |
| `beatAccents` | `bool[]` | `[true, false, ...]` | Already exists; moved here from informal state |

`clickProviderRef` is serialised as part of the `metronome` workspace section. It is not
per-beat; it applies to all beats.

---

## 6. Sample Set Management (UI sketch)

Full UI design is deferred. Minimum viable surface for the POC:

- A "Click Sound" row in the metro panel listing the active provider label.
- Tapping/clicking it opens a picker showing registered providers: "Default (synthesised)"
  and any user-created sample sets.
- "New sample set…" in the picker lets the user name a set, then assign media pool clips
  to slot 0 and slot 1 via the existing sample browser.
- Created sets are immediately registered and selectable.

This is enough to make the click sound configurable without a full sample-management
browser. A more complete sample-set management panel is a future feature.

---

## Resolved Ambiguities

| Question | Decision |
|---|---|
| YAML vs JSON | YAML is primary (human-editable); JSON accepted on import as a fallback |
| YAML library | Vendor `js-yaml` UMD in `lib/js-yaml.min.js`; no bundler needed |
| Partial import | Apply only present sections; absent sections leave current state unchanged |
| Invalid `clickProviderRef` | Fall back to `"built-in:default"`; log a console warning |
| Wrong-type field | Hard error; import is rejected |
| Out-of-range scalar | Clamped with a warning; import proceeds |
| Array length mismatch (`beatOffsets` etc.) | Hard error |
| Drop zone | Entire `document`; any `.yaml`/`.yml` file |
| Confirmation on import | Always shown if imported values differ from current state |
| Context menu on mobile | Long-press ≥ 600 ms with < 20 px movement |
| Edit modal z-index | 600 (above fullscreen 100, above knob overlay 500) |
| Presets store `clickProviderRef` | Yes — per preset, so different presets can reference different click sounds |
| Fallback when sample set clip is missing | Silence for that slot; console warning; no hard error |
| `importConfig()` partial-write safety | Must not write any state if returning errors — validate fully first, then apply |

## Remaining Open Questions

- [ ] Should workspace export include `tunerReference` (A4 Hz)? Not exposed as a control
  yet, but a natural addition when it is.
- [ ] Should `presets` have a maximum count? (Suggest 32 as a soft UI limit, not a hard
  schema error.)
- [ ] Should the Edit Config modal syntax-highlight the YAML? Probably not in the POC
  (no dependency); consider in `app/`.
- [ ] Should `MediaPoolSampleProvider` silently use `null` for missing clips, or should
  it substitute `built-in:default`'s buffer at that index? (Current decision: `null` →
  silence. Revisit if users find "silent accent beat" confusing.)
