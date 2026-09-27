# Acceptance Criteria

## Criteria

```gherkin
Feature: New Reviewer-Gate finding-code catalog

# AC-0001-0178-01
# Parent: US-0001-0178
Scenario: New Reviewer-Gate finding-code catalog enforced with mandatory justification
  Given the Reviewer Gate,
  When it evaluates a PR,
  Then the eight catalog codes `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`, `R-DESIGN-MD-PATCH-OUT-OF-ZONE`, `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`, `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT` MUST be available in the catalog, each carrying a mandatory non-empty `justification:` (per the prior-pack OQ-0109 Option A / TC-71 advisory-failing posture). The catalog governs membership only and declares no per-code severity column: each code's own severity belongs to the detector that emits it (e.g. `R-DESIGN-MD-PATCH-OUT-OF-ZONE` is emitted at warning by `designMdPatchZone.ts` per REQ-0151). A finding emitted with empty / whitespace-only `justification:` MUST be rejected by `qfai validate` ingestion (advisory-failing) at severity error for every one of the eight codes without exception, because what that rejection reports is the missing justification, not the underlying finding. The Reviewer subagent prompt / tool-augmentation timing for these codes inherits the OQ-0119 carry-forward deferral and is NOT resolved here.
```
