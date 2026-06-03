class AssertionError extends Error {
	constructor(message) {
		super(message);
		this.name = 'AssertionError';
	}
}

const tests = [];

function test(name, fn) {
	tests.push({ name, fn });
}

async function run() {
	let passed = 0;
	let failed = 0;

	for (const { name, fn } of tests) {
		try {
			await fn();
			console.log(`PASS ${name}`);
			passed++;
		} catch (error) {
			console.log(`FAIL ${name}: ${error.message}`);
			failed++;
		}
	}

	const total = passed + failed;
	console.log(`Tests: ${passed} passed, ${failed} failed, ${total} total`);

	return { passed, failed, total };
}

function assert(condition, message = 'Assertion failed') {
	if (!condition) {
		throw new AssertionError(message);
	}
}

function assertEquals(actual, expected, message = '') {
	if (actual !== expected) {
		const msg = `Expected ${expected}, got ${actual}.${message ? ' ' + message : ''}`;
		throw new AssertionError(msg);
	}
}

function assertNull(value, message = '') {
	if (value !== null) {
		const msg = `Expected null, got ${value}.${message ? ' ' + message : ''}`;
		throw new AssertionError(msg);
	}
}

// Internal test-only reset function for clearing the tests array.
// Not part of the public API; used only by test harnesses.
function _reset() {
	tests.length = 0;
}

export { test, run, assert, assertEquals, assertNull, AssertionError, _reset };

