---
task_id: 06-se-test-review
role: staff-engineer
lane: n/a
inputs:
  - artifact_type: TestPlan
    source: "agents/artifacts/05-test-plan.md"
  - artifact_type: integration-tests
    source: "poc/tests/"
  - artifact_type: ComponentDefinition
    source: "agents/artifacts/02-components/"
  - artifact_type: StatusReport
    source: "Testing Agent (most recent test run results)"
outputs:
  - artifact_type: TestReview
    destination: "agents/artifacts/06-test-review.md"
parameters:
  test_review_depth: thorough
---

## Your Task

Review the Testing Agent's `TestPlan` and the implemented integration tests. Verify
each test is deterministic, exercises a stated requirement correctly, and covers the
success and failure criteria in the ComponentDefinitions. Produce a `TestReview`.

## Inputs

- `agents/artifacts/05-test-plan.md` — the TestPlan
- `poc/tests/` — the implemented test files
- All files in `agents/artifacts/02-components/` — the ComponentDefinitions
- The Testing Agent's most recent `StatusReport` (test run results)

## Outputs

`agents/artifacts/06-test-review.md` — `TestReview` artifact per `contracts/io-contract.md`.

## Acceptance Criteria

- Every test case in the TestPlan is addressed in the findings list (even if the
  finding is "no issues").
- For each test case, you explicitly assess: (a) determinism, (b) whether it tests
  the correct interface or behavior, (c) whether it covers a specific criterion from
  the ComponentDefinition.
- Tests are not given blanket approval. Each one is assessed individually.
- Missing coverage is documented: for each success/failure criterion in each
  ComponentDefinition, note whether it is covered, partially covered, or uncovered.
- The `verdict` is "approved" only if no non-deterministic, wrong-target, or missing
  tests remain.
- A `CompletionReport` is the final item in the output file.

## Notes

If the Testing Agent's status report shows failing tests at the time of this review,
note which failures are pre-existing vs. introduced by iteration. Do not block the
review on all tests passing — assess the test quality independently of the
implementation state. You can approve a test suite that is failing because of
implementation bugs, as long as the tests themselves are correct.
