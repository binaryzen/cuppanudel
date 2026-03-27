const MIN_DB  = -60;  // below this peak = treat as silence
const MIN_BIN = 5;    // skip DC and sub-bass noise

export function createFrequencyAnalyzer(context, source) {
    const node = context.createAnalyser();
    node.fftSize = 8192;
    node.smoothingTimeConstant = 0.8;
    source.connect(node);

    const freqBuffer = new Float32Array(node.frequencyBinCount);

    function getFrequency() {
        node.getFloatFrequencyData(freqBuffer);

        // find loudest bin above noise floor
        let peakBin = MIN_BIN;
        let peakVal = -Infinity;
        for (let i = MIN_BIN; i < freqBuffer.length - 1; i++) {
            if (freqBuffer[i] > peakVal) {
                peakVal  = freqBuffer[i];
                peakBin  = i;
            }
        }

        if (peakVal < MIN_DB) return null;  // silence

        // parabolic interpolation for sub-bin accuracy
        let bin = peakBin;
        if (peakBin > 0 && peakBin < freqBuffer.length - 1) {
            const a = freqBuffer[peakBin - 1];
            const b = freqBuffer[peakBin];
            const g = freqBuffer[peakBin + 1];
            const denom = a - 2 * b + g;
            if (denom !== 0) bin = peakBin + 0.5 * (a - g) / denom;
        }

        return bin * context.sampleRate / node.fftSize;
    }

    return { node, getFrequency };
}
