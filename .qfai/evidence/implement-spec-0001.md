# Implement Evidence: spec-0001

Rows closed under DR-0298, one entry per row.

## /qfai-implement run started 2026-09-25T10:14:05.606Z

Rows `TDD-0035` and `TDD-0036`, named by this invocation to take the reviews
`DR-0298` waived. Both are `Layer: Integration`, so their row-level evidence is
in `.qfai/evidence/atdd-spec-0001.md#tdd-0035` and `#tdd-0036`. The entries
below for those two rows record the waived run and are kept as its record.

### Plan phase

| Role                          | Instance                | Verdict | Summary                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delivery-planner` (blocking) | `delivery-planner#1`    | PASS    | Both rows exist and are not `blocked`. Both are T2, so each is reviewed alone and no group forms. Order as named: `TDD-0035`, then `TDD-0036`. Parallel dispatch denied: both rows share a test file and an `Owning module`, and no worktree separation is set up |
| `test-design-analyst`         | `test-design-analyst#1` | REVISE  | `TDD-0035`'s one test asserts three states, `pass-on`, `worker` and `off`, so it does not own one boundary. `TDD-0036` owns one: the `error` state. No row is missing for the four seeded groups                                                                |

`TDD-0035` stops at Phase Red step 1 on `selector-granularity.md` and takes the
residual path: `CR-20260925-0285` proposes one row per state, and the row moves
`todo -> blocked`. `TDD-0036` continues.

Advisory findings from `test-design-analyst#1`, none of which this run acts on:

- `EX-0001-0026` also expects the worker to say nothing to the operator, and
  `off` to behave as when invoked by name. Neither `TC-0001-0026` nor its test
  checks them.
- ``rowOf(section, "`off`")`` takes the first table line holding the token, not
  the line whose State cell is `off`.
- `TDD-0042` records no `Blocked-By`, while `US-0001-0010` says its E2E row waits
  on spec-0018.
- The tests behind `TDD-0015` … `TDD-0017` still check wording their rewritten
  test cases no longer state.
- `Layer` is written `integration` on `TDD-0001` … `TDD-0024` and `Integration`
  from `TDD-0034`.

### Work Orders Summary

| Step | Role (sub-agent)    | Agent instance        | Task title                                                                    | Input (refs)                                           | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ------------------- | --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- | ---------------------------- |
| 1    | delivery-planner    | delivery-planner#1    | /qfai-implement plan: confirm the TDD-0035 and TDD-0036 handover              | test-list.md, atdd-spec-0001.md#tdd-0035, #tdd-0036    | #plan-phase   | PASS                         |
| 2    | test-design-analyst | test-design-analyst#1 | /qfai-implement plan: coverage and layer check over the spec-0001 ledger      | test-list.md, 02_User-stories.md, 06_Test-Cases.md     | #plan-phase   | REVISE                       |
| 3 | - | n/a | grilling(-@2026-09-25T10:14:05.607Z/none): none | - | - | PASS |
| 4 | backend-engineer | backend-engineer#1 | /qfai-implement: TDD-0036 falsifiability run with the `error` row's refusal sent to the operator, left in place for the gate | atdd-spec-0001.md#tdd-0036, shared-skill-operating-baseline.md | Round 1 | PASS |
| 5 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0036 RED phase gate on the mutated tree | atdd-spec-0001.md#tdd-0036 | qa-gatekeeper fields | PASS |
| 6 | backend-engineer | backend-engineer#1 | /qfai-implement: TDD-0036 revert, restored GREEN and refactor verify | atdd-spec-0001.md#tdd-0036 | Round 1, Refactor verify fields | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper#2 | /qfai-implement: TDD-0036 build-phase GREEN and oracle proof on the restored tree | atdd-spec-0001.md#tdd-0036 | qa-gatekeeper fields | PASS |
| 8 | completion-reviewer | completion-reviewer#1 | /qfai-implement: TDD-0036 completion review, attempt 1 | atdd-spec-0001.md#tdd-0036, coverage-depth-spec-0001.md | review-20260925195831172 <!-- qfai:not-a-citation --> | PASS |
| 9 | implementation-reviewer | implementation-reviewer#1 | /qfai-implement: TDD-0036 code review, attempt 1 | atdd-spec-0001.md#tdd-0036 | review-20260925195831172 <!-- qfai:not-a-citation --> | PASS |
| 10 | orchestrator | orchestrator | /qfai-implement: TDD-0036 checkpoint verification, off a checkpoint boundary | atdd-spec-0001.md#tdd-0036 | Checkpoint verification fields | PASS |

`backend-engineer#1` is the only agent that edited the shipped baseline, and
only to apply and revert the mutation. None of the gatekeepers or reviewers
above authored or edited anything under review.

### Grilling Session

#### /qfai-implement — run started 2026-09-25T10:14:05.607Z

Preflight: confidence high

No session opened. `DR-0298` fixes what was waived and how a row reopens, and
the `/qfai-atdd` handover names each predicate and mutation. The one open
decision this run met, how to re-scope `TDD-0035`, is the user's and is raised
as `CR-20260925-0285` rather than adopted.

### Record defects

Open entries from the `TDD-0036` completion review. Each is repaired before
spec-0001 completion is declared.

