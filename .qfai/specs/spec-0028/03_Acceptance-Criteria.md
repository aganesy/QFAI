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

## AC Catalog (optional)

| AC-ID        | Title                                   | Notes                                      | Priority |
| ------------ | --------------------------------------- | ------------------------------------------ | -------- |
| AC-0028-0001 | Default static-first completion         | No runtime-heavy blocking                  | P1       |
| AC-0028-0002 | Runtime-heavy excluded from default     | API/DB/route checks opt-in only            | P1       |
| AC-0028-0003 | Static-first DONE conditions            | source/route/state/contract obligations    | P1       |
| AC-0028-0004 | Evidence capture elements               | screenshot/viewport/DOM ref                | P1       |
| AC-0028-0005 | Capture status vocabulary               | captured/skipped/failed                    | P1       |
| AC-0028-0006 | Evidence skipped when absent            | Fail-open on missing capability            | P1       |
| AC-0028-0007 | Backend provider registration           | No hard-coded backend                      | P1       |
| AC-0028-0008 | Backend fail-open semantics             | Capability skipped if not installed        | P1       |
| AC-0028-0009 | Browser QA phase independence           | Phases do not block each other             | P1       |
| AC-0028-0010 | Structured findings output              | phase/severity/description/repair          | P1       |
| AC-0028-0011 | Mode-specific obligation isolation      | standard/low-cost/full-harness separation  | P1       |
| AC-0028-0012 | Non-web zero browser errors             | 0 browser-related errors                   | P1       |
| AC-0028-0013 | Non-web no external tool requirement    | No browser runtime required                | P1       |
| AC-0028-0014 | Partial evidence capture                | Mixed status per element                   | P1       |
| AC-0028-0015 | Documentation boundary clarity          | Static/runtime boundary documented         | P2       |
