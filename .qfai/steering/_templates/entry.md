---
id: 2026-MM-DD-kebab-case-id # required; kebab-case ASCII; matches filename stem
status: active # required; enum: active | handoff | archived
kind: decision # required; see .qfai/assistant/catalog/worklog-entry.schema.md
created: YYYY-MM-DD # required; ISO-8601 date
updated: YYYY-MM-DD # required; ISO-8601 date; >= created
scope: global # required; "global" or "spec-NNNN"
blocking: false # required; boolean
promote-to: null # required; "spec-NNNN/07_Decisions.md" or null
links: [] # required; array (may be empty)
---

# Title of the entry

## Context

What triggered this entry? Reference any spec, contract, or external
input that informs the entry.

<!-- For `kind: handoff` entries, the 5 sections below are MANDATORY -->
<!-- (Reviewer Gate emits R-HANDOFF-INCOMPLETE on missing sections). -->

## State of the task

(Mandatory for kind: handoff. See contract for guidance.)

## Next single action

(Mandatory for kind: handoff. See contract for guidance.)

## Constraints to preserve

(Mandatory for kind: handoff. See contract for guidance.)

## Open questions

(Mandatory for kind: handoff. See contract for guidance.)

## References to consult first

(Mandatory for kind: handoff. See contract for guidance.)
