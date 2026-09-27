---
name: verify-repo-gate
owner: qfai-verify
purpose: "Run the repository's quality gates, repair failures until every gate in scope passes, and write the verify evidence and verdict."
requires: [common-gate-run, common-evidence-record, common-grilling-record]
roles:
  [orchestrator, devops-ci-engineer, qa-gatekeeper, completion-reviewer, implementation-reviewer]
routing-profile: runtime-heavy
---

# verify-repo-gate

The repository gates, the fix loop over every failing gate, and the two
outputs: the evidence a person reads and the verdict downstream gates read.

## Reads

- The scope and the QFAI gate results in `.qfai/evidence/verify-<run-id>.md`.
- The gate commands, through `common-gate-run`.
- `.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`,
  before writing the verdict.
- `.qfai/assistant/rule/change-classification.md`.

## Writes

Create and update: `.qfai/evidence/verify-<run-id>.md`, and
`.qfai/report/verify.json`.

## Procedure

1. Run the repository gates (below).
2. Run the fix loop until every gate in scope passes, or stop as it says.
3. Complete the evidence and the summary.
4. Write the verdict.

## Repository gates

Run them through `common-gate-run`, in this order:

1. format check
2. lint
3. typecheck
4. unit and component tests
5. integration and API tests
6. E2E tests
7. build/package (if relevant)
8. pack/verify (if distributed)

Run listed commands and record outputs. Where the environment cannot run a
command, ask the user to run it and provide the output. Never assume PASS
without evidence.

## Fix loop

Quality gates are the decision mechanism. Fix until PASS.

- If failing, produce an actionable fix list (not vague). Stop and escalate
  when a gate fails without one.
- Identify whether the failure is a spec mismatch, a test issue or an
  implementation defect, and fix the root cause. Do not silence a test without
  a reason.
- Repair as
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`
  says, and rerun the failing gate, the QFAI gate included, after each fix
  batch.
- Verify never rewrites the story tree or a contract. A spec or contract
  finding goes to its owner through `.qfai/assistant/rule/drift-protocol.md`:
  `/qfai-sdd`, `/qfai-atdd` or `/qfai-implement`.
- A fix that changes code brings `implementation-reviewer` into the review.

## Evidence

Complete the file as `common-evidence-record` says, with every section of
`.qfai/assistant/skill/qfai-verify/templates/verify-evidence.md`, the next
actions included. Summarize its key outcomes in the PR description.

End with a concise evidence summary (copy‑paste for PR), including the Change
Classification (Primary/Tags) that
`.qfai/assistant/rule/change-classification.md` defines:

```md
### Verification Evidence

- Change classification:
  - Primary:
  - Tags:
  - rationale (1-3 lines):
- QFAI:
  - command:
  - result:
- Repo gates:
  - command:
  - result:
- Notes:
  - assumptions:
  - risks:
```

## Verdict

Write `.qfai/report/verify.json` at the end of the run. It is the
machine-readable verdict downstream gates read, and the evidence markdown does
not replace it. `status` is `"PASS"` only when every gate in scope passed.
`scope` is the one `verify-context` fixed, never a stage this run did not
cover. Fields, the closed `scope` enum, a conforming example and what must
never be written are in
`.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`.

## The stage result

Inside an `npx qfai workflow` run, the stage runs every required gate over the
run's change and reports each result.

- The stage writes this run's `.qfai/report/verify.json` and names it in
  `artifactRefs`.
- A `verify.json` written by another run, scoped to another flow or kept in a
  shared location is never named as this stage's report.
- The qa-gatekeeper verdict is a `reviewResults` entry, from a reviewer
  independent of the authors of what it reviews.
- The stage's own `gateResults` are information only: the run decides no gate
  from them.
- `outcome` and `testObservation` are reported apart.
- A required gate that did not run is reported `unrun`, never as a pass.

`verify.json` itself is unchanged inside a run: its fields and values are
`.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`'s,
and the run's values stay in the stage result.

## Findings verify did not cause

Inside a run, verify edits no artifact another owner holds. A finding it did
not cause returns `needs_repair`, with the finding listed in `debts` under its
`resolvingOwner`, so the run sends the repair there.

| Finding                   | `resolvingOwner` |
| ------------------------- | ---------------- |
| A story or contract gap   | `qfai-sdd`       |
| An acceptance-test defect | `qfai-atdd`      |
| An implementation defect  | `qfai-implement` |

These three are the only repairs verify routes.

## A missing environment

- A gate whose environment is missing returns the stage `blocked`, with the
  blocker `stage-blocked` and `operator` as the one who clears it.
- No debt is listed for it, and no repair is routed.

## Gate

The step is done when:

- every gate in scope ran and is recorded, or is recorded UNRUN with the
  reason;
- every gate passes, or each failure has an actionable fix list and an owner;
- the evidence has every template section and the summary;
- `verify.json` exists, its `status` matches the gate results and its `scope`
  matches the validate profile that ran.

For this skill, the smallest applicable smoke check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`
is the whole gate set of the scope, run to completion, with every outcome in
`verify.json` and the evidence.

A PASS needs zero errors in the declared profile, and, where the project has
them, a clean distributed-surface guard and a clean branch version pin.
