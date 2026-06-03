import { MAX_PRESETS } from '../constants.js';

// Internal helper: creates a snapshot from a TempoContext
function snapshotFrom(tc) {
	return {
		name: '',
		bpm: tc.bpm,
		beatsPerMeasure: tc.beatsPerMeasure,
		beatOffsets: [...tc.beatOffsets],
		beatVolumes: [...tc.beatVolumes],
		beatAccents: [...tc.beatAccents],
		clickProviderRef: tc.clickProviderRef,
	};
}

function createPresetBank(container, store, tc, metronome, docRef = document) {
	let saveMode = false;
	const slotButtons = [];
	let saveBtnClickHandler = null;

	// Create 8 slot buttons
	for (let i = 0; i < MAX_PRESETS; i++) {
		const button = docRef.createElement('button');
		button.className = 'preset-slot';
		button.dataset.index = i;
		button.textContent = '—';
		container.appendChild(button);
		slotButtons.push(button);
	}

	function updateSlotUI(index, preset) {
		const button = slotButtons[index];
		if (preset === null) {
			button.textContent = '—';
			if (button.classList) {
				button.classList.remove('preset-filled', 'preset-save-mode');
			}
			button.title = '';
		} else {
			const displayName = preset.name || `Preset ${index + 1}`;
			button.textContent = displayName.substring(0, 10); // truncate for display
			if (button.classList) {
				button.classList.add('preset-filled');
				if (saveMode) {
					button.classList.add('preset-save-mode');
				} else {
					button.classList.remove('preset-save-mode');
				}
			}
			button.title = preset.name || `Preset ${index + 1}`;
		}
	}

	function render() {
		const presets = store.load();
		for (let i = 0; i < MAX_PRESETS; i++) {
			updateSlotUI(i, presets[i]);
		}
	}

	function applyPreset(preset, targetTc, targetMetronome) {
		// Write all tc fields
		targetTc.bpm = preset.bpm;
		targetTc.beatsPerMeasure = preset.beatsPerMeasure;
		targetTc.beatOffsets = [...preset.beatOffsets];
		targetTc.beatVolumes = [...preset.beatVolumes];
		targetTc.beatAccents = [...preset.beatAccents];
		targetTc.clickProviderRef = preset.clickProviderRef;

		// If metronome is running and not null, restart it
		if (targetMetronome !== null && targetMetronome.isRunning && targetMetronome.isRunning()) {
			targetMetronome.restart();
		}
	}

	function handleSlotClick(index) {
		if (saveMode) {
			// Save mode: save current tc to this slot
			const snapshot = snapshotFrom(tc);
			store.save(index, snapshot);
			saveMode = false;
			render();
			updateSaveButton();
		} else {
			// Normal mode: apply preset from this slot if filled
			const presets = store.load();
			const preset = presets[index];
			if (preset !== null) {
				applyPreset(preset, tc, metronome);
			}
			// Empty slots are no-op in normal mode
		}
	}

	function updateSaveButton() {
		// The Save button (found by ID) should be updated
		const saveBtn = docRef.getElementById('preset-save-btn');
		if (saveBtn) {
			if (saveMode) {
				if (saveBtn.classList) {
					saveBtn.classList.add('preset-save-active');
				}
			} else {
				if (saveBtn.classList) {
					saveBtn.classList.remove('preset-save-active');
				}
			}
			if (!store.storageAvailable) {
				saveBtn.disabled = true;
			}
		}
	}

	function toggleSaveMode() {
		saveMode = !saveMode;
		render();
		updateSaveButton();
	}

	// Attach event listeners to slot buttons
	const slotClickHandlers = new Map();
	for (let i = 0; i < MAX_PRESETS; i++) {
		const handler = () => handleSlotClick(i);
		slotClickHandlers.set(i, handler);
		slotButtons[i].addEventListener('click', handler);
	}

	// Attach Save button listener
	const saveBtn = docRef.getElementById('preset-save-btn');
	if (saveBtn) {
		saveBtnClickHandler = toggleSaveMode;
		saveBtn.addEventListener('click', toggleSaveMode);
		updateSaveButton();
	}

	// Initial render
	render();

	return {
		render,
		dispose: () => {
			for (let i = 0; i < MAX_PRESETS; i++) {
				const handler = slotClickHandlers.get(i);
				if (handler) {
					slotButtons[i].removeEventListener('click', handler);
				}
			}
			if (saveBtn && saveBtnClickHandler) {
				saveBtn.removeEventListener('click', saveBtnClickHandler);
			}
		},
	};
}

export { createPresetBank, snapshotFrom };
