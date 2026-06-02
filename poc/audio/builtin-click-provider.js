// poc/audio/builtin-click-provider.js
//
// Synthesizes two AudioBuffer click sounds (beat and accent) on init,
// then serves them synchronously via getSample().
// Implements the SampleProvider interface.

const builtinClickProvider = {
    id: 'built-in:default',
    label: 'Default (synthesised)',

    _buffers: null,  // { 0: AudioBuffer, 1: AudioBuffer } after init
    _initialized: false,

    count() {
        return 2;
    },

    getSample(index) {
        if (!this._initialized) {
            console.error('BuiltinClickProvider not initialised');
            return null;
        }
        if (index < 0 || index > 1) {
            return null;
        }
        return this._buffers[index];
    },

    async init(ctx) {
        // No-op if already initialized
        if (this._initialized) {
            return Promise.resolve();
        }

        try {
            // Synthesis parameters per spec (workspace.md §4)
            const beatFreq = 900;      // Hz
            const accentFreq = 1200;   // Hz
            const beatGain = 0.3;
            const accentGain = 0.5;
            const noiseGain = 0.3;     // beat
            const accentNoiseGain = 0.5;
            const duration = 0.070;    // 70 ms
            const noiseDuration = 0.008;  // 8 ms
            const sampleRate = ctx.sampleRate;

            // Create offline context for synthesis
            const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

            // Synthesize beat (index 0)
            const beatBuf = await this._synthesizeClick(
                offlineCtx,
                beatFreq,
                beatGain,
                noiseGain,
                duration,
                noiseDuration
            );

            // Synthesize accent (index 1)
            const accentBuf = await this._synthesizeClick(
                offlineCtx,
                accentFreq,
                accentGain,
                accentNoiseGain,
                duration,
                noiseDuration
            );

            this._buffers = {
                0: beatBuf,
                1: accentBuf
            };
            this._initialized = true;
        } catch (error) {
            throw error;  // Propagate to caller (main.js)
        }
    },

    async _synthesizeClick(offlineCtx, frequency, gain, noiseGain, duration, noiseDuration) {
        // Create oscillator (tone body)
        const osc = offlineCtx.createOscillator();
        const oscGain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        osc.connect(oscGain);
        oscGain.connect(offlineCtx.destination);

        // Tone envelope: ramp up to gain over 3ms, exponential decay to ~0 by 70ms
        oscGain.gain.setValueAtTime(0, 0);
        oscGain.gain.linearRampToValueAtTime(gain, 0.003);
        oscGain.gain.exponentialRampToValueAtTime(0.001, duration);

        // Create noise burst (sharp transient)
        const noiseBuf = offlineCtx.createBuffer(1, Math.floor(offlineCtx.sampleRate * noiseDuration), offlineCtx.sampleRate);
        const noiseChanData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseChanData.length; i++) {
            noiseChanData[i] = Math.random() * 2 - 1;
        }

        const noiseSrc = offlineCtx.createBufferSource();
        const noiseGainNode = offlineCtx.createGain();
        noiseSrc.buffer = noiseBuf;
        noiseSrc.connect(noiseGainNode);
        noiseGainNode.connect(offlineCtx.destination);

        // Noise envelope: starts at noiseGain, exponential decay to 0 by 12ms
        noiseGainNode.gain.setValueAtTime(noiseGain, 0);
        noiseGainNode.gain.exponentialRampToValueAtTime(0.001, 0.012);

        // Start both sources
        osc.start(0);
        osc.stop(duration);
        noiseSrc.start(0);
        noiseSrc.stop(noiseDuration);

        // Render and return
        return offlineCtx.startRendering();
    }
};

export { builtinClickProvider };
