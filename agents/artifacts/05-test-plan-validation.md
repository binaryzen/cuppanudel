# TestPlan Validation — Task 05

## Summary

The TestPlan covers all 24 components with 44 test cases (43 integration + 1 unit), is
consistently deterministic (all non-deterministic I/O is mocked), and demonstrates good
structural judgment in focusing on cross-component contracts rather than re-testing
internals. However, two test cases contain factually wrong expected outputs that contradict
the ComponentDefinition specs (tc-030, tc-034), and there are significant coverage gaps
across nearly every component: success and failure criteria that no test case exercises.
The plan is not ready for Phase 2 until the two blocking findings are resolved and the
advisory gaps are addressed or explicitly deferred.

---

## Per-Test-Case Findings

| Test ID | Deterministic | Coverage | Relevance | Finding |
|---------|:------------:|:--------:|:---------:|---------|
| tc-001  | ✅ | ✅ | ✅ | none — self-check exercises async path, return shape, and counting |
| tc-002  | ✅ | ✅ | ✅ | none — atomic write + required field failure is the core contract |
| tc-003  | ✅ | ✅ | ✅ | none — clamping with warning, not error, is a key distinction |
| tc-004  | ✅ | ✅ | ✅ | none — exactLength cross-field validation |
| tc-005  | ✅ | ⚠️ | ✅ | Advisory: checks 3 fields but does not verify beatOffsets or beatVolumes defaults |
| tc-006  | ✅ | ⚠️ | ✅ | Advisory: does not verify beatOffsets/beatVolumes are reset by setBeatsPerMeasure (success_criteria lines 6–7 in timing-tempo-context-additions) |
| tc-007  | ✅ | ✅ | ✅ | none — pre-init null return + console.error |
| tc-008  | ✅ | ⚠️ | ✅ | Advisory: does not verify getSample(-1) returns null, or that getSample(0) !== getSample(1) (different instances), or numberOfChannels===1 |
| tc-009  | ✅ | ✅ | ✅ | none — idempotent init via buffer identity |
| tc-010  | ✅ | ⚠️ | ✅ | Advisory: does not verify that re-registering 'built-in:default' after _reset() does not throw (success_criteria line 8) |
| tc-011  | ✅ | ⚠️ | ✅ | Advisory: does not test register(provider) where provider has no id property throws TypeError (failure_criteria line 3) |
| tc-012  | ✅ | ✅ | ✅ | none — snapshot array isolation |
| tc-013  | ✅ | ✅ | ✅ | none — getSample index routing via beatAccents |
| tc-014  | ✅ | ✅ | ✅ | none — beatVolumes < 0.01 silences beat |
| tc-015  | ✅ | ✅ | ✅ | none — null getSample() graceful degradation |
| tc-016  | ✅ | ⚠️ | ✅ | Advisory: does not verify restart() when stopped behaves identically to start() (success_criteria line 9); does not verify isRunning() state transitions |
| tc-017  | ✅ | ✅ | ✅ | none — playhead BPM-change invariance |
| tc-018  | ✅ | ✅ | ✅ | none — TypeError on missing clickProvider |
| tc-019  | ✅ | ⚠️ | ✅ | Advisory: does not test confirmation dialog suppressed when all values equal (success_criteria line 8 in config-workspace); does not test unknown top-level keys are silently ignored (success_criteria line 10) |
| tc-020  | ✅ | ✅ | ✅ | none — 1 MB size cap |
| tc-021  | ✅ | ✅ | ✅ | none — parser selection by filename extension |
| tc-022  | ✅ | ⚠️ | ✅ | Advisory: does not test jsyaml.load throwing on malformed YAML → error toast, does not test missing section leaving current state untouched (success_criteria line 4), does not test validateAndApply errors preventing importConfig calls (success_criteria line 7) |
| tc-023  | ✅ | ⚠️ | ✅ | Advisory: does not test Escape closes menu, outside-click closes, dispose() removes listeners, opening second menu closes first, Copy Config clipboard write failure shows toast; tests only the clipboard-unavailable hide path — not the NotAllowedError thrown path |
| tc-024  | ✅ | ⚠️ | ✅ | Advisory: does not test importConfig returning errors shows inline banner without closing menu (success_criteria line 11 in ui-context-menu) |
| tc-025  | ✅ | ✅ | ✅ | none — singleton enforcement |
| tc-026  | ✅ | ⚠️ | ✅ | Advisory: does not test Cancel closes without calling importConfig, Escape = Cancel, Ctrl+Enter triggers Apply, Copy writes to clipboard, isOpen() state transitions, z-index ≥ 600, parse error shown inline without closing modal |
| tc-027  | ✅ | ✅ | ✅ | none — empty initial state |
| tc-028  | ✅ | ⚠️ | ✅ | Advisory: does not test register(provider) with no id property throws TypeError, or that providers getter returns a new array each access and mutation does not affect state |
| tc-029  | ✅ | ⚠️ | ✅ | Advisory: does not test import(item, ctx) success path, import() rejection on corrupt audio, FSAA fallback to hidden input when showOpenFilePicker unavailable, ContentItem label/sizeHint/mimeType population |
| tc-030  | ✅ | ❌ | ✅ | **BLOCKING** — wrong expected output: when pool.getBuffer() returns undefined, recordings-provider.import() must REJECT with Error('RecordingsProvider: buffer not found for id <id>'), not resolve with null. The test asserts getSample(index) but the failure_criteria applies to import(), not getSample(). The scenario described (buffer not found) maps to the failure_criteria that requires rejection; the test says "getSample returns null" which mixes up the SampleProvider interface with the ContentProvider interface. |
| tc-031  | ✅ | ✅ | ✅ | none — documents return-type contract |
| tc-032  | ✅ | ⚠️ | ✅ | Advisory: does not test getSample(-1) returns null, getSample(index) when no slot with that index returns null, count() return value, or createMediaPoolSampleProvider called with undefined required param throws TypeError |
| tc-033  | ✅ | ✅ | ✅ | none — synchronous init() contract |
| tc-034  | ✅ | ❌ | ✅ | **BLOCKING** — wrong expected output: test states "Picker calls registry.register(provider)" and "Updates tc.clickProviderRef = provider.id", but the ui/sample-set-picker ComponentDefinition explicitly excludes "Creating or registering the MediaPoolSampleProvider instance" from its scope and defines the ProviderChangeCallback as receiving (selectedId, newProvider) for the caller (main.js) to handle registration. The picker calls onProviderChange, not registry.register. The test asserts behavior that belongs to main.js, not the picker, and would cause a test to pass for the wrong reason or fail on a correct implementation. |
| tc-035  | ✅ | ⚠️ | ✅ | Advisory: does not test clear(index), save(index) with out-of-bounds index throws RangeError, createPresetStore() with malformed localStorage JSON resets to null slots, storageAvailable is false when localStorage throws, save() when storageAvailable is false does not throw |
| tc-036  | ✅ | ⚠️ | ✅ | Advisory: does not test importConfig with presets array of wrong length returns error (failure_criteria line 3 in config-preset-store) |
| tc-037  | ✅ | ⚠️ | ✅ | Advisory: does not test save mode (click Save button → slot write → exit save mode), empty slot in normal mode is no-op, save mode and recall are mutually exclusive (clicking slot in save mode does not trigger recall), snapshotFrom(tc) includes clickProviderRef, render() updates labels without re-creating DOM buttons |
| tc-038  | ✅ | ✅ | ✅ | none — conditional restart |
| tc-039  | ✅ | ✅ | ✅ | none — scroll derivation from scheduler variables |
| tc-040  | ✅ | ✅ | ✅ | none — no Float32Array allocation in RAF loop |
| tc-041  | ✅ | ⚠️ | ✅ | Advisory: does not test init() rejection error path (failure_criteria line 1 in poc-main-js-refactor: Start button shows error and re-enables on init rejection) |
| tc-042  | ✅ | ⚠️ | ✅ | Advisory: does not test canvas guard (failure_criteria line 3: console.error if alignment monitor canvas id is wrong) |
| tc-043  | ✅ | ✅ | ✅ | none — workspace export/copy button wiring |
| tc-044  | ✅ | ✅ | ✅ | none — drop target wiring |

