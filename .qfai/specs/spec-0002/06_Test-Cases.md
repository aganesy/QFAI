# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps                                                                        | Expected                                           | Notes                    |
| ------------ | ----- | ------------ | ------------ | ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| TC-0002-0001 | L3    | AC-0002-0001 | EX-0002-0001 | discussion-pack fixture with 15 files; run validateDiscussionPackReadiness   | QFAI-DPACK-002 not reported                        | 15 ファイル pass         |
| TC-0002-0002 | L3    | AC-0002-0001 | EX-0002-0002 | discussion-pack fixture missing files; run validator                         | QFAI-DPACK-002 error with missing file list        | ファイル不足 fail        |
| TC-0002-0003 | L3    | AC-0002-0002 | EX-0002-0003 | discussion directory with invalid name; run validator                        | QFAI-DPACK-005 error                               | 命名不正 fail            |
| TC-0002-0004 | L3    | AC-0002-0003 | EX-0002-0004 | discussion-pack file with < 100 chars; run validator                         | QFAI-DPACK-003 error                               | コンテンツ不足 fail      |
| TC-0002-0005 | L3    | AC-0002-0004 | EX-0002-0005 | OQ Register with open OQ; run validator                                      | QFAI-DPACK-004 error listing OQ IDs                | Blocking OQ fail         |
| TC-0002-0006 | L3    | AC-0002-0018 | EX-0002-0006 | deferred OQ not in 13_Deferred; run validator                                | QFAI-DPACK-007 error                               | Deferred 不整合 fail     |
| TC-0002-0007 | L3    | AC-0002-0005 | EX-0002-0007 | 03_Story-Workshop.md with mermaid block; run validator                       | QFAI-DPACK-008 not reported                        | Mermaid pass             |
| TC-0002-0008 | L3    | AC-0002-0006 | EX-0002-0008 | Pack with HTML style tag; run UI-bearing detection                           | Classified as UI-bearing; DDS validators activated | UI-bearing detection     |
| TC-0002-0009 | L3    | AC-0002-0007 | EX-0002-0016 | Non-UI pack; run validate                                                    | No DDS validators fire; zero new issues            | Non-UI bypass            |
| TC-0002-0010 | L3    | AC-0002-0008 | EX-0002-0009 | Explicit non-ui + HTML signals; run detection                                | Classified as non-ui; DDS not activated            | Explicit override        |
| TC-0002-0011 | L3    | AC-0002-0006 | EX-0002-0010 | UI-bearing pack with DDS section; run QFAI-DDP-019                           | Validator passes                                   | DDS present pass         |
| TC-0002-0012 | L3    | AC-0002-0006 | EX-0002-0011 | UI-bearing pack without DDS; run QFAI-DDP-019                                | Error with field name, reason, remediation         | DDS absent fail          |
| TC-0002-0013 | L3    | AC-0002-0006 | EX-0002-0012 | UI-bearing DDS with 2+ options; run QFAI-DDP-020                             | Validator passes                                   | Options pass             |
| TC-0002-0014 | L3    | AC-0002-0006 | EX-0002-0013 | UI-bearing DDS with anchor screen; run QFAI-DDP-021                          | Validator passes                                   | Anchor pass              |
| TC-0002-0015 | L3    | AC-0002-0006 | EX-0002-0014 | Competitive ref with 3 fields; run QFAI-DDP-022                              | Validator passes                                   | Competitive ref pass     |
| TC-0002-0016 | L3    | AC-0002-0006 | EX-0002-0015 | Competitive ref missing field; run QFAI-DDP-022                              | Error identifying missing field                    | Competitive ref fail     |
| TC-0002-0017 | L3    | AC-0002-0009 | EX-0002-0017 | UI-bearing project; run discussion                                           | uiux/ with 11 files generated                      | Sidecar generation       |
| TC-0002-0018 | L3    | AC-0002-0010 | EX-0002-0016 | Non-UI project; run discussion                                               | No uiux/ directory; no errors                      | Sidecar skip             |
| TC-0002-0019 | L3    | AC-0002-0011 | EX-0002-0018 | New UI pack with 3-layer axes; run validator                                 | All axes correctly classified; no warnings         | 3-layer pass             |
| TC-0002-0020 | L3    | AC-0002-0012 | EX-0002-0019 | v1.7.6 pack with 4-axis; run validator                                       | Warning with upgrade guidance                      | 4-axis migration warning |
| TC-0002-0021 | L3    | AC-0002-0013 | EX-0002-0020 | UI pack with all 16 scoring fields per axis; run validator                   | Scoring validator passes                           | Scoring-ready pass       |
| TC-0002-0022 | L3    | AC-0002-0014 | EX-0002-0021 | Strategy with 8 fields, selection_required=true, 3 candidates; run validator | Strategy validator passes                          | Strategy pass            |
| TC-0002-0023 | L3    | AC-0002-0014 | EX-0002-0028 | Strategy with selection_required=true, 1 candidate; run validator            | Error: insufficient candidates                     | Strategy selection edge  |
| TC-0002-0024 | L3    | AC-0002-0015 | EX-0002-0022 | 3 screen entries, all 10 fields, unique IDs; run validator                   | Screen contract validator passes                   | Screen contract pass     |
| TC-0002-0025 | L3    | AC-0002-0015 | EX-0002-0029 | 2 screen entries with duplicate screen_id; run validator                     | Error: duplicate screen_id                         | Screen contract dup fail |
| TC-0002-0026 | L3    | AC-0002-0016 | EX-0002-0023 | Taste interview with 10 non-empty sections; run validator                    | Taste validator passes                             | Taste interview pass     |
| TC-0002-0027 | L3    | AC-0002-0017 | EX-0002-0024 | Trend scan with freshness metadata; run validator                            | Trend validator passes                             | Trend scan pass          |
| TC-0002-0028 | L3    | AC-0002-0006 | EX-0002-0025 | CTA hierarchy with primary CTA; run QFAI-DDP-023                             | Validator passes                                   | CTA pass                 |
| TC-0002-0029 | L3    | AC-0002-0006 | EX-0002-0026 | 4 states defined; run QFAI-DDP-024                                           | Validator passes                                   | State coverage pass      |
| TC-0002-0030 | L3    | AC-0002-0006 | EX-0002-0027 | 1+ anti-goal defined; run QFAI-DDP-025                                       | Validator passes                                   | Anti-goals pass          |
| TC-0002-0031 | L3    | AC-0002-0006 | EX-0002-0030 | Any DDS validator detects violation; inspect severity                        | Severity is "error"                                | Error severity           |
