# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                 | Expected                                                           | Notes |
| ------------ | ------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----- |
| EX-0024-0001 | BR-0024-0001 | `qfai prototyping --autogen-ui-fidelity --render-evidence --viewports desktop,mobile` | CLI accepts flags and overrides config                             |       |
| EX-0024-0002 | BR-0024-0001 | Config sets `renderEvidence.enabled=false`, CLI passes `--render-evidence`            | Runtime uses CLI override                                          |       |
| EX-0024-0003 | BR-0024-0002 | `--render-evidence` without `--autogen-ui-fidelity`                                   | Evidence records skipped request explicitly                        |       |
| EX-0024-0004 | BR-0024-0003 | Render entry with `viewport=desktop`, `status=captured`, `imagePath`, `htmlPath`      | Entry is normalized and valid                                      |       |
| EX-0024-0005 | BR-0024-0003 | Render entry with `status=skipped` and missing `skippedReason`                        | Validation error: skipped reason is required                       |       |
| EX-0024-0006 | BR-0024-0003 | Render entry with `status=failed` and missing `error`                                 | Validation error: failure detail is required                       |       |
| EX-0024-0007 | BR-0024-0004 | JSON output includes screenshot bytes or HTML body                                    | Validation rejects inline binary/body content                      |       |
| EX-0024-0008 | BR-0024-0005 | Playwright unavailable at runtime                                                     | Typed outcome records `skipped` with reason rather than crash      |       |
| EX-0024-0009 | BR-0024-0005 | One viewport capture succeeds, one viewport launch fails                              | Screen retains both outcomes independently                         |       |
| EX-0024-0010 | BR-0024-0006 | Captured entry points to missing `.png` or `.html` file                               | Validation error identifies route, viewport, and missing artifact  |       |
| EX-0024-0011 | BR-0024-0007 | Default profile with missing optional viewport                                        | Severity may be warning                                            |       |
| EX-0024-0012 | BR-0024-0007 | Strict profile with all viewports skipped                                             | Severity is error                                                  |       |
| EX-0024-0013 | BR-0024-0008 | Markdown-only critique pack with no render evidence                                   | Legacy validation still succeeds                                   |       |
| EX-0024-0014 | BR-0024-0009 | Report generated for skipped render due to Playwright not installed                   | Report explains install reason and recovery action                 |       |
| EX-0024-0015 | BR-0024-0010 | Init README includes bundle path convention and degraded mode notes                   | Documentation is sufficient for operator use                       |       |
| EX-0024-0016 | BR-0024-0011 | Proposed browser QA / visual diff change for v1.7.1                                   | Change is rejected as out of scope                                 |       |
| EX-0024-0017 | BR-0024-0012 | Alternative plan introduces `qfai render`                                             | Change is rejected; prototyping remains the only entry point       |       |
| EX-0024-0018 | BR-0024-0013 | Prototyping completes with render evidence enabled; render target reachable           | CLI output includes real screenshot hash, timestamp, and file path |       |
| EX-0024-0019 | BR-0024-0014 | Prototyping runs with render evidence enabled; render target is unreachable           | CLI emits explicit "no evidence captured" error; no stub emitted   |       |
| EX-0024-0020 | BR-0024-0015 | Render completes but output file is 0 bytes                                           | Evidence flagged as empty; warning recorded in CLI output          |       |
| EX-0024-0021 | BR-0024-0016 | Prototyping targets a non-UI surface                                                  | Render evidence section absent from CLI output; no placeholder     |       |
| EX-0024-0022 | BR-0024-0013 | Same unchanged source re-run; render evidence already captured                        | Content hash is identical; idempotency confirmed                   |       |
| EX-0024-0023 | BR-0024-0013 | CLI output examined for stub/placeholder values after evidence wiring                 | No placeholder strings present; all evidence fields populated      |       |
| EX-0024-0024 | BR-0024-0017 | Evidence bundle with all entries using captured/skipped/failed status                  | Validation PASS; all status values are canonical 3-value vocabulary | v1.7.11 completion |
| EX-0024-0025 | BR-0024-0017 | Evidence bundle containing a "requested" status entry                                 | Validation FAIL; "requested" is rejected as non-canonical status   | v1.7.11 completion |
| EX-0024-0026 | BR-0024-0018 | "captured" entry with screenshot hash, timestamp, and file path present               | Validation PASS; execution evidence confirms actual capture        | v1.7.11 completion |
| EX-0024-0027 | BR-0024-0018 | "captured" entry missing screenshot hash or timestamp                                 | Validation FAIL; captured requires actual execution evidence       | v1.7.11 completion |

## Scenario Examples

```gherkin
# Parent: BR-0024-0003
Scenario: Captured render entry is accepted
  Given a render entry has viewport desktop and status captured
  And imagePath and htmlPath are both present
  When the evidence bundle is validated
  Then the entry is accepted as a valid captured render
```

```gherkin
# Parent: BR-0024-0005
Scenario: Missing Playwright becomes skipped evidence
  Given Playwright is not installed
  When render capture is requested
  Then the helper returns a skipped outcome
  And the skipped reason is recorded in the evidence bundle
```

```gherkin
# Parent: BR-0024-0013
Scenario: Real render evidence reaches CLI output
  Given prototyping completes with render evidence capture enabled
  And the render target was reachable
  When the CLI outputs the prototyping result
  Then the render evidence section contains a real screenshot hash
  And a timestamp and file path are present
  And no placeholder string appears in the evidence section
```

```gherkin
# Parent: BR-0024-0014
Scenario: Unreachable render target produces explicit CLI error
  Given the render target URL is unreachable
  When prototyping runs with render evidence enabled
  Then the CLI output contains an explicit "no evidence captured" error
  And no stub or placeholder evidence value is present
```

```gherkin
# Parent: BR-0024-0017
Scenario: Evidence with "requested" status is rejected
  Given a render evidence bundle contains an entry with status "requested"
  When the evidence bundle is validated
  Then the validator rejects the entry
  And the error explains that only captured/skipped/failed are permitted
```

```gherkin
# Parent: BR-0024-0018
Scenario: "captured" entry with actual execution evidence passes
  Given a render entry has status "captured"
  And the entry includes screenshot hash, timestamp, and file path
  When the evidence bundle is validated
  Then the entry is accepted as valid
  And execution evidence confirms the capture was real
```
