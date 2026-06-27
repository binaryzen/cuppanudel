export function createDragHandle(canvas, opts) {
    let { x, y } = opts;
    const { visualRadius = 6, hitRadius = 22, color = '#4fc', onDragStart, onDrag, onDragEnd } = opts;
    let dragging = false, lastX = 0, lastY = 0;

    function coords(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        return { cx: (clientX - r.left) * (canvas.width / r.width), cy: (clientY - r.top) * (canvas.height / r.height) };
    }
    function hit(clientX, clientY) {
        const { cx, cy } = coords(clientX, clientY);
        return Math.hypot(cx - x, cy - y) <= hitRadius;
    }

    function onMD(e) {
        if (!hit(e.clientX, e.clientY)) return;
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        onDragStart && onDragStart(x, y);
        e.stopPropagation();
        window.addEventListener('mousemove', onMM);
        window.addEventListener('mouseup', onMU);
    }
    function onMM(e) {
        if (!dragging) return;
        const { cx, cy } = coords(e.clientX, e.clientY);
        x = cx; y = cy;
        onDrag && onDrag(e.clientX - lastX, e.clientY - lastY, x, y);
        lastX = e.clientX; lastY = e.clientY;
    }
    function onMU() {
        if (!dragging) return;
        dragging = false;
        onDragEnd && onDragEnd(x, y);
        window.removeEventListener('mousemove', onMM);
        window.removeEventListener('mouseup', onMU);
    }
    function onTS(e) {
        const t = e.touches[0];
        if (!hit(t.clientX, t.clientY)) return;
        dragging = true; lastX = t.clientX; lastY = t.clientY;
        onDragStart && onDragStart(x, y);
        e.stopPropagation(); e.preventDefault();
    }
    function onTM(e) {
        if (!dragging) return;
        const t = e.touches[0];
        const { cx, cy } = coords(t.clientX, t.clientY);
        x = cx; y = cy;
        onDrag && onDrag(t.clientX - lastX, t.clientY - lastY, x, y);
        lastX = t.clientX; lastY = t.clientY;
    }
    function onTE() { if (!dragging) return; dragging = false; onDragEnd && onDragEnd(x, y); }

    canvas.addEventListener('mousedown',  onMD);
    canvas.addEventListener('touchstart', onTS, { passive: false });
    canvas.addEventListener('touchmove',  onTM, { passive: false });
    canvas.addEventListener('touchend',   onTE);

    function draw(ctx) {
        ctx.beginPath(); ctx.arc(x, y, visualRadius, 0, Math.PI*2);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();
    }

    function destroy() {
        canvas.removeEventListener('mousedown',  onMD);
        canvas.removeEventListener('touchstart', onTS);
        canvas.removeEventListener('touchmove',  onTM);
        canvas.removeEventListener('touchend',   onTE);
        window.removeEventListener('mousemove',  onMM);
        window.removeEventListener('mouseup',    onMU);
    }

    return { draw, setPosition(nx,ny){x=nx;y=ny;}, getPosition(){return{x,y};}, destroy };
}
