# 14_Review-Request

## Scope

- scope: `discussion-20260325120000000`
- layer: `discussion`
- review-pack: `review-<timestamp>` (to be generated)

## Target Files

- `.qfai/discussion/discussion-20260325120000000/01_Context.md`
- `.qfai/discussion/discussion-20260325120000000/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260325120000000/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260325120000000/04_Sources.md`
- `.qfai/discussion/discussion-20260325120000000/05_Scope.md`
- `.qfai/discussion/discussion-20260325120000000/06_REQ.md`
- `.qfai/discussion/discussion-20260325120000000/07_NFR.md`
- `.qfai/discussion/discussion-20260325120000000/08_Glossary.md`
- `.qfai/discussion/discussion-20260325120000000/09_Constraints.md`
- `.qfai/discussion/discussion-20260325120000000/10_Policy.md`
- `.qfai/discussion/discussion-20260325120000000/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260325120000000/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260325120000000/13_Deferred.md`
- `.qfai/discussion/discussion-20260325120000000/14_Review-Request.md`
- `.qfai/discussion/discussion-20260325120000000/99_delta.md`

## Review Focus

### Standard Items

- Correctness against source requirements
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

### v1.7.0 Specific Items

- Design Direction Summary section in `03_Story-Workshop.md` is structurally complete and covers all required subsections
- Competitive reference registry in `04_Sources.md` includes all three mandatory fields (adopted, rejected, translation) for every UI-bearing competitive entry
- Validator severity decisions are correctly specified as `error` (not `warning`) for all new structural checks
- UI-bearing detection design uses artifact/section presence (not keyword matching alone) and the detection logic is unambiguous
- Non-UI packs remain unaffected — confirm no backward-compatibility regression in scope, policy, or validator definitions

## Design Direction Decisions

This section captures the design-direction decisions made during the discussion phase, providing reviewers with a consolidated view of what was selected, what was rejected, and why.

### Selected Anchor Screen

- **Anchor ID**: SCREEN-ANCHOR-001
- **Selected Option**: Option A — Editorial Split Layout
- **Rationale**: Directly serves the visual thesis ("purposeful minimalism with editorial depth"); 60/40 editorial split has competitive precedent in Linear and Stripe; best mobile viability among candidates; no anti-goal conflicts

### Rejected Options

| Option | Rejection Reason | Delta Reference |
| ------ | ---------------- | --------------- |
| Option B — Command-First Terminal | Floating action button conflicts with editorial approach; poor mobile viability | 99_delta.md § Rejected Visual Directions |
| Option C — Scorecard Dashboard | Card mosaic violates anti-goal; scorecard metaphor unsupported by data availability | 99_delta.md § Rejected Visual Directions |

### Adopted Competitive References

| Reference | Adopted Element | Translated Application |
| --------- | --------------- | ---------------------- |
| Linear (SRC-0008) | Progressive disclosure layout; editorial split | DDS documentation view layout |
| Stripe (SRC-0009) | Sidebar + content pane; code-first presentation | 15-file pack navigation; validator-result-first display |
| Vercel (SRC-0010) | Minimal chrome; status-first display | Validation report view |

### Design Anti-Goals

8 anti-goals locked (see 99_delta.md § Design Anti-Goals Locked). All are enforced by existing or new validators (QFAI-DDP-009, QFAI-DDP-014, QFAI-DDP-019..021).

## Required Reviewers

- Load all reviewers from `.qfai/assistant/steering/review-roster.yml`.
- Run all reviewers in roster order for every cycle.
- Allowed verdicts: `PASS`, `FAIL`, `N/A` (`N/A` requires `na_rule` reason).

| #   | Reviewer ID              | Required |
| --- | ------------------------ | -------- |
| 1   | qa-lead                  | true     |
| 2   | qa-gatekeeper            | true     |
| 3   | reviewer                 | true     |
| 4   | code-reviewer            | true     |
| 5   | architect-reviewer       | true     |
| 6   | qa-reviewer              | true     |
| 7   | frontend-reviewer        | true     |
| 8   | backend-reviewer         | true     |
| 9   | design-review-lead       | true     |
| 10  | runtime-gatekeeper       | true     |
| 11  | devils-advocate          | true     |
| 12  | pattern-doubler          | true     |
| 13  | integrated-uiux-reviewer | true     |

## RCP Rules (Mandatory)

- Any feedback triggers immediate return (`changes_requested`).
- After fixes, create a new review-pack and restart reviewer sequence from the first reviewer.
- Set `overall_status: PASS` only when all required reviewers are `PASS` or valid `N/A`, and no unresolved `FAIL` remains.

## Work Orders Summary

| Step | Role (sub-agent) | Task title           | Input (refs)                   | Output (refs)          | Status (PASS/REVISE) |
| ---- | ---------------- | -------------------- | ------------------------------ | ---------------------- | -------------------- |
| 1    | orchestrator     | Review request build | Discussion pack, roster SSOT   | `14_Review-Request.md` | PASS                 |
