// Alignment Monitor Visualizer
// Renders a continuously scrolling waveform history behind the beat-grid canvas

const ALIGN_MEASURES = 2;

// Pre-calculate opacity values for different measure zones
const OPACITY_OLD = 0.35;      // older measure(s)
const OPACITY_CURRENT = 0.55;  // most recent measure

export function createAlignmentMonitor(analyser, canvas, tc, getMetronomeState) {
    const ctx = canvas.getContext('2d');

    // Pre-allocate the ring buffer once: ALIGN_MEASURES * canvas.width columns
    // Each element stores the peak amplitude for that column
    let ringBuffer = new Float32Array(ALIGN_MEASURES * canvas.width);
    let ringIndex = 0;  // write position in ring buffer (0 to ringBuffer.length - 1)

    // Pre-allocate the analyser read buffer
    const analyserBuffer = new Float32Array(analyser.fftSize);

    // Fractional-column accumulator: avoids drift from rounding on every frame
    let pendingColumns = 0;
    let prevTimestamp = null;

    function getMeasureDurationMs(tc) {
        if (!tc.bpm || !tc.beatsPerMeasure) return 2000;
        return (tc.beatsPerMeasure / tc.bpm) * 60000;
    }

    function draw(timestamp) {
        const state = getMetronomeState();
        const width = canvas.width;
        const height = canvas.height;
        const mid = height / 2;

        // If metronome not running or invalid state, clear and return
        if (!state || !state.isRunning) {
            ctx.clearRect(0, 0, width, height);
            prevTimestamp = null;
            pendingColumns = 0;
            return;
        }

        // Advance ring buffer based on real elapsed time between frames.
        // Using RAF timestamp avoids the measureStart approach, which only
        // changes once per measure and leaves the buffer empty between beats.
        if (prevTimestamp !== null) {
            const deltaMs = timestamp - prevTimestamp;
            pendingColumns += (deltaMs / getMeasureDurationMs(tc)) * width;
            const columnsToAdvance = Math.floor(pendingColumns);
            pendingColumns -= columnsToAdvance;

            for (let col = 0; col < columnsToAdvance; col++) {
                analyser.getFloatTimeDomainData(analyserBuffer);
                let peak = 0;
                for (let i = 0; i < analyserBuffer.length; i++) {
                    peak = Math.max(peak, Math.abs(analyserBuffer[i]));
                }
                ringBuffer[ringIndex] = peak;
                ringIndex = (ringIndex + 1) % ringBuffer.length;
            }
        }
        prevTimestamp = timestamp;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw both measures overlaid at the same x positions (0..width-1).
        // physicalCol 0..width-1        → older measure  → OPACITY_OLD
        // physicalCol width..2*width-1  → current measure → OPACITY_CURRENT
        // x = physicalCol % width maps both ranges onto the canvas.

        const bufferLen = ringBuffer.length;
        const colsPerMeasure = width;

        for (let col = 0; col < bufferLen; col++) {
            const physicalCol = (col - ringIndex + bufferLen) % bufferLen;
            const x = physicalCol % colsPerMeasure;
            const measureIdx = Math.floor(physicalCol / colsPerMeasure);
            const opacity = (measureIdx < ALIGN_MEASURES - 1) ? OPACITY_OLD : OPACITY_CURRENT;

            const amplitude = ringBuffer[col];
            if (amplitude < 0.001) continue;

            const y1 = mid - (amplitude * mid);
            const y2 = mid + (amplitude * mid);

            ctx.strokeStyle = `rgba(79, 204, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();
        }
    }

    function reset() {
        ringBuffer.fill(0);
        ringIndex = 0;
        pendingColumns = 0;
        prevTimestamp = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return { draw, reset };
}

export { ALIGN_MEASURES };

