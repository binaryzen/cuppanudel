const PAD_L         = 10;
const PAD_R         = 10;
const TIMELINE_Y    = 50;
const VOL_MAX_Y     = 10;   // handle center y at 100% volume
const VOL_MIN_Y     = 44;   // handle center y at   0% volume (circle touches timeline)
const HANDLE_R      = 6;
const MIN_GAP       = 0.025;
const FLASH_MS      = 200;

const C_DOWN        = '#4fc';
const C_BEAT        = '#999';
const C_DRAG        = '#ffe066';
const C_PLAYHEAD    = 'rgba(255,150,30,0.9)';

export function createMetroDisplay(tc, canvas) {
    const ctx    = canvas.getContext('2d');
    const W      = canvas.width;
    const H      = canvas.height;
    const usable = W - PAD_L - PAD_R;

    let dragging       = null;   // beat index being dragged, or null
    let lastPlayhead   = null;
    let prevPlayhead   = null;
    const flashTimes   = [];     // per-beat timestamp of last flash (ms)

    function beatX(offset) { return PAD_L + offset * usable; }
    function xToOffset(x)  { return (x - PAD_L) / usable; }
    function volToY(v)     { return VOL_MIN_Y - v * (VOL_MIN_Y - VOL_MAX_Y); }
    function yToVol(y)     { return 1 - (y - VOL_MAX_Y) / (VOL_MIN_Y - VOL_MAX_Y); }

    // ── mouse interaction ─────────────────────────────────────────────────────
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;

        // beat 0: volume-only (x is fixed)
        // beats 1+: both x (position) and y (volume)
        for (let i = 0; i < tc.beatsPerMeasure; i++) {
            const hx = beatX(tc.beatOffsets[i]);
            const hy = volToY(tc.beatVolumes[i]);
            const dx = mx - hx;
            const dy = my - hy;
            if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_R + 4) {
                dragging = i;
                e.preventDefault();
                break;
            }
        }
    });

    window.addEventListener('mousemove', e => {
        if (dragging === null) return;
        const rect = canvas.getBoundingClientRect();
        const mx   = e.clientX - rect.left;
        const my   = e.clientY - rect.top;

        // x → beat position (skip for beat 0)
        if (dragging > 0) {
            const raw = xToOffset(mx);
            const lo  = tc.beatOffsets[dragging - 1] + MIN_GAP;
            const hi  = dragging < tc.beatsPerMeasure - 1
                ? tc.beatOffsets[dragging + 1] - MIN_GAP
                : 1 - MIN_GAP;
            tc.beatOffsets[dragging] = Math.max(lo, Math.min(hi, raw));
        }

        // y → volume (all beats)
        tc.beatVolumes[dragging] = Math.max(0, Math.min(1, yToVol(my)));

        drawInternal(lastPlayhead);
    });

    window.addEventListener('mouseup', () => { dragging = null; });

    // ── reference grid ────────────────────────────────────────────────────────
    function drawReferenceGrid() {
        const N       = tc.beatsPerMeasure;
        const gridTop = VOL_MAX_Y + HANDLE_R + 2;
        const tripTop = VOL_MAX_Y + HANDLE_R + 10;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(120,220,120,0.60)';
        ctx.setLineDash([4, 4]);
        for (let i = 1; i < N; i++) {
            const x = beatX(i / N);
            ctx.beginPath();
            ctx.moveTo(x, gridTop);
            ctx.lineTo(x, TIMELINE_Y);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(120,220,120,0.60)';
        ctx.setLineDash([2, 5]);
        for (let i = 0; i < N; i++) {
            const from = i / N;
            const to   = (i + 1) / N;
            for (const frac of [1/3, 2/3]) {
                const x = beatX(from + (to - from) * frac);
                ctx.beginPath();
                ctx.moveTo(x, tripTop);
                ctx.lineTo(x, TIMELINE_Y);
                ctx.stroke();
            }
        }

        ctx.setLineDash([]);
    }

    // ── drawing ───────────────────────────────────────────────────────────────
    function drawInternal(playheadPos) {
        // sync flash array length to beat count
        while (flashTimes.length < tc.beatsPerMeasure) flashTimes.push(null);
        flashTimes.length = tc.beatsPerMeasure;

        // detect beat crossings for flash
        if (playheadPos !== null && prevPlayhead !== null) {
            const wrapped = playheadPos < prevPlayhead;
            for (let i = 0; i < tc.beatsPerMeasure; i++) {
                const b = tc.beatOffsets[i];
                const crossed = wrapped
                    ? (b <= playheadPos || b > prevPlayhead)
                    : (prevPlayhead < b && b <= playheadPos);
                if (crossed) flashTimes[i] = performance.now();
            }
        }
        prevPlayhead = playheadPos;

        ctx.clearRect(0, 0, W, H);
        drawReferenceGrid();

        // timeline bar
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(PAD_L, TIMELINE_Y, usable, 2);

        const now = performance.now();

        for (let i = 0; i < tc.beatsPerMeasure; i++) {
            const x      = beatX(tc.beatOffsets[i]);
            const vol    = tc.beatVolumes[i];
            const hy     = volToY(vol);
            const isDown = i === 0;
            const isDrag = dragging === i;
            const color  = isDown ? C_DOWN : isDrag ? C_DRAG : C_BEAT;

            const flashAge   = flashTimes[i] !== null ? now - flashTimes[i] : Infinity;
            const flashAlpha = flashAge < FLASH_MS ? 1 - flashAge / FLASH_MS : 0;

            // faint volume guide rail
            ctx.beginPath();
            ctx.moveTo(x, VOL_MAX_Y);
            ctx.lineTo(x, VOL_MIN_Y + HANDLE_R);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth   = 1;
            ctx.setLineDash([2, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // volume fill line (handle → timeline)
            if (vol > 0.01) {
                ctx.beginPath();
                ctx.moveTo(x, hy);
                ctx.lineTo(x, TIMELINE_Y);
                ctx.strokeStyle = color;
                ctx.lineWidth   = isDown ? 2 : 1;
                ctx.setLineDash(isDown ? [] : [3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // flash line overlay
            if (flashAlpha > 0) {
                ctx.beginPath();
                ctx.moveTo(x, hy);
                ctx.lineTo(x, TIMELINE_Y);
                ctx.strokeStyle = `rgba(255,255,255,${flashAlpha * 0.55})`;
                ctx.lineWidth   = 3;
                ctx.stroke();
            }

            // handle circle
            ctx.beginPath();
            ctx.arc(x, hy, HANDLE_R, 0, Math.PI * 2);
            ctx.fillStyle   = isDrag ? C_DRAG : isDown ? C_DOWN : vol < 0.01 ? '#111' : '#333';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            // flash circle overlay
            if (flashAlpha > 0) {
                ctx.beginPath();
                ctx.arc(x, hy, HANDLE_R, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.75})`;
                ctx.fill();
            }

            // beat number label
            ctx.fillStyle    = color;
            ctx.font         = '10px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String(i + 1), x, TIMELINE_Y + 5);
        }

        // playhead
        if (playheadPos !== null) {
            const px = beatX(playheadPos);
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, H);
            ctx.strokeStyle = C_PLAYHEAD;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }
    }

    function draw(playheadPos = null) {
        lastPlayhead = playheadPos;
        drawInternal(playheadPos);
    }

    draw(null);

    return { draw };
}
