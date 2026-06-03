# Design Validation — Cuppanudel New Feature Work
## Task 03-sa-design-validation

---

## Status Report — 03-sa-design-validation (lane-infra, lane-a)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Read all 24 ComponentDefinition files in `agents/artifacts/02-components/`
- Read `agents/artifacts/01-spec-review.md` (SpecReview cross-reference)
- Read `agents/artifacts/01-lane-map.md` (lane assignments)
- Read all specs in `specs/` (requirements.md, workspace.md, content-service.md, ui-interaction-model.md, project-structure.md)
- Reviewed lane-infra components: `test-runner`
- Reviewed lane-a components: `config/property-mapper`
### Next Steps
- Review lane-b (SampleProvider infrastructure)
- Review lane-c (workspace + context menus)
- Review lane-d (file import / content service)
- Review lane-e (MediaPoolSampleProvider)
- Review lane-f (Tempo Presets)
- Review lane-g (Alignment Monitor)
- Review lane-wire (integration)
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-b)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-b components: `timing/tempo-context-additions`, `config/sample-provider-registry`, `audio/builtin-click-provider`, `timing/metronome-refactor`
### Next Steps
- Review lane-c, lane-d, lane-e, lane-f, lane-g, lane-wire
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-c)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-c components: `config/workspace`, `ui/context-menu`, `ui/edit-config-modal`, `index-html-global-toolbar`
### Next Steps
- Review lane-d, lane-e, lane-f, lane-g, lane-wire
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-d)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-d components: `config/content-service`, `audio/local-file-provider`, `audio/recordings-provider`, `pool/media-pool-minor`, `index-html-file-import-ui`
### Next Steps
- Review lane-e, lane-f, lane-g, lane-wire
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-e)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-e components: `audio/media-pool-sample-provider`, `ui/sample-set-picker`
### Next Steps
- Review lane-f, lane-g, lane-wire
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-f)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-f components: `config/preset-store`, `ui/preset-bank`, `index-html-preset-bank-dom`
### Next Steps
- Review lane-g, lane-wire
### Blockers
_none_

---

## Status Report — 03-sa-design-validation (lane-g, lane-wire)
**Agent**: solutions-architect
**Status**: in-progress
### Completed Since Last Report
- Reviewed lane-g components: `visualizers/alignment-monitor`, `index-html-alignment-monitor-dom`
- Reviewed lane-wire components: `poc/main.js-refactor`, `poc/index-html-final-assembly`
### Next Steps
- Write DesignValidation YAML artifact
### Blockers
_none_

---

## DesignValidation Artifact

