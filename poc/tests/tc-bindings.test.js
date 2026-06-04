/**
 * Generic contract tests for TC_KNOB_BINDINGS.
 *
 * Every entry in the table is exercised automatically — adding a new binding
 * is all that is needed to get coverage here.
 *
 * Three properties are verified per binding:
 *   1. The key exists on the real TempoContext (table stays in sync with data model).
 *   2. toKnob/fromKnob round-trip correctly for the declared testValue.
 *   3. Writing tc[key] via fromKnob notifies a subscriber with the right toKnob value,
 *      and writing the same value a second time does NOT notify again.
 */

import { test, run, assert, assertEquals } from '../test/runner.js';
import { makeObservable } from '../state/observable.js';
import { TC_KNOB_BINDINGS } from '../state/tc-bindings.js';
import { createTempoContext } from '../timing/tempo-context.js';

const referenceTc = createTempoContext();

for (const { key, toKnob, fromKnob, testValue } of TC_KNOB_BINDINGS) {
    test(`${key}: key exists on TempoContext`, () => {
        assert(key in referenceTc, `'${key}' is missing from createTempoContext()`);
    });

    test(`${key}: toKnob/fromKnob round-trip`, () => {
        const roundtripped = toKnob(fromKnob(testValue));
        assertEquals(roundtripped, testValue);
    });

    test(`${key}: subscriber receives toKnob(value) when tc property changes`, () => {
        const tc = makeObservable({ [key]: fromKnob(0) });
        const received = [];
        tc.subscribe(key, v => received.push(toKnob(v)));

        tc[key] = fromKnob(testValue);

        assertEquals(received.length, 1, 'subscriber called exactly once');
        assertEquals(received[0], testValue, 'subscriber received correct knob position');
    });

    test(`${key}: no notification when value written again unchanged`, () => {
        const tc = makeObservable({ [key]: fromKnob(testValue) });
        const received = [];
        tc.subscribe(key, v => received.push(v));

        tc[key] = fromKnob(testValue); // same value — should not notify
        assertEquals(received.length, 0, 'no notification for unchanged value');
    });
}

run();
