```yaml
id: config/content-service
lane: lane-d
purpose: >
  Maintains the application-wide registry of ContentProvider instances as a module-level
  singleton. Providers are registered at init time; the content browser UI binds to the
  registry to discover and render available sources. Mirrors the shape of
  SampleProviderRegistry but is entirely independent of it.
scope:
  includes:
    - "Module-level singleton contentService object"
    - "register(provider) — adds a ContentProvider; throws if id already registered"
    - "unregister(id) — removes a provider by id; no-op if not found"
    - "providers getter — returns a snapshot array of all currently registered providers"
    - "Module file at poc/config/content-service.js"
    - "Does NOT pre-register any built-in providers at import time — registration is done by main.js wiring"
  excludes:
    - "ContentProvider implementations — owned by audio/local-file-provider, audio/recordings-provider"
    - "UI for browsing providers or items — owned by lane-wire / index.html"
    - "SampleProvider or SampleProviderRegistry — entirely separate concerns"
    - "Persistence across page loads"
    - "Pagination — POC always returns flat ContentItem[]"
interface: |
  // poc/config/content-service.js

  // ContentItem interface (shared contract):
  interface ContentItem {
    id: string
    label: string
    durationHint?: number     // seconds, if known before import
    sizeHint?: number         // bytes, if known
    mimeType?: string
    metadata?: Record<string, unknown>
  }

  // ContentProvider interface (contract — not defined here):
  interface ContentProvider {
    id: string
    label: string
    icon?: string
    browse(): Promise<ContentItem[]>
    search?(query: string): Promise<ContentItem[]>
    import(item: ContentItem, ctx: AudioContext): Promise<AudioBuffer>
    dispose?(): void
  }

  // The singleton registry:
  const contentService: {
    // Registers a provider. Throws TypeError if provider.id is already registered.
    register(provider: ContentProvider): void

    // Removes a provider by id. No-op if id is not found.
    unregister(id: string): void

    // Returns a shallow-copy array of all currently registered providers.
    readonly providers: ContentProvider[]
  }

  export { contentService }
success_criteria:
  - "contentService.providers is an empty array at module import time (no auto-registration)"
  - "After register({ id: 'local-files', ... }), contentService.providers has length 1 and providers[0].id === 'local-files'"
  - "contentService.providers returns a new array each access — mutating it does not affect internal state"
  - "After register(p1) and register(p2), contentService.providers.length === 2"
  - "unregister('local-files') removes that provider; contentService.providers.length returns to 0"
  - "unregister('nonexistent') is a no-op — no error thrown"
failure_criteria:
  - "register(provider) where provider.id is already registered throws TypeError('ContentService: id already registered: <id>')"
  - "register(provider) where provider has no id property throws TypeError('ContentService: provider must have an id')"
  - "contentService.providers must not return the internal array by reference — direct mutation of the returned array must not affect registry state"
dependencies:
  requires: []
  must_not_require:
    - "config/sample-provider-registry"
    - "config/property-mapper"
    - "timing/metronome"
    - "pool/media-pool"
    - "any DOM module"
    - "any visualizer"
```
