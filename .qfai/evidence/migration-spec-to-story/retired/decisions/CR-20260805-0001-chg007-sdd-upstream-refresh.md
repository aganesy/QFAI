# Change Request

- ID: `CR-20260805-0001`
- Title: `CHG-007 SDD wave: layered CI scaffold spec/contract refresh (disclosure record for an already-approved, already-applied upstream change)`
- Raised by: `/qfai-implement orchestrator (disclosure record prompted by QFAI-DRIFT-001; the change itself was authored by /qfai-sdd)`
- Raised at: `2026-08-05T18:40:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (aganesy)` — via the /qfai-sdd CHG-007 Stage-1 triage: AskUserQuestion
  approval of the approval-required CREATE (spec-0017), recorded in
  `.qfai/specs/_policies/10_delta.md` § CHG-007 triage table (user@2026-08-05); the remaining
  rows were UPDATE-class ops the slice policy does not gate on approval
- Approved at: `2026-08-05T00:00:00Z`
- Approved option: `1` (the sole option — see Options)
- Applied at: `2026-08-05T09:00:00Z`
- Superseded by: `-`

## Context

This CR does not request a change; it discloses one that the owner skill already
made through its own gated process, so that the downstream stage's audit trail
names every touched path.

The `/qfai-sdd` CHG-007 wave (discussion pack `discussion-20260804173914356`,
branch `feature/chg-007-layered-ci-scaffold`) refreshed the upstream SSOT:
capability CAP-0017 + spec-0017 (CREATE, user-approved), CHG-007 slices on
spec-0003 / spec-0006 / spec-0008 / spec-0015, cascade MODIFYs on spec-0004 /
spec-0009 / spec-0012, `_policies/01..11`, and the CLI contracts including the
new `CLI-WFSET` (`.qfai/contracts/cli/shipped-workflows.md`). The wave closed
with `validate --profile sdd --fail-on error` at error=0 and an 11-round
reviewer gate at PASS (evidence: `.qfai/evidence/sdd-spec-0017.md`, local;
review pack `review-20260805082718000`, local; both gitignored — the tracked
record is `.qfai/report/preflight_summary.md`,
`.qfai/steering/2026-08-05-chg-007-toolchain-capability.md`, and the
`_policies/10_delta.md` § CHG-007 triage table).

`QFAI-DRIFT-001` (tdd profile) compares this branch against `origin/main` and
flags every protected-path diff not named by an approved CR. The SDD wave _is_
the approved upstream change, so per the finding's own remediation ("If the
edit is already approved, the approved CR must name this path"), this record
enumerates the paths.

## Proposed change

None outstanding. The upstream artifacts listed under Impact scope already
carry the approved CHG-007 content; this CR names them for the drift guard and
the audit trail.

## Options (at least 3) and recommendation

The decision this CR covers was taken at the SDD stage with its alternatives
recorded there — fabricating a fresh option table here would ask the operator
to ratify a comparison that never happened at this stage. The recorded
alternatives and rejections live in `.qfai/specs/_policies/08_Decisions.md`
(DR-0275, DR-0276, each with rejected options) and the per-spec `09_delta.md`
CHG-007 sections.

| #   | Option                                                            | Cost | Risk | Recommended |
| --- | ----------------------------------------------------------------- | ---- | ---- | ----------- |
| 1   | Record the applied SDD wave; paths enumerated for the drift guard | low  | none | ✅          |

## Blocked downstream items

None. This CR blocks nothing: the upstream change is already applied and
reviewer-gated, so downstream work proceeds. It exists so that `QFAI-DRIFT-001`
stops reporting the approved change as undisclosed.

| Item | Kind | Why it depends on the artifact |
| ---- | ---- | ------------------------------ |
| —    | —    | —                              |

