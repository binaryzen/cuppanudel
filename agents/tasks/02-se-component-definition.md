---
task_id: 02-se-component-definition
role: staff-engineer
lane: n/a
inputs:
  - artifact_type: SpecReview
    source: "agents/artifacts/01-spec-review.md"
  - artifact_type: LaneMap
    source: "agents/artifacts/01-lane-map.md"
  - artifact_type: specifications
    source: "specs/"
  - artifact_type: existing-code
    source: "poc/"
outputs:
  - artifact_type: ComponentDefinition
    destination: "agents/artifacts/02-components/<component-id>.md"
parameters:
  component_granularity: module
  require_failure_criteria: true
---

## Your Task

For each component in the `LaneMap`, produce a `ComponentDefinition`. Work from the
specifications and the Solutions Architect's `SpecReview`. Where the SA flagged
ambiguities or risks, resolve them if the spec provides enough information. Escalate
to the coordinator for anything the spec does not settle.

## Inputs

- `agents/artifacts/01-lane-map.md` — the list of components and their lanes
- `agents/artifacts/01-spec-review.md` — SA's gaps, ambiguities, and risks to address
- All files in `specs/` (source of truth)
- Existing POC files for context on the modules being extended

## Outputs

One file per component: `agents/artifacts/02-components/<component-id>.md`
Each file is a `ComponentDefinition` artifact per `contracts/io-contract.md`.

## Acceptance Criteria

- Every component in the LaneMap has a corresponding definition file.
- Every definition includes all six fields: purpose, scope, interface, success
  criteria, failure criteria, dependencies.
- Interface definitions use TypeScript-style function signatures. No pseudocode.
- Success criteria reference specific inputs and expected outputs. None say "it works."
- Failure criteria specify the error type and message, or the return value on failure.
- Dependencies list both `requires` and `must_not_require`.
- A `CompletionReport` is written at the end.

## Notes

Minimum expected components (derive the full list from the LaneMap):

**Serialization layer** (`poc/config/`):
- `property-mapper` — `validateAndApply(schema, source, target)` and `serialize(schema, source)`
- `sample-provider-registry` — singleton registry; `register`, `get`, `list`
- `workspace` — `exportWorkspace(tc, pool)`, `importWorkspace(yamlText, tc, pool, registry)`

**Audio providers** (`poc/audio/`):
- `builtin-click-provider` — synthesises and caches two AudioBuffers; implements SampleProvider
- `media-pool-sample-provider` — pool-backed SampleProvider backed by clip IDs

**UI additions** (likely `poc/ui/`):
- `context-menu` — right-click / long-press trigger, dropdown DOM element, menu items

**Metronome modification** (`poc/timing/metronome.js`):
- The click synthesis block is replaced by SampleProvider usage; define this as a
  modification to the existing module (scope: replace `playClick` internals only)

**TempoContext additions** (`poc/timing/tempo-context.js`):
- Two new fields: `beatAccents[]` and `clickProviderRef`; these may already be
  partially present — read the file before defining this component

Read each existing file before writing a ComponentDefinition that extends it, so
that the interface definition reflects the actual current signatures.
