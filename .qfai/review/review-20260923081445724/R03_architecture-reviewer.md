# Reviewer Result

- reviewer_id: `R03`
- reviewer_role: `architecture-reviewer`
- Result: `REVISE`
- reviewed_at: `2026-09-23T08:40:00Z`

## Checked

- [x] Scope/layer alignment
- [x] Traceability consistency
- [x] Requirement and risk coverage
- [x] Clarity and actionability
- [x] Mermaid diagrams are sufficient for decisions (scope/AC/risk consistency)
- [x] Mermaid diagrams use ` ```mermaid ` fences only
- [x] OQ register exit condition (open count = 0)
- [x] Deferred items have full metadata

## Feedback

- F1. Severity: blocking. Traces to: Q8, Q9, Q18, Q20. Gate commands go to both
  `tech.md` and `qfai.config.yaml`.
- F2. Severity: blocking. Traces to: Q10, Q20. Two UI catalog files have no
  destination, one file has two, and the fate of the emptied directories is
  unstated.
- F3. Severity: blocking. Traces to: Q9, Q18. Shipped routing and profile
  defaults, and the agent-catalog fields other than the four named, have no
  destination.
- F4. Severity: blocking. Traces to: REQ-0018, NFR-0008. The migration write
  boundary excludes host skill links and the `.gitignore` negations the renames
  break.
- F5. Severity: blocking. Traces to: DTC-1, NFR-0004. The leak guards do not
  know the new internal ID shapes.
- F6. Severity: blocking. Traces to: REQ-0021, OQ-0012. Phases P1–P3 could ship
  both layouts, the rejected option.
- F7–F16. Severity: advisory. Carried to `/qfai-sdd`: `contractsDir`, closed
  rename list, test-layer classification, approval evidence, work-log and
  waiver scopes, cross-skill placements, frontmatter on hosts, rejected-option
  list, documents citing renamed paths, NFR references from `01_Spec`.

## Required Fixes

- F1: one home for gate commands.
- F2: place every file once and state the directories' fate.
- F3: place shipped defaults and every catalog field.
- F4: widen the migration scope and NFR-0008; keep decision records tracked.
- F5: a requirement for the guards and a sample-ID band.
- F6: P1–P7 on the pinned integration branch; no release before P7.

## Decision

- REVISE
