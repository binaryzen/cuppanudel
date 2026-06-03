---
task_id: XX-role-short-description   # matches filename
role: [role-name]                    # must match a role in roles/
lane: n/a                            # lane id from LaneMap, or n/a
inputs:
  - artifact_type: [ArtifactType]
    source: "[agent role or file path]"
outputs:
  - artifact_type: [ArtifactType]
    destination: "[file path]"
parameters:
  # Override role-level parameters for this specific task instance.
  # Only include parameters you want to change from the role's defaults.
---

## Your Task

[Direct instruction written in second person. What to do, not how to do it.
Be specific: name the files, artifacts, and criteria. The agent does not have
context from prior conversations — everything relevant must be here or in the
role/domain files.]

## Inputs

[Explicit list of input artifacts with file paths or artifact IDs. If an input
must be read before proceeding, say so.]

## Outputs

[Explicit list of output artifacts with exact destination file paths.]

## Acceptance Criteria

[Specific, testable conditions that define task completion. Each criterion should
be falsifiable — observable evidence that it is met or not met.]

## Notes

[Task-specific constraints, caveats, or context not captured in the role or domain
files. Keep this short; if it belongs in the role or domain, put it there instead.]
