```yaml
id: audio/local-file-provider
lane: lane-d
purpose: >
  Implements ContentProvider for locally-chosen audio files. browse() triggers a file
  picker (File System Access API where available, <input type="file"> fallback) and
  returns ContentItem wrappers for the user-selected files. import() decodes the file
  data into an AudioBuffer using decodeAudioData. This is the primary path for loading
  loop files and backing tracks from disk.
scope:
  includes:
    - "LocalFileProvider object implementing the ContentProvider interface"
    - "id: 'local-files', label: 'My Files'"
    - "browse(): opens showOpenFilePicker (FSAA) if available, else programmatically clicks a hidden <input type='file' accept='audio/*' multiple>; returns ContentItem[] wrapping the selected File objects"
    - "import(item, ctx): calls item._file.arrayBuffer() then ctx.decodeAudioData(); returns AudioBuffer"
    - "ContentItem._file field: holds the File reference for use by import() (internal; not part of the ContentItem spec interface)"
    - "ContentItem label defaults to file.name"
    - "ContentItem sizeHint set to file.size"
    - "ContentItem mimeType set to file.type"
    - "browse() returning no files (user cancels picker) returns an empty array — no error"
    - "Module file at poc/audio/local-file-provider.js"
  excludes:
    - "LooperImportProvider — a separate provider in the same lane with a different label/filter"
    - "Drag-and-drop onto the sample browser — owned by index.html file import UI + main.js wiring"
    - "Inserting the decoded buffer into the media pool — owned by main.js wiring after import() resolves"
    - "File size cap for import — files that exceed MAX_RECORD_DURATION_MS are accepted with a console.warn; the cap is not enforced here"
    - "AudioContext creation"
interface: |
  // poc/audio/local-file-provider.js

  // Implements ContentProvider (see specs/content-service.md):
  interface ContentProvider {
    id: string
    label: string
    browse(): Promise<ContentItem[]>
    import(item: ContentItem, ctx: AudioContext): Promise<AudioBuffer>
  }

  // Extended ContentItem with internal file reference (not part of public ContentItem spec):
  interface LocalContentItem extends ContentItem {
    id: string            // generated unique string (e.g. 'local-' + filename + '-' + size)
    label: string         // file.name
    sizeHint: number      // file.size
    mimeType: string      // file.type
    _file: File           // internal: used by import()
  }

  // Pre-constructed singleton instance.
  const localFileProvider: ContentProvider

  export { localFileProvider }
success_criteria:
  - "localFileProvider.id === 'local-files'"
  - "localFileProvider.label === 'My Files'"
  - "browse() resolves to an empty array if the user dismisses the file picker without selecting files"
  - "browse() resolves to a ContentItem[] with one entry per selected file, where entry.label === file.name"
  - "browse() resolves to a ContentItem[] where entry.sizeHint === file.size"
  - "import(item, ctx) for a valid WAV file resolves to an AudioBuffer with numberOfChannels >= 1 and duration > 0"
  - "import(item, ctx) for a corrupt audio file rejects with a DOMException (from decodeAudioData)"
  - "If showOpenFilePicker is available (FSAA), browse() calls showOpenFilePicker with types: [{ accept: { 'audio/*': ['.wav','.mp3','.ogg','.m4a','.aiff'] } }]"
  - "If showOpenFilePicker is not available, browse() creates and clicks a hidden <input type='file'>"
failure_criteria:
  - "import() must never return undefined — it must either resolve with an AudioBuffer or reject with an error"
  - "If decodeAudioData fails, import() rejects with the original error — it must not swallow the error and return null"
  - "browse() must not throw synchronously — it must always return a Promise"
  - "If showOpenFilePicker throws AbortError (user cancels), browse() must return [] — must not reject or rethrow"
dependencies:
  requires:
    - "config/content-service"
  must_not_require:
    - "pool/media-pool"
    - "config/sample-provider-registry"
    - "timing/metronome"
    - "config/property-mapper"
    - "any visualizer"
```
