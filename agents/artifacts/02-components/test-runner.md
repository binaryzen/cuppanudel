```yaml
id: test-runner
lane: lane-infra
purpose: >
  Provides a minimal, zero-dependency test harness for running unit tests in Node.js or
  directly in the browser via a plain <script type="module"> import. It gives every
  subsequent lane a consistent way to write and execute synchronous and async test cases
  with pass/fail reporting, without pulling in any external framework.
scope:
  includes:
    - "test(name, fn) registration function — accepts a string name and a sync or async fn"
    - "run() function — executes all registered tests in registration order"
    - "assert(condition, message) helper — throws AssertionError on false"
    - "assertEquals(actual, expected, message) helper — strict === comparison, throws on mismatch"
    - "assertNull(value, message) helper — throws if value !== null"
    - "Console-based pass/fail output: PASS / FAIL lines with test name and error message"
    - "run() returns a summary object { passed: number, failed: number, total: number }"
    - "Module file at poc/test/runner.js"
  excludes:
    - "DOM-rendered test results — console output only"
    - "Test isolation / module-cache busting between test cases"
    - "Mocking or stubbing framework"
    - "Code coverage instrumentation"
    - "External test runner integration (Jest, Mocha, etc.)"
interface: |
  // poc/test/runner.js

  // Registers a named test case. fn may be async.
  function test(name: string, fn: () => void | Promise<void>): void

  // Runs all registered tests sequentially. Returns a summary.
  // Logs "PASS <name>" or "FAIL <name>: <error.message>" to console for each test.
  // Logs a final summary line: "Tests: X passed, Y failed, Z total"
  async function run(): Promise<{ passed: number; failed: number; total: number }>

  // Throws AssertionError (extends Error) if condition is falsy.
  // message defaults to "Assertion failed"
  function assert(condition: unknown, message?: string): void

  // Throws AssertionError if actual !== expected (strict equality).
  // Error message format: "Expected <expected>, got <actual>. <message>"
  function assertEquals(actual: unknown, expected: unknown, message?: string): void

  // Throws AssertionError if value !== null.
  // Error message format: "Expected null, got <value>. <message>"
  function assertNull(value: unknown, message?: string): void

  // Error class used by all assertion helpers.
  class AssertionError extends Error {
    constructor(message: string)
  }
success_criteria:
  - "Given test('pass', () => {}), run() logs 'PASS pass' and returns { passed: 1, failed: 0, total: 1 }"
  - "Given test('fail', () => { throw new Error('boom') }), run() logs 'FAIL fail: boom' and returns { passed: 0, failed: 1, total: 1 }"
  - "Given test('async', async () => { await Promise.resolve(); assert(true); }), run() awaits the promise and counts it as passed"
  - "assert(false, 'msg') throws AssertionError with message 'msg'"
  - "assertEquals(1, 2) throws AssertionError with message containing 'Expected 2, got 1'"
  - "assertNull(42) throws AssertionError with message containing 'Expected null, got 42'"
  - "assertNull(null) does not throw"
  - "run() called with no registered tests returns { passed: 0, failed: 0, total: 0 } and logs summary line"
  - "Multiple test() calls register independently; run() executes them in registration order"
  - "A test that rejects an async promise is counted as failed, not as an unhandled rejection"
failure_criteria:
  - "If fn throws synchronously, run() catches the error, logs FAIL, increments failed count, and continues to next test — does not abort the run"
  - "If fn returns a rejected Promise, run() catches the rejection, logs FAIL, and continues"
  - "assert(false) with no message throws AssertionError with message 'Assertion failed'"
  - "assertEquals called with objects that are not === throws even if they are structurally equal"
dependencies:
  requires: []
  must_not_require:
    - "config/property-mapper"
    - "any application module under poc/"
    - "any npm package or external script"
```
