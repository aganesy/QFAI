# Acceptance Criteria

## Criteria

```gherkin
Feature: Worker-Scoped Credential-Reuse Guidance
  # AC-0001-0074-01
  Scenario: Seven Credential-Reuse Rules and the Companion Rule Are Stated
    Given the `/qfai-implement` credential-reuse guidance artifact
    When it is read
    Then it states all seven rules as distinct statements — never sign in per test; never share one account across parallel workers; key the cached session by the pair of worker index and actor; tear the cache down at worker exit; re-authenticate and rewrite the cache when a restored session is rejected; a test that mutates its own account creates a dedicated one; test-level parallelism costs more workers, not more sign-ins — and it states the companion rule that an environment identifier injected by the caller forbids the harness from provisioning or tearing down that environment; and the `implement-credentials` step cross-links the artifact.

  # AC-0001-0074-02
  Scenario: Guidance Is Backend-Agnostic and Grows No Vocabulary
    Given the credential-reuse guidance artifact
    When it is scanned
    Then it names no browser backend, contains no install command and no version pin, and presents any worked example as one illustration among possible backends; and it introduces no validator, no finding code, no new test layer and no new annotation token, so the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline.

  # AC-0001-0074-03
  Scenario: Script-Naming Rule Is Adopter Guidance, Scoped to ATDD Layers
    Given the credential-reuse guidance artifact
    When its scope statement is read
    Then the credential-class script-naming rule — a credential-free lane and a credentialed lane MUST be reachable by different script names — appears as adopter guidance only, the artifact states that QFAI keeps its own script names and that QFAI's own suite has zero credentials so none of this is dogfooded here, and the guidance obliges the E2E / API / Integration layers only, introducing no unit or component obligation (RJ-0008-0001).

  # AC-0001-0074-04
  Scenario: Optional Runner Recipes Ship Beside the Rule Set
    Given the `/qfai-implement` test runner recipes reference
    When an adopter with a Playwright or Vitest suite reads it
    Then it carries a Vitest session cache keyed by the run's private directory, the pool slot and the actor, a Playwright setup, fixture and teardown with one account and storage state per worker, the adapters the application supplies, owned business data, database hooks scoped to the groups that need them, shared and exclusive admission, credential directory hygiene, a CI aggregate job that fails on a failed, cancelled or unexpectedly skipped required lane, deterministic business time per clock profile, and an adoption checklist; it states that QFAI does not execute the recipes; the `implement-credentials` and `implement-acceptance` steps point to it; and the credential-reuse rule set itself still names no backend.
```
