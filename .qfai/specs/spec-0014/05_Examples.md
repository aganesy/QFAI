# 05 Examples

## EX-0014-0001: Full Verify Pass

- BR-Ref: BR-0014-0001, BR-0014-0002
- Given a project with all gates configured
- When `/qfai-verify` runs format, lint, typecheck, tests, build, and `qfai validate`
- Then all gates PASS and evidence summary is produced

## EX-0014-0002: Error Waiver Rejected

- BR-Ref: BR-0014-0003
- Given a waiver for `QFAI-COV-201` (error severity)
- When waiver is checked
- Then it is rejected: "Error-level waiver rejected; fix root cause"

## EX-0014-0003: Non-UI Zero UIX Issues

- BR-Ref: BR-0014-0006
- Given a CLI project with no uiux/ sidecar
- When UIX-VAL validators run
- Then zero issues reported (non-UI surface detected, validators skipped)

## EX-0014-0004: Fix Loop Iteration

- BR-Ref: BR-0014-0001
- Given lint gate fails with 3 issues
- When fix loop runs: fix issues -> re-run lint -> PASS
- Then lint gate transitions from FAIL to PASS

## EX-0014-0005: Migration Detection

- BR-Ref: BR-0014-0015
- Given a project with stale sidecar artifacts such as `uiux/10_strategy.md` or legacy 4-axis evaluation content
- When migration check runs
- Then explicit canonical migration errors with rename / 3-layer upgrade guidance are produced

## EX-0014-0006: Coverage Placeholder for BR-0014-0004

- BR-Ref: BR-0014-0004
- Given the consolidated rule BR-0014-0004
- When layer coverage is evaluated
- Then at least one example exists for BR-0014-0004

## EX-0014-0007: Coverage Placeholder for BR-0014-0005

- BR-Ref: BR-0014-0005
- Given the consolidated rule BR-0014-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0014-0005

## EX-0014-0008: Truthful Evidence — Captured (Pass)

- BR-Ref: BR-0014-0007
- Given a gate that executes successfully
- When evidence is recorded with state `captured` and actual command output in the body
- Then evidence passes truthfulness validation

## EX-0014-0009: Placeholder Evidence (Fail)

- BR-Ref: BR-0014-0007
- Given evidence with body text "TODO: paste output here"
- When evidence truthfulness validation runs
- Then it rejects with: "Evidence body contains placeholder text; replace with actual output"

## EX-0014-0010: Browser QA With Findings (Pass)

- BR-Ref: BR-0014-0008
- Given browser QA runner executes against a project with accessibility issues
- When the runner completes with 2 findings (e.g., missing alt text, low contrast ratio)
- Then findings are recorded truthfully with execution metadata and the gate result reflects the issues found

## EX-0014-0011: Browser QA Empty Findings (Warning)

- BR-Ref: BR-0014-0008
- Given browser QA runner executes but returns 0 findings with no execution metadata
- When evidence is checked
- Then a warning is emitted: "Browser QA returned 0 findings with no execution metadata; verify runner is functional"

## EX-0014-0012: Canonical Validator Set Enforced (Pass)

- BR-Ref: BR-0014-0009, BR-0014-0014
- Given a verify workflow configured with the 3-layer evaluation model
- When all executed validators belong to the canonical set
- Then verification proceeds without validator-family errors

## EX-0014-0013: Non-Canonical Validator Rejected (Fail)

- BR-Ref: BR-0014-0009
- Given a validator not registered in the canonical set attempts to execute
- When the verify workflow checks validator registration
- Then the validator is rejected with: "Validator not in canonical family; register or remove"

## EX-0014-0014: Removed Compatibility Surface

- BR-Ref: BR-0014-0013

| Input                                      | Expected                                                           |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Read `validators/index.ts`                 | No legacy compatibility re-exports                                 |
| Read `types.ts`                            | IssueCategory is `"canonical" | "change"` only                    |
| Inspect package surface for `legacy/` path | No `validators/legacy/` namespace remains                          |

## EX-0014-0015: Stale Sidecar Migration Errors

- BR-Ref: BR-0014-0015

| Input                                               | Expected                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Only `uiux/10_strategy.md` exists                   | `UIX-VAL-STRATEGY-LEGACY-FILENAME` error with canonical rename guidance  |
| Legacy 4-axis content exists in evaluation artifact | `UIX-VAL-3LAYER-LEGACY-FORMAT` error with 3-layer migration guidance     |

## EX-0014-0016: Happy path — all evaluation_connection fields present (Pass)

- BR-Ref: BR-0014-0016

