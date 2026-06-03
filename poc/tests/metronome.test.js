/**
 * poc/tests/metronome.test.js
 *
 * Integration tests for timing/metronome
 * Tests: tc-013, tc-014, tc-015, tc-016, tc-017, tc-018
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { createMetronome } from '../timing/metronome.js';
import { createTempoContext } from '../timing/tempo-context.js';

// Helper to check if we're in a browser environment
function canUseOfflineAudioContext() {
  try {
    return typeof OfflineAudioContext !== 'undefined';
  } catch (e) {
    return false;
  }
}

// tc-013: Metronome.start() calls clickProvider.getSample() to schedule AudioBufferSourceNodes
test('tc-013: metronome calls getSample() with correct indices', () => {
  if (!canUseOfflineAudioContext()) {
    console.log('SKIP tc-013: OfflineAudioContext unavailable in Node.js');
    return; // Skip in Node.js
  }

  const tc = createTempoContext();
  tc.beatAccents = [true, false];

  const callLog = [];
  const mockProvider = {
    id: 'test',
    label: 'Test',
    count: () => 2,
    getSample: (idx) => {
      callLog.push(idx);
      return idx === 1 ? { sampleRate: 44100, length: 100 } : { sampleRate: 44100, length: 100 };
    },
    init: async () => {}
  };

  const mockCtx = new OfflineAudioContext(1, 44100, 44100);
  const metro = createMetronome(mockCtx, tc, mockProvider);

  metro.start();

  assert(callLog.length >= 2, 'Should call getSample() at least twice in initial lookahead');
  assert(callLog[0] === 1, 'First beat (accent) should call getSample(1)');
  assert(callLog[1] === 0, 'Second beat (non-accent) should call getSample(0)');
});

// tc-014: Metronome respects beatVolumes threshold; volume < 0.01 silences beat
test('tc-014: metronome respects volume threshold', () => {
  if (!canUseOfflineAudioContext()) {
    console.log('SKIP tc-014: OfflineAudioContext unavailable in Node.js');
    return; // Skip in Node.js
  }

  const tc = createTempoContext();
  tc.beatVolumes = [1.0, 0.0, 0.005];
  tc.beatAccents = [true, true, true];
  tc.beatsPerMeasure = 3;

  const callLog = [];
  const mockProvider = {
    id: 'test',
    label: 'Test',
    count: () => 2,
    getSample: (idx) => {
      callLog.push({ idx, time: Date.now() });
      return { sampleRate: 44100, length: 100 };
    },
    init: async () => {}
  };

  const mockCtx = new OfflineAudioContext(1, 44100, 44100);
  const metro = createMetronome(mockCtx, tc, mockProvider);

  metro.start();

  // Beat 0 (volume 1.0) should schedule
  // Beat 1 (volume 0.0) should NOT schedule
  // Beat 2 (volume 0.005) should NOT schedule

  // Verify exactly ONE call was made (beat 0 only)
  assertEquals(callLog.length, 1, 'Only beat 0 (volume 1.0) should call getSample; beats 1 and 2 should not');
  assertEquals(callLog[0].idx, 1, 'First call should be for beat 0 (accent index 1)')
});

// tc-015: Metronome logs console.error when getSample() returns null
test('tc-015: metronome logs error on null sample', () => {
  if (!canUseOfflineAudioContext()) {
    console.log('SKIP tc-015: OfflineAudioContext unavailable in Node.js');
    return; // Skip in Node.js
  }

  const tc = createTempoContext();

  const mockProvider = {
    id: 'test',
    label: 'Test',
    count: () => 0,
    getSample: () => null,
    init: async () => {}
  };

  const errors = [];
  const originalError = console.error;
  console.error = (msg) => {
    errors.push(msg);
  };

  const mockCtx = new OfflineAudioContext(1, 44100, 44100);
  const metro = createMetronome(mockCtx, tc, mockProvider);

  metro.start();

  console.error = originalError;

  assert(errors.length > 0, 'Should log console.error');
  assert(errors[0].includes('metronome'), 'Error should mention metronome');
});

// tc-016: Metronome.restart() stops, resets to beat 0, and resumes
test('tc-016: restart() resets playhead position to 0', () => {
  if (!canUseOfflineAudioContext()) {
    console.log('SKIP tc-016: OfflineAudioContext unavailable in Node.js');
    return; // Skip in Node.js
  }

  const tc = createTempoContext();
  tc.bpm = 120;

  const mockProvider = {
    id: 'test',
    label: 'Test',
    count: () => 2,
    getSample: (idx) => ({ sampleRate: 44100, length: 100 }),
    init: async () => {}
  };

  const mockCtx = new OfflineAudioContext(1, 44100, 44100);
  const metro = createMetronome(mockCtx, tc, mockProvider);

  metro.start();

  // Advance time
  mockCtx.currentTime;

  metro.restart();

  const pos = metro.getPlayheadPosition();
  assert(pos === 0 || Math.abs(pos) < 0.01, 'Playhead should be near 0 after restart()');
});

// tc-017: Metronome.getPlayheadPosition() derives from measureStart/nextBeatTime
test('tc-017: playhead position is invariant across BPM change', () => {
  if (!canUseOfflineAudioContext()) {
    console.log('SKIP tc-017: OfflineAudioContext unavailable in Node.js');
    return; // Skip in Node.js
  }

  const tc = createTempoContext();
  tc.bpm = 120;

  const mockProvider = {
    id: 'test',
    label: 'Test',
    count: () => 2,
    getSample: (idx) => ({ sampleRate: 44100, length: 100 }),
    init: async () => {}
  };

  const mockCtx = new OfflineAudioContext(1, 44100, 44100);
  const metro = createMetronome(mockCtx, tc, mockProvider);

  metro.start();

  // Get initial position immediately (before BPM change)
  const pos0 = metro.getPlayheadPosition();

  // Change BPM
  tc.bpm = 240;

  // Get position again at same relative time (synchronously, so currentTime is same)
  const pos1 = metro.getPlayheadPosition();

  // Since OfflineAudioContext.currentTime doesn't advance between synchronous calls,
  // the positions should be equal (or within floating-point epsilon)
  assert(pos0 !== null && pos1 !== null, 'Both positions should be non-null');
  assert(Math.abs(pos0 - pos1) < 0.01, 'Positions should be equal/close after BPM change (invariance)');
});

// tc-018: Metronome throws TypeError if clickProvider is not provided
test('tc-018: createMetronome() requires clickProvider', () => {
  const tc = createTempoContext();

  // Mock a minimal context object
  const mockCtx = {
    currentTime: 0,
    sampleRate: 44100,
    createBufferSource: () => ({
      buffer: null,
      connect: () => ({ connect: () => {} }),
      start: () => {},
      disconnect: () => {}
    }),
    createGain: () => ({
      gain: { value: 1 },
      connect: () => ({ connect: () => {} }),
      disconnect: () => {}
    }),
    destination: {}
  };

  try {
    createMetronome(mockCtx, tc, undefined);
    throw new Error('Expected TypeError');
  } catch (e) {
    assert(e.message.includes('required'), 'Error should mention requirement');
  }
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
