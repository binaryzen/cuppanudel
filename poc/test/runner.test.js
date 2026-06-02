import { test, run, assert, assertEquals, assertNull, AssertionError, _reset } from './runner.js';

// Self-test harness: use plain try/catch since we can't use the runner to test itself
let passCount = 0;
let failCount = 0;

async function selfTest(name, fn) {
	try {
		await fn();
		console.log(`✓ ${name}`);
		passCount++;
	} catch (error) {
		console.log(`✗ ${name}: ${error.message}`);
		failCount++;
	}
}

async function runSelfTests() {
	console.log('\n=== Runner Self-Tests ===\n');

	// Test 1: assert(true) does not throw
	await selfTest('assert(true) does not throw', () => {
		assert(true);
	});

	// Test 2: assert(false) throws AssertionError with default message
	await selfTest('assert(false) throws AssertionError with default message', () => {
		try {
			assert(false);
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (e.message !== 'Assertion failed') {
				throw new Error(`Expected message "Assertion failed", got "${e.message}"`);
			}
		}
	});

	// Test 3: assert(false, 'custom') throws with custom message
	await selfTest('assert(false, "custom") throws with custom message', () => {
		try {
			assert(false, 'custom msg');
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (e.message !== 'custom msg') {
				throw new Error(`Expected message "custom msg", got "${e.message}"`);
			}
		}
	});

	// Test 4: assertEquals with matching values does not throw
	await selfTest('assertEquals(1, 1) does not throw', () => {
		assertEquals(1, 1);
	});

	// Test 5: assertEquals with mismatched values throws
	await selfTest('assertEquals(1, 2) throws AssertionError', () => {
		try {
			assertEquals(1, 2);
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (!e.message.includes('Expected 2, got 1')) {
				throw new Error(`Expected message containing "Expected 2, got 1", got "${e.message}"`);
			}
		}
	});

	// Test 6: assertEquals with message appends to error
	await selfTest('assertEquals(1, 2, "extra") includes extra message', () => {
		try {
			assertEquals(1, 2, 'extra');
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (!e.message.includes('extra')) {
				throw new Error(`Expected message containing "extra", got "${e.message}"`);
			}
		}
	});

	// Test 7: assertEquals does strict === comparison (not structural equality)
	await selfTest('assertEquals({a:1}, {a:1}) throws (not structural equality)', () => {
		try {
			assertEquals({ a: 1 }, { a: 1 });
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
		}
	});

	// Test 8: assertNull(null) does not throw
	await selfTest('assertNull(null) does not throw', () => {
		assertNull(null);
	});

	// Test 9: assertNull(undefined) throws
	await selfTest('assertNull(undefined) throws AssertionError', () => {
		try {
			assertNull(undefined);
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (!e.message.includes('Expected null, got undefined')) {
				throw new Error(`Expected message containing "Expected null, got undefined", got "${e.message}"`);
			}
		}
	});

	// Test 10: assertNull(0) throws
	await selfTest('assertNull(0) throws AssertionError', () => {
		try {
			assertNull(0);
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (!e.message.includes('Expected null, got 0')) {
				throw new Error(`Expected message containing "Expected null, got 0", got "${e.message}"`);
			}
		}
	});

	// Test 11: assertNull with message appends to error
	await selfTest('assertNull(42, "extra") includes extra message', () => {
		try {
			assertNull(42, 'extra');
			throw new Error('Expected AssertionError to be thrown');
		} catch (e) {
			if (!(e instanceof AssertionError)) throw e;
			if (!e.message.includes('extra')) {
				throw new Error(`Expected message containing "extra", got "${e.message}"`);
			}
		}
	});

	// Test 12: test() registers a test case
	await selfTest('test() registers a test case', async () => {
		_reset();
		const testFn = () => {};
		test('dummy test', testFn);
		const result = await run();
		if (result.total < 1) {
			throw new Error('No test was registered');
		}
	});

	// Test 13: run() executes tests in order
	await selfTest('run() executes tests in order', async () => {
		_reset();
		const order = [];
		test('first', () => {
			order.push(1);
		});
		test('second', () => {
			order.push(2);
		});
		await run();
		if (order[0] !== 1 || order[1] !== 2) {
			throw new Error(`Expected execution order [1, 2], got [${order}]`);
		}
	});

	// Test 14: run() logs PASS for passing tests
	await selfTest('run() logs PASS for passing tests', async () => {
		_reset();
		const capturedOutput = [];
		const originalLog = console.log;
		console.log = (msg) => {
			capturedOutput.push(msg);
		};
		test('passing test', () => {
			assert(true);
		});
		await run();
		console.log = originalLog;
		const hasPass = capturedOutput.some((line) => line.startsWith('PASS'));
		if (!hasPass) {
			throw new Error('No PASS line found in output');
		}
	});

	// Test 15: run() logs FAIL for failing tests and continues
	await selfTest('run() logs FAIL for failing tests and continues', async () => {
		_reset();
		const capturedOutput = [];
		const originalLog = console.log;
		console.log = (msg) => {
			capturedOutput.push(msg);
		};
		test('failing test', () => {
			throw new Error('boom');
		});
		test('next test', () => {
			assert(true);
		});
		await run();
		console.log = originalLog;
		const hasFail = capturedOutput.some((line) => line.startsWith('FAIL'));
		const hasPass = capturedOutput.some((line) => line.startsWith('PASS'));
		if (!hasFail || !hasPass) {
			throw new Error('FAIL or PASS line missing from output');
		}
	});

	// Test 16: run() returns summary with correct counts
	await selfTest('run() returns summary with correct counts', async () => {
		_reset();
		test('pass1', () => {
			assert(true);
		});
		test('fail1', () => {
			throw new Error('failure');
		});
		test('pass2', () => {
			assert(true);
		});
		const result = await run();
		if (result.passed !== 2 || result.failed !== 1 || result.total !== 3) {
			throw new Error(
				`Expected {passed:2, failed:1, total:3}, got {passed:${result.passed}, failed:${result.failed}, total:${result.total}}`
			);
		}
	});

	// Test 17: run() with no registered tests returns empty summary
	await selfTest('run() with no registered tests returns {passed:0, failed:0, total:0}', async () => {
		_reset();
		const result = await run();
		if (result.passed !== 0 || result.failed !== 0 || result.total !== 0) {
			throw new Error(
				`Expected {passed:0, failed:0, total:0}, got {passed:${result.passed}, failed:${result.failed}, total:${result.total}}`
			);
		}
	});

	// Test 18: run() handles async tests
	await selfTest('run() handles async tests', async () => {
		_reset();
		let resolved = false;
		test('async test', async () => {
			await Promise.resolve();
			resolved = true;
		});
		await run();
		if (!resolved) {
			throw new Error('Async test was not awaited');
		}
	});

	// Test 19: run() catches rejected promises in async tests
	await selfTest('run() catches rejected promises in async tests', async () => {
		_reset();
		const capturedOutput = [];
		const originalLog = console.log;
		console.log = (msg) => {
			capturedOutput.push(msg);
		};
		test('rejected promise', async () => {
			await Promise.reject(new Error('rejection'));
		});
		const result = await run();
		console.log = originalLog;
		if (result.failed !== 1) {
			throw new Error(`Expected 1 failed test, got ${result.failed}`);
		}
		const hasFail = capturedOutput.some((line) => line.includes('rejection'));
		if (!hasFail) {
			throw new Error('Rejection error message not logged');
		}
	});

	// Test 20: run() logs final summary line
	await selfTest('run() logs final summary line', async () => {
		_reset();
		const capturedOutput = [];
		const originalLog = console.log;
		console.log = (msg) => {
			capturedOutput.push(msg);
		};
		test('t1', () => {
			assert(true);
		});
		await run();
		console.log = originalLog;
		const hasSummary = capturedOutput.some((line) =>
			line.includes('Tests:') && line.includes('passed') && line.includes('failed') && line.includes('total')
		);
		if (!hasSummary) {
			throw new Error('Summary line not found in output');
		}
	});

	console.log(`\n=== Self-Test Summary ===`);
	console.log(`Passed: ${passCount}, Failed: ${failCount}, Total: ${passCount + failCount}\n`);

	if (failCount > 0) {
		process.exit(1);
	}
}

runSelfTests().catch((error) => {
	console.error('Unexpected error during self-tests:', error);
	process.exit(1);
});
