```yaml
id: timing/metronome-refactor
lane: lane-b
purpose: >
  Removes the inline click synthesis from the metronome scheduler and replaces it with
  SampleProvider lookup via getSample(). The scheduler's lookahead timing logic, interval
  polling, and beat-offset handling are unchanged — only the click-playback path is
  modified. The result is a metronome that produces the same sound but is decoupled from
  any specific synthesis strategy.
scope:
  includes:
    - "Removal of playClick() and all direct oscillator/noise-buffer allocation code"
    - "Addition of a clickProvider parameter to createMetronome()"
    - "Scheduler loop calls clickProvider.getSample(accent ? 1 : 0) to obtain an AudioBuffer"
    - "Null guard: if getSample() returns null OR beatVolumes[beat] < 0.01, no AudioBufferSourceNode is created"
    - "On null return from getSample() for the built-in provider, log console.error indicating provider not ready"
    - "getPlayheadPosition() rewritten to derive scroll from measureStart and nextBeatTime to avoid drift on BPM change"
    - "start() accepts an optional clickProvider argument to allow hot-swap at restart time; if omitted, uses the provider passed at construction"
    - "restart() = stop() followed by start() from beat 0, re-reading current tc values (bpm, beatsPerMeasure, beatOffsets, beatVolumes, beatAccents) at call time"
    - "Module file: poc/timing/metronome.js (in-place modification)"
  excludes:
    - "Lookahead interval value, scheduling algorithm, beat-offset logic — unchanged"
    - "Resolution of clickProviderRef from the registry — that is main.js wiring responsibility"
    - "AudioContext creation"
    - "Any UI"
    - "exportConfig / importConfig methods — those are added in the lane-c workspace work, not here"
interface: |
  // poc/timing/metronome.js (modified signature)

  // Creates a metronome bound to an AudioContext, a TempoContext, and a SampleProvider.
  // clickProvider must implement SampleProvider (see specs/workspace.md §4).
  // The provider must have init() already resolved before start() is called.
  function createMetronome(
    context: AudioContext,
    tc: TempoContext,
    clickProvider: SampleProvider
  ): Metronome

  interface Metronome {
    start(): void
    stop(): void
    // Equivalent to stop() + start() from beat 0, re-reading current tc values at call time.
    restart(): void

    // Returns normalized 0–1 position of the playhead within the current measure,
    // derived from measureStart and nextBeatTime (not playbackStart) to remain
    // accurate after mid-session BPM changes. Returns null if stopped.
    getPlayheadPosition(): number | null

    isRunning(): boolean
  }

  // Internal scheduler loop (not exported) — replaces playClick():
  //   const accent = tc.beatAccents[currentBeat] ?? (currentBeat === 0);
  //   const buf = clickProvider.getSample(accent ? 1 : 0);
  //   if (buf && tc.beatVolumes[currentBeat] >= 0.01) {
  //     const src = context.createBufferSource();
  //     src.buffer = buf;
  //     const g = context.createGain();
  //     g.gain.value = tc.beatVolumes[currentBeat];
  //     src.connect(g).connect(context.destination);
  //     src.start(nextBeatTime);
  //   } else if (!buf) {
  //     console.error('metronome: getSample() returned null — provider not ready');
  //   }
success_criteria:
  - "Given a mock SampleProvider whose getSample(0) returns a valid AudioBuffer and getSample(1) returns a different AudioBuffer, createMetronome(...).start() schedules AudioBufferSourceNodes using those buffers — no oscillators or noise buffers are created"
  - "Given tc.beatAccents=[true,false], the scheduler calls getSample(1) for beat 0 and getSample(0) for beat 1"
  - "Given tc.beatVolumes=[1.0, 0.0], beat 1 creates no AudioBufferSourceNode even if getSample returns a valid buffer"
  - "Given a provider whose getSample() returns null, the scheduler logs a console.error and creates no AudioBufferSourceNode — no exception is thrown"
  - "getPlayheadPosition() returns 0.0 immediately after start(), advances toward 1.0, and wraps back to 0.0 at the next measure boundary"
  - "getPlayheadPosition() returns the same measure-relative position after a BPM change mid-session (no drift from playbackStart offset)"
  - "stop() then start() resets the position to 0.0 and uses the same clickProvider"
  - "restart() called while running: metronome stops, beat counter resets to 0, scheduling resumes from AudioContext.currentTime using current tc.bpm"
  - "restart() called while stopped: behaves identically to start() from beat 0"
  - "isRunning() returns false before start(), true after start(), false after stop()"
failure_criteria:
  - "If clickProvider is not provided or is undefined, createMetronome throws TypeError('createMetronome: clickProvider is required')"
  - "If getSample() returns undefined instead of null, the null guard 'if (buf && ...)' still skips creation — no TypeError (undefined is falsy); however, the provider contract violation is not silently ignored — log console.warn('getSample returned undefined; provider should return null')"
  - "playClick() must not exist in the exported or internal scope after refactor — its presence constitutes a failure"
dependencies:
  requires:
    # ordering constraint only — builtin-click-provider must be init()'d before start() is called;
    # it is NOT statically imported by metronome.js (the provider is injected as a parameter)
    - "audio/builtin-click-provider"
  must_not_require:
    - "config/sample-provider-registry"
    - "config/property-mapper"
    - "any UI module"
    - "any visualizer"
```
