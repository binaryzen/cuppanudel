import { test, run, assert, assertEquals, assertNull, _reset } from '../test/runner.js';
import { createPresetStore } from './preset-store.js';

// Mock localStorage for testing
function makeLocalStorageMock() {
	let store = {};
	let throwOnWrite = false;

	return {
		getItem: (k) => (k in store ? store[k] : null),
		setItem: (k, v) => {
			if (throwOnWrite) throw new Error('QuotaExceeded');
			store[k] = String(v);
		},
		removeItem: (k) => delete store[k],
		_reset: () => {
			store = {};
			throwOnWrite = false;
		},
		_setThrowOnWrite: (v) => {
			throwOnWrite = v;
		},
	};
}

// Test: createPresetStore() initialises with 8 null slots when localStorage is empty
test('preset-store: init with empty localStorage', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const presets = store.load();
	assertEquals(presets.length, 8, 'should have exactly 8 slots');
	for (let i = 0; i < 8; i++) {
		assertNull(presets[i], `slot ${i} should be null`);
	}
});

// Test: createPresetStore() loads existing presets from localStorage
test('preset-store: load from localStorage', () => {
	const mock = makeLocalStorageMock();
	const stored = [
		{ name: 'Test', bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' },
		null,
		null,
		null,
		null,
		null,
		null,
		null,
	];
	mock.setItem('cuppanudel.presets.v1', JSON.stringify(stored));

	const store = createPresetStore(mock);
	const presets = store.load();
	assertEquals(presets.length, 8, 'should have 8 slots');
	assertEquals(presets[0].name, 'Test', 'first slot should have name "Test"');
	assertEquals(presets[0].bpm, 120, 'first slot should have bpm 120');
});

// Test: save(0, snapshot) persists to localStorage
test('preset-store: save and persist', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const snapshot = {
		name: 'Rock',
		bpm: 140,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};

	store.save(0, snapshot);
	const presets = store.load();
	assertEquals(presets[0].name, 'Rock', 'slot 0 should have name "Rock"');
	assertEquals(presets[0].bpm, 140, 'slot 0 should have bpm 140');

	// Check localStorage
	const stored = JSON.parse(mock.getItem('cuppanudel.presets.v1'));
	assertEquals(stored[0].name, 'Rock', 'localStorage should persist the snapshot');
});

// Test: load() returns exactly 8 entries at all times
test('preset-store: load returns 8 entries', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const presets = store.load();
	assertEquals(presets.length, 8, 'load() should always return exactly 8 entries');
});

// Test: clear(0) sets slot to null and persists
test('preset-store: clear slot', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const snapshot = {
		name: 'Test',
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};

	store.save(0, snapshot);
	store.clear(0);
	const presets = store.load();
	assertNull(presets[0], 'slot 0 should be null after clear');

	const stored = JSON.parse(mock.getItem('cuppanudel.presets.v1'));
	assertNull(stored[0], 'localStorage should reflect the clear');
});

// Test: replaceAll() overwrites all slots
test('preset-store: replaceAll', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const newPresets = Array(8).fill(null);
	newPresets[0] = {
		name: 'New',
		bpm: 100,
		beatsPerMeasure: 3,
		beatOffsets: [0, 1 / 3, 2 / 3],
		beatVolumes: [1, 1, 1],
		beatAccents: [true, false, false],
		clickProviderRef: 'built-in:default',
	};

	store.replaceAll(newPresets);
	const presets = store.load();
	assertEquals(presets[0].name, 'New', 'slot 0 should be replaced');
	assertEquals(presets[0].bpm, 100, 'bpm should be 100');
});

// Test: save(index) with out-of-bounds index throws RangeError
test('preset-store: save with invalid index throws', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const snapshot = {
		name: 'Test',
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};

	try {
		store.save(-1, snapshot);
		assert(false, 'should have thrown RangeError for index -1');
	} catch (e) {
		assert(e instanceof RangeError, `should throw RangeError, got ${e.constructor.name}`);
		assert(e.message.includes('index out of bounds'), 'error message should mention "index out of bounds"');
	}

	try {
		store.save(8, snapshot);
		assert(false, 'should have thrown RangeError for index 8');
	} catch (e) {
		assert(e instanceof RangeError, 'should throw RangeError for index 8');
	}
});

// Test: exportConfig() returns presets array
test('preset-store: exportConfig', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const snapshot = {
		name: 'Test',
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};
	store.save(0, snapshot);

	const exported = store.exportConfig();
	assert('presets' in exported, 'exported object should have "presets" key');
	assertEquals(exported.presets.length, 8, 'exported presets should have 8 entries');
	assertEquals(exported.presets[0].name, 'Test', 'exported preset should contain saved snapshot');
});

// Test: importConfig() with valid presets array
test('preset-store: importConfig with valid data', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Imported',
		bpm: 150,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};

	const errors = store.importConfig({ presets });
	assertEquals(errors.length, 0, 'importConfig should return no errors for valid data');
	const loaded = store.load();
	assertEquals(loaded[0].name, 'Imported', 'imported preset should be available via load()');
});

// Test: importConfig() with wrong-length presets array
test('preset-store: importConfig with wrong length', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const presets = Array(7).fill(null);

	const errors = store.importConfig({ presets });
	assert(errors.length > 0, 'should return an error for wrong-length array');
	assert(errors[0].includes('8'), 'error should mention the expected length');
});

// Test: importConfig() with missing required field
test('preset-store: importConfig with missing field', () => {
	const mock = makeLocalStorageMock();
	const store = createPresetStore(mock);
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Incomplete',
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
		// missing bpm
	};

	const errors = store.importConfig({ presets });
	assert(errors.length > 0, 'should return an error for missing bpm');
	assert(errors[0].includes('bpm'), 'error should mention the missing field');
});

// Test: storageAvailable getter returns false when localStorage throws
test('preset-store: storageAvailable when unavailable', () => {
	const mock = makeLocalStorageMock();
	mock._setThrowOnWrite(true);
	const store = createPresetStore(mock);
	assertEquals(store.storageAvailable, false, 'storageAvailable should be false when setItem throws');
});

// Test: save() when storageAvailable is false operates in-memory only
test('preset-store: save in-memory when storage unavailable', () => {
	const mock = makeLocalStorageMock();
	mock._setThrowOnWrite(true);
	const store = createPresetStore(mock);

	const snapshot = {
		name: 'InMem',
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};

	// Should not throw
	store.save(0, snapshot);
	const presets = store.load();
	assertEquals(presets[0].name, 'InMem', 'in-memory save should work even when storage unavailable');
});

// Test: malformed localStorage JSON is handled gracefully
test('preset-store: malformed JSON in localStorage', () => {
	const mock = makeLocalStorageMock();
	mock.setItem('cuppanudel.presets.v1', 'not valid json');

	const store = createPresetStore(mock);
	const presets = store.load();
	assertEquals(presets.length, 8, 'should reset to 8 null slots on parse error');
	for (let i = 0; i < 8; i++) {
		assertNull(presets[i], 'all slots should be null after malformed JSON');
	}
});

console.log('Running preset-store tests...');
run();
