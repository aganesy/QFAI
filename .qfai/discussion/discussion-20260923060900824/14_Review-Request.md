# 14 Review Request

## Scope

- scope: `discussion-20260923060900824`
- layer: `discussion`
- review-pack: `assigned per review cycle` — see `.qfai/review/`

<!-- Do NOT record a single review-pack id here. `references/review-cycle-playbook.md`
     requires a new review pack per cycle, so one discussion pack is reviewed by N packs.
     The authoritative pointer for a given cycle is that pack's own
     `.qfai/review/review-YYYYMMDDhhmmssSSS/review_request.md#Scope`, which names the directory that
     contains it. -->

## Target Files

- `.qfai/discussion/discussion-20260923060900824/01_Context.md`
- `.qfai/discussion/discussion-20260923060900824/02_Inception-Deck.md`
- `.qfai/discussion/discussion-20260923060900824/03_Story-Workshop.md`
- `.qfai/discussion/discussion-20260923060900824/04_Sources.md`
- `.qfai/discussion/discussion-20260923060900824/05_Scope.md`
- `.qfai/discussion/discussion-20260923060900824/06_REQ.md`
- `.qfai/discussion/discussion-20260923060900824/07_NFR.md`
- `.qfai/discussion/discussion-20260923060900824/08_Glossary.md`
- `.qfai/discussion/discussion-20260923060900824/09_Constraints.md`
- `.qfai/discussion/discussion-20260923060900824/10_Policy.md`
- `.qfai/discussion/discussion-20260923060900824/11_OQ-Register.md`
- `.qfai/discussion/discussion-20260923060900824/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-20260923060900824/13_Deferred.md`
- `.qfai/discussion/discussion-20260923060900824/14_Review-Request.md`
- `.qfai/discussion/discussion-20260923060900824/99_delta.md`

The stage evidence `.qfai/evidence/discussion-20260923060900824.md` is the input
the Reviewer Gate reads its session condition from. It is not a target.

## Answered demands

Carry prior answers and newly answered demands before reviewer dispatch, under
`.qfai/assistant/constitution/review-convergence.md#answered-demands-must`.
Replace the example row with actual answers; if there are none, write `None`.
Record reviewer acceptance or user adjudication in Response and its proof in
Evidence. An unaccepted reply does not resolve a blocking demand.

None.

## Review Focus

- Correctness against source requirements: every REQ and NFR traces to the
  decisions OQ-0001 to OQ-0009 and to a registered source.
- Consistency with upstream/downstream artifacts: the pack records the upstream
  conflicts as the Change Request `/qfai-sdd` raises (REQ-0016) and edits none of
  them.
- Testability and acceptance clarity: each REQ ends with an acceptance signal;
  each NFR has a measurement.
- Operational and security risks: no adopter file is touched (NFR-0003); CI stays
  green in one change (REQ-0015, NFR-0005).
- Removal by symbol: A, B and the `.qfai/handoff.yaml` feature are named as
  unchanged everywhere they could be swept up (AP-0001).
- Mermaid diagrams are sufficient for decision-making quality (not only presence)
  - Scope boundary (in/out) is consistent across text/diagram/table
  - Acceptance criteria are consistent with flows/state transitions
  - Security/operations risks are reflected in diagrams where relevant
- Mermaid diagrams use ` ```mermaid ` fences only
- Design direction, reference registries, Trend Scan, `uiux/` family, evaluator
  scoring, planner-first handling, screen contracts and generic fallback: not
  applicable, the pack is non-ui.
- OQ register exit condition (open count = 0)
- Deferred items have full metadata

## Exploration Direction Consistency

Not applicable: the pack is non-ui.

## Sidecar Artifact Review Scope

Not applicable: the pack is non-ui.

## Required Reviewers

- Resolve reviewers from `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.
- Always run reviewers listed in `profiles.<routing_profile>.always_required` in `review-profiles.yml`.
  For `requirements-heavy` these are `completion-reviewer` and
  `requirements-reviewer` (SRC-0028).
- Add `architecture-reviewer` only when architecture-affecting decisions exist.
  They do: the change removes a validator module, a set of path constants and an
  `init` seed step, and has to separate them from A and B by symbol.
- Add `product-surface-reviewer` only when the pack is UI-bearing. It is not.
- Allowed in-flight verdicts: `PASS`, `REVISE`. `REVISE` is what starts the fix-and-rerun cycle; it serializes to `status: "FAIL"` when the pack's `summary.json` is written (see `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#verdict-vocabulary`).

## RCP Rules (Mandatory)

- Blocking feedback triggers immediate return (`changes_requested`). Reports
  alone do not reopen an answered demand, and advice a reviewer marks
  non-normative under
  `.qfai/assistant/constitution/review-convergence.md#discussion-review-precision`
  is recorded and carried to the stage that implements the change rather than
  returning the pack.
- After fixes, rerun only failed reviewers and reviewers whose scope changed because of the fix.
- Set `overall_status: PASS` only when all routed blocking reviewers are `PASS`, and no unresolved `FAIL` remains.
