---
name: verify-qfai-gate
owner: qfai-verify
purpose: "Run the QFAI validation of the run's scope and record what it finds."
requires: [common-gate-run, common-evidence-record, common-grilling-record]
roles:
  [orchestrator, devops-ci-engineer, qa-gatekeeper, completion-reviewer, implementation-reviewer]
routing-profile: runtime-heavy
---

# verify-qfai-gate

The binding QFAI gate. Per-stage validate runs in the other skills are
signals; this one decides. It records failures and repairs none of them:
`verify-repo-gate` runs the fix loop over every failing gate.

## Reads

- The scope in the Objective of `.qfai/evidence/verify-<run-id>.md`.
- `.qfai/report/validate.json`. Its keys are in
  `.qfai/assistant/skill/qfai-verify/references/validate-json-schema.md`.
- `.qfai/waivers.yml`, where the project has one.

## Writes

- `.qfai/report/validate.json` and the report output, through the commands.
- The `## QFAI gates` section of the evidence: each command, its exit code and
  its result.

## Procedure

1. Run the validation of the scope through `common-gate-run`:
   - `full`: `npx qfai validate --profile verify --fail-on error`, or the
     default `npx qfai validate --fail-on error`;
   - `prototyping`: `npx qfai validate --profile prototyping --fail-on error`.
2. Run `npx qfai report` when the repository uses it.
3. Run the static policy checks (below).
4. For a prototyping-scoped run, check the loop evidence (below).
5. Record each result as `common-evidence-record` says.

## What this gate is

This gate is full-scan, in CI and everywhere else. A partial profile does not
satisfy it, and no waiver or environment makes it satisfy it. That is not a
ban on narrow profiles in CI: `qfai-discussion` and `implement-scaffold` each
use one as their own gate, those runs are legitimate under `CI=true`, and
`QFAI-VALIDATE-017` (`warning`) marks them as not full-scan rather than
blocking them. The prototyping profile runs only locally, before `certify`: it
reads loop outputs that are never committed.

## Findings

Capture the exit code, the key errors and warnings, and the files they name.

`QFAI-STORY-006` through `QFAI-STORY-009` report the test obligations: a BF
needs an E2E test, an AC an integration or API test, and an EX a selected
non-E2E test. Record each uncovered ID and its flow. `QFAI-SCAN-002` means the
scan cannot prove coverage; a missing layer is never a passing scan.

## Waivers

- A waiver covers a `warning` or `info` finding only. A waiver that suppresses
  an `error` is a failure: fix the root cause.
- `QFAI-WAIVER-002` means an invalid waiver. Remove it and resolve the `error`
  it hid.
- A waiver's `rule:` is the finding's `issues[].code` in
  `.qfai/report/validate.json`, copied verbatim. The array is `issues`, not
  `findings`.

## Static policy checks

- `.qfai/assistant/rule/drift-protocol.md` exists.
- `.qfai/assistant/rule/test-layers.md` exists.
- Every `.qfai/assistant/skill/*/SKILL.md` includes `[DRIFT-PROTOCOL:MANDATORY]`.
- The reviewer agent cards include the drift-protocol and test-layer review
  viewpoints.

## Prototyping evidence

For a prototyping-scoped run:

- every declared screen has a screenshot, the HTML and a `review.json` under
  `.qfai/evidence/prototyping/iter-NN/`;
- the final iteration recorded in
  `.qfai/evidence/prototyping/prototyping.json#iterations[]` has its
  screenshot and HTML on disk.

The completion certificate is not an input here. `npx qfai prototyping certify`
runs after verify and reads its passing verdict. Checking the certificate's
digests is `certify --check`'s job, during handoff or after a brand asset edit.

## Gate

The step is done when:

- validation ran in the profile the scope names, and its result is recorded;
- `error=0` for a pass, or the failing findings are recorded for the fix loop;
- the static policy checks and, for a prototyping scope, the loop evidence
  are recorded.
