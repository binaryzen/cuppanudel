/**
 * poc/tests/local-file-provider.test.js
 *
 * Integration tests for audio/local-file-provider
 * Tests: tc-029
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { localFileProvider } from '../audio/local-file-provider.js';

// tc-029: LocalFileProvider.browse() returns [] on user cancel (AbortError)
test('tc-029: browse() returns [] on AbortError (user cancel)', async () => {
  // Mock showOpenFilePicker to reject with AbortError
  const originalShowOpenFilePicker = global.showOpenFilePicker;
  global.showOpenFilePicker = () => {
    const err = new DOMException('User cancelled', 'AbortError');
    return Promise.reject(err);
  };

  const result = await localFileProvider.browse();

  global.showOpenFilePicker = originalShowOpenFilePicker;

  assertEquals(result.length, 0, 'browse() should return empty array on AbortError');
  assert(Array.isArray(result), 'Result should be an array');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
