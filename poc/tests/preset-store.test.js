/**
 * poc/tests/preset-store.test.js
 *
 * Integration tests for config/preset-store
 * Tests: tc-035, tc-036, tc-050, tc-051
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the preset-store module.
 */

import { test, run } from '../test/runner.js';
import { createPresetStore } from '../config/preset-store.js';
import { MAX_PRESETS } from '../constants.js';

// Mock localStorage
function createMockLocalStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

// tc-035: PresetStore persists to localStorage and loads on creation
test('tc-035: preset store persists to localStorage', async () => {
  const mockLS = createMockLocalStorage();

  // Create store1 and save a preset to slot 0
  const store1 = createPresetStore(mockLS);
  const snapshot = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  store1.save(0, snapshot);

  // Create store2 with the same localStorage (simulating page reload)
  const store2 = createPresetStore(mockLS);
  const loaded = store2.load();

  // Verify the preset was loaded
  if (!loaded[0]) throw new Error('Expected preset at index 0');
  if (loaded[0].bpm !== 120) throw new Error('Expected bpm to be 120');

  // Verify localStorage key exists
  const stored = mockLS.getItem('cuppanudel.presets.v1');
  if (!stored) throw new Error('Expected localStorage key to be set');
});

// tc-036: PresetStore.importConfig() validates and applies workspace import
test('tc-036: importConfig() validates and applies workspace import', async () => {
  const mockLS = createMockLocalStorage();
  const store = createPresetStore(mockLS);

  // Create array of presets (8 slots, first two filled, rest null)
  const presetsArray = [
    {
      name: 'Preset 1',
      bpm: 120,
      beatsPerMeasure: 4,
      beatOffsets: [0, 0.5, 1, 1.5],
      beatVolumes: [1, 0.5, 1, 0.5],
      beatAccents: [true, false, false, false],
      clickProviderRef: 'built-in:default',
    },
    {
      name: 'Preset 2',
      bpm: 140,
      beatsPerMeasure: 3,
      beatOffsets: [0, 2/3, 4/3],
      beatVolumes: [1, 0.5, 1],
      beatAccents: [true, false, false],
      clickProviderRef: 'built-in:default',
    },
    null, null, null, null, null, null,
  ];

  const config = { presets: presetsArray };
  const errors = store.importConfig(config);

  // Should have no errors
  if (errors.length > 0) throw new Error(`Expected no errors, got: ${errors.join(', ')}`);

  // Verify presets were imported
  const loaded = store.load();
  if (!loaded[0]) throw new Error('Expected preset at index 0');
  if (loaded[0].bpm !== 120) throw new Error('Expected first preset bpm to be 120');
  if (!loaded[1]) throw new Error('Expected preset at index 1');
  if (loaded[1].bpm !== 140) throw new Error('Expected second preset bpm to be 140');
});

// tc-050: PresetStore.save() throws RangeError on out-of-bounds index
test('tc-050: save() throws RangeError on out-of-bounds index', async () => {
  const mockLS = createMockLocalStorage();
  const store = createPresetStore(mockLS);

  const snapshot = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  try {
    store.save(MAX_PRESETS, snapshot); // Out of bounds
    throw new Error('Expected RangeError');
  } catch (e) {
    if (!(e instanceof RangeError)) throw new Error(`Expected RangeError, got ${e.constructor.name}`);
    if (!e.message.includes('index out of bounds')) throw new Error('Expected error message to contain "index out of bounds"');
  }
});

// tc-051: PresetStore initializes with in-memory fallback when localStorage is malformed
test('tc-051: preset store recovers from malformed localStorage', async () => {
  const mockLS = {
    getItem: (key) => {
      if (key === 'cuppanudel.presets.v1') {
        return '{invalid json}'; // Malformed JSON
      }
      return null;
    },
    setItem: () => {},
    removeItem: () => {},
  };

  // Mock console.warn
  let warnCalled = false;
  const originalWarn = console.warn;
  console.warn = () => {
    warnCalled = true;
  };

  try {
    const store = createPresetStore(mockLS);
    const loaded = store.load();

    // Should initialize with 8 null slots
    if (loaded.length !== MAX_PRESETS) throw new Error(`Expected ${MAX_PRESETS} slots, got ${loaded.length}`);
    if (loaded.some(p => p !== null)) throw new Error('Expected all slots to be null');

    // Should have logged a warning
    if (!warnCalled) throw new Error('Expected console.warn to be called');
  } finally {
    console.warn = originalWarn;
  }
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
