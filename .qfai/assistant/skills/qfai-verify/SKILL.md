---
name: qfai-verify
title: QFAI Verify (Quality Gates + Evidence)
description: "Run and document quality gates (repo + qfai validate/report), fix until PASS."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Bash, Write, TodoWrite, Task]
roles:
  [
    orchestrator,
    delivery-planner,
    qa-strategist,
    devops-ci-engineer,
    completion-reviewer,
    qa-gatekeeper,
    implementation-reviewer,
  ]
routing-profile: runtime-heavy
mode: evidence-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-verify — Quality Gates and Evidence

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- gate failure triage
- fix approach confirmation

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory`.

- Before writing or editing any `.qfai/**` artifact, read the relevant skill-local reference or template:
  - `.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/contract-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-prototyping/references/iteration-loop.md`

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/constitution/*`
- P2: `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`
- P3: `.qfai/specs/<spec-id>/09_delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (01_Spec.md, contracts, evidence, optional legacy `scenario.feature` / coverage ledgers)

## Verify Scope Rule (Mandatory)

- `/qfai-verify` MUST always run full-scan verification **within the declared scope**.
- Do NOT use Preflight Diff (or any diff-only shortcut) in this skill.
- Preserve the verify-as-safety-gate intent: verify must not be reduced to incremental checks.
- "Full-scan" means every gate that applies to the current stage, not every gate in the repository regardless of stage. Each scope names the profile that produces it, and they must match — a `full`-profile run is recorded as `scope: "full"` whatever stage triggered it.
- **Prototyping carve-out (local only — see "Mandatory checks": CI rejects narrow profiles).** When `/qfai-verify` is invoked to satisfy the prototyping DONE gate — i.e. Work Order H of `/qfai-prototyping`, before `qfai prototyping certify` — the scope is `prototyping`, and the validate run is `qfai validate --profile prototyping --fail-on error`. This is NOT a diff-only shortcut and NOT a waiver: it is the phase-isolation contract the certify gate enforces (`prototypingCertify.ts` accepts only `scope="prototyping"`, and `reviewerGate.ts` raises `R-CERTIFY-VERIFY-CIRCULAR` at severity `error` when a `verify.json` carrying `atdd` / `full` / `implement` is present while a prototyping loop is active). A `full` run at that point necessarily fails `QFAI-ATDD-111/112/113`, which are obligations of stage 5 (`/qfai-atdd`) — a stage that has not run yet. Do not clear them with annotation-only tests; declare the prototyping scope instead.

## Verify Output Contract — `.qfai/output/verify.json`

`/qfai-verify` MUST write `.qfai/output/verify.json` at the end of the run. This file is the machine-readable verdict; `.qfai/evidence/verify-<spec-id>.md` remains the human-readable evidence and does not replace it. Two independent readers consume it — `qfai prototyping certify` and the `R-CERTIFY-VERIFY-CIRCULAR` validator. Only `certify` fails closed: it refuses to seal a certificate when the file is missing, unparseable, or not `status: "PASS"` with `scope: "prototyping"`. The validator is advisory in the other direction — a missing, unparseable, scope-less or unknown-scope `verify.json` produces no finding (`reviewerGate.ts#detectCertifyVerifyCircular`), because its job is to catch a _wrong-phase_ verdict, not to demand that one exist. So an absent `verify.json` will not fail `qfai validate`; it will stop `certify`.

Canonical path: `.qfai/output/verify.json` (NOT `.qfai/evidence/`). Create the `.qfai/output/` directory if absent.

| Field        | Type             | Required | Meaning                                                                                                  |
| ------------ | ---------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `status`     | string           | yes      | `"PASS"` when every gate in scope passed; `"FAIL"` otherwise. Only `"PASS"` satisfies a downstream gate. |
| `scope`      | string           | yes      | Which stage's gate set this run covers. See the enum below.                                              |
| `specId`     | string           | no       | The spec this run targeted, when scoped to one (e.g. `"spec-0001"`).                                     |
| `recordedAt` | ISO-8601 string  | no       | When the run completed.                                                                                  |
| `summary`    | string           | no       | One or two sentences an operator can read without opening the evidence markdown.                         |
| `gates`      | array of objects | no       | Per-gate results: `{ name, status, command }`. Advisory; no reader gates on it today.                    |

`status` is a closed two-value enum: `"PASS"` / `"FAIL"`. There is no `"WARN"` — a run with only `warning` / `info` findings is `"PASS"` (waivers apply to those severities only). Any `error` finding makes it `"FAIL"`.

`scope` is a closed enum. Write the one that matches the stage you were invoked for:

| `scope`       | Written by                                                                          | validate profile                            | Accepted by                                                                                          |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `prototyping` | Work Order H of `/qfai-prototyping`, before `certify`                               | `qfai validate --profile prototyping`       | `qfai prototyping certify` — this is the ONLY value it accepts                                       |
| `atdd`        | after `/qfai-atdd`, checking ATDD obligations only                                  | `qfai validate --profile atdd`              | rejected by prototyping certify; `R-CERTIFY-VERIFY-CIRCULAR` when a prototyping loop is still active |
| `full`        | any whole-repository run, including the one after `/qfai-atdd` or `/qfai-implement` | `qfai validate --profile verify` (= `full`) | same as `atdd`                                                                                       |

There is no `implement` value: the enum is closed at these three, and a run after
`/qfai-implement` is recorded as `full`. (`reviewerGate.ts` still recognises a
legacy `implement` string so an old file is not silently treated as
prototyping-scoped, but nothing accepts it as a verdict — do not write it.)

Minimal conforming example for the prototyping gate:

```json
{
  "status": "PASS",
  "scope": "prototyping",
  "specId": "spec-0001",
  "recordedAt": "2026-01-31T09:12:44Z",
  "summary": "Prototyping gates passed: validate --profile prototyping error=0, per-iter evidence present for all declared screens, reviewer gate PASS."
}
```

Rules:

- Never write `"status": "PASS"` without the command outputs that justify it. A `FAIL` verdict is a legitimate output — the gate downstream is supposed to stop.
- Never write a `scope` you did not actually run. Writing `"prototyping"` after a `full` run is a false verdict, not a workaround — and the reverse is just as wrong: a `--profile verify` run is `scope: "full"`, not `scope: "atdd"`, because `atdd` means the ATDD gate set only (see `_policies/06_Glossary.md`, `verify.json#scope`).
- `scope` is optional only in the sense that `certify` tolerates its absence for backward compatibility with older files. New runs MUST write it.
- Do not add a `version` / `schemaVersion` field. No reader validates one, and a second version series in a distributed artifact is exactly what the distributed-surface rule forbids: the npm package version is the only version this surface has.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

### Work Orders Summary (MANDATORY evidence)

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: Runner, ReportWriter create first drafts of execution evidence and verification summary.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- Reviewer checks:
  - required roles were delegated;
  - validate evidence exists: `qfai validate --profile verify --fail-on error` completed with `error=0` — for a `scope: "prototyping"` run this is `qfai validate --profile prototyping --fail-on error` instead, per the prototyping carve-out in "Verify Scope Rule". Requiring the `verify` profile here would reinstate the circular gate: it fails `QFAI-ATDD-111/112/113`, so no reviewer could return PASS before `/qfai-atdd` has run;
  - per-iter evidence (screenshot + HTML + review.json) exists under `.qfai/evidence/prototyping/iter-NN/`, and the recorded final iteration in `.qfai/evidence/prototyping/prototyping.json#iterations[]` has both screenshot and HTML on disk. The completion-certificate is NOT a verify-gate input — `qfai prototyping certify` runs AFTER `/qfai-verify` (it requires a passing `verify.json`). Cert digest validation belongs to `certify --check`, run during the prototyping handoff or after edits to brand assets, not here;
  - Drift Protocol enforced;
  - test-layer policy enforced against `test-layers.md`.
  - gate counts and ratios are signals, not gates.
- Route specialist reviewers from `.qfai/assistant/manifest/agent-routing.yml`.
- Default verify review set:
  - `qa-gatekeeper`
  - `completion-reviewer`
- Add `implementation-reviewer` only when code fixes are in scope.
- Do not declare DONE or handoff until all routed blocking reviewers return `PASS`.

### Work order template (copy/paste)

Use the shared template.

### Reviewer response template

Use the shared template.

- Required field: `Status (PASS/REVISE)`.

## Stage 0 — Steering completion refresh (mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion without running the defined gates.
- You MUST produce the required evidence file: `.qfai/evidence/verify-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST write `.qfai/output/verify.json` per "Verify Output Contract" above. Downstream gates read that file, not the evidence markdown.
- You MUST run the mandatory checks listed below and record outcomes.
- In CI, you MUST keep QFAI validation on full-scan mode (`qfai validate --profile verify --fail-on error` or default `qfai validate --fail-on error`). Do NOT use partial profiles. This has no exception: `phasePolicy.ts` rejects every narrow profile (`discussion` / `prototyping` / `atdd`) under `CI=true` or `GITHUB_ACTIONS=true` with `QFAI-VALIDATE-017`. The prototyping carve-out below is a local, pre-`certify` run — it cannot be, and must not be wired as, a CI job.
- Waivers are only for `warning` / `info` findings. If a waiver attempts to suppress an `error`, treat it as a failure and fix the root cause.
- You MUST stop and escalate if any gate fails without an actionable fix list.
- Completion must be approved by a reviewer who did not run the gates.

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#completion-contract-shared`.
Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Run quality gates and produce evidence that the change is correct and safe.

## Success Criteria (Definition of Done)

- Repo quality gates PASS (format/lint/type/test/build/etc).
- QFAI checks PASS (at minimum: `qfai validate --profile verify`, or `--profile prototyping` for a `scope: "prototyping"` run; optionally `qfai report`).
- Declared screens have mandatory screenshot and HTML evidence.
- A concise evidence summary exists (copy‑paste for PR).
- The PR-ready summary includes **Change Classification (Primary/Tags)** per `.qfai/assistant/constitution/change-classification.md`.
- Evidence file exists: `.qfai/evidence/verify-<spec-id>.md`.
- Verdict file exists: `.qfai/output/verify.json`, with `status` and `scope` set per "Verify Output Contract".
- Completion is approved by a reviewer who did not run the gates.

## Mandatory checks

- Run listed commands and record outputs.
- If failing, produce an actionable fix list (not vague).
- Static policy checks:
  - `.qfai/assistant/constitution/drift-protocol.md` exists.
  - `.qfai/assistant/catalog/test-layers.md` exists.
  - all `.qfai/assistant/skills/*/SKILL.md` include `[DRIFT-PROTOCOL:MANDATORY]`.
  - reviewer-related agent docs include drift-protocol and test-layer review viewpoints.

## Not-done criteria

- "Seems ok" without actual command outputs.

## Non‑Negotiable Principles (QFAI Articles)

These principles are inspired by “constitution / articles” patterns used by other agent frameworks, but tailored to QFAI.

1. **SDD First (Specification is the source of truth)**  
   If there is a conflict between code and spec, treat the spec as authoritative and either (a) fix code or (b) raise an explicit Open Question to change the spec.

2. **Traceability is mandatory**  
   Every meaningful change must be traceable: **Require → Spec → Scenario → Tests → Code → Verification evidence**.

3. **Evidence over confidence**  
   Prefer observable proof (logs, commands, file diffs, test results). If you cannot verify, say so and record it.

4. **Minimize scope, but never hide gaps**  
   Keep changes minimal, but do not “paper over” missing decisions. If something blocks correctness, stop and ask.

5. **Quality gates are the decision mechanism**  
   Use tests/lint/typecheck/build/pack verification (whatever the repo defines) as the primary guardrail. Fix until PASS.

6. **Make it runnable**  
   Outputs must be executable in terminal/CI. Provide copy‑paste commands.

7. **User time is expensive**  
   Ask only the questions that are truly blocking. Everything else: make reasonable assumptions and label them clearly.

## README Rule

Do not create `.qfai/**/README.md` files as scaffold or format documentation; keep artifact guidance in skill references/templates.

- READMEs are reference guides. Follow their structure, templates, and checklists.

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides all other stylistic preferences.

## Multi‑Role Orchestration (Subagents)

Use the platform's native sub-agent delegation mechanism for Claude Code, GitHub Copilot, and Codex.

### Delegation order

Use `.qfai/assistant/manifest/agent-routing.yml` as the routing SSOT.

- First required delegation / Capability Probe: `delivery-planner` in the `plan` phase.
- Then follow routed phases in order: `plan` (`delivery-planner`, `qa-strategist`) -> `execution` (`devops-ci-engineer`) -> `review` (`qa-gatekeeper`, `completion-reviewer`, optional `implementation-reviewer` when code fixes are in scope).
- Do not prepend non-routed roles before the first required delegation attempt.

### Delegation contract (tool-neutral)

```text
Role: delivery-planner
Task title: Create an execution plan and DoD
Goal: sequence quality gates and evidence work
Inputs:
- current change context
- required gates
Constraints:
- evidence-first
- no self-approval
Return:
- phases + risks + DoD
```

### Failure rule

- The first required delegation attempt doubles as the capability check.
- If that delegation fails, stop immediately. Do not simulate roles or continue with self-execution.

## Completion Separation (mandatory)

- Gate execution (`devops-ci-engineer`) and completion approval (`completion-reviewer`) must be separate.
- `qa-gatekeeper` must confirm gate coverage before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Gates already executed vs remaining
- Evidence captured so far and what is missing

## Step 0 — Load Context (always)

1. Read relevant **project steering** (if present):
   - `.qfai/assistant/catalog/structure.md`
   - `.qfai/assistant/catalog/tech.md`
   - `.qfai/assistant/catalog/product.md`
   - any additional files under `.qfai/assistant/{manifest,catalog}/`

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/constitution/constitution.md`
   - `.qfai/assistant/constitution/workflow.md` (or equivalent)