- `record:unchecked`: no validator reads a `/qfai-implement` grilling block, so
  its absence would not have been reported. The block above was added after
  the review.
- `record:work-orders-summary`: the rows from step 4 on were written after the
  review read this file.

## Ledger rows advanced

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stage0ReuseSpec0001.test.ts`
- Selector: `TC-0001-0025: Stage 0 output is reused inside a run only on an equal recomputed key`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stage0ReuseSpec0001.test.ts --testNamePattern='TC-0001-0025: Stage 0 output is reused inside a run only on an equal recomputed key' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '## Stage 0 - Steering completion refr…' to match /inside an active workflow run, a sta…/i`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stage0ReuseSpec0001.test.ts`, `packages/qfai/tests/helpers/shippedAssistant.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0035

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Selector: `TC-0001-0026: the entry check hands over, works the order, or is off`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts --testNamePattern='TC-0001-0026: the entry check hands over, works the order, or is off' --reporter=verbose`
- RED result: exit 1; `AssertionError: the section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed, 1 skipped
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`, `packages/qfai/tests/helpers/shippedAssistant.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0036

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Selector: `TC-0001-0027: a work order that matches no issued one edits nothing and is refused`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts --testNamePattern='TC-0001-0027: a work order that matches no issued one edits nothing and is refused' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '' to match /matches no issued one/i`
- GREEN result: exit 0; 1 passed, 1 skipped
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0038

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillStandaloneSpec0001.test.ts`
- Selector: `TC-0001-0029: a stage invoked by name runs standalone and ends at that stage`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillStandaloneSpec0001.test.ts --testNamePattern='TC-0001-0029: a stage invoked by name runs standalone and ends at that stage' --reporter=verbose`
- RED result: exit 1; `AssertionError: the by-name row exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillStandaloneSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0041

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/governanceTextSpec0001.test.ts`
- Selector: `TC-0001-0032: the constitution states request authority and binding, and routes are not change types`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/governanceTextSpec0001.test.ts --testNamePattern='TC-0001-0032: the constitution states request authority and binding, and routes are not change types' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '# QFAI Constitution (Non‑Negotiable) …' to match /the operator's first explicit reques…/i`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/assets/init/.qfai/assistant/constitution/workflow.md`, `packages/qfai/tests/integration/governanceTextSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0037

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillDescriptionsSpec0001.test.ts`
- Selector: `TC-0001-0028: each description opens with its trigger condition`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillDescriptionsSpec0001.test.ts --testNamePattern='TC-0001-0028: each description opens with its trigger condition' --reporter=verbose`
- RED result: exit 1; `AssertionError: qfai-sdd: nothing precedes the trigger sentence: expected 'Triage incoming requirements against …' to match /^Use when /`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-{sdd,atdd,implement,verify,discussion,prototyping}/SKILL.md (description)`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-maintain/SKILL.md`, `packages/qfai/tests/assets/assets.test.ts`, `packages/qfai/tests/assets/atddDbContractObligationLists.test.ts`, `packages/qfai/tests/integration/stageSkillDescriptionsSpec0001.test.ts`, `packages/qfai/tests/helpers/shippedAssistant.ts`
- Note: The two asset tests that pinned the old `qfai-verify` and `qfai-atdd` descriptions now pin the rewritten ones; both pass.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0039

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/orchestratedModeReferenceSpec0001.test.ts`
- Selector: `TC-0001-0030: one references/orchestrated-mode.md, cited by one SKILL.md line`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/orchestratedModeReferenceSpec0001.test.ts --testNamePattern='TC-0001-0030: one references/orchestrated-mode\.md, cited by one SKILL\.md line' --reporter=verbose`
- RED result: exit 1; `AssertionError: qfai-sdd/references/orchestrated-mode.md exists: expected false to be true // Object.is equality`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/*/references/orchestrated-mode.md (seven plan skills)`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-{sdd,atdd,implement,verify,discussion,prototyping}/SKILL.md (one citation line)`, `packages/qfai/tests/integration/orchestratedModeReferenceSpec0001.test.ts`
- Note: `qfai-implement/SKILL.md` was at the 800-line ceiling; two wrapped paragraphs in its Grilling section were joined onto one line each to make room, with no change to the text.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0040

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillModelInvocationSpec0001.test.ts`
- Selector: `TC-0001-0031: no skill a plan names carries disable-model-invocation`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillModelInvocationSpec0001.test.ts --testNamePattern='TC-0001-0031: no skill a plan names carries disable-model-invocation' --reporter=verbose`
- RED result: exit 1; `AssertionError: qfai-maintain/SKILL.md exists: expected false to be true // Object.is equality`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-maintain/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/manifest/agent-routing.yml (qfai-maintain entry)`, `.claude/skills/qfai-maintain, .agents/skills/qfai-maintain, .codex/skills/qfai-maintain, .github/skills/qfai-maintain (links)`, `packages/qfai/tests/integration/stageSkillModelInvocationSpec0001.test.ts`
- Note: The test reads the shipped skill files. spec-0018's adapter case reads the tree `qfai init` writes and keeps its own row; this module carries only this spec's annotation.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.
