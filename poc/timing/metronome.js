const LOOKAHEAD_SEC  = 0.025;   // schedule this far ahead
const INTERVAL_MS    = 25;      // scheduler poll interval

export function createMetronome(context, tc, clickProvider) {
    if (!clickProvider) {
        throw new TypeError('createMetronome: clickProvider is required');
    }

    let running          = false;
    let timer            = null;
    let measureStart     = 0;
    let currentBeat      = 0;
    let nextBeatTime     = 0;

    function measureDur() {
        return tc.beatsPerMeasure * (60 / tc.bpm);
    }

    function schedule() {
        const dur = measureDur();
        while (nextBeatTime < context.currentTime + LOOKAHEAD_SEC) {
            const accent = tc.beatAccents[currentBeat] ?? (currentBeat === 0);
            const buf = clickProvider.getSample(accent ? 1 : 0);
            const volume = tc.beatVolumes[currentBeat];

            if (buf && volume >= 0.01) {
                const src = context.createBufferSource();
                src.buffer = buf;
                const g = context.createGain();
                g.gain.value = volume;
                src.connect(g).connect(context.destination);
                src.start(nextBeatTime);
            } else if (!buf) {
                console.error('metronome: getSample() returned null — provider not ready');
            }

            currentBeat++;
            if (currentBeat >= tc.beatsPerMeasure) {
                currentBeat  = 0;
                measureStart += dur;
            }
            nextBeatTime = measureStart + tc.beatOffsets[currentBeat] * dur;
        }
    }

    function start() {
        if (running) return;
        running      = true;
        measureStart  = context.currentTime;
        currentBeat   = 0;
        nextBeatTime  = context.currentTime;
        timer = setInterval(schedule, INTERVAL_MS);
    }

    function stop() {
        if (!running) return;
        running = false;
        clearInterval(timer);
        timer = null;
    }

    function restart() {
        stop();
        start();
    }

    // Returns normalized 0–1 position within the current measure, or null if stopped
    // Derived from measureStart and nextBeatTime to remain accurate after BPM changes
    function getPlayheadPosition() {
        if (!running) return null;
        const dur = measureDur();
        const now = context.currentTime + tc.visualDelayMs / 1000;
        const elapsed = now - measureStart;
        return ((elapsed % dur) + dur) % dur / dur;
    }

    return {
        start,
        stop,
        restart,
        getPlayheadPosition,
        isRunning: () => running,
        // Expose internal scheduler state for alignment monitor and other consumers
        get measureStart() { return measureStart; },
        get nextBeatTime() { return nextBeatTime; }
    };
}
