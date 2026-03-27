import { CHUNK_SIZE_MS } from '../constants.js';

function nearestPow2(n) {
    return Math.pow(2, Math.round(Math.log2(n)));
}

// Connecting a ScriptProcessorNode to context.destination would route mic audio
// to speakers (feedback risk). Instead we connect through a silent gain node.
export function createRecorder(context, source) {
    const silentGain = context.createGain();
    silentGain.gain.value = 0;
    silentGain.connect(context.destination);

    let spn = null;
    let recording = false;
    let mode = null;

    // ring mode state
    let ringBuffer = null;
    let writeHead = 0;
    let ringFull = false;

    // chunk mode state
    let chunks = [];

    // called externally when ring buffer fills before stop() is called
    let onRingFull = null;

    function chunkSizeSamples() {
        const ideal = (CHUNK_SIZE_MS / 1000) * context.sampleRate;
        return Math.min(16384, Math.max(256, nearestPow2(ideal)));
    }

    function start(recordMode, ringDurationSeconds, onFullCallback) {
        if (recording) return;
        mode = recordMode;
        recording = true;
        chunks = [];
        writeHead = 0;
        ringFull = false;
        onRingFull = onFullCallback || null;

        if (mode === 'fixed') {
            const totalSamples = Math.floor(ringDurationSeconds * context.sampleRate);
            ringBuffer = new Float32Array(totalSamples);
        }

        spn = context.createScriptProcessor(chunkSizeSamples(), 1, 1);

        spn.onaudioprocess = (e) => {
            if (!recording) return;
            const input = e.inputBuffer.getChannelData(0);

            if (mode === 'fixed') {
                const remaining = ringBuffer.length - writeHead;
                if (remaining <= 0) {
                    if (!ringFull) {
                        ringFull = true;
                        if (onRingFull) onRingFull();
                    }
                    return;
                }
                const toCopy = Math.min(input.length, remaining);
                ringBuffer.set(input.subarray(0, toCopy), writeHead);
                writeHead += toCopy;
            } else {
                chunks.push(new Float32Array(input));
            }
        };

        source.connect(spn);
        spn.connect(silentGain);
    }

    // Returns an AudioBuffer of the recorded audio, or null if not recording
    function stop() {
        if (!recording) return null;
        recording = false;

        source.disconnect(spn);
        spn.disconnect();
        spn = null;

        let pcm;
        if (mode === 'fixed') {
            pcm = ringBuffer.slice(0, writeHead);
        } else {
            const total = chunks.reduce((acc, c) => acc + c.length, 0);
            pcm = new Float32Array(total);
            let offset = 0;
            for (const chunk of chunks) {
                pcm.set(chunk, offset);
                offset += chunk.length;
            }
        }

        const audioBuffer = context.createBuffer(1, pcm.length, context.sampleRate);
        audioBuffer.copyToChannel(pcm, 0);
        return audioBuffer;
    }

    function isRecording() {
        return recording;
    }

    return { start, stop, isRecording };
}