---

## Coverage Gaps

The following success/failure criteria in ComponentDefinitions are not covered by any test case:

### config/property-mapper
- Success: type mismatch returns error `'<key>: expected <type>, got <actualType>'` (string where int expected)
- Success: exactLength referencing a field absent in source skips length check silently (no error for array field)
- Success: no partial write when one field is bad and another is valid (atomic across partial errors — tc-002 only tests required, not type-mismatch + valid sibling)
- Success: array element clamping writes `target.arr=[0.5,1.0]` and returns `['arr[1]: 1.5 out of range...']`
- Success: `serialize({key:'bpm',default:120}, {})` returns `{bpm:120}` (default filling)
- Success: `serialize({key:'bpm',default:120}, {bpm:90})` returns `{bpm:90}` (value override)
- Success: serialize omits extra keys not in schema
- Failure: array element error format must be `'<key>[<index>]: ...'`

### timing/tempo-context-additions
- Success: `setBeatsPerMeasure(tc, 3)` sets beatOffsets to [0, 0.333..., 0.666...]
- Success: `setBeatsPerMeasure(tc, 3)` sets beatVolumes to [1, 1, 1]
- Success: `setBeatsPerMeasure(tc, 1)` sets beatAccents to [true]

### audio/builtin-click-provider
- Success: `getSample(-1)` returns null after init()
- Success: `getSample(0)` and `getSample(1)` return different AudioBuffer instances
- Success: returned AudioBuffer for index 0 is mono (numberOfChannels === 1)
- Failure: if ctx.createBuffer or rendering throws during init(), init() must reject with the original error

