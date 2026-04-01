# 03 Acceptance Criteria

## AC-0014-0001: Full-Scan Always

Given any verification run, when `/qfai-verify` executes, then it runs full-scan verification (no diff-only shortcuts).

## AC-0014-0002: All Gates Run and Recorded

Given the verify workflow, when gates execute, then QFAI gates and all applicable repo gates run with exact commands and results recorded.

## AC-0014-0003: Fix Loop Until All PASS

Given a failing gate, when the fix loop runs, then it identifies root cause, fixes, and re-verifies until all gates PASS.

## AC-0014-0004: UIX-VAL Determinism

Given the same input artifacts, when UIX-VAL validators run twice, then they produce identical output.

## AC-0014-0005: Non-UI Zero Issues

Given a project with `surface: non-ui`, when UIX-VAL/UIX-REV validators run, then zero issues are reported.

## AC-0014-0006: Error Waiver Rejected

Given a waiver attempting to suppress an `error` finding, when waiver is checked, then it is rejected and treated as a failure.

## AC-0014-0007: Evidence Summary Completeness

Given verify completion, when evidence is checked, then it includes Change Classification, QFAI gate results, repo gate results, commands executed, and next actions.

## AC-0014-0008: Static Policy Checks

Given the verify workflow, when static policy checks run, then drift-protocol.md exists, test-layers.md exists, and all SKILL.md files include `[DRIFT-PROTOCOL:MANDATORY]`.

## AC-0014-0009: Truthful Evidence States

Given evidence is recorded for a gate, when the evidence state is set, then it MUST be one of: `captured`, `skipped`, `failed`, `missing`, `not-applicable` — no other states or placeholder text allowed.

## AC-0014-0010: Browser QA Minimum Runner

Given the browser QA gate executes, when the runner completes, then it runs actual checks and may produce findings; findings MUST NOT be hard-coded empty.

## AC-0014-0011: Canonical Validator Set Enforcement

Given the verify workflow uses the 3-layer evaluation model (D-001), when validators are selected, then only the canonical validator family is used and non-canonical validators are rejected.
