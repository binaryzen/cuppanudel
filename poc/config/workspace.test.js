// poc/config/workspace.test.js

import { test, run, assert, assertEquals, AssertionError, _reset } from '../test/runner.js';
import {
	exportWorkspace,
	downloadWorkspace,
	copyWorkspace,
	importWorkspace,
	registerDropTarget,
} from './workspace.js';

// Mock jsyaml with minimal capability
const jsyamlStub = {
	dump(obj) {
		// Simple JSON dump with custom handling for version field
		return JSON.stringify(obj, null, 2);
	},
	load(text, opts) {
		// CORE_SCHEMA mode: just parse as JSON (YAML is a superset)
		return JSON.parse(text);
	},
	CORE_SCHEMA: {}, // Marker for stub
};

// Mock component
function createMockComponent(initialConfig) {
	let config = { ...initialConfig };
	return {
		exportConfig() {
			return { ...config };
		},
		importConfig(slice) {
			// Simple validation: just copy non-undefined values
			Object.assign(config, slice);
			return [];
		},
	};
}

// Setup minimal DOM mocking
const originalDocument = global.document;

function setupMockDOM() {
	const elements = [];

	global.document = {
		createElement(tag) {
			const el = {
				style: {},
				textContent: '',
				innerHTML: '',
				children: [],
				appendChild(child) {
					this.children.push(child);
				},
				removeChild(child) {
					const idx = this.children.indexOf(child);
					if (idx !== -1) this.children.splice(idx, 1);
				},
				remove() {
					const idx = elements.indexOf(this);
					if (idx !== -1) elements.splice(idx, 1);
				},
				addEventListener() {},
				removeEventListener() {},
			};
			elements.push(el);
			return el;
		},
		body: {
			appendChild() {},
			removeChild() {},
		},
		addEventListener() {},
		removeEventListener() {},
	};

	// Mock navigator clipboard via Object.defineProperty
	if (!global.navigator.clipboard) {
		Object.defineProperty(global.navigator, 'clipboard', {
			value: {
				writeText: (text) => Promise.resolve(),
			},
			configurable: true,
		});
	}
}

function restoreMockDOM() {
	global.document = originalDocument;
	delete global.document;
}

