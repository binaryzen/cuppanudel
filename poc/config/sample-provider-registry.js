// poc/config/sample-provider-registry.js
//
// Module-level singleton registry of SampleProvider instances.
// Providers register themselves at import time.
// Exposes a test-only reset method for teardown.

import { builtinClickProvider } from '../audio/builtin-click-provider.js';

// Use a Map as internal store to avoid prototype-chain `in` operator hazard
// (plain object `in` check would falsely match 'constructor', 'toString', etc.)
const _store = new Map();

// Register built-in provider at module load time
register(builtinClickProvider);

function register(provider) {
    if (!provider || typeof provider.id !== 'string') {
        throw new TypeError('SampleProviderRegistry: provider must have an id');
    }
    if (_store.has(provider.id)) {
        throw new TypeError(`SampleProviderRegistry: id already registered: ${provider.id}`);
    }
    _store.set(provider.id, provider);
}

function get(id) {
    return _store.get(id);
}

function list() {
    return [..._store.values()];
}

function _reset() {
    _store.clear();
}

// registry object — the interface specifies `export { registry }` with methods
export const registry = { register, get, list, _reset };

// Individual named exports for backward compatibility with tests that import directly
export { register, get, list, _reset };
