/**
 * poc/audio/local-file-provider.js
 *
 * Implements ContentProvider for locally-chosen audio files.
 * Uses File System Access API (showOpenFilePicker) where available,
 * falling back to <input type="file"> programmatic click.
 */

/**
 * Pre-constructed singleton instance of LocalFileProvider.
 */
const localFileProvider = {
  id: 'local-files',
  label: 'My Files',

  /**
   * Opens a file picker and returns ContentItem wrappers for selected files.
   * Uses File System Access API (FSAA) if available, else falls back to <input>.
   * Returns [] if user cancels.
   * @returns {Promise<ContentItem[]>}
   */
  async browse() {
    // Try FSAA first
    if (typeof window !== 'undefined' && window.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          types: [
            {
              accept: {
                'audio/*': ['.wav', '.mp3', '.ogg', '.m4a', '.aiff'],
              },
            },
          ],
          multiple: true,
        });

        const items = await Promise.all(
          handles.map(async (handle) => {
            const file = await handle.getFile();
            return _fileToContentItem(file);
          })
        );
        return items;
      } catch (err) {
        // AbortError means user canceled; return []
        if (err.name === 'AbortError') {
          return [];
        }
        // Re-throw other errors
        throw err;
      }
    }

    // Fallback: programmatic <input type="file"> click
    return _browseViaInputFallback();
  },

  /**
   * Decodes the audio file into an AudioBuffer.
   * @param {ContentItem} item - Must have _file field
   * @param {AudioContext} ctx
   * @returns {Promise<AudioBuffer>}
   */
  async import(item, ctx) {
    const file = item._file;
    if (!file) {
      throw new Error('LocalFileProvider: import() requires item._file to be set');
    }

    // Get file data as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Decode using AudioContext
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    return audioBuffer;
  },
};

/**
 * Fallback file picker using hidden <input type="file">.
 * @returns {Promise<ContentItem[]>}
 */
function _browseViaInputFallback() {
  return new Promise((resolve) => {
    let input = document.getElementById('import-file-input');

    // If the input element doesn't exist yet, create it temporarily
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);
    }

    // Set up change listener
    const handleChange = async () => {
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel);

      const items = [];
      if (input.files && input.files.length > 0) {
        for (const file of input.files) {
          items.push(_fileToContentItem(file));
        }
      }

      resolve(items);
    };

    const handleCancel = () => {
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel);
      resolve([]);
    };

    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', handleCancel);

    // Programmatically click the input
    input.click();
  });
}

/**
 * Converts a File object to a ContentItem.
 * @param {File} file
 * @returns {ContentItem}
 */
function _fileToContentItem(file) {
  return {
    id: `local-${file.name}-${file.size}`,
    label: file.name,
    sizeHint: file.size,
    mimeType: file.type || 'audio/unknown',
    _file: file,  // Internal reference for use by import()
  };
}

export { localFileProvider };
