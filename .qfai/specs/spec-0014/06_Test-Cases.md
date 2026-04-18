# 06 Test Cases

## TC-0014-0001: Full-Scan Always Executes

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0001
- Verify that verify runs full-scan regardless of prior evidence state.

## TC-0014-0002: All Gates Run and Recorded

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0002
- Verify QFAI and repo gates are both executed with commands and results recorded.

## TC-0014-0003: Fix Loop Until PASS

- EX-Ref: EX-0014-0004
- AC-Refs: AC-0014-0003
- Verify failing gates trigger fix loop that iterates until PASS.

## TC-0014-0004: UIX-VAL Determinism

- EX-Ref: EX-0014-0003
- AC-Refs: AC-0014-0004
- Verify same input produces same UIX-VAL output on repeated runs.

## TC-0014-0005: Non-UI Zero Issues

- EX-Ref: EX-0014-0003
- AC-Refs: AC-0014-0005
- Verify zero UIX issues on non-UI projects.

## TC-0014-0006: Error Waiver Rejected

- EX-Ref: EX-0014-0002
- AC-Refs: AC-0014-0006
- Verify error-level waivers are rejected.

## TC-0014-0007: Evidence Summary Completeness

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0007
- Verify evidence includes Change Classification, gate results, commands, and next actions.

## TC-0014-0008: Static Policy Checks

- EX-Ref: EX-0014-0001
- AC-Refs: AC-0014-0008
- Verify drift-protocol.md, test-layers.md exist and SKILL.md files include DRIFT-PROTOCOL tag.

## TC-0014-0009: Migration Detection and Guidance

- EX-Ref: EX-0014-0005, EX-0014-0015
- AC-Refs: AC-0014-0014
- Verify stale sidecar artifacts (`uiux/10_strategy.md`, legacy 4-axis evaluation content, forbidden legacy files) produce explicit canonical migration errors with upgrade guidance.

## TC-0014-0010: Coverage Placeholder for EX-0014-0006

- EX-Ref: EX-0014-0006
- AC-Refs: AC-0014-0001
- Verify that migrated example EX-0014-0006 is covered by at least one test case.

## TC-0014-0011: Coverage Placeholder for EX-0014-0007

- EX-Ref: EX-0014-0007
- AC-Refs: AC-0014-0001
- Verify that migrated example EX-0014-0007 is covered by at least one test case.

## TC-0014-0012: Truthful Evidence State — Captured Pass

- EX-Ref: EX-0014-0008
- AC-Refs: AC-0014-0009
- Verify evidence with state `captured` and actual command output passes truthfulness validation.

## TC-0014-0013: Placeholder Evidence Rejection

- EX-Ref: EX-0014-0009
- AC-Refs: AC-0014-0009
- Verify evidence containing placeholder text ("TODO", "TBD", "N/A placeholder", "paste output here") is rejected.

## TC-0014-0014: Browser QA With Findings Accepted

- EX-Ref: EX-0014-0010
- AC-Refs: AC-0014-0010
- Verify browser QA findings are recorded truthfully with execution metadata when the runner detects issues.

## TC-0014-0015: Browser QA Empty Findings Warning

- EX-Ref: EX-0014-0011
- AC-Refs: AC-0014-0010
- Verify that browser QA returning 0 findings with no execution metadata triggers a warning.

## TC-0014-0016: Canonical Validator Set Enforcement

- EX-Ref: EX-0014-0012
- AC-Refs: AC-0014-0011
- Verify the 3-layer evaluation model's canonical validator family is enforced during verification.

## TC-0014-0017: Non-Canonical Validator Rejection

- EX-Ref: EX-0014-0013
- AC-Refs: AC-0014-0011
- Verify that a validator not registered in the canonical set is rejected with an error.

## TC-0014-0018: Canonical UIX in Verify Path

- EX-Ref: EX-0014-0012
- AC-Refs: AC-0014-0012
- Type: normal

| Step | Action                                                               | Expected                          |
| ---- | -------------------------------------------------------------------- | --------------------------------- |
| 1    | Inspect `src/core/validate.ts`                                       | `runCanonicalUixValidators` is imported |
| 2    | Inspect the UIX validation pipeline                                  | `runCanonicalUixValidators` is invoked  |
| 3    | Check for removed legacy aggregators                                 | No legacy aggregator call remains       |

## TC-0014-0019: Removed Compatibility Surface

- EX-Ref: EX-0014-0014
- AC-Refs: AC-0014-0013
- Type: boundary

| Step | Action                        | Expected                                                  |
| ---- | --------------------------- | ---------------------------------------------------------- |
| 1    | Inspect `validators/index.ts` | No legacy compatibility re-exports remain               |
| 2    | Inspect `types.ts`            | IssueCategory excludes `"compatibility"`                |
| 3    | Search package surface        | No `validators/legacy/` namespace remains               |

