import { test, run, assert } from '../test/runner.js';
import { localFileProvider } from './local-file-provider.js';

// Mock AudioContext
const mockCtx = {
  sampleRate: 44100,
  decodeAudioData(arrayBuffer) {
    return Promise.resolve({
      length: 44100,
      sampleRate: 44100,
      numberOfChannels: 1,
      duration: 1,
    });
  },
};

// Mock File
const mockFile = (name = 'test.wav', size = 1000, type = 'audio/wav') => ({
  name,
  size,
  type,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
});

test('localFileProvider has correct id and label', () => {
  assert(localFileProvider.id === 'local-files', 'id should be "local-files"');
  assert(localFileProvider.label === 'My Files', 'label should be "My Files"');
});

test('browse() returns a Promise', () => {
  const result = localFileProvider.browse();
  assert(result instanceof Promise, 'browse should return a Promise');
});

test('import() rejects if item has no _file field', async () => {
  const item = { id: 'test', label: 'test.wav' };
  let error = null;
  try {
    await localFileProvider.import(item, mockCtx);
  } catch (e) {
    error = e;
  }
  assert(error instanceof Error, 'should reject');
  assert(error.message.includes('_file'), 'error should mention missing _file');
});

test('import() resolves with AudioBuffer when file is valid', async () => {
  const file = mockFile('test.wav', 1000, 'audio/wav');
  const item = {
    id: 'test',
    label: 'test.wav',
    sizeHint: 1000,
    mimeType: 'audio/wav',
    _file: file,
  };
  const buffer = await localFileProvider.import(item, mockCtx);
  assert(buffer.sampleRate === 44100, 'buffer should have correct sampleRate');
  assert(buffer.numberOfChannels === 1, 'buffer should have 1 channel');
});

test('import() rejects if decodeAudioData fails', async () => {
  const file = mockFile('corrupt.wav', 100, 'audio/wav');
  const badCtx = {
    sampleRate: 44100,
    decodeAudioData() {
      return Promise.reject(new Error('Decode failed'));
    },
  };
  const item = {
    id: 'test',
    label: 'corrupt.wav',
    _file: file,
  };
  let error = null;
  try {
    await localFileProvider.import(item, badCtx);
  } catch (e) {
    error = e;
  }
  assert(error instanceof Error, 'should reject with error');
  assert(error.message.includes('Decode failed'), 'should be the decodeAudioData error');
});

test('ContentItem has correct fields after creation', async () => {
  const file = mockFile('my-recording.mp3', 5000, 'audio/mp3');
  const item = {
    id: `local-${file.name}-${file.size}`,
    label: file.name,
    sizeHint: file.size,
    mimeType: file.type,
    _file: file,
  };
  assert(item.label === 'my-recording.mp3', 'label should be file.name');
  assert(item.sizeHint === 5000, 'sizeHint should be file.size');
  assert(item.mimeType === 'audio/mp3', 'mimeType should be file.type');
  const buffer = await localFileProvider.import(item, mockCtx);
  assert(buffer !== undefined, 'import should succeed and return buffer');
});

test('import() never returns undefined', async () => {
  const file = mockFile();
  const item = { id: 'test', label: 'test', _file: file };
  const buffer = await localFileProvider.import(item, mockCtx);
  assert(buffer !== undefined && buffer !== null, 'import should always return AudioBuffer or reject');
});

test('Note: browse() file picker paths require browser environment', () => {
  assert(true, 'placeholder: browser file picker testing deferred to integration');
});

run();
