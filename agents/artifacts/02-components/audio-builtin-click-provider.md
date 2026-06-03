```yaml
id: audio/builtin-click-provider
lane: lane-b
purpose: >
  Synthesises and caches two AudioBuffer click sounds (beat and accent) on initialisation,
  then serves them synchronously via getSample(). It is the default SampleProvider that
  replaces the inline synthesis previously embedded in the metronome scheduler, restoring
  the same sonic behaviour through the generalised SampleProvider interface.
scope:
  includes:
    - "BuiltinClickProvider factory function (or plain object) implementing the SampleProvider interface"
    - "init(ctx) — synthesises two AudioBuffers (index 0: beat, index 1: accent) and caches them"
    - "getSample(index) — synchronous array lookup; returns null before init() resolves or for index > 1"
    - "count() — returns 2"
    - "id field: 'built-in:default'"
    - "label field: 'Default (synthesised)'"
    - "Beat buffer (index 0): 900 Hz sine + 8 ms noise burst, gain 0.3, duration 70 ms"
    - "Accent buffer (index 1): 1200 Hz sine + 8 ms noise burst, gain 0.5, duration 70 ms"
    - "Module file at poc/audio/builtin-click-provider.js"
    - "Module exports a single pre-constructed instance as a named export 'builtinClickProvider'"
  excludes:
    - "Registration into SampleProviderRegistry — that is done by config/sample-provider-registry at import time"
    - "Any UI for selecting this provider"
    - "Dynamic re-synthesis after init() — buffers are generated once and reused"
    - "AudioContext creation — ctx is always passed in from outside"
interface: |
  // poc/audio/builtin-click-provider.js

  // SampleProvider interface (see specs/workspace.md §4):
  interface SampleProvider {
    id: string
    label: string
    init(ctx: AudioContext): Promise<void>
    getSample(index: number): AudioBuffer | null
    count(): number
  }

  // The pre-constructed singleton instance. Exported for registration and test use.
  // Implements SampleProvider.
  const builtinClickProvider: SampleProvider

  export { builtinClickProvider }

  // Buffer synthesis specification (implemented inside init()):
  //   index 0 — beat:
  //     sine oscillator at 900 Hz, rendered into a 70 ms AudioBuffer
  //     gain envelope: ramp to 0.3 over 3 ms, exponential decay to ~0 by 70 ms
  //     noise burst: 8 ms white noise, gain 0.3 at t=0, exponential decay to 0 by 12 ms
  //     both components mixed into a single mono AudioBuffer
  //   index 1 — accent:
  //     sine oscillator at 1200 Hz, rendered into a 70 ms AudioBuffer
  //     gain envelope: ramp to 0.5 over 3 ms, exponential decay to ~0 by 70 ms
  //     noise burst: 8 ms white noise, gain 0.5 at t=0, exponential decay to 0 by 12 ms
  //     both components mixed into a single mono AudioBuffer
success_criteria:
  - "builtinClickProvider.id === 'built-in:default'"
  - "builtinClickProvider.label === 'Default (synthesised)'"
  - "builtinClickProvider.count() === 2"
  - "builtinClickProvider.getSample(0) returns null before init() is called"
  - "builtinClickProvider.getSample(1) returns null before init() is called"
  - "After init(ctx) resolves, builtinClickProvider.getSample(0) returns an AudioBuffer with duration ~0.07 s"
  - "After init(ctx) resolves, builtinClickProvider.getSample(1) returns an AudioBuffer with duration ~0.07 s"
  - "After init(ctx) resolves, builtinClickProvider.getSample(0) and getSample(1) return different AudioBuffer instances"
  - "builtinClickProvider.getSample(2) returns null after init() resolves (index out of range)"
  - "builtinClickProvider.getSample(-1) returns null after init() resolves (negative index)"
  - "Calling init(ctx) a second time is a no-op — returns Promise.resolve() immediately without re-synthesising"
  - "The returned AudioBuffer for index 0 is mono (numberOfChannels === 1)"
failure_criteria:
  - "getSample() called before init() resolves must return null and log console.error('BuiltinClickProvider not initialised') — must not throw"
  - "getSample() must never return undefined — always AudioBuffer | null"
  - "If ctx.createBuffer or offline rendering throws during init(), init() must reject with the original error so main.js can disable the metronome start"
dependencies:
  requires: []
  must_not_require:
    - "config/sample-provider-registry"
    - "config/property-mapper"
    - "timing/metronome"
    - "any DOM module"
    - "any visualizer"
```
