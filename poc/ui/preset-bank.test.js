import { test, run, assert, assertEquals, assertNull, _reset } from '../test/runner.js';
import { createPresetBank, snapshotFrom } from './preset-bank.js';

// Mock DOM elements for testing
class MockElement {
	constructor(tagName = 'div') {
		this.tagName = tagName;
		this.className = '';
		this.classList = {
			_classes: new Set(),
			add: function(cls) { this._classes.add(cls); },
			remove: function(cls) { this._classes.delete(cls); },
			contains: function(cls) { return this._classes.has(cls); },
		};
		this.textContent = '';
		this.title = '';
		this.disabled = false;
		this.dataset = {};
		this.id = '';
		this._children = [];
		this._listeners = {};
	}

	appendChild(child) {
		this._children.push(child);
		return child;
	}

	querySelectorAll(selector) {
		if (selector === 'button') {
			return this._children.filter(c => c.tagName === 'button');
		}
		return [];
	}

	addEventListener(event, handler) {
		if (!this._listeners[event]) {
			this._listeners[event] = [];
		}
		this._listeners[event].push(handler);
	}

	removeEventListener(event, handler) {
		if (this._listeners[event]) {
			this._listeners[event] = this._listeners[event].filter(h => h !== handler);
		}
	}

	click() {
		if (this._listeners['click']) {
			for (const handler of this._listeners['click']) {
				handler();
			}
		}
	}
}

// Mock document for testing
function createMockDocument() {
	const elements = new Map();

	return {
		createElement: (tagName) => {
			const el = new MockElement(tagName);
			return el;
		},
		getElementById: (id) => {
			if (!elements.has(id)) {
				const el = new MockElement('button');
				el.id = id;
				elements.set(id, el);
			}
			return elements.get(id);
		},
		_clearElements: () => {
			elements.clear();
		},
	};
}

// Mock PresetStore
function makePresetStoreMock() {
	let presets = Array(8).fill(null);
	return {
		load: () => [...presets],
		save: (index, snapshot) => {
			presets[index] = snapshot;
		},
		clear: (index) => {
			presets[index] = null;
		},
		replaceAll: (arr) => {
			presets = [...arr];
		},
		exportConfig: () => ({ presets: [...presets] }),
		importConfig: () => [],
		get storageAvailable() {
			return true;
		},
		_setPresets: (arr) => {
			presets = [...arr];
		},
	};
}

// Mock Metronome
function makeMetronomeMock() {
	let running = false;
	return {
		isRunning: () => running,
		start: () => {
			running = true;
		},
		stop: () => {
			running = false;
		},
		restart: () => {
			running = true;
		},
		_setRunning: (r) => {
			running = r;
		},
	};
}

// Test: createPresetBank renders 8 slot buttons
test('preset-bank: renders 8 buttons', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	createPresetBank(container, store, tc, metro, mockDoc);

	const buttons = container.querySelectorAll('button');
	assertEquals(buttons.length, 8, 'should render exactly 8 buttons');
});

// Test: empty slot shows '—'
test('preset-bank: empty slot shows dash', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	createPresetBank(container, store, tc, metro, mockDoc);

	const buttons = container.querySelectorAll('button');
	assertEquals(buttons[0].textContent, '—', 'empty slot should show "—"');
});

// Test: filled slot shows preset name
test('preset-bank: filled slot shows name', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Rock 4/4',
		bpm: 140,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};
	store._setPresets(presets);

	const controller = createPresetBank(container, store, tc, metro, mockDoc);
	controller.render();

	const buttons = container.querySelectorAll('button');
	assertEquals(buttons[0].textContent, 'Rock 4/4', 'filled slot should show preset name');
});

// Test: clicking Save button enters save mode
test('preset-bank: Save button toggles save mode', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const saveBtn = mockDoc.getElementById('preset-save-btn');

	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	createPresetBank(container, store, tc, metro, mockDoc);

	// Click Save button
	saveBtn.click();

	// After clicking, the Save button should have the active class
	assert(saveBtn.classList.contains('preset-save-active'), 'Save button should have preset-save-active class');

	// Click again to exit save mode
	saveBtn.click();
	assert(!saveBtn.classList.contains('preset-save-active'), 'Save button should not have preset-save-active class after second click');
});

// Test: in save mode, clicking a slot saves current tc
test('preset-bank: Save mode saves snapshot', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const saveBtn = mockDoc.getElementById('preset-save-btn');

	const store = makePresetStoreMock();
	const tc = { bpm: 140, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	const controller = createPresetBank(container, store, tc, metro, mockDoc);

	// Enter save mode
	saveBtn.click();

	// Click slot 3
	const buttons = container.querySelectorAll('button');
	buttons[3].click();

	// Verify the preset was saved
	const presets = store.load();
	assertEquals(presets[3].bpm, 140, 'saved preset should have tc.bpm');
	assertEquals(presets[3].beatsPerMeasure, 4, 'saved preset should have tc.beatsPerMeasure');
});

