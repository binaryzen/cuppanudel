import { createInputProvider } from './audio/input-provider.js';
import { createAnalyzer } from './audio/analyzer.js';
import { createRecorder } from './audio/recorder.js';
import { createMediaPool } from './pool/media-pool.js';
import { createWaveformVisualizer } from './visualizers/waveform.js';
import { createPeakMeter } from './visualizers/peak-meter.js';
import { generateThumbnail } from './visualizers/thumbnail.js';
import { createFrequencyAnalyzer } from './audio/frequency-analyzer.js';
import { createTunerDisplay } from './visualizers/tuner-display.js';
import { createTempoContext, setBeatsPerMeasure } from './timing/tempo-context.js';
import { makeObservable } from './state/observable.js';
import { TC_KNOB_BINDINGS } from './state/tc-bindings.js';
import { createMetronome } from './timing/metronome.js';
import { createMetroDisplay } from './visualizers/metro-display.js';
import { createKnob } from './ui/knob.js';

// ── Lane-wire imports: new modules ────────────────────────────────────────
import { register as registerSampleProvider, get as getSampleProvider, list as listSampleProviders } from './config/sample-provider-registry.js';
import { builtinClickProvider } from './audio/builtin-click-provider.js';
import { contentService } from './config/content-service.js';
import { localFileProvider } from './audio/local-file-provider.js';
import { createRecordingsProvider } from './audio/recordings-provider.js';
import { exportWorkspace, downloadWorkspace, copyWorkspace, importWorkspace, registerDropTarget } from './config/workspace.js';
import { createContextMenu } from './ui/context-menu.js';
import { createEditConfigModal } from './ui/edit-config-modal.js';
import { createMediaPoolSampleProvider } from './audio/media-pool-sample-provider.js';
import { createSampleSetPicker } from './ui/sample-set-picker.js';
import { createPresetStore } from './config/preset-store.js';
import { createPresetBank } from './ui/preset-bank.js';
import { createAlignmentMonitor } from './visualizers/alignment-monitor.js';
import { VERSION } from './version.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const startBtn        = document.getElementById('start-btn');
const waveformCanvas  = document.getElementById('waveform');
const peakMeterCanvas = document.getElementById('peak-meter');
const tunerCanvas     = document.getElementById('tuner');
const metroBtn        = document.getElementById('metro-btn');
const bpmVal          = document.getElementById('bpm-val');
const beatsVal        = document.getElementById('beats-val');
const delayVal        = document.getElementById('delay-val');
const beatGridCanvas  = document.getElementById('beat-grid');
const bpmKnobCanvas   = document.getElementById('bpm-knob');
const beatsKnobCanvas = document.getElementById('beats-knob');
const delayKnobCanvas = document.getElementById('delay-knob');
const snapKnobCanvas  = document.getElementById('snap-knob');
const snapVal         = document.getElementById('snap-val');
const latKnobCanvas   = document.getElementById('lat-knob');
const latVal          = document.getElementById('lat-val');
const recordBtn     = document.getElementById('record-btn');
const recStatus     = document.getElementById('rec-status');
const ringControls  = document.getElementById('ring-controls');
const ringDuration  = document.getElementById('ring-duration');
const ringDurLabel  = document.getElementById('ring-duration-label');
const sampleList    = document.getElementById('sample-list');
const recModeRadios = document.querySelectorAll('input[name="rec-mode"]');
const metroPanel      = document.getElementById('metro-panel');
const metroExpandBtn  = document.getElementById('metro-expand-btn');
const metroRestoreBtn = document.getElementById('metro-restore-btn');
const samplerBrowserPanel = document.getElementById('sample-browser-panel');
const importFileBtn    = document.getElementById('import-file-btn');
const importFileInput  = document.getElementById('import-file-input');
const importDropOverlay = document.getElementById('import-drop-overlay');
const presetBankContainer = document.getElementById('preset-bank-container');
const exportWorkspaceBtn = document.getElementById('export-workspace-btn');
const copyWorkspaceBtn = document.getElementById('copy-workspace-btn');
const versionStr       = document.getElementById('version-str');
const hamburgerBtn     = document.getElementById('hamburger-btn');
const hamburgerMenu    = document.getElementById('hamburger-menu');
const strideKnobCanvas = document.getElementById('stride-knob');
const strideVal        = document.getElementById('stride-val');


