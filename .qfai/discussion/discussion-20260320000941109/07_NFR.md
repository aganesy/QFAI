# 07 Non-Functional Requirements — QFAI v1.6.2 Development Toolkit Hardening

## Requirements

| NFR-ID   | Title                      | Description                                                                                                                | Measurable Target                                                    | Source        |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------- |
| NFR-0001 | Single PR Delivery         | All v1.6.2 changes MUST be delivered in exactly one pull request                                                           | PR count = 1                                                         | SRC-0002 §2.1 |
| NFR-0002 | No Half-migration State    | All docs, wrappers, and tests MUST reflect the same contract version at all times within the PR                            | Wrapper parity drift = 0                                             | SRC-0002 §2   |
| NFR-0003 | Backward Compatibility     | v1.6.2 MUST NOT break v1.6.0/v1.6.1 validator Phase 1-2 behavior; existing validation checks must continue to function    | All existing validator tests pass without modification               | SRC-0001 §3   |
| NFR-0004 | Scope Discipline           | The PR MUST NOT contain changes outside the orchestration/evidence/completion/parallel scope defined for v1.6.2            | 0 unrelated file changes in PR diff                                  | SRC-0001 §2.3 |
| NFR-0005 | Test Execution Time        | Additional assets test guardrails (required/forbidden phrase checks) MUST NOT increase test suite execution time by > 10%  | CI time delta < 10%                                                  | SRC-0001 §8   |

## Verification Approach

| NFR-ID   | How Verified                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-0001 | Release checklist confirms exactly one PR merged for v1.6.2; no split PRs or follow-up patches                                               |
| NFR-0002 | Required phrase guardrails (REQ-0009) verify all artifacts contain the same contract terms; forbidden phrase guardrails (REQ-0010) detect stale terms |
| NFR-0003 | Existing Phase 1 and Phase 2 test suites run on the v1.6.2 branch and pass with zero regressions                                             |
| NFR-0004 | PR diff reviewed against v1.6.2 scope definition; files outside orchestration/evidence/completion/parallel scope are flagged                  |
| NFR-0005 | CI pipeline time recorded before and after v1.6.2 changes; delta computed and verified < 10%                                                  |