- Not blocked by this CR: all `/qfai-implement` ledger work on spec-0003 /
  spec-0006 / spec-0008 / spec-0015 / spec-0017 (the seeded `todo` rows are the
  post-change state this wave produced, not rows it invalidates).
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0003, spec-0004, spec-0006, spec-0008, spec-0009, spec-0012, spec-0015, spec-0017` (+ `_policies`)
- Plans: the `10_Plan.md` files listed below
- Tests: none reset (see Approved actions)
- Contracts: `CLI-WFSET, CLI-INIT, CLI-DOC` (contract index: `.qfai/specs/_policies/05_Contracts.md`)
- Schema: none

Changed protected paths (vs `origin/main`), all carrying approved CHG-007 content:

- `.qfai/contracts/README.md`
- `.qfai/contracts/cli/qfai-doctor.md`
- `.qfai/contracts/cli/qfai-init.md`
- `.qfai/contracts/cli/shipped-workflows.md`
- `.qfai/specs/_policies/01_Objective.md`
- `.qfai/specs/_policies/02_Initiative.md`
- `.qfai/specs/_policies/03_Capabilities.md`
- `.qfai/specs/_policies/04_Business-Flow.md`
- `.qfai/specs/_policies/05_Contracts.md`
- `.qfai/specs/_policies/06_Glossary.md`
- `.qfai/specs/_policies/07_Constraints.md`
- `.qfai/specs/_policies/08_Decisions.md`
- `.qfai/specs/_policies/09_Open-questions.md`
- `.qfai/specs/_policies/10_delta.md`
- `.qfai/specs/_policies/11_Slice-Policy.md`
- `.qfai/specs/spec-0003/01_Spec.md`
- `.qfai/specs/spec-0003/02_User-stories.md`
- `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0003/04_Business-Rules.md`
- `.qfai/specs/spec-0003/05_Examples.md`
- `.qfai/specs/spec-0003/06_Test-Cases.md`
- `.qfai/specs/spec-0003/07_Decisions.md`
- `.qfai/specs/spec-0003/08_Open-questions.md`
- `.qfai/specs/spec-0003/09_delta.md`
- `.qfai/specs/spec-0003/10_Plan.md`
- `.qfai/specs/spec-0004/01_Spec.md`
- `.qfai/specs/spec-0004/09_delta.md`
- `.qfai/specs/spec-0006/01_Spec.md`
- `.qfai/specs/spec-0006/02_User-stories.md`
- `.qfai/specs/spec-0006/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0006/04_Business-Rules.md`
- `.qfai/specs/spec-0006/05_Examples.md`
- `.qfai/specs/spec-0006/06_Test-Cases.md`
- `.qfai/specs/spec-0006/07_Decisions.md`
- `.qfai/specs/spec-0006/08_Open-questions.md`
- `.qfai/specs/spec-0006/09_delta.md`
- `.qfai/specs/spec-0006/10_Plan.md`
- `.qfai/specs/spec-0008/01_Spec.md`
- `.qfai/specs/spec-0008/02_User-stories.md`
- `.qfai/specs/spec-0008/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0008/04_Business-Rules.md`
- `.qfai/specs/spec-0008/05_Examples.md`
- `.qfai/specs/spec-0008/06_Test-Cases.md`
- `.qfai/specs/spec-0008/08_Open-questions.md`
- `.qfai/specs/spec-0008/09_delta.md`
- `.qfai/specs/spec-0008/10_Plan.md`
- `.qfai/specs/spec-0009/01_Spec.md`
- `.qfai/specs/spec-0009/09_delta.md`
- `.qfai/specs/spec-0012/09_delta.md`
- `.qfai/specs/spec-0015/01_Spec.md`
- `.qfai/specs/spec-0015/02_User-stories.md`
- `.qfai/specs/spec-0015/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0015/04_Business-Rules.md`
- `.qfai/specs/spec-0015/05_Examples.md`
- `.qfai/specs/spec-0015/06_Test-Cases.md`
- `.qfai/specs/spec-0015/07_Decisions.md`
- `.qfai/specs/spec-0015/08_Open-questions.md`
- `.qfai/specs/spec-0015/09_delta.md`
- `.qfai/specs/spec-0017/01_Spec.md`
- `.qfai/specs/spec-0017/02_User-stories.md`
- `.qfai/specs/spec-0017/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0017/04_Business-Rules.md`
- `.qfai/specs/spec-0017/05_Examples.md`
- `.qfai/specs/spec-0017/06_Test-Cases.md`
- `.qfai/specs/spec-0017/07_Decisions.md`
- `.qfai/specs/spec-0017/08_Open-questions.md`
- `.qfai/specs/spec-0017/09_delta.md`
- `.qfai/specs/spec-0017/10_Plan.md`
- `.qfai/specs/spec-0017/16_Traceability-ledger.md`

## Decision needed from user

None pending. The user decision this CR records was taken at the SDD stage
(CREATE approval in the CHG-007 triage table; the pack's rejected options are
preserved in `08_Decisions.md` / `09_delta.md` per the Delta Rejected Guard).

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: the CHG-007 wave itself — already executed and
   closed (sdd profile error=0; reviewer gate PASS, 11 rounds).
2. Downstream ledger sweep: **none**. No `tdd/test-list.md` row is reset by
   this CR — the CHG-007-seeded rows are the product of this change, not rows
   it invalidates. Any future reset citing this CR is out of its approved
   scope.

## Resolution

Applied by the `/qfai-sdd` CHG-007 run on `feature/chg-007-layered-ci-scaffold`
(19 commits, HEAD at the time `4d76ad29`), closing at
`validate --profile sdd --fail-on error` error=0 with the reviewer gate at
PASS. No ledger rows were reset (see Approved actions). This record was added
at the `/qfai-implement` stage so `QFAI-DRIFT-001` sees the approved CR naming
every changed protected path.