// ── App state ─────────────────────────────────────────────────────────────────
let context      = null;
let analyserNode = null;
let recorder     = null;
let waveform     = null;
let peakMeter    = null;
let tuner        = null;
let metronome    = null;
let alignmentMonitor = null;
const pool       = createMediaPool();
const playing    = new Map();  // id → AudioBufferSourceNode
const presetStore = createPresetStore(localStorage);
let editConfigModal = null;

// ── Tempo context + metro display (no audio dependency) ───────────────────────
const tc           = makeObservable(createTempoContext());
const metroDisplay = createMetroDisplay(tc, beatGridCanvas);

const bpmKnob = createKnob(bpmKnobCanvas, 20, 500, tc.bpm, v => {
    tc.bpm = v;
    bpmVal.textContent = v;
    if (metronome?.isRunning()) metronome.restart();
});

const beatsKnob = createKnob(beatsKnobCanvas, 1, 18, tc.beatsPerMeasure, v => {
    setBeatsPerMeasure(tc, v);
    beatsVal.textContent = v;
    metroDisplay.draw(null);
    if (metronome?.isRunning()) metronome.restart();
});

const delayKnob = createKnob(delayKnobCanvas, 0, 100, tc.visualDelayMs, v => {
    tc.visualDelayMs = v;
    delayVal.textContent = v + 'ms';
});

const snapKnob = createKnob(snapKnobCanvas, 0, 5, Math.round(tc.snapThreshold / 0.005), v => {
    tc.snapThreshold = v * 0.005;
    snapVal.textContent = v;
});

const latKnob = createKnob(latKnobCanvas, 0, 200, tc.audioLatencyMs, v => {
    tc.audioLatencyMs = v;
    latVal.textContent = v + 'ms';
});

const strideKnob = createKnob(strideKnobCanvas, 1, 8, tc.waveformStride, v => {
    tc.waveformStride = v;
    strideVal.textContent = v;
});

// ── Sync display spans from tc initial values ─────────────────────────────────
bpmVal.textContent    = tc.bpm;
beatsVal.textContent  = tc.beatsPerMeasure;
delayVal.textContent  = tc.visualDelayMs + 'ms';
snapVal.textContent   = Math.round(tc.snapThreshold / 0.005);
latVal.textContent    = tc.audioLatencyMs + 'ms';
strideVal.textContent = tc.waveformStride;
if (versionStr) versionStr.textContent = VERSION;

// ── Knob ↔ tc bindings ────────────────────────────────────────────────────────
// Driven by TC_KNOB_BINDINGS: add a new entry there to cover a new bound
// property — no other wiring needed here.
const _knobMap = {
    bpm:             bpmKnob,
    beatsPerMeasure: beatsKnob,
    visualDelayMs:   delayKnob,
    snapThreshold:   snapKnob,
    audioLatencyMs:  latKnob,
    waveformStride:  strideKnob,
};
TC_KNOB_BINDINGS.forEach(({ key, toKnob }) =>
    tc.subscribe(key, v => _knobMap[key].setValue(toKnob(v)))
);

// ── Metro fullscreen toggle ───────────────────────────────────────────────────
const BEAT_GRID_DEFAULT_W = 400;
const BEAT_GRID_DEFAULT_H = 68;

function resizeBeatGridFullscreen() {
    beatGridCanvas.width  = window.innerWidth - 32;
    beatGridCanvas.height = Math.floor(window.innerHeight * 0.55);
    alignmentMonitor?.resize(beatGridCanvas.width, beatGridCanvas.height);
    metroDisplay.draw(null);
}

function resizeBeatGridDefault() {
    beatGridCanvas.width  = BEAT_GRID_DEFAULT_W;
    beatGridCanvas.height = BEAT_GRID_DEFAULT_H;
    alignmentMonitor?.resize(beatGridCanvas.width, beatGridCanvas.height);
    metroDisplay.draw(null);
}

