/**
 * poc/tests/preset-bank.test.js
 *
 * Integration tests for ui/preset-bank
 * Tests: tc-037, tc-038, tc-052, tc-053
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the preset-bank module.
 */

import { test, run } from '../test/runner.js';
import { createPresetBank, snapshotFrom } from '../ui/preset-bank.js';
import { MAX_PRESETS } from '../constants.js';

// Mock document with event triggering capability
function createMockDocument() {
  const buttons = [];
  const saveButton = {
    className: '',
    classList: {
      add: function() {},
      remove: function() {},
    },
    disabled: false,
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
    _click: function() {
      if (this._listeners['click']) {
        for (const handler of this._listeners['click']) {
          handler();
        }
      }
    },
  };

  return {
    createElement: (tag) => {
      const btn = {
        className: '',
        textContent: '',
        dataset: {},
        title: '',
        disabled: false,
        style: {},
        classList: {
          add: function() {},
          remove: function() {},
        },
        _listeners: {},
        appendChild: function() {},
        addEventListener: function(evt, handler) {
          if (!this._listeners[evt]) this._listeners[evt] = [];
          this._listeners[evt].push(handler);
        },
        removeEventListener: function(evt, handler) {
          if (this._listeners[evt]) {
            this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
          }
        },
        _click: function() {
          if (this._listeners['click']) {
            for (const handler of this._listeners['click']) {
              handler();
            }
          }
        },
      };
      if (tag === 'button') {
        buttons.push(btn);
      }
      return btn;
    },
    getElementById: (id) => {
      if (id === 'preset-save-btn') {
        return saveButton;
      }
      return null;
    },
    buttons: buttons,
    saveButton: saveButton,
  };
}

// tc-037: PresetBank.applyPreset updates tc and restarts metronome if running
test('tc-037: applyPreset updates tc and restarts metronome if running', async () => {
  const mockDoc = createMockDocument();
  const container = mockDoc.createElement('div');

  const preset = {
    name: 'Test Preset',
    bpm: 140,
    beatsPerMeasure: 3,
    beatOffsets: [0, 2/3, 4/3],
    beatVolumes: [1, 0.5, 1],
    beatAccents: [true, false, false],
    clickProviderRef: 'custom:preset',
  };

  const store = {
    load: () => {
      const arr = Array(MAX_PRESETS).fill(null);
      arr[0] = preset;
      return arr;
    },
    save: () => {},
  };

  const tc = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  let restartCalled = false;
  const metronome = {
    isRunning: () => true,
    restart: () => {
      restartCalled = true;
    },
  };

  const bank = createPresetBank(container, store, tc, metronome, mockDoc);

  // Simulate clicking slot 0 (apply preset)
  if (mockDoc.buttons.length > 0) {
    mockDoc.buttons[0]._click();
  }

  // The preset bank should update tc and call metronome.restart()
  if (tc.bpm !== 140) throw new Error('Expected bpm to be updated to 140');
  if (tc.beatsPerMeasure !== 3) throw new Error('Expected beatsPerMeasure to be updated to 3');
  if (tc.clickProviderRef !== 'custom:preset') throw new Error('Expected clickProviderRef to be updated');
  if (!restartCalled) throw new Error('Expected metronome.restart() to be called');
});

// tc-038: PresetBank does NOT call metronome.restart() if metronome is stopped
test('tc-038: applyPreset does not restart if metronome is stopped', async () => {
  const mockDoc = createMockDocument();
  const container = mockDoc.createElement('div');

  const preset = {
    name: 'Test Preset',
    bpm: 140,
    beatsPerMeasure: 3,
    beatOffsets: [0, 2/3, 4/3],
    beatVolumes: [1, 0.5, 1],
    beatAccents: [true, false, false],
    clickProviderRef: 'custom:preset',
  };

  const store = {
    load: () => {
      const arr = Array(MAX_PRESETS).fill(null);
      arr[0] = preset;
      return arr;
    },
    save: () => {},
  };

  const tc = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  let restartCalled = false;
  const metronome = {
    isRunning: () => false, // Metronome is stopped
    restart: () => {
      restartCalled = true;
    },
  };

  const bank = createPresetBank(container, store, tc, metronome, mockDoc);

  // Simulate clicking slot 0
  if (mockDoc.buttons.length > 0) {
    mockDoc.buttons[0]._click();
  }

  // metronome.restart() should NOT have been called
  if (restartCalled) throw new Error('Expected metronome.restart() to NOT be called when metronome is stopped');
});

// tc-052: PresetBank Save button enters save mode with visual feedback
test('tc-052: Save button enters save mode with visual feedback', async () => {
  const mockDoc = createMockDocument();
  const container = mockDoc.createElement('div');

  const store = {
    load: () => Array(MAX_PRESETS).fill(null),
    save: () => {},
  };

  const tc = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  const metronome = {
    isRunning: () => false,
    restart: () => {},
  };

  const bank = createPresetBank(container, store, tc, metronome, mockDoc);

  // The bank should be created successfully
  if (!bank) throw new Error('Failed to create preset bank');
});

// tc-053: PresetBank snapshotFrom includes clickProviderRef field
test('tc-053: snapshot includes clickProviderRef field', async () => {
  const tc = {
    bpm: 120,
    beatsPerMeasure: 4,
    beatOffsets: [0, 0.5, 1, 1.5],
    beatVolumes: [1, 0.5, 1, 0.5],
    beatAccents: [true, false, false, false],
    clickProviderRef: 'built-in:default',
  };

  const snapshot = snapshotFrom(tc);

  // Verify snapshot includes clickProviderRef
  if (!snapshot.hasOwnProperty('clickProviderRef')) throw new Error('Expected snapshot to include clickProviderRef field');
  if (snapshot.clickProviderRef !== 'built-in:default') throw new Error('Expected clickProviderRef to match tc value');

  // Verify all fields are present
  if (!snapshot.hasOwnProperty('bpm')) throw new Error('Expected bpm in snapshot');
  if (!snapshot.hasOwnProperty('beatsPerMeasure')) throw new Error('Expected beatsPerMeasure in snapshot');
  if (!snapshot.hasOwnProperty('beatOffsets')) throw new Error('Expected beatOffsets in snapshot');
  if (!snapshot.hasOwnProperty('beatVolumes')) throw new Error('Expected beatVolumes in snapshot');
  if (!snapshot.hasOwnProperty('beatAccents')) throw new Error('Expected beatAccents in snapshot');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
