/**
 * poc/tests/context-menu.test.js
 *
 * Integration tests for ui/context-menu
 * Tests: tc-023, tc-024
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the context menu module.
 */

import { test, run } from '../test/runner.js';
import { createContextMenu } from '../ui/context-menu.js';

// Mock document
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => {
      const el = {
        style: { cssText: '' },
        textContent: '',
        onclick: null,
        onmouseenter: null,
        onmouseleave: null,
        _children: [],
        appendChild: function(child) {
          if (!this._children) this._children = [];
          this._children.push(child);
        },
        remove: () => {},
        contains: (target) => false,
        getBoundingClientRect: () => ({ right: 100, bottom: 100, width: 50, height: 50 }),
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
    getElementById: () => null,
    _addEventListener: function(evt, handler) {},
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
  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
  };
}

// tc-023: Context menu shows 'Paste Config' hidden (not greyed) when clipboard unavailable
test('tc-023: Paste Config item is hidden when clipboard unavailable', async () => {
  const target = globalThis.document.createElement('div');
  target._listeners = {};

  const component = {
    exportConfig: () => ({}),
    importConfig: () => [],
  };

  const openModal = () => {};

  // Mock navigator.clipboard to be unavailable
  const originalClipboard = globalThis.navigator?.clipboard;
  if (!globalThis.navigator) globalThis.navigator = {};
  globalThis.navigator.clipboard = undefined;

  try {
    const menu = createContextMenu(target, component, openModal);

    if (!menu) throw new Error('Failed to create context menu');

    // Simulate opening the menu by calling the contextmenu handler
    if (target._listeners && target._listeners.contextmenu) {
      const contextMenuEvent = {
        preventDefault: () => {},
        clientX: 100,
        clientY: 100
      };
      target._listeners.contextmenu[0](contextMenuEvent);
    }

    // Find the rendered menu in document.body
    let pasteItemFound = false;
    if (globalThis.document.body._children) {
      for (const child of globalThis.document.body._children) {
        if (child._children) {
          for (const menuItem of child._children) {
            if (menuItem.textContent && menuItem.textContent.includes('Paste Config')) {
              pasteItemFound = true;
              break;
            }
          }
        }
      }
    }

    if (pasteItemFound) {
      throw new Error('Paste Config item should not be present when clipboard is unavailable');
    }

    menu.dispose();
  } finally {
    if (originalClipboard !== undefined) {
      globalThis.navigator.clipboard = originalClipboard;
    }
  }
});

// tc-024: Context menu calls importConfig when 'Paste Config' is clicked
test('tc-024: Paste Config calls importConfig with clipboard content', async () => {
  const target = globalThis.document.createElement('div');
  target._listeners = {};

  let importConfigCalled = false;
  const component = {
    exportConfig: () => ({}),
    importConfig: (obj) => {
      importConfigCalled = true;
      return [];
    },
  };

  const openModal = () => {};

  // Mock navigator.clipboard with valid content
  if (!globalThis.navigator) globalThis.navigator = {};
  globalThis.navigator.clipboard = {
    readText: async () => 'bpm: 120',
    writeText: async () => {},
  };

  // Mock window.jsyaml
  globalThis.window.jsyaml = {
    load: (text, opts) => ({ bpm: 120 }),
    dump: (obj) => JSON.stringify(obj),
    CORE_SCHEMA: {},
  };

  const menu = createContextMenu(target, component, openModal);

  if (!menu) throw new Error('Failed to create context menu');

  // Simulate opening the context menu by calling the handler
  if (target._listeners && target._listeners.contextmenu) {
    const contextMenuEvent = {
      preventDefault: () => {},
      clientX: 100,
      clientY: 100
    };
    target._listeners.contextmenu[0](contextMenuEvent);
  }

  // Find the rendered menu and locate the Paste Config item
  let pasteItem = null;
  if (globalThis.document.body._children) {
    const menuEl = globalThis.document.body._children[globalThis.document.body._children.length - 1];
    if (menuEl && menuEl._children) {
      pasteItem = menuEl._children.find(child =>
        child.textContent && child.textContent.includes('Paste Config')
      );
    }
  }

  if (!pasteItem) {
    throw new Error('Paste Config item not found in menu');
  }

  if (pasteItem.onclick) {
    // Simulate clicking the Paste Config item
    await pasteItem.onclick();
  } else {
    throw new Error('Paste Config item has no onclick handler');
  }

  // Give async paste operation time to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  if (!importConfigCalled) {
    throw new Error('Expected importConfig to be called after Paste Config click');
  }

  menu.dispose();
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
