# US-0001-0074: Worker-Scoped Credential-Reuse Guidance

## User Story

As a QA engineer running acceptance tests in parallel, I want `/qfai-atdd` to carry backend-agnostic guidance on reusing one authenticated session per parallel worker (the seven session-reuse rules, the companion rule that a caller-injected environment identifier forbids the harness from provisioning or tearing that environment down, and the credential-class script-naming rule as adopter guidance), so that I can stop authenticating once per test without the guidance picking a browser backend for me, and without QFAI adding a validator, a finding code, a test layer or an annotation token to police it.
