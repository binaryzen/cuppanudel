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
    createElement: (tag) => {
      const el = {
        className: '',
        textContent: '',
        style: { display: '', cursor: '' },
        onclick: null,
        _children: [],
        _listeners: {},
        addEventListener: function(evt, handler) {
          if (!this._listeners[evt]) this._listeners[evt] = [];
          this._listeners[evt].push(handler);
        },
        removeEventListener: function(evt, handler) {
          if (this._listeners[evt]) {
            this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
          }
        },
        appendChild: function(child) {
          if (!this._children) this._children = [];
          this._children.push(child);
        },
        removeChild: function(child) {
          if (this._children) {
            this._children = this._children.filter(c => c !== child);
          }
        },
        innerHTML: '',
        contains: () => false,
      };
      return el;
    },
    body: {
      _children: [],
      appendChild: function(child) {
        this._children.push(child);
      },
      removeChild: function(child) {
        this._children = this._children.filter(c => c !== child);
      },
      _listeners: {},
      addEventListener: function(evt, handler) {
        if (!this._listeners[evt]) this._listeners[evt] = [];
        this._listeners[evt].push(handler);
      },
      removeEventListener: function(evt, handler) {
        if (this._listeners[evt]) {
          this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
        }
      },
    },
    _listeners: {},
    addEventListener: function(evt, handler) {
      if (!this._listeners[evt]) this._listeners[evt] = [];
      this._listeners[evt].push(handler);
    },
    removeEventListener: function(evt, handler) {
      if (this._listeners[evt]) {
        this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
      }
    },
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

  // Simulate user clicking on label to open dropdown
  // Find the label element in the target
  let labelEl = null;
  if (target._children) {
    labelEl = target._children.find(el => el.className === 'sample-set-picker-label');
  }

  if (!labelEl) throw new Error('Label element not found in picker');

  // Click the label to open dropdown
  if (labelEl.onclick) {
    labelEl.onclick();
  } else if (labelEl._listeners && labelEl._listeners['click']) {
    // Call the click handler
    labelEl._listeners['click'][0]();
  }

  // Find the dropdown and locate a provider item
  let dropdownEl = null;
  if (target._children) {
    dropdownEl = target._children.find(el => el.className === 'sample-set-picker-dropdown');
  }

  if (!dropdownEl || !dropdownEl._children || dropdownEl._children.length === 0) {
    throw new Error('Dropdown not opened or empty');
  }

  // Get the first provider item (should be 'Default Clicks')
  const firstProviderItem = dropdownEl._children[0];
  if (!firstProviderItem) throw new Error('No provider items in dropdown');

  // Click the first provider item
  if (firstProviderItem.onclick) {
    firstProviderItem.onclick();
  } else if (firstProviderItem._listeners && firstProviderItem._listeners['click']) {
    firstProviderItem._listeners['click'][0]();
  }

  // Verify onProviderChange was called
  if (!onProviderChangeArgs) {
    throw new Error('Expected onProviderChange to be called when selecting a provider');
  }

  if (typeof onProviderChangeArgs.providerId !== 'string') {
    throw new Error('Expected onProviderChange first argument to be a string (provider id)');
  }

  picker.dispose();
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
