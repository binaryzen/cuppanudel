const SEGMENTS      = 40;
const GAP           = 2;
const PEAK_HOLD_MS  = 1200;  // how long peak indicator holds before falling
const PEAK_DECAY    = 0.4;   // segments per frame decay rate

// colour thresholds (segment index)
const YELLOW_AT = Math.floor(SEGMENTS * 0.70);
const RED_AT    = Math.floor(SEGMENTS * 0.85);

const COLOUR_ON = [
    '#1db954',  // green
    '#f0c030',  // yellow
    '#e03030',  // red
];
const COLOUR_OFF = [
    '#0a2e14',
    '#2e2400',
    '#2e0a0a',
];

function segmentColour(index, lit) {
    const tier = index >= RED_AT ? 2 : index >= YELLOW_AT ? 1 : 0;
    return lit ? COLOUR_ON[tier] : COLOUR_OFF[tier];
}

export function createPeakMeter(analyserNode, canvas) {
    const ctx    = canvas.getContext('2d');
    const buffer = new Float32Array(analyserNode.fftSize);

    let peakSegment  = 0;
    let peakHeldAt   = 0;   // timestamp when peak was last set

    function getRMS() {
        analyserNode.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        return Math.sqrt(sum / buffer.length);
    }

    function draw(timestamp) {
        const rms      = getRMS();
        const level    = Math.min(rms * 100, 100);         // 0–100
        const litCount = Math.round((level / 100) * SEGMENTS);

        // peak hold
        if (litCount >= peakSegment) {
            peakSegment = litCount;
            peakHeldAt  = timestamp;
        } else if (timestamp - peakHeldAt > PEAK_HOLD_MS) {
            peakSegment = Math.max(0, peakSegment - PEAK_DECAY);
        }

        const peakIdx = Math.round(peakSegment);

        // layout
        const w          = canvas.width;
        const h          = canvas.height;
        const totalGap   = GAP * (SEGMENTS - 1);
        const segW       = (w - totalGap) / SEGMENTS;

        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < SEGMENTS; i++) {
            const x   = i * (segW + GAP);
            const lit = i < litCount;
            ctx.fillStyle = segmentColour(i, lit);
            ctx.fillRect(x, 0, segW, h);
        }

        // peak indicator — one bright segment
        if (peakIdx > 0 && peakIdx < SEGMENTS) {
            const x = peakIdx * (segW + GAP);
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, 0, segW, h);
        }
    }

    return { draw };
}
