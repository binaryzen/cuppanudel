import { createDragHandle } from './drag-handle.js';

export function createTrimPanel(container, pool, audioContext) {
    let clip = null, audioBuffer = null;
    let saved = null;
    let previewNode = null;
    let handles = [];
    const historyStack = [], redoStack = [];

    const panel = document.createElement('div');
    panel.className = 'trim-panel';
    panel.innerHTML = `
<div class="trim-header">
  <span class="trim-title">TRIM</span>
  <button class="trim-close-btn">✕ Close</button>
</div>
<canvas class="trim-waveform" width="400" height="80"></canvas>
<div class="trim-controls">
  <label>Fade in: <input type="range" class="fade-in-sl" min="0" max="100" step="1" value="0"> <span class="fade-in-val">0ms</span></label>
  <label>Fade out: <input type="range" class="fade-out-sl" min="0" max="100" step="1" value="0"> <span class="fade-out-val">0ms</span></label>
</div>
<div class="trim-actions">
  <button class="trim-preview-btn">&#9654; Preview</button>
  <button class="trim-dup-btn">Duplicate</button>
  <button class="trim-crop-btn">Crop</button>
  <button class="trim-undo-btn" disabled>Undo</button>
  <button class="trim-redo-btn" disabled>Redo</button>
  <button class="trim-discard-btn">Discard</button>
</div>
`;
    container.appendChild(panel);

    const canvas     = panel.querySelector('.trim-waveform');
    const ctx2d      = canvas.getContext('2d');
    const titleSpan  = panel.querySelector('.trim-title');
    const closeBtn   = panel.querySelector('.trim-close-btn');
    const previewBtn = panel.querySelector('.trim-preview-btn');
    const dupBtn     = panel.querySelector('.trim-dup-btn');
    const cropBtn    = panel.querySelector('.trim-crop-btn');
    const undoBtn    = panel.querySelector('.trim-undo-btn');
    const redoBtn    = panel.querySelector('.trim-redo-btn');
    const discardBtn = panel.querySelector('.trim-discard-btn');
    const fadeInSl   = panel.querySelector('.fade-in-sl');
    const fadeOutSl  = panel.querySelector('.fade-out-sl');
    const fadeInVal  = panel.querySelector('.fade-in-val');
    const fadeOutVal = panel.querySelector('.fade-out-val');

    function syncUndoRedo() {
        undoBtn.disabled = historyStack.length === 0;
        redoBtn.disabled = redoStack.length  === 0;
    }
    function exec(cmd) { cmd.execute(); historyStack.push(cmd); redoStack.length = 0; syncUndoRedo(); }
    function undoLast() { if (!historyStack.length) return; const c = historyStack.pop(); c.undo(); redoStack.push(c); syncUndoRedo(); }
    function redoLast() { if (!redoStack.length) return;    const c = redoStack.pop();  c.execute(); historyStack.push(c); syncUndoRedo(); }

    function kbHandler(e) {
        if (!panel.classList.contains('open')) return;
        if (e.ctrlKey && e.shiftKey && e.key === 'Z') { redoLast(); e.preventDefault(); }
        else if (e.ctrlKey && e.key === 'z')           { undoLast(); e.preventDefault(); }
    }
    document.addEventListener('keydown', kbHandler);

    function renderWaveform() {
        if (!audioBuffer) return;
        const W = canvas.width, H = canvas.height;
        const ch  = audioBuffer.getChannelData(0);
        const mid = H / 2;
        const fpx = ch.length / W;
        ctx2d.clearRect(0, 0, W, H);
        ctx2d.strokeStyle = '#4fc'; ctx2d.lineWidth = 1;
        for (let px = 0; px < W; px++) {
            const s = Math.floor(px * fpx), e2 = Math.min(ch.length, Math.floor((px + 1) * fpx));
            let mn = 0, mx = 0;
            for (let i = s; i < e2; i++) { if (ch[i] < mn) mn = ch[i]; if (ch[i] > mx) mx = ch[i]; }
            ctx2d.beginPath();
            ctx2d.moveTo(px + 0.5, mid + mn * mid); ctx2d.lineTo(px + 0.5, mid + mx * mid);
            ctx2d.stroke();
        }
        // Draw trim region overlay
        const total = audioBuffer.length;
        const inX   = (clip.startFrame / total) * W;
        const outX  = (clip.endFrame   / total) * W;
        ctx2d.fillStyle = 'rgba(255,255,255,0.04)';
        ctx2d.fillRect(inX, 0, outX - inX, H);
        handles.forEach(h => h.draw(ctx2d));
    }

    function destroyHandles() { handles.forEach(h => h.destroy()); handles = []; }

    function buildHandles() {
        destroyHandles();
        if (!audioBuffer || !clip) return;
        const W = canvas.width, H = canvas.height, total = audioBuffer.length;

        const inH = createDragHandle(canvas, {
            x: (clip.startFrame / total) * W, y: H / 2,
            visualRadius: 6, hitRadius: 22, color: '#4fc',
            onDragStart: () => { inH._oldVal = clip.startFrame; },
            onDragEnd: (nx) => {
                const nv = Math.round(Math.max(0, Math.min(clip.endFrame - 100, (nx / W) * total)));
                const ov = inH._oldVal;
                exec({
                    execute() { clip.startFrame = nv; inH.setPosition((nv / total) * W, H / 2); renderWaveform(); },
                    undo()    { clip.startFrame = ov; inH.setPosition((ov / total) * W, H / 2); renderWaveform(); }
                });
            },
            onDrag: (dx, dy, nx) => { inH.setPosition(Math.max(0, Math.min(outH.getPosition().x - 4, nx)), H / 2); renderWaveform(); },
        });

        const outH = createDragHandle(canvas, {
            x: (clip.endFrame / total) * W, y: H / 2,
            visualRadius: 6, hitRadius: 22, color: '#4fc',
            onDragStart: () => { outH._oldVal = clip.endFrame; },
            onDragEnd: (nx) => {
                const nv = Math.round(Math.min(total, Math.max(clip.startFrame + 100, (nx / W) * total)));
                const ov = outH._oldVal;
                exec({
                    execute() { clip.endFrame = nv; outH.setPosition((nv / total) * W, H / 2); renderWaveform(); },
                    undo()    { clip.endFrame = ov; outH.setPosition((ov / total) * W, H / 2); renderWaveform(); }
                });
            },
            onDrag: (dx, dy, nx) => { outH.setPosition(Math.min(W, Math.max(inH.getPosition().x + 4, nx)), H / 2); renderWaveform(); },
        });

        handles = [inH, outH];

        // Loop-point handles — only shown when clip has a loop mode set
        if (clip.loopMode !== 'none') {
            const ls0 = clip.loopStart ?? 0;
            const le0 = clip.loopEnd   ?? (clip.endFrame - clip.startFrame);

            const lsH = createDragHandle(canvas, {
                x: ((clip.startFrame + ls0) / total) * W, y: H * 0.25,
                visualRadius: 5, hitRadius: 18, color: '#fa8',
                onDragStart: () => { lsH._ov = clip.loopStart ?? 0; },
                onDragEnd: (nx) => {
                    const maxLs = (clip.loopEnd ?? (clip.endFrame - clip.startFrame)) - 100;
                    const nv = Math.round(Math.max(0, Math.min(maxLs, ((nx / W) * total) - clip.startFrame)));
                    const ov = lsH._ov;
                    exec({ execute() { clip.loopStart = nv; lsH.setPosition(((clip.startFrame+nv)/total)*W, H*0.25); renderWaveform(); },
                           undo()    { clip.loopStart = ov; lsH.setPosition(((clip.startFrame+ov)/total)*W, H*0.25); renderWaveform(); } });
                },
                onDrag: (dx, dy, nx) => { lsH.setPosition(Math.max(0, Math.min(leH.getPosition().x - 4, nx)), H * 0.25); renderWaveform(); },
            });

            const leH = createDragHandle(canvas, {
                x: ((clip.startFrame + le0) / total) * W, y: H * 0.75,
                visualRadius: 5, hitRadius: 18, color: '#fa8',
                onDragStart: () => { leH._ov = clip.loopEnd ?? (clip.endFrame - clip.startFrame); },
                onDragEnd: (nx) => {
                    const maxLe = clip.endFrame - clip.startFrame;
                    const nv = Math.round(Math.min(maxLe, Math.max((clip.loopStart ?? 0) + 100, ((nx / W) * total) - clip.startFrame)));
                    const ov = leH._ov;
                    exec({ execute() { clip.loopEnd = nv; leH.setPosition(((clip.startFrame+nv)/total)*W, H*0.75); renderWaveform(); },
                           undo()    { clip.loopEnd = ov; leH.setPosition(((clip.startFrame+ov)/total)*W, H*0.75); renderWaveform(); } });
                },
                onDrag: (dx, dy, nx) => { leH.setPosition(Math.min(W, Math.max(lsH.getPosition().x + 4, nx)), H * 0.75); renderWaveform(); },
            });

            handles.push(lsH, leH);
        }

        renderWaveform();
    }

    function stopPreview() {
        if (!previewNode) return;
        previewNode.onended = null;
        try { previewNode.stop(); } catch (_) {}
        previewNode = null;
        previewBtn.classList.remove('playing');
    }

    previewBtn.addEventListener('click', () => {
        if (previewNode) { stopPreview(); return; }
        const ab = pool.getBuffer(clip.bufferId);
        if (!ab) return;
        previewNode = audioContext.createBufferSource();
        previewNode.buffer = ab;
        previewNode.connect(audioContext.destination);
        const sr = ab.sampleRate;
        previewNode.start(0, clip.startFrame / sr, (clip.endFrame - clip.startFrame) / sr);
        previewBtn.classList.add('playing');
        previewNode.onended = () => { previewNode = null; previewBtn.classList.remove('playing'); };
    });

    dupBtn.addEventListener('click', () => {
        if (!clip) return;
        pool.duplicate(clip.id);
        close();
    });

    cropBtn.addEventListener('click', () => {
        if (!audioBuffer || !clip) return;
        stopPreview();
        const count   = clip.endFrame - clip.startFrame;
        const srcCh   = audioBuffer.getChannelData(0);
        const srcData = new Float32Array(count);
        for (let i = 0; i < count; i++) srcData[i] = srcCh[clip.startFrame + i];
        const newAb   = audioContext.createBuffer(1, count, audioBuffer.sampleRate);
        newAb.copyToChannel(srcData, 0);
        pool.buffers.set(clip.bufferId, newAb);
        pool.updateClip(clip.id, { startFrame: 0, endFrame: count });
        historyStack.length = 0; redoStack.length = 0; syncUndoRedo();
        open(clip.id);
    });

    discardBtn.addEventListener('click', () => {
        if (clip && saved) pool.updateClip(clip.id, { ...saved });
        close();
    });

    closeBtn.addEventListener('click', close);

    fadeInSl.addEventListener('input', () => {
        const ms = parseInt(fadeInSl.value, 10);
        fadeInVal.textContent = ms + 'ms';
        const frames = Math.round(ms / 1000 * (audioBuffer ? audioBuffer.sampleRate : 44100));
        const ov = clip.fadeInFrames;
        exec({
            execute() { clip.fadeInFrames = frames; fadeInSl.value = ms; fadeInVal.textContent = ms + 'ms'; },
            undo()    { clip.fadeInFrames = ov; const oMs = Math.round(ov / ((audioBuffer ? audioBuffer.sampleRate : 44100) / 1000)); fadeInSl.value = oMs; fadeInVal.textContent = oMs + 'ms'; }
        });
    });

    fadeOutSl.addEventListener('input', () => {
        const ms = parseInt(fadeOutSl.value, 10);
        fadeOutVal.textContent = ms + 'ms';
        const frames = Math.round(ms / 1000 * (audioBuffer ? audioBuffer.sampleRate : 44100));
        const ov = clip.fadeOutFrames;
        exec({
            execute() { clip.fadeOutFrames = frames; fadeOutSl.value = ms; fadeOutVal.textContent = ms + 'ms'; },
            undo()    { clip.fadeOutFrames = ov; const oMs = Math.round(ov / ((audioBuffer ? audioBuffer.sampleRate : 44100) / 1000)); fadeOutSl.value = oMs; fadeOutVal.textContent = oMs + 'ms'; }
        });
    });

    function open(clipId) {
        clip = pool.clips.find(c => c.id === clipId);
        if (!clip) return;
        audioBuffer = pool.getBuffer(clip.bufferId);
        saved = {
            startFrame:    clip.startFrame,
            endFrame:      clip.endFrame,
            loopStart:     clip.loopStart,
            loopEnd:       clip.loopEnd,
            fadeInFrames:  clip.fadeInFrames,
            fadeOutFrames: clip.fadeOutFrames,
        };
        historyStack.length = 0; redoStack.length = 0; syncUndoRedo();
        titleSpan.textContent = 'TRIM — ' + clip.label;
        const sr = audioBuffer ? audioBuffer.sampleRate : 44100;
        fadeInSl.value  = Math.round((clip.fadeInFrames  || 0) / sr * 1000);
        fadeOutSl.value = Math.round((clip.fadeOutFrames || 0) / sr * 1000);
        fadeInVal.textContent  = fadeInSl.value  + 'ms';
        fadeOutVal.textContent = fadeOutSl.value + 'ms';
        panel.classList.add('open');
        buildHandles();
    }

    function close() {
        stopPreview();
        destroyHandles();
        panel.classList.remove('open');
        clip = null; audioBuffer = null; saved = null;
    }

    return { open, close, isOpen: () => panel.classList.contains('open') };
}
