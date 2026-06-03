---
task_id: 04-ia-implementation
role: implementation-agent
lane: "[FILL IN: lane id from LaneMap before spawning]"
inputs:
  - artifact_type: ComponentDefinition
    source: "agents/artifacts/02-components/"
  - artifact_type: DesignValidation
    source: "agents/artifacts/03-design-validation.md"
  - artifact_type: existing-code
    source: "poc/"
outputs:
  - artifact_type: source-files
    destination: "poc/ (per layout in domain context)"
parameters:
  unit_test_coverage: required
  scope_enforcement: strict
  reporting_frequency: per-file
---

## Your Task

Implement the software components assigned to your lane. For each component, write
the production code and its unit tests. Read the existing POC files before touching
any module they extend. Report status after each file is written.

## Inputs

Before writing any code:
1. Read `agents/artifacts/03-design-validation.md` — note any SA findings for your
   components. If a finding marks a component as needing revision, do not implement
   it until the Staff Engineer has updated the ComponentDefinition.
2. Read the ComponentDefinition file for each component in your lane:
   `agents/artifacts/02-components/<component-id>.md`
3. Read any existing POC files your components extend (listed in `depends_on` and
   in the domain context file layout).

## Outputs

Production source files and co-located unit tests placed in `poc/` following the
directory layout in `agents/domain/cuppanudel.md`. File naming: match the module
name from the ComponentDefinition.

Unit test files: same directory, same base name, `.test.js` suffix.
Example: `poc/config/property-mapper.js` + `poc/config/property-mapper.test.js`.

## Acceptance Criteria

- Every public function named in the ComponentDefinition interface has at least one
  passing unit test covering a success path.
- Every failure criterion in the ComponentDefinition has at least one unit test
  that triggers it and asserts the correct error or return value.
- No implementation goes beyond the ComponentDefinition's scope. If you add
  something not in scope, it must be escalated and approved first.
- All unit tests pass before you report the component as complete.
- A `StatusReport` is written after each source file is complete (not at the end).
- A `CompletionReport` is written after all components in your lane pass their tests.

## Notes

**This task file is a template.** Before spawning an IA, fill in the `lane` field
and remove this note. One IA instance is spawned per lane.

**Test runner**: The Testing Agent will establish the test runner. Before writing
unit tests, check whether `poc/tests/runner.js` exists. If not, implement a minimal
self-contained runner: a plain JS module that collects test functions, runs them,
and prints pass/fail per test. No external libraries. Export a `test(name, fn)`
function and a `run()` function.

**js-yaml**: If your components require `jsyaml`, it is loaded as a UMD global
via `<script src="/poc/lib/js-yaml.min.js">`. In module files, reference it as the
`window.jsyaml` global (or pass it as an injected dependency in tests).

**SampleProvider and AudioContext**: Components that use `AudioContext` do not
create it — they receive it as a parameter. The session creates the single
`AudioContext` instance inside the first user gesture handler in `main.js`.
