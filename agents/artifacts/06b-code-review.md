# Code Review — Task 06b

## Scope

All new and modified source files delivered by Implementation Agents across lanes
infra, a, b, c, d, e, f, g, and wire.

---

## CodeReview Artifact

```yaml
components_reviewed:
  - test-runner
  - config/property-mapper
  - config/sample-provider-registry
  - audio/builtin-click-provider
  - config/content-service
  - audio/local-file-provider
  - audio/recordings-provider
  - audio/media-pool-sample-provider
  - config/workspace
  - ui/context-menu
  - ui/edit-config-modal
  - config/preset-store
  - ui/preset-bank
  - ui/sample-set-picker
  - visualizers/alignment-monitor
  - timing/tempo-context-additions
  - timing/metronome-refactor
  - pool/media-pool-minor
  - poc/main.js-refactor
  - poc/index-html-final-assembly

findings:

  # ── lane-infra: test-runner ──────────────────────────────────────────────────

  - component_id: test-runner
    file: poc/test/runner.js
    type: convention
    description: >
      `AssertionError` is implemented with `class` syntax (line 1). The
      component definition's interface specifies it as a class, but project
      conventions explicitly prohibit `class` syntax where a factory function
      suffices. An AssertionError is a plain Error subclass; it can be
      replaced with a factory function returning an object whose prototype
      chains to Error. The class is also used as a value in `instanceof` checks
      in external test code, so this is a minor violation but still against
      the stated rule.
    severity: advisory

  - component_id: test-runner
    file: poc/test/runner.js
    type: convention
    description: >
      `_reset` is exported (line 61) but is not listed in the component's
      public interface — the interface defines only `test`, `run`, `assert`,
      `assertEquals`, `assertNull`, and `AssertionError`. Exporting `_reset`
      from a test harness creates a footgun for test authors who might call it
      mid-suite. It should not be exported; test isolation that requires
      clearing registration state belongs in a separate test-page that imports
      runner.js freshly (ES module cache busting). This is also documented as
      "Module file at poc/test/runner.js — excludes: Test isolation /
      module-cache busting between test cases."
    severity: advisory

  - component_id: test-runner
    file: poc/test/runner.js
    type: convention
    description: >
      The module-level `tests` array (line 8) is a mutable singleton, meaning
      all callers share state across a single module-cache lifetime. The
      interface's `run()` description says tests execute "in registration
      order" but does not say the list is cleared after `run()`. Two
      consecutive calls to `run()` in the same page load will re-run all
      tests, and there is no comment explaining this intentional behaviour.
      This is a non-obvious 'why' that warrants a comment per convention.
    severity: advisory

  # ── lane-a: config/property-mapper ──────────────────────────────────────────

  - component_id: config/property-mapper
    file: poc/config/property-mapper.js
    type: edge-case
    description: >
      The atomic write guard on line 150 reads:
        `if (errors.length === 0 || errors.every(e => e.includes('clamped')))`
      This string-matching heuristic to distinguish warnings from errors is
      fragile. Any error message that happens to include the word 'clamped'
      (e.g., a custom schema message or a future error format change) will
      be misclassified as a warning, permitting a partial write that should
      have been blocked. The interface contract specifies that clamped-range
      scalars produce warnings and that these must NOT block the write, while
      type mismatches, length mismatches, and required-missing DO block.
      The correct implementation is to track warnings and errors in separate
      arrays during Pass 1, then write only when the errors array is empty,
      returning the concatenation of both. Using a string-contains check on
      the shared `errors` array conflates the two categories.
    severity: blocking

  - component_id: config/property-mapper
    file: poc/config/property-mapper.js
    type: edge-case
    description: >
      Array fields with length errors (minLength, maxLength, exactLength
      violations, lines 119–145) set `hasArrayError = true` to suppress
      adding to `pending`, but the clamped element values produced before
      the length check (lines 103–115) are still pushed into `processedArray`.
      Because `hasArrayError` prevents adding to `pending`, the array is not
      written to target — this is correct. However the element-level clamping
      warnings for those elements are still pushed into `errors`, which means
      warnings appear alongside the length error in the return value even
      though the write was blocked. This creates a confusing mixed message:
      "bpm[0]: clamped" + "offsets: wrong length" together when the field
      was never applied. Minor but creates misleading output for callers.
    severity: advisory

  - component_id: config/property-mapper
    file: poc/config/property-mapper.js
    type: edge-case
    description: >
      The `typeMatches` function for `'float'` (line 21) accepts integers as
      floats because `typeof 42 === 'number'` and `!Number.isNaN(42)` is true.
      The component definition says field types include both `int` and `float`
      as distinct types. When a schema declares `type: 'float'` and the source
      provides an integer, the type check passes silently. This may be
      intentional (JSON does not distinguish int/float) but is not documented.
      For `int` the check uses `Number.isInteger()` (correct); for `float` a
      symmetric comment explaining why integer values are accepted as floats
      would prevent future bugs.
    severity: advisory

  - component_id: config/property-mapper
    file: poc/config/property-mapper.js
    type: convention
    description: >
      Line 60 destructures `default: _` (underscore alias to avoid keyword
      collision) and then silently discards it. The `default` value is not
      used in `validateAndApply` — it is only used in `serialize`. This is
      correct behaviour, but the destructure-and-discard pattern introduces a
      dead variable with an opaque name. Simply omitting `default` from the
      destructure is cleaner; alternatively, destructuring it and immediately
      ignoring it should carry a comment.
    severity: advisory

  # ── lane-b: config/sample-provider-registry ─────────────────────────────────

  - component_id: config/sample-provider-registry
    file: poc/config/sample-provider-registry.js
    type: coherence
    description: >
      The interface specifies the registry as a named-exported `registry`
      object with methods `register`, `get`, `list`, `_reset`. The
      implementation instead exports these as four separate named functions
      (`export { register, get, list, _reset }`, line 38) and uses a plain
      object literal `{}` as the internal store (not a registry object).
      Every caller that imports `{ registry }` will get `undefined` — they
      must import `{ register, get, list, _reset }` individually. The
      component definition says `export { registry }`. All downstream
      consumers (main.js, sample-set-picker, tests) that import `{ registry }`
      as specified will fail at runtime. This is a contract violation.
    severity: blocking

  - component_id: config/sample-provider-registry
    file: poc/config/sample-provider-registry.js
    type: edge-case
    description: >
      The `register` function is called at module load time (line 12) before
      the function declaration on line 14. This works due to JS function
      hoisting. However, the `register` call references `registry` (the plain
      object), and the `in` operator check on line 18 (`provider.id in
      registry`) works differently from a `Map.has()` call: for an object,
      `in` checks own AND prototype chain properties. A provider with
      `id: 'constructor'` or `id: 'toString'` would pass the `in` check
      incorrectly on first registration (reporting it as already registered)
      because those are inherited properties of plain objects. Use
      `Object.prototype.hasOwnProperty.call(registry, provider.id)` or
      switch to a Map.
    severity: blocking

  - component_id: config/sample-provider-registry
    file: poc/config/sample-provider-registry.js
    type: edge-case
    description: >
      `list()` on line 29 returns `Object.values(registry)` — a new array
      each call (correct, per spec). However, since registry is a plain object
      rather than a Map, insertion order is guaranteed in modern JS engines
      only for non-integer keys. Provider IDs like `'built-in:default'` are
      non-integer, so this is safe in practice, but relying on plain-object
      insertion order is not explicit. A Map would make the ordering guarantee
      unambiguous.
    severity: advisory

  # ── lane-b: audio/builtin-click-provider ─────────────────────────────────────

  - component_id: audio/builtin-click-provider
    file: poc/audio/builtin-click-provider.js
    type: edge-case
    description: >
      `init()` creates one `OfflineAudioContext` and reuses it for both beat
      and accent synthesis (lines 48 and 62). However, `OfflineAudioContext`
      can only be rendered once — calling `startRendering()` a second time on
      the same context throws an InvalidStateError. The implementation calls
      `_synthesizeClick` twice with the same `offlineCtx`, and both calls
      invoke `offlineCtx.startRendering()`. The second call will throw because
      the context has already started rendering. Both buffers must be rendered
      in separate OfflineAudioContext instances (or rendered sequentially in
      separate offline contexts). This is a runtime crash on `init()`.
    severity: blocking

  - component_id: audio/builtin-click-provider
    file: poc/audio/builtin-click-provider.js
    type: edge-case
    description: >
      The component spec requires `getSample()` to log
      `console.error('BuiltinClickProvider not initialised')` when called
      before `init()` resolves (failure criterion, line 69 of spec). The
      implementation does log this (line 20). However it logs it on every
      call before init, which will flood the console during the scheduler
      loop's 25 ms polling. The spec does not say "log once"; this is an
      advisory about usability but not a spec violation.
    severity: advisory

  - component_id: audio/builtin-click-provider
    file: poc/audio/builtin-click-provider.js
    type: convention
    description: >
      The object literal assigns `_buffers: null` and `_initialized: false`
      as own properties of the singleton, but `getSample` and `init` use
      `this` to access them (lines 19, 31). For a singleton exported as a
      plain object literal, `this` inside methods is the object itself when
      called as `builtinClickProvider.getSample()`. However, if the method
      is ever destructured (`const { getSample } = builtinClickProvider`) and
      called without the receiver, `this` will be `undefined` in strict mode
      or the global object in sloppy mode, breaking the state access. The
      component should use closure variables instead of `this`, or document
      that the methods must not be destructured.
    severity: advisory

  # ── lane-d: config/content-service ───────────────────────────────────────────

  - component_id: config/content-service
    file: poc/config/content-service.js
    type: convention
    description: >
      The entire module body is wrapped in an IIFE (`const contentService =
      (() => { ... })()`), which is an unnecessary indirection. The `providers`
      array can be a simple closure variable with no IIFE wrapper; the exported
      `contentService` object already closes over it. The IIFE pattern adds a
      nesting level with no benefit and is not idiomatic in ES module code
      (modules provide their own scope).
    severity: advisory

  - component_id: config/content-service
    file: poc/config/content-service.js
    type: convention
    description: >
      The file contains extensive JSDoc block comments (/** ... */) for every
      method. The convention states "no comments explaining what code does —
      only non-obvious why comments." These are what-comments, not why-comments.
      The method names (`register`, `unregister`, `providers`) and parameter
      names are self-descriptive.
    severity: advisory

  # ── lane-d: audio/local-file-provider ────────────────────────────────────────

  - component_id: audio/local-file-provider
    file: poc/audio/local-file-provider.js
    type: coherence
    description: >
      The component definition lists `requires: [config/content-service]`,
      implying the implementation imports or depends on `config/content-service`.
      The actual implementation has no import statement at all — it is a
      standalone singleton with no imports. The `requires` field in the
      component definition was likely an error (the registry dependency was
      flagged similarly in the design validation for media-pool-sample-provider).
      The code is correct in not importing content-service; the file is
      self-contained. No finding against the code itself, but coherence check:
      there is no static import of `config/content-service`.
    severity: advisory

  - component_id: audio/local-file-provider
    file: poc/audio/local-file-provider.js
    type: convention
    description: >
      Extensive JSDoc block comments throughout the file explain what each
      function does (e.g., `@param {File} file`, `@returns {ContentItem}`).
      Convention requires no what-comments; only non-obvious why-comments.
    severity: advisory

  # ── lane-d: audio/recordings-provider ────────────────────────────────────────

  - component_id: audio/recordings-provider
    file: poc/audio/recordings-provider.js
    type: edge-case
    description: >
      The failure criterion states: "import(item, ctx) where pool.getBuffer
      returns undefined must reject with
      Error('RecordingsProvider: buffer not found for id <id>')". The
      implementation rejects with `Error('RecordingsProvider: buffer not found
      for id ${item.id}')` (line 46). The spec uses `<id>` as a placeholder
      for the actual id value, which the implementation correctly interpolates.
      However, the `ctx` parameter is declared but never used (line 42). The
      contract says `import(item, ctx: AudioContext)` must accept ctx as the
      second parameter (per ContentProvider interface). The unused parameter
      should be named with a leading underscore (`_ctx`) to signal intentional
      non-use, per readability conventions.
    severity: advisory

  # ── lane-e: audio/media-pool-sample-provider ─────────────────────────────────

  - component_id: audio/media-pool-sample-provider
    file: poc/audio/media-pool-sample-provider.js
    type: convention
    description: >
      The implementation has no static import of `config/sample-provider-registry`
      — correct, as the design validation flagged that dependency as erroneous.
      The code correctly depends only on the injected `pool` parameter. No
      convention violations in this file. The JSDoc block comments are present
      but describe parameters explicitly rather than explaining why — acceptable
      given the factory function's non-trivial parameter set.
    severity: advisory

  - component_id: audio/media-pool-sample-provider
    file: poc/audio/media-pool-sample-provider.js
    type: edge-case
    description: >
      The `init(ctx)` method (line 80) ignores the `ctx` parameter entirely
      and returns `Promise.resolve()`. The `ctx` parameter is unused — same
      concern as recordings-provider: it should be named `_ctx` to avoid the
      implicit "why is this not used?" question. The convention requires
      clarity without comments.
    severity: advisory

  # ── lane-c: config/workspace ──────────────────────────────────────────────────

  - component_id: config/workspace
    file: poc/config/workspace.js
    type: coherence
    description: >
      The interface specifies `exportWorkspace(components: WorkspaceComponents)`
      with no second argument. The implementation signature is
      `exportWorkspace(components, jsyaml)` (line 158), and similarly
      `downloadWorkspace(components, jsyaml)`, `copyWorkspace(components, jsyaml)`,
      `importWorkspace(text, filename, fileSize, components, jsyaml)`, and
      `registerDropTarget(components, jsyaml)` all take `jsyaml` as an explicit
      parameter. The component definition specifies that jsyaml is loaded as a
      plain `<script>` and accessed as `window.jsyaml` — it is not injected as
      a parameter. The implementation's signature differs from the specified
      interface, meaning all callers (main.js) must pass jsyaml explicitly or
      the functions will receive undefined for the jsyaml parameter and
      crash on `jsyaml.dump()`. In main.js the export/copy buttons call
      `exportWorkspace(components)` without passing jsyaml (lines 597, 622),
      which will crash. This is a coherence failure between interface and
      implementation.
    severity: blocking

  - component_id: config/workspace
    file: poc/config/workspace.js
    type: coherence
    description: >
      `importWorkspace` validates sections by calling `component.importConfig(slice)`
      during validation (lines 261–265) and then calls `component.importConfig(slice)`
      again on apply (line 294). This means `importConfig` is called twice for
      every successfully validated section: once to validate, once to actually
      write. The component definition states that `importConfig` both validates
      AND applies. If `importConfig` has side effects (which it does — it calls
      `replaceAll` in preset-store, and writes tc fields), then the first call
      during "validation" already applies the change. The confirmation dialog
      fires after the first application, making it meaningless. The spec requires
      that `importConfig` be called only once, on Apply. A separate dry-run
      validation pass would need to be done differently (e.g., using
      validateAndApply on a scratch target before calling importConfig). This
      is a fundamental logic error in the import flow.
    severity: blocking

  - component_id: config/workspace
    file: poc/config/workspace.js
    type: coherence
    description: >
      The `exportWorkspace` function (line 158) does not produce a WorkspaceComponents
      interface as the spec defines. The spec says the components map has keys
      `global`, `metronome`, `sampleSets`, `presets`, each with `exportConfig()`
      methods. But in main.js (line 594) the call is `exportWorkspace({ tc, pool,
      metronome, presetStore })` — passing raw state objects that do not have
      `exportConfig()`. When `components.global.exportConfig()` is called on
      `tc` (which has no `exportConfig` method), it will throw TypeError. The
      workspace module and main.js have incompatible assumptions about the
      components shape. This is a wiring mismatch in main.js, but the workspace
      module must document (or validate) the expected shape.
    severity: blocking

  - component_id: config/workspace
    file: poc/config/workspace.js
    type: convention
    description: >
      The module imports `serialize` from `property-mapper.js` (line 7) but
      never uses it. Dead import.
    severity: advisory

  # ── lane-c: ui/context-menu ───────────────────────────────────────────────────

  - component_id: ui/context-menu
    file: poc/ui/context-menu.js
    type: coherence
    description: >
      The menu DOM construction appends `copyItem` and `editItem` in that order
      (lines 144–145), but the Paste Config item (`pasteItem`) is appended to
      `menu` inside the `if (navigator.clipboard?.readText)` block (line 127)
      before `copyItem` and `editItem` are appended. The resulting menu order
      will be: Paste Config (if available), Copy Config, Edit Config — but the
      spec says the order is Copy Config, Paste Config (if available), Edit
      Config. The success criterion reads: "dropdown with exactly three items:
      'Copy Config', 'Paste Config' (if clipboard available), 'Edit Config...'".
    severity: blocking

  - component_id: ui/context-menu
    file: poc/ui/context-menu.js
    type: edge-case
    description: >
      The viewport clamping logic (lines 147–175) calls
      `menu.getBoundingClientRect()` immediately after setting the initial
      `left` and `top` via `style.cssText`. At this point the menu has not yet
      been appended to the document (`document.body.appendChild(menu)` is on
      line 177, after the clamping logic). An element not in the DOM has a zero
      bounding rect; `rect.right`, `rect.bottom`, and `rect.width` will all be
      0. The clamping adjustments will then be applied based on a zero-size
      element, which means the position is never corrected for viewport overflow.
      The menu must be appended first, then clamped.
    severity: blocking

  - component_id: ui/context-menu
    file: poc/ui/context-menu.js
    type: convention
    description: >
      The Copy Config action falls back to `JSON.stringify` when `window.jsyaml`
      is not available (line 52). The component definition does not mention a
      JSON fallback — it says "serialises to YAML via jsyaml.dump()". The jsyaml
      library is always available after page load (loaded as a plain `<script>`
      before the module). The JSON fallback adds dead-code complexity and hides
      a missing-dependency bug.
    severity: advisory

  - component_id: ui/context-menu
    file: poc/ui/context-menu.js
    type: edge-case
    description: >
      The Paste Config error handler (lines 116–124) calls `hideMenu()` after
      a `NotAllowedError`. The spec says: "the Paste Config item should be
      hidden retroactively or the operation simply ignored." Hiding the entire
      menu on a permission denial removes all other options (Copy Config, Edit
      Config) from the user. The correct behaviour is to silently do nothing
      (leave the menu open) or remove only the Paste item.
    severity: advisory

  # ── lane-c: ui/edit-config-modal ─────────────────────────────────────────────

  - component_id: ui/edit-config-modal
    file: poc/ui/edit-config-modal.js
    type: coherence
    description: >
      The overlay uses `display: none` initially and switches to `display: flex`
      on open (lines 20, 191). The z-index of the overlay is 600 as required
      (line 24). However `display: none` means the flex layout properties on the
      overlay (`align-items: center; justify-content: center`) have no effect
      when hidden. On show (`overlay.style.display = 'flex'`) the dialog will be
      centered. This is correct. No blocking finding.
    severity: advisory

  - component_id: ui/edit-config-modal
    file: poc/ui/edit-config-modal.js
    type: convention
    description: >
      The module-level `modalInstance` variable (line 7) is a singleton guard,
      which is correct. However, `createEditConfigModal()` appends the modal to
      `document.body` inside the factory (line 98). If called in a non-browser
      environment (tests, SSR), this will throw a ReferenceError on
      `document.body`. There is no guard. This is consistent with the POC scope
      (browser only) but the test suite will require a DOM environment or a mock.
    severity: advisory

  - component_id: ui/edit-config-modal
    file: poc/ui/edit-config-modal.js
    type: convention
    description: >
      Copy Config falls back to `JSON.stringify` when `window.jsyaml` is
      unavailable (line 181). Same issue as context-menu: the JSON fallback is
      dead code in the browser context and hides a missing-dependency bug.
    severity: advisory

  # ── lane-f: config/preset-store ──────────────────────────────────────────────

  - component_id: config/preset-store
    file: poc/config/preset-store.js
    type: coherence
    description: >
      The component interface specifies `function createPresetStore(): PresetStore`
      with no arguments. The implementation signature is
      `function createPresetStore(localStorageRef)` (line 22), accepting a
      localStorage reference for dependency injection. This diverges from the
      interface. In main.js, the call is `createPresetStore(localStorage)` (line
      76), which works as implemented but violates the contract. The component
      definition does not mention dependency injection of localStorage. Either
      the interface must be updated, or the implementation must default to
      `window.localStorage` internally.
    severity: advisory

  - component_id: config/preset-store
    file: poc/config/preset-store.js
    type: coherence
    description: >
      The `PRESETS_SCHEMA` constant (lines 18–20) is defined but never used. The
      `importConfig` function validates `obj.presets` manually without calling
      `validateAndApply` on the outer object. This is dead code that will confuse
      future maintainers. Remove it.
    severity: advisory

  - component_id: config/preset-store
    file: poc/config/preset-store.js
    type: edge-case
    description: >
      `importConfig` validates each non-null preset entry using `validateAndApply`
      with `PRESET_SCHEMA` against a scratch `target = {}` (line 135). When
      `validateAndApply` returns errors, those error strings are prefixed with
      `presets[${i}]:` (line 138). However, `validateAndApply` may also return
      warnings (clamped values) in the error array. The prefix is applied
      uniformly to both errors and warnings, which is correct behaviour. But
      because the validateAndApply guard is fragile (the string-based
      error/warning distinction noted in the property-mapper finding), a clamped
      value in a preset will still block the import if the guard misclassifies it.
      This is a downstream consequence of the property-mapper blocking finding.
    severity: advisory

  # ── lane-f: ui/preset-bank ───────────────────────────────────────────────────

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: coherence
    description: >
      The component definition interface specifies
      `function createPresetBank(container, store, tc, metronome): PresetBankController`.
      The implementation signature is
      `function createPresetBank(container, store, tc, metronome, docRef = document)`
      (line 16), adding an undocumented fifth parameter `docRef` for DOM
      dependency injection. This diverges from the interface. The extra parameter
      is used for testability (the `MockButton` class on line 155 suggests this).
      However, adding undocumented parameters to a public factory function
      changes the callable interface silently.
    severity: advisory

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: convention
    description: >
      The file exports both `createPresetBank` and `snapshotFrom` (line 191).
      The component definition marks `snapshotFrom` as an internal helper
      "(internal helper — not exported)". Exporting it widens the public API
      beyond the contract.
    severity: advisory

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: convention
    description: >
      The `MockButton` class (lines 155–189) is implemented with `class` syntax
      and uses `class` keyword. Convention prohibits `class` syntax. Additionally,
      `MockButton` is test infrastructure living in a production module file. Test
      doubles belong in test files, not production modules. If `docRef` injection
      is the testability mechanism, the DOM methods accessed can be mocked via the
      injected docRef — no MockButton is needed in the production file.
    severity: blocking

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: edge-case
    description: >
      `updateSlotUI` (line 32) references `saveMode` from the enclosing scope.
      Inside `render()`, `updateSlotUI` is called for all 8 slots. The `saveMode`
      styling (`classList.add('preset-save-mode')`) is applied only inside the
      non-null branch, but it is never removed from a filled slot when
      `saveMode` becomes false. When save mode is toggled off, `render()` is
      called which re-calls `updateSlotUI`, but for non-null presets the code
      does `classList.add('preset-filled')` and then only conditionally adds
      `preset-save-mode` if `saveMode` is true — it does not remove
      `preset-save-mode` if it is false. This means once a slot has had
      `preset-save-mode` added, exiting save mode does not remove that class.
    severity: blocking

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: coherence
    description: >
      The design validation noted (as blocking) that `metronome.restart()`
      semantics relative to beat-0 reset were unverified. The metronome
      refactor defines `restart()` as `stop() + start()` (line 62–65 of
      metronome.js). `start()` resets `currentBeat = 0` and
      `measureStart = context.currentTime` (lines 48–50). So `restart()` does
      reset to beat 0 and re-reads tc at call time. This is now verifiable from
      the implementation. The design-validation blocking finding is resolved by
      the implementation. Documenting this for completeness.
    severity: advisory

  - component_id: ui/preset-bank
    file: poc/ui/preset-bank.js
    type: edge-case
    description: >
      `initGlobalWorkspace` in main.js wires the preset save button separately
      with a click handler that does nothing (lines 463–467: empty arrow
      function). The preset-bank already wires the save button internally via
      `docRef.getElementById('preset-save-btn')` (line 128). The empty handler
      in main.js is dead code attached to the same button. This does not break
      anything but adds listener confusion.
    severity: advisory

  # ── lane-e: ui/sample-set-picker ─────────────────────────────────────────────

  - component_id: ui/sample-set-picker
    file: poc/ui/sample-set-picker.js
    type: edge-case
    description: >
      `startNewSampleSet` uses `prompt()` (line 134) to get the sample set name.
      `prompt()` is a blocking synchronous call that freezes the page. While
      acceptable in a POC context, the spec requires "a name-input prompt" which
      implies a non-blocking inline input. More critically, if the user enters an
      empty string and then cancels the prompt, `name.trim() === ''` also returns
      early — this is correct per the failure criterion "If the user cancels the
      'New sample set…' name prompt, the UI returns to its previous state." The
      empty-string case closing early is correct.
    severity: advisory

  - component_id: ui/sample-set-picker
    file: poc/ui/sample-set-picker.js
    type: edge-case
    description: >
      The `handleSlotAssignmentEscape` listener (line 258) is registered on
      `document` (line 183) when `renderSlotAssignment` is called, but it is
      never removed when the slot assignment view is dismissed via
      `closeDropdown()`. `closeDropdown()` removes `handleDropdownEscape` and
      `handleOutsideClick` (lines 113–115) but not `handleSlotAssignmentEscape`.
      After closing, Escape key will still trigger the listener on every keydown
      until the component is disposed. Dispose only removes `handleDropdownEscape`
      and `handleOutsideClick` (lines 306–307), not `handleSlotAssignmentEscape`.
    severity: blocking

  - component_id: ui/sample-set-picker
    file: poc/ui/sample-set-picker.js
    type: edge-case
    description: >
      The `openClipBrowser` function adds a per-invocation `handleEscape`
      listener to `document` (line 247) but removes it only within the same
      callback closure (line 244). If the user opens the clip browser, presses
      Escape (which removes that listener and dismisses the browser), then opens
      clip browser again, a new listener is registered. This is correct for that
      path. However if `closeDropdown` is called while the clip browser is open
      (outside click while browserEl is visible), `browserEl.remove()` is never
      called (closeDropdown only hides slotAssignmentEl, not the dynamically
      created browserEl), and the Escape listener for the clip browser remains
      registered. The browserEl itself remains in the DOM under the hidden parent.
    severity: advisory

  # ── lane-g: visualizers/alignment-monitor ────────────────────────────────────

  - component_id: visualizers/alignment-monitor
    file: poc/visualizers/alignment-monitor.js
    type: convention
    description: >
      The file uses `export function createAlignmentMonitor(...)` (line 10) and
      separately `export { ALIGN_MEASURES }` (line 114) — two different export
      styles in the same file. The convention says no default exports from
      multi-export files; both exports are named, so that rule is satisfied. But
      mixing declaration-level `export` with a bottom-of-file `export { ... }`
      in the same module is inconsistent. Use one style throughout.
    severity: advisory

  - component_id: visualizers/alignment-monitor
    file: poc/visualizers/alignment-monitor.js
    type: edge-case
    description: >
      The spec requires: "If canvas.width is 0, draw() returns without error —
      no division-by-zero crash." When `canvas.width === 0`, `ringBuffer` has
      length `ALIGN_MEASURES * 0 = 0`. The `columnsToAdvance` computation
      (line 48) divides by `measureDuration` which can be non-zero, so that
      is safe. But `ringBuffer.length === 0` means the modulo in
      `ringIndex = (ringIndex + 1) % ringBuffer.length` (line 64) is
      `% 0 = NaN`. The draw loop then iterates `bufferLen = 0` times, so
      the crash never occurs — the ring buffer advance loop correctly skips.
      The draw loop also iterates 0 times. So the canvas.width === 0 case
      is safe. No blocking finding.
    severity: advisory

  - component_id: visualizers/alignment-monitor
    file: poc/visualizers/alignment-monitor.js
    type: edge-case
    description: >
      `columnsToAdvance` is computed only when `prevMeasureStart !== null &&
      state.measureStart !== prevMeasureStart` (lines 45–48). On the very first
      frame after start, `prevMeasureStart` is null, so `columnsToAdvance` stays
      0. This is correct (no data to scroll yet). However, after `reset()` is
      called (line 104), `prevMeasureStart` is reset to null. If `reset()` is
      called mid-playback (e.g., on stop), the next frame will have
      `isRunning === false` and will clear and return — also correct. So
      the reset-then-restart path is safe.
    severity: advisory

  # ── modified: timing/tempo-context.js ────────────────────────────────────────

  - component_id: timing/tempo-context-additions
    file: poc/timing/tempo-context.js
    type: coherence
    description: >
      All three new fields are present: `beatAccents`, `clickProviderRef`,
      `snapThreshold`. Defaults match the spec exactly. `setBeatsPerMeasure`
      resets `beatAccents` alongside `beatOffsets` and `beatVolumes` but does
      not touch `clickProviderRef` or `snapThreshold`. The existing default
      `beatVolumes` of `[0.5, 0.5, 0.5, 0.5]` is inconsistent with the spec
      which says `all 1.0` for the reset values from `setBeatsPerMeasure` —
      however the initial `createTempoContext()` default is not required to
      match the reset value. The success criteria say
      "setBeatsPerMeasure(tc, 3) sets tc.beatVolumes to [1, 1, 1]" — the
      implementation correctly uses `() => 1` for the reset (line 18). The
      initial default of 0.5 for the out-of-the-box context is a separate
      concern not covered by the addition spec. No finding.
    severity: advisory

  # ── modified: timing/metronome.js ────────────────────────────────────────────

  - component_id: timing/metronome-refactor
    file: poc/timing/metronome.js
    type: coherence
    description: >
      The spec says: "If getSample() returns undefined instead of null, the
      null guard still skips creation — no TypeError; however, the provider
      contract violation is not silently ignored — log
      console.warn('getSample returned undefined; provider should return null')".
      The implementation's null guard is `if (buf && volume >= 0.01)` (line 26)
      and the else branch `else if (!buf)` (line 33) logs a console.error with
      the message 'metronome: getSample() returned null — provider not ready'.
      When `getSample()` returns `undefined`, `!buf` is true, so the same
      console.error fires. The spec requires a distinct console.warn when the
      return is `undefined` (not null), because the contract violation (undefined
      vs null) should be distinguishable from a legitimate "not yet initialized"
      null. The implementation does not distinguish the two cases.
    severity: advisory

  - component_id: timing/metronome-refactor
    file: poc/timing/metronome.js
    type: coherence
    description: >
      The component definition says `start()` accepts an optional `clickProvider`
      argument "to allow hot-swap at restart time". The implementation's `start()`
      signature is `function start()` with no parameter (line 46). The `clickProvider`
      is captured from the factory parameter at construction time. Hot-swapping
      via `start()` is not supported. This omission means `restart()` always uses
      the original provider — a new provider cannot be injected at restart time.
      The spec feature is unimplemented, but for the POC the sample-set-picker
      updates `tc.clickProviderRef` and then calls `metronome.restart()`, which
      still uses the original builtin provider — the actual sound won't change.
    severity: advisory

  # ── modified: poc/main.js ─────────────────────────────────────────────────────

  - component_id: poc/main.js-refactor
    file: poc/main.js
    type: coherence
    description: >
      `exportWorkspace` and `importWorkspace` are called with raw state objects
      (`{ tc, pool, metronome, presetStore }`) rather than the `WorkspaceComponents`
      interface (objects with `exportConfig`/`importConfig` methods) that
      `config/workspace.js` expects. When `workspace.js` calls
      `components.global.exportConfig()`, `tc` has no `exportConfig` method —
      this will throw TypeError at runtime. The workspace module and main.js are
      incompatible in their assumptions about the components shape. This is a
      direct consequence of the workspace blocking finding above.
    severity: blocking

  - component_id: poc/main.js-refactor
    file: poc/main.js
    type: coherence
    description: >
      `initSampleBrowser()` and `initGlobalWorkspace()` are called inside the
      Start button handler (lines 217–223), which means content providers and
      context menus are registered only after the user clicks Start. The spec
      says content provider registration is done "after pool is created" and
      the pool is created at module load time (line 74). If the user opens the
      sample browser or tries a context menu before clicking Start, nothing will
      be registered. The spec's initSampleBrowser/initGlobalWorkspace should be
      called at module load time (or at DOMContentLoaded), not gated on Start.
    severity: advisory

  - component_id: poc/main.js-refactor
    file: poc/main.js
    type: coherence
    description: >
      The `initGlobalWorkspace` function (line 558) manually implements its own
      drag-and-drop handler for workspace YAML files instead of calling
      `registerDropTarget(components, jsyaml)` from `config/workspace.js`. The
      `workspace.js` module exports `registerDropTarget` precisely for this use
      case. The hand-rolled handler at lines 639–679 reimplements a subset of
      that logic without proper error handling (no size check, no YAML parse
      error toast — just a console.error). Additionally it calls
      `importWorkspace(text, { tc, pool, metronome, presetStore })` with the
      wrong signature — the workspace module's signature is
      `importWorkspace(text, filename, fileSize, components, jsyaml)`.
    severity: blocking

  - component_id: poc/main.js-refactor
    file: poc/main.js
    type: coherence
    description: >
      The preset Save button is double-wired: once internally by
      `createPresetBank` (which looks up `#preset-save-btn` and attaches a
      click listener), and again by `initMetroPanel` which adds an empty click
      handler to `presetSaveBtn` (lines 463–467). The empty handler does
      nothing but is attached to the same DOM element, adding listener clutter.
    severity: advisory

  # ── modified: poc/index.html ─────────────────────────────────────────────────

  - component_id: poc/index-html-final-assembly
    file: poc/index.html
    type: coherence
    description: >
      The alignment-monitor canvas is placed before the beat-grid canvas in the
      DOM (line 266 before line 267). The spec requires this ordering so that
      the alignment monitor is visually behind the beat-grid. This is correct.
      The js-yaml.min.js plain script (line 301) is loaded before the module
      script (line 302). This is correct. The global toolbar header is present
      (lines 207–213). The file import UI elements are present (lines 292–295).
      The preset bank container and save button are present (lines 268–269).
      The `alignment-monitor` canvas has the correct id (line 266).
    severity: advisory

  - component_id: poc/index-html-final-assembly
    file: poc/index.html
    type: coherence
    description: >
      The `js-yaml.min.js` file is referenced as `lib/js-yaml.min.js` (line 301)
      but no file at `poc/lib/js-yaml.min.js` is present in the repo. The
      component definition marks jsyaml vendoring as "a manual step (copy file
      to poc/lib/) — not wired in main.js." This means the app will load with a
      404 for js-yaml, and every `window.jsyaml` access will be undefined,
      causing all context menus, edit-config modal, and workspace export/import
      to fall back to JSON or crash. This is documented as a manual step, but
      the file must exist before the app can run.
    severity: advisory

