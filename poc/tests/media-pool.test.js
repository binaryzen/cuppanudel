/**
 * poc/tests/media-pool.test.js
 *
 * Integration tests for pool/media-pool
 * Tests: tc-031
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { createMediaPool } from '../pool/media-pool.js';

// tc-031: Media pool documents that getBuffer() returns undefined (not null) on miss
test('tc-031: getBuffer() returns undefined on miss', () => {
  const pool = createMediaPool();

  const result = pool.getBuffer('nonexistent-id');

  assert(result === undefined, 'getBuffer() should return undefined (not null) on miss');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
