# Artifact I/O Contract

This contract defines the typed artifacts exchanged between agents. Every role's inputs
and outputs are constrained to these types. Roles are pluggable across projects because
they depend on this contract, not on each other or the domain directly.

---

## SpecReview

Produced by: Solutions Architect
Consumed by: Staff Engineer, coordinator

```yaml
scope: [list of spec files or sections reviewed]
gaps:
  - location: "specs/foo.md §3"
    description: "What is missing or underspecified"
ambiguities:
  - location: "specs/foo.md §3"
    description: "What is contradictory or unclear"
    question: "The specific question that must be answered"
risks:
  - type: security | functional | maintainability
    description: "What the risk is and why it matters"
    mitigation: "Recommended mitigation"
verdict: approved | needs-revision
```

---

## LaneMap

Produced by: Solutions Architect
Consumed by: Staff Engineer, Implementation Agents, coordinator

```yaml
lanes:
  - id: "lane-a"
    components: [component-id-1, component-id-2]
    depends_on: []               # lane IDs that must complete before this lane starts
    can_parallelize: true        # whether components within this lane can run concurrently
critical_path: [lane-a, lane-b] # longest dependency chain, in execution order
```

---

## ComponentDefinition

Produced by: Staff Engineer
Consumed by: Implementation Agent, Testing Agent, Solutions Architect (design validation)

```yaml
id: component-id
lane: lane-a
purpose: >
  What the component does and why it exists. 1–3 sentences.
scope:
  includes: [list of responsibilities]
  excludes: [list of things explicitly out of scope]
interface: |
  // TypeScript-style notation
  function foo(arg: Type): ReturnType
  function bar(arg: Type): ReturnType
success_criteria:
  - "Given X input, produces Y output"
  - "Given Z state, emits W event"
failure_criteria:
  - "If input is wrong type, throws TypeError with message '...'"
  - "If dependency is unavailable, returns null (does not throw)"
dependencies:
  requires: [component-ids this depends on]
  must_not_require: [component-ids that would create cycles or violations]
```

---

## DesignValidation

Produced by: Solutions Architect
Consumed by: Staff Engineer, coordinator

```yaml
components_reviewed: [component-id-1, component-id-2]
findings:
  - component_id: component-id-1
    type: spec-mismatch | soc-violation | risk | missing-field
    description: "Specific finding"
verdict: approved | needs-revision
```

---

## TestPlan

Produced by: Testing Agent (before writing tests)
Consumed by: Solutions Architect (for validation), Staff Engineer

```yaml
component_ids: [list of ComponentDefinition IDs covered]
test_cases:
  - id: "tc-001"
    type: unit | integration
    component_id: component-id
    description: "What behavior is being tested"
    inputs: "What inputs are provided"
    expected_output: "What the test asserts"
    determinism_note: "How time/randomness/I/O is controlled"
coverage_gaps:
  - requirement: "Which success/failure criterion is not covered"
    rationale: "Why it is not covered"
```

---

## TestReview

Produced by: Staff Engineer
Consumed by: Testing Agent, coordinator

```yaml
test_cases_reviewed: [tc-001, tc-002]
findings:
  - test_id: tc-001
    issue: non-deterministic | redundant | missing | wrong-target | other
    description: "Specific finding"
verdict: approved | needs-revision
```

---

## StatusReport

Produced by: any agent at any checkpoint
Consumed by: coordinator

```yaml
agent_role: solutions-architect
task_id: 01-sa-spec-review
status: in-progress | blocked | complete
completed_steps: [list]
next_steps: [list]
blockers: []   # empty if none
```

---

## CompletionReport

Produced by: any agent upon task completion
Consumed by: coordinator

```yaml
agent_role: solutions-architect
task_id: 01-sa-spec-review
deliverables:
  - agents/artifacts/01-spec-review.md
  - agents/artifacts/01-lane-map.md
summary: "2–4 sentence summary of what was accomplished"
unexpected_conditions: []   # or list with resolution for each
workflow_misses: []         # steps in the task definition that were unclear or wrong
improvement_suggestions: [] # specific, actionable suggestions
```

---

## Escalation

Produced by: any agent when blocked
Consumed by: the agent's escalation target (see escalation chain in README)

```yaml
from_role: implementation-agent
to_role: staff-engineer | solutions-architect | coordinator
task_id: 04-ia-implementation
blocking: true | false
question: "Exactly one specific question"
context: "Relevant artifact IDs, file paths, or excerpts"
options_considered:
  - "Option A and its implications"
  - "Option B and its implications"
```
