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

No bundler means no npm. Vendor `js-yaml` as a single UMD file at `poc/lib/js-yaml.min.js`
(MIT, available from the js-yaml GitHub releases). Load as a plain `<script>` before any
module scripts in `index.html`. Exposes `jsyaml` as a global.

**Security requirement**: Always parse with `jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA })`
(or `jsyaml.safeLoad(text)` in older versions). Never call bare `jsyaml.load(text)` — the
default schema executes JavaScript embedded in `!!js/function` YAML tags, which is a known
deserialization attack vector. `CORE_SCHEMA` restricts parsing to standard scalars, sequences,
and mappings only. Serialise with `jsyaml.dump()` (safe by default).

### Export

Three paths, all producing the same YAML string:

| Trigger | Behaviour |
|---|---|
| "Export workspace" button in page header | Triggers a browser file download as `workspace.yaml` using a Blob + object URL |
| "Copy YAML" button adjacent to Export | Writes string to clipboard via `navigator.clipboard.writeText()` |
| Component context menu → "Copy Config" | Writes only that component's section to clipboard |

The page header is a simple `<header>` element above the panel stack in `index.html`,
containing the app title and the Export / Copy YAML buttons. No right-click page context
menu is required.

Export always writes all sections explicitly, including `sampleSets: []` when empty, so
the file is a clear complete record.

### Import (file drop)

Drop target: the entire `document` (dragover + drop listeners). Any `.yaml`, `.yml`, or
`.json` file dropped anywhere on the page is treated as a workspace import attempt.

Flow:

1. **Size check**: if `file.size > 1_048_576` (1 MB), show error toast ("File too large
   for a workspace config") and stop. A valid workspace YAML is never larger than ~10 KB;
   1 MB is a generous cap that prevents main-thread freeze from a very large YAML parse.
2. Read file as text (`FileReader.readAsText`).
3. **Parse**: if the filename ends in `.json`, parse with `JSON.parse()`. Otherwise, parse
   with `jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA })`. If parsing throws, show error
   toast with the parser's message and stop. Do not attempt cross-format fallback (a `.yaml`
   file containing JSON is a user error, not a supported format).
4. Validate with the property mapper (see §2). Collect all validation errors.
5. If errors exist, show error panel listing each field and reason; stop — do not apply any
   state.
6. If no errors, show a confirmation dialog: "Import workspace? This will replace your
   current settings." with Apply / Cancel. Skip the confirmation if all imported values are
   equal to current state. Equality check: strict `===` for strings, ints, and bools; for
   floats use tolerance `|a - b| < 1e-6`; for arrays, compare element-wise with the same
   rules.
7. On Apply, call each component's `importConfig(slice)` in dependency order:
   `sampleSets` first (so providers are registered before `clickProviderRef` is resolved),
   then `global`, then `metronome`, then `presets`.

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

**Two-pass algorithm** — validate fully first, then write atomically:

**Pass 1 — collect:**
Walk every schema entry. For each entry:
- If `required` and key absent in `source`: push `"<key>: required field missing"`.
- If key present:
  - Type-check. Wrong JS type → push error `"<key>: expected <type>, got <actualType>"`.
  - Range-check scalars: out of range → clamp and push warning (not an error), e.g.
    `"<key>: 350 out of range 20–300, clamped to 300"`. Store the clamped value.
  - `exactLength` check: look up the named field in `source` (not `target`). If the
    named field is itself missing or invalid, treat the current field's length as
    unchecked (do not produce a spurious length error). If the named field is valid,
    compare array lengths; mismatch → push error.
  - `minLength`/`maxLength`: apply if present; mismatch → push error.
  - Array element type and range: same rules per-element; element errors report as
    `"<key>[2]: ..."`.
  - On success (or clamp): store `{ key, value }` in a local `pending` list.

**Pass 2 — apply (only if no errors):**
If the error array contains any error strings (warnings do not count), return the array
without modifying `target`. Otherwise, write every `{ key, value }` pair from `pending`
to `target` atomically. This guarantees `target` is never partially mutated.

Returns the error string array (errors and warnings combined). Empty array = clean success.

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
| Paste Config | Reads clipboard via `navigator.clipboard.readText()`; parses; validates against this component's schema only; applies if valid; shows inline error banner if invalid. If `navigator.clipboard.readText` is unavailable or throws a `NotAllowedError`, the "Paste Config" item is hidden (not greyed out) — no fallback text-entry dialog. |
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

  // Returns the AudioBuffer for slot `index`, or null if index is out of range or
  // the slot is unassigned. MUST return null (never undefined) — callers use
  // strict null checks. MUST be synchronous after init() resolves — hot path.
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

