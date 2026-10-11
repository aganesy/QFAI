---
name: verify-qfai-gate
owner: qfai-verify
purpose: "Run the QFAI validation of the run's scope and record what it finds."
requires: [common-gate-run]
roles: [orchestrator, devops-ci-engineer]
routing-profile: default
---

# verify-qfai-gate

The binding QFAI gate. Per-stage validate runs in the other skills are
signals; this one decides. It records failures and repairs none of them:
`verify-repo-gate` runs the fix loop over every failing gate.

## Reads

- The scope: `full` in a route, whose verify stage runs only the gates, and
  the scope `verify-context` declared when `qfai-verify` is invoked by name. The
  scopes and their profiles are the `## Scope` table of `verify-context`.
- `.qfai/report/validate.json`. Its keys are in
  `.qfai/assistant/skill/qfai-verify/references/validate-json-schema.md`.
- `.qfai/waivers.yml`, where the project has one.

## Writes

- `.qfai/report/validate.json` and the report output, through the commands.
- The `## QFAI gates` section of the evidence: each command, its exit code and
  its result.

## Procedure

1. Run the validation of the scope through `common-gate-run`:
   - `full`: the project's `Validate` entry, where it has one; otherwise
     `npx qfai validate --profile verify --fail-on error`, or the default
     `npx qfai validate --fail-on error`;
   - `prototyping`: `npx qfai validate --profile prototyping --fail-on error`.
2. Run `npx qfai report` when the repository uses it.
3. Report each result in the stage report.

## What this gate is

This gate is full-scan, in CI and everywhere else. A partial profile does not
satisfy it, and no waiver or environment makes it satisfy it. That is not a
ban on narrow profiles in CI: `qfai-discussion` and `implement-scaffold` each
use one as their own gate, those runs are legitimate under `CI=true`, and
`QFAI-VALIDATE-017` (`warning`) marks them as not full-scan rather than
blocking them. The prototyping profile is the prototyping stage's own gate:
CI runs its checks inside the full scan, and no CI lane runs the profile on
its own.

## A custom Validate entry

A project's `Validate` entry may wrap validation with project-specific checks.
It must run a full scan in the declared profile. Record the command's exit code
and the validation findings. A successful wrapper exit does not waive a
validation error: any validation error prevents a pass.

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

## Gate

The step is done when:

- validation ran in the profile the scope names, and its result is recorded;
- `error=0` for a pass, or the failing findings are recorded for the fix loop.
