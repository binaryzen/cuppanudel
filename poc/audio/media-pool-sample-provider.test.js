// poc/audio/media-pool-sample-provider.test.js

import { test, assert, assertEquals, assertNull } from '../test/runner.js';
import { createMediaPoolSampleProvider } from './media-pool-sample-provider.js';

// Mock pool for testing
function createMockPool() {
  const buffers = new Map();
  return {
    clips: [
      { id: 'clip-1', label: 'Kick' },
      { id: 'clip-2', label: 'Snare' },
    ],
    getBuffer(bufferId) {
      return buffers.get(bufferId);
    },
    setBuffer(bufferId, audioBuffer) {
      buffers.set(bufferId, audioBuffer);
    },
  };
}

// Mock AudioBuffer for testing
function createMockAudioBuffer(label) {
  return {
    sampleRate: 44100,
    length: 1000,
    _label: label, // for debugging
  };
}

// Test: createMediaPoolSampleProvider basic factory
test('createMediaPoolSampleProvider creates a provider with correct id and label', () => {
  const pool = createMockPool();
  const provider = createMediaPoolSampleProvider('sample-set:woodblock', 'Woodblock Kit', [], pool);

  assertEquals(provider.id, 'sample-set:woodblock');
  assertEquals(provider.label, 'Woodblock Kit');
});

// Test: getSample returns the AudioBuffer for a valid slot
test('getSample returns the AudioBuffer for a valid slot', () => {
  const pool = createMockPool();
  const buffer0 = createMockAudioBuffer('kick');
  const buffer1 = createMockAudioBuffer('snare');

  pool.setBuffer('clip-1', buffer0);
  pool.setBuffer('clip-2', buffer1);

  const slots = [
    { index: 0, clipId: 'clip-1' },
    { index: 1, clipId: 'clip-2' },
  ];
  const provider = createMediaPoolSampleProvider('sample-set:woodblock', 'Woodblock Kit', slots, pool);

  assertEquals(provider.getSample(0), buffer0);
  assertEquals(provider.getSample(1), buffer1);
});

// Test: getSample returns null for non-existent slot
test('getSample returns null for non-existent slot', () => {
  const pool = createMockPool();
  const slots = [
    { index: 0, clipId: 'clip-1' },
    { index: 1, clipId: 'clip-2' },
  ];
  const provider = createMediaPoolSampleProvider('sample-set:test', 'Test', slots, pool);

  assertNull(provider.getSample(2));
  assertNull(provider.getSample(3));
});

// Test: getSample returns null for negative index
test('getSample returns null for negative index', () => {
  const pool = createMockPool();
  const slots = [{ index: 0, clipId: 'clip-1' }];
  const provider = createMediaPoolSampleProvider('sample-set:test', 'Test', slots, pool);

  assertNull(provider.getSample(-1));
});

// Test: getSample returns null when buffer is missing from pool
test('getSample returns null when buffer is missing from pool', () => {
  const pool = createMockPool();
  const slots = [{ index: 0, clipId: 'clip-1' }];
  const provider = createMediaPoolSampleProvider('sample-set:test', 'Test', slots, pool);

  // Do not set buffer for 'clip-1', so getBuffer returns undefined
  assertNull(provider.getSample(0));
});

// Test: getSample never returns undefined
test('getSample never returns undefined', () => {
  const pool = createMockPool();
  const slots = [{ index: 0, clipId: 'clip-1' }];
  const provider = createMediaPoolSampleProvider('sample-set:test', 'Test', slots, pool);

  const sample = provider.getSample(0);
  assert(sample === null, 'Expected null, got undefined or other value');
});

// Test: count returns number of slot assignments
test('count returns the number of slot assignments', () => {
  const pool = createMockPool();

  const provider0 = createMediaPoolSampleProvider('sample-set:a', 'Set A', [], pool);
  assertEquals(provider0.count(), 0);

  const provider2 = createMediaPoolSampleProvider(
    'sample-set:b',
    'Set B',
    [
      { index: 0, clipId: 'clip-1' },
      { index: 1, clipId: 'clip-2' },
    ],
    pool
  );
  assertEquals(provider2.count(), 2);
});

// Test: init returns a resolved Promise
test('init returns a resolved Promise', async () => {
  const pool = createMockPool();
  const provider = createMediaPoolSampleProvider('sample-set:test', 'Test', [], pool);

  const result = provider.init(null);
  assert(result instanceof Promise, 'init must return a Promise');
  await result; // should not throw
});

// Test: createMediaPoolSampleProvider throws TypeError for missing id
test('createMediaPoolSampleProvider throws TypeError when id is undefined', () => {
  const pool = createMockPool();
  let threw = false;
  try {
    createMediaPoolSampleProvider(undefined, 'Label', [], pool);
  } catch (err) {
    threw = err instanceof TypeError && err.message.includes('id');
  }
  assert(threw, 'Expected TypeError for missing id');
});

// Test: createMediaPoolSampleProvider throws TypeError for missing label
test('createMediaPoolSampleProvider throws TypeError when label is undefined', () => {
  const pool = createMockPool();
  let threw = false;
  try {
    createMediaPoolSampleProvider('sample-set:test', undefined, [], pool);
  } catch (err) {
    threw = err instanceof TypeError && err.message.includes('label');
  }
  assert(threw, 'Expected TypeError for missing label');
});

// Test: createMediaPoolSampleProvider throws TypeError for missing slots
test('createMediaPoolSampleProvider throws TypeError when slots is undefined', () => {
  const pool = createMockPool();
  let threw = false;
  try {
    createMediaPoolSampleProvider('sample-set:test', 'Label', undefined, pool);
  } catch (err) {
    threw = err instanceof TypeError && err.message.includes('slots');
  }
  assert(threw, 'Expected TypeError for missing slots');
});

// Test: createMediaPoolSampleProvider throws TypeError for missing pool
test('createMediaPoolSampleProvider throws TypeError when pool is undefined', () => {
  let threw = false;
  try {
    createMediaPoolSampleProvider('sample-set:test', 'Label', [], undefined);
  } catch (err) {
    threw = err instanceof TypeError && err.message.includes('pool');
  }
  assert(threw, 'Expected TypeError for missing pool');
});

// Test: empty slots array
test('empty slots array works correctly', () => {
  const pool = createMockPool();
  const provider = createMediaPoolSampleProvider('sample-set:empty', 'Empty', [], pool);

  assertEquals(provider.count(), 0);
  assertNull(provider.getSample(0));
});
