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

// ── App state ─────────────────────────────────────────────────────────────────
let context      = null;
let analyserNode = null;
let recorder     = null;
let waveform     = null;
let peakMeter    = null;
let tuner        = null;
let metronome    = null;
const pool       = createMediaPool();
const playing    = new Map();  // id → AudioBufferSourceNode

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

// ── Metro fullscreen toggle ───────────────────────────────────────────────────
const BEAT_GRID_DEFAULT_W = 400;
const BEAT_GRID_DEFAULT_H = 68;

function enterMetroFullscreen() {
    metroPanel.classList.add('fullscreen');
    beatGridCanvas.width  = window.innerWidth - 32;
    beatGridCanvas.height = Math.floor(window.innerHeight * 0.55);
    metroDisplay.draw(null);
}

function exitMetroFullscreen() {
    metroPanel.classList.remove('fullscreen');
    beatGridCanvas.width  = BEAT_GRID_DEFAULT_W;
    beatGridCanvas.height = BEAT_GRID_DEFAULT_H;
    metroDisplay.draw(null);
}

metroExpandBtn.addEventListener('click',  enterMetroFullscreen);
metroRestoreBtn.addEventListener('click', exitMetroFullscreen);

document.getElementById('bpm-dec').addEventListener('click',   () => bpmKnob.setValue(bpmKnob.getValue() - 1));
document.getElementById('bpm-inc').addEventListener('click',   () => bpmKnob.setValue(bpmKnob.getValue() + 1));
document.getElementById('beats-dec').addEventListener('click', () => beatsKnob.setValue(beatsKnob.getValue() - 1));
document.getElementById('beats-inc').addEventListener('click', () => beatsKnob.setValue(beatsKnob.getValue() + 1));
document.getElementById('delay-dec').addEventListener('click', () => delayKnob.setValue(delayKnob.getValue() - 1));
document.getElementById('delay-inc').addEventListener('click', () => delayKnob.setValue(delayKnob.getValue() + 1));

// ── Init ──────────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    try {
        const { context: ctx, source } = await createInputProvider();
        context      = ctx;
        analyserNode = createAnalyzer(context, source).node;
        recorder     = createRecorder(context, source);
        waveform     = createWaveformVisualizer(analyserNode, waveformCanvas);
        peakMeter    = createPeakMeter(analyserNode, peakMeterCanvas);
        tuner      = createTunerDisplay(createFrequencyAnalyzer(context, source), tunerCanvas);
        metronome  = createMetronome(context, tc);

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
