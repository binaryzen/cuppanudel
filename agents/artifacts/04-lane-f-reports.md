# Lane-f Implementation Report

**Lane**: lane-f (Tempo Presets)
**Status**: COMPLETED
**Date**: 2026-06-03

---

## Components Implemented

### 1. Constants Addition: `MAX_PRESETS`

**File**: `/home/user/cuppanudel/poc/constants.js`

**Changes**:
- Added `export const MAX_PRESETS = 8;` to define the preset slot count

**Status**: ✓ Complete

---

### 2. Config Module: `config/preset-store.js`

**File**: `/home/user/cuppanudel/poc/config/preset-store.js`

**Responsibility**: localStorage-backed preset store with graceful degradation.

**Key Features**:
- Reads/writes presets to `localStorage` under key `cuppanudel.presets.v1`
- Provides in-memory fallback when localStorage is unavailable (private browsing, quota exceeded)
- MAX_PRESETS = 8 slots per store (indices 0–7)
- `save(index, snapshot)` persists a TempoContext snapshot; throws RangeError on invalid index
- `load()` returns current in-memory array (always 8 entries, null for empty slots)
- `clear(index)` removes a preset
- `replaceAll(presetsArray)` atomically overwrites all slots (used by workspace import)
- `exportConfig()` returns { presets: [...] } for workspace serialization
- `importConfig(obj)` validates and applies imported presets; returns error strings
- `storageAvailable` getter indicates whether localStorage is usable

**Error Handling**:
- Malformed localStorage JSON → logs console.warn, resets to 8 null slots (no throw)
- Unavailable storage → silently operates in-memory only (no throw)
- Invalid index in save/clear → throws RangeError
- Wrong-length presets in importConfig → returns error string (does not partially apply)
- Missing required fields in preset entries → returns error strings

**Test Coverage**: 14 tests, all passing
- Initialization (empty, from localStorage)
- Save/persist/clear operations
- Storage availability detection
- Graceful degradation (malformed JSON, unavailable storage)
- Import/export with validation

**Status**: ✓ Complete

---

### 3. UI Component: `ui/preset-bank.js`

**File**: `/home/user/cuppanudel/poc/ui/preset-bank.js`

**Responsibility**: 8-slot horizontal preset bank UI in the metro panel.

**Key Features**:
- `createPresetBank(container, store, tc, metronome, docRef)` factory
  - Accepts optional `docRef` parameter for test compatibility
  - Renders 8 slot buttons into the container
  - Attaches event handlers for slot clicks and Save button
  - Returns controller with `render()` and `dispose()` methods

- **UI States**:
  - Normal mode: clicking filled slot recalls preset; clicking empty slot is no-op
  - Save mode: clicking any slot saves current tc snapshot and exits save mode
  - Save button shows save mode activation and is disabled when storage unavailable

- **Preset Application** (`applyPreset`):
  - Writes all tc fields (bpm, beatsPerMeasure, beatOffsets, beatVolumes, beatAccents, clickProviderRef)
  - If metronome is running: calls `metronome.restart()` (stop + start from beat 0)
  - If metronome is stopped/null: only writes tc (no restart)

- **Snapshot Building** (`snapshotFrom`):
  - Creates a preset snapshot from current tc
  - Includes all required fields: name, bpm, beatsPerMeasure, beatOffsets, beatVolumes, beatAccents, clickProviderRef
  - Exported for testing

- **Slot Display**:
  - Empty slots show "—"
  - Filled slots show preset name (truncated to 10 chars in button, full name in title/tooltip)
  - Visual feedback: save-mode-highlighted slots, filled/empty styling

**Test Coverage**: 11 tests, all passing
- Rendering 8 buttons
- Empty and filled slot display
- Save mode toggle and snapshot saving
- Preset recall (filled/empty slots)
- Metronome integration (running vs stopped)
- Null metronome handling
- DOM updates without recreation
- snapshotFrom includes clickProviderRef (critical per spec tc-053)

**Status**: ✓ Complete

---

### 4. HTML Snippet: `index-html-preset-bank-dom.html`

**File**: `/home/user/cuppanudel/poc/index-html-snippets/index-html-preset-bank-dom.html`

**Content**:
```html
<!-- Preset Bank DOM Elements (lane-f: ui/preset-bank)
     Location: inside the metro panel, below the beat grid
     These elements are consumed by poc/ui/preset-bank.js to render the preset slot bank.
-->

<div id="preset-bank-container"></div>
<button id="preset-save-btn">Save Preset</button>
```

**Element IDs** (consumed by main.js and ui/preset-bank):
- `preset-bank-container`: injection point for dynamically rendered slot buttons
- `preset-save-btn`: Save button to toggle save mode

**Location**: Inside metro panel, below beat grid (to be assembled by lane-wire)

**Status**: ✓ Complete

---

## Design Validation Cross-Reference

Per `03-design-validation.md`:

