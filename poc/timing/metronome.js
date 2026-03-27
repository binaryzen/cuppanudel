const LOOKAHEAD_SEC  = 0.025;   // schedule this far ahead
const INTERVAL_MS    = 25;      // scheduler poll interval

export function createMetronome(context, tc) {
    let running          = false;
    let timer            = null;
    let playbackStart    = 0;
    let measureStart     = 0;
    let currentBeat      = 0;
    let nextBeatTime     = 0;

    function measureDur() {
        return tc.beatsPerMeasure * (60 / tc.bpm);
    }

    function playClick(time, isDownbeat, volume) {
        if (volume < 0.01) return;

        // ── noise burst (sharp transient) ────────────────────────────────────
        const frameCount = Math.floor(context.sampleRate * 0.008);
        const noiseBuf   = context.createBuffer(1, frameCount, context.sampleRate);
        const data       = noiseBuf.getChannelData(0);
        for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;

        const noise     = context.createBufferSource();
        const noiseGain = context.createGain();
        noise.buffer    = noiseBuf;
        noise.connect(noiseGain);
        noiseGain.connect(context.destination);
        noiseGain.gain.setValueAtTime((isDownbeat ? 0.7 : 0.45) * volume, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.012);
        noise.start(time);
        noise.stop(time + 0.015);

        // ── tone body ─────────────────────────────────────────────────────────
        const osc     = context.createOscillator();
        const oscGain = context.createGain();
        osc.type      = 'sine';
        osc.frequency.value = isDownbeat ? 1200 : 900;
        osc.connect(oscGain);
        oscGain.connect(context.destination);
        oscGain.gain.setValueAtTime(0, time);
        oscGain.gain.linearRampToValueAtTime((isDownbeat ? 0.5 : 0.3) * volume, time + 0.003);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
        osc.start(time);
        osc.stop(time + 0.08);
    }

    function schedule() {
        const dur = measureDur();
        while (nextBeatTime < context.currentTime + LOOKAHEAD_SEC) {
            playClick(nextBeatTime, currentBeat === 0, tc.beatVolumes[currentBeat]);
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
        playbackStart = context.currentTime;
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

    function restart() { stop(); start(); }

    // Returns normalized 0–1 position within the current measure, or null if stopped
    function getPlayheadPosition() {
        if (!running) return null;
        const dur     = measureDur();
        const now     = context.currentTime + tc.visualDelayMs / 1000;
        const elapsed = now - playbackStart;
        return ((elapsed % dur) + dur) % dur / dur;
    }

    return { start, stop, restart, getPlayheadPosition, isRunning: () => running };
}
