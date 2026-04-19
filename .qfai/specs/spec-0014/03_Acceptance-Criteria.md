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

## AC-0014-0012: Canonical UIX in Verify Production Path

Given verify runs qfai validate, when UIX validation executes, then runCanonicalUixValidators() is invoked directly and the production path does not call removed legacy aggregators.

## AC-0014-0013: Removed Compatibility Surface

Given the package surface is inspected, when validator exports and issue categories are checked, then no `validators/legacy/` export path or IssueCategory `compatibility` remains.

## AC-0014-0014: Stale Sidecar Migration Errors

Given a project contains stale UIX sidecar artifacts, when canonical validators run, then they emit explicit migration errors for legacy filenames or legacy 4-axis artifacts instead of silently accepting them.

## AC-0014-0015: UIX-VAL-T01 fires ERROR on missing evaluation_connection

- US-Ref: US-0014-0013

Given a UI-bearing discussion pack whose 04_Sources.md contains at least one Trend Scan entry without an `evaluation_connection` field (or with the field as an empty string), when `qfai validate --fail-on error` runs, then validation MUST exit with a non-zero (error) status and the output MUST include rule id `UIX-VAL-T01` with severity `error` and a message identifying the offending entry and the missing field name `evaluation_connection`.

## AC-0014-0016: UIX-VAL-T02 fires ERROR on dangling evaluation_connection

- US-Ref: US-0014-0014

Given a 04_Sources.md Trend Scan entry whose `evaluation_connection` value refers to a TRD-XX id not present in 21_design_eval_trend_derived.md, when `qfai validate --fail-on error` runs, then validation MUST exit with error status and the output MUST include rule id `UIX-VAL-T02` with severity `error` and a message naming the missing TRD-XX id.

## AC-0014-0017: UIX-VAL-T03 fires WARNING on dangling source_refs

- US-Ref: US-0014-0015

Given a TRD-XX axis in 21_design_eval_trend_derived.md whose `source_refs` entry does not match any 04_Sources.md entry id, when `qfai validate` runs, then the output MUST include rule id `UIX-VAL-T03` with severity `warning` identifying the unresolved source_ref; with `--fail-on error` the process MUST exit 0 and with `--fail-on warning` it MUST exit non-zero.

## AC-0014-0018: UIX-VAL-T04 fires WARNING on missing visual axis

- US-Ref: US-0014-0016

Given 04_Sources.md contains at least one visual-category Trend Scan entry (color, typography, visual motif, etc.) and 21_design_eval_trend_derived.md contains zero axes classified as visual, when `qfai validate` runs, then the output MUST include rule id `UIX-VAL-T04` with severity `warning` and a message listing at least one contributing visual Trend Scan entry.

## AC-0014-0019: UIX-VAL-DS01 fires ERROR when design_system.md missing

- US-Ref: US-0014-0017

Given a UI-bearing discussion pack whose `uiux/12_design_system.md` file does not exist, when `qfai validate --fail-on error` runs, then validation MUST exit with error status and the output MUST include rule id `UIX-VAL-DS01` with severity `error` and the message MUST include the absolute relative path `uiux/12_design_system.md`.

## AC-0014-0020: UIX-VAL-DS02 fires ERROR on empty required sections

- US-Ref: US-0014-0018

Given `uiux/12_design_system.md` exists but any of the three required sections (`Visual Theme`, `Color Palette`, `Do's and Don'ts`) is absent or contains only whitespace / placeholder TODO markers, when `qfai validate --fail-on error` runs, then validation MUST exit with error status and the output MUST include rule id `UIX-VAL-DS02` with severity `error` naming each empty section.

## AC-0014-0021: PROT-DS01 severity is condition-sensitive

- US-Ref: US-0014-0019

Given `prototyping.json.scoringTrace` does not record a `designSystemCompliance` score, when `qfai validate` runs in (UI-bearing surface AND uiux/12_design_system.md exists AND mode = full-harness), then PROT-DS01 MUST fire with severity `error`. Otherwise (non-UI, or 12_design_system.md absent, or mode != full-harness) PROT-DS01 MUST fire with severity `warning` if it fires at all, and MUST NOT fire on non-UI packs.
