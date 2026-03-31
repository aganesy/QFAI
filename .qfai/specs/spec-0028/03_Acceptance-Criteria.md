# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0028-0001
Scenario: Default prototyping completes without runtime-heavy checks
  Given a project with no browser backend registered
  When the user runs /qfai-prototyping in default mode
  Then only static-first obligations are evaluated
  And no runtime-heavy check blocks completion
```

```gherkin
# AC-0028-0002
Scenario: Runtime-heavy checks excluded from default hard gate
  Given the default mode obligation set
  When the obligation list is inspected
  Then API non-404, DB existence, and UI route reachability are absent
  And these checks are available only as opt-in or upper-phase obligations
```

```gherkin
# AC-0028-0003
Scenario: Prototyping DONE conditions use static-first foundation
  Given a project completes /qfai-prototyping in default mode
  When DONE conditions are evaluated
  Then conditions are based on source, route, state, and contract-level obligations
  And runtime-heavy conditions are not required for DONE
```

```gherkin
# AC-0028-0004
Scenario: Render evidence captures screenshot, viewport, and DOM ref when enabled
  Given render evidence capability is enabled
  When evidence capture runs
  Then the evidence record contains screenshot, viewport metadata, and DOM/HTML snapshot reference
  And each element has an individual capture status
```

```gherkin
# AC-0028-0005
Scenario: Render evidence capture status distinguishes captured/skipped/failed
  Given render evidence capture completes
  When the capture status is inspected
  Then each evidence element status is one of captured, skipped, or failed
  And no other status values are used
```

```gherkin
# AC-0028-0006
Scenario: Render evidence skipped when capability not registered
  Given render evidence capability is not registered
  When /qfai-prototyping runs in default mode
  Then render evidence elements have status skipped
  And no blocking error is raised
```

```gherkin
# AC-0028-0007
Scenario: Backend registered through provider abstraction
  Given a browser backend implementation (e.g., Playwright adapter)
  When registered through the provider abstraction interface
  Then the backend is available for browser QA and evidence capture
  And no hard-coded backend reference exists in core code
```

```gherkin
# AC-0028-0008
Scenario: Backend capability declaration supports fail-open semantics
  Given a backend capability is declared but not installed
  When capability resolution runs
  Then the capability status is skipped or fail-open
  And prototyping continues without blocking
```

```gherkin
# AC-0028-0009
Scenario: Browser QA phases execute independently
  Given a registered browser backend
  When browser QA runs
  Then smoke, interaction, visual, and accessibility phases execute independently
  And failure or skip in one phase does not block other phases
```

```gherkin
# AC-0028-0010
Scenario: Browser QA returns structured findings with repair suggestions
  Given browser QA completes a phase (e.g., smoke)
  When the output is inspected
  Then each finding includes phase, severity, description, and repair suggestion
  And the output is machine-parseable structured data
```

```gherkin
# AC-0028-0011
Scenario: Mode-specific expectations are explicit per mode
  Given the mode configuration for standard, low-cost, and full-harness
  When mode expectations are inspected
  Then each mode explicitly declares its obligation set
  And obligations from different modes do not bleed into each other
```

```gherkin
# AC-0028-0012
Scenario: Non-web project passes without browser dependency
  Given a non-web project with no browser backend and no evidence capability
  When /qfai-prototyping runs
  Then zero browser-related or evidence-related errors are emitted
  And no new universal dependencies are required
```

```gherkin
# AC-0028-0013
Scenario: Non-web project does not require external tool install
  Given a non-web project
  When the project dependencies are inspected
  Then no browser runtime (Playwright, Puppeteer, etc.) is listed as required
  And the project can complete prototyping on a minimal environment
```

```gherkin
# AC-0028-0014
Scenario: Partial evidence capture with mixed status
  Given render evidence capability is enabled
  And screenshot capture succeeds but DOM snapshot capture fails
  When the evidence record is inspected
  Then screenshot status is captured
  And DOM snapshot status is failed
  And the overall record is not rejected due to partial failure
```

```gherkin
# AC-0028-0015
Scenario: Docs and report explain static/runtime boundary
  Given the updated docs and report output
  When a reviewer reads them
  Then the static-first default vs runtime opt-in boundary is clearly explained
  And optional capability semantics (captured/skipped/failed) are documented
```

```gherkin
# AC-0028-0016
Scenario: Browser QA runner returns structured findings with severity, location, description
  Given the browser QA runner executes a scan in full-harness mode
  When the scan completes
  Then each finding in the results array contains severity, location, and description fields
  And the results array is never null or undefined
```

```gherkin
# AC-0028-0017
Scenario: Browser QA runner returns structured error on browser launch failure
  Given the browser QA runner cannot launch the browser
  When the runner attempts execution
  Then the runner returns a structured error object
  And the error object contains a reason field and is not an empty array
```

```gherkin
# AC-0028-0018
Scenario: Browser QA runner returns clean status metadata when no issues found
  Given the browser QA runner executes a scan and finds no issues
  When the scan completes
  Then the findings array is empty
  And the result metadata includes "status": "clean"