| Input | Expected |
| ----- | -------- |
| UI-bearing pack; every Trend Scan entry in 04_Sources.md has `evaluation_connection: TRD-01` referencing a TRD-01 axis in 21_design_eval_trend_derived.md | UIX-VAL-T01 does not fire; exit 0 under `--fail-on error` |

## EX-0014-0017: Negative — missing evaluation_connection (Fail ERROR T01)

- BR-Ref: BR-0014-0016

| Input | Expected |
| ----- | -------- |
| UI-bearing pack with a Trend Scan entry that has no `evaluation_connection` field | UIX-VAL-T01 fires with severity `error`; message includes offending source id and field name `evaluation_connection`; exit non-zero under `--fail-on error` |

## EX-0014-0018: Edge — evaluation_connection empty string (Fail ERROR T01)

- BR-Ref: BR-0014-0016

| Input | Expected |
| ----- | -------- |
| `evaluation_connection: ""` in a Trend Scan entry | UIX-VAL-T01 fires with severity `error` (empty string is treated as missing) |

## EX-0014-0019: Negative — dangling evaluation_connection (Fail ERROR T02)

- BR-Ref: BR-0014-0017

| Input | Expected |
| ----- | -------- |
| `evaluation_connection: TRD-99` but 21_design_eval_trend_derived.md has only TRD-01, TRD-02 | UIX-VAL-T02 fires with severity `error`; message names TRD-99 |

## EX-0014-0020: Negative — dangling TRD source_refs (Warning T03)

- BR-Ref: BR-0014-0018

| Input | Expected |
| ----- | -------- |
| TRD-02 axis has `source_refs: [SRC-TREND-77]` but 04_Sources.md has no SRC-TREND-77 | UIX-VAL-T03 fires with severity `warning`; exit 0 under `--fail-on error`, non-zero under `--fail-on warning` |

## EX-0014-0021: Negative — visual trend without visual axis (Warning T04)

- BR-Ref: BR-0014-0019

| Input | Expected |
| ----- | -------- |
| 04_Sources.md has a Trend Scan entry in category `color` but 21_design_eval_trend_derived.md axes are all behavioral (no visual category) | UIX-VAL-T04 fires with severity `warning`; message references the color-category source entry |

## EX-0014-0022: Negative — 12_design_system.md missing (Fail ERROR DS01)

- BR-Ref: BR-0014-0020

| Input | Expected |
| ----- | -------- |
| UI-bearing pack with no `uiux/12_design_system.md` file on disk | UIX-VAL-DS01 fires with severity `error`; message includes path `uiux/12_design_system.md` |

## EX-0014-0023: Negative — required sections empty (Fail ERROR DS02)

- BR-Ref: BR-0014-0021

| Input | Expected |
| ----- | -------- |
| `uiux/12_design_system.md` present, but `## Do's and Don'ts` heading missing; `## Color Palette` body is only `TODO` | UIX-VAL-DS02 fires with severity `error` naming both offending sections |

## EX-0014-0024: Full-harness missing designSystemCompliance (Fail ERROR PROT-DS01)

- BR-Ref: BR-0014-0022

| Input | Expected |
| ----- | -------- |
| UI-bearing pack, `uiux/12_design_system.md` exists, mode `full-harness`, `prototyping.json.scoringTrace` has no `designSystemCompliance` key | PROT-DS01 fires with severity `error` |

## EX-0014-0025: Non-full-harness missing designSystemCompliance (Warning PROT-DS01)

- BR-Ref: BR-0014-0022

| Input | Expected |
| ----- | -------- |
| UI-bearing pack, mode `minimal`, `designSystemCompliance` absent | PROT-DS01 fires with severity `warning` |

## EX-0014-0026: State — non-UI pack yields zero fires (Pass)

- BR-Ref: BR-0014-0024

| Input | Expected |
| ----- | -------- |
| Pack with `surface: non-ui` containing no uiux/ directory and no 04_Sources.md Trend Scan content | Zero fires of UIX-VAL-T01, T02, T03, T04, DS01, DS02, PROT-DS01; exit 0 |

## EX-0014-0027: Idempotency — repeated runs produce identical output

- BR-Ref: BR-0014-0023

| Input | Expected |
| ----- | -------- |
| Run `qfai validate` twice against the same pack containing v1.7.16 rule violations | Rule ids, severities, messages, and offending file paths are byte-identical across runs (ordering stable by rule id then source id) |

## EX-0014-0028: Permission — read-only file is read successfully

- BR-Ref: BR-0014-0020

| Input | Expected |
| ----- | -------- |
| `uiux/12_design_system.md` present but filesystem permissions are read-only | Validator reads the file successfully and reports DS01/DS02 findings (if any) — no false DS01 due to permission errors; unreadable files (e.g., EACCES) produce a distinct `system error` issue, not DS01 |
