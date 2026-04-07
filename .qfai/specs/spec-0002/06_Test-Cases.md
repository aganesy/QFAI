# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps                                                                                          | Expected                                           | Notes                      |
| ------------ | ----- | ------------ | ------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------- |
| TC-0002-0001 | L3    | AC-0002-0001 | EX-0002-0001 | discussion-pack fixture with 15 files; run validateDiscussionPackReadiness                     | QFAI-DPACK-002 not reported                        | 15 ファイル pass           |
| TC-0002-0002 | L3    | AC-0002-0001 | EX-0002-0002 | discussion-pack fixture missing files; run validator                                           | QFAI-DPACK-002 error with missing file list        | ファイル不足 fail          |
| TC-0002-0003 | L3    | AC-0002-0002 | EX-0002-0003 | discussion directory with invalid name; run validator                                          | QFAI-DPACK-005 error                               | 命名不正 fail              |
| TC-0002-0004 | L3    | AC-0002-0003 | EX-0002-0004 | discussion-pack file with < 100 chars; run validator                                           | QFAI-DPACK-003 error                               | コンテンツ不足 fail        |
| TC-0002-0005 | L3    | AC-0002-0004 | EX-0002-0005 | OQ Register with open OQ; run validator                                                        | QFAI-DPACK-004 error listing OQ IDs                | Blocking OQ fail           |
| TC-0002-0006 | L3    | AC-0002-0018 | EX-0002-0006 | deferred OQ not in 13_Deferred; run validator                                                  | QFAI-DPACK-007 error                               | Deferred 不整合 fail       |
| TC-0002-0007 | L3    | AC-0002-0005 | EX-0002-0007 | 03_Story-Workshop.md with mermaid block; run validator                                         | QFAI-DPACK-008 not reported                        | Mermaid pass               |
| TC-0002-0008 | L3    | AC-0002-0006 | EX-0002-0008 | Pack with HTML style tag; run UI-bearing detection                                             | Classified as UI-bearing; DDS validators activated | UI-bearing detection       |
| TC-0002-0009 | L3    | AC-0002-0007 | EX-0002-0016 | Non-UI pack; run validate                                                                      | No DDS validators fire; zero new issues            | Non-UI bypass              |
| TC-0002-0010 | L3    | AC-0002-0008 | EX-0002-0009 | Explicit non-ui + HTML signals; run detection                                                  | Classified as non-ui; DDS not activated            | Explicit override          |
| TC-0002-0011 | L3    | AC-0002-0006 | EX-0002-0010 | UI-bearing pack with DDS section; run QFAI-DDP-019                                             | Validator passes                                   | DDS present pass           |
| TC-0002-0012 | L3    | AC-0002-0006 | EX-0002-0011 | UI-bearing pack without DDS; run QFAI-DDP-019                                                  | Error with field name, reason, remediation         | DDS absent fail            |
| TC-0002-0013 | L3    | AC-0002-0006 | EX-0002-0012 | UI-bearing DDS with 2+ options; run QFAI-DDP-020                                               | Validator passes                                   | Options pass               |
| TC-0002-0014 | L3    | AC-0002-0006 | EX-0002-0013 | UI-bearing DDS with anchor screen; run QFAI-DDP-021                                            | Validator passes                                   | Anchor pass                |
| TC-0002-0015 | L3    | AC-0002-0006 | EX-0002-0014 | Competitive ref with 3 fields; run QFAI-DDP-022                                                | Validator passes                                   | Competitive ref pass       |
| TC-0002-0016 | L3    | AC-0002-0006 | EX-0002-0015 | Competitive ref missing field; run QFAI-DDP-022                                                | Error identifying missing field                    | Competitive ref fail       |
| TC-0002-0017 | L3    | AC-0002-0009 | EX-0002-0017 | UI-bearing project; run discussion                                                             | uiux/ with 3-layer canonical 11 files generated    | Sidecar generation 3-layer |
| TC-0002-0018 | L3    | AC-0002-0010 | EX-0002-0039 | Non-UI project; run discussion                                                                 | No uiux/ directory; no errors                      | Sidecar skip               |
| TC-0002-0019 | L3    | AC-0002-0011 | EX-0002-0018 | New UI pack with 3-layer axes; run validator                                                   | All axes correctly classified; no 4-axis files     | 3-layer pass               |
| TC-0002-0020 | L3    | AC-0002-0012 | EX-0002-0019 | Pack with any 4-axis file in uiux/; run validator                                              | Error with removal instruction and migration guide | 4-axis immediate error     |
| TC-0002-0021 | L3    | AC-0002-0013 | EX-0002-0020 | UI pack with all 16 scoring fields per axis; run validator                                     | Scoring validator passes                           | Scoring-ready pass         |
| TC-0002-0022 | L3    | AC-0002-0014 | EX-0002-0021 | Strategy with 8 fields, selection_required=true, 3 candidates; run validator                   | Strategy validator passes                          | Strategy pass              |
| TC-0002-0023 | L3    | AC-0002-0014 | EX-0002-0028 | Strategy with selection_required=true, 1 candidate; run validator                              | Error: insufficient candidates                     | Strategy selection edge    |
| TC-0002-0024 | L3    | AC-0002-0015 | EX-0002-0022 | 3 screen entries, all 10 fields, unique IDs; run validator                                     | Screen contract validator passes                   | Screen contract pass       |
| TC-0002-0025 | L3    | AC-0002-0015 | EX-0002-0029 | 2 screen entries with duplicate screen_id; run validator                                       | Error: duplicate screen_id                         | Screen contract dup fail   |
| TC-0002-0026 | L3    | AC-0002-0016 | EX-0002-0023 | Taste interview with 10 non-empty sections; run validator                                      | Taste validator passes                             | Taste interview pass       |
| TC-0002-0027 | L3    | AC-0002-0017 | EX-0002-0024 | Trend scan with freshness metadata; run validator                                              | Trend validator passes                             | Trend scan pass            |
| TC-0002-0028 | L3    | AC-0002-0006 | EX-0002-0025 | CTA hierarchy with primary CTA; run QFAI-DDP-023                                               | Validator passes                                   | CTA pass                   |
| TC-0002-0029 | L3    | AC-0002-0006 | EX-0002-0026 | 4 states defined; run QFAI-DDP-024                                                             | Validator passes                                   | State coverage pass        |
| TC-0002-0030 | L3    | AC-0002-0006 | EX-0002-0027 | 1+ anti-goal defined; run QFAI-DDP-025                                                         | Validator passes                                   | Anti-goals pass            |
| TC-0002-0031 | L3    | AC-0002-0006 | EX-0002-0030 | Any DDS validator detects violation; inspect severity                                          | Severity is "error"                                | Error severity             |
| TC-0002-0032 | L3    | AC-0002-0019 | EX-0002-0031 | uiux/ with 21_eval_axis_consistency.md present; run validator                                  | Error: forbidden 4-axis file detected              | 旧 4-axis 残存 error       |
| TC-0002-0033 | L3    | AC-0002-0019 | EX-0002-0032 | uiux/ with 31_anchor.md present; run validator                                                 | Error: replaced by 31_selected_anchor_screen.md    | 旧 anchor 残存 error       |
| TC-0002-0034 | L3    | AC-0002-0019 | EX-0002-0033 | uiux/ with 60_critique_loop.md present; run validator                                          | Error: removed from family                         | 旧 critique_loop error     |
| TC-0002-0035 | L3    | AC-0002-0020 | EX-0002-0034 | 00_index.md with 3-layer canonical file list; run validator                                    | Validator passes                                   | Canonical index pass       |
| TC-0002-0036 | L3    | AC-0002-0020 | EX-0002-0035 | 00_index.md referencing 20_eval_axis_usability.md; run validator                               | Error: forbidden reference to 4-axis file          | Stale reference error      |
| TC-0002-0037 | L3    | AC-0002-0021 | EX-0002-0036 | uiux/ with 30_option_comparison.md + 31_selected_anchor_screen.md, no old files; run validator | Validator passes                                   | Canonical rename pass      |
| TC-0002-0038 | L3    | AC-0002-0022 | EX-0002-0037 | uiux/ with all 5 eval files (20~24) 3-layer compliant; run validator                           | Validator passes                                   | 3-layer family complete    |
| TC-0002-0039 | L3    | AC-0002-0022 | EX-0002-0038 | uiux/ missing 24_design_eval_dynamic_overrides.md; run validator                               | Validator passes (OPTIONAL file)                   | Optional file absent pass  |

