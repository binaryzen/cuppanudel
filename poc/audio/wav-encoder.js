export function encodeWav(audioBuffer, startFrame, endFrame) {
    const sr = audioBuffer.sampleRate;
    const s  = startFrame ?? 0;
    const e  = endFrame   ?? audioBuffer.length;
    const ch = audioBuffer.getChannelData(0);
    const n  = e - s;
    const buf = new ArrayBuffer(44 + n * 2);
    const v   = new DataView(buf);
    const str = (off, t) => { for (let i = 0; i < t.length; i++) v.setUint8(off + i, t.charCodeAt(i)); };
    str(0,'RIFF'); v.setUint32(4, 36 + n*2, true);
    str(8,'WAVE'); str(12,'fmt ');
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*2,true);
    v.setUint16(32,2,true);  v.setUint16(34,16,true);
    str(36,'data'); v.setUint32(40, n*2, true);
    for (let i = 0; i < n; i++) {
        v.setInt16(44 + i*2, Math.max(-32768, Math.min(32767, Math.round(ch[s+i] * 32767))), true);
    }
    return new Uint8Array(buf);
}

export function exportSampleWav(clip, buffers, sampleRate) {
    const ab = buffers.get(clip.bufferId);
    if (!ab) return;
    const bytes = encodeWav(ab, clip.startFrame, clip.endFrame);
    const blob  = new Blob([bytes], { type: 'audio/wav' });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement('a'), { href: url, download: (clip.label||'sample').replace(/[^a-z0-9_-]/gi,'_')+'.wav' });
    a.click();
    URL.revokeObjectURL(url);
}

export async function encodeSetZip(clips, buffers, setName) {
    const enc = new TextEncoder();
    const entries = [];
    for (const clip of clips) {
        const ab = buffers.get(clip.bufferId);
        if (!ab) continue;
        const data     = encodeWav(ab, clip.startFrame, clip.endFrame);
        const nameStr  = (setName||'set') + '/' + (clip.label||clip.id).replace(/[^a-z0-9_-]/gi,'_') + '.wav';
        const nameBytes = enc.encode(nameStr);
        entries.push({ nameBytes, data });
    }
    const parts = [], central = [];
    let offset = 0;
    for (const { nameBytes, data } of entries) {
        const lh = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(lh.buffer);
        lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true);
        lv.setUint32(18,data.byteLength,true); lv.setUint32(22,data.byteLength,true);
        lv.setUint16(26,nameBytes.length,true);
        lh.set(nameBytes, 30);
        parts.push(lh, data);
        const cd = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(cd.buffer);
        cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
        cv.setUint32(22,data.byteLength,true); cv.setUint32(26,data.byteLength,true);
        cv.setUint16(30,nameBytes.length,true); cv.setUint32(42,offset,true);
        cd.set(nameBytes, 46);
        central.push(cd);
        offset += lh.byteLength + data.byteLength;
    }
    const cdSize = central.reduce((s,b) => s + b.byteLength, 0);
    const eocd   = new Uint8Array(22);
    const ev     = new DataView(eocd.buffer);
    ev.setUint32(0,0x06054b50,true);
    ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true);
    ev.setUint32(12,cdSize,true); ev.setUint32(16,offset,true);
    const all   = [...parts, ...central, eocd];
    const total = all.reduce((s,b) => s + b.byteLength, 0);
    const out   = new Uint8Array(total);
    let pos     = 0;
    for (const b of all) { out.set(b, pos); pos += b.byteLength; }
    return out;
}
