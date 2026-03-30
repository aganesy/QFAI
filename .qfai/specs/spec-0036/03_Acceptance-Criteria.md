# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0036-0001: Placeholder text removed from render evidence path
Scenario: Render evidence placeholder removed
  Given the render evidence CLI path in prototyping.ts
  When the CLI path is invoked for render evidence
  Then no "not implemented in this slice" placeholder text exists in the output
  And the capture path is called instead

# AC-0036-0002: Capture path called and returns structured result
Scenario: Render evidence capture returns structured result
  Given a prototyping session with render evidence requested
  When the capture path is invoked successfully
  Then the result contains status "captured"
  And the result includes the captured evidence data

# AC-0036-0003: Skipped capture includes reason and alternative
Scenario: Render evidence skipped with reason and alternative
  Given a prototyping session where capture environment is unavailable
  When the render evidence path is invoked
  Then the result contains status "skipped"
  And the result includes an honest reason for why capture was skipped
  And the result includes an alternative suggestion for obtaining evidence

# AC-0036-0004: Mixed capture reports failed items
Scenario: Render evidence mixed capture reports failures
  Given a prototyping session with multiple capture targets
  When some targets succeed and others fail
  Then the result contains both captured items and failed items
  And each failed item includes a reason for failure

# AC-0036-0005: Smoke phase returns non-empty findings
Scenario: Browser QA smoke phase returns real findings
  Given a valid URL for browser QA
  When the smoke phase is executed
  Then the findings array is non-empty
  And each finding has an actionable structure (selector, issue, severity, suggestion)

# AC-0036-0006: Visual phase returns findings (should priority)
Scenario: Browser QA visual phase returns real findings
  Given a valid URL for browser QA
  When the visual phase is executed
  Then the findings array contains visual findings
  And each finding has an actionable structure

# AC-0036-0007: No-URL case returns structured error
Scenario: Browser QA without URL returns structured error
  Given no URL is provided for browser QA
  When the browser QA runner is invoked
  Then a structured error is returned (not an empty findings array)
  And the error clearly indicates that a URL is required

# AC-0036-0008: Findings have actionable structure
Scenario: Browser QA findings are actionable
  Given browser QA has completed smoke and/or visual phase
  When findings are returned
  Then each finding contains at minimum: selector, issue description, severity level, and suggestion
```

```gherkin
# AC-0036-0009: Smoke phase executes actual analysis and returns real findings
Scenario: Smoke phase returns real analysis findings
  Given a valid URL and the smoke phase runner is wired into runBrowserQa()
  When the smoke phase executes
  Then the findings array contains real analysis results
  And each finding has selector, issue, severity, and suggestion
  And no stub or placeholder findings are returned

# AC-0036-0010: Visual phase executes actual analysis and returns real findings
Scenario: Visual phase returns real analysis findings
  Given a valid URL and the visual phase runner is wired into runBrowserQa()
  When the visual phase executes
  Then the findings array contains real visual analysis results
  And each finding has selector, issue, severity, and suggestion

# AC-0036-0011: Interaction phase executes actual analysis and returns real findings
Scenario: Interaction phase returns real analysis findings
  Given a valid URL and the interaction phase runner is wired into runBrowserQa()
  When the interaction phase executes
  Then the findings array contains real interaction analysis results
  And each finding has selector, issue, severity, and suggestion

# AC-0036-0012: Accessibility phase executes actual analysis and returns real findings
Scenario: Accessibility phase returns real analysis findings
  Given a valid URL and the accessibility phase runner is wired into runBrowserQa()
  When the accessibility phase executes
  Then the findings array contains real accessibility analysis results
  And each finding has selector, issue, severity, and suggestion

# AC-0036-0013: No foundation-only comments remain in phase runner source
Scenario: Foundation-only comments are removed
  Given the browser QA phase runner source code
  When the source is inspected
  Then no "foundation-only", "not implemented in this slice", or equivalent placeholder comments exist
  And all code paths execute actual analysis logic

# AC-0036-0014: Empty findings require honest clean metadata
Scenario: Empty findings are honest with clean status
  Given a browser QA phase executes and truly finds no issues
  When the findings result is inspected
  Then the findings array is empty
  And the result metadata includes "status": "clean"
  And empty findings without clean metadata are rejected
```

## AC Catalog (optional)

| AC-ID        | Title                             | Notes                             | Priority |
| ------------ | --------------------------------- | --------------------------------- | -------- |
| AC-0036-0001 | Placeholder removal               | Render evidence: core contract    | P0       |
| AC-0036-0002 | Capture structured result         | Render evidence: happy path       | P0       |
| AC-0036-0003 | Skipped with reason + alternative | Render evidence: OQ-0006 decision | P0       |
| AC-0036-0004 | Mixed capture failure reporting   | Render evidence: edge case        | P1       |
| AC-0036-0005 | Smoke phase non-empty findings    | Browser QA: core contract         | P1       |
| AC-0036-0006 | Visual phase findings             | Browser QA: should priority       | P2       |
| AC-0036-0007 | No-URL structured error           | Browser QA: error handling        | P1       |
| AC-0036-0008 | Actionable finding structure      | Browser QA: finding quality       | P1       |
| AC-0036-0009 | Smoke phase actual analysis       | Real findings from actual runner  | P0       |
| AC-0036-0010 | Visual phase actual analysis      | Real findings from actual runner  | P0       |
| AC-0036-0011 | Interaction phase actual analysis | Real findings from actual runner  | P1       |
| AC-0036-0012 | Accessibility phase actual analysis | Real findings from actual runner | P1       |
| AC-0036-0013 | No foundation-only comments       | Placeholder comments removed      | P0       |
| AC-0036-0014 | Honest empty findings per phase   | Empty only when truly clean       | P1       |
