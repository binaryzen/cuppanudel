const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function frequencyToNote(freq) {
    const midi        = 12 * Math.log2(freq / 440) + 69;
    const midiRounded = Math.round(midi);
    const cents       = Math.round((midi - midiRounded) * 100);
    const noteIndex   = ((midiRounded % 12) + 12) % 12;
    const octave      = Math.floor(midiRounded / 12) - 1;
    return {
        label:  NOTES[noteIndex] + octave,
        cents,
        inTune: Math.abs(cents) <= 5,
    };
}

const ZONES = [
    { from: -50, to: -30, off: '#602020', on: '#e05050' },
    { from: -30, to: -10, off: '#604020', on: '#e0a030' },
    { from: -10, to:  10, off: '#1a4a28', on: '#4fc'    },
    { from:  10, to:  30, off: '#604020', on: '#e0a030' },
    { from:  30, to:  50, off: '#602020', on: '#e05050' },
];

export function createTunerDisplay(frequencyAnalyzer, canvas) {
    const ctx = canvas.getContext('2d');

    function draw() {
        const freq = frequencyAnalyzer.getFrequency();
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (!freq) {
            drawIdle(w, h);
            return;
        }

        const note = frequencyToNote(freq);
        drawActive(note, freq, w, h);
    }

    function drawIdle(w, h) {
        ctx.fillStyle = '#2a2a2a';
        ctx.font = 'bold 1.8rem monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('—', w / 2, h / 2);
    }

    function drawActive(note, freq, w, h) {
        const NOTE_W    = 90;
        const CENTS_W   = 72;
        const PAD       = 10;
        const barX      = NOTE_W + PAD;
        const barW      = w - NOTE_W - CENTS_W - PAD * 2;
        const barH      = 18;
        const barY      = (h - barH) / 2;
        const noteColor = note.inTune ? '#4fc' : '#eee';

        // note label
        ctx.fillStyle   = noteColor;
        ctx.font        = 'bold 2.2rem monospace';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.label, NOTE_W / 2, h / 2 - 2);

        // hz label below note
        ctx.fillStyle = '#555';
        ctx.font      = '0.7rem monospace';
        ctx.fillText(Math.round(freq) + ' Hz', NOTE_W / 2, h / 2 + 18);

        // cents label
        const centsStr = (note.cents >= 0 ? '+' : '') + note.cents + '¢';
        ctx.fillStyle   = noteColor;
        ctx.font        = '1rem monospace';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(centsStr, w - CENTS_W / 2, h / 2);

        // color zones
        for (const z of ZONES) {
            const x1 = barX + ((z.from + 50) / 100) * barW;
            const x2 = barX + ((z.to   + 50) / 100) * barW;
            // light up zone if needle is inside it
            const inZone = note.cents >= z.from && note.cents < z.to;
            ctx.fillStyle = inZone ? z.on : z.off;
            ctx.fillRect(x1, barY, x2 - x1, barH);
        }

        // tick marks at -50, -25, 0, +25, +50
        ctx.fillStyle = '#444';
        for (const t of [-50, -25, 0, 25, 50]) {
            const x = barX + ((t + 50) / 100) * barW;
            ctx.fillRect(x - 0.5, barY - 3, 1, barH + 6);
        }

        // needle
        const clamped  = Math.max(-50, Math.min(50, note.cents));
        const needleX  = barX + ((clamped + 50) / 100) * barW;
        ctx.fillStyle  = note.inTune ? '#4fc' : '#fff';
        ctx.fillRect(needleX - 1.5, barY - 5, 3, barH + 10);
    }

    return { draw };
}