function cssEnterFullscreen() {
    metroPanel.classList.add('fullscreen');
    document.body.style.overflow = 'hidden';
    resizeBeatGridFullscreen();
}

function cssExitFullscreen() {
    metroPanel.classList.remove('fullscreen');
    document.body.style.overflow = '';
    resizeBeatGridDefault();
}

function enterMetroFullscreen() {
    if (document.fullscreenEnabled) {
        metroPanel.requestFullscreen().catch(() => cssEnterFullscreen());
    } else {
        cssEnterFullscreen();
    }
}

function exitMetroFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        cssExitFullscreen();
    }
}

// resize canvas when native fullscreen transitions complete (including Escape to exit)
metroPanel.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === metroPanel) {
        resizeBeatGridFullscreen();
    } else {
        document.body.style.overflow = '';
        resizeBeatGridDefault();
    }
});

metroExpandBtn.addEventListener('click',  enterMetroFullscreen);
metroRestoreBtn.addEventListener('click', exitMetroFullscreen);

document.getElementById('bpm-dec').addEventListener('click',   () => bpmKnob.setValue(bpmKnob.getValue() - 1));
document.getElementById('bpm-inc').addEventListener('click',   () => bpmKnob.setValue(bpmKnob.getValue() + 1));
document.getElementById('beats-dec').addEventListener('click', () => beatsKnob.setValue(beatsKnob.getValue() - 1));
document.getElementById('beats-inc').addEventListener('click', () => beatsKnob.setValue(beatsKnob.getValue() + 1));
document.getElementById('delay-dec').addEventListener('click', () => delayKnob.setValue(delayKnob.getValue() - 1));
document.getElementById('delay-inc').addEventListener('click', () => delayKnob.setValue(delayKnob.getValue() + 1));
document.getElementById('snap-dec').addEventListener('click',  () => snapKnob.setValue(snapKnob.getValue() - 1));
document.getElementById('snap-inc').addEventListener('click',  () => snapKnob.setValue(snapKnob.getValue() + 1));
document.getElementById('lat-dec').addEventListener('click',    () => latKnob.setValue(latKnob.getValue() - 5));
document.getElementById('lat-inc').addEventListener('click',    () => latKnob.setValue(latKnob.getValue() + 5));
document.getElementById('stride-dec').addEventListener('click', () => strideKnob.setValue(strideKnob.getValue() - 1));
document.getElementById('stride-inc').addEventListener('click', () => strideKnob.setValue(strideKnob.getValue() + 1));

// ── Hamburger menu toggle ─────────────────────────────────────────────────────
hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburgerMenu.hidden = !hamburgerMenu.hidden;
});
document.addEventListener('click', () => { hamburgerMenu.hidden = true; });

// ── Collapsible sections ──────────────────────────────────────────────────────
function initCollapsible(toggleBtnId, bodyId, storageKey) {
    const btn  = document.getElementById(toggleBtnId);
    const body = document.getElementById(bodyId);
    if (!btn || !body) return;
    const collapsed = localStorage.getItem(storageKey) === '1';
    if (collapsed) { body.classList.add('collapsed'); btn.textContent = '▸'; }
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isNowCollapsed = !body.classList.contains('collapsed');
        body.classList.toggle('collapsed', isNowCollapsed);
        btn.textContent = isNowCollapsed ? '▸' : '▾';
        localStorage.setItem(storageKey, isNowCollapsed ? '1' : '0');
    });
}
initCollapsible('metro-controls-toggle', 'metro-controls-body', 'cn.metro.controls.collapsed');
initCollapsible('metro-presets-toggle',  'metro-presets-body',  'cn.metro.presets.collapsed');

// ── Accessor for alignment monitor state retrieval ───────────────────────────
function getMetronomeState() {
    return {
        measureStart: metronome?.measureStart ?? 0,
        nextBeatTime: metronome?.nextBeatTime ?? 0,
        isRunning: metronome?.isRunning?.() ?? false,
        beatsPerMeasure: tc.beatsPerMeasure
    };
}

