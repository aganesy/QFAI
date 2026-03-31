# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0023-0001
Scenario: UI-bearing pack detected when HTML+CSS mock present
  Given a discussion pack contains an HTML mock with a <style> tag in 03_Story-Workshop.md
  When the UI-bearing detection logic executes
  Then the pack is classified as UI-bearing
  And DDS-related validators are activated for this pack
```

```gherkin
# AC-0023-0002
Scenario: Non-UI pack bypasses DDS checks
  Given a discussion pack contains no HTML mock, no CSS, and no Mermaid screen flow
  When the UI-bearing detection logic executes
  Then the pack is classified as non-UI
  And no DDS-related validators are activated
  And zero new validation issues are produced
```

```gherkin
# AC-0023-0003
Scenario: Pack with Mermaid screen flow but no HTML mock is detected as UI-bearing
  Given a discussion pack contains a Mermaid screen flow diagram but no HTML mock
  When the UI-bearing detection logic executes
  Then the pack is classified as UI-bearing
  And DDS-related validators are activated for this pack
```

```gherkin
# AC-0023-0004
Scenario: UI-bearing pack with DDS section passes QFAI-DDP-019
  Given a UI-bearing pack contains a Design Direction Summary section in 03_Story-Workshop.md
  When QFAI-DDP-019 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0005
Scenario: UI-bearing pack without DDS section fails with error
  Given a UI-bearing pack does not contain a Design Direction Summary section
  When QFAI-DDP-019 validator executes
  Then an error is emitted with severity "error"
  And the error message includes the field name, reason, and remediation guidance
```

```gherkin
# AC-0023-0006
Scenario: Pack with >=2 design options passes QFAI-DDP-020
  Given a UI-bearing pack DDS contains 2 or more design option entries
  When QFAI-DDP-020 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0007
Scenario: Pack with <2 design options fails with error
  Given a UI-bearing pack DDS contains fewer than 2 design option entries
  When QFAI-DDP-020 validator executes
  Then an error is emitted with severity "error"
  And the error message states the minimum required count and the actual count
```

```gherkin
# AC-0023-0008
Scenario: Anchor screen explicitly selected passes QFAI-DDP-021
  Given a UI-bearing pack DDS contains an anchor screen selection referencing one of the compared options
  When QFAI-DDP-021 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0009
Scenario: No anchor screen selection fails with error
  Given a UI-bearing pack DDS does not contain an anchor screen selection
  When QFAI-DDP-021 validator executes
  Then an error is emitted with severity "error"
  And the error message identifies the missing field and how to fix it
```

```gherkin
# AC-0023-0010
Scenario: Competitive reference with all 3 fields passes QFAI-DDP-022
  Given a UI-bearing pack competitive reference entry has adopted_points, rejected_points, and local_translation populated
  When QFAI-DDP-022 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0011
Scenario: Competitive reference missing a field fails with error
  Given a UI-bearing pack competitive reference entry is missing the rejected_points field
  When QFAI-DDP-022 validator executes
  Then an error is emitted with severity "error"
  And the error message identifies "rejected_points" as the missing field
```

```gherkin
# AC-0023-0012
Scenario: Competitive reference with placeholder value fails with error
  Given a UI-bearing pack competitive reference entry has local_translation set to "TBD"
  When QFAI-DDP-022 validator executes
  Then an error is emitted with severity "error"
  And the error message states that placeholder values are not accepted
```

```gherkin
# AC-0023-0013
Scenario: Design Direction Decisions section present in 14_Review-Request.md
  Given a UI-bearing pack review request is generated
  When 14_Review-Request.md is inspected
  Then a "Design Direction Decisions" section is present
  And the section includes the selected anchor screen, rejected options, and adopted competitive references
```

```gherkin
# AC-0023-0014
Scenario: Review-Request includes anchor, rejections, adopted refs
  Given a UI-bearing pack has completed DDS with anchor screen and competitive references
  When 14_Review-Request.md Design Direction Decisions section is populated
  Then the anchor screen reference is present
  And at least one rejection rationale is present
  And at least one adopted competitive reference is listed
```

```gherkin
# AC-0023-0015
Scenario: Rejected Visual Directions section present in 99_delta.md
  Given a UI-bearing pack has rejected one or more visual directions
  When 99_delta.md is inspected
  Then a "Rejected Visual Directions" section is present
