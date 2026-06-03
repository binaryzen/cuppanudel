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
const presetSaveBtn   = document.getElementById('preset-save-btn');
const exportWorkspaceBtn = document.getElementById('export-workspace-btn');
const copyWorkspaceBtn = document.getElementById('copy-workspace-btn');
const alignmentMonitorCanvas = document.getElementById('alignment-monitor');

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
const tc          = createTempoContext();
const metroDisplay = createMetroDisplay(tc, beatGridCanvas);

const bpmKnob = createKnob(bpmKnobCanvas, 20, 500, 120, v => {
    tc.bpm = v;
    bpmVal.textContent = v;
    if (metronome?.isRunning()) metronome.restart();
});

const beatsKnob = createKnob(beatsKnobCanvas, 1, 18, 4, v => {
    setBeatsPerMeasure(tc, v);
    beatsVal.textContent = v;
    metroDisplay.draw(null);
    if (metronome?.isRunning()) metronome.restart();
});

const delayKnob = createKnob(delayKnobCanvas, 0, 100, 0, v => {
    tc.visualDelayMs = v;
    delayVal.textContent = v + 'ms';
});

tc.snapThreshold = 0;
const snapKnob = createKnob(snapKnobCanvas, 0, 5, 0, v => {
    tc.snapThreshold = v * 0.005;   // 0–0.025 in offset space (~0–40% of a 16th note)
    snapVal.textContent = v;
});

// ── Metro fullscreen toggle ───────────────────────────────────────────────────
const BEAT_GRID_DEFAULT_W = 400;
const BEAT_GRID_DEFAULT_H = 68;

function resizeBeatGridFullscreen() {
    beatGridCanvas.width  = window.innerWidth - 32;
    beatGridCanvas.height = Math.floor(window.innerHeight * 0.55);
    metroDisplay.draw(null);
}

function resizeBeatGridDefault() {
    beatGridCanvas.width  = BEAT_GRID_DEFAULT_W;
    beatGridCanvas.height = BEAT_GRID_DEFAULT_H;
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

        // 5. Create alignment monitor (guard against missing canvas)
        if (!alignmentMonitorCanvas) {
            console.error('main.js: alignment-monitor canvas not found — check index.html');
        } else {
            alignmentMonitor = createAlignmentMonitor(analyserNode, alignmentMonitorCanvas, tc, getMetronomeState);
        }

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
        metroDisplay.draw(metronome ? metronome.getPlayheadPosition() : null);
        if (alignmentMonitor) {
            alignmentMonitor.draw();
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

// ── Metronome controls ────────────────────────────────────────────────────────
metroBtn.addEventListener('click', () => {
    if (!metronome) return;
    if (metronome.isRunning()) {
        metronome.stop();
        metroBtn.textContent = '▶ Start';
        metroBtn.classList.remove('active');
    } else {
        metronome.start();
        metroBtn.textContent = '■ Stop';
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
    // Sample set picker: loads existing providers from registry and allows creating new ones
    const sampleSetContainer = document.createElement('div');
    sampleSetContainer.id = 'sample-set-picker-container';

    // Find beat-grid canvas and insert before it
    const beatGrid = document.getElementById('beat-grid');
    if (beatGrid && beatGrid.parentNode) {
        beatGrid.parentNode.insertBefore(sampleSetContainer, beatGrid);
    }

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

    // Preset bank
    createPresetBank(presetBankContainer, presetStore, tc, metronome);

    // Wire the preset save button
    presetSaveBtn.addEventListener('click', () => {
        // Trigger save mode in preset bank (this is handled internally by preset-bank)
        // For now, we'll just toggle save mode
    });
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

    // Attach context menus to all panel headers (including metro-header which was added earlier)
    const metroHeader = document.getElementById('metro-header');
    if (metroHeader && !metroHeader.dataset.menuAttached) {
        metroHeader.dataset.menuAttached = 'true';
        const metroComponent = {
            exportConfig: () => ({ bpm: tc.bpm, beatsPerMeasure: tc.beatsPerMeasure }),
            importConfig: (cfg) => []
        };
        createContextMenu(metroHeader, metroComponent, (comp) => {
            editConfigModal.open(comp);
        });
    }

    // Attach context menus to any other panel headers
    const otherHeaders = document.querySelectorAll('.panel-header:not([data-menu-attached])');
    otherHeaders.forEach(header => {
        header.dataset.menuAttached = 'true';
        const component = {
            exportConfig: () => ({ dummy: true }),
            importConfig: () => []
        };
        createContextMenu(header, component, (comp) => {
            editConfigModal.open(comp);
        });
    });

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

