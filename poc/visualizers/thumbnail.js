// Generates a waveform thumbnail canvas from an AudioBuffer.
// Uses peak envelope downsampling — one peak abs value per output pixel column.
export function generateThumbnail(audioBuffer, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    const ctx  = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
    const mid  = height / 2;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // center line
    ctx.fillStyle = '#1a3a2a';
    ctx.fillRect(0, mid, width, 1);

    ctx.fillStyle = '#4fc';
    for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        const end   = Math.min(start + samplesPerPixel, data.length);
        let peak = 0;
        for (let i = start; i < end; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peak) peak = abs;
        }
        const barH = Math.max(1, peak * height);
        ctx.fillRect(x, mid - barH / 2, 1, barH);
    }

    return canvas;
}