```

```gherkin
# AC-0023-0016
Scenario: Each rejection includes rationale and recurrence prevention
  Given a rejected visual direction is recorded in 99_delta.md
  When the rejection entry is inspected
  Then a rationale for rejection is present
  And a recurrence prevention note is present
```

```gherkin
# AC-0023-0017
Scenario: SKILL.md includes UI-bearing authoring requirements
  Given SKILL.md is updated for v1.7.0
  When the UI-bearing authoring section is inspected
  Then DDS requirements are documented
  And the 7 new validators (QFAI-DDP-019..025) are listed with their pass criteria
```

```gherkin
# AC-0023-0018
Scenario: Template files updated in assets/init/
  Given the discussion templates in assets/init/ are updated for v1.7.0
  When a new discussion pack is initialized
  Then the template includes a DDS section placeholder
  And the template includes competitive reference fields
```

```gherkin
# AC-0023-0019
Scenario: All new validators emit error severity
  Given any of the 7 new validators (QFAI-DDP-019..025) detects a violation
  When the validator emits a diagnostic
  Then the severity is "error", not "warning"
```

```gherkin
# AC-0023-0020
Scenario: Non-UI packs produce zero new validation issues
  Given an existing non-UI discussion pack from v1.6.5
  When qfai validate is executed with v1.7.0 validators
  Then zero new validation issues are produced compared to v1.6.5
```

```gherkin
# AC-0023-0021
Scenario: CTA hierarchy validation passes when primary CTA defined
  Given a UI-bearing pack DDS defines a CTA hierarchy with a primary CTA
  When QFAI-DDP-023 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0022
Scenario: State coverage validation passes when 4 states defined
  Given a UI-bearing pack DDS defines empty, loading, error, and populated states
  When QFAI-DDP-024 validator executes
  Then validation passes with no errors
```

```gherkin
# AC-0023-0023
Scenario: Design anti-goals validation passes when >=1 anti-goal defined
  Given a UI-bearing pack DDS defines at least 1 design anti-goal
  When QFAI-DDP-025 validator executes
  Then validation passes with no errors
```

---

### US-0023-0009: Explicit surface classification as primary SSOT

```gherkin
# AC-0023-0024
Scenario: Explicit non-ui surface classification bypasses content-signal detection
  Given a discussion pack has explicit surface classification: non-ui in its metadata
  When the UI-bearing detection logic executes
  Then the pack is classified as non-ui without consulting content signals
  And DDS-related validators are not activated
```

```gherkin
# AC-0023-0025
Scenario: Ambiguous content signals with no explicit classification yield unknown with warning
  Given a discussion pack has no explicit surface classification
  And content signals are ambiguous (partial HTML with no screen structure)
  When the UI-bearing detection logic executes
  Then detection returns unknown
  And a warning is emitted indicating ambiguous classification and suggesting explicit surface declaration
```

```gherkin
# AC-0023-0026
Scenario: Explicit classification overrides conflicting content signals
  Given a discussion pack has explicit surface classification: non-ui
  And content signals suggest UI presence (e.g., HTML style tags present)
  When the UI-bearing detection logic executes
  Then the pack is classified as non-ui based on explicit classification
  And no DDS-related validators are activated
```

```gherkin
# AC-0023-0027
Scenario: Only maintainers can override explicit surface classification
  Given a discussion pack has explicit surface classification set by a non-maintainer
  When a non-maintainer attempts to override the classification
  Then the override is rejected with an authorization error
  And the original explicit classification is preserved
```

```gherkin
# AC-0023-0028
Scenario: Reclassification from ui to non-ui takes effect immediately
  Given a project was previously classified as ui
  When an authorized maintainer reclassifies the project as non-ui
  Then the next validation run uses non-ui classification immediately
  And DDS validators are no longer activated for this project
```

```gherkin
# AC-0023-0029
Scenario: Running detection twice on same project state yields identical classification
  Given a discussion pack with explicit surface classification: ui
  When the UI-bearing detection logic executes twice consecutively on the same unchanged pack
  Then both executions return identical classification results
```

---

### US-0023-0010: Discussion skill teaches 3-layer model, not 4-axis [v1.7.11 WS-A]

```gherkin
# AC-0023-0030
Scenario: SKILL.md completion conditions reference 3-layer model
  Given the qfai-discussion SKILL.md is inspected
  When the completion conditions section is reviewed
  Then all completion conditions reference the canonical 3-layer model
  And no 4-axis terminology appears in completion conditions
