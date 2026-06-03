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

// tc-037: PresetBank.applyPreset writes snapshot fields to tc and calls metronome.restart() if running
test('tc-037: applyPreset updates tc and restarts metronome if running', async () => {
  // CODE NOT YET AVAILABLE
  // Expected to test:
  // - Create preset bank with store, tc, metronome
  // - store.load()[0] = {bpm:140, beatsPerMeasure:3, ...}
  // - metronome.isRunning() = true
  // - Click slot 0 (non-save mode)
  // - tc.bpm is updated to 140
  // - tc.beatsPerMeasure is updated to 3
  // - tc.clickProviderRef is updated from snapshot
  // - metronome.restart() is called
  throw new Error('Test not implemented: preset-bank module not yet available');
});

// tc-038: PresetBank does NOT call metronome.restart() if metronome is stopped
test('tc-038: applyPreset does not restart if metronome is stopped', async () => {
  // CODE NOT YET AVAILABLE
  // Expected to test:
  // - metronome.isRunning() = false
  // - Click slot 0 to apply preset
  // - tc fields are updated
  // - metronome.restart() is NOT called
  // - metronome remains stopped
  throw new Error('Test not implemented: preset-bank module not yet available');
});

// tc-052: PresetBank Save button enters save mode, highlighting all slots
test('tc-052: Save button enters save mode with visual feedback', async () => {
  // CODE NOT YET AVAILABLE
  // Expected to test:
  // - Create preset bank
  // - Click Save button
  // - All 8 slot buttons enter a highlighted state (visual feedback)
  // - Clicking any slot in save mode calls store.save(index, snapshot) and exits save mode
  throw new Error('Test not implemented: preset-bank module not yet available');
});

// tc-053: PresetBank snapshotFrom includes clickProviderRef field
test('tc-053: snapshot includes clickProviderRef field', async () => {
  // CODE NOT YET AVAILABLE
  // Expected to test:
  // - Create preset bank with tc where tc.clickProviderRef = 'built-in:default'
  // - In save mode, click slot 0
  // - Inspect the snapshot passed to store.save()
  // - Snapshot object includes clickProviderRef field
  // - snapshot.clickProviderRef === 'built-in:default'
  throw new Error('Test not implemented: preset-bank module not yet available');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
