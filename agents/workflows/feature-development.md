# Workflow: Feature Development

This workflow covers the full cycle from spec review to approved test implementation.
The coordinator (top-level Claude Code session) manages agent lifecycle and
escalation routing. Agents do not communicate directly — all handoffs go through
the coordinator.

---

## Sequence Diagram

```
Coordinator
    │
    ├─spawn──► SA (task 01) ──► SpecReview + LaneMap
    │                                   │
    │◄──────── CompletionReport ◄────────┘
    │
    ├─spawn──► SE (task 02) ──► ComponentDefinitions (one per component)
    │                                   │
    │◄──────── CompletionReport ◄────────┘
    │
    ├─spawn──► SA (task 03) ──► DesignValidation
    │                                   │
    │◄──────── CompletionReport ◄────────┘
    │
    │  [if needs-revision: route back to SE, re-validate]
    │
    ├─spawn──► IA × N (task 04, one per lane, concurrent)
    │          TA    (task 05, singleton, concurrent)
    │                   │
    │                   ├── TA produces TestPlan → coordinator routes to SA for validation
    │                   ├── IA produces code + unit tests per component
    │                   ├── TA runs tests → StatusReport → coordinator routes to IA
    │                   ├── IA fixes → TA re-runs → repeat until passing
    │                   │
    │◄──────── CompletionReports (IA × N + TA) ◄──────────────────────────────┘
    │
    └─spawn──► SE (task 06) ──► TestReview
                                    │
              [if needs-revision: route back to TA, SE re-reviews]
```

---

## Decision Points

| Condition | Coordinator Action |
|---|---|
| SA SpecReview verdict = needs-revision | Present findings to user; do not proceed until user resolves |
| SA DesignValidation verdict = needs-revision | Route findings back to SE; SE revises affected ComponentDefinitions; re-spawn SA task 03 |
| IA escalates an ambiguity | Route to SE; SE updates ComponentDefinition; notify IA to continue |
| TA escalates a cross-component gap | Route to SA; SA advises; SA may update DesignValidation |
| IA+TA iteration reaches 3 cycles without passing | Escalate to coordinator; coordinator checks if ComponentDefinition is incorrect |
| SE TestReview verdict = needs-revision | Route findings to TA; TA revises tests; re-spawn SE task 06 |
| Any agent escalates to coordinator without a clear answer | Present to user before proceeding |

---

## Lane Execution

The `LaneMap` (output of task 01) defines which lanes can run concurrently. The
coordinator reads `LaneMap.lanes[*].depends_on` to determine spawn order:

1. Lanes with empty `depends_on` can be spawned immediately (parallel).
2. A lane is spawned only after all lanes in its `depends_on` list have a
   passing `CompletionReport` from their IA.

**One IA per lane.** Fill in the `lane` field in `tasks/04-ia-implementation.md`
frontmatter before spawning each IA. Use a copy of the task file, or inline the
lane parameter in the assembled prompt.

**One TA total.** The TA covers all components across all lanes in its integration
test suite. Spawn the TA after the first IA is spawned; the TA can write its TestPlan
before all implementation is complete.

---

## Prompt Assembly (coordinator responsibility)

To spawn an agent, concatenate the three layers and pass as the `prompt` parameter
to the Agent tool:

```
[content of roles/<role>.md]

---

## Domain Context

[content of domain/cuppanudel.md]

---

## Your Task

[content of tasks/<task-id>.md]
```

For task 04 (IA), substitute the specific lane ID into the `lane` frontmatter field
before assembly.

---

## Artifact Directory

All agent-produced artifacts are written to `agents/artifacts/`. Structure after
a full run:

```
agents/artifacts/
├── 01-spec-review.md           # SA SpecReview
├── 01-lane-map.md              # SA LaneMap
├── 02-components/
│   └── <component-id>.md       # SE ComponentDefinition (one per component)
├── 03-design-validation.md     # SA DesignValidation
├── 05-test-plan.md             # TA TestPlan
└── 06-test-review.md           # SE TestReview
```

StatusReports and CompletionReports are appended to the relevant artifact file or
to a `<task-id>-reports.md` file in `agents/artifacts/`.

---

## Coordinator Checklist (run this workflow)

- [ ] Assemble SA prompt (roles/solutions-architect.md + domain/cuppanudel.md + tasks/01-sa-spec-review.md)
- [ ] Spawn SA; wait for CompletionReport; check SpecReview verdict
- [ ] If needs-revision: resolve with user, then re-run SA if needed
- [ ] Assemble SE prompt + task 02; spawn SE; wait for CompletionReport
- [ ] Assemble SA prompt + task 03; spawn SA; wait for CompletionReport; check DesignValidation verdict
- [ ] If needs-revision: route to SE, re-validate
- [ ] Read LaneMap; identify concurrent lanes; spawn one IA per lane (task 04 with lane filled)
- [ ] Spawn TA (task 05) concurrently
- [ ] Route TA TestPlan to SA for validation; SA advises; TA proceeds
- [ ] Monitor IA + TA StatusReports; route escalations per decision table above
- [ ] Wait for all IA CompletionReports + TA CompletionReport
- [ ] Assemble SE prompt + task 06; spawn SE; wait for CompletionReport
- [ ] If needs-revision: route to TA, re-review
- [ ] All green → done
