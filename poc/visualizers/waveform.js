export function createWaveformVisualizer(analyserNode, canvas) {
    const ctx = canvas.getContext('2d');
    const buffer = new Float32Array(analyserNode.fftSize);

    function draw() {
        analyserNode.getFloatTimeDomainData(buffer);

        const width  = canvas.width;
        const height = canvas.height;
        const mid    = height / 2;
        const sliceW = width / buffer.length;

        ctx.clearRect(0, 0, width, height);

        // center line
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(width, mid);
        ctx.stroke();

        // waveform
        ctx.strokeStyle = '#4fc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i < buffer.length; i++) {
            const x = i * sliceW;
            const y = mid - (buffer[i] * mid);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    return { draw };
}
