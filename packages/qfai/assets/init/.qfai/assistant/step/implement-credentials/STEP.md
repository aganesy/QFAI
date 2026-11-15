---
name: implement-credentials
owner: qfai-implement
purpose: "Set up per-worker sign-in reuse for acceptance tests that need an authenticated actor."
requires: []
---

# implement-credentials

Runs before `implement-acceptance`, only when an E2E, API or integration test
in scope needs an authenticated actor. The per-role navigation journey
`implement-scaffold` adds is such a test: it needs one actor per role.

## Reads

- The acceptance tests of the flow, and which actor each one needs.
- The per-role navigation journey's file and the roles `implement-scaffold`
  recorded for it, when it added or kept one.
- The project's test runner configuration: where per-worker setup and teardown
  live.
- Any environment identifier the caller injects.

## Writes

- The per-worker setup and teardown that sign each actor in once and share the
  session with that worker's tests.

## Procedure

Follow `.qfai/assistant/skill/qfai-implement/references/credential-reuse.md`.
It holds the seven session-reuse rules, the rule for a caller-injected
environment and a worked example. Keep actors and sessions isolated by worker.
Serve the navigation journey one signed-in session per role it records, so
each role's test starts signed in as that role.
For a Playwright or Vitest suite, the optional recipes in
`.qfai/assistant/skill/qfai-implement/references/test-runner-recipes.md` put
the rules into code, with the business data, shared-state, credential
directory and CI aggregate patterns around them.

## Passes when

Read first: the acceptance tests in scope, the navigation journey's file, and
which actor each one needs. The step passes when no test in scope needs an
authenticated actor, or when every actor one needs, each role of the
navigation journey included, is already served by per-worker setup that
follows the reference. The pass names the tests, the navigation journey's
file and the setup it read.

## Gate

PASS when every actor a test in scope needs, each role of the navigation
journey included, is served by the per-worker setup, and the setup follows
each rule of the reference: no sign-in in a test body, no account shared
across workers, and no cache that outlives its worker.