## TC-0002-0040: prototyping.yaml Readiness Check

- EX-Ref: EX-0002-0040
- AC-Refs: AC-0002-0023
- Type: normal

| Step | Action                                                    | Expected                                         |
| ---- | --------------------------------------------------------- | ------------------------------------------------ |
| 1    | Create discussion-pack with 15 files, no prototyping.yaml | Pack created                                     |
| 2    | Run validateDiscussionPackReadiness()                     | missingSideArtifacts contains "prototyping.yaml" |
| 3    | Check QFAI-DPACK-002                                      | Issue emitted with side artifact detail          |

## TC-0002-0041: prototyping.yaml Present

- EX-Ref: EX-0002-0040
- AC-Refs: AC-0002-0023
- Type: normal

| Step | Action                                                        | Expected                      |
| ---- | ------------------------------------------------------------- | ----------------------------- |
| 1    | Create discussion-pack with 15 files + valid prototyping.yaml | Pack created                  |
| 2    | Run validateDiscussionPackReadiness()                         | missingSideArtifacts is empty |

## TC-0002-0042: Canonical Issue Code Emission

- EX-Ref: EX-0002-0041
- AC-Refs: AC-0002-0024
- Type: normal

| Step | Action                                        | Expected                                 |
| ---- | --------------------------------------------- | ---------------------------------------- |
| 1    | Create UI-bearing pack with sidecar artifacts | Pack created                             |
| 2    | Run discussion design hardening validators    | Issue codes match UIX-VAL-DDH-\* pattern |
| 3    | Verify no QFAI-DDP-\* codes in canonical path | Zero legacy codes emitted                |

