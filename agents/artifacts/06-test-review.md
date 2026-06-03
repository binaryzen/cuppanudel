---
# TestReview — Cuppanudel Test Suite
# Produced by: Staff Engineer (task 06)
# Reviewed: TestPlan (05-test-plan.md), all integration tests in poc/tests/, all unit tests co-located with source

---

## TestReview Artifact

```yaml
test_cases_reviewed:
  - tc-001
  - tc-002
  - tc-003
  - tc-004
  - tc-005
  - tc-006
  - tc-007
  - tc-008
  - tc-009
  - tc-010
  - tc-011
  - tc-012
  - tc-013
  - tc-014
  - tc-015
  - tc-016
  - tc-017
  - tc-018
  - tc-019
  - tc-020
  - tc-021
  - tc-022
  - tc-023
  - tc-024
  - tc-025
  - tc-026
  - tc-027
  - tc-028
  - tc-029
  - tc-030a
  - tc-030b
  - tc-031
  - tc-032
  - tc-033
  - tc-034
  - tc-035
  - tc-036
  - tc-037
  - tc-038
  - tc-039
  - tc-040
  - tc-041
  - tc-042
  - tc-043
  - tc-044
  - tc-045
  - tc-046
  - tc-047
  - tc-048
  - tc-049
  - tc-050
  - tc-051
  - tc-052
  - tc-053

findings:

  # ─── tc-001: test-runner self-check ────────────────────────────────────────

  - test_id: tc-001
    issue: other
    description: >
      The self-test in poc/test/runner.test.js is well-structured and exercises
      all stated harness contracts (PASS/FAIL logging, async support, returned summary
      counts, AssertionError identity). No issues found. Determinism is solid — no
      external I/O, all output captured via console.log mock that is always restored.
    severity: advisory

  # ─── tc-002 through tc-004, tc-045, tc-046: config/property-mapper ─────────

  - test_id: tc-002
    issue: other
    description: >
      Integration test (poc/tests/property-mapper.test.js) correctly tests the
      two-pass atomic write contract. The assertions verify both the error message
      content and the absence of mutations on target. No issues. The co-located unit
      test suite (poc/config/property-mapper.test.js) is extremely thorough — covers
      type checking, clamping, exactLength, minLength/maxLength, NaN, bool[], int[],
      float[], atomic writes, serialize defaults, and key filtering.
    severity: advisory

  - test_id: tc-003
    issue: other
    description: >
      Correctly tests clamping with warning semantics. Both the integration test and
      co-located unit test cover clamping for scalars and array elements.
    severity: advisory

  - test_id: tc-004
    issue: other
    description: >
      Correctly tests exactLength reference validation. The atomicity assertion
      (target.bpm should not be set) is present and correct.
    severity: advisory

  - test_id: tc-045
    issue: other
    description: >
      serialize() default-filling test is clean and deterministic. Verified against
      component definition requirement.
    severity: advisory

  - test_id: tc-046
    issue: other
    description: >
      serialize() source-value-over-default and extra-key-omission test is correct.
    severity: advisory

  # ─── tc-005, tc-006: timing/tempo-context-additions ────────────────────────

  - test_id: tc-005
    issue: other
    description: >
      Integration and co-located unit tests both cover createTempoContext() field
      defaults (clickProviderRef, snapThreshold, beatAccents). Deterministic; no
      external I/O.
    severity: advisory

  - test_id: tc-006
    issue: other
    description: >
      Tests setBeatsPerMeasure() with preservation of clickProviderRef and
      snapThreshold. Co-located unit test adds coverage for different N values
      (1, 3, 5). No issues.
    severity: advisory

  # ─── tc-007 through tc-009: audio/builtin-click-provider ───────────────────

  - test_id: tc-007
    issue: wrong-target
    description: >
      The integration test in poc/tests/builtin-click-provider.test.js does NOT
      import and test the actual builtinClickProvider module for tc-007. Instead it
      creates a hand-written mock object that reimplements the provider behaviour and
      tests the mock against itself. This test never touches the real module code path
      and cannot catch regressions in the actual implementation. The co-located unit
      test (poc/audio/builtin-click-provider.test.js) does test the real module for
      this behaviour, but the integration test as written exercises only its own
      inline mock — it is testing the wrong target.

      The plan specifies: "provider = builtinClickProvider (freshly imported, not yet
      initialized) / Call getSample(0) before init()". The real module is imported at
      line 9 of the integration test file but is only used in tc-008 and tc-009; tc-007
      bypasses it entirely.
    severity: blocking

  - test_id: tc-008
    issue: non-deterministic
    description: >
      The integration test silently passes (returns) when OfflineAudioContext is
      unavailable (Node.js environment), with no indication that the test was skipped.
      The runner records it as PASS. This means the suite can report 100% passing
      while tc-008's assertions were never evaluated. The test plan specifies using
      "OfflineAudioContext (deterministic)" as the mock — but the co-located unit test
      uses a hand-crafted mock AudioContext that works in Node.js. The integration test
      should use the same approach, or explicitly mark itself as skipped so CI output
      is not misleading.

      Additionally, the test mutates module-level state (builtinClickProvider._buffers,
      builtinClickProvider._initialized) directly, which will affect tc-009 if test
      execution order changes. The co-located unit test has the same concern but does it
      consistently. Given both tc-008 and tc-009 reset those fields at the start of each
      test, ordering risk is managed — but the practice is fragile.
    severity: advisory

  - test_id: tc-009
    issue: non-deterministic
    description: >
      Same silent-skip issue as tc-008 when OfflineAudioContext is unavailable. The
      test records PASS without executing any assertions.
    severity: advisory

  # ─── tc-010 through tc-012: config/sample-provider-registry ────────────────

  - test_id: tc-010
    issue: other
    description: >
      Tests auto-registration of built-in:default at import time. Both integration and
      co-located unit tests cover this. No issues with determinism.
    severity: advisory

  - test_id: tc-011
    issue: other
    description: >
      The integration test splits tc-011 into two sub-tests (tc-011 and tc-011b).
      The duplicate-id throw is correctly tested. The _reset() semantics are also
      covered. The co-located unit test additionally validates TypeError identity and
      re-registration after _reset(). No issues.
    severity: advisory

  - test_id: tc-012
    issue: other
    description: >
      Snapshot semantics test is correct. The mutation-after-list() check properly
      demonstrates that internal registry state is unaffected.
    severity: advisory

  # ─── tc-013 through tc-018: timing/metronome-refactor ──────────────────────

  - test_id: tc-013
    issue: non-deterministic
    description: >
      The integration test (poc/tests/metronome.test.js) silently skips when
      OfflineAudioContext is unavailable, just as tc-008/tc-009. It reports PASS
      without executing assertions. Additionally, the core assertion relies on the
      lookahead scheduler firing at least twice during the synchronous metro.start()
      call — the call log is checked immediately after metro.start() returns. This is
      sound because the scheduler is driven by setInterval and start() populates the
      initial lookahead window synchronously. However, the assertion
      "callLog.length >= 2" is necessary but not tight enough: it does not verify
      that beats after the initial window also use the correct sample index mapping.
      The co-located unit test (poc/timing/metronome-refactor.test.js) covers this
      more robustly by also testing accent/non-accent getSample index mapping.
    severity: advisory

  - test_id: tc-014
    issue: wrong-target
    description: >
      The integration test for tc-014 checks only that beat 0 (volume 1.0) schedules
      by asserting callLog has at least one entry. It does NOT verify that beats 1 and
      2 (volumes 0.0 and 0.005) are absent from the scheduled output. The test plan
      specifies: "Beat 1 (volume 0.0): No AudioBufferSourceNode created / Beat 2
      (volume 0.005): No AudioBufferSourceNode created." These negative assertions are
      missing. The test only confirms that some scheduling happened, not that the volume
      threshold silences the correct beats. The co-located unit test has the same gap
      (it only asserts isRunning() === true). Neither test verifies the negative case.

      The ComponentDefinition success criteria state: "Given tc.beatVolumes=[1.0, 0.0],
      beat 1 creates no AudioBufferSourceNode even if getSample returns a valid buffer."
      This criterion is not tested by either file.
    severity: blocking

  - test_id: tc-015
    issue: non-deterministic
    description: >
      Silent-skip when OfflineAudioContext unavailable. Additionally the assertion
      checks "errors[0].includes('metronome')" which is weaker than the plan's
      "getSample() returned null" text. The co-located unit test checks
      errors[0].includes('not initialised') — a different string from a different code
      path. The integration test verifies the metronome null-sample path; the co-located
      unit verifies the uninitialized-provider path. The plan specifies
      'metronome: getSample() returned null' — the integration test's string check
      is consistent with that.
    severity: advisory

  - test_id: tc-016
    issue: other
    description: >
      Integration test checks getPlayheadPosition() after restart() is near 0.
      OfflineAudioContext's currentTime does not advance between synchronous calls, so
      the test is effectively checking that the position is 0.0 at the moment of start.
      This is deterministic but does not test the scenario where time has actually
      advanced. The co-located unit test likewise tests at-start-position only. The
      plan's stated input ("Advance time so beat position is non-zero") is not
      achievable without artificial time control. Given OfflineAudioContext limitations
      this is an acceptable gap, but the test does not fully verify the stated scenario.
    severity: advisory

  - test_id: tc-017
    issue: wrong-target
    description: >
      The integration test for tc-017 verifies only that "Both positions should be
      non-null" after a BPM change — it contains no assertion that pos0 and pos1 are
      equal or even close. The comment says "Due to timing variations, we can't
      guarantee exact equality, but they should be very close" but then makes no
      closeness assertion at all. The plan specifies "P1 and P2 are equal (playhead
      position invariant across BPM change)" and "Playhead is NOT derived from
      playbackStart." The critical invariant — BPM-independence — is not asserted.
      The co-located unit test has the same gap: it calls metro.restart() and checks
      pos >= 0 && pos <= 0.01 immediately after start, which only tests that the
      position is near 0 at boot, not BPM-drift invariance. This is the primary
      behavioral guarantee of the getPlayheadPosition() rewrite and neither test
      verifies it.
    severity: blocking

  - test_id: tc-018
    issue: other
    description: >
      Both integration and co-located unit tests verify that passing undefined as
      clickProvider throws a TypeError. The co-located unit explicitly checks
      e instanceof TypeError and e.message.includes('clickProvider is required').
      No issues.
    severity: advisory

  # ─── tc-019 through tc-022: config/workspace ───────────────────────────────

  - test_id: tc-019
    issue: wrong-target
    description: >
      The integration test (poc/tests/workspace.test.js) asserts only that each
      component's importConfig was called at some point — not that they were called in
      the required order (sampleSets → global → metronome → presets). The
      importOrder array is populated, but the test checks only for membership
      ("if (!importOrder.includes(...))"), not sequence. The plan specifies:
      "Components' importConfig() called in order: sampleSets → global → metronome →
      presets." The order invariant is a key requirement of the component definition:
      "Import dependency order: sampleSets → global → metronome → presets." The
      test passes even if components are called in reverse order. The co-located unit
      test (poc/config/workspace.test.js) does not test import ordering at all.
    severity: blocking

  - test_id: tc-020
    issue: other
    description: >
      File size cap test correctly returns false for oversized files. The mock jsyaml
      is simplified (JSON.parse fallback) but adequate for this test. No issues.
    severity: advisory

  - test_id: tc-021
    issue: other
    description: >
      Parser selection by filename extension is tested. The tracking of 'yaml' vs
      JSON.parse (by absence of 'yaml' tracking) is an indirect but adequate signal.
      The test correctly distinguishes the two code paths. No issues.
    severity: advisory

  - test_id: tc-022
    issue: other
    description: >
      exportWorkspace test correctly verifies all component.exportConfig() calls and
      validates output key presence. The mockJsyaml uses JSON.stringify which is
      compatible with the contains-checks. No issues.
    severity: advisory

  # ─── tc-023, tc-024: ui/context-menu ───────────────────────────────────────

  - test_id: tc-023
    issue: wrong-target
    description: >
      The integration test (poc/tests/context-menu.test.js) creates a context menu
      with clipboard undefined, verifies it does not throw, and then calls dispose().
      It does NOT verify that the 'Paste Config' menu item is absent/hidden from the
      rendered menu. The plan specifies: "'Paste Config' menu item is hidden
      (display:none or visibility:hidden)." The test only confirms no exception is
      raised — it does not inspect the menu DOM or item visibility state.

      The co-located unit test (poc/ui/context-menu.test.js) does not test clipboard
      unavailability at all. The stated behavioral criterion — that the item is hidden
      not greyed — is not verified by either test.
    severity: blocking

  - test_id: tc-024
    issue: wrong-target
    description: >
      The integration test creates a context menu with mocked clipboard and then
      immediately calls dispose(). It does NOT simulate a long-press or right-click
      to open the menu, does NOT click 'Paste Config', and does NOT verify that
      importConfig is called. The plan specifies: "navigator.clipboard.readText() is
      called / YAML is parsed / property-mapper.validateAndApply is invoked / Menu
      closes." None of these assertions are present in the test.

      The importConfigCalled flag in the test is declared but never asserted on; the
      test passes by not throwing rather than by exercising the paste flow. The
      co-located unit test covers only createContextMenu() return shape, dispose()
      cleanup, and idempotent dispose — none of the Paste Config interaction.
    severity: blocking

  # ─── tc-025 through tc-026, tc-047 through tc-049: ui/edit-config-modal ────

  - test_id: tc-025
    issue: other
    description: >
      Integration test verifies singleton enforcement (modal1 === modal2) and that
      open() makes the modal visible. The implementation check is clean and
      deterministic. No issues.
    severity: advisory

  - test_id: tc-026
    issue: wrong-target
    description: >
      The integration test opens the modal and immediately closes it. It does NOT
      simulate clicking 'Apply', does NOT call importConfig, and does NOT verify that
      YAML is parsed with CORE_SCHEMA. The plan specifies: "jsyaml.load(text,
      {schema: jsyaml.CORE_SCHEMA}) is called / validateAndApply is invoked /
      If errors, modal shows error panel and remains open / If no errors, modal
      closes and onApply callback is invoked." Only the first sub-test (isOpen()
      after open()) is verified. The importConfigCalled flag is declared but never
      asserted on.

      The co-located unit test (poc/ui/edit-config-modal.test.js) covers the
      open/close lifecycle but similarly does not simulate Apply or verify the YAML
      parse and importConfig call chain.
    severity: blocking

  - test_id: tc-047
    issue: wrong-target
    description: >
      The integration test simulates Cancel by calling modal.close() directly, not by
      clicking a Cancel button element. This tests the close() API method, not the
      Cancel button event binding. The plan specifies "Click Cancel button." If the
      Cancel button has a click handler that is incorrectly wired, this test will
      still pass because it bypasses the button interaction. The co-located unit test
      has the same gap.
    severity: advisory

  - test_id: tc-048
    issue: wrong-target
    description: >
      Like tc-047, the integration test calls modal.close() directly rather than
      dispatching a keydown Escape event. The plan specifies "Press Escape key." The
      Escape key handler binding is not exercised by either test. The co-located unit
      test also calls close() directly, not via keyboard event.
    severity: advisory

  - test_id: tc-049
    issue: wrong-target
    description: >
      The integration test opens the modal and calls modal.close() directly, then
      asserts importConfigCalled === false. It does not:
      (a) enter malformed YAML text into the textarea,
      (b) simulate clicking Apply,
      (c) verify that an error message is displayed inline.
      The plan specifies: "jsyaml.load throws and error is caught / Error message is
      displayed inline in the modal / Modal remains open (does not close)." The third
      criterion (modal stays open after parse error) is directly contradicted by the
      test, which calls close() before making assertions. The error display is not
      verified by either test.
    severity: blocking

  # ─── tc-027, tc-028: config/content-service ────────────────────────────────

  - test_id: tc-027
    issue: non-deterministic
    description: >
      The integration test acknowledges in a comment that "contentService may have
      providers from other tests" and weakens the assertion accordingly — it only
      checks Array.isArray, not that it is empty. This introduces test-order
      dependency: if another test registers a provider before this one, the test
      still passes but the intended "empty at import" criterion is not verified.

      The co-located unit test (poc/config/content-service.test.js) properly uses a
      reset() helper that unregisters all providers before each test, making its
      version of the empty-at-start test deterministic.
    severity: advisory

  - test_id: tc-028
    issue: other
    description: >
      Both integration and co-located unit tests cover duplicate-registration
      TypeError and unregister idempotency. The integration test uses a timestamp in
      the provider id ('test:provider-' + Date.now()) to avoid cross-test collisions —
      this is safe. No issues.
    severity: advisory

  # ─── tc-029: audio/local-file-provider ─────────────────────────────────────

  - test_id: tc-029
    issue: other
    description: >
      Integration test mocks showOpenFilePicker globally, injects an AbortError, and
      verifies browse() resolves to []. Clean and deterministic. The co-located unit
      test (poc/audio/local-file-provider.test.js) covers import() paths with mock
      decodeAudioData. Together they give good coverage of the ContentProvider contract.
    severity: advisory

  # ─── tc-030a, tc-030b: audio/recordings-provider ───────────────────────────

  - test_id: tc-030a
    issue: other
    description: >
      Integration test correctly verifies browse() snapshot contract: length, id/label
      mapping, and mutation-does-not-affect-pool semantics. Deterministic mock pool.
      Co-located unit test (poc/audio/recordings-provider.test.js) covers more edge
      cases (empty pool, Promise return type, import() round-trip). No issues.
    severity: advisory

  - test_id: tc-030b
    issue: other
    description: >
      Integration test verifies import() rejection when pool.getBuffer() returns
      undefined. The error message assertions include both 'buffer not found' and
      'clip-1'. The co-located unit test additionally verifies the same rejection path
      using a manufactured bufferId mismatch. No issues.
    severity: advisory

  # ─── tc-031: pool/media-pool-minor ─────────────────────────────────────────

  - test_id: tc-031
    issue: other
    description: >
      Simple regression test: getBuffer() returns undefined (not null) on miss. The
      test is deterministic and exercises the real module. No issues.
    severity: advisory

  # ─── tc-032, tc-033: audio/media-pool-sample-provider ──────────────────────

  - test_id: tc-032
    issue: other
    description: >
      Integration test verifies undefined→null normalization and console.warn logging.
      console.warn is mocked and restored. The co-located unit test additionally covers
      negative index, missing slot, and never-returns-undefined invariant.
    severity: advisory

  - test_id: tc-033
    issue: other
    description: >
      Integration test verifies init() returns a resolved Promise and getSample() is
      available after init. The "synchronous resolution" criterion is tested by
      awaiting the promise. Co-located unit test adds TypeError validation for missing
      constructor arguments. No issues.
    severity: advisory

  # ─── tc-034: ui/sample-set-picker ──────────────────────────────────────────

  - test_id: tc-034
    issue: wrong-target
    description: >
      The integration test (poc/tests/sample-set-picker.test.js) creates a picker,
      verifies it is not null, checks for update() and dispose() methods, then calls
      dispose(). It does NOT exercise the onProviderChange callback at all — no user
      flow (open dropdown, select "New sample set", assign slots, confirm) is simulated.
      The plan specifies: "onProviderChange callback is invoked exactly once / First
      argument is a string (the new provider's id) / Second argument is a
      SampleProvider instance." These are the central integration assertions and none
      are present.

      The co-located unit test (poc/ui/sample-set-picker.test.js) similarly only tests
      structural properties (interface shape, no-crash on init, registry mutation
      absence, tc mutation absence). The onProviderChange invocation path is never
      exercised in either test file. This is the primary behavioral requirement of the
      component and is completely untested.
    severity: blocking

  # ─── tc-035, tc-036, tc-050, tc-051: config/preset-store ───────────────────

  - test_id: tc-035
    issue: other
    description: >
      Integration test verifies localStorage persistence across two store instances.
      Uses a shared mockLocalStorage object (correct approach). Co-located unit test
      (poc/config/preset-store.test.js) is comprehensive: init, load, save, clear,
      replaceAll, exportConfig, importConfig, bounds checking, malformed JSON, and
      storage-unavailable in-memory fallback.
    severity: advisory

  - test_id: tc-036
    issue: other
    description: >
      importConfig() validation test uses an 8-slot array with 2 filled presets. The
      errors-length check and load() verification are correct. No issues.
    severity: advisory

  - test_id: tc-050
    issue: other
    description: >
      RangeError bounds test is correct. Uses MAX_PRESETS from constants.js (not a
      hardcoded 8) so the test is forward-compatible with constant changes. The co-
      located unit test additionally tests index -1 boundary.
    severity: advisory

  - test_id: tc-051
    issue: other
    description: >
      Malformed localStorage recovery test mocks console.warn, verifies 8 null slots,
      and confirms the warning was logged. Deterministic; console.warn is restored in
      finally block. No issues.
    severity: advisory

  # ─── tc-037, tc-038, tc-052, tc-053: ui/preset-bank ────────────────────────

  - test_id: tc-037
    issue: non-deterministic
    description: >
      The integration test (poc/tests/preset-bank.test.js) attempts to click the first
      button by calling "mockDoc.buttons[0]._click()" but the createMockDocument()
      helper collects createElement('button') calls into a buttons array only after the
      bank is created — and the test asserts "if (mockDoc.buttons.length > 0)" which
      means if no buttons are found, the click is silently skipped and the subsequent
      assertions (tc.bpm !== 140 etc.) are evaluated against the unchanged tc,
      causing a false failure but worse — if no buttons are found and buttons.length
      is 0, the click never happens and the assertions may be vacuously met or silently
      not reached.

      The co-located unit test (poc/ui/preset-bank.test.js) uses a more capable
      MockElement with a querySelectorAll() method and explicit click() dispatch, and
      its recall tests properly verify tc field updates. The integration test is weaker.
    severity: advisory

  - test_id: tc-038
    issue: other
    description: >
      The stopped-metronome test follows the same pattern as tc-037 with the same
      conditional click issue. However the co-located unit test covers the stopped
      case definitively. No blocking issues assuming the co-located test is the
      canonical coverage.
    severity: advisory

  - test_id: tc-052
    issue: wrong-target
    description: >
      The integration test for tc-052 creates a preset bank and asserts it is not
      null. It does NOT click the Save button, does NOT verify that slot buttons enter
      a highlighted state, and does NOT verify that clicking a slot in save mode calls
      store.save(). The plan specifies: "All 8 slot buttons enter a highlighted state /
      Clicking any slot in save mode calls store.save(index, snapshot) and exits save
      mode." Neither assertion is present.

      The co-located unit test (poc/ui/preset-bank.test.js) properly exercises this:
      it clicks the save button, checks classList contains 'preset-save-active', clicks
      a slot, and verifies store.load()[3].bpm matches tc.bpm. The integration test
      adds no value beyond what the co-located test covers.
    severity: advisory

  - test_id: tc-053
    issue: other
    description: >
      Both integration and co-located unit tests call snapshotFrom(tc) directly and
      verify clickProviderRef is present and correct. The co-located test also verifies
      the complete field set. No issues.
    severity: advisory

  # ─── tc-039, tc-040: visualizers/alignment-monitor ─────────────────────────

  - test_id: tc-039
    issue: wrong-target
    description: >
      The integration test (poc/tests/alignment-monitor.test.js) calls draw() at T0,
      advances mockMetronome._time, calls draw() at T1, changes tc.bpm, and calls
      draw() again. It asserts only "assert(true, ...)" — no actual measurement of
      column advancement occurs, and no verification that the scroll is BPM-invariant.
      The plan specifies: "Column advancement is proportional to (measureStart advance /
      measureDuration) / Advancement is invariant across BPM changes (no drift) /
      getPlayheadPosition() is NOT called."

      The co-located unit test (poc/visualizers/alignment-monitor.test.js) tests
      multiple draw() calls with advancing measureStart, but similarly uses
      assert(true) with descriptive messages rather than quantitative assertions.
      Neither test measures actual pixel column advancement nor verifies the BPM
      invariance claim. The "Scroll position computation" test in the co-located file
      also ends with assert(true).

      The BPM-invariance criterion (same as tc-017 for metronome) — that column
      advance does not change when only bpm changes — is the core behavioral
      guarantee and remains unverified.
    severity: blocking

  - test_id: tc-040
    issue: other
    description: >
      Both integration and co-located unit tests monkey-patch Float32Array to count
      allocations during 100 draw() calls. The threshold is <= 5 (integration) or
      === initialAllocCount (co-located). The co-located test is stricter
      (zero allocations). Both approaches are valid. No issues with determinism;
      Float32Array is restored in both cases.
    severity: advisory

  # ─── tc-041 through tc-044: poc/main.js-refactor ───────────────────────────

  - test_id: tc-041
    issue: other
    description: >
      The integration test (poc/tests/main-js.test.js) explicitly throws
      "Test not implemented: main.js module not yet available." The test plan
      acknowledges these tests are for post-implementation verification and the main.js
      cannot be imported in a headless Node.js environment without the full browser
      stack. The test infrastructure correctly records these as FAIL rather than PASS.
      However, the test runner reports failures — which the Testing Agent confirmed
      means these 4 tests are not "passing." If the task statement says "52 integration
      tests are confirmed passing," these 4 failures appear to contradict that.
    severity: advisory

  - test_id: tc-042
    issue: other
    description: >
      Same as tc-041: not implemented, throws. See tc-041 note.
    severity: advisory

  - test_id: tc-043
    issue: other
    description: >
      Same as tc-041: not implemented, throws.
    severity: advisory

  - test_id: tc-044
    issue: other
    description: >
      Same as tc-041: not implemented, throws.
    severity: advisory

verdict: needs-revision
```

