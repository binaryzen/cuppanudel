# CompletionReport — 06b Blocking Fixes

```yaml
agent_role: implementation-agent
task_id: 06b-fix-blocking
deliverables:
  - agents/artifacts/06b-fix-report.md
```

## Files Changed

### poc/config/property-mapper.js
**Fix 1 — Separate errors and warnings arrays**

Replaced the single `errors` array with two arrays: `errors` (hard failures: type
mismatches, length violations, required-missing) and `warnings` (clamped values).
Clamped scalar and array element messages are now pushed into `warnings`, not `errors`.
The Pass 2 guard changed from the fragile `errors.every(e => e.includes('clamped'))`
heuristic to a plain `if (errors.length === 0)` check. On success returns `[...warnings]`
(may be non-empty if values were clamped). On hard error returns `[...errors, ...warnings]`
without writing to target. Removes all string-matching heuristics.

All 39 existing property-mapper tests pass. All 5 integration tests pass.

---

### poc/config/sample-provider-registry.js
**Fix 2A — Export `registry` object**

Added `export const registry = { register, get, list, _reset }` so callers using
`import { registry }` receive a valid object. Individual named exports retained for
backward compatibility.

**Fix 2B — Replace prototype-chain `in` with `Map.has()`**

Switched internal store from `const registry = {}` to `const _store = new Map()`.
Updated `register` to use `_store.has(provider.id)`, `get` to use `_store.get(id)`,
`list` to use `[..._store.values()]`, and `_reset` to use `_store.clear()`. Eliminates
the prototype-chain hazard where IDs like `'constructor'` or `'toString'` would falsely
report as already registered.

All 10 existing tests pass. All 4 integration tests pass.

---

### poc/audio/builtin-click-provider.js
**Fix 3 — Fresh OfflineAudioContext per `_synthesizeClick` call**

Changed `_synthesizeClick` to receive `sampleRate` instead of a shared `offlineCtx`.
Each call now creates its own `new OfflineAudioContext(1, frameCount, sampleRate)`
internally. `init()` now passes `ctx.sampleRate` to both calls instead of a shared
context instance. This eliminates the InvalidStateError thrown when `startRendering()`
was called twice on the same context.

---

### poc/config/workspace.js
**Fix 4A — Default `jsyaml` to `window?.jsyaml`**

All five exported functions (`exportWorkspace`, `downloadWorkspace`, `copyWorkspace`,
`importWorkspace`, `registerDropTarget`) now use `jsyaml = window?.jsyaml` as a
default parameter. Callers in main.js that pass no jsyaml argument will use the global
automatically. Tests can still inject a stub as the second argument.

Added defensive checks to `exportWorkspace`: if `jsyaml.dump` is not a function, or if
`components.global.exportConfig` is not a function, logs a clear `console.error` and
returns `null` instead of throwing an uncaught TypeError.

**Fix 4B — Remove double-apply of `importConfig`**

Restructured `importWorkspace` to call `component.importConfig(slice)` exactly once
per section — during the Apply phase only, not during a pre-validation phase. The old
code called `importConfig` during validation (mutating state) and then again on Apply
(double-mutating). The new flow: collect structurally valid sections, show confirmation
dialog if anything differs, then call `importConfig` once per section on confirm.
Validation errors returned from `importConfig` during Apply are shown in the error panel.

**Fix 4C — Defensive check for `components.global.exportConfig`**

Added guard in `exportWorkspace` that returns `null` with a `console.error` if
`components.global.exportConfig` is not a function, preventing an uncaught TypeError
when the wrong shape is passed.

All 4 workspace integration tests pass.

---

### poc/ui/context-menu.js
**Fix 5A — Correct menu item order: Copy, Paste, Edit**

Changed the Paste Config item from being appended immediately inside the
`if (navigator.clipboard?.readText)` block (which caused it to appear before Copy) to
being built into a `let pasteItem = null` variable. Items are now appended in order:
`menu.appendChild(copyItem)`, then `if (pasteItem) menu.appendChild(pasteItem)`, then
`menu.appendChild(editItem)`. Spec order is now correct: Copy Config, Paste Config
(conditional), Edit Config.

