/**
 * poc/tests/tempo-context.test.js
 *
 * Integration tests for timing/tempo-context
 * Tests: tc-005, tc-006
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { createTempoContext, setBeatsPerMeasure } from '../timing/tempo-context.js';

// tc-005: TempoContext carries new clickProviderRef field with correct default
test('tc-005: createTempoContext() has correct defaults', () => {
  const tc = createTempoContext();

  assertEquals(tc.clickProviderRef, 'built-in:default', 'clickProviderRef should default to built-in:default');
  assertEquals(tc.snapThreshold, 0, 'snapThreshold should default to 0');
  assert(Array.isArray(tc.beatAccents), 'beatAccents should be an array');
  assertEquals(tc.beatAccents.length, 4, 'beatAccents should have length 4');
  assertEquals(tc.beatAccents[0], true, 'First beat should be accented');
  assertEquals(tc.beatAccents[1], false, 'Second beat should not be accented');
  assertEquals(tc.beatAccents[2], false, 'Third beat should not be accented');
  assertEquals(tc.beatAccents[3], false, 'Fourth beat should not be accented');
});

// tc-006: setBeatsPerMeasure resets beatAccents but preserves clickProviderRef/snapThreshold
test('tc-006: setBeatsPerMeasure preserves other fields', () => {
  const tc = createTempoContext();
  tc.clickProviderRef = 'sample-set:custom';
  tc.snapThreshold = 0.01;

  setBeatsPerMeasure(tc, 5);

  assertEquals(tc.beatsPerMeasure, 5, 'beatsPerMeasure should be updated');
  assertEquals(tc.beatAccents.length, 5, 'beatAccents should have length 5');
  assertEquals(tc.beatAccents[0], true, 'First beat should be accented');
  assertEquals(tc.beatAccents[1], false, 'Other beats should not be accented');

  assertEquals(tc.clickProviderRef, 'sample-set:custom', 'clickProviderRef should be preserved');
  assertEquals(tc.snapThreshold, 0.01, 'snapThreshold should be preserved');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