## TC-0014-0020: UIX-VAL-T01 — missing evaluation_connection fires ERROR

- EX-Ref: EX-0014-0017
- AC-Refs: AC-0014-0015
- Type: unit (negative)

Verify that a 04_Sources.md Trend Scan entry without `evaluation_connection` produces exactly one UIX-VAL-T01 issue with severity `error` and the source id in the message.

## TC-0014-0021: UIX-VAL-T01 — present evaluation_connection passes

- EX-Ref: EX-0014-0016
- AC-Refs: AC-0014-0015
- Type: unit (happy)

Verify that when every Trend Scan entry has `evaluation_connection` referencing a real TRD-XX, UIX-VAL-T01 produces zero issues.

## TC-0014-0022: UIX-VAL-T01 — empty string treated as missing

- EX-Ref: EX-0014-0018
- AC-Refs: AC-0014-0015
- Type: unit (boundary)

Verify that `evaluation_connection: ""` is treated as missing and produces a UIX-VAL-T01 error.

## TC-0014-0023: UIX-VAL-T02 — dangling evaluation_connection fires ERROR

- EX-Ref: EX-0014-0019
- AC-Refs: AC-0014-0016
- Type: unit (negative)

Verify that `evaluation_connection: TRD-99` against a TRD set that does not contain TRD-99 produces a UIX-VAL-T02 error naming TRD-99.

## TC-0014-0024: UIX-VAL-T03 — dangling source_refs fires WARNING

- EX-Ref: EX-0014-0020
- AC-Refs: AC-0014-0017
- Type: unit (negative)

Verify that a TRD axis referencing a non-existent source id produces UIX-VAL-T03 with severity `warning` and does not cause `--fail-on error` to exit non-zero.

## TC-0014-0025: UIX-VAL-T04 — visual trend without visual axis fires WARNING

- EX-Ref: EX-0014-0021
- AC-Refs: AC-0014-0018
- Type: unit (negative)

Verify that a pack with a visual-category Trend Scan entry but no visual axis in 21_design_eval_trend_derived.md produces UIX-VAL-T04 with severity `warning`.

## TC-0014-0026: UIX-VAL-DS01 — missing design_system.md fires ERROR

- EX-Ref: EX-0014-0022
- AC-Refs: AC-0014-0019
- Type: unit (negative)

Verify that a UI-bearing pack with no `uiux/12_design_system.md` produces UIX-VAL-DS01 with severity `error`.

## TC-0014-0027: UIX-VAL-DS02 — empty required sections fire ERROR

- EX-Ref: EX-0014-0023
- AC-Refs: AC-0014-0020
- Type: unit (negative, boundary)

Verify that when `Do's and Don'ts` is absent and `Color Palette` body is only a TODO placeholder, UIX-VAL-DS02 reports both offending sections with severity `error`.

## TC-0014-0028: PROT-DS01 — full-harness missing score fires ERROR

- EX-Ref: EX-0014-0024
- AC-Refs: AC-0014-0021
- Type: unit (negative, state)

Verify that under (UI-bearing + uiux/12_design_system.md exists + mode `full-harness`), a prototyping.json without `scoringTrace.designSystemCompliance` produces PROT-DS01 with severity `error`.

## TC-0014-0029: PROT-DS01 — non-full-harness missing score fires WARNING

- EX-Ref: EX-0014-0025
- AC-Refs: AC-0014-0021
- Type: unit (state)

Verify that under mode `minimal` with `designSystemCompliance` absent, PROT-DS01 produces severity `warning`, not `error`.

## TC-0014-0030: Non-UI pack yields zero v1.7.16 fires

- EX-Ref: EX-0014-0026
- AC-Refs: AC-0014-0005, AC-0014-0015, AC-0014-0016, AC-0014-0017, AC-0014-0018, AC-0014-0019, AC-0014-0020, AC-0014-0021
- Type: unit (state, safety)

Verify that on a pack with `surface: non-ui`, none of UIX-VAL-T01..T04, UIX-VAL-DS01, UIX-VAL-DS02, PROT-DS01 fire.

## TC-0014-0031: v1.7.16 validators are idempotent

- EX-Ref: EX-0014-0027
- AC-Refs: AC-0014-0004
- Type: unit (idempotency)

Verify that running the v1.7.16 validators twice against identical input produces byte-identical issue lists (stable sort by rule id, then by source id).

## TC-0014-0032: DS01 respects read-only but readable file

- EX-Ref: EX-0014-0028
- AC-Refs: AC-0014-0019
- Type: unit (permission)

Verify that a read-only but readable `uiux/12_design_system.md` does not trigger a false DS01 and that EACCES reads are surfaced as a distinct `system error` issue rather than as DS01.