## TC-0002-0043: prototyping.yaml Invalid Schema

- EX-Ref: EX-0002-0040
- AC-Refs: AC-0002-0023
- Type: error

| Step | Action                                               | Expected                                 |
| ---- | ---------------------------------------------------- | ---------------------------------------- |
| 1    | Create prototyping.yaml with missing required fields | File created                             |
| 2    | Run validatePrototypingRecommendation()              | QFAI-PROT-153/154/155/156 errors emitted |

## TC-0002-0044: DDH Validator Selected Anchor Source

- EX-Ref: EX-0002-0042
- AC-Refs: AC-0002-0024
- Type: normal

| Step | Action                                                                                   | Expected                                 |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1    | Create uiux/31_selected_anchor_screen.md with `## Selected Anchor` + `Selected: Option A` | File ready                               |
| 2    | Run discussion design hardening validators                                               | UIX-VAL-DDH-SELECTED-ANCHOR passes       |
| 3    | Remove `## Selected Anchor` section                                                      | Section removed                          |
| 4    | Run validators again                                                                     | UIX-VAL-DDH-SELECTED-ANCHOR error emitted |

## TC-0002-0045: Screen Contract Nested Bullet Parse

- EX-Ref: EX-0002-0043
- AC-Refs: AC-0002-0015
- Type: normal

| Step | Action                                                         | Expected                                        |
| ---- | -------------------------------------------------------------- | ----------------------------------------------- |
| 1    | Create 40_screen_contracts.md with nested bullet primary_tasks | File ready                                      |
| 2    | Run screen contract validator                                  | primary_tasks parsed as array, validator passes |
| 3    | Replace with CSV format primary_tasks                          | File updated                                    |
| 4    | Run validator again                                            | CSV parsed correctly (legacy compat)            |

## TC-0002-0046: State Coverage v1.7.13 Required States

- EX-Ref: EX-0002-0044
- AC-Refs: AC-0002-0006
- Type: boundary

| Step | Action                                        | Expected                 |
| ---- | --------------------------------------------- | ------------------------ |
| 1    | Define states: default, loading, empty, error | States ready             |
| 2    | Run state coverage validator                  | Pass                     |
| 3    | Replace "default" with "populated" (old term) | States updated           |
| 4    | Run validator                                 | Fail: "default" required |

## TC-0002-0047: Strategy Nested Bullet Parse

- EX-Ref: EX-0002-0045
- AC-Refs: AC-0002-0014
- Type: normal

| Step | Action                                                     | Expected                          |
| ---- | ---------------------------------------------------------- | --------------------------------- |
| 1    | Create 10_strategy.md with nested bullet candidate_options | File ready                        |
| 2    | Run strategy validator                                     | candidate_options parsed as array |
| 3    | Replace with CSV format                                    | File updated                      |
| 4    | Run validator again                                        | CSV parsed correctly              |

## TC-0002-0048: Review Request Selected Anchor

- EX-Ref: EX-0002-0046
- AC-Refs: AC-0002-0024
- Type: normal

| Step | Action                                              | Expected   |
| ---- | --------------------------------------------------- | ---------- |
| 1    | Create 14_Review-Request.md with "Selected Anchor"  | File ready |
| 2    | Validate review request template                    | Pass       |
