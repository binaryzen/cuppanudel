import { deduplicateLabel } from '../utils/label.js';

function floatToAudioBuffer(ctx, data, sampleRate) {
    const ab = ctx.createBuffer(1, data.length, sampleRate);
    ab.copyToChannel(data, 0);
    return ab;
}

export function createCaptureManager(liveBuffer, tc, pool, audioContext) {
    const sr = () => liveBuffer.getSampleRate();
    const existing = () => pool.clips.map(c => c.label);
    const capMeta  = (extra) => ({
        capturedBpm: tc.bpm, capturedBeatsPerMeasure: tc.beatsPerMeasure,
        capturedSampleRate: sr(), ...extra
    });

    function snapLastN(n) {
        const bounds = liveBuffer.getLastNMeasureBoundaries(n + 1);
        if (!bounds.length) return null;
        const start  = bounds.length > n ? bounds[bounds.length - 1 - n] : bounds[0];
        const data   = liveBuffer.getFrameRange(start.absoluteWritePos, liveBuffer.getTotalFramesWritten());
        if (!data || !data.length) return null;
        const ab     = floatToAudioBuffer(audioContext, data, sr());
        return pool.addBufferWithMeta(ab, deduplicateLabel('Snap ' + n + 'b', existing()), capMeta({ capturedMeasures: n }));
    }

    let punchStart = null;
    function markStart() {
        punchStart = { audioTime: audioContext.currentTime, absoluteWritePos: liveBuffer.getTotalFramesWritten() };
    }
    function commitPunch() {
        if (!punchStart) return null;
        const data = liveBuffer.getFrameRange(punchStart.absoluteWritePos, liveBuffer.getTotalFramesWritten());
        punchStart = null;
        if (!data || !data.length) return null;
        const ab = floatToAudioBuffer(audioContext, data, sr());
        return pool.addBufferWithMeta(ab, deduplicateLabel('Punch', existing()), capMeta({ capturedMeasures: null }));
    }
    function hasPunchStart()  { return punchStart !== null; }
    function clearPunchStart(){ punchStart = null; }

    function grabNow(measures) {
        measures = measures || 4;
        const frames   = Math.round(measures * (tc.beatsPerMeasure / tc.bpm * 60) * sr());
        const endAbs   = liveBuffer.getTotalFramesWritten();
        const data     = liveBuffer.getFrameRange(Math.max(0, endAbs - frames), endAbs);
        if (!data || !data.length) return null;
        const ab = floatToAudioBuffer(audioContext, data, sr());
        return pool.addBufferWithMeta(ab, deduplicateLabel('Grab ' + measures + 'b', existing()), capMeta({ capturedMeasures: measures }));
    }

    let armed = false, armPos = 0;
    function armRecord()  { armed = true; armPos = liveBuffer.getTotalFramesWritten(); }
    function stopRecord() {
        if (!armed) return null;
        armed = false;
        const data = liveBuffer.getFrameRange(armPos, liveBuffer.getTotalFramesWritten());
        if (!data || !data.length) return null;
        const ab = floatToAudioBuffer(audioContext, data, sr());
        return pool.addBufferWithMeta(ab, deduplicateLabel('Record', existing()), capMeta({ capturedMeasures: null }));
    }

    return { snapLastN, markStart, commitPunch, hasPunchStart, clearPunchStart, grabNow, armRecord, stopRecord, isArmed: () => armed };
}