// ── Init ──────────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    try {
        // 1. Create input provider
        const { context: ctx, source } = await createInputProvider();
        context      = ctx;

        // 2. Create audio analysis and visualization
        analyserNode = createAnalyzer(context, source).node;
        recorder     = createRecorder(context, source);
        waveform     = createWaveformVisualizer(analyserNode, waveformCanvas);
        peakMeter    = createPeakMeter(analyserNode, peakMeterCanvas);
        tuner      = createTunerDisplay(createFrequencyAnalyzer(context, source), tunerCanvas);

        // 3. Initialize builtin click provider before metronome
        try {
            await builtinClickProvider.init(context);
        } catch (initErr) {
            throw new Error('Click provider init failed: ' + initErr.message);
        }

        // 4. Create metronome with 3-arg form: context, tc, clickProvider
        metronome = createMetronome(context, tc, builtinClickProvider);

        // 5. Create alignment monitor (draws into its own offscreen canvas, blitted by metroDisplay)
        alignmentMonitor = createAlignmentMonitor(analyserNode, tc, getMetronomeState);
        metroDisplay.setWaveformLayer(alignmentMonitor.getCanvas());

        // 6. Initialize metro panel UI (sample set picker, preset bank)
        initMetroPanel();

        // 7. Initialize sample browser (file import, recordings provider, drag-drop)
        initSampleBrowser();

        // 8. Initialize global workspace features (context menus, export/copy, drop target)
        initGlobalWorkspace(context);

        startBtn.textContent = 'Running';
        recordBtn.disabled   = false;
        metroBtn.disabled    = false;
        startRenderLoop();
    } catch (err) {
        startBtn.disabled = false;
        startBtn.textContent = 'Error: ' + err.message;
    }
});

// ── Render loop ───────────────────────────────────────────────────────────────
function startRenderLoop() {
    function loop(timestamp) {
        waveform.draw();
        peakMeter.draw(timestamp);
        tuner.draw();
        const playheadPos = metronome ? metronome.getPlayheadPosition() : null;
        alignmentMonitor?.draw(timestamp, playheadPos);
        metroDisplay.draw(playheadPos);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

// ── Metronome controls ────────────────────────────────────────────────────────
metroBtn.addEventListener('click', () => {
    if (!metronome) return;
    if (metronome.isRunning()) {
        metronome.stop();
        metroBtn.textContent = '▶';
        metroBtn.classList.remove('active');
    } else {
        metronome.start();
        metroBtn.textContent = '■';
        metroBtn.classList.add('active');
    }
});

// ── Recording mode toggle ─────────────────────────────────────────────────────
recModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        const isRing = document.querySelector('input[name="rec-mode"]:checked').value === 'fixed';
        ringControls.classList.toggle('hidden', !isRing);
    });
});

// ── Ring duration slider ──────────────────────────────────────────────────────
ringDuration.addEventListener('input', () => {
    ringDurLabel.textContent = ringDuration.value + 'ms';
});

// ── Record button ─────────────────────────────────────────────────────────────
recordBtn.addEventListener('click', () => {
    if (!recorder) return;

    if (!recorder.isRecording()) {
        const mode = document.querySelector('input[name="rec-mode"]:checked').value;
        const durationMs  = parseInt(ringDuration.value, 10);
        const durationSec = durationMs / 1000;

        recorder.start(mode, durationSec, () => {
            // fixed buffer full — auto stop
            finishRecording();
        });

        recordBtn.textContent = 'Stop';
        recordBtn.classList.add('active');
        recStatus.textContent = mode === 'fixed' ? `max ${durationMs}ms` : 'recording…';
        setControlsDisabled(true);
    } else {
        finishRecording();
    }
});

function finishRecording() {
    const audioBuffer = recorder.stop();
    if (audioBuffer) {
        const clip = pool.addBuffer(audioBuffer, `Sample ${pool.clips.length + 1}`);
        renderPool();
    }
    recordBtn.textContent = 'Record';
    recordBtn.classList.remove('active');
    recStatus.textContent = '';
    setControlsDisabled(false);
}

function setControlsDisabled(disabled) {
    recModeRadios.forEach(r => r.disabled = disabled);
    ringDuration.disabled = disabled;
}

