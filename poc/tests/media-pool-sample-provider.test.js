/**
 * poc/tests/media-pool-sample-provider.test.js
 *
 * Integration tests for audio/media-pool-sample-provider
 * Tests: tc-032, tc-033
 *
 * NOTE: CODE NOT YET AVAILABLE
 * This test file documents the expected test cases for the media-pool-sample-provider module.
 */

import { test, run } from '../test/runner.js';
import { createMediaPoolSampleProvider } from '../audio/media-pool-sample-provider.js';

// tc-032: MediaPoolSampleProvider.getSample() normalizes pool undefined to null
test('tc-032: getSample() normalizes pool undefined to null', async () => {
  const pool = {
    getBuffer: (clipId) => {
      // Return undefined for 'abc'
      if (clipId === 'abc') return undefined;
      return { length: 1000 };
    },
    clips: [],
  };

  const provider = createMediaPoolSampleProvider(
    'test-provider',
    'Test Provider',
    [{ index: 0, clipId: 'abc' }],
    pool
  );

  // Mock console.warn
  let warnCalled = false;
  const originalWarn = console.warn;
  console.warn = () => {
    warnCalled = true;
  };

  try {
    const sample = provider.getSample(0);

    // Should return null (not undefined)
    if (sample !== null) throw new Error(`Expected null, got ${sample}`);

    // Should have logged a warning
    if (!warnCalled) throw new Error('Expected console.warn to be called');
  } finally {
    console.warn = originalWarn;
  }
});

// tc-033: MediaPoolSampleProvider.init() resolves immediately (no async work)
test('tc-033: init() resolves synchronously', async () => {
  const pool = {
    getBuffer: (clipId) => ({ length: 1000 }),
    clips: [],
  };

  const provider = createMediaPoolSampleProvider(
    'test-provider',
    'Test Provider',
    [
      { index: 0, clipId: 'clip-1' },
      { index: 1, clipId: 'clip-2' },
    ],
    pool
  );

  const mockCtx = {}; // Minimal mock context

  const result = provider.init(mockCtx);

  // Should return a Promise
  if (!result || typeof result.then !== 'function') {
    throw new Error('Expected init() to return a Promise');
  }

  // Should resolve synchronously (no async work)
  const resolved = await result;

  // Should resolve to undefined
  if (resolved !== undefined) {
    throw new Error('Expected init() to resolve to undefined');
  }

  // Buffers should already be available
  const sample0 = provider.getSample(0);
  if (sample0 === undefined) throw new Error('Expected getSample(0) to return a buffer');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
