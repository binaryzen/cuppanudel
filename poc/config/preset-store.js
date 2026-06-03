import { MAX_PRESETS } from '../constants.js';
import { validateAndApply } from './property-mapper.js';

const STORAGE_KEY = 'cuppanudel.presets.v1';

// Schema for validating individual preset entries
const PRESET_SCHEMA = [
	{ key: 'name', type: 'string', required: false, default: '' },
	{ key: 'bpm', type: 'int', required: true, min: 20, max: 300 },
	{ key: 'beatsPerMeasure', type: 'int', required: true, min: 1, max: 13 },
	{ key: 'beatOffsets', type: 'float[]', required: true },
	{ key: 'beatVolumes', type: 'float[]', required: true },
	{ key: 'beatAccents', type: 'bool[]', required: true },
	{ key: 'clickProviderRef', type: 'string', required: true },
];

// Schema for validating the full presets import object
const PRESETS_SCHEMA = [
	{ key: 'presets', type: 'string[]', required: true }, // will validate this differently
];

function createPresetStore(localStorageRef) {
	let inMemoryPresets = Array(MAX_PRESETS).fill(null);
	let storageAvailable = false;

	// Test if localStorage is available
	try {
		const testKey = '__cuppanudel_test__';
		localStorageRef.setItem(testKey, 'test');
		localStorageRef.removeItem(testKey);
		storageAvailable = true;
	} catch (e) {
		// localStorage unavailable (e.g., private browsing, quota exceeded)
		storageAvailable = false;
	}

	// Initialize: load from localStorage or create 8 null slots
	if (storageAvailable) {
		try {
			const stored = localStorageRef.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length === MAX_PRESETS) {
					inMemoryPresets = parsed;
				} else {
					console.warn('PresetStore: stored array is malformed or wrong length, resetting to 8 null slots');
					inMemoryPresets = Array(MAX_PRESETS).fill(null);
				}
			} else {
				inMemoryPresets = Array(MAX_PRESETS).fill(null);
			}
		} catch (e) {
			console.warn('PresetStore: failed to parse localStorage JSON, resetting to 8 null slots', e);
			inMemoryPresets = Array(MAX_PRESETS).fill(null);
		}
	}

	function load() {
		return [...inMemoryPresets];
	}

	function save(index, snapshot) {
		if (index < 0 || index >= MAX_PRESETS) {
			throw new RangeError(`PresetStore: index out of bounds: ${index}`);
		}
		inMemoryPresets[index] = snapshot;
		if (storageAvailable) {
			try {
				localStorageRef.setItem(STORAGE_KEY, JSON.stringify(inMemoryPresets));
			} catch (e) {
				// If storage becomes unavailable during save, silently continue with in-memory
				storageAvailable = false;
			}
		}
	}

	function clear(index) {
		if (index < 0 || index >= MAX_PRESETS) {
			throw new RangeError(`PresetStore: index out of bounds: ${index}`);
		}
		inMemoryPresets[index] = null;
		if (storageAvailable) {
			try {
				localStorageRef.setItem(STORAGE_KEY, JSON.stringify(inMemoryPresets));
			} catch (e) {
				storageAvailable = false;
			}
		}
	}

	function replaceAll(presetsArray) {
		if (!Array.isArray(presetsArray) || presetsArray.length !== MAX_PRESETS) {
			throw new Error(`PresetStore: presetsArray must be an array of exactly ${MAX_PRESETS} entries`);
		}
		inMemoryPresets = [...presetsArray];
		if (storageAvailable) {
			try {
				localStorageRef.setItem(STORAGE_KEY, JSON.stringify(inMemoryPresets));
			} catch (e) {
				storageAvailable = false;
			}
		}
	}

	function exportConfig() {
		return { presets: load() };
	}

	function importConfig(obj) {
		if (!obj || typeof obj !== 'object') {
			return ['importConfig: input must be an object'];
		}

		const presetsArray = obj.presets;
		if (!Array.isArray(presetsArray)) {
			return ['importConfig: presets field must be an array'];
		}

		if (presetsArray.length !== MAX_PRESETS) {
			return [`importConfig: presets array must have exactly ${MAX_PRESETS} entries, got ${presetsArray.length}`];
		}

		// Validate each non-null preset entry
		const errors = [];
		for (let i = 0; i < presetsArray.length; i++) {
			const entry = presetsArray[i];
			if (entry === null) {
				continue; // empty slot is valid
			}
			if (typeof entry !== 'object') {
				errors.push(`presets[${i}]: expected object or null, got ${typeof entry}`);
				continue;
			}
			// Validate the preset object against the schema
			const target = {};
			const entryErrors = validateAndApply(PRESET_SCHEMA, entry, target);
			if (entryErrors.length > 0) {
				errors.push(...entryErrors.map(e => `presets[${i}]: ${e}`));
			}
		}

		if (errors.length > 0) {
			return errors;
		}

		// All entries valid: apply
		replaceAll(presetsArray);
		return [];
	}

	return {
		load,
		save,
		clear,
		replaceAll,
		exportConfig,
		importConfig,
		get storageAvailable() {
			return storageAvailable;
		},
	};
}

export { createPresetStore };