```yaml
components_reviewed:
  - test-runner
  - config/property-mapper
  - timing/tempo-context-additions
  - config/sample-provider-registry
  - audio/builtin-click-provider
  - timing/metronome-refactor
  - config/workspace
  - ui/context-menu
  - ui/edit-config-modal
  - index-html-global-toolbar
  - config/content-service
  - audio/local-file-provider
  - audio/recordings-provider
  - pool/media-pool-minor
  - index-html-file-import-ui
  - audio/media-pool-sample-provider
  - ui/sample-set-picker
  - config/preset-store
  - ui/preset-bank
  - index-html-preset-bank-dom
  - visualizers/alignment-monitor
  - index-html-alignment-monitor-dom
  - poc/main.js-refactor
  - poc/index-html-final-assembly

findings:

  # ── lane-infra ──────────────────────────────────────────────────────────────

  - component_id: test-runner
    type: no-issue
    description: >
      Module path (poc/test/runner.js), interface contract, and dependency
      constraints are all correctly specified. The harness is zero-dependency and
      exports only assert primitives and run(). `assertNull` is defined and will
      catch the null/undefined distinction required by SampleProvider and
      getSample() contracts. The success/failure criteria cover sync and async
      test cases. No spec mismatches found.
    severity: none

  # ── lane-a ───────────────────────────────────────────────────────────────────

  - component_id: config/property-mapper
    type: no-issue
    description: >
      Two-pass algorithm (collect+validate, then write atomically) is explicitly
      captured. Pass 1 builds a `pending` list; Pass 2 writes only if the error
      array is empty — satisfying the SpecReview risk (functional: partial-write
      hazard). Error vs warning distinction is correct: wrong type and length
      mismatch are errors; out-of-range scalars are clamped + warning. The
      `exactLength` lookup references `source` (not `target`), resolving the
      SpecReview gap. Array element error format `<key>[<index>]: ...` is
      specified. The `must_not_require` list precludes any timing, audio, DOM, or
      workspace dependency, confirming pure-utility isolation. All SpecReview
      risks for this module are mitigated.
    severity: none

  # ── lane-b ───────────────────────────────────────────────────────────────────

  - component_id: timing/tempo-context-additions
    type: no-issue
    description: >
      All three new fields (`clickProviderRef`, `beatAccents`, `snapThreshold`)
      are formally added to `createTempoContext()` with correct defaults.
      `setBeatsPerMeasure` is specified to reset `beatAccents` alongside
      `beatOffsets` and `beatVolumes` and explicitly NOT to reset
      `clickProviderRef` or `snapThreshold`. The `snapThreshold` gap from the
      SpecReview (field lacked a home and schema descriptor) is resolved: it lives
      in `global` workspace section with descriptor
      `{ key: 'snapThreshold', type: 'float', min: 0, max: 0.025, default: 0 }`.
      `must_not_require` correctly excludes registry, metronome, and property-mapper.
    severity: none

  - component_id: config/sample-provider-registry
    type: advisory
    description: >
      The `get(id)` method is specified to return `SampleProvider | undefined`
      (not null). This is consistent with Map semantics and the spec table, but
      the failure criteria row says "registry.get(id) for an unregistered id
      returns undefined (not null, not throws)", which is correct for the registry
      itself. However, the SpecReview risk (functional: getSample null/undefined
      inconsistency) required that getSample() always return null. The registry's
      own undefined return is a separate concern from getSample() and is
      acceptable here; callers (metronome, main.js) are responsible for the
      fallback to 'built-in:default'. This is advisory only — implementors must
      not conflate the registry's undefined return with getSample()'s null
      contract. The `_reset()` method for test teardown is present, satisfying
      the SpecReview maintainability risk. The `must_not_require` list is clean.
      One note: the component registers `builtinClickProvider` at module import
      time by importing `audio/builtin-click-provider` — this is a one-directional
      dependency that is declared correctly in `requires`.
    severity: advisory

  - component_id: audio/builtin-click-provider
    type: no-issue
    description: >
      `must_not_require` explicitly lists `config/sample-provider-registry`,
      confirming the circular-dependency risk is blocked by design.
      `getSample()` returns null before `init()` resolves (not undefined, not
      throw), satisfying the SampleProvider null contract. The failure criteria
      explicitly state "getSample() must never return undefined". `init(ctx)` is
      specified as a lazy call invoked by the consumer (main.js in the Start
      handler), not self-called at module import — satisfying the SpecReview
      ambiguity on initialization timing. Re-calling `init()` a second time is
      a no-op. Buffer synthesis specs (frequencies, gains, durations) match the
      workspace.md §4 table exactly. The SpecReview functional risk (silent beat
      if init() not resolved) is mitigated by the null guard and console.error.
    severity: none

  - component_id: timing/metronome-refactor
    type: advisory
    description: >
      The `requires` field lists `audio/builtin-click-provider`, which is a
      potential concern. The metronome receives its `clickProvider` as a
      constructor parameter — it does not import or instantiate the provider
      directly. The static import declaration creates a module-level dependency
      even though the runtime behavior is dependency-injected. This is a minor
      SoC advisory: the metronome should ideally have no static import of any
      specific provider. However, the component's `scope.excludes` says
      "Resolution of clickProviderRef from the registry — that is main.js wiring
      responsibility", and the interface shows `clickProvider` is a parameter,
      not a module import. The dependency in `requires` likely represents a build
      ordering constraint rather than a runtime coupling. This is an
      implementation-level ambiguity, not a blocking design flaw. Recommend
      clarifying whether `requires` here means "must exist in the module graph"
      or "is statically imported" — if the latter, it should be removed since
      the interface is parameter-injected. `getPlayheadPosition()` is explicitly
      rewritten to derive scroll from `measureStart` and `nextBeatTime`, fully
      mitigating the SpecReview functional risk about playhead drift on BPM
      changes. The null guard and console.error on null getSample() are present.
    severity: advisory

  # ── lane-c ───────────────────────────────────────────────────────────────────

  - component_id: config/workspace
    type: no-issue
    description: >
      All three top-priority checks pass. (1) Import dependency order is
      explicitly listed as "sampleSets → global → metronome → presets", matching
      spec §1 step 7 so clickProviderRef resolves after providers are registered.
      (2) YAML parsed with `jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA })` is
      verbatim in scope.includes and the success criteria — the security risk is
      fully mitigated. (3) The 1 MB file size cap (1_048_576 bytes) is captured
      in scope.includes and the success criteria with the specified error toast
      text. The deep equality helper uses strict === for scalars and |a-b|<1e-6
      for floats, resolving the SpecReview ambiguity. JSON fallback via extension
      detection is specified; cross-format fallback is correctly excluded.
      `must_not_require` correctly excludes metronome, builtin-click-provider,
      context-menu, edit-config-modal, and preset-store — no circular deps.
      The global-toolbar gap from the SpecReview (no spec for DOM location) is
      resolved: the `<header>` element is now specified in workspace.md §1 and
      in `index-html-global-toolbar`.
    severity: none

  - component_id: ui/context-menu
    type: no-issue
    description: >
      The "Paste Config hidden (not greyed out) when clipboard unavailable"
      requirement is captured in scope.includes and the success criteria.
      The failure criteria cover NotAllowedError being caught silently. Long-press
      detection parameters (600 ms, 20 px movement) match the spec exactly.
      Dismiss on Escape, outside click, and item selection are all present.
      The component's own use of jsyaml.dump/load is limited to one-liner
      calls; it does not own property-level validation — correctly delegated to
      importConfig(). The `requires: config/property-mapper` is appropriate
      (it references the interface contract indirectly via the component
      contract). `must_not_require` correctly excludes workspace, metronome,
      and all audio modules. ARIA/proxy pattern deferred to app/ is explicitly
      noted.
    severity: none

  - component_id: ui/edit-config-modal
    type: no-issue
    description: >
      Modal z-index = 600 is captured in scope.includes, the interface comment
      ("fixed-position, z-index 600"), and the failure criteria ("z-index lower
      than 600 constitutes a failure"). The Apply path uses
      `jsyaml.load(text, { schema: jsyaml.CORE_SCHEMA })` — CORE_SCHEMA is
      specified, consistent with the security requirement. Singleton enforcement
      is specified in scope.includes and the failure criteria. Escape = Cancel
      and Ctrl/Cmd+Enter = Apply are both present in scope.includes and success
      criteria. The modal stays open on error; closes on success.
      `must_not_require` excludes config/workspace, context-menu, metronome,
      and all audio — clean SoC boundary. The `requires: config/property-mapper`
      is advisory-level appropriate (needed for the interface contract description)
      but the modal does not call validateAndApply itself — that is done by the
      component's importConfig(). This is not a violation.
    severity: none

  - component_id: index-html-global-toolbar
    type: no-issue
    description: >
      The SpecReview gap (no spec for where global workspace export buttons
      live) is resolved by this component. IDs `export-workspace-btn` and
      `copy-workspace-btn` are explicitly specified and matched in main.js
      wiring. The `panel-header` class on panel header elements is specified for
      context-menu attachment. `must_not_require` correctly excludes all JS
      modules (HTML-only). Lane assignment (lane-c) is correct.
    severity: none

  # ── lane-d ───────────────────────────────────────────────────────────────────

  - component_id: config/content-service
    type: no-issue
    description: >
      Module-level singleton with no auto-registration at import time (correct —
      registration is done by main.js). The `providers` getter returns a
      shallow-copy array, preventing external mutation of registry state.
      `unregister()` is a no-op for unknown ids (no throw). The `must_not_require`
      list is comprehensive and correct. No dependency on SampleProviderRegistry
      or property-mapper. The SpecReview gap about browse() returning a picker
      vs. a persistent list is resolved in content-service.md: the spec now
      explicitly differentiates picker-based providers from enumerable providers
      within the browse() contract.
    severity: none

  - component_id: audio/local-file-provider
    type: no-issue
    description: >
      FSAA / fallback picker is specified. browse() returning [] on user-cancel
      (AbortError from showOpenFilePicker) is in the success criteria and failure
      criteria. import() rejects on decodeAudioData failure (does not swallow).
      The file-size cap for import is intentionally not enforced here (per
      requirements.md: "Files that exceed MAX_RECORD_DURATION_MS are accepted
      with a console.warn; that constant is tuned for recording latency and
      should not gate import") — this is correct per spec. The internal
      `_file: File` field is an implementation detail, not part of the
      ContentItem public contract. `must_not_require` correctly excludes
      pool/media-pool and other non-content modules.
    severity: none

  - component_id: audio/recordings-provider
    type: advisory
    description: >
      The `import()` failure case specifies: "where pool.getBuffer returns
      undefined (clip deleted between browse and import) must reject with
      Error('RecordingsProvider: buffer not found for id <id>') — must not
      return null or undefined." This is consistent with the ContentProvider
      contract (import returns Promise<AudioBuffer>). However, the PoolRef
      interface definition within this component declares
      `getBuffer(bufferId: string): AudioBuffer | undefined`, which means
      getBuffer() can return undefined. The component correctly handles this
      by rejecting. This is fine. Advisory note: the `durationHint` computation
      references `ctx.sampleRate` in the interface comment but `ctx` is not
      available at browse() time (only at import() time). Implementors must
      derive duration from the clip's startFrame/endFrame using the pool's
      known sampleRate (if exposed) or omit durationHint — the field is
      optional, so omitting it is safe. This is not a blocking issue but
      implementors should be aware.
    severity: advisory

  - component_id: pool/media-pool-minor
    type: no-issue
    description: >
      This component correctly documents that getBuffer() returns undefined (not
      null) on miss, and that callers (RecordingsProvider, MediaPoolSampleProvider)
      are responsible for normalizing to null. No code changes to media-pool.js
      are required. The scope is limited to a contract confirmation. Lane-d
      assignment is correct.
    severity: none

  - component_id: index-html-file-import-ui
    type: no-issue
    description: >
      All required element IDs are specified: `import-file-input` (type=file,
      hidden), `import-file-btn`, `import-drop-overlay`, and `sample-browser-panel`.
      The `hidden` state of the file input at page load is confirmed in success
      criteria. `must_not_require` excludes all JS modules. Lane-d assignment is
      correct.
    severity: none

  # ── lane-e ───────────────────────────────────────────────────────────────────

  - component_id: audio/media-pool-sample-provider
    type: spec-mismatch
    description: >
      The `requires` field lists `config/sample-provider-registry`. However, the
      component's scope.excludes states "Registration into SampleProviderRegistry
      — owned by main.js wiring after user confirms the set." The component does
      not call `registry.register()` itself — it simply creates a SampleProvider
      instance that main.js will register. Therefore the static module import of
      `config/sample-provider-registry` is not needed; the provider does not
      consume the registry. This is an incorrect dependency declaration. The
      component implements the SampleProvider interface (defined informally in
      workspace.md §4) but does not need to import the registry module to do so.
      Removing this dependency keeps the component properly isolated and avoids
      an unnecessary lane-b dependency on lane-e. The SoC boundary is otherwise
      clean: getSample() normalizes undefined to null, count() and init() are
      correctly specified, and all SpecReview risks for this module are addressed.
    severity: blocking

  - component_id: ui/sample-set-picker
    type: no-issue
    description: >
      The two-slot assignment flow (tap slot → scrollable clip list → tap to
      assign → Escape to cancel) resolves the SpecReview gap (no interaction
      flow specified for slot assignment). The confirm button is specified as
      disabled until both slots are assigned, preventing a malformed provider
      from being passed to onProviderChange. The component consumes only
      interface subsets (RegistryRef, PoolRef, TcRef), not full module imports,
      which is good SoC practice. `must_not_require` correctly excludes
      property-mapper, workspace, and timing/metronome. Lane-e assignment is
      correct, with a note that this component depends on lane-b (registry) and
      lane-d (pool clips). The `requires` list includes `audio/media-pool-sample-provider`,
      which is correct since the picker constructs a new MediaPoolSampleProvider
      instance on confirmation.
    severity: none

  # ── lane-f ───────────────────────────────────────────────────────────────────

  - component_id: config/preset-store
    type: no-issue
    description: >
      MAX_PRESETS = 8 is explicitly captured in scope.includes (matching the
      requirements.md constant commitment). localStorage key `cuppanudel.presets.v1`
      is captured in scope.includes and success criteria. Recall behavior (stop +
      restart from beat 0) is correctly assigned to main.js / ui/preset-bank per
      the excludes list — the store itself only manages persistence. Graceful
      degradation is fully specified: `storageAvailable` getter, `save()` silently
      writes in-memory when storage unavailable, createPresetStore() falls back
      to 8 null slots. The failure criteria confirm that malformed localStorage
      JSON causes a console.warn and reset to nulls (no throw). The two-authority
      question (localStorage vs workspace YAML) is resolved: workspace import
      calls replaceAll() which overwrites localStorage — YAML is the portable
      canonical form, localStorage is the persistent device-local cache.
      `must_not_require` correctly excludes workspace, preset-bank, metronome,
      and all audio modules.
    severity: none

  - component_id: ui/preset-bank
    type: spec-mismatch
    description: >
      The `applyPreset` behavior specifies "if metronome.isRunning() calls
      metronome.restart()" — but the spec in requirements.md §Planned Features /
      Tempo Presets says "stop it immediately, apply the new config, restart from
      beat 0." The component uses `metronome.restart()` rather than a
      `metronome.stop()` followed by writing tc fields followed by `metronome.start()`.
      This is a potential mismatch: `restart()` is defined in the metronome
      interface (timing/metronome-refactor) as a method, but its internal behavior
      (does it reset to beat 0? does it re-read tc?) must be verified to match
      "stop immediately + apply config + restart from beat 0." If `restart()` is
      semantically equivalent to stop()+start() and re-reads tc state, then the
      design satisfies the spec. However, the component definition does not
      explicitly confirm this equivalence, leaving an implementor to assume.
      This ambiguity could result in recall not starting from beat 0 if restart()
      resumes mid-measure. The success criterion "Recall when metronome.isRunning()
      === true calls metronome.restart() after applying tc fields" suggests tc is
      written first, then restart() is called — which is correct only if restart()
      reads the updated tc. Recommend explicitly stating in the component's
      success_criteria that restart() must be equivalent to stop()+start(0) with
      current tc values. Until this is confirmed in the metronome component, this
      is a blocking ambiguity.
    severity: blocking

  - component_id: index-html-preset-bank-dom
    type: no-issue
    description: >
      Elements `preset-bank-container` and `preset-save-btn` are correctly
      specified. Both are within the metro panel. The 8 slot buttons are
      intentionally excluded (rendered dynamically by ui/preset-bank). Lane-f
      assignment is correct. `must_not_require` excludes all JS modules.
    severity: none

  # ── lane-g ───────────────────────────────────────────────────────────────────

  - component_id: visualizers/alignment-monitor
    type: no-issue
    description: >
      All mandatory checks pass. (1) Scroll position is derived from
      `measureStart` and `nextBeatTime`, not `getPlayheadPosition()` — explicitly
      stated in scope.includes, the failure criteria, and the success criteria
      ("Column advance per frame is computed as: (measureStart advancement since
      last frame) / measureDuration * canvasWidth — not from getPlayheadPosition()").
      (2) ALIGN_MEASURES = 2 is captured as a named constant exported for
      testability. (3) Canvas placement behind beat-grid is specified in
      scope.includes ("Canvas must be placed behind beat-grid canvas in DOM").
      The SpecReview gaps (measure count, draw mode, amplitude type) are all
      resolved as defaults: 2 measures, continuous draw, raw amplitude. No
      Float32Array is allocated inside the RAF loop (pre-allocation required and
      failure criteria enforce it). `must_not_require` correctly excludes
      metronome, property-mapper, workspace, and all UI modules.
    severity: none

  - component_id: index-html-alignment-monitor-dom
    type: no-issue
    description: >
      The canvas element ID `alignment-monitor` is specified with default
      dimensions 400×68 matching the beat-grid. DOM ordering (alignment-monitor
      before beat-grid in DOM) is correctly specified to achieve visual layering.
      The failure criteria identify the z-index occlusion risk. Lane-g assignment
      is correct.
    severity: none

  # ── lane-wire ────────────────────────────────────────────────────────────────

  - component_id: poc/main.js-refactor
    type: advisory
    description: >
      The Start button handler correctly calls `await builtinClickProvider.init(ctx)`
      before enabling the metro Play button, and gates `createMetronome()` on
      init() resolution — this satisfies the SpecReview functional risk (silent
      metronome if init() not resolved). The handler sequence (1 createInputProvider,
      2 createAnalyzer/Recorder, 3 await init, 4 createMetronome, 5 createAlignmentMonitor,
      6 initGlobalWorkspace, 7 enable Play, 8 startRenderLoop) is correct and safe.
      The decomposition into initMetroPanel(), initSampleBrowser(), initGlobalWorkspace()
      addresses the SpecReview maintainability risk about main.js growing unmanageable.
      Advisory: the `requires` list includes `test-runner`, which is the test
      harness module. main.js as the production entry point should not statically
      import the test runner. The test runner is only needed by test pages
      (poc/test/*.js), not by the application itself. This dependency should be
      removed from the production main.js `requires` list. Advisory (minor): the
      `must_not_require` entry "any module not yet created (no forward references)"
      is too vague to be verifiable. It should be removed or replaced with an
      explicit list of modules that MUST NOT be imported.
    severity: advisory

  - component_id: poc/index-html-final-assembly
    type: no-issue
    description: >
      All per-lane DOM contributions are verified and integrated: global header
      (lane-c), file import UI (lane-d), preset bank container (lane-f), and
      alignment-monitor canvas (lane-g). The js-yaml.min.js plain `<script>`
      before module scripts is correctly specified. DOM order for alignment-monitor
      before beat-grid is confirmed in the success criteria. The `typeof jsyaml`
      check as a success criterion will catch the most common assembly failure
      (missing or late-loaded script). `main.js` as the sole module entry point
      is correctly enforced. Lane-wire assignment is correct.
    severity: none

  # ── Cross-cutting: Lane Dependency Integrity ────────────────────────────────

  - component_id: __lane-dependency-integrity__
    type: risk
    description: >
      FORWARD DEPENDENCY SCAN:
      No component in an earlier lane declares a `requires` dependency on a
      component defined in a later lane, with one exception noted separately
      (audio/media-pool-sample-provider requires config/sample-provider-registry —
      addressed as spec-mismatch above). All other forward-dependency checks pass:
      lane-a (property-mapper) has no requires; lane-b components require only
      lane-infra outputs or nothing; lane-c requires lane-a and lane-b outputs only;
      lane-d requires nothing from lane-b or later; lane-e requires lane-b and
      lane-d; lane-f requires lane-a and lane-b; lane-g requires only
      tempo-context-additions (lane-b); lane-wire requires all prior lanes.

      REQUIRES vs MUST_NOT_REQUIRE CONTRADICTION SCAN:
      `timing/metronome-refactor`: requires `audio/builtin-click-provider`;
      must_not_require `config/sample-provider-registry`, `config/property-mapper`,
      any UI module, any visualizer. No contradiction found.
      `config/sample-provider-registry`: requires `audio/builtin-click-provider`;
      must_not_require includes `config/property-mapper`, `config/workspace`,
      `timing/metronome`, any DOM module, any visualizer. No contradiction found.
      All other components checked: no component lists the same module in both
      `requires` and `must_not_require`. No contradictions found.

      LANE ASSIGNMENT VERIFICATION:
      All 24 component IDs match their declared lanes in the LaneMap. Lane-wire
      components (poc/main.js-refactor, poc/index-html-final-assembly) correctly
      depend on all feature lanes.
    severity: advisory

  # ── Cross-cutting: SpecReview Risk Disposition ──────────────────────────────

  - component_id: __spec-review-risk-disposition__
    type: risk
    description: >
      RISK 1 (functional: init() race → silent metronome): MITIGATED. Addressed
      by audio/builtin-click-provider (null return + console.error), timing/
      metronome-refactor (null guard), and poc/main.js-refactor (gate Play on
      init() resolution).

      RISK 2 (functional: partial write in validateAndApply): MITIGATED. Two-pass
      algorithm is explicitly specified in config/property-mapper.

      RISK 3 (functional: getSample null/undefined inconsistency): MITIGATED.
      Both audio/builtin-click-provider and audio/media-pool-sample-provider
      specify "never return undefined — always AudioBuffer | null." pool/
      media-pool-minor documents getBuffer() returns undefined, and both
      consumers normalize to null.

      RISK 4 (functional: getPlayheadPosition() drift): MITIGATED. Timing/
      metronome-refactor rewrites getPlayheadPosition() to use measureStart/
      nextBeatTime. Visualizers/alignment-monitor explicitly derives scroll from
      the same scheduler variables.

      RISK 5 (maintainability: main.js unmanageable): MITIGATED. poc/main.js-
      refactor decomposes into initMetroPanel(), initSampleBrowser(),
      initGlobalWorkspace() as a pre-condition.

      RISK 6 (security: jsyaml.load without schema): MITIGATED. config/workspace
      specifies CORE_SCHEMA in both scope.includes and success/failure criteria.
      ui/edit-config-modal also specifies CORE_SCHEMA for its Apply parse path.

      RISK 7 (security: file size cap missing): MITIGATED. config/workspace
      specifies the 1 MB cap (1_048_576 bytes) in scope, success criteria, and
      failure criteria.

      RISK 8 (maintainability: registry not testable): MITIGATED. config/sample-
      provider-registry exposes _reset() for test teardown, documented as
      test-only.

      GAP: snapThreshold ownership: RESOLVED. timing/tempo-context-additions
      formalizes snapThreshold as a TempoContext field; workspace.md places it
      in the global section.

      GAP: BuiltinClickProvider module path: RESOLVED. Explicitly
      poc/audio/builtin-click-provider.js.

      GAP: Alignment Monitor open questions: RESOLVED. 2 measures, continuous
      draw, raw amplitude — all captured in visualizers/alignment-monitor.

      GAP: MAX_PRESETS range vs commitment: RESOLVED. MAX_PRESETS = 8.

      GAP: Preset recall behavior: RESOLVED in spec — stop immediately + restart
      from beat 0. However, ui/preset-bank's use of metronome.restart() without
      confirming beat-0 reset behavior creates a residual risk (see ui/preset-bank
      finding above).

      GAP: global toolbar DOM location: RESOLVED. index-html-global-toolbar
      specifies a <header> element.

      GAP: slot assignment interaction: RESOLVED. ui/sample-set-picker specifies
      tap-to-assign flow.

      AMBIGUITY: browse() return type inconsistency (ContentProvider flat vs
      paginated): RESOLVED in content-service.md — POC always returns ContentItem[],
      pagination deferred to app/.

      AMBIGUITY: registry initialization timing: RESOLVED. Registry is module-level
      singleton; init(ctx) called lazily in Start handler.

      REMAINING UNRESOLVED: ContentItem.metadata loop-point question is explicitly
      deferred to app/ in content-service.md — no POC impact.
    severity: advisory

verdict: needs-revision
```

