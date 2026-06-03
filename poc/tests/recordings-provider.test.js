/**
 * poc/tests/recordings-provider.test.js
 *
 * Integration tests for audio/recordings-provider
 * Tests: tc-030a, tc-030b
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { createRecordingsProvider } from '../audio/recordings-provider.js';

// tc-030a: RecordingsProvider.browse() returns a snapshot array of pool clips
test('tc-030a: browse() returns snapshot of pool clips', async () => {
  const mockPool = {
    clips: [
      { id: '1', label: 'Clip 1', bufferId: 'buf-1' },
      { id: '2', label: 'Clip 2', bufferId: 'buf-2' },
      { id: '3', label: 'Clip 3', bufferId: 'buf-3' }
    ],
    getBuffer: (id) => ({ sampleRate: 44100, length: 100 })
  };

  const provider = createRecordingsProvider(mockPool);
  const items = await provider.browse();

  assertEquals(items.length, 3, 'browse() should return 3 items');
  assertEquals(items[0].id, '1', 'First item id should match');
  assertEquals(items[0].label, 'Clip 1', 'First item label should match');
  assertEquals(items[1].id, '2', 'Second item id should match');

  // Verify snapshot semantics: mutating returned array doesn't affect pool
  items.splice(0, 1);
  const items2 = await provider.browse();
  assertEquals(items2.length, 3, 'Original pool should be unaffected by array mutation');
  assert(items !== items2, 'browse() should return different array instances');
});

// tc-030b: RecordingsProvider.import() rejects with error when buffer not found
test('tc-030b: import() rejects when buffer not found', async () => {
  const mockPool = {
    clips: [],
    getBuffer: (id) => undefined  // Always return undefined
  };

  const provider = createRecordingsProvider(mockPool);
  const item = { id: 'clip-1', label: 'Test', _bufferId: 'audio-buf-123' };

  try {
    await provider.import(item, {});
    throw new Error('Expected rejection');
  } catch (e) {
    assert(e.message.includes('buffer not found'), 'Error should mention missing buffer');
    assert(e.message.includes('clip-1'), 'Error should include clip id');
  }
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