**Module path**: `poc/audio/builtin-click-provider.js`

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
  // For test teardown only — not part of the production API:
  _reset(): void,
}
```

**Initialization timing**: The registry object is created at module-import time (no
`AudioContext` dependency). `BuiltinClickProvider` is constructed and registered at
import time with id `"built-in:default"`. However, `BuiltinClickProvider.init(ctx)`
(which synthesises the audio buffers) is called lazily — inside the Start button
handler in `main.js`, immediately after `AudioContext` is created. The metronome start
is gated on `init()` resolving: `await clickProvider.init(ctx)` before `metronome.start()`.

If `getSample()` is called on `BuiltinClickProvider` before `init()` has resolved (e.g.,
a race condition), it must return `null` and log `console.error('BuiltinClickProvider not
initialised')`. The scheduler's null guard will skip that beat rather than throw.

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

Three new fields added to `TempoContext`:

| Field | Type | Default | Description |
|---|---|---|---|
| `clickProviderRef` | `string` | `"built-in:default"` | ID of the active `SampleProvider` |
| `beatAccents` | `bool[]` | `[true, false, ...]` | Already exists informally; formalised here |
| `snapThreshold` | `float` | `0` | Grid snap radius in normalised offset space (0.0–0.025); 0 = off |

`clickProviderRef` is serialised in the `metronome` workspace section; applies to all beats.
`snapThreshold` is serialised in the `global` workspace section; owned by the metro display.
The property-mapper schema descriptor for `snapThreshold`: `{ key: 'snapThreshold', type: 'float', min: 0, max: 0.025, default: 0 }`.

`setBeatsPerMeasure(tc, n)` resets `beatOffsets`, `beatVolumes`, and `beatAccents`. It does
not reset `clickProviderRef` or `snapThreshold`.

---

## 6. Sample Set Management (UI sketch)

Full UI design is deferred. Minimum viable surface for the POC:

- A "Click Sound" row in the metro panel listing the active provider label.
- Tapping/clicking it opens a provider picker listing: "Default (synthesised)" and any
  user-created sample sets.
- "New sample set…" in the picker lets the user name the set, then shows a two-slot
  assignment view (slot 0 = lo click, slot 1 = hi click).
- **Slot assignment**: tapping an empty slot (or a filled slot to reassign) opens a
  scrollable list of available media pool clips. Tapping a clip assigns it to that slot.
  Tapping outside or pressing Escape cancels. There is no drag-and-drop assignment.
- Once both slots are assigned, the user confirms and the `MediaPoolSampleProvider` is
  constructed, registered, and immediately selectable.

This is enough to make click sounds configurable without a full sample-management
browser. A more complete management panel is a future feature.

---

## Resolved Ambiguities

| Question | Decision |
|---|---|
| YAML vs JSON | YAML is primary; JSON (`.json`) accepted on import by extension; no cross-format fallback |
| YAML parsing mode | Always use `jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA })` — never bare `jsyaml.load()` |
| YAML library | Vendor `js-yaml` UMD in `poc/lib/js-yaml.min.js`; no bundler needed |
| Import file size cap | 1 MB; reject with error toast if exceeded |
| Partial import | Apply only sections present; absent sections leave current state unchanged |
| Invalid `clickProviderRef` | Fall back to `"built-in:default"`; log a console warning |
| Wrong-type field | Hard error; import is rejected |
| Out-of-range scalar | Clamped with a warning; import proceeds |
| Array length mismatch (`beatOffsets` etc.) | Hard error |
| Drop zone | Entire `document`; any `.yaml`/`.yml`/`.json` file |
| Confirmation on import | Shown if any imported value differs from current state; identity uses `===` for scalars, `|a-b| < 1e-6` for floats |
| Context menu on mobile | Long-press ≥ 600 ms with < 20 px movement |
| Paste Config clipboard unavailable | Hide the menu item; no fallback dialog |
| Edit modal z-index | 600 (above fullscreen 100, above knob overlay 500) |
| Global workspace export trigger | Dedicated buttons in a `<header>` element at the top of the page |
| Presets canonical authority | Workspace YAML is the portable canonical form; localStorage is a persistent device-local cache. On workspace import, the imported `presets` section overwrites localStorage |
| Preset count | `MAX_PRESETS = 8` (added to `constants.js`) |
| Preset recall during running metronome | Stop and restart from beat 0 at the new BPM |
| Presets store `clickProviderRef` | Yes — per preset |
| Fallback when sample set clip is missing | Silence for that slot; console warning; no hard error |
| `validateAndApply` no-partial-write | Two-pass: collect + validate fully, then write atomically; errors cancel all writes |
| `validateAndApply` `exactLength` resolution | Named field is looked up in `source`; if missing or invalid, skip the length check (do not error) |
| `getSample()` return type | Always `AudioBuffer | null` — never `undefined`; providers must normalize misses to `null` |
| `BuiltinClickProvider` init timing | Registered at module import; `init(ctx)` called lazily in Start handler before `metronome.start()` |
| `SampleProviderRegistry` test reset | Expose `_reset()` for test teardown only; not part of production API |
| Slot assignment UI | Tap slot → scrollable pool clip list → tap clip to assign; Escape to cancel |
| `snapThreshold` ownership | Formal TempoContext field; serialised in `global` workspace section |
| Accessibility scope for POC | Keyboard nav for modals only (Escape, Ctrl/Cmd+Enter); full proxy/ARIA pattern deferred to `app/` |
| `importConfig()` partial-write safety | Enforced by `validateAndApply` two-pass algorithm |

## Remaining Open Questions

- [ ] Should workspace export include `tunerReference` (A4 Hz)? Not exposed as a control yet.
- [ ] Should the Edit Config modal syntax-highlight the YAML? Not in POC; consider in `app/`.
