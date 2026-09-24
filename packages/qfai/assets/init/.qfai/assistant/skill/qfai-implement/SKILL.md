---
name: qfai-implement
title: QFAI Implement (TDD micro-cycle)
description: "Implement one business flow through example tests and a complete Red, Green, Refactor cycle."
argument-hint: "<BF-ID> [EX-ID...]"
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, Agent]
roles:
  - orchestrator
  - delivery-planner
  - test-design-analyst
  - qa-strategist
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - completion-reviewer
  - product-surface-reviewer
routing-profile: implementation-heavy
mode: approval-gated
---

## /qfai-implement — Implement a business flow

[DRIFT-PROTOCOL:MANDATORY]

Work within one `BF-NNNN` flow. Read its stories, acceptance criteria,
examples, and owning contracts from the configured `paths.specsDir` and
`paths.contractsDir`. The default spec tree is `.qfai/spec/`. Resolve
contract paths from configuration; do not assume a directory name. Read
`.agents/rules/minimal-implementation.md`, `rule/test-layers.md`, and the current
agent cards before assigning work. An EX is the unit of implementation review;
the BF is the unit of scoped completion.

Read open work-log entries with global or current-flow scope before authoring.
Cite consulted entry IDs in the completion report. Apply the write triggers and
handoff body in `rule/worklog-entry.schema.md`. An unscoped discovery is
recorded without stopping the current flow.

For UI work, read root `DESIGN.md` and the linked UI contracts under
`<paths.contractsDir>/ui/` before changing the surface. Review rendered HTML
or screenshots at desktop and mobile sizes against those inputs; source code
alone does not prove the user-visible result.

### Preflight

1. Follow `rule/shared-skill-operating-baseline.md` for steering, format,
   delegated review, and failure handling. Confirm the flow and its links are
   internally consistent. A changed upstream obligation follows
   `rule/drift-protocol.md` before dependent work resumes.
2. Read the **Standard commands** section of
   `<paths.contractsDir>/tech.md`. Obtain Test, Lint, Typecheck, and Build
   commands only from that section. If it is missing or stale, repair the
   project contract before using a substitute command.
3. Read the current `/qfai-atdd` handoff and
   `.qfai/evidence/atdd-BF-NNNN.md`. Confirm the BF E2E and AC integration
   or API tests and their observed results. A deliberate acceptance RED is
   handed to the matching implementation; it is not a passing test.
4. Check test roots, `validation.traceability.testFileGlobs`, and
   exclusions. An EX test must be collected by the runner and by validation.
   A test with only an annotation or placeholder is not behavioral proof.

Use a bounded grilling session at preflight for unresolved implementation
choices and when a contradiction or technical obstacle arises. Follow
`rule/constitution.md` and `.agents/rules/grilling.md`. A critical decision goes to
the user; accepted local decisions are recorded in the current evidence.
Do not reopen settled requirements as implementation preferences.

### Select the next example

Start each selection by running
`qfai validate --profile tdd --flow BF-NNNN`. Record the run start time.
Read its `validate.flow-<ids>.json` result even when the command exits
nonzero. The result is usable only when the file exists, `profile` is
`tdd`, and `generatedAt` is no earlier than this run start. If any check
fails, stop and report the command, exit result, and missing or stale field;
never infer that the flow has no remaining work.

Take the lowest EX ID among that result's **test-obligation EX findings**.
The validator owns the obligation predicate, including decision exceptions;
do not reconstruct it in this skill. A caller that names several EX IDs works
each named ID serially after confirming each is in the current flow and is
owed. Re-run validation before selecting the next unassigned EX. When there
is no such finding, proceed to the flow completion checkpoint. Report any
other finding with its owner; a clean EX selection alone is not a PASS.

See `references/cross-spec-ownership.md` for changes that touch another
flow and `references/parallelization-policy.md` for independently owned
slices. Work one EX at a time by default. Parallel work requires disjoint
writes, a passing technical gate, and the required user consent. Review the
integrated result after slices join.

### Red, Green, Refactor

For the selected EX, create or strengthen a test in a non-acceptance layer and
annotate it `QFAI:EX-NNNN-NNNN-NN`. Preserve the BF E2E and AC integration
or API coverage owned by `/qfai-atdd`. Put the test where the observable
behavior belongs. Use `references/walking-skeleton.md` and
`references/oracle-strength.md` to choose the smallest useful seam and a
falsifiable assertion.