```

```gherkin
# AC-0028-0019
Scenario: Browser QA runner returns "not available" for standard mode
  Given the CLI is invoked in standard mode
  When browser QA is requested
  Then the runner returns a "not available" message
  And no browser is launched
  And no error is thrown
```

```gherkin
# AC-0028-0020
Scenario: Browser QA runner logs state transitions
  Given the browser QA runner starts execution in full-harness mode
  When the runner transitions through initializing, scanning, and complete states
  Then each state transition is logged with the state name
  And log entries appear in chronological order
```

```gherkin
# AC-0028-0021
Scenario: Browser QA runner returns identical findings for idempotent scans
  Given the same page is scanned twice in succession with the same configuration
  When both scans complete
  Then both findings arrays are identical in content
  And no additional findings are produced on the second run
```

```gherkin
# AC-0028-0022
Scenario: Render evidence uses real captured/skipped/failed status model
  Given render evidence capture completes in any mode
  When the evidence bundle is inspected
  Then every evidence element status is one of captured, skipped, or failed
  And the "requested" status value is absent from all evidence entries
  And "captured" entries contain actual execution evidence (hash, timestamp, path)
```

```gherkin
# AC-0028-0023
Scenario: Browser QA uses actual phase runners for all 4 phases
  Given browser QA executes in full-harness mode with a registered backend
  When all 4 phases (smoke, visual, interaction, accessibility) run
  Then each phase uses an actual runner producing real analysis findings
  And no phase returns stub or placeholder results
  And findings from each phase contain severity, location, and description
```

```gherkin
# AC-0028-0024
Scenario: Mode-specific evidence expectations are enforced
  Given mode configuration defines evidence expectations per mode
  When evidence is validated in a given mode
  Then the mode's specific evidence rules are applied
  And evidence expectations from other modes do not bleed in
  And full-harness mode requires actual phase runner results
```

```gherkin
# AC-0028-0025
Scenario: Empty findings require honest clean metadata
  Given browser QA completes a phase scan and finds no issues
  When the findings result is inspected
  Then the findings array is empty
  And the result metadata includes "status": "clean"
  And an empty findings array without clean metadata is rejected as dishonest
```

```gherkin
# AC-0028-0026
Scenario: Foundation-only comments are removed from runtime code
  Given the runtime codebase for render evidence and browser QA
  When the source is inspected
  Then no "foundation-only" or "not implemented in this slice" comments remain
  And all code paths execute actual logic
```

## AC Catalog (optional)

| AC-ID        | Title                                | Notes                                        | Priority |
| ------------ | ------------------------------------ | -------------------------------------------- | -------- |
| AC-0028-0001 | Default static-first completion      | No runtime-heavy blocking                    | P1       |
| AC-0028-0002 | Runtime-heavy excluded from default  | API/DB/route checks opt-in only              | P1       |
| AC-0028-0003 | Static-first DONE conditions         | source/route/state/contract obligations      | P1       |
| AC-0028-0004 | Evidence capture elements            | screenshot/viewport/DOM ref                  | P1       |
| AC-0028-0005 | Capture status vocabulary            | captured/skipped/failed                      | P1       |
| AC-0028-0006 | Evidence skipped when absent         | Fail-open on missing capability              | P1       |
| AC-0028-0007 | Backend provider registration        | No hard-coded backend                        | P1       |
| AC-0028-0008 | Backend fail-open semantics          | Capability skipped if not installed          | P1       |
| AC-0028-0009 | Browser QA phase independence        | Phases do not block each other               | P1       |
| AC-0028-0010 | Structured findings output           | phase/severity/description/repair            | P1       |
| AC-0028-0011 | Mode-specific obligation isolation   | standard/low-cost/full-harness separation    | P1       |
| AC-0028-0012 | Non-web zero browser errors          | 0 browser-related errors                     | P1       |
| AC-0028-0013 | Non-web no external tool requirement | No browser runtime required                  | P1       |
| AC-0028-0014 | Partial evidence capture             | Mixed status per element                     | P1       |
| AC-0028-0015 | Documentation boundary clarity       | Static/runtime boundary documented           | P2       |
| AC-0028-0016 | Structured findings per scan         | severity/location/description fields         | P1       |
| AC-0028-0017 | Structured error on browser failure  | Not empty array on failure                   | P1       |
| AC-0028-0018 | Clean status metadata when 0 issues  | Empty findings + "status":"clean"            | P1       |
| AC-0028-0019 | Not available in standard mode       | Graceful "not available" message             | P1       |
| AC-0028-0020 | State transition logging             | initializing/scanning/complete logged        | P2       |
| AC-0028-0021 | Idempotent scan results              | Same page → identical findings               | P2       |
| AC-0028-0022 | Render evidence real status model    | captured/skipped/failed only; no "requested" | P1       |
| AC-0028-0023 | Browser QA actual phase execution    | All 4 phases use real runners                | P1       |
| AC-0028-0024 | Mode-specific evidence expectations  | Each mode enforces its own evidence rules    | P1       |
| AC-0028-0025 | Honest empty findings                | Empty findings only with clean metadata      | P1       |
| AC-0028-0026 | No foundation-only comments          | Foundation placeholders removed              | P1       |
