import { MAX_SAMPLES } from '../constants.js';

export function createMediaPool() {
    const buffers = new Map();  // id → AudioBuffer
    const clips = [];           // SampleClip[]
    let nextId = 1;

    function addBuffer(audioBuffer, label) {
        if (clips.length >= MAX_SAMPLES) {
            throw new Error(`Max samples (${MAX_SAMPLES}) reached`);
        }
        const id = String(nextId++);
        buffers.set(id, audioBuffer);
        const clip = {
            id,
            label: label || `Sample ${id}`,
            bufferId: id,
            startFrame: 0,
            endFrame: audioBuffer.length,
            gain: 1.0,
            detune: 0,
            loop: false,
        };
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

    return { clips, addBuffer, remove, rename, getBuffer, getDurationSeconds };
}
