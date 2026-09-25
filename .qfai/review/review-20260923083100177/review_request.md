# Review Request

## Scope

- Producer: `discussion`
- scope: `discussion-20260923063306456`
- layer: `discussion`
- review-pack: `review-20260923083100177`

## Target Files

- `.qfai/discussion/discussion-20260923063306456/01_Context.md`
- `.qfai/discussion/discussion-20260923063306456/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260923063306456/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260923063306456/04_Sources.md`
- `.qfai/discussion/discussion-20260923063306456/05_Scope.md`
- `.qfai/discussion/discussion-20260923063306456/06_REQ.md`
- `.qfai/discussion/discussion-20260923063306456/07_NFR.md`
- `.qfai/discussion/discussion-20260923063306456/08_Glossary.md`
- `.qfai/discussion/discussion-20260923063306456/09_Constraints.md`
- `.qfai/discussion/discussion-20260923063306456/10_Policy.md`
- `.qfai/discussion/discussion-20260923063306456/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260923063306456/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260923063306456/13_Deferred.md`
- `.qfai/discussion/discussion-20260923063306456/14_Review-Request.md`
- `.qfai/discussion/discussion-20260923063306456/99_delta.md`
- Stage evidence: `.qfai/evidence/discussion-20260923063306456.md`

## Answered demands

Cycle 1 pack: `.qfai/review/review-20260923081445724/`. Each response below is
the author's fix. It resolves the demand only once the reviewer who raised it
accepts it in this cycle.

| Finding source | Demand | Response | Evidence |
| --- | --- | --- | --- |
| `R01_completion-reviewer.md#F1`, `R02#F5`, `R03#F2` | Real consumers of four assistant files; one placement per file; unplaced UI files; fate of emptied directories | Consumers listed; placement by the Q10 rule (several skills or CLI → `rule/`, one skill → that skill); UI files and `worklog-entry.schema.md` → `rule/`; emptied directories removed; abolish-or-absorb check and final placements in OQ-0028 | `06_REQ.md` REQ-0017; `04_Sources.md` SRC-0121; `11_OQ-Register.md` OQ-0028; evidence Q10 option text |
| `R01#F2`, `R02#F6` | Freshness quoted as 13 of 16 | States 12 of 16 (0.75), four older sources; delta row rewritten | `04_Sources.md` Research Summary; `99_delta.md` correction row |
| `R01#F3` | REQ-0023 weakened and over-broad | `must`, scoped to the Q8 merge destinations | `06_REQ.md` REQ-0023 |
| `R02#F3`, `R03#F1` | Gate commands in two places | Only in `qfai.config.yaml` (Q9, Q18); `tech.md` names the stack and points at the config; the Q20 table moved only catalog files | `05_Scope.md` relocation row; REQ-0005, REQ-0016; DUS-007; `99_delta.md` agents-adopted row |
| `R03#F3` | Shipped defaults and agent-catalog fields unplaced | Defaults built into the package; config holds overrides only; every field except `developer_instructions` moves to card frontmatter | REQ-0016; SRC-0109; `99_delta.md` agents-adopted row |
| `R02#F1`, `R03#F4` | Migration cannot rewrite annotations, links or `.gitignore`; one target | Annotation rewrite, host links and `.gitignore` negations added to the scripts; NFR-0008 write set widened to exactly those; one completion target | REQ-0019; NFR-0008; NFR-0010; DSC-003; DSC-007; `01_Context.md` |
| `R02#F2` | EX AC-Ref derivation and BR link reversal | AC-Ref from the TC rows that cite the EX; zero or several ACs reported, never dropped; `BR-Ref` reversed into BR→EX | REQ-0019, REQ-0020; NFR-0003; DUS-006 seeds |
| `R02#F4` | REQ-0010 exceeds Q13; unresolved seeds without OQ | REQ-0010 reduced to Q13; OQ-0029 deferred for the linkage and statuses; seeds point at it | REQ-0010; OQ-0029; `03_Story-Workshop.md` DUS-003, DUS-004, DUS-006 |
| `R03#F5` | Leak guards blind to new ID shapes | REQ-0024: guards and the local rule learn the shapes with a sample band; NFR-0004 measured against it | REQ-0024; NFR-0004; DTC-1 |
| `R03#F6` | Dual layout could ship | P1–P7 on the pinned integration branch; no release before P7; OQ-0022 due before P1 | `02_Inception-Deck.md` Size It Up; OQ-0022; `10_Policy.md` |

## Review Focus

- Verify repository-fact lookup evidence under
  `.qfai/assistant/skills/qfai-discussion/SKILL.md#reviewer-gate-must`.
- Judge planning-stage decisions under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`.
- Correctness against the user's decisions recorded in the stage evidence
  `## Grilling Session` (Q1–Q20); the pack must not reopen or widen them.
- Consistency with upstream/downstream artifacts
- Testability and acceptance clarity
- Operational and security risks
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only (no ` ```text ` or language-less fences)
- Surface is classified `non-ui`, so the UI-bearing checks do not apply.
- OQ register exit condition (open count = 0)
- Deferred items have full metadata in `13_Deferred.md`
- Validate hard gate evidence exists (`.qfai/report/validate.log`).
- Coverage hard gates are clear.

## Grilling Session

| Ended     | Ended at             | Authoring began      | Frontier | Lookups        | Decisions | Escalated |
| --------- | -------------------- | -------------------- | -------- | -------------- | --------- | --------- |
| confirmed | 2026-09-23T07:55:21Z | 2026-09-23T07:57:45Z | empty    | none in flight | 20        | 0         |

## Required Reviewers

- Routing profile `requirements-heavy`: `completion-reviewer` and
  `requirements-reviewer` (always required, blocking).
- Conditional: `architecture-reviewer` — the pack settles
  architecture-affecting decisions (layout, configuration merge, assistant
  tree reorganisation).
- Allowed in-flight verdicts: `PASS`, `REVISE`.

## RCP Rules (Mandatory)

- Blocking feedback triggers immediate return (`changes_requested`). Reports
  alone do not reopen an answered demand, and advice a reviewer marks
  non-normative under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`
  is recorded and carried to the stage that implements the change rather than
  returning the pack.
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
