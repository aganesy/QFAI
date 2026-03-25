# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.
- Level: L2 (unit), L3 (integration)

## Test Case Table (required)

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| TC-0024-0001 | L2 | AC-0024-0001 | EX-0024-0001 | Call CLI parser with render evidence flags | Flags parse successfully and override config |  |
| TC-0024-0002 | L2 | AC-0024-0001 | EX-0024-0002 | Invoke runtime config merge with CLI override | CLI values win over config |  |
| TC-0024-0003 | L2 | AC-0024-0002 | EX-0024-0004 | Normalize a captured render entry | Entry contains required fields and is accepted |  |
| TC-0024-0004 | L2 | AC-0024-0002 | EX-0024-0005 | Normalize a skipped render entry without skippedReason | Validation fails with actionable error |  |
| TC-0024-0005 | L2 | AC-0024-0002 | EX-0024-0006 | Normalize a failed render entry without error | Validation fails with actionable error |  |
| TC-0024-0006 | L2 | AC-0024-0003 | EX-0024-0007 | Serialize evidence bundle with render asset paths | JSON contains metadata only, no inline binary/body |  |
| TC-0024-0007 | L2 | AC-0024-0004 | EX-0024-0008 | Simulate missing Playwright and run capture helper | Helper returns skipped typed outcome, process does not crash |  |
| TC-0024-0008 | L2 | AC-0024-0005 | EX-0024-0009 | Simulate mixed route/viewport outcomes | Successful viewport is preserved and failed viewport is recorded separately |  |
| TC-0024-0009 | L2 | AC-0024-0006 | EX-0024-0010 | Point captured entry to missing screenshot/html files | Validator emits error with route, viewport, and missing file details |  |
| TC-0024-0010 | L2 | AC-0024-0007 | EX-0024-0011 | Run validation under default profile with missing optional viewport | Severity is warning or equivalent non-blocking outcome |  |
| TC-0024-0011 | L2 | AC-0024-0007 | EX-0024-0012 | Run validation under strict profile with all skipped renders | Severity is error |  |
| TC-0024-0012 | L2 | AC-0024-0008, AC-0024-0009 | EX-0024-0013 | Validate markdown-only critique pack | No new blocking issue is introduced solely for absent render evidence |  |
| TC-0024-0013 | L3 | AC-0024-0010 | EX-0024-0014 | Generate report for skipped render evidence | Report includes missing item, reason, and recovery action |  |
| TC-0024-0014 | L3 | AC-0024-0011 | EX-0024-0015 | Read init README and evidence example | Documentation explains bundle shape and degraded mode |  |
| TC-0024-0015 | L3 | AC-0024-0012 | EX-0024-0016 | Review proposed browser QA / visual diff addition for v1.7.1 | Scope boundary rejects the proposal |  |
| TC-0024-0016 | L3 | AC-0024-0012 | EX-0024-0017 | Review proposed `qfai render` entry point | Proposal is rejected; prototyping remains the only entry point |  |
| TC-0024-0017 | L2 |  | EX-0024-0003 | Traceability backfill for EX-0024-0003 | EX-0024-0003 is referenced by at least one TC | Auto-added for validator traceability |

## Coverage Matrix

| EX-ID | TC-ID |
| --- | --- |
| EX-0024-0001 | TC-0024-0001 |
| EX-0024-0002 | TC-0024-0002 |
| EX-0024-0004 | TC-0024-0003 |
| EX-0024-0005 | TC-0024-0004 |
| EX-0024-0006 | TC-0024-0005 |
| EX-0024-0007 | TC-0024-0006 |
| EX-0024-0008 | TC-0024-0007 |
| EX-0024-0009 | TC-0024-0008 |
| EX-0024-0010 | TC-0024-0009 |
| EX-0024-0011 | TC-0024-0010 |
| EX-0024-0012 | TC-0024-0011 |
| EX-0024-0013 | TC-0024-0012 |
| EX-0024-0014 | TC-0024-0013 |
| EX-0024-0015 | TC-0024-0014 |
| EX-0024-0016 | TC-0024-0015 |
| EX-0024-0017 | TC-0024-0016 |
