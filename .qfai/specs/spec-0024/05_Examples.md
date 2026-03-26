# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                 | Expected                                                          | Notes |
| ------------ | ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----- |
| EX-0024-0001 | BR-0024-0001 | `qfai prototyping --autogen-ui-fidelity --render-evidence --viewports desktop,mobile` | CLI accepts flags and overrides config                            |       |
| EX-0024-0002 | BR-0024-0001 | Config sets `renderEvidence.enabled=false`, CLI passes `--render-evidence`            | Runtime uses CLI override                                         |       |
| EX-0024-0003 | BR-0024-0002 | `--render-evidence` without `--autogen-ui-fidelity`                                   | Evidence records skipped request explicitly                       |       |
| EX-0024-0004 | BR-0024-0003 | Render entry with `viewport=desktop`, `status=captured`, `imagePath`, `htmlPath`      | Entry is normalized and valid                                     |       |
| EX-0024-0005 | BR-0024-0003 | Render entry with `status=skipped` and missing `skippedReason`                        | Validation error: skipped reason is required                      |       |
| EX-0024-0006 | BR-0024-0003 | Render entry with `status=failed` and missing `error`                                 | Validation error: failure detail is required                      |       |
| EX-0024-0007 | BR-0024-0004 | JSON output includes screenshot bytes or HTML body                                    | Validation rejects inline binary/body content                     |       |
| EX-0024-0008 | BR-0024-0005 | Playwright unavailable at runtime                                                     | Typed outcome records `skipped` with reason rather than crash     |       |
| EX-0024-0009 | BR-0024-0005 | One viewport capture succeeds, one viewport launch fails                              | Screen retains both outcomes independently                        |       |
| EX-0024-0010 | BR-0024-0006 | Captured entry points to missing `.png` or `.html` file                               | Validation error identifies route, viewport, and missing artifact |       |
| EX-0024-0011 | BR-0024-0007 | Default profile with missing optional viewport                                        | Severity may be warning                                           |       |
| EX-0024-0012 | BR-0024-0007 | Strict profile with all viewports skipped                                             | Severity is error                                                 |       |
| EX-0024-0013 | BR-0024-0008 | Markdown-only critique pack with no render evidence                                   | Legacy validation still succeeds                                  |       |
| EX-0024-0014 | BR-0024-0009 | Report generated for skipped render due to Playwright not installed                   | Report explains install reason and recovery action                |       |
| EX-0024-0015 | BR-0024-0010 | Init README includes bundle path convention and degraded mode notes                   | Documentation is sufficient for operator use                      |       |
| EX-0024-0016 | BR-0024-0011 | Proposed browser QA / visual diff change for v1.7.1                                   | Change is rejected as out of scope                                |       |
| EX-0024-0017 | BR-0024-0012 | Alternative plan introduces `qfai render`                                             | Change is rejected; prototyping remains the only entry point      |       |

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