---

## Summary of Blocking Findings

Eight blocking findings require resolution before the test suite can be considered sufficient:

**F1 — tc-007 (wrong-target):** The integration test for "getSample() returns null before init()" tests a hand-written mock instead of the real builtinClickProvider module. The real module's pre-init null-return path is never exercised in the integration test.

**F2 — tc-014 (wrong-target):** The volume threshold test (beatVolumes < 0.01 silences beat) only asserts that beat 0 scheduled — it does not assert that beats 1 and 2 did NOT schedule. The negative assertions, which are the core of the component's volume-gate requirement, are absent from both the integration and co-located unit tests.

**F3 — tc-017 (wrong-target):** The BPM-invariance test for getPlayheadPosition() asserts only that positions are non-null after a BPM change. It does not assert that the positions are equal or close, which is the entire purpose of the spec-required measureStart/nextBeatTime derivation.

**F4 — tc-019 (wrong-target):** The importWorkspace dependency-order test verifies that each component was called (set membership) but does not verify order (sequence). The "sampleSets → global → metronome → presets" ordering is a named requirement that is not asserted.

**F5 — tc-023 (wrong-target):** The "Paste Config hidden when clipboard unavailable" test does not inspect the rendered menu for presence/absence of the item. It only verifies no exception is thrown.