verdict: needs-revision
```

---

## Blocking Findings Summary

Eight blocking issues require resolution before the implementation can be approved:

1. **`config/property-mapper` (edge-case)**: The atomic write guard uses
   `errors.every(e => e.includes('clamped'))` to distinguish warnings from errors.
   This string-match heuristic is fragile and will misclassify any future error
   containing the word "clamped." Warnings and errors must be tracked in separate
   arrays during Pass 1.

2. **`config/sample-provider-registry` (coherence)**: The module exports four
   individual functions (`register`, `get`, `list`, `_reset`) but the interface
   specifies a named export `registry` object. All callers that import `{ registry }`
   will get `undefined`. The module must export a `registry` object or all downstream
   imports must be updated to match the actual exports.

3. **`config/sample-provider-registry` (edge-case)**: The `in` operator check on
   a plain object (`provider.id in registry`) traverses the prototype chain. Provider
   IDs like `'constructor'` or `'toString'` will falsely appear as already registered.
   Use `Object.prototype.hasOwnProperty.call(registry, provider.id)` or a `Map`.

4. **`audio/builtin-click-provider` (edge-case)**: A single `OfflineAudioContext`
   is reused for both beat and accent synthesis. `startRendering()` is called twice
   on the same context; the second call throws `InvalidStateError`. Each buffer must
   use a separate `OfflineAudioContext`.

5. **`config/workspace` (coherence — import double-call)**: `importConfig` is called
   during validation (first pass) and again on apply (second pass). Because
   `importConfig` applies changes as a side effect, the first call already mutates
   state before the confirmation dialog appears. The validation pass must use a
   dry-run mechanism (e.g., `validateAndApply` on a scratch target) without calling
   `importConfig`.

6. **`config/workspace` (coherence — jsyaml parameter)**: The implementation adds
   `jsyaml` as an explicit parameter to every exported function, but the interface
   specifies no such parameter, and main.js calls these functions without passing
   jsyaml. All calls in main.js will receive `undefined` for jsyaml and crash on
   `jsyaml.dump()`. Either use `window.jsyaml` internally (per the spec) or update
   all callers to pass jsyaml.

7. **`ui/context-menu` (coherence — menu item order)**: Paste Config is appended
   before Copy Config and Edit Config in the DOM, producing order: Paste, Copy,
   Edit. The spec requires Copy, Paste, Edit. The `pasteItem` must be appended
   after `copyItem`.

8. **`ui/context-menu` (edge-case — clamping before DOM insertion)**: The viewport
   clamping logic reads `getBoundingClientRect()` before appending the menu to the
   document. Elements not in the DOM have zero bounding rect; the clamping will
   always produce incorrect results. Append to DOM first, then clamp.

9. **`ui/preset-bank` (convention — class syntax in production module)**: The
   `MockButton` class uses forbidden `class` syntax and is test infrastructure
   embedded in a production module. Test doubles belong in test files.

10. **`ui/preset-bank` (edge-case — save-mode class not removed)**: `classList.remove('preset-save-mode')`
    is never called on filled slots when exiting save mode. The save-mode visual state
    persists after save mode ends.

11. **`ui/sample-set-picker` (edge-case — listener leak)**: `handleSlotAssignmentEscape`
    is added to `document` in `renderSlotAssignment` but never removed in
    `closeDropdown` or `dispose`. The listener accumulates on every slot-assignment
    view open.

12. **`poc/main.js` (coherence — workspace component shape mismatch)**: `exportWorkspace`
    and `importWorkspace` are called with raw state objects (`tc`, `pool`, `metronome`,
    `presetStore`) that do not implement the `WorkspaceComponent` interface
    (`exportConfig`/`importConfig`). This will throw TypeError at runtime.

13. **`poc/main.js` (coherence — broken drop handler)**: `initGlobalWorkspace` hand-rolls
    a document drag-drop handler instead of using `registerDropTarget`, and calls
    `importWorkspace` with the wrong signature (missing `filename`, `fileSize`, and
    `jsyaml` arguments).

---

## CompletionReport

```yaml
agent_role: staff-engineer
task_id: 06b-se-code-review
deliverables:
  - agents/artifacts/06b-code-review.md
