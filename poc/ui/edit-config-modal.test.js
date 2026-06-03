// poc/ui/edit-config-modal.test.js

import { test, run, assert, assertEquals, AssertionError, _reset } from '../test/runner.js';
import { createEditConfigModal } from './edit-config-modal.js';

// Mock component
function createMockComponent(initialConfig) {
	let config = { ...initialConfig };
	return {
		exportConfig() {
			return { ...config };
		},
		importConfig(slice) {
			if (slice.bpm === 'invalid') {
				return ['bpm: invalid value'];
			}
			Object.assign(config, slice);
			return [];
		},
	};
}

// Mock jsyaml global (since we can't load the UMD in Node.js)
global.window = {
	jsyaml: {
		dump(obj) {
			return JSON.stringify(obj, null, 2);
		},
		load(text, opts) {
			return JSON.parse(text);
		},
		CORE_SCHEMA: {},
	},
};

// Create a minimal DOM mock for tests
const originalDocument = global.document;
let mockDocument;

function setupMockDOM() {
	const elements = new Map();
	let nextId = 0;

	mockDocument = {
		createElement(tag) {
			const el = {
				id: '',
				style: {},
				textContent: '',
				innerHTML: '',
				children: [],
				addEventListener: () => {},
				removeEventListener: () => {},
				appendChild(child) {
					this.children.push(child);
				},
				click() {
					this._onclick?.();
				},
				get onclick() {
					return this._onclick;
				},
				set onclick(fn) {
					this._onclick = fn;
				},
			};
			return el;
		},
		body: {
			appendChild(el) {
				// Store element
			},
			removeChild(el) {
				// Remove element
			},
		},
		addEventListener: () => {},
		removeEventListener: () => {},
	};

	global.document = mockDocument;
}

function restoreMockDOM() {
	global.document = originalDocument;
}

// Test: createEditConfigModal returns a controller
test('createEditConfigModal returns an object with open, close, isOpen', () => {
	setupMockDOM();
	const modal = createEditConfigModal();
	restoreMockDOM();

	assert(typeof modal.open === 'function', 'open should be a function');
	assert(typeof modal.close === 'function', 'close should be a function');
	assert(typeof modal.isOpen === 'function', 'isOpen should be a function');
});

// Test: isOpen returns false initially
test('isOpen returns false before open() is called', () => {
	setupMockDOM();
	const modal = createEditConfigModal();
	restoreMockDOM();

	assertEquals(modal.isOpen(), false, 'isOpen should return false initially');
});

// Test: isOpen returns true after open()
test('isOpen returns true after open() is called', () => {
	setupMockDOM();
	const modal = createEditConfigModal();
	const component = createMockComponent({ bpm: 120 });
	modal.open(component);
	restoreMockDOM();

	assertEquals(modal.isOpen(), true, 'isOpen should return true after open');
});

// Test: isOpen returns false after close()
test('isOpen returns false after close() is called', () => {
	setupMockDOM();
	const modal = createEditConfigModal();
	const component = createMockComponent({ bpm: 120 });
	modal.open(component);
	modal.close();
	restoreMockDOM();

	assertEquals(modal.isOpen(), false, 'isOpen should return false after close');
});

// Test: close() without error
test('Modal can be opened and closed without errors', () => {
	setupMockDOM();
	const modal = createEditConfigModal();
	const component = createMockComponent({ bpm: 120 });
	modal.open(component);
	assert(modal.isOpen(), 'modal should be open');
	modal.close();
	assert(!modal.isOpen(), 'modal should be closed');
	restoreMockDOM();
});

console.log('Running edit-config-modal tests...');
run().then(({ passed, failed }) => {
	process.exit(failed > 0 ? 1 : 0);
});
