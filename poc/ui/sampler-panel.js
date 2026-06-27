import { deduplicateLabel } from '../utils/label.js';
import { exportSampleWav, encodeSetZip } from '../audio/wav-encoder.js';

export function createSamplerPanel(container, pool, captureManager, liveBuffer, audioContext, tc, getNextMeasureTime) {
    let _onTrim = null;
    let _metroRunning = false;
    const playing = new Map();

    // ── Build DOM ────────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.className = 'sampler-panel';
    panel.innerHTML = `
<canvas class="live-buffer-strip" width="400" height="40"></canvas>
<div class="capture-btns">
  <button class="snap-btn" data-bars="1">1 bar</button>
  <button class="snap-btn" data-bars="2">2 bars</button>
  <button class="snap-btn" data-bars="4">4 bars</button>
  <button class="punch-btn">Mark Start</button>
  <button class="grab-btn">Grab 4b</button>
</div>
<div class="sampler-controls">
  <button class="import-sample-btn">Import</button>
  <input type="file" accept="audio/*" multiple style="display:none">
  <button class="export-set-btn">Export Set</button>
</div>
<div class="sampler-status"></div>
<ul class="sampler-list"></ul>
`;
    container.appendChild(panel);

    const strip      = panel.querySelector('.live-buffer-strip');
    const stripCtx   = strip.getContext('2d');
    const snapBtns   = panel.querySelectorAll('.snap-btn');
    const punchBtn   = panel.querySelector('.punch-btn');
    const grabBtn    = panel.querySelector('.grab-btn');
    const importBtn  = panel.querySelector('.import-sample-btn');
    const fileInput  = panel.querySelector('input[type=file]');
    const exportBtn  = panel.querySelector('.export-set-btn');
    const statusEl   = panel.querySelector('.sampler-status');
    const list       = panel.querySelector('.sampler-list');

    function showStatus(msg, isError) {
        statusEl.textContent = msg;
        statusEl.classList.toggle('error', !!isError);
        clearTimeout(statusEl._t);
        statusEl._t = setTimeout(() => { statusEl.textContent = ''; statusEl.classList.remove('error'); }, 3000);
    }

    // ── Live buffer strip ────────────────────────────────────────────────────
    function drawLiveBuffer() {
        const W = strip.width, H = strip.height;
        const sr = liveBuffer.getSampleRate();
        const total = liveBuffer.getTotalFramesWritten();
        const windowFrames = Math.min(total, 2 * sr);
        stripCtx.clearRect(0, 0, W, H);
        if (!windowFrames) return;
        const data = liveBuffer.getFrameRange(total - windowFrames, total);
        if (!data) return;
        const mid = H / 2;
        const fpx = windowFrames / W;
        stripCtx.strokeStyle = '#4fc';
        stripCtx.lineWidth   = 1;
        for (let px = 0; px < W; px++) {
            const s = Math.floor(px * fpx), e = Math.min(data.length, Math.floor((px+1)*fpx));
            let mn = 0, mx = 0;
            for (let i = s; i < e; i++) { if (data[i] < mn) mn=data[i]; if (data[i] > mx) mx=data[i]; }
            stripCtx.beginPath();
            stripCtx.moveTo(px + 0.5, mid + mn * mid);
            stripCtx.lineTo(px + 0.5, mid + mx * mid);
            stripCtx.stroke();
        }
    }

    // ── Capture buttons ──────────────────────────────────────────────────────
    function setMetronomeRunning(running) {
        _metroRunning = running;
        snapBtns.forEach(b => { b.disabled = !running; });
    }

    snapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.dataset.bars, 10);
            captureManager.snapLastN(n);
            refresh();
        });
    });

    punchBtn.addEventListener('click', () => {
        if (!captureManager.hasPunchStart()) {
            captureManager.markStart();
            punchBtn.textContent = 'Punch';
            punchBtn.classList.add('active');
        } else {
            captureManager.commitPunch();
            punchBtn.textContent = 'Mark Start';
            punchBtn.classList.remove('active');
            refresh();
        }
    });

    grabBtn.addEventListener('click', () => { captureManager.grabNow(4); refresh(); });

    // ── Thumbnail ────────────────────────────────────────────────────────────
    function makeThumbnail(audioBuffer) {
        const c   = document.createElement('canvas');
        c.width   = 80; c.height = 28;
        const ctx = c.getContext('2d');
        const ch  = audioBuffer.getChannelData(0);
        const fpx = ch.length / 80;
        const mid = 14;
        ctx.strokeStyle = '#4fc';
        ctx.lineWidth   = 1;
        for (let px = 0; px < 80; px++) {
            const s = Math.floor(px * fpx), e = Math.min(ch.length, Math.floor((px+1)*fpx));
            let mn = 0, mx = 0;
            for (let i = s; i < e; i++) { if (ch[i]<mn) mn=ch[i]; if (ch[i]>mx) mx=ch[i]; }
            ctx.beginPath();
            ctx.moveTo(px+0.5, mid + mn*mid); ctx.lineTo(px+0.5, mid + mx*mid);
            ctx.stroke();
        }
        return c;
    }

    // ── Playback ─────────────────────────────────────────────────────────────
    function stopPlayback(id, playBtn) {
        const node = playing.get(id);
        if (!node) return;
        node.onended = null;
        try { node.stop(); } catch(_) {}
        playing.delete(id);
        if (playBtn) playBtn.classList.remove('playing');
    }

    function startPlayback(clip, playBtn) {
        stopPlayback(clip.id, playBtn);
        const ab = pool.getBuffer(clip.bufferId);
        if (!ab) return;
        const node     = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        node.buffer         = ab;
        gainNode.gain.value = clip.gain   ?? 1.0;
        node.detune.value   = clip.detune ?? 0;
        if (clip.loopMode === 'free' || clip.loopMode === 'sync') {
            node.loop      = true;
            node.loopStart = clip.startFrame / ab.sampleRate;
            node.loopEnd   = clip.endFrame   / ab.sampleRate;
        }
        node.connect(gainNode);
        gainNode.connect(audioContext.destination);
        const offset = clip.startFrame / ab.sampleRate;
        const dur    = (clip.endFrame - clip.startFrame) / ab.sampleRate;
        if (clip.loopMode === 'sync' && getNextMeasureTime) {
            node.start(getNextMeasureTime(), offset);
        } else {
            node.start(0, offset, clip.loopMode !== 'none' ? undefined : dur);
        }
        playing.set(clip.id, node);
        playBtn.classList.add('playing');
        node.onended = () => {
            playing.delete(clip.id);
            playBtn.classList.remove('playing');
        };
    }

    // ── List render ──────────────────────────────────────────────────────────
    function refresh() {
        list.innerHTML = '';
        if (!pool.clips.length) {
            list.innerHTML = '<li style="color:#444;font-size:0.85rem;padding:0.5rem">No samples</li>';
            return;
        }
        // POC: single Unsorted set header
        const setHdr = document.createElement('li');
        setHdr.className = 'set-header';
        setHdr.textContent = 'UNSORTED';
        list.appendChild(setHdr);
        for (const clip of pool.clips) {
            const ab  = pool.getBuffer(clip.bufferId);
            const sr  = ab ? ab.sampleRate : 44100;
            const dur = (clip.endFrame - clip.startFrame) / sr;
            const durStr = dur < 10 ? dur.toFixed(1)+'s' : Math.round(dur)+'s';
            const loopBadge = clip.loopMode === 'sync' ? '↺ sync' : clip.loopMode === 'free' ? '↺ free' : '';
            const mismatch  = clip.loopMode === 'sync' && clip.capturedBpm != null && Math.abs(clip.capturedBpm / tc.bpm - 1) > 0.05;

            const li = document.createElement('li');
            li.dataset.id = clip.id;

            const playBtn = document.createElement('button');
            playBtn.className = 'play-btn';
            playBtn.textContent = '▶';
            if (playing.has(clip.id)) playBtn.classList.add('playing');
            playBtn.addEventListener('click', () => {
                if (playing.has(clip.id)) { stopPlayback(clip.id, playBtn); }
                else                      { startPlayback(clip, playBtn); }
            });

            const thumb = ab ? makeThumbnail(ab) : document.createElement('canvas');
            thumb.style.flexShrink = '0';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'clip-label';
            labelSpan.textContent = clip.label;

            const durSpan = document.createElement('span');
            durSpan.className = 'clip-dur';
            durSpan.textContent = durStr;

            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'loop-badge';
            badgeSpan.textContent = loopBadge;

            const warnSpan = document.createElement('span');
            warnSpan.className = 'bpm-warn';
            warnSpan.textContent = mismatch ? '⚠' : '';

            const trimBtn = document.createElement('button');
            trimBtn.className = 'trim-btn';
            trimBtn.textContent = 'Trim';
            trimBtn.addEventListener('click', () => { _onTrim && _onTrim(clip.id); });

            const delBtn = document.createElement('button');
            delBtn.className = 'del-btn danger';
            delBtn.textContent = 'Del';
            let delTimer = null;
            delBtn.addEventListener('click', () => {
                if (delBtn.classList.contains('armed')) {
                    clearTimeout(delTimer);
                    stopPlayback(clip.id, playBtn);
                    pool.remove(clip.id);
                    refresh();
                } else {
                    delBtn.classList.add('armed');
                    delTimer = setTimeout(() => delBtn.classList.remove('armed'), 2000);
                }
            });

            li.append(playBtn, thumb, labelSpan, durSpan, badgeSpan, warnSpan, trimBtn, delBtn);
            list.appendChild(li);
        }
    }

    // ── Import ───────────────────────────────────────────────────────────────
    async function importFile(file) {
        if (!file.type.startsWith('audio/')) {
            showStatus('Skipped: ' + file.name + ' — unsupported format', true);
            return;
        }
        try {
            const ab    = await audioContext.decodeAudioData(await file.arrayBuffer());
            const label = deduplicateLabel(file.name.replace(/\.[^.]+$/, ''), pool.clips.map(c=>c.label));
            pool.addBufferWithMeta(ab, label, { capturedBpm: tc.bpm, capturedBeatsPerMeasure: tc.beatsPerMeasure, capturedSampleRate: ab.sampleRate });
        } catch(err) {
            showStatus('Import failed: ' + file.name, true);
            console.error('Import failed:', file.name, err);
        }
    }

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        for (const file of fileInput.files) await importFile(file);
        fileInput.value = '';
        refresh();
    });
    panel.addEventListener('dragover',  e => { e.preventDefault(); panel.classList.add('drag-over'); });
    panel.addEventListener('dragleave', ()  => { panel.classList.remove('drag-over'); });
    panel.addEventListener('drop', async e => {
        e.preventDefault();
        panel.classList.remove('drag-over');
        for (const file of (e.dataTransfer?.files || [])) await importFile(file);
        refresh();
    });

    // ── Export ───────────────────────────────────────────────────────────────
    exportBtn.addEventListener('click', async () => {
        if (!pool.clips.length) return;
        const bytes = await encodeSetZip(pool.clips, pool.buffers, 'set');
        if (!bytes) { pool.clips.forEach(c => exportSampleWav(c, pool.buffers)); return; }
        const blob  = new Blob([bytes], { type: 'application/zip' });
        const url   = URL.createObjectURL(blob);
        const a     = Object.assign(document.createElement('a'), { href: url, download: 'set.zip' });
        a.click();
        URL.revokeObjectURL(url);
    });

    refresh();
    return {
        refresh,
        setMetronomeRunning,
        drawLiveBuffer,
        onTrimRequest(fn) { _onTrim = fn; },
        destroy() { container.removeChild(panel); },
    };
}