// ── Pool rendering ────────────────────────────────────────────────────────────
function renderPool() {
    sampleList.innerHTML = '';

    if (pool.clips.length === 0) {
        sampleList.innerHTML = '<li id="empty-msg">No samples</li>';
        return;
    }

    for (const clip of pool.clips) {
        const dur = pool.getDurationSeconds(clip, context.sampleRate);
        const durStr = dur < 10 ? dur.toFixed(1) + 's' : Math.round(dur) + 's';

        const li = document.createElement('li');
        li.dataset.clipId = clip.id;
        li.innerHTML = `
            <button data-id="${clip.id}" data-action="play">▶</button>
            <span class="clip-thumb-slot"></span>
            <span class="clip-label" title="${clip.label}">${clip.label}</span>
            <span class="clip-duration">${durStr}</span>
            <span class="clip-actions">
                <button data-id="${clip.id}" data-action="rename">rename</button>
                <button data-id="${clip.id}" data-action="delete" class="danger">del</button>
            </span>
        `;

        const thumb = generateThumbnail(pool.getBuffer(clip.bufferId), 80, 28);
        thumb.className = 'clip-thumb';
        li.querySelector('.clip-thumb-slot').replaceWith(thumb);

        sampleList.appendChild(li);
    }
}

// ── Playback ──────────────────────────────────────────────────────────────────
function startPlayback(id, btn) {
    const clip = pool.clips.find(c => c.id === id);
    if (!clip) return;
    const audioBuffer = pool.getBuffer(clip.bufferId);
    if (!audioBuffer) return;

    const node = context.createBufferSource();
    node.buffer = audioBuffer;
    node.connect(context.destination);
    node.connect(analyserNode);  // also feed into the waveform monitor

    const offsetSec = clip.startFrame / context.sampleRate;
    const durationSec = (clip.endFrame - clip.startFrame) / context.sampleRate;
    node.start(0, offsetSec, durationSec);

    playing.set(id, node);
    btn.textContent = '■';
    btn.classList.add('playing');

    node.onended = () => {
        playing.delete(id);
        // update button without full re-render
        const playBtn = sampleList.querySelector(`button[data-id="${id}"][data-action="play"]`);
        if (playBtn) {
            playBtn.textContent = '▶';
            playBtn.classList.remove('playing');
        }
    };
}

function stopPlayback(id) {
    const node = playing.get(id);
    if (!node) return;
    node.onended = null;  // prevent the onended handler from firing after manual stop
    node.stop();
    playing.delete(id);
    const playBtn = sampleList.querySelector(`button[data-id="${id}"][data-action="play"]`);
    if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');
    }
}

// ── Pool actions (event delegation) ──────────────────────────────────────────
sampleList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const { id, action } = btn.dataset;

    if (action === 'play') {
        if (playing.has(id)) {
            stopPlayback(id);
        } else {
            startPlayback(id, btn);
        }
    } else if (action === 'delete') {
        stopPlayback(id);
        pool.remove(id);
        renderPool();
    } else if (action === 'rename') {
        const clip = pool.clips.find(c => c.id === id);
        if (!clip) return;
        const name = prompt('Rename sample:', clip.label);
        if (name && name.trim()) {
            pool.rename(id, name.trim());
            renderPool();
        }
    }
});

// ── Lane-wire helpers: decomposed initialization ──────────────────────────────

/**
 * initMetroPanel: Setup sample set picker and preset bank.
 * The context menu for the metro header is attached by initGlobalWorkspace.
 */
function initMetroPanel() {
    // Sample set picker: inside the collapsible CONTROLS section
    const sampleSetContainer = document.createElement('div');
    sampleSetContainer.id = 'sample-set-picker-container';
    const controlsBody = document.getElementById('metro-controls-body');
    if (controlsBody) controlsBody.appendChild(sampleSetContainer);

    createSampleSetPicker(
        sampleSetContainer,
        { list: listSampleProviders, get: getSampleProvider },
        pool,
        tc,
        (selectedId, newProvider) => {
            // If newProvider, register it first
            if (newProvider) {
                registerSampleProvider(newProvider);
                tc.clickProviderRef = newProvider.id;
            } else {
                tc.clickProviderRef = selectedId;
            }
            // Restart metronome if running to apply new provider
            if (metronome?.isRunning()) {
                metronome.restart();
            }
        }
    );

    // Preset bank — M+/MR/M− flow, M0–M7 labeled slots with LED indicators
    createPresetBank(presetBankContainer, presetStore, tc, metronome);
}

