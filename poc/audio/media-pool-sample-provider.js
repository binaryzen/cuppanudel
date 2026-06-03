// poc/audio/media-pool-sample-provider.js
//
// Factory for creating SampleProvider instances backed by media pool clips.
// The provider serves pre-decoded AudioBuffers from the pool by slot index.
// Implements the SampleProvider interface.

/**
 * Creates a MediaPoolSampleProvider instance.
 *
 * @param {string} id - provider id (e.g. 'sample-set:woodblock')
 * @param {string} label - display label (e.g. 'Woodblock Kit')
 * @param {Array<{index: number, clipId: string}>} slots - slot assignments
 * @param {Object} pool - MediaPool instance (PoolRef interface with getBuffer, clips)
 * @returns {Object} SampleProvider implementation
 * @throws {TypeError} if any required parameter is undefined
 */
function createMediaPoolSampleProvider(id, label, slots, pool) {
  // Validate required parameters
  if (id === undefined) {
    throw new TypeError('createMediaPoolSampleProvider: id is required');
  }
  if (label === undefined) {
    throw new TypeError('createMediaPoolSampleProvider: label is required');
  }
  if (slots === undefined) {
    throw new TypeError('createMediaPoolSampleProvider: slots is required');
  }
  if (pool === undefined) {
    throw new TypeError('createMediaPoolSampleProvider: pool is required');
  }

  return {
    id,
    label,

    /**
     * Returns the number of slots configured for this provider.
     * @returns {number}
     */
    count() {
      return slots.length;
    },

    /**
     * Returns the AudioBuffer for the given slot index.
     * Returns null if the slot does not exist or the buffer is missing.
     * Never returns undefined.
     *
     * @param {number} index - slot index (0 = lo click, 1 = hi click, etc)
     * @returns {AudioBuffer | null}
     */
    getSample(index) {
      // Find the slot assignment for this index
      const slot = slots.find(s => s.index === index);
      if (!slot) {
        return null;
      }

      // Look up the buffer from the pool
      const buffer = pool.getBuffer(slot.clipId);

      // Normalize undefined to null
      if (buffer === undefined) {
        console.warn(
          `MediaPoolSampleProvider: slot ${index} maps to clipId "${slot.clipId}" but buffer not found in pool`
        );
        return null;
      }

      return buffer;
    },

    /**
     * Initializes the provider (no-op since buffers are already decoded in the pool).
     * Returns a resolved Promise.
     *
     * @param {AudioContext} ctx - audio context (not used)
     * @returns {Promise<void>}
     */
    init(ctx) {
      return Promise.resolve();
    },
  };
}

export { createMediaPoolSampleProvider };
