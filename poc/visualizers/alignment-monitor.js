import { PAD_L, PAD_R } from './metro-display.js';

export function createAlignmentMonitor(analyser, tc, getMetronomeState) {
    const offscreen = document.createElement('canvas');
    offscreen.width  = 400;
    offscreen.height = 68;
    const ctx = offscreen.getContext('2d');
    const analyserBuffer = new Float32Array(analyser.fftSize);

    let prevX = -1;

    function draw(timestamp, playheadPos) {
        const state  = getMetronomeState();
        const width  = offscreen.width;
        const height = offscreen.height;
        const mid    = height / 2;

        if (!state.isRunning || playheadPos === null) {
            return; // freeze last frame when stopped
        }

        const usable = width - PAD_L - PAD_R;

        // Shift the plotted position left by audioLatencyMs so a note played on
        // the beat appears under the beat marker despite microphone input delay.
        const measDurSec   = tc.beatsPerMeasure / tc.bpm * 60;
        const latFrac      = (tc.audioLatencyMs || 0) / 1000 / measDurSec;
        const adjustedPos  = ((playheadPos - latFrac) % 1 + 1) % 1;

        const x = Math.min(Math.round(PAD_L + adjustedPos * usable), PAD_L + usable - 1);

        analyser.getFloatTimeDomainData(analyserBuffer);
        let peak = 0;
        for (let i = 0; i < analyserBuffer.length; i++) {
            peak = Math.max(peak, Math.abs(analyserBuffer[i]));
        }
        const barHalfH = Math.max(1, peak * mid);

        // New measure: dim the previous waveform, reset so we draw only at x this frame
        if (prevX !== -1 && x < prevX - 2) {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.55)';
            ctx.fillRect(0, 0, width, height);
            prevX = -1;
        }

        // Fill columns from prevX+stride to x; stride=1 gives a solid waveform
        const stride  = Math.max(1, Math.round(tc.waveformStride || 1));
        const startPx = prevX === -1 ? x : prevX + stride;

        ctx.strokeStyle = 'rgba(79, 204, 255, 0.9)';
        ctx.lineWidth   = 1;
        for (let px = startPx; px <= x; px += stride) {
            ctx.clearRect(px, 0, 1, height);
            ctx.beginPath();
            ctx.moveTo(px + 0.5, mid - barHalfH);
            ctx.lineTo(px + 0.5, mid + barHalfH);
            ctx.stroke();
        }

        prevX = x;
    }

    function reset() {
        prevX = -1;
        ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    }

    function resize(w, h) {
        if (offscreen.width === w && offscreen.height === h) return;
        offscreen.width  = w;
        offscreen.height = h;
        prevX = -1;
    }

    function getCanvas() { return offscreen; }

    return { draw, reset, resize, getCanvas };
}
