import { test, run, assert, assertEquals, assertNull, _reset } from '../test/runner.js';
import { validateAndApply, serialize } from './property-mapper.js';

// ─── Success Criteria Tests ──────────────────────────────────────────────────

test('validates and applies a simple int field within range', () => {
	const schema = [{ key: 'bpm', type: 'int', min: 20, max: 300 }];
	const source = { bpm: 120 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.bpm, 120, 'should write bpm to target');
});

test('clamps out-of-range int and returns warning', () => {
	const schema = [{ key: 'bpm', type: 'int', min: 20, max: 300 }];
	const source = { bpm: 350 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one warning');
	assert(errors[0].includes('clamped'), 'error should indicate clamping');
	assertEquals(target.bpm, 300, 'should write clamped value to target');
});

test('rejects required field when missing', () => {
	const schema = [{ key: 'bpm', type: 'int', required: true }];
	const source = {};
	const target = { bpm: 120 };
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('required field missing'), 'error should indicate missing required field');
	assertEquals(target.bpm, 120, 'should not modify target when error occurs');
});

test('rejects array length mismatch with exactLength and prevents all writes (atomic)', () => {
	const schema = [
		{ key: 'beatsPerMeasure', type: 'int' },
		{ key: 'offsets', type: 'float[]', exactLength: 'beatsPerMeasure' }
	];
	const source = { beatsPerMeasure: 4, offsets: [0, 0.5] };
	const target = { beatsPerMeasure: 120 };
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('does not match beatsPerMeasure'), 'error should reference exactLength field');
	assertEquals(target.beatsPerMeasure, 120, 'should not modify target when error occurs (atomic)');
});

test('rejects wrong type and prevents all writes', () => {
	const schema = [{ key: 'vol', type: 'float' }];
	const source = { vol: 'loud' };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected float'), 'error should indicate type mismatch');
	assert(!target.hasOwnProperty('vol'), 'should not write vol to target');
});

test('prevents partial write when one field has error', () => {
	const schema = [
		{ key: 'x', type: 'int' },
		{ key: 'y', type: 'int' }
	];
	const source = { x: 1, y: 'bad' };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(!target.hasOwnProperty('x'), 'should not write x to target (atomic)');
	assert(!target.hasOwnProperty('y'), 'should not write y to target');
});

test('skips exactLength check when reference field is missing in source', () => {
	const schema = [
		{ key: 'offsets', type: 'float[]', exactLength: 'beatsPerMeasure' }
	];
	const source = { offsets: [0, 0.5] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.offsets[0], 0, 'should write offsets to target');
});

