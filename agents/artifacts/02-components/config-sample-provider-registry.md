```yaml
id: config/sample-provider-registry
lane: lane-b
purpose: >
  Maintains the application-wide registry of SampleProvider instances as a module-level
  singleton. Providers register themselves at import time; the metronome resolves its
  active provider by ID at start time. Exposes a test-only reset method to allow
  teardown between test cases without module-cache busting.
scope:
  includes:
    - "Module-level singleton registry object (created at import time, no AudioContext needed)"
    - "register(provider) — adds a SampleProvider; throws if id is already registered"
    - "get(id) — returns the provider or undefined"
    - "list() — returns a snapshot array of all registered providers"
    - "_reset() — clears all registrations; for test teardown only, not production code"
    - "Module file at poc/config/sample-provider-registry.js"
    - "BuiltinClickProvider is imported and registered at module load time (id 'built-in:default')"
  excludes:
    - "AudioContext initialization — init(ctx) is called by main.js, not the registry"
    - "Provider lifecycle management (init/dispose calls)"
    - "Persistence of provider registrations across page loads"
    - "UI for listing or selecting providers — owned by ui/sample-set-picker"
interface: |
  // poc/config/sample-provider-registry.js

  // SampleProvider interface (contract — not instantiated here):
  interface SampleProvider {
    id: string                           // globally unique; format "<namespace>:<name>"
    label: string                        // display name
    init(ctx: AudioContext): Promise<void>
    getSample(index: number): AudioBuffer | null
    count?(): number
  }

  // The registry singleton (module-level; exported as a named export):
  const registry: {
    // Registers a provider. Throws TypeError if provider.id is already registered.
    register(provider: SampleProvider): void

    // Returns the provider with the given id, or undefined if not found.
    get(id: string): SampleProvider | undefined

    // Returns a shallow-copy array of all currently registered providers.
    list(): SampleProvider[]

    // FOR TEST TEARDOWN ONLY. Removes all registered providers.
    // Must not be called in production code paths.
    _reset(): void
  }

  export { registry }
success_criteria:
  - "At module import time, a provider with id 'built-in:default' is already registered (BuiltinClickProvider registered at module load)"
  - "registry.get('built-in:default') returns a SampleProvider object with id 'built-in:default'"
  - "registry.register({ id: 'sample-set:test', ... }) then registry.get('sample-set:test') returns that provider"
  - "registry.list() returns an array containing all registered providers; length equals registration count"
  - "registry.list() returns a new array each call — mutating the returned array does not affect registry state"
  - "registry._reset() followed by registry.list() returns []"
  - "registry._reset() followed by registry.get('built-in:default') returns undefined"
  - "After _reset(), re-registering 'built-in:default' does not throw"
failure_criteria:
  - "registry.register(provider) where provider.id is already registered throws TypeError('SampleProviderRegistry: id already registered: <id>')"
  - "registry.get(id) for an unregistered id returns undefined (not null, not throws)"
  - "registry.register(provider) where provider has no id property throws TypeError('SampleProviderRegistry: provider must have an id')"
dependencies:
  requires:
    - "audio/builtin-click-provider"
  must_not_require:
    - "config/property-mapper"
    - "config/workspace"
    - "timing/metronome"
    - "any DOM module"
    - "any visualizer"
```