// Test: snapshotFrom includes clickProviderRef
test('preset-bank: snapshotFrom includes clickProviderRef', () => {
	const tc = {
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'custom:provider',
	};

	const snapshot = snapshotFrom(tc);
	assert('clickProviderRef' in snapshot, 'snapshot must include clickProviderRef');
	assertEquals(snapshot.clickProviderRef, 'custom:provider', 'snapshot should have correct clickProviderRef');
});

// Test: in normal mode, clicking empty slot is no-op
test('preset-bank: clicking empty slot is no-op', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	createPresetBank(container, store, tc, metro, mockDoc);

	// Verify slot 0 is empty
	const presets = store.load();
	assertNull(presets[0], 'slot 0 should be null');

	// Click slot 0 (empty)
	const buttons = container.querySelectorAll('button');
	const originalBpm = tc.bpm;
	buttons[0].click();

	// tc should not change
	assertEquals(tc.bpm, originalBpm, 'clicking empty slot should not change tc');
});

// Test: clicking filled slot applies preset and restarts metronome if running
test('preset-bank: recall restarts metronome if running', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	// Pre-fill slot 0
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Preset',
		bpm: 180,
		beatsPerMeasure: 3,
		beatOffsets: [0, 1 / 3, 2 / 3],
		beatVolumes: [1, 1, 1],
		beatAccents: [true, false, false],
		clickProviderRef: 'built-in:default',
	};
	store._setPresets(presets);

	// Start metronome
	metro.start();
	assert(metro.isRunning(), 'metronome should be running');

	const controller = createPresetBank(container, store, tc, metro, mockDoc);

	// Click slot 0 to recall
	const buttons = container.querySelectorAll('button');
	buttons[0].click();

	// Verify tc was updated
	assertEquals(tc.bpm, 180, 'tc.bpm should be updated from preset');
	assertEquals(tc.beatsPerMeasure, 3, 'tc.beatsPerMeasure should be updated from preset');

	// Verify metronome was restarted (restart sets running to true)
	assert(metro.isRunning(), 'metronome should still be running after recall');
});

// Test: recall when metronome is stopped does not restart it
test('preset-bank: recall does not restart metronome when stopped', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	// Pre-fill slot 0
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Preset',
		bpm: 180,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};
	store._setPresets(presets);

	// Metronome is stopped (initial state)
	assert(!metro.isRunning(), 'metronome should be stopped');

	const controller = createPresetBank(container, store, tc, metro, mockDoc);

	// Click slot 0 to recall
	const buttons = container.querySelectorAll('button');
	buttons[0].click();

	// Verify metronome is still stopped
	assert(!metro.isRunning(), 'metronome should remain stopped after recall');
});

// Test: if metronome is null, applyPreset does not throw
test('preset-bank: applyPreset with null metronome', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };

	// Pre-fill slot 0
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Preset',
		bpm: 180,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};
	store._setPresets(presets);

	// Create preset bank with null metronome
	const controller = createPresetBank(container, store, tc, null, mockDoc);

	// Click slot 0 to recall (metronome is null)
	const buttons = container.querySelectorAll('button');
	try {
		buttons[0].click();
		assert(true, 'should not throw when metronome is null');
		assertEquals(tc.bpm, 180, 'tc should still be updated even when metronome is null');
	} catch (e) {
		assert(false, `applyPreset should not throw with null metronome: ${e.message}`);
	}
});

// Test: render() updates slot labels without recreating buttons
test('preset-bank: render updates labels without recreating buttons', () => {
	const mockDoc = createMockDocument();
	const container = mockDoc.createElement('div');
	const store = makePresetStoreMock();
	const tc = { bpm: 120, beatsPerMeasure: 4, beatOffsets: [0, 0.25, 0.5, 0.75], beatVolumes: [1, 1, 1, 1], beatAccents: [true, false, false, false], clickProviderRef: 'built-in:default' };
	const metro = makeMetronomeMock();

	const controller = createPresetBank(container, store, tc, metro, mockDoc);

	const buttons1 = container.querySelectorAll('button');
	const firstButtonRef = buttons1[0];

	// Update store and render
	const presets = Array(8).fill(null);
	presets[0] = {
		name: 'Updated',
		bpm: 120,
		beatsPerMeasure: 4,
		beatOffsets: [0, 0.25, 0.5, 0.75],
		beatVolumes: [1, 1, 1, 1],
		beatAccents: [true, false, false, false],
		clickProviderRef: 'built-in:default',
	};
	store._setPresets(presets);
	controller.render();

	const buttons2 = container.querySelectorAll('button');
	assert(buttons2[0] === firstButtonRef, 'render should not recreate buttons');
	assertEquals(buttons2[0].textContent, 'Updated', 'render should update label text');
});

console.log('Running preset-bank tests...');
run();