1. **Red:** Run the smallest applicable Test command from `tech.md`.
   Observe the assertion fail for the intended behavior before changing
   production code. A load error, missing dependency, or broken fixture is
   not an admissible RED. Record command, selector, failure, test hash, and
   revision. Follow `references/red-admissibility.md` and
   `references/red-not-observable.md` when existing behavior prevents an
   ordinary RED.
2. **Green:** Write the minimum production code that makes this test pass.
   Do not generalize to an untested case. Run the same selector and record
   command, outcome, and revision. Failures outside the selected EX receive
   an owner and a repair path.
3. **Refactor:** Improve the tested code without changing its behavior.
   Re-run the selector and affected tests, then applicable Lint, Typecheck,
   and Build commands from `tech.md`. Record each command and result.
   A failing or unrun gate cannot be reported as PASS.

The qa-gatekeeper checks the observed RED and GREEN evidence. The
implementation-reviewer checks code and tests; the completion-reviewer checks
obligation, commands, and evidence independently. Route UI-affecting work to
the product-surface-reviewer under `references/ui-affecting.md`. Use
`references/relevant-test-suite.md` for affected suite selection and
`references/checkpoint-verification.md` for the flow checkpoint. A reviewer
REVISE follows `rule/review-convergence.md`; repair and re-review the current
revision. The author does not certify their own result.

### Evidence and review

Write `.qfai/evidence/implement-BF-NNNN.md`. Give each example its own
`### EX-NNNN-NNNN-NN` section with the obligation, test path and selector,
RED, GREEN, and Refactor commands and observed results, revisions, hashes,
reviewer verdicts, and open findings. Keep prior rounds as history; new work
gets a new round. Evidence without a command and result pair does not prove a
gate. Follow `references/evidence-revision.md` and
`references/round-evidence.md` for freshness and round fields.

A review pack identifies the BF, EX, evidence path, revision and requested
reviewers. Each required reviewer must pass the same final revision.
Seal the pack and record its path and seal in the EX evidence. Follow
`references/review-artifact-layout.md` and
`references/finding-classification.md`. A record correction follows
`rule/drift-protocol.md` and never changes a sealed pack.

### Reviewer Gate

The implementation reviewer and qa-gatekeeper check the selected EX, its
RED/GREEN evidence, code, and relevant rendered surface. The completion
reviewer checks the integrated BF and evidence. Enforce the Drift Protocol
and `rule/test-layers.md`; test volume and planning estimates are signals,
not gates. Record explicit PASS or REVISE for the current revision.

### Completion gate

Report the flow complete only when:

1. A fresh validate result has no test-obligation EX finding for this BF,
   and every other in-scope error is resolved or assigned to its governing
   stage with an explicit incomplete result.
2. Every implemented EX has an observed RED, GREEN and Refactor result,
   current evidence and the required independent PASS reviews.
3. The affected tests and the Test, Lint, Typecheck and Build commands from
   `tech.md` have been run on the integrated tree, or a command's documented
   applicability makes it unnecessary.
4. `qfai validate --profile tdd --fail-on error --flow BF-NNNN` succeeds
   on the final tree. Read its fresh JSON result using the same freshness
   checks as selection.

When no EX work remains at entry, still run the current flow checkpoint;
report "nothing to do" only after the scoped gate and applicable commands
have passed. Record unresolved risks and upstream findings without calling
them complete. Give the user the changed EX IDs, test paths, command results,
review verdicts, evidence path, and consulted work-log IDs.
`/qfai-verify` owns the repository-wide gate.

## Default Autopilot Policy

- auto-decide: implementation seam, test selector, and local refactor that
  preserve the active story and contract behavior.
- ask-user: approval-required operations, scope expansion, and critical
  product choices. Do not answer these in a no-question mode.
- hard-required:

The BF, EX, and contract sources come from the invocation and configured tree.
If they cannot be resolved, stop at preflight and report the missing source.

project_memory:

- Read open global and current-flow work-log entries before authoring.
- Apply kind-specific write triggers and cite consulted IDs on completion.
- Select EX work from a fresh flow-scoped validator result, one EX at a time.
- Keep BF E2E and AC integration or API obligations with `/qfai-atdd`.
