import { test, run, assert, assertEquals } from '../test/runner.js';
import { makeObservable } from '../state/observable.js';

test('notifies subscriber when property changes', () => {
    const obj = makeObservable({ x: 1 });
    const calls = [];
    obj.subscribe('x', v => calls.push(v));
    obj.x = 42;
    assertEquals(calls.length, 1);
    assertEquals(calls[0], 42);
});

test('does not notify when value is unchanged', () => {
    const obj = makeObservable({ x: 5 });
    const calls = [];
    obj.subscribe('x', v => calls.push(v));
    obj.x = 5;
    assertEquals(calls.length, 0);
});

test('notifies multiple subscribers independently', () => {
    const obj = makeObservable({ x: 0 });
    const a = [], b = [];
    obj.subscribe('x', v => a.push(v));
    obj.subscribe('x', v => b.push(v));
    obj.x = 7;
    assertEquals(a[0], 7);
    assertEquals(b[0], 7);
});

test('unsubscribe stops notifications', () => {
    const obj = makeObservable({ x: 0 });
    const calls = [];
    const fn = v => calls.push(v);
    obj.subscribe('x', fn);
    obj.x = 1;
    obj.unsubscribe('x', fn);
    obj.x = 2;
    assertEquals(calls.length, 1);
    assertEquals(calls[0], 1);
});

test('subscription on one key does not fire for another', () => {
    const obj = makeObservable({ x: 0, y: 0 });
    const calls = [];
    obj.subscribe('x', v => calls.push(v));
    obj.y = 99;
    assertEquals(calls.length, 0);
});

test('write terminates after one cycle (no infinite loop)', () => {
    const obj = makeObservable({ x: 0 });
    let depth = 0;
    obj.subscribe('x', v => {
        depth++;
        if (depth > 5) throw new Error('infinite loop detected');
        obj.x = v; // write same value — should not re-notify
    });
    obj.x = 1;
    assertEquals(depth, 1);
});

test('subscribe and unsubscribe are not enumerable data properties', () => {
    const raw = { x: 0 };
    const obj = makeObservable(raw);
    assert(!Object.prototype.hasOwnProperty.call(raw, 'subscribe'),
        'subscribe must not be stored on the underlying object');
    assert(!Object.prototype.hasOwnProperty.call(raw, 'unsubscribe'),
        'unsubscribe must not be stored on the underlying object');
});

run();
