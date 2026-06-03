// poc/ui/context-menu.test.js

import { test, run, assert, assertEquals, AssertionError, _reset } from '../test/runner.js';
import { createContextMenu } from './context-menu.js';

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

// Mock jsyaml global
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
	innerWidth: 800,
	innerHeight: 600,
};

// Create a minimal DOM mock
const originalDocument = global.document;
let mockDocument;

function setupMockDOM() {
	const elements = [];

	mockDocument = {
		createElement(tag) {
			const el = {
				id: '',
				style: {},
				textContent: '',
				innerHTML: '',
				children: [],
				eventListeners: [],
				addEventListener(event, handler) {
					this.eventListeners.push({ event, handler });
				},
				removeEventListener(event, handler) {
					const idx = this.eventListeners.findIndex((e) => e.event === event && e.handler === handler);
					if (idx !== -1) this.eventListeners.splice(idx, 1);
				},
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
				contains(node) {
					return this === node || this.children.some((child) => child.contains?.(node));
				},
				getBoundingClientRect() {
					return { right: 0, bottom: 0, width: 100, height: 100 };
				},
				get onclick() {
					return this._onclick;
				},
				set onclick(fn) {
					this._onclick = fn;
				},
				get onmouseenter() {
					return this._onmouseenter;
				},
				set onmouseenter(fn) {
					this._onmouseenter = fn;
				},
				get onmouseleave() {
					return this._onmouseleave;
				},
				set onmouseleave(fn) {
					this._onmouseleave = fn;
				},
			};
			elements.push(el);
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
		eventListeners: [],
		addEventListener(event, handler) {
			this.eventListeners.push({ event, handler });
		},
		removeEventListener(event, handler) {
			const idx = this.eventListeners.findIndex((e) => e.event === event && e.handler === handler);
			if (idx !== -1) this.eventListeners.splice(idx, 1);
		},
	};

	global.document = mockDocument;
	global.navigator = {
		clipboard: {
			readText: async () => {
				throw new Error('NotAllowedError');
			},
			writeText: async (text) => {
				return Promise.resolve();
			},
		},
	};
}

function restoreMockDOM() {
	global.document = originalDocument;
}

// Test: createContextMenu returns a dispose function
test('createContextMenu returns object with dispose function', () => {
	setupMockDOM();
	const target = mockDocument.createElement('div');
	const component = createMockComponent({ bpm: 120 });
	const openModal = () => {};

	const menu = createContextMenu(target, component, openModal);
	restoreMockDOM();

	assert(typeof menu.dispose === 'function', 'dispose should be a function');
});

// Test: dispose removes event listeners
test('dispose removes event listeners from target', () => {
	setupMockDOM();
	const target = mockDocument.createElement('div');
	const component = createMockComponent({ bpm: 120 });
	const openModal = () => {};

	const menu = createContextMenu(target, component, openModal);
	const initialListenerCount = target.eventListeners.length;

	menu.dispose();
	const finalListenerCount = target.eventListeners.length;

	assertEquals(finalListenerCount, 0, 'all event listeners should be removed after dispose');
	restoreMockDOM();
});

// Test: dispose can be called multiple times safely
test('dispose can be called multiple times without error', () => {
	setupMockDOM();
	const target = mockDocument.createElement('div');
	const component = createMockComponent({ bpm: 120 });
	const openModal = () => {};

	const menu = createContextMenu(target, component, openModal);
	menu.dispose();
	menu.dispose(); // Should not throw

	restoreMockDOM();
});

console.log('Running context-menu tests...');
run().then(({ passed, failed }) => {
	process.exit(failed > 0 ? 1 : 0);
});
