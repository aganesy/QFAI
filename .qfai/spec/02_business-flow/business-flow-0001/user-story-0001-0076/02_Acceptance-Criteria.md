# Acceptance Criteria

## Criteria

```gherkin
Feature: Worker-Scoped Credential-Reuse Guidance

# AC-0001-0076-01
# Parent: US-0001-0076
Scenario: Seven Credential-Reuse Rules and the Companion Rule Are Stated
  Given the `/qfai-atdd` credential-reuse guidance artifact
  When it is read
  Then it states all seven rules as distinct statements — never sign in per test; never share one account across parallel workers; key the cached session by the pair of worker index and actor; tear the cache down at worker exit; re-authenticate and rewrite the cache when a restored session is rejected; a test that mutates its own account creates a dedicated one; test-level parallelism costs more workers, not more sign-ins — and it states the companion rule that an environment identifier injected by the caller forbids the harness from provisioning or tearing down that environment; and the skill entry point cross-links the artifact.

# AC-0001-0076-02
# Parent: US-0001-0076
Scenario: Guidance Is Backend-Agnostic and Grows No Vocabulary
  Given the credential-reuse guidance artifact
  When it is scanned
  Then it names no browser backend, contains no install command and no version pin, and presents any worked example as one illustration among possible backends; and it introduces no validator, no finding code, no new test layer and no new annotation token, so the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline.

# AC-0001-0076-03
# Parent: US-0001-0076
Scenario: Script-Naming Rule Is Adopter Guidance, Scoped to ATDD Layers
  Given the credential-reuse guidance artifact
  When its scope statement is read
  Then the credential-class script-naming rule — a credential-free lane and a credentialed lane MUST be reachable by different script names — appears as adopter guidance only, the artifact states that QFAI keeps its own script names and that QFAI's own suite has zero credentials so none of this is dogfooded here, and the guidance obliges the E2E / API / Integration layers only, introducing no unit or component obligation (RJ-0008-0001).
```