---

## Blocking Findings Summary

Two blocking findings require resolution before implementation:

1. **`audio/media-pool-sample-provider`** (`spec-mismatch`, blocking): The `requires`
   field incorrectly lists `config/sample-provider-registry`. The component constructs a
   SampleProvider instance but does not call `registry.register()` — that is main.js's
   responsibility. Removing this dependency eliminates an unnecessary coupling and correctly
   isolates the component within its lane.

2. **`ui/preset-bank`** (`spec-mismatch`, blocking): The `applyPreset` logic uses
   `metronome.restart()` after writing tc fields, but the spec requires "stop immediately,
   apply new config, restart from beat 0." The Metronome interface does not explicitly
   define what `restart()` does relative to beat position. Either: (a) the metronome
   component definition must be updated to specify that `restart()` is semantically
   equivalent to `stop()` + `start()` from beat 0 with current tc values, or (b)
   `applyPreset` must call `metronome.stop()`, write tc, then `metronome.start()` rather
   than `metronome.restart()`. Until this is resolved, the recall-during-running-metronome
   requirement cannot be verified as correctly implemented.

---

## Completion Report — 03-sa-design-validation
**Agent**: solutions-architect

### Deliverables
- `agents/artifacts/03-design-validation.md`

### Summary
All 24 ComponentDefinitions were individually reviewed against the specifications
(`specs/workspace.md`, `specs/requirements.md`, `specs/content-service.md`,
`specs/ui-interaction-model.md`, `specs/project-structure.md`), the LaneMap
(`agents/artifacts/01-lane-map.md`), and all 8 risks and 13 gaps/ambiguities from the
SpecReview (`agents/artifacts/01-spec-review.md`). Every SpecReview risk is explicitly
mitigated in the ComponentDefinitions; all spec gaps have been closed by the updated
specs. Two blocking findings prevent approval: `audio/media-pool-sample-provider`
incorrectly declares a static dependency on `config/sample-provider-registry`, and
`ui/preset-bank`'s use of `metronome.restart()` is underspecified relative to the
beat-0-reset requirement. Lane dependency integrity checks found no forward dependencies
or requires/must_not_require contradictions, with the single exception of the erroneous
registry dependency noted above.

### Unexpected Conditions
The `timing/metronome-refactor` component lists `audio/builtin-click-provider` in
`requires`, which is unusual since the provider is injected as a parameter rather than
statically imported. This was flagged as advisory only — it does not block progress but
should be clarified in the next revision to avoid implementor confusion about whether
the metronome module has a hard compile-time dependency on the built-in provider.

### Workflow Misses
_none_

### Improvement Suggestions
Future component definitions would benefit from distinguishing "module must exist in the
build graph before this module can run" (ordering constraint) from "this module statically
imports that module" (coupling constraint) in the `requires` field. The current schema
conflates these two meanings, which caused the ambiguity in `timing/metronome-refactor`
and the error in `audio/media-pool-sample-provider`.
