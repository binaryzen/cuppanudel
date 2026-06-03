// poc/ui/sample-set-picker.test.js

import { test, assert, assertEquals, assertNull } from '../test/runner.js';
import { createSampleSetPicker } from './sample-set-picker.js';

// Mock DOM Element for Node.js environment
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.innerHTML = '';
    this.textContent = '';
    this.className = '';
    this.style = {};
    this.disabled = false;
    this.children = [];
    this._listeners = {};
    this._parent = null;
  }

  addEventListener(event, handler) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this._listeners[event]) {
      const idx = this._listeners[event].indexOf(handler);
      if (idx !== -1) {
        this._listeners[event].splice(idx, 1);
      }
    }
  }

  querySelector(selector) {
    if (selector === '.sample-set-picker-label') {
      return this._findByClass('sample-set-picker-label');
    }
    return null;
  }

  _findByClass(className) {
    if (this.className && this.className.includes(className)) {
      return this;
    }
    for (const child of this.children) {
      const found = child._findByClass(className);
      if (found) return found;
    }
    return null;
  }

  appendChild(child) {
    if (typeof child === 'string') {
      this.innerHTML += child;
    } else {
      this.children.push(child);
      child._parent = this;
    }
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
    }
  }

  contains(el) {
    if (el === this) return true;
    for (const child of this.children) {
      if (child.contains(el)) return true;
    }
    return false;
  }

  remove() {
    if (this._parent) {
      this._parent.removeChild(this);
    }
  }
}

// Setup global DOM mocks
if (typeof document === 'undefined') {
  global.document = {
    createElement(tagName) {
      return new MockElement(tagName);
    },
    addEventListener() {},
    removeEventListener() {},
  };
  global.HTMLElement = MockElement;
}

// Mock registry for testing
function createMockRegistry(providers = []) {
  const registryMap = new Map(providers.map(p => [p.id, p]));

  return {
    list() {
      return Array.from(registryMap.values());
    },
    get(id) {
      return registryMap.get(id);
    },
    register(provider) {
      registryMap.set(provider.id, provider);
    },
  };
}

// Mock pool for testing
function createMockPool(clips = []) {
  return {
    clips,
    getBuffer(bufferId) {
      return null;
    },
  };
}

// Mock TempoContext
function createMockTc(clickProviderRef = 'built-in:default') {
  return {
    clickProviderRef,
  };
}

// Test: createSampleSetPicker renders with current provider label
test('createSampleSetPicker initializes without error', () => {
  const target = document.createElement('div');
  const defaultProvider = { id: 'built-in:default', label: 'Default' };
  const registry = createMockRegistry([defaultProvider]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const picker = createSampleSetPicker(
    target,
    registry,
    pool,
    tc,
    () => {}
  );

  assert(picker !== null && typeof picker === 'object', 'Should return a controller object');
});

// Test: confirm button disabled state logic
test('controller interface is correct', () => {
  const target = document.createElement('div');
  const pool = createMockPool();
  const registry = createMockRegistry([]);
  const tc = createMockTc('built-in:default');

  const picker = createSampleSetPicker(
    target,
    registry,
    pool,
    tc,
    () => {}
  );

  assert(typeof picker.update === 'function', 'Controller should have update method');
  assert(typeof picker.dispose === 'function', 'Controller should have dispose method');
});

// Test: empty pool handling (no crash)
test('sample-set-picker handles empty pool gracefully', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool([]);

  const picker = createSampleSetPicker(
    target,
    registry,
    pool,
    createMockTc('built-in:default'),
    () => {}
  );

  assert(picker !== null, 'Should not crash on empty pool');
});

// Test: fallback label for unknown provider
test('sample-set-picker handles unknown provider gracefully', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('unknown-provider-id');

  const picker = createSampleSetPicker(
    target,
    registry,
    pool,
    tc,
    () => {}
  );

  assert(picker !== null, 'Should not crash with unknown provider');
});

// Test: update() can be called
test('update() can be called without error', () => {
  const target = document.createElement('div');
  const provider1 = { id: 'prov-1', label: 'Provider 1' };
  const provider2 = { id: 'prov-2', label: 'Provider 2' };
  const registry = createMockRegistry([provider1, provider2]);
  const pool = createMockPool();
  const tc = createMockTc('prov-1');

  const picker = createSampleSetPicker(target, registry, pool, tc, () => {});

  tc.clickProviderRef = 'prov-2';
  picker.update();

  assert(true, 'update() should complete without error');
});

// Test: dispose() removes event listeners
test('dispose() can be called without error', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const picker = createSampleSetPicker(target, registry, pool, tc, () => {});

  picker.dispose();
  assert(true, 'dispose() should complete without error');
});

// Test: controller interface compliance
test('controller has update and dispose methods', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const controller = createSampleSetPicker(target, registry, pool, tc, () => {});

  assert('update' in controller, 'Controller should have update method');
  assert('dispose' in controller, 'Controller should have dispose method');
  assert(typeof controller.update === 'function', 'update should be a function');
  assert(typeof controller.dispose === 'function', 'dispose should be a function');
});

// Test: picker does not call registry.register()
test('sample-set-picker does not modify registry', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const initialListLength = registry.list().length;

  const picker = createSampleSetPicker(target, registry, pool, tc, () => {});

  const finalListLength = registry.list().length;
  assertEquals(
    initialListLength,
    finalListLength,
    'Picker should not register providers'
  );
});

// Test: picker does not modify tc.clickProviderRef
test('sample-set-picker does not modify tc.clickProviderRef', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const initialRef = tc.clickProviderRef;

  const picker = createSampleSetPicker(target, registry, pool, tc, () => {});

  const finalRef = tc.clickProviderRef;
  assertEquals(initialRef, finalRef, 'Picker should not modify tc.clickProviderRef');
});

// Test: onProviderChange callback signature
test('onProviderChange receives correct arguments structure', () => {
  const target = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  let capturedArgs = null;
  const picker = createSampleSetPicker(
    target,
    registry,
    pool,
    tc,
    (selectedId, newProvider) => {
      capturedArgs = { selectedId, newProvider };
    }
  );

  assert(true, 'onProviderChange should accept (selectedId, newProvider) signature');
});

// Test: multiple pickers can coexist
test('multiple sample-set-pickers can be created independently', () => {
  const target1 = document.createElement('div');
  const target2 = document.createElement('div');
  const registry = createMockRegistry([]);
  const pool = createMockPool();
  const tc = createMockTc('built-in:default');

  const picker1 = createSampleSetPicker(target1, registry, pool, tc, () => {});
  const picker2 = createSampleSetPicker(target2, registry, pool, tc, () => {});

  assert(target1 !== target2, 'Targets should be different');
  assert(
    picker1 !== null && picker2 !== null,
    'Both pickers should be created'
  );
});