3. Read existing artifacts for the current work item (if present):
   - `.qfai/specs/spec-*/`
   - `.qfai/contracts/`
   - `.qfai/evidence/`

Do not use discussion-pack artifacts as verification inputs. Verify reads normalized specs, contracts, and evidence only.

4. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing test patterns (unit/integration/e2e)

## Step 0 — Project Analysis (mandatory)

Before producing any deliverable, thoroughly analyze the current project (background/goals, directory structure, runtime/tooling versions, architecture boundaries, existing test/doc/CI patterns) so your outputs fit the repo.

### Minimum analysis checklist

- [ ] Read key repo docs: README / CHANGELOG / RELEASE (if present)
- [ ] Inspect `.qfai/` layout and existing SDD/ATDD/TDD artifacts (if present)
- [ ] Inspect `packages/qfai` structure (CLI entrypoints, core modules, validators, assets/init)
- [ ] Identify standard gate commands (format/lint/type/test/verify-pack) and where they are defined
- [ ] Note constraints: Node versions, CI matrix, packaging rules, verify-pack expectations

If analysis cannot be performed, clearly state what could not be verified and proceed with minimal-risk assumptions.

## Step 0.5 — Steering Bootstrap / Refresh (mandatory when incomplete)

QFAI expects `assistant/steering/` to contain **project‑specific facts** so all subsequent design/test/implementation fits this repository.