summary: >
  Reviewed all 20 components across 16 new files and 5 modified files. Found 13
  blocking issues across 7 files: a fragile atomic-write guard in property-mapper;
  two contract violations in sample-provider-registry (wrong export shape and prototype-
  chain `in` operator); a fatal OfflineAudioContext reuse bug in builtin-click-provider;
  three blocking coherence failures in config/workspace (double-apply during validation,
  jsyaml parameter mismatch, and wrong component shape assumption); two DOM ordering
  and listener bugs in ui/context-menu; a class-syntax violation with test-double
  in production code and a save-mode class leak in ui/preset-bank; a listener leak
  in ui/sample-set-picker; and two interconnected wiring failures in main.js that
  stem from the workspace coherence issues. Advisory findings cover style conventions,
  dead code, and usability edge cases but do not block functionality.
unexpected_conditions:
  - "The design-validation blocking finding about metronome.restart() beat-0 semantics
     is resolved by the implementation: start() resets currentBeat=0 and measureStart
     to context.currentTime, so restart() = stop()+start() from beat 0 is correct."
  - "The config/sample-provider-registry blocking finding from design validation
     (erroneous registry import in media-pool-sample-provider) is correctly absent
     from the implementation — media-pool-sample-provider.js has no such import."
workflow_misses: []
improvement_suggestions:
  - "Separate warning and error tracking in validateAndApply using two distinct
     arrays from the start; return { errors, warnings } or a tagged union rather
     than a flat string array. The current design forces callers to inspect message
     content to classify severity."
  - "The workspace import flow would be simpler if each WorkspaceComponent exposed
     a separate validate(slice) method that returns errors without side effects,
     and importConfig(slice) that only writes. The two-method contract eliminates
     the double-call problem structurally."
  - "MockButton and other test doubles should live in poc/test/mocks.js, not in
     production modules. The docRef injection pattern for testability is good;
     the mock implementation should not ship with the production code."
```
