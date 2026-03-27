export function createAnalyzer(context, source) {
    const node = context.createAnalyser();
    node.fftSize = 2048;

    source.connect(node);

    const buffer = new Float32Array(node.fftSize);

    // RMS amplitude, scaled 0–100
    function getAmplitude() {
        node.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        return Math.round(rms * 100);
    }

    return { node, getAmplitude };
}
