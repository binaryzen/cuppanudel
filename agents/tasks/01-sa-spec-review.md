---
task_id: 01-sa-spec-review
role: solutions-architect
lane: n/a
inputs:
  - artifact_type: specifications
    source: "specs/"
  - artifact_type: existing-code
    source: "poc/"
outputs:
  - artifact_type: SpecReview
    destination: "agents/artifacts/01-spec-review.md"
  - artifact_type: LaneMap
    destination: "agents/artifacts/01-lane-map.md"
parameters:
  review_depth: thorough
  risk_tolerance: low
  lane_granularity: module
---

## Your Task

Review the Cuppanudel specification documents. Produce a `SpecReview` identifying
gaps, ambiguities, and risks. Then produce a `LaneMap` organizing the new
implementation work into parallel execution lanes.

Focus your review on the **new work** described in:
- `specs/workspace.md` — property-mapper, SampleProvider, SampleProviderRegistry,
  workspace export/import, component context menus
- The *Planned Features* section of `specs/requirements.md` — Alignment Monitor,
  File Import, Tempo Presets

Treat existing POC modules (`metronome.js`, `media-pool.js`, `knob.js`, visualizers)
as baseline. New work extends them; you are not redesigning them unless a spec
explicitly requires it.

## Inputs

Read all spec files:
- `specs/requirements.md`
- `specs/workspace.md`
- `specs/content-service.md`
- `specs/ui-interaction-model.md`
- `specs/project-structure.md`

Read the existing POC source files that the new work touches:
- `poc/timing/tempo-context.js`
- `poc/timing/metronome.js`
- `poc/pool/media-pool.js`
- `poc/main.js`
- `poc/index.html`

## Outputs

1. `agents/artifacts/01-spec-review.md` — `SpecReview` artifact, YAML in a fenced
   code block, per `contracts/io-contract.md`
2. `agents/artifacts/01-lane-map.md` — `LaneMap` artifact, YAML in a fenced code
   block, per `contracts/io-contract.md`

## Acceptance Criteria

- Every spec section that introduces a new module or modifies an existing module's
  interface is addressed in the SpecReview.
- Every gap, ambiguity, or risk entry has a specific location (file + section) and
  a description clear enough that the Staff Engineer can act on it.
- The LaneMap accounts for all new modules described in `specs/workspace.md` and
  the Planned Features section of `specs/requirements.md`.
- Dependencies between lanes are correct and complete (no cycle, no missing edge).
- LaneMap includes the `critical_path` field.
- A `CompletionReport` is the final item in the output file.

## Notes

The `specs/workspace.md` *Resolved Ambiguities* table has already settled many design
questions. Treat those as closed. Focus SpecReview ambiguities on anything not covered
by that table, or on tensions between `workspace.md` and other spec files.

js-yaml will be vendored at `poc/lib/js-yaml.min.js`. Do not flag its absence as a
gap — it is a known pending action.

The test runner strategy (no external framework) is noted in the domain context. The
LaneMap should include a lane for test infrastructure setup.
