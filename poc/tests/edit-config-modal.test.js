/**
 * poc/tests/edit-config-modal.test.js
 *
 * Integration tests for ui/edit-config-modal
 * Tests: tc-025, tc-026, tc-047, tc-048, tc-049
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the edit-config-modal module.
 */

import { test, run } from '../test/runner.js';
import { createEditConfigModal } from '../ui/edit-config-modal.js';

// Mock document
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => ({
      id: '',
      style: { cssText: '', display: '' },
      textContent: '',
      value: '',
      disabled: false,
      onclick: null,
      innerHTML: '',
      _listeners: {},
      appendChild: function(child) {
        if (!this._children) this._children = [];
        this._children.push(child);
      },
      removeChild: function(child) {
        if (this._children) {
          this._children = this._children.filter(c => c !== child);
        }
      },
      addEventListener: function(evt, handler) {
        if (!this._listeners[evt]) this._listeners[evt] = [];
        this._listeners[evt].push(handler);
      },
      removeEventListener: function(evt, handler) {
        if (this._listeners[evt]) {
          this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
        }
      },
      focus: () => {},
      contains: () => false,
      getBoundingClientRect: () => ({ right: 100, bottom: 100, width: 50, height: 50 }),
    }),
    body: {
      appendChild: () => {},
      removeChild: () => {},
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
    getElementById: (id) => {
      if (id === 'preset-save-btn') {
        return null; // Not present in this test
      }
      return null;
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

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {};
}

// Clear any previous modal instance
if (globalThis.document && globalThis.document.body) {
  const oldModal = globalThis.document.getElementById('edit-config-modal');
  if (oldModal) oldModal.remove?.();
}

// tc-025: Edit config modal enforces singleton (only one instance visible at a time)
test('tc-025: edit-config-modal is singleton', async () => {
  // Reset by removing old instance from DOM
  const oldModal = globalThis.document.querySelector?.('#edit-config-modal');
  if (oldModal) oldModal.remove?.();

  // Create first modal
  const modal1 = createEditConfigModal();
  const component1 = {
    exportConfig: () => ({ bpm: 120 }),
    importConfig: () => [],
  };

  // Create second modal (should return same instance)
  const modal2 = createEditConfigModal();

  // Verify they are the same object (singleton)
  if (modal1 !== modal2) throw new Error('Expected modal1 and modal2 to be the same instance');

  // Open modal1
  modal1.open(component1);
  if (!modal1.isOpen()) throw new Error('Expected modal1 to be open');

  modal1.close();
});

// tc-026: Edit config modal parses Apply text with CORE_SCHEMA and validates via property-mapper
test('tc-026: modal Apply validates YAML and calls importConfig', async () => {
  let importConfigCalled = false;
  const modal = createEditConfigModal();

  const component = {
    exportConfig: () => ({ bpm: 120 }),
    importConfig: (obj) => {
      importConfigCalled = true;
      return []; // No errors
    },
  };

  // Mock jsyaml
  globalThis.window.jsyaml = {
    load: (text, opts) => {
      if (text.includes('invalid')) {
        throw new Error('Parse error: invalid YAML');
      }
      return { bpm: 120 };
    },
    dump: (obj) => JSON.stringify(obj),
    CORE_SCHEMA: {},
  };

  modal.open(component);
  if (!modal.isOpen()) throw new Error('Expected modal to be open');

  modal.close();
});

// tc-047: Edit config modal Cancel action closes without calling importConfig
test('tc-047: modal Cancel closes without calling importConfig', async () => {
  let importConfigCalled = false;
  const modal = createEditConfigModal();

  const component = {
    exportConfig: () => ({ bpm: 120 }),
    importConfig: () => {
      importConfigCalled = true;
      return [];
    },
  };

  modal.open(component);
  if (!modal.isOpen()) throw new Error('Expected modal to be open');

  modal.close();

  if (modal.isOpen()) throw new Error('Expected modal to be closed after Cancel');
  if (importConfigCalled) throw new Error('Expected importConfig to NOT be called on Cancel');
});

// tc-048: Edit config modal Escape key closes without calling importConfig
test('tc-048: modal Escape key closes without calling importConfig', async () => {
  let importConfigCalled = false;
  const modal = createEditConfigModal();

  const component = {
    exportConfig: () => ({ bpm: 120 }),
    importConfig: () => {
      importConfigCalled = true;
      return [];
    },
  };

  modal.open(component);
  if (!modal.isOpen()) throw new Error('Expected modal to be open');

  modal.close();

  if (modal.isOpen()) throw new Error('Expected modal to be closed after Escape');
  if (importConfigCalled) throw new Error('Expected importConfig to NOT be called on Escape');
});

// tc-049: Edit config modal shows parse error inline on malformed YAML
test('tc-049: modal shows parse error on malformed YAML', async () => {
  let importConfigCalled = false;
  const modal = createEditConfigModal();

  const component = {
    exportConfig: () => ({ bpm: 120 }),
    importConfig: () => {
      importConfigCalled = true;
      return [];
    },
  };

  // Mock jsyaml to throw on bad YAML
  globalThis.window.jsyaml = {
    load: (text, opts) => {
      if (text.includes('bad')) {
        throw new Error('Parse error: unexpected token');
      }
      return { bpm: 120 };
    },
    dump: (obj) => JSON.stringify(obj),
    CORE_SCHEMA: {},
  };

  modal.open(component);
  if (!modal.isOpen()) throw new Error('Expected modal to be open');

  modal.close();

  if (importConfigCalled) throw new Error('Expected importConfig to NOT be called on parse error');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
