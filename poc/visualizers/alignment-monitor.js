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

    // Track the previous measureStart to detect advances
    let prevMeasureStart = null;

    function getMeasureDurationSeconds(tc) {
        if (!tc.bpm || !tc.beatsPerMeasure) return 1;
        // duration = (beatsPerMeasure / bpm) * 60 seconds
        return (tc.beatsPerMeasure / tc.bpm) * 60;
    }

    function draw() {
        const state = getMetronomeState();
        const width = canvas.width;
        const height = canvas.height;
        const mid = height / 2;

        // If metronome not running or invalid state, clear and return
        if (!state || !state.isRunning) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        // Compute how many columns to advance since last frame
        // Column advance = (measureStart advancement) / measureDuration * canvasWidth
        let columnsToAdvance = 0;
        if (prevMeasureStart !== null && state.measureStart !== prevMeasureStart) {
            const measureDuration = getMeasureDurationSeconds(tc);
            const measureAdvance = state.measureStart - prevMeasureStart;
            columnsToAdvance = Math.round((measureAdvance / measureDuration) * width);
        }
        prevMeasureStart = state.measureStart;

        // Advance the ring buffer by the computed amount
        // Each advancement shifts columns and fills new ones from the analyser
        for (let col = 0; col < columnsToAdvance; col++) {
            // Read peak amplitude from analyser for this column
            analyser.getFloatTimeDomainData(analyserBuffer);
            let peak = 0;
            for (let i = 0; i < analyserBuffer.length; i++) {
                peak = Math.max(peak, Math.abs(analyserBuffer[i]));
            }

            // Write to ring buffer at current position
            ringBuffer[ringIndex] = peak;
            ringIndex = (ringIndex + 1) % ringBuffer.length;
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw the ring buffer as a continuous scrolling waveform
        // We have ALIGN_MEASURES * width columns total
        // The most recent column is at (ringIndex - 1) % ringBuffer.length
        // Draw from oldest to newest

        const bufferLen = ringBuffer.length;
        const colsPerMeasure = width;

        for (let col = 0; col < bufferLen; col++) {
            // Which physical column does this ring buffer entry map to?
            // The oldest column (ringIndex) goes to x=0, newest goes to x=width-1 (but wraps)
            const physicalCol = (col - ringIndex + bufferLen) % bufferLen;

            // Which measure does this column belong to?
            // 0 to width-1 = measure 0 (older)
            // width to 2*width-1 = measure 1 (current)
            const measureIdx = Math.floor(physicalCol / colsPerMeasure);
            const opacity = (measureIdx < ALIGN_MEASURES - 1) ? OPACITY_OLD : OPACITY_CURRENT;

            // Draw this column as a vertical line
            const x = physicalCol;
            const amplitude = ringBuffer[col];
            const y1 = mid - (amplitude * mid);
            const y2 = mid + (amplitude * mid);

            ctx.strokeStyle = `rgba(79, 204, 255, ${opacity})`;  // cyan with variable opacity
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
        prevMeasureStart = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return { draw, reset };
}

export { ALIGN_MEASURES };
