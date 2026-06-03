/**
 * poc/tests/builtin-click-provider.test.js
 *
 * Integration tests for audio/builtin-click-provider
 * Tests: tc-007, tc-008, tc-009
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { builtinClickProvider } from '../audio/builtin-click-provider.js';

// tc-007: BuiltinClickProvider returns null before init() resolves
test('tc-007: getSample() returns null before init()', () => {
  // Test the REAL builtinClickProvider before init() is called
  // In a fresh module import, it should return null before init()
  const result0 = builtinClickProvider.getSample(0);
  const result1 = builtinClickProvider.getSample(1);

  assertEquals(result0, null, 'getSample(0) should return null before init');
  assertEquals(result1, null, 'getSample(1) should return null before init');
});

// tc-008: BuiltinClickProvider.init() synthesizes AudioBuffers and caches them
test('tc-008: init() synthesizes and caches buffers', async () => {
  // Create a mock audio context
  let mockCtx;
  try {
    // Try OfflineAudioContext (browser environment)
    mockCtx = new OfflineAudioContext(1, 44100, 44100);
  } catch (e) {
    // Node.js environment: skip this test
    console.log('SKIP tc-008: OfflineAudioContext unavailable in Node.js');
    return;
  }

  // Reset the provider for this test
  builtinClickProvider._buffers = null;
  builtinClickProvider._initialized = false;

  await builtinClickProvider.init(mockCtx);

  const buf0 = builtinClickProvider.getSample(0);
  const buf1 = builtinClickProvider.getSample(1);
  const buf2 = builtinClickProvider.getSample(2);

  assert(buf0 !== null, 'getSample(0) should return AudioBuffer');
  assert(buf1 !== null, 'getSample(1) should return AudioBuffer');
  assertEquals(buf2, null, 'getSample(2) should return null (out of range)');

  assertEquals(builtinClickProvider.count(), 2, 'count() should return 2');

  // Check that buffers are actual AudioBuffer objects
  assert(buf0.sampleRate !== undefined, 'buf0 should be an AudioBuffer');
  assert(buf1.sampleRate !== undefined, 'buf1 should be an AudioBuffer');
});

// tc-009: BuiltinClickProvider.init() called twice is a no-op (same buffer instance)
test('tc-009: init() second call is a no-op', async () => {
  let mockCtx;
  try {
    mockCtx = new OfflineAudioContext(1, 44100, 44100);
  } catch (e) {
    // Node.js environment: skip this test
    console.log('SKIP tc-009: OfflineAudioContext unavailable in Node.js');
    return;
  }

  // Reset the provider
  builtinClickProvider._buffers = null;
  builtinClickProvider._initialized = false;

  await builtinClickProvider.init(mockCtx);
  const buf1 = builtinClickProvider.getSample(0);

  await builtinClickProvider.init(mockCtx);
  const buf2 = builtinClickProvider.getSample(0);

  assert(buf1 === buf2, 'Same buffer instance should be returned after second init()');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