### config/sample-provider-registry
- Success: after `_reset()`, re-registering 'built-in:default' does not throw
- Failure: `register(provider)` where provider has no id throws `TypeError('SampleProviderRegistry: provider must have an id')`
- Failure: `get(id)` for an unregistered id returns undefined (not null, not throws)

### timing/metronome-refactor
- Success: `isRunning()` returns false before start(), true after start(), false after stop()
- Success: `restart()` called while stopped behaves identically to start() from beat 0
- Failure: if getSample() returns undefined (not null), logs `console.warn('getSample returned undefined; provider should return null')` but does not crash
- Failure: `playClick()` must not exist after refactor

### config/workspace
- Success: missing section leaves current state untouched
- Success: all imported values equal current state → applies without confirmation dialog
- Success: any imported value differs → shows confirmation dialog; Cancel returns false without calling importConfig
- Success: validateAndApply returning errors shows error panel listing each error string, returns false without calling any importConfig
- Success: unknown top-level YAML keys are ignored
- Success: version field not 1 logs console.warn but import proceeds
- Failure: jsyaml.load throwing on malformed YAML shows error toast, returns false (not rethrow)
- Failure: JSON.parse throwing shows error toast, returns false

### ui/context-menu
- Success: Escape closes menu
- Success: clicking outside closes menu
- Success: `dispose()` removes listeners so right-click no longer opens menu
- Success: opening second menu closes first
- Success: importConfig returning errors shows inline error banner without closing menu
- Success: long-press > 20 px movement does NOT open menu
- Failure: if clipboard.writeText fails for Copy Config, surfaces as brief error toast
- Failure: long-press must not trigger native context menu (event.preventDefault() on contextmenu)

### ui/edit-config-modal
- Success: Cancel closes without calling importConfig
- Success: Escape closes (same as Cancel)
- Success: Ctrl+Enter triggers Apply
- Success: Cmd+Enter triggers Apply
- Success: Copy writes textarea to clipboard
- Success: `isOpen()` state transitions
- Success: `open()` while already open replaces component and refreshes textarea
- Failure: jsyaml.load throwing on malformed textarea shows parse error inline, keeps modal open
- Failure: clipboard.writeText fail for Copy surfaced as inline notification
- Failure: z-index must be ≥ 600

