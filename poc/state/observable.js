/**
 * Wraps a plain object in a Proxy that notifies subscribers when properties change.
 *
 * Usage:
 *   const state = makeObservable({ bpm: 120 });
 *   state.subscribe('bpm', v => console.log('bpm changed to', v));
 *   state.bpm = 180;  // triggers the subscriber above
 *
 * Notes:
 *   - 'subscribe' and 'unsubscribe' are reserved keys and must not be used as
 *     property names on the wrapped object.
 *   - Notification is skipped when the new value is strictly equal to the old one,
 *     which naturally terminates the common write → notify → write cycle.
 *   - Array/object identity: assigning a new array always notifies even if contents
 *     are the same (=== comparison on the reference).
 */
export function makeObservable(obj) {
    const _subs = new Map(); // property key → Set<fn>

    function subscribe(key, fn) {
        if (!_subs.has(key)) _subs.set(key, new Set());
        _subs.get(key).add(fn);
    }

    function unsubscribe(key, fn) {
        _subs.get(key)?.delete(fn);
    }

    return new Proxy(obj, {
        get(target, key) {
            if (key === 'subscribe')   return subscribe;
            if (key === 'unsubscribe') return unsubscribe;
            return target[key];
        },
        set(target, key, value) {
            const prev = target[key];
            target[key] = value;
            if (prev !== value) {
                _subs.get(key)?.forEach(fn => fn(value, prev));
            }
            return true;
        },
    });
}
