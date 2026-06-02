import { test, run, assert } from '../test/runner.js';
import { createRecordingsProvider } from './recordings-provider.js';

// Mock AudioBuffer
const mockBuffer = (length = 44100) => ({
    length,
    sampleRate: 44100,
    numberOfChannels: 1,
    duration: length / 44100,
  });

// Mock MediaPool
const mockPool = () => {
  const buffers = new Map();
  const clips = [];

  return {
    get clips() {
      return clips;
    },
    addBuffer(buffer, label) {
      const id = String(clips.length + 1);
      buffers.set(id, buffer);
      const clip = {
        id,
        label: label || `Sample ${id}`,
        bufferId: id,
        startFrame: 0,
        endFrame: buffer.length,
      };
      clips.push(clip);
      return clip;
    },
    getBuffer(bufferId) {
      return buffers.get(bufferId);
    },
  };
};

test('creates a provider with correct id and label', () => {
  const pool = mockPool();
  const provider = createRecordingsProvider(pool);
  assert(provider.id === 'recordings', 'id should be "recordings"');
  assert(provider.label === 'Recordings', 'label should be "Recordings"');
});

test('browse() on an empty pool returns []', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    const items = await provider.browse();
    assert(Array.isArray(items), 'should return an array');
    assert(items.length === 0, 'should be empty');
  });

  test('browse() on a pool with 3 clips returns 3 items', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    pool.addBuffer(mockBuffer(), 'Clip 1');
    pool.addBuffer(mockBuffer(), 'Clip 2');
    pool.addBuffer(mockBuffer(), 'Clip 3');
    const items = await provider.browse();
    assert(items.length === 3, 'should return 3 items');
  });

  test('browse() entry.id equals clip.id', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    const clip = pool.addBuffer(mockBuffer(), 'Test');
    const items = await provider.browse();
    assert(items[0].id === clip.id, 'item id should match clip id');
  });

  test('browse() entry.label equals clip.label', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    pool.addBuffer(mockBuffer(), 'My Recording');
    const items = await provider.browse();
    assert(items[0].label === 'My Recording', 'item label should match clip label');
  });

  test('browse() returns a snapshot — mutations to returned array do not affect pool.clips', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    pool.addBuffer(mockBuffer(), 'Clip');
    const items = await provider.browse();
    items.splice(0, 1);  // Mutate the returned array
    assert(pool.clips.length === 1, 'pool.clips should be unaffected');
  });

  test('browse() returns a Promise', () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    const result = provider.browse();
    assert(result instanceof Promise, 'browse should return a Promise');
  });

  test('import(item, ctx) returns a Promise that resolves with the AudioBuffer', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    const buf = mockBuffer();
    const clip = pool.addBuffer(buf, 'Test');
    const items = await provider.browse();
    const imported = await provider.import(items[0], {});
    assert(imported === buf, 'should return the same buffer instance');
  });

  test('import(item, ctx) resolves synchronously (within one microtask)', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    pool.addBuffer(mockBuffer(), 'Test');
    const items = await provider.browse();
    let resolved = false;
    const promise = provider.import(items[0], {}).then(() => { resolved = true; });
    // After one microtask, should resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    assert(resolved, 'should resolve within microtask');
    await promise;  // Ensure promise settles
  });

  test('import() rejects if buffer not found', async () => {
    const pool = mockPool();
    const provider = createRecordingsProvider(pool);
    pool.addBuffer(mockBuffer(), 'Clip');
    const items = await provider.browse();
    // Manually delete the buffer to simulate clip deletion between browse and import
    items[0]._bufferId = 'nonexistent';
    let error = null;
    try {
      await provider.import(items[0], {});
    } catch (e) {
      error = e;
    }
    assert(error instanceof Error, 'should reject with Error');
    assert(error.message.includes('buffer not found'), 'message should mention missing buffer');
  });
});