**Fix 5B — Append to DOM before viewport clamping**

Moved `document.body.appendChild(menu)` and `currentMenu = menu` to immediately after
the items are appended, before the `getBoundingClientRect()` call. Off-DOM elements
have zero bounding rect; `rect.right`, `rect.bottom`, and `rect.width` were all 0 when
clamping was calculated. The menu is now in the DOM when the rect is read.

All 5 existing context-menu tests pass.

---

### poc/ui/preset-bank.js
**Fix 6A — Remove `MockButton` class**

Removed the 35-line `MockButton` class (function + prototype additions) from the
production module. Also removed the ternary `docRef.createElement ? ... : new MockButton()`
fallback, replacing it with a plain `docRef.createElement('button')` call. Test doubles
belong in test files; the injected `docRef` parameter already provides the testability
hook.

**Fix 6B — Remove `preset-save-mode` class when exiting save mode**

In `updateSlotUI`, for filled slots, the conditional was:
`if (saveMode) classList.add('preset-save-mode')` with no corresponding remove.
Changed to explicitly branch: add the class when `saveMode` is true, remove it when
`saveMode` is false. Class is now always in the correct state after any `render()` call.

All 11 existing preset-bank tests pass. All 4 integration tests pass.

---

### poc/ui/sample-set-picker.js
**Fix 7 — Remove `handleSlotAssignmentEscape` listener on close and dispose**

Added a `slotAssignmentEscapeRegistered` boolean flag to track whether the listener
is registered. `renderSlotAssignment` only registers the listener if not already
registered and sets the flag. `closeDropdown` now removes the listener and clears the
flag when the flag is true. `dispose()` likewise removes the listener if the flag is
set. Eliminates the stale listener accumulation that occurred on every slot-assignment
view open.

---

### poc/main.js
**Fix 8A — Build WorkspaceComponents from raw state**

Added `buildWorkspaceComponents()` function that wraps `tc`, `metronome`, and
`presetStore` into the `WorkspaceComponents` interface shape (`global`, `metronome`,
`sampleSets`, `presets` — each with `exportConfig` and `importConfig` methods).
All calls that previously passed `{ tc, pool, metronome, presetStore }` now use
`buildWorkspaceComponents()`.

**Fix 8B — Replace hand-rolled drop handler with `registerDropTarget`**

Removed the hand-rolled `document.addEventListener('dragover', ...)` and
`document.addEventListener('drop', ...)` block in `initGlobalWorkspace` that
reimplemented workspace drop logic with the wrong `importWorkspace` signature
(missing `filename`, `fileSize`, and `jsyaml`), no size check, and no error toast.
Replaced with a single `registerDropTarget(buildWorkspaceComponents())` call.
Also replaced the hand-rolled export/copy button implementations with calls to
`downloadWorkspace` and `copyWorkspace` from `workspace.js`, and updated the import
to include `downloadWorkspace`, `copyWorkspace`, and `registerDropTarget`.

---

## Test Summary

All tests that could be run in Node.js passed:

| Test file | Result |
|---|---|
| poc/config/property-mapper.test.js | 39/39 pass |
| poc/config/sample-provider-registry.test.js | 10/10 pass |
| poc/ui/preset-bank.test.js | 11/11 pass |
| poc/ui/context-menu.test.js | 3/3 pass |
| poc/tests/property-mapper.test.js | 5/5 pass |
| poc/tests/sample-provider-registry.test.js | 4/4 pass |
| poc/tests/preset-bank.test.js | 4/4 pass |
| poc/tests/preset-store.test.js | 4/4 pass |
| poc/tests/context-menu.test.js | 2/2 pass |
| poc/tests/workspace.test.js | 4/4 pass |
| poc/tests/builtin-click-provider.test.js | 3/3 pass (OfflineAudioContext skipped in Node) |

Note: `poc/tests/sample-set-picker.test.js` has a pre-existing failure introduced by
a different agent's modification that adds `_children` tracking requirements to the
mock DOM that the mock does not implement. The original unmodified test passes cleanly.
My changes to `sample-set-picker.js` do not introduce any new test failures.