// Test: exportWorkspace includes all sections
test('exportWorkspace includes version, global, metronome, sampleSets, presets', () => {
	const components = {
		global: createMockComponent({ visualDelayMs: 20 }),
		metronome: createMockComponent({ bpm: 120 }),
		sampleSets: {
			exportConfig() {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
		},
	};

	const yaml = exportWorkspace(components, jsyamlStub);
	const obj = JSON.parse(yaml);

	assertEquals(obj.version, 1, 'version should be 1');
	assert(obj.global !== undefined, 'global section should exist');
	assert(obj.metronome !== undefined, 'metronome section should exist');
	assert(obj.sampleSets !== undefined, 'sampleSets section should exist');
	assert(obj.presets !== undefined, 'presets section should exist');
});

// Test: exportWorkspace includes empty sampleSets
test('exportWorkspace includes empty sampleSets: []', () => {
	const components = {
		global: createMockComponent({}),
		metronome: createMockComponent({}),
		sampleSets: {
			exportConfig() {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
		},
	};

	const yaml = exportWorkspace(components, jsyamlStub);
	const obj = JSON.parse(yaml);

	assert(Array.isArray(obj.sampleSets), 'sampleSets should be an array');
	assertEquals(obj.sampleSets.length, 0, 'sampleSets should be empty');
});

// Test: importWorkspace rejects oversize file
test('importWorkspace rejects file > 1MB with error toast', async () => {
	setupMockDOM();
	const components = {
		global: createMockComponent({}),
		metronome: createMockComponent({}),
		sampleSets: {
			exportConfig() {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
		},
	};

	const result = await importWorkspace(
		'version: 1\n',
		'test.yaml',
		1_048_577, // Over 1 MB
		components,
		jsyamlStub
	);

	restoreMockDOM();
	assertEquals(result, false, 'should return false on oversized file');
});

// Test: importWorkspace skips confirmation if no difference
test('importWorkspace applies without confirmation if values unchanged', async () => {
	setupMockDOM();
	const components = {
		global: createMockComponent({ visualDelayMs: 0 }),
		metronome: createMockComponent({ bpm: 120 }),
		sampleSets: {
			exportConfig() {
				return [];
			},
			importConfig(slice) {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
			importConfig(slice) {
				return [];
			},
		},
	};

	// Import same values that are already in the component
	const text = JSON.stringify({ metronome: { bpm: 120 } });
	const result = await importWorkspace(text, 'test.yaml', text.length, components, jsyamlStub);

	restoreMockDOM();
	assertEquals(result, true, 'should import and apply without confirmation');
	assertEquals(components.metronome.exportConfig().bpm, 120, 'bpm should remain same');
});

// Test: importWorkspace accepts .json files
test('importWorkspace accepts .json files', async () => {
	setupMockDOM();
	const components = {
		global: createMockComponent({ visualDelayMs: 0 }),
		metronome: createMockComponent({ bpm: 120 }),
		sampleSets: {
			exportConfig() {
				return [];
			},
			importConfig(slice) {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
			importConfig(slice) {
				return [];
			},
		},
	};

	// Import same values to avoid confirmation dialog
	const text = JSON.stringify({ metronome: { bpm: 120 } });
	const result = await importWorkspace(text, 'test.json', text.length, components, jsyamlStub);

	restoreMockDOM();
	assertEquals(result, true, 'should parse .json file');
});

// Test: importWorkspace applies sections in correct order
test('importWorkspace applies sections in order: sampleSets, global, metronome, presets', async () => {
	setupMockDOM();
	const callOrder = [];

	const mockComponent = (name) => ({
		exportConfig() {
			return {};
		},
		importConfig(slice) {
			callOrder.push(name);
			return [];
		},
	});

	const components = {
		global: mockComponent('global'),
		metronome: mockComponent('metronome'),
		sampleSets: mockComponent('sampleSets'),
		presets: mockComponent('presets'),
	};

	const text = JSON.stringify({
		sampleSets: [],
		global: {},
		metronome: {},
		presets: [],
	});

	await importWorkspace(text, 'test.yaml', text.length, components, jsyamlStub);

	restoreMockDOM();
	// Should be called in this order
	assert(
		callOrder[0] === 'sampleSets' && callOrder[1] === 'global' && callOrder[2] === 'metronome' && callOrder[3] === 'presets',
		`Expected order [sampleSets, global, metronome, presets], got [${callOrder.join(', ')}]`
	);
});

// Test: importWorkspace skips missing sections
test('importWorkspace skips missing sections', async () => {
	setupMockDOM();
	const callOrder = [];

	const mockComponent = (name) => ({
		exportConfig() {
			return {};
		},
		importConfig(slice) {
			callOrder.push(name);
			return [];
		},
	});

	const components = {
		global: mockComponent('global'),
		metronome: mockComponent('metronome'),
		sampleSets: mockComponent('sampleSets'),
		presets: mockComponent('presets'),
	};

	// Only metronome section in import
	const text = JSON.stringify({ metronome: {} });

	await importWorkspace(text, 'test.yaml', text.length, components, jsyamlStub);

	restoreMockDOM();
	// Only metronome should be called
	assertEquals(callOrder.length, 1, 'only one section should be imported');
	assertEquals(callOrder[0], 'metronome', 'only metronome should be imported');
});

// Test: importWorkspace returns false on validation error
test('importWorkspace returns false when component.importConfig returns errors', async () => {
	setupMockDOM();
	const components = {
		global: createMockComponent({}),
		metronome: {
			exportConfig() {
				return { bpm: 120 };
			},
			importConfig(slice) {
				return ['bpm: invalid value'];
			},
		},
		sampleSets: {
			exportConfig() {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
		},
	};

	const text = JSON.stringify({ metronome: { bpm: 'invalid' } });
	const result = await importWorkspace(text, 'test.yaml', text.length, components, jsyamlStub);

	restoreMockDOM();
	assertEquals(result, false, 'should return false on validation error');
});

// Test: copyWorkspace returns a Promise
test('copyWorkspace returns a Promise', () => {
	setupMockDOM();
	const components = {
		global: createMockComponent({}),
		metronome: createMockComponent({}),
		sampleSets: {
			exportConfig() {
				return [];
			},
		},
		presets: {
			exportConfig() {
				return [];
			},
		},
	};

	const promise = copyWorkspace(components, jsyamlStub);
	restoreMockDOM();
	assert(promise instanceof Promise, 'copyWorkspace should return a Promise');
});

console.log('Running workspace tests...');
run().then(({ passed, failed }) => {
	process.exit(failed > 0 ? 1 : 0);
});
