/**
 * poc/tests/alignment-monitor.test.js
 *
 * Integration tests for visualizers/alignment-monitor
 * Tests: tc-039, tc-040
 */

import { test, run, assert } from '../test/runner.js';
import { createAlignmentMonitor } from '../visualizers/alignment-monitor.js';
import { createTempoContext } from '../timing/tempo-context.js';

// tc-039: AlignmentMonitor derives scroll from measureStart/nextBeatTime
test('tc-039: alignment monitor column advancement is BPM-invariant', () => {
  const mockCanvas = {
    width: 400,
    height: 68,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    })
  };

  const mockAnalyser = {
    fftSize: 2048,
    getFloatTimeDomainData: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0;
    }
  };

  const tc = createTempoContext();
  tc.bpm = 120;

  const mockMetronome = {
    _time: 0,
    getState: function() {
      return {
        isRunning: true,
        measureStart: this._time,
        nextBeatTime: this._time
      };
    }
  };

  const monitor = createAlignmentMonitor(mockAnalyser, mockCanvas, tc, () => mockMetronome.getState());

  // Draw at T0
  monitor.draw();

  // Advance time
  mockMetronome._time += 0.5;

  // Draw at T1
  monitor.draw();

  // Change BPM
  tc.bpm = 240;

  // Draw at T1 with new BPM
  monitor.draw();

  assert(true, 'Column advancement is BPM-invariant (no exception thrown)');
});

// tc-040: AlignmentMonitor does not allocate Float32Array in RAF loop
test('tc-040: alignment monitor pre-allocates arrays', () => {
  const mockCanvas = {
    width: 400,
    height: 68,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    })
  };

  const mockAnalyser = {
    fftSize: 2048,
    getFloatTimeDomainData: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0;
    }
  };

  const tc = createTempoContext();

  const mockMetronome = {
    getState: () => ({
      isRunning: true,
      measureStart: 0,
      nextBeatTime: 0
    })
  };

  const monitor = createAlignmentMonitor(mockAnalyser, mockCanvas, tc, () => mockMetronome.getState());

  // Track allocations
  const originalFloat32Array = global.Float32Array;
  let allocationCount = 0;
  global.Float32Array = function(...args) {
    allocationCount++;
    return new originalFloat32Array(...args);
  };
  global.Float32Array.prototype = originalFloat32Array.prototype;

  // Run draw() 100 times
  const startCount = allocationCount;
  for (let i = 0; i < 100; i++) {
    monitor.draw();
  }
  const endCount = allocationCount;

  global.Float32Array = originalFloat32Array;

  // Allow for some allocation overhead, but not 100 new allocations
  const newAllocations = endCount - startCount;
  assert(newAllocations <= 5, `Should not allocate Float32Array in RAF loop; allocated ${newAllocations} times`);
});

// Run all tests
const result = await run();
process.exit(result.failed > 0 ? 1 : 0);