/**
 * initSampleBrowser: Setup file import, recordings provider, and drag-drop.
 * Called during initialization setup, not in Start handler.
 */
function initSampleBrowser() {
    // Register content providers
    contentService.register(localFileProvider);

    const recordingsProvider = createRecordingsProvider(pool);
    contentService.register(recordingsProvider);

    // Wire import file button
    if (importFileBtn) {
        importFileBtn.addEventListener('click', async () => {
            try {
                const items = await localFileProvider.browse();
                for (const item of items) {
                    const buffer = await localFileProvider.import(item, context);
                    const label = item.label || 'Imported';
                    pool.addBuffer(buffer, label);
                }
                renderPool();
            } catch (err) {
                console.error('Import failed:', err);
                // Show error toast
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
                    background: #933; color: #fff; padding: 0.75rem 1.5rem;
                    border-radius: 4px; font-size: 0.9rem; z-index: 9999;
                `;
                toast.textContent = 'Import failed: ' + err.message;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        });
    }

    // Wire drag-and-drop on sample browser panel
    if (samplerBrowserPanel) {
        samplerBrowserPanel.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (importDropOverlay) {
                importDropOverlay.hidden = false;
                importDropOverlay.style.display = 'block';
            }
        });

        samplerBrowserPanel.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (importDropOverlay) {
                importDropOverlay.hidden = true;
                importDropOverlay.style.display = 'none';
            }
        });

        samplerBrowserPanel.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (importDropOverlay) {
                importDropOverlay.hidden = true;
                importDropOverlay.style.display = 'none';
            }

            const files = e.dataTransfer?.files || [];
            for (const file of files) {
                if (file.type.startsWith('audio/')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = await context.decodeAudioData(arrayBuffer);
                        const label = file.name || 'Dropped File';
                        pool.addBuffer(buffer, label);
                    } catch (err) {
                        console.error('Drop decode failed:', err);
                    }
                }
            }
            renderPool();
        });
    }
}

/**
 * Builds a WorkspaceComponents object from raw app state.
 * Each component must expose exportConfig() and importConfig(slice).
 * workspace.js expects this shape — raw state objects (tc, pool, etc.) do not
 * satisfy the interface and will throw TypeError if passed directly.
 */
function buildWorkspaceComponents() {
    return {
        global: {
            exportConfig: () => ({
                visualDelayMs: tc.visualDelayMs,
                snapThreshold: tc.snapThreshold,
            }),
            importConfig: (data) => {
                if (data.visualDelayMs !== undefined) tc.visualDelayMs = data.visualDelayMs;
                if (data.snapThreshold !== undefined) tc.snapThreshold = data.snapThreshold;
                return [];
            },
        },
        // metronome already has exportConfig/importConfig from its implementation
        metronome: metronome,
        sampleSets: {
            // Placeholder — sample set serialization TBD
            exportConfig: () => [],
            importConfig: () => [],
        },
        // presetStore already has exportConfig/importConfig
        presets: presetStore,
    };
}

/**
 * initGlobalWorkspace: Setup export/copy buttons, drop target, and context menus.
 * Requires context to be initialized.
 */
function initGlobalWorkspace(ctx) {
    // Create edit config modal (singleton) once
    if (!editConfigModal) {
        editConfigModal = createEditConfigModal();
    }

    // ── Metro panel: full TC component ───────────────────────────────────────
    const metroComponent = {
        exportConfig: () => ({
            bpm:             tc.bpm,
            beatsPerMeasure: tc.beatsPerMeasure,
            beatOffsets:     tc.beatOffsets.slice(),
            beatVolumes:     tc.beatVolumes.slice(),
            beatAccents:     tc.beatAccents.slice(),
            clickProviderRef: tc.clickProviderRef,
            snapThreshold:   tc.snapThreshold,
            visualDelayMs:   tc.visualDelayMs,
        }),
        importConfig: (cfg) => {
            const errors = [];
            if (cfg.bpm !== undefined) {
                const v = Number(cfg.bpm);
                if (!isFinite(v) || v < 20 || v > 500) errors.push('bpm: must be 20–500');
                else tc.bpm = v;
            }
            if (cfg.beatsPerMeasure !== undefined) {
                const v = Number(cfg.beatsPerMeasure);
                if (!Number.isInteger(v) || v < 1 || v > 18) errors.push('beatsPerMeasure: must be integer 1–18');
                else setBeatsPerMeasure(tc, v);
            }
            if (cfg.visualDelayMs !== undefined) {
                const v = Number(cfg.visualDelayMs);
                if (!isFinite(v) || v < 0 || v > 100) errors.push('visualDelayMs: must be 0–100');
                else tc.visualDelayMs = v;
            }
            if (cfg.snapThreshold !== undefined) {
                const v = Number(cfg.snapThreshold);
                if (!isFinite(v) || v < 0 || v > 0.025) errors.push('snapThreshold: must be 0–0.025');
                else tc.snapThreshold = v;
            }
            if (cfg.beatOffsets !== undefined) {
                if (!Array.isArray(cfg.beatOffsets)) errors.push('beatOffsets: must be array');
                else tc.beatOffsets = cfg.beatOffsets.slice();
            }
            if (cfg.beatVolumes !== undefined) {
                if (!Array.isArray(cfg.beatVolumes)) errors.push('beatVolumes: must be array');
                else tc.beatVolumes = cfg.beatVolumes.slice();
            }
            if (cfg.beatAccents !== undefined) {
                if (!Array.isArray(cfg.beatAccents)) errors.push('beatAccents: must be array');
                else tc.beatAccents = cfg.beatAccents.slice();
            }
            if (cfg.clickProviderRef !== undefined) tc.clickProviderRef = String(cfg.clickProviderRef);
            if (errors.length === 0 && metronome?.isRunning?.()) metronome.restart();
            return errors;
        },
    };

    // Helper: attach a context menu to a panel and wire its [...] button
    function attachPanelMenu(settingsBtnId, component) {
        const btn = document.getElementById(settingsBtnId);
        if (!btn) return;
        const menu = createContextMenu(btn.closest('.panel-header, section') || btn, component, (comp) => {
            editConfigModal.open(comp);
        });
        btn.addEventListener('click', () => {
            const r = btn.getBoundingClientRect();
            menu.showAt(r.left, r.bottom + 4);
        });
    }

    attachPanelMenu('metro-settings-btn', metroComponent);

    // Stub components for visualizer panels that don't yet expose editable config
    const stubComponent = (label) => ({
        exportConfig: () => ({ panel: label }),
        importConfig: () => [],
    });
    attachPanelMenu('peak-settings-btn',     stubComponent('Level Meter'));
    attachPanelMenu('tuner-settings-btn',    stubComponent('Tuner'));
    attachPanelMenu('waveform-settings-btn', stubComponent('Waveform'));

    // Wire export button using workspace.js downloadWorkspace (handles blob/link internally)
    if (exportWorkspaceBtn) {
        exportWorkspaceBtn.addEventListener('click', () => {
            try {
                downloadWorkspace(buildWorkspaceComponents());
            } catch (err) {
                console.error('Export failed:', err);
            }
        });
    }

    // Wire copy button using workspace.js copyWorkspace
    if (copyWorkspaceBtn) {
        copyWorkspaceBtn.addEventListener('click', async () => {
            try {
                await copyWorkspace(buildWorkspaceComponents());
                // Show success toast
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%);
                    background: #040; color: #fff; padding: 0.75rem 1.5rem;
                    border-radius: 4px; font-size: 0.9rem; z-index: 9999;
                `;
                toast.textContent = 'Copied to clipboard';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });
    }

    // Register drop target using workspace.js registerDropTarget.
    // This handles dragover/drop with proper size checks, YAML parsing, and error toasts.
    registerDropTarget(buildWorkspaceComponents());
}

