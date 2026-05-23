# CLI Contract: `qfai validate`

- Contract scope: public CLI surface for spec / contract / assistant-tree / work-log validation
- Owning spec: `spec-0004`
- Used-by: `spec-0003` (post-init self-check), all skill specs (gate evidence)
- SSOT modules:
  - `packages/qfai/src/cli/commands/validate.ts`
  - `packages/qfai/src/core/paths/assistantPaths.ts` (canonical relative paths SSOT)
  - `packages/qfai/src/core/worklog/parseEntry.ts` (work-log entry frontmatter parser)
  - `packages/qfai/src/core/worklog/validateLinks.ts` (link-integrity check)
  - `packages/qfai/src/core/worklog/drift.ts` (Reviewer-Gate inputs and outputs)

## Existing public surface

This contract documents only the **delta** from the assistant-layer recut and the work-log surface introduction. The rest of `qfai validate`'s existing flags, profiles (`sdd`, `prototyping`, `verify`, `discussion`), `--fail-on`, `--format`, `--report`, etc., are unchanged.

## New finding codes (this delta)

| Code                         | Severity                                               | Surface                                                                                                                                                                                                                                  | Source REQ                          |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `W-WORKLOG-SCHEMA`           | warning                                                | `.qfai/steering/*.md` entry frontmatter is malformed (missing required field, invalid enum, broken YAML, etc.). Non-blocking.                                                                                                            | REQ-0003                            |
| `R-WORKLOG-DRIFT`            | error (advisory-failing)                               | Reviewer Gate finding: fresh implementation output contradicts the direction of an open entry with `kind` in `{decision, risk, blocker, scope-down}`. Requires non-empty `justification:` field.                                         | REQ-0006                            |
| `R-REJECTED-READOPT`         | error (advisory-failing)                               | Reviewer Gate finding: output adopts an option marked `Status: rejected` in the active spec's `07_Decisions.md`. Requires non-empty `justification:` field.                                                                              | REQ-0006                            |
| `W-PENDING-PROMOTION`        | warning                                                | A `kind: decision` entry has non-null `promote-to` that is not yet satisfied. Surfaced in a dedicated section of the validate report.                                                                                                    | REQ-0007                            |
| `D-DEPRECATED-PATH`          | warning (during window) / error (after sunset version) | An old-layout assistant-tree file path is referenced or present. Warning text MUST name the sunset version (`feature/v<X.Y.Z>`-targeted minor release) per REQ-0018.                                                                     | REQ-0008, REQ-0018                  |
| `W-WORKLOG-STALE`            | warning                                                | `.qfai/steering/*.md` entry with `status: active` has `updated` older than 90 days. Surfaced with entry ID + age in days.                                                                                                                | REQ-0014                            |
| `W-WORKLOG-BROKEN-LINK`      | warning                                                | An entry's `links: [spec-NNNN, discussion-*, entry-XXXX]` value does not resolve to an existing artifact.                                                                                                                                | REQ-0015                            |
| `R-HANDOFF-INCOMPLETE`       | error (advisory-failing)                               | Reviewer Gate finding: a `kind: handoff` entry body is missing one of the five required sections (`## State of the task`, `## Next single action`, `## Constraints to preserve`, `## Open questions`, `## References to consult first`). | REQ-0017                            |
| `W-SKILL-DOC-BROKEN-REF`     | warning (during window) / error (after sunset)         | A `qfai-*` SKILL.md references an assistant path that does not resolve in the current layout.                                                                                                                                            | NFR-0008                            |
| `W-USER-EDIT-PRESERVED`      | warning                                                | `qfai init --upgrade-assistant-tree` encountered a collision and preserved the user-edited file at the old path; consumer MUST manually reconcile.                                                                                       | REQ-0013                            |
| `W-ASSISTANT-LAYOUT`         | warning                                                | A directory under `.qfai/assistant/` is not in the canonical 4-layer enum (constitution / manifest / catalog / process) and not in the documented pre-recut allowlist (agents / skills / skills.local).                                  | REQ-0002 (4-layer enforcement)      |
| `W-SKILL-PROJECT-MEMORY`     | warning (during window) / error (after sunset)         | A `qfai-*` SKILL.md is missing the trailing `project_memory:` YAML block.                                                                                                                                                                | REQ-0010                            |
| `I-ASSISTANT-LAYER-UNSEEDED` | info                                                   | A canonical 4-layer directory (`constitution/` / `manifest/` / `catalog/` / `process/`) has not been seeded yet. Informational only; `qfai init` seeds them.                                                                             | REQ-0002                            |
| `E-WORKLOG-SECRET`           | error                                                  | A pre-existing secret-pattern scan flagged secret content in a work-log entry. Hard-blocks merge. **NOT YET IMPLEMENTED** in v1.9.0 — scheduled for v1.10.0.                                                                             | (security policy in `10_Policy.md`) |

## Reviewer-Gate input bundle

Reviewer subagents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) MUST be invoked with a structured input bundle containing:

1. Open work-log entries (`.qfai/steering/*.md` where `status` ∈ `{active, handoff}` and `scope` matches the current task — `global` or `spec-NNNN`)
2. The Decisions table from the affected spec's `07_Decisions.md`
3. The fresh implementation output under review

Each Reviewer finding emitted in the `R-*` family MUST carry a `justification:` field with non-empty content naming:

- (a) the entry ID or Decisions row ID that triggered the finding, and
- (b) the specific contradiction or re-adoption observed.

`qfai validate` rejects Reviewer reports whose `R-*` findings lack `justification:` content. This is the machine-checkable acceptance criterion that makes drift-checks advisory-failing rather than mute.

## Promote-gate surfacing

For each `kind: decision` entry with non-null `promote-to` that is not yet satisfied:

- The validate report includes a dedicated `## Pending Promotion` section listing entry ID, target spec, and one-line summary.
- The same finding is emitted as `W-PENDING-PROMOTION` for `--fail-on warning` consumers.

Promotion is satisfied when both conditions hold:

- A row exists in the target `07_Decisions.md` whose body cites the entry ID, AND
- The entry transitions to `status: archived` with a `promoted-to: spec-NNNN/07_Decisions.md#<row-id>` field.

## Backwards-compatible adapter

During the one-minor-release deprecation window (NFR-0002), `qfai validate` accepts both the pre-recut layout and the post-recut layout. Old-layout files trigger `D-DEPRECATED-PATH` (warning). At the named sunset version, the warning is escalated to an error, and the old-layout reader is removed in the next minor.

## Path SSOT enforcement

`packages/qfai/src/core/paths/assistantPaths.ts` is the sole producer of the assistant-tree path strings consumed by validators. Hard-coded path string literals matching `assistant/(steering|manifest|instructions|catalog|constitution|process)/` outside the SSOT module are rejected by the lint lane (NFR-0001).
