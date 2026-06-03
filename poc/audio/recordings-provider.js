/**
 * poc/audio/recordings-provider.js
 *
 * Implements ContentProvider for clips already in the media pool.
 * browse() returns the current pool clips as ContentItems.
 * import() returns the already-decoded AudioBuffer directly, requiring no I/O.
 */

/**
 * Creates a RecordingsProvider bound to the given pool.
 * @param {Object} pool - MediaPool instance (PoolRef interface)
 * @returns {Object} ContentProvider implementation
 */
function createRecordingsProvider(pool) {
  return {
    id: 'recordings',
    label: 'Recordings',

    /**
     * Returns a snapshot of pool.clips as ContentItems.
     * @returns {Promise<ContentItem[]>}
     */
    browse() {
      // Create a snapshot array to prevent external mutation of pool.clips
      const items = pool.clips.map(clip => ({
        id: clip.id,
        label: clip.label,
        // durationHint is optional; we compute it if sampleRate is available
        // Note: sampleRate is not available at browse() time, only at import() time
        // So we omit durationHint here and compute it elsewhere if needed
        _bufferId: clip.bufferId,  // internal field for use by import()
      }));
      return Promise.resolve(items);
    },

    /**
     * Returns the already-decoded AudioBuffer from the pool.
     * @param {Object} item - ContentItem with _bufferId field
     * @param {Object} ctx - AudioContext (not used here; buffers are already decoded)
     * @returns {Promise<AudioBuffer>}
     */
    import(item, ctx) {
      const buffer = pool.getBuffer(item._bufferId);
      if (buffer === undefined) {
        return Promise.reject(
          new Error(`RecordingsProvider: buffer not found for id ${item.id}`)
        );
      }
      return Promise.resolve(buffer);
    },
  };
}

export { createRecordingsProvider };
