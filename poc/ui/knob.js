// Canvas rotary knob. Drag up to increase, drag down to decrease.
// Standard DAW-style: 7-o'clock min → 5-o'clock max, 270° sweep.

const START_ANGLE = (135 * Math.PI) / 180;   // 7 o'clock in canvas coords
const SWEEP       = (270 * Math.PI) / 180;

export function createKnob(canvas, min, max, initial, onChange) {
    let value    = Math.max(min, Math.min(max, initial));
    let dragging = false;
    let lastY    = 0;

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;
    const r  = Math.min(cx, cy) - 4;

    canvas.style.cursor = 'ns-resize';

    canvas.addEventListener('mousedown', e => {
        dragging = true;
        lastY    = e.clientY;
        e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const delta = lastY - e.clientY;
        lastY = e.clientY;
        value = Math.max(min, Math.min(max, value + delta * (max - min) / 80));
        onChange(Math.round(value));
        draw();
    });

    window.addEventListener('mouseup', () => { dragging = false; });

    function draw() {
        const ctx  = canvas.getContext('2d');
        const norm = (value - min) / (max - min);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // track
        ctx.beginPath();
        ctx.arc(cx, cy, r, START_ANGLE, START_ANGLE + SWEEP);
        ctx.strokeStyle = '#333';
        ctx.lineWidth   = 3;
        ctx.stroke();

        // filled arc
        if (norm > 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, START_ANGLE, START_ANGLE + norm * SWEEP);
            ctx.strokeStyle = '#4fc';
            ctx.lineWidth   = 3;
            ctx.stroke();
        }

        // pointer dot on arc
        const angle = START_ANGLE + norm * SWEEP;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r * 0.65, cy + Math.sin(angle) * r * 0.65, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc';
        ctx.fill();
    }

    draw();

    function setValue(v) {
        value = Math.max(min, Math.min(max, v));
        onChange(Math.round(value));
        draw();
    }

    return { getValue: () => Math.round(value), setValue };
}
