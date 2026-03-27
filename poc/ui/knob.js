// Canvas rotary knob. Mouse: drag up/down. Touch: tap to open a vertical slider overlay.

const START_ANGLE = (135 * Math.PI) / 180;   // 7 o'clock in canvas coords
const SWEEP       = (270 * Math.PI) / 180;

// ── shared touch overlay (singleton, one at a time across all knobs) ──────────
let _el      = null;   // overlay container
let _input   = null;   // range input
let _label   = null;   // value label
let _active  = null;   // canvas element currently using the overlay

function _ensureOverlay() {
    if (_el) return;

    _el = document.createElement('div');
    Object.assign(_el.style, {
        position:      'fixed',
        zIndex:        '500',
        background:    '#1a1a1a',
        border:        '1px solid #555',
        borderRadius:  '4px',
        padding:       '0.75rem',
        display:       'none',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           '0.5rem',
        touchAction:   'none',
        userSelect:    'none',
    });

    _input = document.createElement('input');
    _input.type = 'range';
    _input.setAttribute('orient', 'vertical');   // Firefox
    Object.assign(_input.style, {
        writingMode:        'vertical-lr',
        direction:          'rtl',               // top = max, bottom = min
        webkitAppearance:   'slider-vertical',
        appearance:         'slider-vertical',
        width:              '36px',
        height:             '160px',
        accentColor:        '#4fc',
        cursor:             'pointer',
    });
    _el.appendChild(_input);

    _label = document.createElement('span');
    Object.assign(_label.style, {
        fontFamily: 'monospace',
        fontSize:   '0.8rem',
        color:      '#888',
        minWidth:   '4ch',
        textAlign:  'center',
    });
    _el.appendChild(_label);

    document.body.appendChild(_el);

    // Dismiss when touching outside the overlay (but not the active canvas — handled per-knob)
    document.addEventListener('touchstart', e => {
        if (!_active) return;
        if (_el.contains(e.target) || e.target === _active) return;
        _hide();
    }, { capture: true, passive: true });

    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === 'Escape') && _active) _hide();
    });
}

function _show(canvas, min, max, value, onInput) {
    _ensureOverlay();

    if (_active === canvas) { _hide(); return; }   // second tap = dismiss
    _active = canvas;

    _input.min   = min;
    _input.max   = max;
    _input.step  = 1;
    _input.value = value;
    _label.textContent = value;

    _input.oninput = () => {
        const v = parseInt(_input.value, 10);
        _label.textContent = v;
        onInput(v);
    };

    // Estimated dimensions for positioning (avoids layout thrash)
    const OW = 72, OH = 230;
    const r  = canvas.getBoundingClientRect();
    let left = r.left + r.width  / 2 - OW / 2;
    let top  = r.top  - OH - 8;

    if (top  < 8) top  = r.bottom + 8;
    if (left < 8) left = 8;
    if (left + OW > window.innerWidth  - 8) left = window.innerWidth  - 8 - OW;
    if (top  + OH > window.innerHeight - 8) top  = window.innerHeight - 8 - OH;

    Object.assign(_el.style, { display: 'flex', left: left + 'px', top: top + 'px' });
    _input.focus();
}

function _hide() {
    if (_el) _el.style.display = 'none';
    _active = null;
}

// ── knob factory ──────────────────────────────────────────────────────────────
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

    // Touch: tap opens the overlay slider
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        _show(canvas, min, max, Math.round(value), v => {
            value = v;
            onChange(v);
            draw();
        });
    }, { passive: false });

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

        // pointer dot
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
        // Keep overlay in sync if it's open for this knob
        if (_active === canvas && _input) {
            _input.value = Math.round(value);
            _label.textContent = Math.round(value);
        }
    }

    return { getValue: () => Math.round(value), setValue };
}