**F6 — tc-024 (wrong-target):** The "Paste Config calls importConfig" test never opens the menu, never clicks the item, and never asserts importConfig is called. The importConfigCalled flag is declared but never asserted on.

**F7 — tc-026 + tc-049 (wrong-target):** The Apply-action path of edit-config-modal is never simulated in either the integration or co-located unit tests. tc-026 opens and closes without triggering Apply. tc-049 opens and closes without entering bad YAML, clicking Apply, or verifying the error-banner stays modal open.

**F8 — tc-034 (wrong-target):** The SampleSetPicker onProviderChange callback — the primary integration contract of this component — is never invoked in either the integration test or the co-located unit test. No flow exercises "New sample set → slot assignment → Confirm."

**F9 — tc-039 (wrong-target):** The AlignmentMonitor BPM-invariance test ends with `assert(true, ...)` — no quantitative measure of column advancement is made. The core behavioral guarantee (scroll derived from measureStart/measureDuration, not BPM) is unverified in both test files.

---

## CompletionReport

```yaml
agent_role: staff-engineer
task_id: 06-se-test-review
deliverables:
  - agents/artifacts/06-test-review.md
summary: >
  Reviewed the TestPlan (52 test cases), all 18 integration test files in poc/tests/,
  and all 17 co-located unit test files. Nine blocking findings were identified across
  eight test cases. The most common pattern is tests that exercise only the
  structural surface of a component (create, don't throw, dispose) while omitting the
  behavioral assertions specified in the TestPlan and ComponentDefinitions. Key missing
  assertions include: volume-gate negative cases in the metronome (tc-014), BPM-
  invariance in both the metronome playhead and alignment monitor scroll (tc-017,
  tc-039), import dependency ordering in workspace (tc-019), actual menu-item interaction
  in context-menu (tc-023, tc-024), the Apply + error-display flow in edit-config-modal
  (tc-026, tc-049), and the onProviderChange invocation in sample-set-picker (tc-034).
  The unit test co-located files are generally stronger than the integration tests for
  the same components. Verdict: needs-revision.
unexpected_conditions:
  - "tc-041 through tc-044 (main.js) are explicitly unimplemented and throw — if the
    Testing Agent reported 52 tests as passing, these 4 failures may indicate a
    discrepancy in how the count was computed (e.g., the 4 failing main.js tests were
    excluded from the '52 passing' count)."
workflow_misses: []
improvement_suggestions:
  - "For UI interaction tests (context-menu, edit-config-modal, sample-set-picker)
    invest in a minimal event-dispatch helper that can synthesize click/keydown events
    on mock DOM elements rather than calling public API methods directly. This closes
    the gap between 'the method works' and 'the button binding works'."
  - "For timing-derived invariants (tc-017, tc-039), use a controllable clock:
    expose or inject a now() function in createMetronome and createAlignmentMonitor
    so that tests can advance time deterministically without OfflineAudioContext."
  - "The silent-skip pattern (return early when OfflineAudioContext unavailable) should
    be replaced with explicit skip signaling so CI output distinguishes skipped tests
    from passing tests."
```
