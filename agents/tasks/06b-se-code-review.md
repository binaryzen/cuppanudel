---
task_id: 06b-se-code-review
role: staff-engineer
lane: n/a
inputs:
  - artifact_type: source-files
    source: "poc/"
  - artifact_type: ComponentDefinition
    source: "agents/artifacts/02-components/"
  - artifact_type: DesignValidation
    source: "agents/artifacts/03-design-validation.md"
outputs:
  - artifact_type: CodeReview
    destination: "agents/artifacts/06b-code-review.md"
parameters:
  component_granularity: module
  test_review_depth: thorough
---

## Your Task

Review the production code delivered by Implementation Agents across all lanes.
Assess each component for coherence with its ComponentDefinition, code clarity,
edge case handling, and adherence to project coding conventions. Produce a
`CodeReview` artifact.

## Inputs

- All new/modified source files in `poc/` delivered by Implementation Agents.
  Focus on files in: `poc/config/`, `poc/audio/` (new providers), `poc/ui/`
  (context menu, modal), `poc/timing/` (metronome refactor, tempo-context additions),
  `poc/visualizers/alignment-monitor.js`, `poc/pool/` (any changes).
- ComponentDefinition files in `agents/artifacts/02-components/` — the reference for
  intended scope and interface.
- `agents/artifacts/03-design-validation.md` — SA's design notes; check that flagged
  risks were addressed in implementation.

## Review Criteria

For each component:

**Coherence**: Does the implementation match the ComponentDefinition interface exactly?
- Are all interface functions present with the correct signatures?
- Does the implementation include any behaviour not in the scope?
- Are all success criteria reachable by the public API?

**Clarity**: Is the code readable without explanatory comments?
- Are identifiers clear and self-describing?
- Is control flow easy to follow? Are there nested conditions that could be flattened?
- Are magic numbers named constants?

**Edge cases**: Are all failure criteria handled?
- Does `getSample()` return `null` (not `undefined`) in all out-of-range and
  uninitialised cases?
- Does `validateAndApply` truly make no partial writes on error?
- Are array bounds, null inputs, and missing optional fields guarded?

**Conventions** (per `agents/domain/cuppanudel.md`):
- No `class` syntax where a factory function suffices.
- No bare module specifiers.
- No dead code, no unused variables.
- No comments explaining what code does — only non-obvious why comments.
- No default exports from multi-export files.

## Outputs

`agents/artifacts/06b-code-review.md` — `CodeReview` artifact per
`contracts/io-contract.md`.

## Acceptance Criteria

- Every new/modified component file is addressed in the review.
- Every finding has a `severity`: `blocking` (must fix before done) or `advisory`
  (improvement suggestion, not required).
- `verdict` is "approved" only if no blocking findings remain.
- A `CompletionReport` is the final item in the output file.

## Notes

Code review runs concurrently with test review (task 06-se-test-review). Both are SE
responsibilities and may be done in the same pass through the codebase if efficient.
If you combine them into a single run, write both output files; do not merge the
artifacts.

If a blocking finding requires a change, the Implementation Agent must address it
and the SE re-reviews only the affected component.
