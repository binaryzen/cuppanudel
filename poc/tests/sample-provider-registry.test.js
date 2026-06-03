/**
 * poc/tests/sample-provider-registry.test.js
 *
 * Integration tests for config/sample-provider-registry
 * Tests: tc-010, tc-011, tc-012
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { register, get, list, _reset } from '../config/sample-provider-registry.js';

// tc-010: Registry auto-registers BuiltinClickProvider at import time
test('tc-010: Registry auto-registers built-in:default on import', () => {
  const provider = get('built-in:default');
  assert(provider !== undefined, 'Registry should have built-in:default provider');
  assert(provider.id === 'built-in:default', 'Provider id should match');
  assert(provider.label !== undefined, 'Provider should have a label');
  assert(provider.count !== undefined, 'Provider should have count method');
});

// tc-011: Registry.register() throws on duplicate id; _reset() clears all
test('tc-011: register() throws on duplicate id', () => {
  _reset();

  const mockProvider = {
    id: 'test:provider',
    label: 'Test Provider',
    count: () => 1,
    getSample: () => null,
    init: async () => {}
  };

  register(mockProvider);

  try {
    register(mockProvider);
    throw new Error('Expected TypeError on duplicate registration');
  } catch (e) {
    assert(e.message.includes('already registered'), 'Error should mention duplicate registration');
  }
});

// tc-011b: _reset() clears all registrations
test('tc-011b: _reset() clears all registrations', () => {
  _reset();

  const mockProvider = {
    id: 'test:provider',
    label: 'Test Provider',
    count: () => 1,
    getSample: () => null,
    init: async () => {}
  };

  register(mockProvider);
  _reset();

  const provider = get('test:provider');
  assert(provider === undefined, 'Provider should be cleared after _reset()');

  const builtIn = get('built-in:default');
  assert(builtIn === undefined, 'Built-in provider should also be cleared after _reset()');
});

// tc-012: Registry.list() returns a snapshot array (mutation does not affect state)
test('tc-012: list() returns snapshot array', () => {
  _reset();

  const mockProvider = {
    id: 'test:provider',
    label: 'Test Provider',
    count: () => 1,
    getSample: () => null,
    init: async () => {}
  };

  register(mockProvider);

  const arr1 = list();
  const originalLength = arr1.length;

  arr1.splice(0, 1);

  const arr2 = list();

  assertEquals(arr2.length, originalLength, 'list() should return full list unaffected by mutation');
  assert(arr1 !== arr2, 'list() should return different array instances');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