```

```gherkin
# AC-0023-0031
Scenario: 4-axis references removed from SKILL.md completion conditions
  Given the qfai-discussion SKILL.md is inspected
  When a text search for 4-axis keywords is performed in completion conditions
  Then zero matches are found for legacy 4-axis terms (e.g., "4-axis", "four-axis", "axis-1", "axis-2", "axis-3", "axis-4")
```

```gherkin
# AC-0023-0032
Scenario: Non-ui path exempt from UI-bearing completion conditions
  Given the qfai-discussion SKILL.md is inspected
  When the completion conditions for non-ui path are reviewed
  Then non-ui path does not require UI-bearing completion conditions (3-layer model conditions)
  And the exemption is explicitly documented
```

## AC Catalog (optional)

| AC_ID        | Title                                                 | Notes             | Priority |
| ------------ | ----------------------------------------------------- | ----------------- | -------- |
| AC-0023-0001 | UI-bearing detected (HTML+CSS)                        | REQ-0001          | P1       |
| AC-0023-0002 | Non-UI pack bypasses DDS                              | REQ-0014          | P1       |
| AC-0023-0003 | Mermaid screen flow triggers UI-bearing               | REQ-0001          | P1       |
| AC-0023-0004 | DDS present passes DDP-019                            | REQ-0002          | P1       |
| AC-0023-0005 | DDS absent fails DDP-019                              | REQ-0002          | P1       |
| AC-0023-0006 | >=2 options passes DDP-020                            | REQ-0003          | P1       |
| AC-0023-0007 | <2 options fails DDP-020                              | REQ-0003          | P1       |
| AC-0023-0008 | Anchor screen present passes DDP-021                  | REQ-0004          | P1       |
| AC-0023-0009 | Anchor screen absent fails DDP-021                    | REQ-0004          | P1       |
| AC-0023-0010 | Competitive ref 3 fields passes DDP-022               | REQ-0005          | P1       |
| AC-0023-0011 | Competitive ref missing field fails DDP-022           | REQ-0005          | P1       |
| AC-0023-0012 | Competitive ref placeholder fails DDP-022             | REQ-0005          | P1       |
| AC-0023-0013 | Review-Request has design direction section           | REQ-0010          | P1       |
| AC-0023-0014 | Review-Request includes anchor+rejections+refs        | REQ-0010          | P1       |
| AC-0023-0015 | Delta has rejected visual directions section          | REQ-0011          | P1       |
| AC-0023-0016 | Rejection includes rationale+prevention               | REQ-0011          | P1       |
| AC-0023-0017 | SKILL.md has UI-bearing requirements                  | REQ-0012          | P1       |
| AC-0023-0018 | Templates updated in assets/init/                     | REQ-0013          | P1       |
| AC-0023-0019 | All new validators emit error severity                | REQ-0009          | P1       |
| AC-0023-0020 | Non-UI packs zero new issues                          | REQ-0014          | P1       |
| AC-0023-0021 | CTA hierarchy passes DDP-023                          | REQ-0006          | P1       |
| AC-0023-0022 | State coverage passes DDP-024                         | REQ-0007          | P1       |
| AC-0023-0023 | Design anti-goals passes DDP-025                      | REQ-0008          | P1       |
| AC-0023-0024 | Explicit non-ui bypasses content-signal check         | REQ-0007-REM      | P1       |
| AC-0023-0025 | Ambiguous signals with no explicit → unknown+warn     | REQ-0007-REM      | P1       |
| AC-0023-0026 | Explicit classification wins over conflicting signals | REQ-0007-REM      | P1       |
| AC-0023-0027 | Only maintainers can override explicit classification | REQ-0007-REM      | P1       |
| AC-0023-0028 | Reclassification takes effect immediately             | REQ-0007-REM      | P1       |
| AC-0023-0029 | Detection idempotent on same project state            | REQ-0007-REM      | P1       |
| AC-0023-0030 | SKILL.md completion conditions use 3-layer model      | REQ-0001,REQ-0002 | P1       |
| AC-0023-0031 | 4-axis references removed from completion conditions  | REQ-0001          | P1       |
| AC-0023-0032 | Non-ui path exempt from UI-bearing conditions         | REQ-0003          | P1       |
