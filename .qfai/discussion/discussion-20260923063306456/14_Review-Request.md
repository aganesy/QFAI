# 14 Review Request

## Scope

- scope: `discussion-20260923063306456`
- layer: `discussion`
- review-pack: `assigned per review cycle` — see `.qfai/review/`

<!-- One discussion pack is reviewed by one review pack per cycle
     (`references/review-cycle-playbook.md`). The pointer for a cycle is that pack's own
     `.qfai/review/review-YYYYMMDDhhmmssSSS/review_request.md#Scope`. -->

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

## Answered demands

None. No reviewer has accepted a fix yet; cycle 1's findings are in `.qfai/review/review-20260923081445724/`, and each blocking one stays open until its reviewer accepts the fix.

## Review Focus

- Correctness against source requirements: every REQ traces to a user decision Q1–Q20 in `.qfai/evidence/discussion-20260923063306456.md#Grilling Session` and records it without reopening it.
- Every repository fact names where it was read (04_Sources.md#Source Registry); read the source and verify the claim.
- Consistency with upstream and downstream artifacts: the relocation table in 05_Scope.md#In Scope, the REQs and the glossary name the same files and IDs.
- Testability and acceptance clarity: each REQ and NFR has an observable acceptance signal; the Example Seeds cover the coverage rules REQ-0007, REQ-0008 and REQ-0010.
- Operational and security risks: the cutover risk (OC-1, OQ-0021), the mirror (DTC-4), the distributed-surface guards (DTC-1, NFR-0004), and migration writing only inside the project (NFR-0008).
- Mermaid diagrams are sufficient for decision-making quality, not only present:
  - Scope boundary is consistent across the tree in 02_Inception-Deck.md#6. Show the Solution (Architecture Overview), the table in 05_Scope.md and 06_REQ.md.
  - The traceability chain in the diagram matches REQ-0007 to REQ-0010.
  - The migration path in 03_Story-Workshop.md#User Flows reflects the old-layout error and the migration report.
- Mermaid diagrams use ` ```mermaid ` fences only.
- Design direction completeness: not applicable, `non-ui` pack.
- Reference pool freshness and translation quality: not applicable to UI. The research freshness ratio is 0.75, below 0.8 (04_Sources.md#Research Summary).
- Canonical `uiux/` family: not applicable, `non-ui` pack.
- Evaluator scoring against the four UX axes: not applicable, `non-ui` pack.
- Evaluator critique skepticism: not applicable, `non-ui` pack.
- Planner-first discipline: not applicable; no visual direction exists to choose.
- Screen contract sufficiency: not applicable, `non-ui` pack.
- Generic fallback risk: not applicable, `non-ui` pack.
- OQ register exit condition: open count is 0 (11_OQ-Register.md).
- Deferred items have full metadata (13_Deferred.md).

## Exploration Direction Consistency

Not applicable. The pack is `non-ui`: no design direction, no evaluator axes, no prototype lineage.

## Sidecar Artifact Review Scope

Not applicable. The pack is `non-ui` and has no `uiux/` sidecars.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.
- `qfai-discussion` routes with `routing-profile: requirements-heavy`, whose `always_required` is `completion-reviewer` and `requirements-reviewer` (`review-profiles.yml`, `profiles.requirements-heavy`).
- Add `architecture-reviewer`: the pack changes the document layout, the validator set and the assistant tree, which are architecture-affecting decisions.
- `product-surface-reviewer` is not added: the pack is not UI-bearing.
- Allowed in-flight verdicts: `PASS`, `REVISE`. `REVISE` serializes to `status: "FAIL"` in the review pack's `summary.json` (see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`).

## RCP Rules (Mandatory)

- Blocking feedback triggers immediate return (`changes_requested`). Reports
  alone do not reopen an answered demand, and advice a reviewer marks
  non-normative under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`
  is recorded and carried to the stage that implements the change rather than
  returning the pack.
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.

## Advisories carried to /qfai-sdd

Advisory findings from cycle 1 (`.qfai/review/review-20260923081445724/`) that
this pack does not resolve. `/qfai-sdd` takes each one up; none blocks the
discussion stage. The label is the reviewer's, as it appears in its file.

- R01 F4: the Q20 table was missing from the stage record; the record now carries it under "What the user was shown for Q10 and Q20".
- R01 F5: the research summary changed after drafting without a note; the stage record now carries that note.
- R01 F8: `paths.contractsDir` has no stated destination once `.qfai/contracts/` moves into `03_contract/`.
- R02 A1: where old-layout detection runs, and what becomes of `contractsDir`.
- R02 A2: the sample tree `qfai init` writes against the test obligations of REQ-0010.
- R02 A3: how each existing test is classified into the E2E, integration and API, and other layers.
- R02 A5: acceptance signals that are still indirect.
- R02 A7: the `SUPERSEDED (by DEC-xxxx)` suffix on a Status value.
- R02 A9: NFRs that restate a REQ.
- R02 A10: the consequences of abolishing `process/`.
- R02 A13: the rationale recorded for OQ-0022.
- R03 F7: `paths.contractsDir` destination.
- R03 F9: test-layer classification of existing tests.
- R03 F10: where approval evidence goes once the tables carry no approver.
- R03 F11: the scopes of work-log entries and waivers, which name `spec-NNNN` today.
- R03 F12: cross-skill placements beyond the list in REQ-0017 (see OQ-0028).
- R03 F13: how hosts treat the new agent frontmatter fields.
- R03 F14: the list of rejected options in `99_delta.md#Rejected Decisions`.
- R03 F15: documents that cite the renamed paths.
- R03 F16: NFR references that `01_Spec` carried and the contracts take over.
