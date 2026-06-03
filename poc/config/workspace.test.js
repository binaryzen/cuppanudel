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
		return JSON.stringify(obj, null, 2);
	},
	load(text, opts) {
		return JSON.parse(text);
	},
	CORE_SCHEMA: {},
};

// Mock component
function createMockComponent(initialConfig) {
	let config = { ...initialConfig };
	return {
		exportConfig() {
			return { ...config };
		},
		importConfig(slice) {
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
		1_048_577,
		components,
		jsyamlStub
	);

	restoreMockDOM();
	assertEquals(result, false, 'should return false on oversized file');
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
