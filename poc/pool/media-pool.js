import { MAX_SAMPLES } from '../constants.js';
import { deduplicateLabel } from '../utils/label.js';

export function createMediaPool() {
    const buffers = new Map();  // id → AudioBuffer
    const clips   = [];         // SampleClip[]
    let nextId    = 1;

    function _defaultMeta() {
        return {
            capturedBpm: null,
            capturedBeatsPerMeasure: null,
            capturedSampleRate: null,
            capturedMeasures: null,
            loopMode: 'none',
            fadeInFrames: 0,
            fadeOutFrames: 0,
            createdAt: Date.now(),
        };
    }

    function addBuffer(audioBuffer, label) {
        if (clips.length >= MAX_SAMPLES) {
            throw new Error(`Max samples (${MAX_SAMPLES}) reached`);
        }
        const id = String(nextId++);
        buffers.set(id, audioBuffer);
        const clip = Object.assign(
            {
                id,
                label: label || `Sample ${id}`,
                bufferId: id,
                startFrame: 0,
                endFrame: audioBuffer.length,
                gain: 1.0,
                detune: 0,
                loop: false,
            },
            _defaultMeta()
        );
        clips.push(clip);
        return clip;
    }

    function addBufferWithMeta(audioBuffer, label, meta) {
        if (clips.length >= MAX_SAMPLES) {
            throw new Error(`Max samples (${MAX_SAMPLES}) reached`);
        }
        const id = String(nextId++);
        buffers.set(id, audioBuffer);
        const clip = Object.assign(
            {
                id,
                label: label || `Sample ${id}`,
                bufferId: id,
                startFrame: 0,
                endFrame: audioBuffer.length,
                gain: 1.0,
                detune: 0,
                loop: false,
            },
            _defaultMeta(),
            meta || {}
        );
        clips.push(clip);
        return clip;
    }

    function remove(id) {
        const idx = clips.findIndex(c => c.id === id);
        if (idx !== -1) clips.splice(idx, 1);
        buffers.delete(id);
    }

    function rename(id, label) {
        const clip = clips.find(c => c.id === id);
        if (clip) clip.label = label;
    }

    function getBuffer(bufferId) {
        return buffers.get(bufferId);
    }

    function getDurationSeconds(clip, sampleRate) {
        return (clip.endFrame - clip.startFrame) / sampleRate;
    }

    function updateClip(id, fields) {
        const clip = clips.find(c => c.id === id);
        if (clip) Object.assign(clip, fields);
    }

    function duplicate(id) {
        const src = clips.find(c => c.id === id);
        if (!src) return null;
        if (clips.length >= MAX_SAMPLES) {
            throw new Error(`Max samples (${MAX_SAMPLES}) reached`);
        }
        const newId = String(nextId++);
        const label = deduplicateLabel(src.label, clips.map(c => c.label));
        const copy  = Object.assign({}, src, { id: newId, label, createdAt: Date.now() });
        clips.push(copy);
        return copy;
    }

    return { clips, buffers, addBuffer, addBufferWithMeta, remove, rename, getBuffer, getDurationSeconds, updateClip, duplicate };
}