test('clamps array element out of range and includes in return array', () => {
	const schema = [{ key: 'arr', type: 'float[]', min: 0, max: 1 }];
	const source = { arr: [0.5, 1.5] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one warning');
	assert(errors[0].includes('clamped'), 'error should indicate clamping');
	assertEquals(target.arr[1], 1.0, 'should write clamped array element to target');
});

test('serialize applies default when field absent', () => {
	const schema = [{ key: 'bpm', type: 'int', default: 120 }];
	const source = {};
	const result = serialize(schema, source);
	assertEquals(result.bpm, 120, 'should include default value in result');
});

test('serialize uses source value when present over default', () => {
	const schema = [{ key: 'bpm', type: 'int', default: 120 }];
	const source = { bpm: 90 };
	const result = serialize(schema, source);
	assertEquals(result.bpm, 90, 'should use source value, not default');
});

test('serialize omits extra keys not in schema', () => {
	const schema = [{ key: 'bpm', type: 'int' }];
	const source = { bpm: 120, extra: 'ignored' };
	const result = serialize(schema, source);
	assertEquals(result.extra, undefined, 'should not include extra keys');
	assertEquals(Object.keys(result).length, 1, 'should have only one key');
});

// ─── Failure Criteria Tests ──────────────────────────────────────────────────

test('rejects wrong JS type with correct error message', () => {
	const schema = [{ key: 'bpm', type: 'int' }];
	const source = { bpm: 'fast' };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected int'), 'error message should include expected type');
	assert(errors[0].includes('got string'), 'error message should include actual type');
});

test('prevents all writes when any hard error is present', () => {
	const schema = [
		{ key: 'a', type: 'int' },
		{ key: 'b', type: 'int' },
		{ key: 'c', type: 'int' }
	];
	const source = { a: 1, b: 'bad', c: 3 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assert(errors.length >= 1, 'should have at least one error');
	assertEquals(target.a, undefined, 'should not write any fields to target');
	assertEquals(target.c, undefined, 'should not write any fields to target');
});

test('silently skips length check when exactLength reference is invalid int', () => {
	const schema = [
		{ key: 'beats', type: 'int' },
		{ key: 'offsets', type: 'float[]', exactLength: 'beats' }
	];
	const source = { beats: 'invalid', offsets: [0, 0.5, 0.75] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	// beats has a type error, offsets should also not be checked
	assert(errors.length >= 1, 'should have error for beats field');
	assertEquals(target.offsets, undefined, 'should not write offsets due to beats error');
});

test('reports array element error with correct format', () => {
	const schema = [{ key: 'arr', type: 'int[]', min: 0, max: 10 }];
	const source = { arr: [1, 20, 3] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assert(errors.some(e => e.includes('arr[1]:')), 'error should use format arr[<index>]:');
	assert(errors.length === 1, 'should have one warning');
	assertEquals(target.arr[1], 10, 'should clamp element at index 1');
});

test('rejects string type when wrong type provided', () => {
	const schema = [{ key: 'name', type: 'string' }];
	const source = { name: 123 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected string'), 'error should indicate type mismatch');
});

test('rejects bool type when wrong type provided', () => {
	const schema = [{ key: 'enabled', type: 'bool' }];
	const source = { enabled: 'yes' };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected bool'), 'error should indicate type mismatch');
});

test('accepts valid bool[] array', () => {
	const schema = [{ key: 'flags', type: 'bool[]' }];
	const source = { flags: [true, false, true] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.flags.length, 3, 'should write bool array to target');
});

test('rejects invalid bool[] when element is non-bool', () => {
	const schema = [{ key: 'flags', type: 'bool[]' }];
	const source = { flags: [true, 'false', true] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected bool[]'), 'error should indicate bool array type mismatch');
});

test('accepts valid int[] array', () => {
	const schema = [{ key: 'counts', type: 'int[]' }];
	const source = { counts: [1, 2, 3] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.counts.length, 3, 'should write int array to target');
});

test('rejects int[] when element is float', () => {
	const schema = [{ key: 'counts', type: 'int[]' }];
	const source = { counts: [1, 2.5, 3] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected int[]'), 'error should indicate int array type mismatch');
});

test('accepts valid float[] array', () => {
	const schema = [{ key: 'values', type: 'float[]' }];
	const source = { values: [0.1, 0.5, 0.9] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.values.length, 3, 'should write float array to target');
});

test('rejects float[] when element is non-number', () => {
	const schema = [{ key: 'values', type: 'float[]' }];
	const source = { values: [0.1, 'bad', 0.9] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('expected float[]'), 'error should indicate float array type mismatch');
});

test('rejects minLength violation', () => {
	const schema = [{ key: 'arr', type: 'int[]', minLength: 5 }];
	const source = { arr: [1, 2, 3] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('minLength'), 'error should mention minLength');
});

test('rejects maxLength violation', () => {
	const schema = [{ key: 'arr', type: 'int[]', maxLength: 2 }];
	const source = { arr: [1, 2, 3] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one error');
	assert(errors[0].includes('maxLength'), 'error should mention maxLength');
});

test('clamps int below min', () => {
	const schema = [{ key: 'val', type: 'int', min: 10 }];
	const source = { val: 5 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one warning');
	assertEquals(target.val, 10, 'should clamp to min');
});

test('clamps float above max', () => {
	const schema = [{ key: 'val', type: 'float', max: 0.5 }];
	const source = { val: 0.8 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should have one warning');
	assertEquals(target.val, 0.5, 'should clamp to max');
});

test('optional field not in source does not error', () => {
	const schema = [{ key: 'optional', type: 'int', required: false }];
	const source = {};
	const target = { optional: 999 };
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.optional, 999, 'should not modify target when field absent');
});

test('multiple fields with mixed errors', () => {
	const schema = [
		{ key: 'a', type: 'int', min: 0, max: 10 },
		{ key: 'b', type: 'float' },
		{ key: 'c', type: 'string', required: true }
	];
	const source = { a: 50, b: 'bad', c: 'ok' };
	const target = { initial: 'value' };
	const errors = validateAndApply(schema, source, target);
	assert(errors.length >= 2, 'should have at least two errors');
	assertEquals(target.initial, 'value', 'should not modify target when errors present');
});

test('clamps multiple array elements', () => {
	const schema = [{ key: 'vals', type: 'int[]', min: 0, max: 100 }];
	const source = { vals: [-10, 50, 150, 200] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 3, 'should have three warnings for clamped elements');
	assertEquals(target.vals[0], 0, 'should clamp negative to min');
	assertEquals(target.vals[2], 100, 'should clamp above max');
	assertEquals(target.vals[3], 100, 'should clamp above max');
});

test('serialize with multiple fields and some defaults', () => {
	const schema = [
		{ key: 'name', type: 'string', default: 'unnamed' },
		{ key: 'count', type: 'int', default: 0 },
		{ key: 'active', type: 'bool' }
	];
	const source = { name: 'test', active: true };
	const result = serialize(schema, source);
	assertEquals(result.name, 'test', 'should use source value');
	assertEquals(result.count, 0, 'should use default for missing field');
	assertEquals(result.active, true, 'should use source value');
});

test('serialize returns empty object when all fields absent and no defaults', () => {
	const schema = [{ key: 'optional', type: 'int' }];
	const source = {};
	const result = serialize(schema, source);
	assertEquals(Object.keys(result).length, 0, 'should return empty object');
});

test('handles schema with no fields', () => {
	const schema = [];
	const source = { unused: 123 };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors with empty schema');
	assertEquals(Object.keys(target).length, 0, 'should not modify target');
});

test('handles empty source and target', () => {
	const schema = [{ key: 'optional', type: 'int' }];
	const source = {};
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(Object.keys(target).length, 0, 'target should remain empty');
});

test('error message includes field key', () => {
	const schema = [{ key: 'myField', type: 'int' }];
	const source = { myField: 'bad' };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assert(errors[0].startsWith('myField:'), 'error should be prefixed with field key');
});

test('array element error message includes index', () => {
	const schema = [{ key: 'list', type: 'int[]', max: 10 }];
	const source = { list: [5, 20, 8] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assert(errors[0].includes('[1]'), 'error should include array index in brackets');
});

test('validates NaN as invalid float', () => {
	const schema = [{ key: 'val', type: 'float' }];
	const source = { val: NaN };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should reject NaN as invalid float');
});

test('validates array with NaN element as invalid float[]', () => {
	const schema = [{ key: 'vals', type: 'float[]' }];
	const source = { vals: [0.5, NaN, 0.9] };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 1, 'should reject array with NaN');
});

test('applies multiple valid fields atomically', () => {
	const schema = [
		{ key: 'bpm', type: 'int' },
		{ key: 'name', type: 'string' },
		{ key: 'enabled', type: 'bool' }
	];
	const source = { bpm: 120, name: 'test', enabled: true };
	const target = {};
	const errors = validateAndApply(schema, source, target);
	assertEquals(errors.length, 0, 'should have no errors');
	assertEquals(target.bpm, 120, 'should write bpm');
	assertEquals(target.name, 'test', 'should write name');
	assertEquals(target.enabled, true, 'should write enabled');
});

run();
