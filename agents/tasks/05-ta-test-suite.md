---
task_id: 05-ta-test-suite
role: testing-agent
lane: n/a
inputs:
  - artifact_type: ComponentDefinition
    source: "agents/artifacts/02-components/"
  - artifact_type: DesignValidation
    source: "agents/artifacts/03-design-validation.md"
  - artifact_type: source-files
    source: "poc/"
outputs:
  - artifact_type: TestPlan
    destination: "agents/artifacts/05-test-plan.md"
  - artifact_type: integration-tests
    destination: "poc/tests/"
parameters:
  integration_depth: shallow
  determinism_enforcement: strict
  report_granularity: per-test
---

## Your Task

First, produce a `TestPlan` covering all ComponentDefinitions. Wait for Solutions
Architect validation of the plan before writing test code. Then implement the
integration tests, run them against the Implementation Agent's code, and report
results per test case. Iterate with the Implementation Agent until all tests pass.

## Inputs

- All ComponentDefinition files in `agents/artifacts/02-components/`
- `agents/artifacts/03-design-validation.md` — SA's design notes
- Production source files in `poc/` as the Implementation Agent delivers them

## Outputs

1. `agents/artifacts/05-test-plan.md` — `TestPlan` per `contracts/io-contract.md`.
   Submit this to the coordinator for SA validation before writing tests.
2. Integration test files in `poc/tests/` — one file per component or logical group.
3. `StatusReport` after each test run, with per-test-case pass/fail results.
4. `CompletionReport` when all tests pass or all known failures are documented
   with the reason they cannot currently be fixed.

## Acceptance Criteria

- TestPlan covers at least one success-path test and one failure-path test for every
  success and failure criterion listed in each ComponentDefinition.
- Every test case in the TestPlan has a `determinism_note` explaining how
  time, randomness, and I/O are controlled.
- All tests in the plan are implemented in `poc/tests/`.
- Tests exercise only public interfaces (functions listed in component interfaces).
- Final StatusReport lists every test case with its outcome.
- CompletionReport documents any coverage gaps and why they exist.

## Notes

**Test runner**: The project has no external test framework. On first run, check
whether `poc/tests/runner.js` exists. If the Implementation Agent has not created
it, create a minimal one yourself:

```js
// poc/tests/runner.js
const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }
export async function run() {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`✓ ${name}`); passed++; }
    catch (e) { console.error(`✗ ${name}: ${e.message}`); failed++; }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0;
}
```

**AudioContext mocking**: Integration tests cannot use a real `AudioContext` (browser
environment). Create a mock that implements the subset of AudioContext API your tests
need. Minimally: `createBuffer(ch, len, rate)`, `createBufferSource()`,
`createGain()`, and a `currentTime` property.

**js-yaml**: In the Node.js or script-runner environment used for tests, `jsyaml`
is not a global. Either import it from `poc/lib/js-yaml.min.js` if the runner
supports it, or inject a compatible stub.

**Integration scope**: Focus on component-to-component contracts, not end-to-end
browser flows. For example, test that `importWorkspace` correctly calls
`validateAndApply` and then registers sample sets in the `SampleProviderRegistry`
— not that the full page re-renders correctly.
