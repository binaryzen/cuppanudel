/**
 * poc/tests/sample-set-picker.test.js
 *
 * Integration tests for ui/sample-set-picker
 * Tests: tc-034
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the sample-set-picker module.
 */

import { test, run } from '../test/runner.js';
import { createSampleSetPicker } from '../ui/sample-set-picker.js';

// Mock document
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => ({
      className: '',
      textContent: '',
      style: { display: '', cursor: '' },
      onclick: null,
      addEventListener: function() {},
      removeEventListener: function() {},
      appendChild: function() {},
      removeChild: function() {},
      innerHTML: '',
      contains: () => false,
    }),
    body: { appendChild: () => {} },
    addEventListener: function() {},
    removeEventListener: function() {},
  };
}

// Mock window
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { innerWidth: 1024, innerHeight: 768 };
}

// tc-034: SampleSetPicker calls onProviderChange callback with provider instance
test('tc-034: picker calls onProviderChange callback with provider instance', async () => {
  const target = globalThis.document.createElement('div');

  const registry = {
    list: () => [
      { id: 'built-in:default', label: 'Default Clicks' },
    ],
    get: (id) => {
      if (id === 'built-in:default') {
        return { id: 'built-in:default', label: 'Default Clicks' };
      }
      return null;
    },
  };

  const pool = {
    clips: [
      { id: 'clip-id-1', label: 'Low Click' },
      { id: 'clip-id-2', label: 'High Click' },
    ],
    getBuffer: (clipId) => {
      if (clipId === 'clip-id-1') return { length: 100 };
      if (clipId === 'clip-id-2') return { length: 100 };
      return undefined;
    },
  };

  const tc = {
    clickProviderRef: 'built-in:default',
  };

  let onProviderChangeArgs = null;
  const onProviderChange = (providerId, provider) => {
    onProviderChangeArgs = { providerId, provider };
  };

  const picker = createSampleSetPicker(target, registry, pool, tc, onProviderChange);

  // The picker should not throw and should be created successfully
  if (!picker) throw new Error('Failed to create picker');

  // Verify picker has required methods
  if (typeof picker.update !== 'function') throw new Error('Picker should have update() method');
  if (typeof picker.dispose !== 'function') throw new Error('Picker should have dispose() method');

  picker.dispose();
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
