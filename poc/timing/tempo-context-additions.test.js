// poc/timing/tempo-context-additions.test.js

import { test, run, assert, assertEquals, assertNull, _reset } from '../test/runner.js';
import { createTempoContext, setBeatsPerMeasure } from './tempo-context.js';

test('createTempoContext() returns clickProviderRef === "built-in:default"', () => {
    const tc = createTempoContext();
    assertEquals(tc.clickProviderRef, 'built-in:default');
});

test('createTempoContext() returns snapThreshold === 0', () => {
    const tc = createTempoContext();
    assertEquals(tc.snapThreshold, 0);
});

test('createTempoContext() returns beatAccents === [true, false, false, false]', () => {
    const tc = createTempoContext();
    assertEquals(tc.beatAccents.length, 4);
    assertEquals(tc.beatAccents[0], true);
    assertEquals(tc.beatAccents[1], false);
    assertEquals(tc.beatAccents[2], false);
    assertEquals(tc.beatAccents[3], false);
});

test('setBeatsPerMeasure(tc, 3) sets tc.beatAccents to [true, false, false]', () => {
    const tc = createTempoContext();
    setBeatsPerMeasure(tc, 3);
    assertEquals(tc.beatAccents.length, 3);
    assertEquals(tc.beatAccents[0], true);
    assertEquals(tc.beatAccents[1], false);
    assertEquals(tc.beatAccents[2], false);
});

test('setBeatsPerMeasure(tc, 1) sets tc.beatAccents to [true]', () => {
    const tc = createTempoContext();
    setBeatsPerMeasure(tc, 1);
    assertEquals(tc.beatAccents.length, 1);
    assertEquals(tc.beatAccents[0], true);
});

test('setBeatsPerMeasure(tc, 3) does NOT modify tc.clickProviderRef', () => {
    const tc = createTempoContext();
    tc.clickProviderRef = 'custom:provider';
    setBeatsPerMeasure(tc, 3);
    assertEquals(tc.clickProviderRef, 'custom:provider');
});

test('setBeatsPerMeasure(tc, 3) does NOT modify tc.snapThreshold', () => {
    const tc = createTempoContext();
    tc.snapThreshold = 0.015;
    setBeatsPerMeasure(tc, 3);
    assertEquals(tc.snapThreshold, 0.015);
});

test('setBeatsPerMeasure(tc, 5) sets beatAccents with index 0 = true, rest = false', () => {
    const tc = createTempoContext();
    setBeatsPerMeasure(tc, 5);
    assertEquals(tc.beatAccents.length, 5);
    assertEquals(tc.beatAccents[0], true);
    for (let i = 1; i < 5; i++) {
        assertEquals(tc.beatAccents[i], false, `beatAccents[${i}] should be false`);
    }
});

await run();
