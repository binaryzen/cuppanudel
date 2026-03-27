const PAD_L    = 10;
const PAD_R    = 10;
const MIN_GAP  = 0.025;
const FLASH_MS = 200;

const C_DOWN     = '#4fc';
const C_BEAT     = '#999';
const C_DRAG     = '#ffe066';
const C_PLAYHEAD = 'rgba(255,150,30,0.9)';

export function createMetroDisplay(tc, canvas) {
    const ctx = canvas.getContext('2d');

    let dragging     = null;   // beat index being dragged, or null
    let lastPlayhead = null;
    let prevPlayhead = null;
    const flashTimes = [];     // per-beat timestamp of last flash (ms)

    // ── dynamic geometry — proportional to current canvas size ────────────────
    function getGeom() {
        const W          = canvas.width;
        const H          = canvas.height;
        const usable     = W - PAD_L - PAD_R;
        const TIMELINE_Y = Math.round(H * 0.735);              // ~50/68
        const VOL_MAX_Y  = Math.round(H * 0.147);              // ~10/68
        const VOL_MIN_Y  = Math.round(H * 0.647);              // ~44/68
        const HANDLE_R   = Math.max(4, Math.round(H * 0.088)); // ~6/68, min 4
        return { W, H, usable, TIMELINE_Y, VOL_MAX_Y, VOL_MIN_Y, HANDLE_R };
    }

    function beatX(offset, usable)            { return PAD_L + offset * usable; }
    function xToOffset(x, usable)             { return (x - PAD_L) / usable; }
    function volToY(v, VOL_MAX_Y, VOL_MIN_Y)  { return VOL_MIN_Y - v * (VOL_MIN_Y - VOL_MAX_Y); }
    function yToVol(y, VOL_MAX_Y, VOL_MIN_Y)  { return 1 - (y - VOL_MAX_Y) / (VOL_MIN_Y - VOL_MAX_Y); }

    // converts a clientX/clientY to canvas logical coordinates, accounting for CSS scaling
    function getCanvasPoint(clientX, clientY) {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            mx: (clientX - rect.left) * scaleX,
            my: (clientY - rect.top)  * scaleY,
        };
    }

    // ── mouse interaction ─────────────────────────────────────────────────────
    canvas.addEventListener('mousedown', e => {
        const { mx, my } = getCanvasPoint(e.clientX, e.clientY);
        const { usable, VOL_MAX_Y, VOL_MIN_Y, HANDLE_R } = getGeom();

        for (let i = 0; i < tc.beatsPerMeasure; i++) {
            const hx = beatX(tc.beatOffsets[i], usable);
            const hy = volToY(tc.beatVolumes[i], VOL_MAX_Y, VOL_MIN_Y);
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
        const { mx, my } = getCanvasPoint(e.clientX, e.clientY);
        const { usable, VOL_MAX_Y, VOL_MIN_Y } = getGeom();

        if (dragging > 0) {
            const raw = xToOffset(mx, usable);
            const lo  = tc.beatOffsets[dragging - 1] + MIN_GAP;
            const hi  = dragging < tc.beatsPerMeasure - 1
                ? tc.beatOffsets[dragging + 1] - MIN_GAP
                : 1 - MIN_GAP;
            tc.beatOffsets[dragging] = Math.max(lo, Math.min(hi, raw));
        }

        tc.beatVolumes[dragging] = Math.max(0, Math.min(1, yToVol(my, VOL_MAX_Y, VOL_MIN_Y)));
        drawInternal(lastPlayhead);
    });

    window.addEventListener('mouseup', () => { dragging = null; });

    // ── touch interaction ─────────────────────────────────────────────────────
    canvas.addEventListener('touchstart', e => {
        const touch = e.changedTouches[0];
        const { mx, my } = getCanvasPoint(touch.clientX, touch.clientY);
        const { usable, VOL_MAX_Y, VOL_MIN_Y, HANDLE_R } = getGeom();

        for (let i = 0; i < tc.beatsPerMeasure; i++) {
            const hx = beatX(tc.beatOffsets[i], usable);
            const hy = volToY(tc.beatVolumes[i], VOL_MAX_Y, VOL_MIN_Y);
            const dx = mx - hx;
            const dy = my - hy;
            if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_R + 4) {
                dragging = i;
                e.preventDefault();
                break;
            }
        }
    }, { passive: false });

    window.addEventListener('touchmove', e => {
        if (dragging === null) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const { mx, my } = getCanvasPoint(touch.clientX, touch.clientY);
        const { usable, VOL_MAX_Y, VOL_MIN_Y } = getGeom();

        if (dragging > 0) {
            const raw = xToOffset(mx, usable);
            const lo  = tc.beatOffsets[dragging - 1] + MIN_GAP;
            const hi  = dragging < tc.beatsPerMeasure - 1
                ? tc.beatOffsets[dragging + 1] - MIN_GAP
                : 1 - MIN_GAP;
            tc.beatOffsets[dragging] = Math.max(lo, Math.min(hi, raw));
        }

        tc.beatVolumes[dragging] = Math.max(0, Math.min(1, yToVol(my, VOL_MAX_Y, VOL_MIN_Y)));
        drawInternal(lastPlayhead);
    }, { passive: false });

    window.addEventListener('touchend', () => { dragging = null; });

    // ── reference grid ────────────────────────────────────────────────────────
    function drawReferenceGrid(geom) {
        const { usable, TIMELINE_Y, VOL_MAX_Y, HANDLE_R } = geom;
        const N       = tc.beatsPerMeasure;
        const gridTop = VOL_MAX_Y + HANDLE_R + 2;
        const tripTop = VOL_MAX_Y + HANDLE_R + 10;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(120,220,120,0.60)';
        ctx.setLineDash([4, 4]);
        for (let i = 1; i < N; i++) {
            const x = beatX(i / N, usable);
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
                const x = beatX(from + (to - from) * frac, usable);
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
        const geom = getGeom();
        const { W, H, usable, TIMELINE_Y, VOL_MAX_Y, VOL_MIN_Y, HANDLE_R } = geom;

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
        drawReferenceGrid(geom);

        // timeline bar
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(PAD_L, TIMELINE_Y, usable, 2);

        const now = performance.now();

        for (let i = 0; i < tc.beatsPerMeasure; i++) {
            const x      = beatX(tc.beatOffsets[i], usable);
            const vol    = tc.beatVolumes[i];
            const hy     = volToY(vol, VOL_MAX_Y, VOL_MIN_Y);
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
            const px = beatX(playheadPos, usable);
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
