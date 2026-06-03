```yaml
id: audio/recordings-provider
lane: lane-d
purpose: >
  Implements ContentProvider for clips already in the media pool. browse() returns the
  current pool clips as ContentItems; import() returns the already-decoded AudioBuffer
  directly, requiring no I/O. This closes the loop so the content browser can show
  recorded clips alongside imported files without special-casing the pool.
scope:
  includes:
    - "RecordingsProvider factory function createRecordingsProvider(pool)"
    - "id: 'recordings', label: 'Recordings'"
    - "browse(): maps pool.clips to ContentItem[], converting each SampleClip's label, duration, and id"
    - "import(item, ctx): calls pool.getBuffer(item._bufferId) and returns the AudioBuffer synchronously (wrapped in Promise.resolve())"
    - "ContentItem._bufferId field: holds the clip's bufferId for use by import() (internal)"
    - "ContentItem.durationHint computed from clip endFrame - startFrame and pool sampleRate (if available)"
    - "Module file at poc/audio/recordings-provider.js"
  excludes:
    - "Reactive updates when new clips are recorded — browse() is called on demand; it is not a live feed"
    - "Inserting results back into the media pool — that would create a duplicate; owned by main.js"
    - "AudioContext-based re-decoding — buffers are already decoded in the pool"
    - "Any UI"
interface: |
  // poc/audio/recordings-provider.js

  // MediaPool interface subset (consumed by this provider):
  interface PoolRef {
    clips: SampleClip[]          // SampleClip as defined in pool/media-pool.js
    getBuffer(bufferId: string): AudioBuffer | undefined
  }

  // Creates a RecordingsProvider bound to the given pool.
  // pool: the shared MediaPool instance created by createMediaPool().
  function createRecordingsProvider(pool: PoolRef): ContentProvider

  // Returned ContentProvider:
  interface ContentProvider {
    id: 'recordings'
    label: 'Recordings'
    browse(): Promise<ContentItem[]>            // snapshot of pool.clips as ContentItems
    import(item: ContentItem, ctx: AudioContext): Promise<AudioBuffer>  // returns pool.getBuffer()
  }

  // Internal ContentItem shape (extends ContentItem with pool-specific internal field):
  interface RecordingContentItem extends ContentItem {
    id: string           // equals clip.id
    label: string        // equals clip.label
    durationHint?: number  // (clip.endFrame - clip.startFrame) / ctx.sampleRate if derivable
    _bufferId: string    // internal: clip.bufferId, used by import()
  }
success_criteria:
  - "browse() on a pool with 3 clips returns a ContentItem[] of length 3"
  - "browse() entry.id === clip.id for each corresponding clip"
  - "browse() entry.label === clip.label for each corresponding clip"
  - "import(item, ctx) returns a Promise that resolves with the AudioBuffer from pool.getBuffer(item._bufferId)"
  - "import(item, ctx) for an item whose _bufferId is in the pool resolves within one microtask tick (synchronous buffer lookup)"
  - "browse() on an empty pool returns []"
failure_criteria:
  - "import(item, ctx) where pool.getBuffer returns undefined (clip deleted between browse and import) must reject with Error('RecordingsProvider: buffer not found for id <id>') — must not return null or undefined"
  - "browse() must return a snapshot array — mutations to the returned array must not affect pool.clips"
  - "browse() must not throw synchronously — it must return a Promise"
dependencies:
  requires:
    - "pool/media-pool"
    - "config/content-service"
  must_not_require:
    - "config/sample-provider-registry"
    - "timing/metronome"
    - "config/property-mapper"
    - "any visualizer"
```
