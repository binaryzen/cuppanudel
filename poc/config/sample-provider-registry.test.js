// poc/config/sample-provider-registry.test.js

import { test, run, assert, assertEquals, assertNull, _reset as resetTests } from '../test/runner.js';
import { register, get, list, _reset } from './sample-provider-registry.js';

test('registry has built-in:default provider registered at module load', () => {
    // Note: _reset() is not called here to test initial state
    const provider = get('built-in:default');
    assert(provider !== undefined, 'built-in:default should be registered at module load');
    assertEquals(provider.id, 'built-in:default');
    assertEquals(provider.label, 'Default (synthesised)');
});

test('registry.get() returns undefined for unregistered id', () => {
    _reset();
    assertEquals(get('nonexistent'), undefined);
});

test('registry.register() adds a provider', () => {
    _reset();
    const provider = { id: 'test:one', label: 'Test One', init: async () => {}, getSample: () => null, count: () => 1 };
    register(provider);
    assertEquals(get('test:one'), provider);
});

test('registry.register() throws if id already registered', () => {
    _reset();
    const p1 = { id: 'test:dup', label: 'Dup', init: async () => {}, getSample: () => null };
    register(p1);
    const p2 = { id: 'test:dup', label: 'Dup2', init: async () => {}, getSample: () => null };
    try {
        register(p2);
        throw new Error('Should have thrown TypeError');
    } catch (e) {
        assert(e instanceof TypeError, 'Expected TypeError');
        assert(e.message.includes('already registered'), 'Error message should mention "already registered"');
    }
});

test('registry.register() throws if provider has no id', () => {
    _reset();
    const provider = { label: 'No ID', init: async () => {}, getSample: () => null };
    try {
        register(provider);
        throw new Error('Should have thrown TypeError');
    } catch (e) {
        assert(e instanceof TypeError, 'Expected TypeError');
        assert(e.message.includes('must have an id'), 'Error message should mention "must have an id"');
    }
});

test('registry.list() returns array of all providers', () => {
    _reset();
    const p1 = { id: 'test:a', label: 'A', init: async () => {}, getSample: () => null };
    const p2 = { id: 'test:b', label: 'B', init: async () => {}, getSample: () => null };
    register(p1);
    register(p2);
    const arr = list();
    assertEquals(arr.length, 2);
    assert(arr.includes(p1), 'list should contain p1');
    assert(arr.includes(p2), 'list should contain p2');
});

test('registry.list() returns new array each call', () => {
    _reset();
    const p1 = { id: 'test:x', label: 'X', init: async () => {}, getSample: () => null };
    register(p1);
    const arr1 = list();
    const arr2 = list();
    assert(arr1 !== arr2, 'list() should return new array each time');
    assertEquals(arr1.length, arr2.length);
});

test('registry.list() mutating returned array does not affect registry', () => {
    _reset();
    const p1 = { id: 'test:m', label: 'M', init: async () => {}, getSample: () => null };
    register(p1);
    const arr = list();
    arr.pop();
    assertEquals(list().length, 1, 'Mutating returned array should not affect registry');
});

test('registry._reset() clears all registrations', () => {
    _reset();
    const p1 = { id: 'test:clear', label: 'Clear', init: async () => {}, getSample: () => null };
    register(p1);
    assert(get('test:clear') !== undefined, 'Provider should be registered');
    _reset();
    assertEquals(list().length, 0);
    assertEquals(get('test:clear'), undefined);
});

test('registry._reset() followed by re-register does not throw', () => {
    _reset();
    const p1 = { id: 'test:rereg', label: 'ReReg', init: async () => {}, getSample: () => null };
    register(p1);
    _reset();
    register(p1);
    assertEquals(get('test:rereg'), p1);
});

await run();