### What to do

1. Open these files:

- `.qfai/assistant/catalog/product.md`
- `.qfai/assistant/catalog/tech.md`
- `.qfai/assistant/catalog/structure.md`

1. If they are missing, mostly empty, or still have placeholders (e.g., a lone `-`
   only), **populate them by analyzing the current repository**:

- derive “what/why/users/success/non-goals” from README/docs/issues (product.md)
- derive runtime/tooling versions + constraints from package.json, CI config, lockfiles (tech.md)
- derive repo layout + key directories + gate commands from the file tree and scripts (structure.md)

1. Do **not** invent facts. If something cannot be verified, write it as:

- `TBD` + what evidence is missing, or
- an Open Question (if it blocks correctness)

### Steering refresh checklist

- [ ] product.md: what we build / users / success / non-goals / release posture
- [ ] tech.md: Node / package manager / TS / test / lint / CI constraints
- [ ] structure.md: repo layout, key packages, entrypoints, standard gate commands, how to run locally

## Step 1 — Discover project gate commands (DevOps/CI Engineer)

Prefer existing scripts:

- package.json scripts
- Makefile / task runner
- CI config

If unknown, propose defaults and mark assumptions.

## Step 2 — Run QFAI gates

Run (adjust as needed):

- `qfai validate --profile verify --fail-on error` — or `qfai validate --profile prototyping --fail-on error` when this run's scope is `prototyping`
- `qfai report` (if used in this repo)

