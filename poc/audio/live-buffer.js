const LIVE_BUFFER_MEASURES = 16;
const MAX_FRAMES = Math.floor(200 * 1024 * 1024 / 4); // 200 MB / Float32

export function createLiveBuffer(sampleRate) {
    const capacity = Math.min(
        Math.ceil(LIVE_BUFFER_MEASURES * 8 * (300 / 60) * sampleRate),
        MAX_FRAMES
    );
    let ring  = new Float32Array(capacity);
    let total = 0;
    const LOG_SIZE = LIVE_BUFFER_MEASURES + 2;
    const log = [];

    function write(samples) {
        for (let i = 0; i < samples.length; i++) {
            ring[total % capacity] = samples[i];
            total++;
        }
    }

    function tagMeasureBoundary(measureIndex, audioTime, absoluteWritePos) {
        if (log.length >= LOG_SIZE) log.shift();
        log.push({ measureIndex, audioTime, absoluteWritePos });
    }

    function getLastNMeasureBoundaries(n) {
        return log.slice(-n);
    }

    function getFrameRange(startAbs, endAbs) {
        const count = endAbs - startAbs;
        if (count <= 0 || count > capacity) return null;
        const result   = new Float32Array(count);
        const startRing = startAbs % capacity;
        const first    = Math.min(count, capacity - startRing);
        result.set(ring.subarray(startRing, startRing + first), 0);
        if (first < count) result.set(ring.subarray(0, count - first), first);
        return result;
    }

    return {
        write,
        tagMeasureBoundary,
        getLastNMeasureBoundaries,
        getFrameRange,
        getTotalFramesWritten: () => total,
        getSampleRate:         () => sampleRate,
        reset() { ring.fill(0); total = 0; log.length = 0; },
        destroy() { ring = null; },
    };
}