### config/content-service
- Failure: `register(provider)` where provider has no id throws `TypeError('ContentService: provider must have an id')`
- Success: providers getter returns a new array each access; mutation does not affect registry

### audio/local-file-provider
- Success: `browse()` resolves to ContentItem[] where `entry.label === file.name`
- Success: `browse()` resolves to ContentItem[] where `entry.sizeHint === file.size`
- Success: `import(item, ctx)` for a valid WAV resolves to AudioBuffer
- Success: `import(item, ctx)` for a corrupt file rejects with DOMException
- Success: FSAA fallback to hidden `<input type="file">` when showOpenFilePicker is unavailable
- Failure: `import()` must never return undefined — resolves with AudioBuffer or rejects

### audio/recordings-provider
- tc-030 (blocking, see above): the import() rejection path is misrepresented
- Success: `browse()` on a pool with 3 clips returns ContentItem[] of length 3
- Success: `browse()` returns snapshot — mutations do not affect pool.clips
- Success: `import(item, ctx)` for item whose _bufferId is in pool resolves within one microtask

### audio/media-pool-sample-provider
- Success: `getSample(-1)` returns null
- Success: `getSample(index)` when no slot with that index returns null
- Success: `count()` returns number of slot assignments
- Failure: `createMediaPoolSampleProvider` with undefined required param throws TypeError with descriptive message

### ui/sample-set-picker
- tc-034 (blocking, see above): picker does not call registry.register() directly
- Success: unregistered clickProviderRef shows fallback label rather than crashing
- Success: cancelling name prompt returns UI to previous state with no side effects
- Success: confirm button disabled until both slots are assigned
- Failure: slot assignment must show only clips from pool.clips — must not crash on empty pool

### config/preset-store
- Success: `clear(0)` sets slot 0 to null and persists
- Success: `load()` always returns exactly 8 entries
- Success: `storageAvailable` returns false when localStorage.setItem throws
- Success: `save()` when storageAvailable is false operates only in-memory (no throw)
- Failure: `save(index)` with out-of-bounds index throws RangeError
- Failure: malformed localStorage JSON on createPresetStore() resets to 8 null slots, logs console.warn
- Failure: importConfig with wrong-length presets array returns error, does not partially apply

### ui/preset-bank
- Success: save mode — clicking Save button highlights all slots
- Success: in save mode, clicking slot 3 calls store.save(3, snapshot) then exits save mode
- Success: clicking empty slot in normal mode is a no-op
- Success: clicking slot in save mode must not trigger recall
- Success: `render()` updates labels without re-creating DOM buttons
- Success: Save button is disabled when store.storageAvailable is false
- Failure: if metronome is null, applyPreset must not throw
- Failure: snapshotFrom(tc) must include clickProviderRef

### visualizers/alignment-monitor
- Success: `ALIGN_MEASURES` exported constant equals 2
- Success: `reset()` zeroes ring buffer and clears canvas
- Success: draw() does not throw when isRunning is false (clears canvas)
- Failure: if canvas.width is 0, draw() returns without error (no division-by-zero)

### poc/main.js-refactor
- Failure: if builtinClickProvider.init() rejects, Start button shows error and re-enables
- Failure: guard against null canvas passed to createAlignmentMonitor (console.error)

---

## Verdict

