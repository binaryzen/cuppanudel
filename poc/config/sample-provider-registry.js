// poc/config/sample-provider-registry.js
//
// Module-level singleton registry of SampleProvider instances.
// Providers register themselves at import time.
// Exposes a test-only reset method for teardown.

import { builtinClickProvider } from '../audio/builtin-click-provider.js';

const registry = {};

// Register built-in provider at module load time
register(builtinClickProvider);

function register(provider) {
    if (!provider || typeof provider.id !== 'string') {
        throw new TypeError('SampleProviderRegistry: provider must have an id');
    }
    if (provider.id in registry) {
        throw new TypeError(`SampleProviderRegistry: id already registered: ${provider.id}`);
    }
    registry[provider.id] = provider;
}

function get(id) {
    return registry[id];
}

function list() {
    return Object.values(registry);
}

function _reset() {
    for (const key in registry) {
        delete registry[key];
    }
}

export { register, get, list, _reset };
