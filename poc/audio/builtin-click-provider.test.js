// poc/audio/builtin-click-provider.test.js

import { test, run, assert, assertEquals, assertNull, _reset as resetTests } from '../test/runner.js';
import { builtinClickProvider } from './builtin-click-provider.js';

// Mock AudioContext and OfflineAudioContext for testing
function createMockAudioContext() {
    const buffers = [];
    return {
        sampleRate: 44100,
        currentTime: 0,
        createBuffer(channels, length, rate) {
            const buf = {
                sampleRate: rate,
                length,
                numberOfChannels: channels,
                getChannelData: (ch) => new Float32Array(length)
            };
            buffers.push(buf);
            return buf;
        },
        createBufferSource() {
            return {
                buffer: null,
                connect(dest) { return this; },
                start() {},
                stop() {},
                disconnect() {}
            };
        },
        createGain() {
            return {
                gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
                connect(dest) { return this; },
                disconnect() {}
            };
        },
        destination: {}
    };
}

function createMockOfflineAudioContext(channels, length, sampleRate) {
    // Create a mock that captures started sources and returns a rendered buffer
    const sources = [];
    const nodes = [];

    const mockCtx = {
        sampleRate,
        currentTime: 0,
        destination: {},
        createOscillator() {
            const osc = {
                type: 'sine',
                frequency: { value: 0, setValueAtTime: () => {} },
                connect(dest) { return dest; },
                start(t) { sources.push({ type: 'osc', time: t }); },
                stop(t) { sources.push({ type: 'osc-stop', time: t }); }
            };
            return osc;
        },
        createBufferSource() {
            const src = {
                buffer: null,
                connect(dest) { return dest; },
                start(t) { sources.push({ type: 'buf-src', time: t }); },
                stop(t) { sources.push({ type: 'buf-src-stop', time: t }); }
            };
            return src;
        },
        createBuffer(ch, len, rate) {
            return {
                sampleRate: rate,
                length: len,
                numberOfChannels: ch,
                getChannelData: (i) => new Float32Array(len)
            };
        },
        createGain() {
            const gain = {
                gain: {
                    value: 1,
                    setValueAtTime: () => {},
                    linearRampToValueAtTime: () => {},
                    exponentialRampToValueAtTime: () => {}
                },
                connect(dest) { return dest; },
                disconnect() {}
            };
            nodes.push(gain);
            return gain;
        },
        async startRendering() {
            // Return a mock rendered buffer
            return {
                sampleRate,
                length,
                numberOfChannels: channels,
                getChannelData: (i) => new Float32Array(length)
            };
        }
    };

    return mockCtx;
}

// Add global OfflineAudioContext if not available
if (typeof OfflineAudioContext === 'undefined') {
    global.OfflineAudioContext = createMockOfflineAudioContext;
}

test('builtinClickProvider.id is "built-in:default"', () => {
    assertEquals(builtinClickProvider.id, 'built-in:default');
});

test('builtinClickProvider.label is "Default (synthesised)"', () => {
    assertEquals(builtinClickProvider.label, 'Default (synthesised)');
});

test('builtinClickProvider.count() returns 2', () => {
    assertEquals(builtinClickProvider.count(), 2);
});

test('builtinClickProvider.getSample() returns null before init()', () => {
    // Reset for isolated test
    builtinClickProvider._initialized = false;
    builtinClickProvider._buffers = null;

    assertNull(builtinClickProvider.getSample(0), 'getSample(0) should return null before init');
    assertNull(builtinClickProvider.getSample(1), 'getSample(1) should return null before init');
});

test('builtinClickProvider.getSample() never returns undefined', () => {
    builtinClickProvider._initialized = false;
    builtinClickProvider._buffers = null;

    const result = builtinClickProvider.getSample(0);
    assert(result !== undefined, 'getSample should not return undefined');
    assertEquals(result, null, 'getSample before init should return null specifically');
});

test('builtinClickProvider.getSample() returns null for out-of-range index after init', async () => {
    const ctx = createMockAudioContext();
    await builtinClickProvider.init(ctx);

    assertNull(builtinClickProvider.getSample(2), 'getSample(2) should return null');
    assertNull(builtinClickProvider.getSample(-1), 'getSample(-1) should return null');
});

test('builtinClickProvider.getSample(0) and getSample(1) return different buffers after init', async () => {
    const ctx = createMockAudioContext();
    await builtinClickProvider.init(ctx);

    const buf0 = builtinClickProvider.getSample(0);
    const buf1 = builtinClickProvider.getSample(1);

    assert(buf0 !== null, 'getSample(0) should return non-null buffer');
    assert(buf1 !== null, 'getSample(1) should return non-null buffer');
    assert(buf0 !== buf1, 'getSample(0) and getSample(1) should return different buffers');
});

test('builtinClickProvider returned buffers have duration ~0.07s after init', async () => {
    const ctx = createMockAudioContext();
    await builtinClickProvider.init(ctx);

    const buf0 = builtinClickProvider.getSample(0);
    const buf1 = builtinClickProvider.getSample(1);

    // 0.07s at 44100 Hz = 3087 samples
    const expectedLength = Math.round(0.07 * ctx.sampleRate);
    const tolerance = 10;  // Allow small rounding differences

    assert(Math.abs(buf0.length - expectedLength) <= tolerance, `Buffer 0 length should be ~${expectedLength}, got ${buf0.length}`);
    assert(Math.abs(buf1.length - expectedLength) <= tolerance, `Buffer 1 length should be ~${expectedLength}, got ${buf1.length}`);
});

test('builtinClickProvider returned buffers are mono after init', async () => {
    const ctx = createMockAudioContext();
    await builtinClickProvider.init(ctx);

    const buf0 = builtinClickProvider.getSample(0);
    const buf1 = builtinClickProvider.getSample(1);

    assertEquals(buf0.numberOfChannels, 1, 'Buffer 0 should be mono');
    assertEquals(buf1.numberOfChannels, 1, 'Buffer 1 should be mono');
});

test('builtinClickProvider.init() called a second time is a no-op', async () => {
    const ctx = createMockAudioContext();
    await builtinClickProvider.init(ctx);
    const buf0First = builtinClickProvider.getSample(0);

    // Call init again
    await builtinClickProvider.init(ctx);
    const buf0Second = builtinClickProvider.getSample(0);

    // Should be the same buffer instance
    assertEquals(buf0First, buf0Second, 'Second init should be no-op, returning same buffer');
});

test('builtinClickProvider.getSample() logs error before init', () => {
    builtinClickProvider._initialized = false;
    builtinClickProvider._buffers = null;

    // Capture console.error
    const errors = [];
    const originalError = console.error;
    console.error = (msg) => errors.push(msg);

    const result = builtinClickProvider.getSample(0);

    console.error = originalError;

    assert(errors.length > 0, 'getSample should log error before init');
    assert(errors[0].includes('not initialised'), 'Error message should mention "not initialised"');
    assertNull(result);
});

await run();
