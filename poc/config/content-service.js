/**
 * poc/config/content-service.js
 *
 * Module-level singleton ContentService registry.
 * Maintains the application-wide registry of ContentProvider instances.
 * Providers are registered at init time; the content browser UI binds to the registry
 * to discover and render available sources.
 */

const contentService = (() => {
  const providers = [];  // ContentProvider[]

  return {
    /**
     * Registers a ContentProvider instance.
     * @param {ContentProvider} provider
     * @throws {TypeError} if provider has no id or if id is already registered
     */
    register(provider) {
      if (!provider || typeof provider !== 'object') {
        throw new TypeError('ContentService: provider must be an object');
      }
      if (!provider.id) {
        throw new TypeError('ContentService: provider must have an id');
      }
      if (providers.some(p => p.id === provider.id)) {
        throw new TypeError(`ContentService: id already registered: ${provider.id}`);
      }
      providers.push(provider);
    },

    /**
     * Unregisters a provider by id.
     * No-op if id is not found.
     * @param {string} id
     */
    unregister(id) {
      const idx = providers.findIndex(p => p.id === id);
      if (idx !== -1) {
        providers.splice(idx, 1);
      }
    },

    /**
     * Returns a shallow-copy array of all currently registered providers.
     * Mutating the returned array does not affect internal state.
     */
    get providers() {
      return [...providers];
    }
  };
})();

export { contentService };
