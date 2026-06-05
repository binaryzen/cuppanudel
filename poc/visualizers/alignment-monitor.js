// Alignment Monitor Visualizer
// Draws peak amplitude as a vertical bar directly under the metronome playhead.
// The waveform fills left-to-right as the measure progresses; canvas clears on
// each new measure so the display always reflects the current pass.

export function createAlignmentMonitor(analyser, canvas, tc, getMetronomeState) {
    const ctx = canvas.getContext('2d');
    const analyserBuffer = new Float32Array(analyser.fftSize);

    let prevX = -1;

    function draw(timestamp, playheadPos) {
        const state = getMetronomeState();
        const width  = canvas.width;
        const height = canvas.height;
        const mid    = height / 2;

        if (!state.isRunning || playheadPos === null) {
            ctx.clearRect(0, 0, width, height);
            prevX = -1;
            return;
        }

        const x = Math.min(Math.floor(playheadPos * width), width - 1);

        // New measure started: clear and begin fresh
        if (prevX !== -1 && x < prevX - 2) {
            ctx.clearRect(0, 0, width, height);
        }
        prevX = x;

        // Sample peak amplitude from the shared analyser
        analyser.getFloatTimeDomainData(analyserBuffer);
        let peak = 0;
        for (let i = 0; i < analyserBuffer.length; i++) {
            peak = Math.max(peak, Math.abs(analyserBuffer[i]));
        }

        // Erase this column then draw so the current pass overwrites the old one
        ctx.clearRect(x, 0, 1, height);
        if (peak > 0.001) {
            const y1 = mid - peak * mid;
            const y2 = mid + peak * mid;
            ctx.strokeStyle = 'rgba(79, 204, 255, 0.75)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();
        }
    }

    function reset() {
        prevX = -1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return { draw, reset };
}

