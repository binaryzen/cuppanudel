# Reporting Format

All agents produce reports at two points: status checkpoints during work, and a
completion report when the task is done. Fields marked * are required.

Write reports as Markdown with YAML code blocks matching the schemas in
`contracts/io-contract.md`. Append them to your task's output artifact file, or write
them to a separate `agents/artifacts/<task-id>-reports.md` if the task does not have
a single output file.

---

## Status Report

Post a status report after each major step (e.g., each component completed, each test
run completed). Do not wait until the end.

```markdown
## Status Report — [task-id]* [timestamp UTC]*

**Agent**: [role name]*
**Status**: in-progress | blocked | complete*

### Completed Since Last Report
- [step description]

### Next Steps
- [step description]

### Blockers
_none_ — or list each blocker with its escalation target
```

---

## Completion Report

Post exactly one completion report as the final output of the task, after all
deliverables are written.

```markdown
## Completion Report — [task-id]* [timestamp UTC]*

**Agent**: [role name]*

### Deliverables
- `path/to/artifact.md` — [brief description]*

### Summary
[2–4 sentences: what was accomplished, key decisions made.]*

### Unexpected Conditions
_none_ — or for each: what happened and how it was resolved

### Workflow Misses
_none_ — or steps in the task definition that were unclear, missing, or wrong

### Improvement Suggestions
_none_ — or specific, actionable suggestions for improving agent definitions or task files
```

---

## Escalation

Produce an escalation immediately when blocked. Do not guess or proceed.

```markdown
## Escalation — [task-id]* [timestamp UTC]*

**From**: [role name]*
**To**: [role name or "coordinator"]*
**Blocking**: yes | no*

### Question
[Exactly one specific question. One escalation per question.]*

### Context
[Relevant file paths, artifact IDs, or quoted excerpts that inform the question]

### Options Considered
- **Option A**: [description and implications]
- **Option B**: [description and implications]
```

---

## Frequency Guidelines

| Agent | Status report after | Escalate when |
|---|---|---|
| SA | Each spec section reviewed; LaneMap complete | Any ambiguity that changes component count or scope |
| SE | Each ComponentDefinition written | Any spec ambiguity affecting interface or criteria |
| IA | Each source file complete | Scope unclear; new dependency needed; test/impl conflict |
| TA | Each test run | Edge case behavior unclear; cross-component gap found |
