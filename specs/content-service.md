# Cuppanudel — Content Service Interface
## Spec v0.1

---

## Motivation

Audio content in the app currently comes from two sources: real-time microphone recording
and hard-coded file loading. As the app grows it will need to pull content from many more
places — local files, hardware loopers, cloud storage, shared libraries — without the rest
of the app caring where the bytes came from.

A generic **Content Service** interface provides a single abstraction layer between the
media pool and every possible content origin. Any source that can enumerate items and
deliver an `AudioBuffer` qualifies as a provider; the rest of the app never reaches
through to the origin.

The design intent is similar to the **provider / adapter** pattern used by browser media
picker APIs (the File System Access API, `<input type="file">`, and the proposed Storage
Access API family) and audio plugin host "browser" panels in desktop DAWs such as
Ableton's browser sidebar and Logic's Media Browser. The common thread: a uniform browse →
preview → import flow regardless of where content lives.

---

## Concepts

### ContentService

The top-level registry. Holds a list of registered `ContentProvider` instances. The UI
binds to this registry and renders whatever providers are currently available. When the
app initialises, built-in providers are registered; third-party or device-specific
providers can be registered later (e.g., when a USB device is detected).

```
ContentService
  .providers: ContentProvider[]
  .register(provider: ContentProvider): void
  .unregister(id: string): void
```

---

### ContentProvider

Represents one source of content. Examples:

| Provider ID | Display name | Content |
|---|---|---|
| `local-files` | My Files | Files chosen via `<input>` / File System Access API |
| `recordings` | Recordings | Clips captured in the current session |
| `looper-import` | Looper Import | Files exported from a hardware looper via USB or direct file pick |
| `cloud` (future) | Cloud Library | Remote asset store via HTTP / Blob URLs |

```
interface ContentProvider {
  id: string                         // stable identifier
  label: string                      // display name
  icon?: string                      // optional SVG or emoji

  // Returns a flat list of ContentItems available from this source.
  // For POC: always returns ContentItem[] (no pagination). Pagination is an app/ concern.
  // For picker-based providers (LocalFileProvider): browse() triggers the file picker
  // and returns the user-selected files as ContentItems. It does not return a persistent
  // enumerable list — the UI must not assume browse() is repeatable without user interaction.
  // For enumerable providers (RecordingsProvider): browse() returns the current item list.
  browse(): Promise<ContentItem[]>

  // Optional: search/filter if the provider supports it.
  search?(query: string): Promise<ContentItem[]>

  // Deliver the audio data for a given item into a decoded AudioBuffer.
  // The service passes the AudioContext so the provider can call decodeAudioData.
  import(item: ContentItem, ctx: AudioContext): Promise<AudioBuffer>

  // Optional: called when the provider should free resources (e.g., close a directory handle).
  dispose?(): void
}
```

---

### ContentItem

A single importable asset as seen by the UI — not yet decoded.

```
interface ContentItem {
  id: string           // stable within this provider
  label: string        // filename or user-assigned name
  durationHint?: number  // seconds, if known before import (e.g., from file metadata)
  sizeHint?: number      // bytes, if known
  mimeType?: string
  metadata?: Record<string, unknown>  // BPM tag, loop point markers, etc.
}
```

---

## UI Contract

The content browser renders a list of available providers in a sidebar or tab strip. The
user selects a provider; the browser calls `provider.browse()` and renders the returned
items in a scrollable list. Selecting an item and pressing "Import" (or double-tapping)
calls `provider.import()` and passes the resulting `AudioBuffer` to the media pool.

The UI layer does not know or care whether `import()` involved a local file read, an HTTP
fetch, or a decoded `Blob` URL.

---

## Built-In Providers (planned)

### `LocalFileProvider`

Uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
where available (`showOpenFilePicker`), falling back to `<input type="file" accept="audio/*">`.
`browse()` opens the picker and returns `ContentItem` wrappers around `File` objects.
`import()` calls `file.arrayBuffer()` then `ctx.decodeAudioData()`.

### `RecordingsProvider`

Wraps the existing media pool. `browse()` returns the current `clips` array as
`ContentItem`s. `import()` returns the already-decoded `AudioBuffer` directly — no
network or disk I/O needed.

### `LooperImportProvider`

Specialised wrapper for audio exported from hardware looper devices (e.g., Boss RC series,
Headrush Looperboard). Functionally identical to `LocalFileProvider` but:
- May default the file picker to a known looper export directory if the File System Access
  API supports directory handles.
- Could read sidecar metadata files (loop BPM, time signature) if the device writes them,
  and surface those as `ContentItem.metadata`.
- A reasonable first implementation is simply `LocalFileProvider` with a different label
  and a file-type filter.

---

## Relationship to Media Pool

The content service is upstream of the media pool. After `import()` resolves:

1. An entry is added to `BufferTable` with the decoded `AudioBuffer`.
2. A `SampleClip` is created referencing the buffer, using `item.label` as the initial
   clip label.
3. The clip appears in the sample browser immediately (same flow as recording).

The media pool does not hold a reference to the `ContentProvider` — once the buffer is
decoded and stored, the clip is fully owned by the pool.

---

## Extension Points

- **Streaming preview:** A provider may optionally expose a `preview(item)` method
  returning a URL or stream for low-latency audition before committing to a full import.
- **Pagination (app/ only):** `browse()` always returns `ContentItem[]` in the POC. In
  `app/`, the interface may be extended to return `{ items: ContentItem[], nextPage?: () => Promise<...> }`
  for large remote libraries. The POC UI may assume a flat array.
- **Write-back (future):** Providers may optionally implement `export(clip, buffer)` to
  push a finished recording back to the source (e.g., save back to a cloud library or
  write a file into a watched directory).

---

## Open Questions

- [ ] Should providers be plug-in style (dynamically imported ES modules) or always
  statically bundled? Static is simpler for the POC; dynamic import enables third-party
  extensions in `app/`.
- [ ] File System Access API has limited Safari support. Define a graceful degradation
  path: FSAA where available, `<input type="file">` otherwise, same `ContentItem`
  shape returned either way.
- [x] **`ContentItem.metadata` loop-point markers** → Not in POC. `SampleClip` schema is
  not extended with `loopStart`/`loopEnd` in this phase. Deferred to `app/`.
- [ ] How does the content browser surface per-provider error states (e.g., network
  timeout, device disconnected)?
