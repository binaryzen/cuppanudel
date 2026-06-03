---
task_id: 03-sa-design-validation
role: solutions-architect
lane: n/a
inputs:
  - artifact_type: ComponentDefinition
    source: "agents/artifacts/02-components/"
  - artifact_type: SpecReview
    source: "agents/artifacts/01-spec-review.md"
  - artifact_type: LaneMap
    source: "agents/artifacts/01-lane-map.md"
  - artifact_type: specifications
    source: "specs/"
outputs:
  - artifact_type: DesignValidation
    destination: "agents/artifacts/03-design-validation.md"
parameters:
  review_depth: thorough
  risk_tolerance: low
---

## Your Task

Review all `ComponentDefinition` files produced by the Staff Engineer. Verify that
they satisfy the specifications, maintain separation of concerns, and do not
introduce the risks you identified in your `SpecReview`. Produce a `DesignValidation`.

## Inputs

- All files in `agents/artifacts/02-components/` — one ComponentDefinition per file
- `agents/artifacts/01-spec-review.md` — your SpecReview (cross-reference every risk)
- `agents/artifacts/01-lane-map.md` — verify component assignments and lane ordering
- All files in `specs/` — the ground truth

## Outputs

`agents/artifacts/03-design-validation.md` — `DesignValidation` artifact per
`contracts/io-contract.md`.

## Acceptance Criteria

- Every ComponentDefinition file is addressed in the DesignValidation findings list
  (even if the finding is "no issues").
- Every risk flagged in the SpecReview is explicitly addressed: either mitigated by
  a ComponentDefinition, or escalated as unresolved.
- Separation of concerns violations are called out by component ID and specific
  finding (e.g., "property-mapper imports from ui/ — violates SoC").
- The `verdict` is "approved" only if no blocking findings remain.
- A `CompletionReport` is the final item in the output file.

## Notes

Pay particular attention to:
- The `workspace` component's import/apply flow — does it correctly sequence
  `sampleSets` registration before `clickProviderRef` resolution? (Per spec.)
- The `property-mapper`'s error-vs-warning distinction — wrong types are errors,
  out-of-range scalars are clamped with a warning. Any ComponentDefinition that
  conflates these is a spec-mismatch finding.
- The `context-menu` component's z-index strategy — modal must be 600, above knob
  overlay (500) and fullscreen panel (100). Verify the ComponentDefinition captures
  this as a success criterion.
- Cross-component dependency validity: `builtin-click-provider` must depend on
  `AudioContext` (injected via `init(ctx)`), not on `sample-provider-registry`.
  The registry stores the provider; the provider does not know about the registry.
