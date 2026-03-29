# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0024-0001
Scenario: Render evidence capture can be enabled from CLI
  Given a user runs qfai prototyping with --autogen-ui-fidelity and --render-evidence
  When the prototyping command executes
  Then render evidence capture is enabled
  And the command accepts --viewports, --render-out, and --base-url
  And CLI flags override config values
```

```gherkin
# AC-0024-0002
Scenario: Render bundle entries are normalized into renders[]
  Given uiFidelity.screens contains a route with captured render evidence
  When the validator normalizes the evidence
  Then each render entry contains viewport, status, width, and height
  And captured entries require imagePath and htmlPath
  And skipped entries require skippedReason
  And failed entries require error
```

```gherkin
# AC-0024-0003
Scenario: Render evidence is saved path-only
  Given a render capture succeeds
  When the evidence bundle is written
  Then the JSON stores file paths and metadata only
  And the JSON does not inline image bytes or HTML bodies
```

```gherkin
# AC-0024-0004
Scenario: Missing renderer does not hard fail the command
  Given Playwright is not installed
  When qfai prototyping runs with render evidence enabled
  Then the command continues when failOpen is true
  And the render entry is recorded as skipped
  And the skipped reason explains why capture was unavailable
```

```gherkin
# AC-0024-0005
Scenario: Partial render failure is preserved at render level
  Given one viewport capture succeeds and another fails
  When the render helper returns evidence
  Then the successful viewport remains captured
  And the failed viewport is recorded separately
  And the screen is not discarded entirely
```

```gherkin
# AC-0024-0006
Scenario: Render evidence validation detects captured file absence
  Given a captured render entry points to a missing screenshot or HTML file
  When prototypingEvidence validation runs
  Then an error is emitted
  And the error includes route, viewport, missing artifact, and fix guidance
```

```gherkin
# AC-0024-0007
Scenario: qualityProfile controls render evidence severity
  Given a render bundle with missing optional viewports
  When validation runs under default, high, and strict profiles
  Then default may warn for missing render coverage
  And high may error for missing required desktop or mobile coverage
  And strict may error for all skipped or incomplete coverage
```

```gherkin
# AC-0024-0008
Scenario: Legacy critique workflow remains usable
  Given a pack contains markdown critique but no render evidence
  When renderCritique and designFidelity validation run
  Then the legacy pack still validates
  And no new blocking issue is raised solely for lacking render evidence
```

```gherkin
# AC-0024-0009
Scenario: Render evidence can be used as the primary viewport source
  Given a pack contains both markdown critique and render evidence
  When renderCritique validation runs
  Then renders[] is treated as the primary source for viewport existence
  And markdown critique remains a backward-compatible supplemental input
```

```gherkin
# AC-0024-0010
Scenario: Report guidance explains skipped and missing evidence
  Given a pack contains skipped or missing render evidence
  When report generation runs
  Then the report names what is missing
  And the report explains why it matters
  And the report points to the next action to recover
```

```gherkin
# AC-0024-0011
Scenario: Documentation explains render evidence bundle conventions
  Given the init evidence README and example docs are updated
  When a user reads the generated documentation
  Then the render evidence bundle format and path convention are explained
  And degraded mode behavior is documented
```

```gherkin
# AC-0024-0012
Scenario: v1.7.1 scope excludes browser QA and visual diff
  Given a proposed change adds browser QA, visual diff, or repair loop behavior
  When the scope is reviewed
  Then the change is marked out of scope for spec-0024
  And the change is deferred to a later release
```

```gherkin
# AC-0024-0013
Scenario: CLI outputs real render evidence on successful prototyping run
  Given qfai prototyping completes with render evidence enabled
  When the CLI outputs results
  Then the output contains real render evidence including screenshot hash, timestamp, and file path
  And the output does not contain placeholder or stub values
```

```gherkin
# AC-0024-0014
Scenario: CLI outputs explicit error when render target is unreachable
  Given qfai prototyping runs with render evidence enabled
  And the render target is unreachable
  When the CLI outputs results
  Then the output contains an explicit "no evidence captured" error message
  And no stub or placeholder evidence is emitted
```

```gherkin
# AC-0024-0015
Scenario: Zero-byte render output is flagged as empty evidence with warning
  Given a render completes but the output file is 0 bytes
  When evidence is processed
  Then the evidence entry is flagged as empty
  And a warning is recorded in the CLI output
  And the evidence is not silently accepted as valid
```

```gherkin
# AC-0024-0016
Scenario: Non-UI surface omits render evidence section entirely
  Given a prototyping run targets a non-UI surface
  When the CLI outputs results
  Then the render evidence section is absent from the output
  And no placeholder is shown in its place
```

```gherkin
# AC-0024-0017
Scenario: Evidence transitions atomically from pending to captured
  Given evidence capture begins for a route
  When the capture completes successfully
  Then the evidence status transitions from pending to captured atomically
  And no intermediate placeholder state persists in the output bundle
```

```gherkin
# AC-0024-0018
Scenario: Identical source produces identical evidence content hash
  Given prototyping has been run once on unchanged source
  When prototyping is run again on the same unchanged source
  Then the render evidence content hash is identical across both runs
```