Notes:

- CI must run default/full validation only. Partial profiles are local skill checks only. The `prototyping` scope is the one exception, and it is a stage carve-out rather than a shortcut — see "Verify Scope Rule".
- If `QFAI-WAIVER-002` appears, remove the invalid waiver and resolve the underlying `error` finding.

Capture:

- exit codes
- key errors/warnings
- file paths affected

## Step 3 — Run repo gates

Run the repo’s standard pipeline in a stable order:

1. format
2. lint
3. typecheck
4. unit tests
5. scenario/e2e tests
6. build/package (if relevant)

## Step 4 — Fix loop (Code Reviewer + QA)

If anything fails:

- Identify whether it’s spec mismatch, test issue, or implementation defect.
- Fix the root cause (do not silence tests without reason).

## Step 5 — Produce Evidence Summary (Delivery Planner)

Output this format:

### Verification Evidence

- Change classification (SSOT: `.qfai/assistant/constitution/change-classification.md`):
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

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/verify-<spec-id>.md`

Evidence must include:

- command list + pass/fail + next actions

### Required sections

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks (must be explicit; "none" is acceptable if justified)
- Final status (PASS/FAIL) + who confirmed

### Template

```md
# Verify Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

- command:
- result:

## QFAI gates

- command:
- result:

## Repo gates

