# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps                                                         | Expected                                            | Notes               |
| ------------ | ----- | ------------ | ------------ | ------------------------------------------------------------- | --------------------------------------------------- | ------------------- |
| TC-0002-0001 | L3    | AC-0002-0001 | EX-0002-0001 | discussion-pack fixture with 15 files; run readiness          | required-file issue is not reported                 | 15 files pass       |
| TC-0002-0002 | L3    | AC-0002-0002 | EX-0002-0002 | OQ Register with open item; run readiness                     | blocking OQ error                                   | OQ gate fail        |
| TC-0002-0003 | L3    | AC-0002-0003 | EX-0002-0003 | UI-bearing pack with new sidecar family; run hardening        | sidecar completeness passes                         | sidecar pass        |
| TC-0002-0004 | L3    | AC-0002-0004 | EX-0002-0004 | remove required heading from exploration brief; run validator | required heading error                              | brief heading fail  |
| TC-0002-0005 | L3    | AC-0002-0005 | EX-0002-0005 | exploration rubric with 4 canonical axes; run validator       | rubric headings pass                                | rubric pass         |
| TC-0002-0006 | L3    | AC-0002-0006 | EX-0002-0006 | evaluator calibration with 4 canonical sections; run validator | calibration passes                                  | calibration pass    |
| TC-0002-0007 | L3    | AC-0002-0007 | EX-0002-0007 | review input bundle with best-of-history wording               | review bundle passes                                | bundle pass         |
| TC-0002-0008 | L3    | AC-0002-0008 | EX-0002-0008 | discussion artifacts omit selected direction                   | planner-first pass is preserved                     | no winner in discuss |
| TC-0002-0009 | L3    | AC-0002-0008 | EX-0002-0009 | discussion artifact asserts single final winner                | planner-first violation is emitted                  | negative posture    |
| TC-0002-0010 | L3    | AC-0002-0009 | EX-0002-0010 | non-UI pack without sidecars                                  | no UI-only blocking issue                           | non-ui safe skip    |
| TC-0002-0011 | L3    | AC-0002-0010 | EX-0002-0011 | inspect README / SKILL canonical wording                      | `prototyping.yaml` requiredness matches active rule | wording consistency |

## Notes

- legacy single-winner selection, legacy comparison, legacy evaluation contract, legacy winner contract 前提の test case は active path から除外された。
- discussion の active validator surface は new sidecar completeness, required headings, planner-first posture, and non-ui safe skip である。
