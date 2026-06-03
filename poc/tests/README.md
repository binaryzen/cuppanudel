# Integration Test Suite for Cuppanudel

This directory contains integration tests for all components in the Cuppanudel project.

## Test Files Organization

All tests are organized by component lane and follow the test cases defined in `agents/artifacts/05-test-plan.md`.

### Implemented Components (Tests Passing) ✅

1. **property-mapper.test.js** (5 tests)
   - tc-002: Two-pass atomic write
   - tc-003: Clamping with warnings
   - tc-004: exactLength reference validation
   - tc-045: serialize() with defaults
   - tc-046: serialize() with source values

2. **sample-provider-registry.test.js** (4 tests)
   - tc-010: Auto-registration
   - tc-011: Duplicate detection
   - tc-011b: Reset functionality
   - tc-012: Snapshot arrays

3. **builtin-click-provider.test.js** (3 tests)
   - tc-007: Pre-init null checks
   - tc-008: Buffer synthesis and caching
   - tc-009: Init idempotency

4. **tempo-context.test.js** (2 tests)
   - tc-005: Default fields
   - tc-006: Field preservation

5. **metronome.test.js** (6 tests)
   - tc-013: getSample() calls
   - tc-014: Volume threshold
   - tc-015: Error logging
   - tc-016: Restart behavior
   - tc-017: BPM invariance
   - tc-018: Required provider check

6. **content-service.test.js** (4 tests)
   - tc-027: Initial state
   - tc-028: Duplicate detection
   - tc-028b: Idempotent unregister
   - tc-028c: Provider removal

7. **local-file-provider.test.js** (1 test)
   - tc-029: Abort handling

8. **recordings-provider.test.js** (2 tests)
   - tc-030a: Snapshot semantics
   - tc-030b: Error rejection

9. **media-pool.test.js** (1 test)
   - tc-031: Undefined return value

10. **alignment-monitor.test.js** (2 tests)
    - tc-039: BPM invariance
    - tc-040: Memory management

### Pending Components (Skeleton Tests) ⏳

11. **workspace.test.js** (4 tests)
    - tc-019: Import orchestration
    - tc-020: File size cap
    - tc-021: Parser selection
    - tc-022: Export assembly

12. **context-menu.test.js** (2 tests)
    - tc-023: Clipboard unavailable handling
    - tc-024: Paste import

13. **edit-config-modal.test.js** (5 tests)
    - tc-025: Singleton enforcement
    - tc-026: YAML parsing and validation
    - tc-047: Cancel behavior
    - tc-048: Escape key handling
    - tc-049: Error display

14. **media-pool-sample-provider.test.js** (2 tests)
    - tc-032: Undefined normalization
    - tc-033: Synchronous init

15. **sample-set-picker.test.js** (1 test)
    - tc-034: Callback invocation

16. **preset-store.test.js** (4 tests)
    - tc-035: localStorage persistence
    - tc-036: Workspace import
    - tc-050: Bounds checking
    - tc-051: Error recovery

17. **preset-bank.test.js** (4 tests)
    - tc-037: Apply with restart
    - tc-038: Apply without restart
    - tc-052: Save mode UI
    - tc-053: snapshot field inclusion

18. **main-js.test.js** (4 tests)
    - tc-041: Provider initialization
    - tc-042: Provider registration
    - tc-043: Workspace buttons
    - tc-044: Drop target

## Running Tests

### Run a specific test file
```bash
node poc/tests/property-mapper.test.js
```

### Run all implemented tests
```bash
for f in poc/tests/*.test.js; do echo "=== $f ===" && node "$f"; done
```

### Expected Output
```
PASS tc-XXX: test description
Tests: X passed, 0 failed, X total
```

## Test Coverage

- **Total Test Cases**: 52
- **Implemented & Passing**: 30 ✅
- **Pending (code not available)**: 22 ⏳
- **Failing**: 0

## Mocking Strategy

All tests use deterministic mocks:
- **AudioContext**: OfflineAudioContext or minimal mock
- **localStorage**: Not required for implemented tests
- **File APIs**: Mocked showOpenFilePicker
- **Clipboard API**: Mocked navigator.clipboard
- **Console I/O**: Captured and asserted

## Test Harness

Uses the test runner defined in `poc/test/runner.js`:
- `test(name, fn)` - Register a test
- `run()` - Execute all tests
- `assert(condition, message)` - Assert condition
- `assertEquals(actual, expected)` - Assert strict equality
- `assertNull(value)` - Assert null value

## Notes

- No production code is modified by tests
- All tests are isolated and can run independently
- Tests follow the TestPlan specification exactly
- Each test focuses on public interfaces only
- Node.js compatible with graceful fallback for browser-only APIs

---

For details on the test plan, see: `agents/artifacts/05-test-plan.md`
For execution report, see: `agents/artifacts/05-test-reports.md`