- command:
- result:

## Next actions (if any)

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## Completion Criteria (Final Gate)

**All of the following must be verified and PASS:**

1. QFAI validation:

   ```bash
   qfai validate --profile verify --fail-on error
   ```

   For a `scope: "prototyping"` run, this gate is
   `qfai validate --profile prototyping --fail-on error` instead. The `verify`
   profile is not achievable before `/qfai-atdd` has run — see the prototyping
   carve-out in "Verify Scope Rule".

2. Repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- `.qfai/output/verify.json` — the machine-readable verdict (`status` + `scope`), per "Verify Output Contract". Downstream gates read this file.
- `.qfai/evidence/verify-<spec-id>.md` — the human-readable evidence summary with all gate results
- All gates: PASS confirmed
- Next action suggestion: proceed to PR creation (use your platform workflow), or — for a `scope: "prototyping"` run — proceed to `qfai prototyping certify`

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions/steering and the 09_delta.md spec-id
- DR-IDs referenced (or "none" + propose adding a Decision Record)
- Confirmation that no rejected options were reintroduced (or list RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not run the gates.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): Create a PR on your hosting platform.
  Action: use the verified evidence to write the PR description.
- Any gate failed:
  Action: return to the owning skill, fix the issue, then rerun `/qfai-verify`.
- Need a report artifact:
  Action: run `qfai report` after validation outputs are up to date.

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - `companyName`
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- Verify is the full-scan approval gate; per-skill validate runs (sdd/atdd/tdd) are signals, the verify gate is the binding pass.
- Completion requires zero errors across every profile in the declared scope AND zero leakage in the distributed-surface guard AND a clean branch version pin. A `scope: "prototyping"` run's scope is the `prototyping` profile only; stage-5 obligations (QFAI-ATDD-111/112/113) belong to the later `atdd` / `full` run.
- Verify never rewrites artifacts; it only reads and reports. Drift fixes belong to /qfai-sdd / /qfai-implement / /qfai-atdd respectively.
