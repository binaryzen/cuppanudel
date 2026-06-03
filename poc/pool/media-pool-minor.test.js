import { test, run, assert } from '../test/runner.js';
import { createMediaPool } from './media-pool.js';

// Minimal AudioBuffer mock for testing
const mockBuffer = {
  length: 44100,
  sampleRate: 44100,
  numberOfChannels: 1,
  duration: 1,
};

test('getBuffer(existingId) returns the AudioBuffer previously added', () => {
  const pool = createMediaPool();
  const clip = pool.addBuffer(mockBuffer, 'test-sample');
  const retrieved = pool.getBuffer(clip.bufferId);
  assert(retrieved === mockBuffer, 'getBuffer should return the same AudioBuffer instance');
});

test("getBuffer('nonexistent') returns undefined (confirming existing behaviour)", () => {
  const pool = createMediaPool();
  const result = pool.getBuffer('nonexistent');
  assert(result === undefined, 'getBuffer should return undefined for nonexistent id');
});

test('getBuffer() signature and return type are unchanged', () => {
  const pool = createMediaPool();
  assert(typeof pool.getBuffer === 'function', 'getBuffer should be a function');
  const mockBuffer2 = { length: 1000, sampleRate: 44100, numberOfChannels: 1, duration: 0.02 };
  const clip = pool.addBuffer(mockBuffer2, 'test');
  const retrieved = pool.getBuffer(clip.bufferId);
  assert(retrieved !== undefined, 'existing id should return AudioBuffer, not undefined');
});

run();