**Finding**: `config/preset-store` (no-issue)
- ✓ MAX_PRESETS = 8 explicitly captured
- ✓ localStorage key `cuppanudel.presets.v1` captured
- ✓ Graceful degradation (storageAvailable getter, in-memory fallback)
- ✓ Malformed JSON handled gracefully (console.warn, reset to nulls, no throw)
- ✓ Workspace import overwrites localStorage (portable YAML is canonical)
- ✓ must_not_require constraints satisfied

**Finding**: `ui/preset-bank` (blocking spec-mismatch, RESOLVED)
- Original concern: ambiguity about `metronome.restart()` semantics
- Resolution: Confirmed that `restart()` in timing/metronome-refactor is defined as:
  "Equivalent to stop() + start() from beat 0, re-reading current tc values at call time"
- ✓ This matches spec requirement: "stop immediately, apply new config, restart from beat 0"
- ✓ Implementation calls `metronome.restart()` after writing tc fields ✓

**Finding**: `index-html-preset-bank-dom` (no-issue)
- ✓ Elements `preset-bank-container` and `preset-save-btn` specified
- ✓ Within metro panel (location comment included)
- ✓ Slot buttons intentionally NOT included (rendered dynamically by ui/preset-bank)

---

## Test Results Summary

### preset-store.test.js
```
Tests: 14 passed, 0 failed, 14 total
```

All edge cases covered:
- Empty localStorage initialization
- Loading existing presets
- Save/persist to localStorage
- Clear operations
- replaceAll atomicity
- Out-of-bounds index detection (RangeError)
- exportConfig/importConfig
- Storage availability detection
- In-memory fallback when storage unavailable
- Graceful handling of malformed JSON

### preset-bank.test.js
```
Tests: 11 passed, 0 failed, 11 total
```

All state machines and integration paths covered:
- Button rendering (8 slots)
- Empty/filled slot display
- Save mode toggle
- Preset snapshot saving
- Preset recall with metronome running/stopped
- Null metronome safety
- DOM update without recreation
- **Critical**: snapshotFrom includes clickProviderRef (per test tc-053 requirement)

---

## Integration Points

### With lane-b (timing)
- Consumes `metronome.isRunning()`, `metronome.restart()`
- Reads/writes `tc.bpm`, `tc.beatsPerMeasure`, `tc.beatOffsets`, `tc.beatVolumes`, `tc.beatAccents`, `tc.clickProviderRef`
- Requires that `restart()` semantics are: stop() + start() from beat 0 ✓

### With lane-a (config)
- Uses `validateAndApply` from property-mapper for preset validation
- Uses `serialize` pattern for import/export (not currently, but follows the pattern)

### With lane-wire (main.js)
- Expects main.js to:
  - Call `createPresetStore(localStorage)` with real localStorage reference
  - Call `createPresetBank(container, store, tc, metronome)` to initialize UI
  - Find `preset-bank-container` and `preset-save-btn` by ID
  - Potentially call `preset-bank.render()` if tc changes externally

### With workspace (lane-c)
- `preset-store.exportConfig()` provides presets section for workspace export
- `preset-store.importConfig()` applies imported presets section (overwrites localStorage)

---

## Deployment Checklist

- [x] `poc/constants.js` updated with MAX_PRESETS
- [x] `poc/config/preset-store.js` created and tested
- [x] `poc/config/preset-store.test.js` created (14 tests, all passing)
- [x] `poc/ui/preset-bank.js` created and tested
- [x] `poc/ui/preset-bank.test.js` created (11 tests, all passing)
- [x] `poc/index-html-snippets/index-html-preset-bank-dom.html` created
- [x] All ComponentDefinition requirements met
- [x] All DesignValidation blocking findings resolved
- [x] Test coverage: 25 tests total, 25 passing, 0 failing

---

## Known Limitations & Future Work

1. **Preset name editing**: POC does not support inline rename. Names are only set during Save mode. Future app/ work should add a dedicated preset-rename UI.

2. **No ARIA/keyboard navigation**: Deferred to app/. POC uses basic click handlers.

3. **No preset metadata**: Loop points, descriptions, tags deferred to future versions.

4. **Test environment**: preset-bank.js accepts optional `docRef` parameter for testing without browser DOM. Production uses default `document` global.

---

## Files Delivered

1. `/home/user/cuppanudel/poc/constants.js` (updated)
2. `/home/user/cuppanudel/poc/config/preset-store.js` (new)
3. `/home/user/cuppanudel/poc/config/preset-store.test.js` (new)
4. `/home/user/cuppanudel/poc/ui/preset-bank.js` (new)
5. `/home/user/cuppanudel/poc/ui/preset-bank.test.js` (new)
6. `/home/user/cuppanudel/poc/index-html-snippets/index-html-preset-bank-dom.html` (new)

All files follow project conventions (ES modules, named exports, zero npm dependencies).

---

## Completion Status

**LANE-F IMPLEMENTATION COMPLETE**

All three lane-f components are fully implemented, tested, and ready for lane-wire integration.
