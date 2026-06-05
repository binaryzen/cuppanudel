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
        const x = Math.min(Math.round(PAD_L + playheadPos * usable), PAD_L + usable - 1);

        // New measure: dim the previous waveform instead of clearing it
        if (prevX !== -1 && x < prevX - 2) {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.55)';
            ctx.fillRect(0, 0, width, height);
        }
        prevX = x;

        analyser.getFloatTimeDomainData(analyserBuffer);
        let peak = 0;
        for (let i = 0; i < analyserBuffer.length; i++) {
            peak = Math.max(peak, Math.abs(analyserBuffer[i]));
        }

        ctx.clearRect(x, 0, 1, height);

        const barHalfH = Math.max(1, peak * mid);
        ctx.strokeStyle = 'rgba(79, 204, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, mid - barHalfH);
        ctx.lineTo(x + 0.5, mid + barHalfH);
        ctx.stroke();
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
