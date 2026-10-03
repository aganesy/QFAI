---
name: atdd-credentials
owner: qfai-atdd
purpose: "Set up per-worker sign-in reuse for acceptance tests that need an authenticated actor."
requires: [common-evidence-record]
roles: [acceptance-test-engineer, devops-ci-engineer]
routing-profile: default
---

# atdd-credentials

Runs between `atdd-scaffold` and `atdd-author`, only when an E2E, API or
integration test in scope needs an authenticated actor.

## Reads

- The obligations and test paths `atdd-scaffold` recorded in
  `.qfai/evidence/atdd-BF-NNNN.md`, and which of them need which actor.
- The project's test runner configuration: where per-worker setup and teardown
  live.
- Any environment identifier the caller injects.

## Writes

- The per-worker setup and teardown that sign each actor in once and share the
  session with that worker's tests.
- A note in `.qfai/evidence/atdd-BF-NNNN.md` naming where that setup lives and
  which actors it serves.

## Procedure

Follow `.qfai/assistant/skill/qfai-atdd/references/credential-reuse.md`.
It holds the seven session-reuse rules, the rule for a caller-injected
environment and a worked example. Keep actors and sessions isolated by worker.

## Passes when

Read first: the obligations `atdd-scaffold` recorded, and which actor each test
needs. The step passes when no test in scope needs an authenticated actor, or
when every actor one needs is already served by per-worker setup that follows
the reference. The pass names the tests and the setup it read.

## Review

The completion reviewer checks the setup against each rule of that reference,
one by one. Sign-in in a test body, one account shared across workers, and a
cache that outlives its worker are each `REVISE`.

## Gate

PASS when every actor a test in scope needs is served by the per-worker setup,
the setup follows the reference, and the reviewer passed the current revision.
