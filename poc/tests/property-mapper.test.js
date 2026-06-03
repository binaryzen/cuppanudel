/**
 * poc/tests/property-mapper.test.js
 *
 * Integration tests for config/property-mapper
 * Tests: tc-002, tc-003, tc-004, tc-045, tc-046
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { validateAndApply, serialize } from '../config/property-mapper.js';

// tc-002: property-mapper enforces two-pass atomic write (no partial writes on error)
test('tc-002: atomic write on required field error', () => {
  const schema = [
    { key: 'a', type: 'int' },
    { key: 'b', type: 'int', required: true }
  ];
  const source = { a: 1 };
  const target = { a: 100, b: 200 };

  const errors = validateAndApply(schema, source, target);

  assert(errors.length > 0, 'Should have error');
  assert(errors[0].includes('b'), 'Error should mention field b');
  assert(target.a === 100, 'target.a should not be modified');
  assert(target.b === 200, 'target.b should not be modified');
});

// tc-003: property-mapper clamps out-of-range scalars with warning, not error
test('tc-003: clamping produces warning, not error', () => {
  const schema = [
    { key: 'bpm', type: 'int', min: 20, max: 300 }
  ];
  const source = { bpm: 400 };
  const target = {};

  const results = validateAndApply(schema, source, target);

  assert(target.bpm === 300, 'target.bpm should be clamped to 300');
  assert(results.length > 0, 'Should have a warning');
  assert(results[0].includes('clamped'), 'Warning should mention clamping');
});

// tc-004: property-mapper validates array length via exactLength reference
test('tc-004: exactLength reference validation', () => {
  const schema = [
    { key: 'bpm', type: 'int' },
    { key: 'offsets', type: 'float[]', exactLength: 'bpm' }
  ];
  const source = { bpm: 3, offsets: [0, 0.5] };
  const target = {};

  const errors = validateAndApply(schema, source, target);

  assert(errors.length > 0, 'Should have error for length mismatch');
  assert(errors[0].includes('offsets'), 'Error should mention offsets field');
  assert(!target.hasOwnProperty('offsets'), 'target.offsets should not be set (atomic fail)');
  assert(!target.hasOwnProperty('bpm'), 'target.bpm should not be set (atomic fail)');
});

// tc-045: property-mapper serialize() fills defaults for absent fields
test('tc-045: serialize fills defaults for absent fields', () => {
  const schema = [
    { key: 'bpm', type: 'int', default: 120 }
  ];
  const source = {};

  const result = serialize(schema, source);

  assert(result.bpm === 120, 'Should have default value 120');
});

// tc-046: property-mapper serialize() uses source values over defaults and omits extra keys
test('tc-046: serialize uses source values and omits extra keys', () => {
  const schema = [
    { key: 'bpm', type: 'int', default: 120 }
  ];
  const source = { bpm: 90, extraKey: 999 };

  const result = serialize(schema, source);

  assert(result.bpm === 90, 'Source value should override default');
  assert(!result.hasOwnProperty('extraKey'), 'Extra key should be omitted');
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
