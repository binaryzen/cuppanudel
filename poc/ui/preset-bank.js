import { MAX_PRESETS } from '../constants.js';

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
	let armedAction = null; // 'save' | 'recall' | 'delete' | null

	function makeBtn(label, cls) {
		const b = docRef.createElement('button');
		b.textContent = label;
		b.className = cls;
		return b;
	}

	// Action row: M+  MR  M−
	const wrapper = docRef.createElement('div');
	wrapper.className = 'preset-bank';

	const actionsRow = docRef.createElement('div');
	actionsRow.className = 'preset-actions';

	const mPlusBtn   = makeBtn('M+', 'preset-action');
	const mRecallBtn = makeBtn('MR', 'preset-action');
	const mMinusBtn  = makeBtn('M−', 'preset-action'); // M−

	actionsRow.appendChild(mPlusBtn);
	actionsRow.appendChild(mRecallBtn);
	actionsRow.appendChild(mMinusBtn);
	wrapper.appendChild(actionsRow);

	// Slot row: M0 … M7
	const slotsRow = docRef.createElement('div');
	slotsRow.className = 'preset-slots';

	const slotButtons = [];
	for (let i = 0; i < MAX_PRESETS; i++) {
		const btn = makeBtn(`M${i}`, 'preset-slot');
		btn.dataset.index = i;
		slotsRow.appendChild(btn);
		slotButtons.push(btn);
	}
	wrapper.appendChild(slotsRow);
	container.appendChild(wrapper);

	// ── state helpers ────────────────────────────────────────────────────────

	function arm(action) {
		armedAction = (armedAction === action) ? null : action;
		updateActionUI();
	}

	function applyPreset(preset) {
		tc.bpm             = preset.bpm;
		tc.beatsPerMeasure = preset.beatsPerMeasure;
		tc.beatOffsets     = [...preset.beatOffsets];
		tc.beatVolumes     = [...preset.beatVolumes];
		tc.beatAccents     = [...preset.beatAccents];
		tc.clickProviderRef = preset.clickProviderRef;
		if (metronome?.isRunning?.()) metronome.restart();
	}

	function handleSlotClick(index) {
		if (!armedAction) return;
		const action = armedAction;
		armedAction = null;

		if (action === 'save') {
			store.save(index, snapshotFrom(tc));
		} else if (action === 'recall') {
			const preset = store.load()[index];
			if (preset) applyPreset(preset);
		} else if (action === 'delete') {
			store.clear(index);
		}

		updateActionUI();
		render();
	}

	function updateActionUI() {
		mPlusBtn.classList.toggle('armed',   armedAction === 'save');
		mRecallBtn.classList.toggle('armed', armedAction === 'recall');
		mMinusBtn.classList.toggle('armed',  armedAction === 'delete');
		slotButtons.forEach(btn => btn.classList.toggle('awaiting', armedAction !== null));
	}

	function render() {
		const presets = store.load();
		for (let i = 0; i < MAX_PRESETS; i++) {
			slotButtons[i].classList.toggle('has-preset', presets[i] !== null);
		}
	}

	// ── wire events ───────────────────────────────────────────────────────────

	mPlusBtn.addEventListener('click',   () => arm('save'));
	mRecallBtn.addEventListener('click', () => arm('recall'));
	mMinusBtn.addEventListener('click',  () => arm('delete'));
	slotButtons.forEach((btn, i) => btn.addEventListener('click', () => handleSlotClick(i)));

	render();

	return { render };
}

export { createPresetBank, snapshotFrom };
