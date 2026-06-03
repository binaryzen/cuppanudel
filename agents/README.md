# Multi-Agent Development System

## Pattern

This system uses a **Layered Prompt Composition** pattern, a hybrid of:

- **MetaGPT's SOP (Standard Operating Procedure)** — roles are defined independently,
  communicate via typed artifacts, and are activated in a defined sequence with
  explicit handoffs
- **Anthropic's Orchestrator-Subagent pattern** — a coordinator (the top-level Claude
  Code session) manages agent lifecycle and routes escalations

The key structural principle is **Separation of Concerns by Layer**, borrowed from
software engineering's Dependency Injection pattern:

| Layer | Location | Purpose | Reusability |
|---|---|---|---|
| Role | `roles/` | General capabilities, behavioral constraints | Any project |
| Domain | `domain/` | Project-specific context, conventions, constraints | This project |
| Task | `tasks/` | Instance-specific assignment, I/O, acceptance criteria | This engagement |

These layers are joined by a **conceptual contract** (`contracts/io-contract.md`) that
defines the typed artifacts each role accepts and produces. Roles never depend on domain
specifics directly — they depend on the contract. This makes them pluggable: swap the
domain and task layers to apply the same roles to a different project.

## Composing an Agent Prompt

An agent's full prompt is assembled from three layers, concatenated:

```
[content of roles/<role>.md]

---

## Domain Context

[content of domain/cuppanudel.md]

---

## Your Task

[content of tasks/<task-id>.md]
```

The coordinator (top-level Claude Code session) performs this assembly and passes the
result to the Agent tool.

## Escalation Chain

| Agent | Escalates to |
|---|---|
| IA / TA | SE (requirement/behavior questions) |
| IA / TA | SA (architectural questions) |
| SE / SA | Coordinator (top-level session) |
| Coordinator | User |

An agent must not guess when blocked. Produce an `Escalation` artifact and stop.

## Status and Completion Reporting

All agents report status using templates in `contracts/reporting-format.md`.
Agents write artifacts to `agents/artifacts/` and include file paths in their
CompletionReport. The coordinator reads CompletionReports to determine when to
proceed to the next step.

## Tuning

Each role and task file has a YAML frontmatter block with tunable parameters. To adjust
behavior, edit frontmatter values. Do not edit role file bodies unless the role's general
capabilities need to change — that affects all projects using the role.

## File Map

```
agents/
├── README.md                         # This file — pattern overview and usage
├── contracts/
│   ├── io-contract.md                # Typed artifact schemas (the conceptual contract)
│   └── reporting-format.md           # StatusReport and CompletionReport templates
├── domain/
│   └── cuppanudel.md                 # Project-specific context (injected into prompts)
├── roles/                            # Reusable, application-agnostic role definitions
│   ├── _template.md
│   ├── solutions-architect.md        # SA: spec review, lane map, design validation
│   ├── staff-engineer.md             # SE: component definitions, test review
│   ├── implementation-agent.md       # IA: implementation + unit tests
│   └── testing-agent.md              # TA: integration tests + test execution
├── tasks/                            # Instance-specific task assignments
│   ├── _template.md
│   ├── 01-sa-spec-review.md
│   ├── 02-se-component-definition.md
│   ├── 03-sa-design-validation.md
│   ├── 04-ia-implementation.md       # One instance spawned per lane
│   ├── 05-ta-test-suite.md
│   └── 06-se-test-review.md
├── workflows/
│   └── feature-development.md        # Sequence, lanes, decision points
└── artifacts/                        # Agent-produced outputs (written during runs)
    └── 02-components/                # One ComponentDefinition file per component
```