```yaml
verdict: needs-revision
findings:
  - test_id: tc-030
    issue: wrong-target
    description: >
      RecordingsProvider is a ContentProvider, not a SampleProvider. The test calls
      getSample(index), which does not exist on ContentProvider. The failure scenario
      described — pool.getBuffer() returning undefined — maps to import(), not browse().
      The ComponentDefinition failure_criteria explicitly requires import() to REJECT
      with Error('RecordingsProvider: buffer not found for id <id>') when the buffer is
      missing; the test asserts it resolves with null, which is the opposite of the
      specified contract. A correct implementation would fail this test; an incorrect one
      would pass it.
    severity: blocking

  - test_id: tc-034
    issue: wrong-target
    description: >
      The test asserts "Picker calls registry.register(provider)" and
      "Updates tc.clickProviderRef = provider.id". Both behaviors are explicitly out of
      scope for ui/sample-set-picker: the ComponentDefinition scope.excludes states
      "Creating or registering the MediaPoolSampleProvider instance — that is the
      responsibility of the onProviderChange callback in main.js". The picker's contract
      is to call onProviderChange(selectedId, newProvider); the caller (main.js tc-042)
      handles registration and tc update. The test would cause a correct picker
      implementation to fail.
    severity: blocking

  - test_id: tc-005
    issue: missing
    description: >
      Does not verify beatOffsets or beatVolumes defaults on the returned TempoContext,
      which are success criteria in timing/tempo-context-additions.
    severity: advisory

  - test_id: tc-006
    issue: missing
    description: >
      Does not verify that setBeatsPerMeasure resets beatOffsets to even spacing and
      beatVolumes to all 1.0 — these are explicit success_criteria (lines 6–7).
    severity: advisory

  - test_id: tc-008
    issue: missing
    description: >
      Does not verify getSample(-1) returns null, getSample(0) !== getSample(1)
      (different instances), or numberOfChannels === 1 for the returned buffer.
    severity: advisory

  - test_id: tc-022
    issue: missing
    description: >
      Covers only the happy-path YAML export but not the failure paths for
      importWorkspace (malformed YAML/JSON → error toast, validateAndApply errors
      blocking importConfig, missing sections leaving current state untouched).
    severity: advisory

  - test_id: tc-023
    issue: missing
    description: >
      Does not test Escape, outside-click, dispose(), opening second menu closes first,
      or Copy Config clipboard write failure toast — all are success/failure criteria.
    severity: advisory

  - test_id: tc-026
    issue: missing
    description: >
      Covers only the Apply + error path. Missing: Cancel, Escape, Ctrl+Enter, Copy
      action, isOpen() transitions, z-index constraint, and parse error inline display.
    severity: advisory

  - test_id: tc-037
    issue: missing
    description: >
      Covers only the recall-while-running path. Missing: save mode entry, save mode
      slot write, save/recall mutual exclusivity, empty slot no-op, render() without
      DOM re-creation, snapshotFrom including clickProviderRef.
    severity: advisory
```

---

## Coordinator Notes

**Blocking issues for Testing Agent (revise before Phase 2):**

1. **tc-030**: Replace with two separate test cases: (a) `browse()` returns snapshot
   array of length matching pool.clips; (b) `import()` where pool.getBuffer() returns
   undefined rejects with `Error('RecordingsProvider: buffer not found for id <id>')`.
   Remove any reference to `getSample()` — that method does not exist on ContentProvider.

2. **tc-034**: Rewrite to test only what the picker is responsible for: that on
   confirmation, `onProviderChange(selectedId, newProvider)` is called with the correct
   arguments. Do not assert that the picker itself calls `registry.register()` or modifies
   `tc.clickProviderRef`. Those behaviors belong to tc-042 (main.js wiring test).

**Advisory gap guidance:**

The advisory gaps are extensive and touch almost every component. The Testing Agent
should either (a) add supplementary test cases addressing the most critical failure
criteria paths, or (b) explicitly call each uncovered criterion out in coverage_gaps
with rationale for deferral (e.g., "covered by unit tests in IA deliverable"). The
current coverage_gaps section only documents HTML-only and browser-API exclusions, not
the JS-logic criteria that are currently unaddressed.

Priority advisory items to address:
- Property-mapper: `serialize()` function has no test coverage at all.
- Edit-config-modal: Cancel, Escape, and malformed YAML parse error path are all
  failure criteria with no test coverage.
- Preset-store: RangeError on bad index and malformed localStorage recovery are
  failure criteria with no test coverage.
- Preset-bank: save mode and the snapshotFrom clickProviderRef inclusion have no
  test coverage and are both explicitly called out as failure criteria.
```
