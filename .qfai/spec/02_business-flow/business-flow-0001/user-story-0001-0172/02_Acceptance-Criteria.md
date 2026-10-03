# Acceptance Criteria

## Criteria

```gherkin
Feature: New Reviewer-Gate finding-code catalog
  # AC-0001-0172-01
  Scenario: New Reviewer-Gate finding-code catalog enforced with mandatory justification
    Given the Reviewer Gate,
    When it evaluates a PR,
    Then the seven catalog codes `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT` MUST be available in the catalog, each carrying a mandatory non-empty `justification:`. The catalog governs membership only and declares no per-code severity column: each code's own severity belongs to the detector that emits it. A finding emitted with empty / whitespace-only `justification:` MUST be rejected by `qfai validate` ingestion (advisory-failing) at severity error for every one of the seven codes without exception, because what that rejection reports is the missing justification, not the underlying finding.
```
