# ATDD Evidence: spec-0018

## Objective

Take six `E2E` rows of spec-0018 through the reviews `DR-0298` waived, and close
each one at `done`.

| TDD-ID | Obligation | Test file |
| ------ | ---------- | --------- |
| `TDD-0458` | `US-0018-0004` | `packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts` |
| `TDD-0459` | `US-0018-0005` | `packages/qfai/tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts` |
| `TDD-0460` | `US-0018-0006` | `packages/qfai/tests/e2e/spec0018AskWithoutStartingE2E.test.ts` |
| `TDD-0462` | `US-0018-0008` | `packages/qfai/tests/e2e/spec0018ChooseTheModeE2E.test.ts` |
| `TDD-0463` | `US-0018-0009` | `packages/qfai/tests/e2e/spec0018HostCapabilityE2E.test.ts` |
| `TDD-0464` | `US-0018-0010` | `packages/qfai/tests/e2e/spec0018ClaimAHostE2E.test.ts` |

Each of these tests passed on its first run, so none has an observed RED. Each
row therefore takes the falsifiability branch: a production mutation that makes
the test fail, then the restored run as its GREEN.

`TDD-0455` is not in this set. It stays at `exception` under `DR-0298`.

## Inputs reviewed (files/paths)

- `.qfai/decisions/DR-0298-intent-driven-rows-close-without-per-row-review.md`
- `.qfai/waivers.yml` (`WVR-20260925-18`)
- `.qfai/specs/spec-0018/02_User-stories.md`
- `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0018/tdd/test-list.md`
- `.qfai/evidence/implement-spec-0018.md` (the waived entries of the six rows)

## Decisions made (with rationale)

- The six rows restart through `exception -> todo`. Their obligations did not
  change, so no Change Request is needed, and each row keeps `DR-0298` in
  `DR-ID`.
- `TDD-0464` takes its mutation in the published `packages/qfai/README.md`. The claim check the
  story relies on is test-side code that never ships, so the README statement it reads is the one
  shipped artifact that carries the story. Adopted between agents: see the `/qfai-implement` session below.
- The earlier entries in `implement-spec-0018.md` stay as the record of the
  waived close. The new cycle writes here, the evidence file an `E2E` row owns.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T16:12:02.339Z

Preflight: confidence high

No session opened. Each row's story, test and selector are fixed by the ledger,
and each test passed on its first run, which settles the branch.

### /qfai-implement — run started 2026-09-25T16:25:34.799Z

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-25T16:26:00Z | b5d357c14ae396a0d436491692af17be018b278c | 2026-09-25T16:30:00Z | preflight: the TDD-0464 handover names a README line, not source code, as the predicate to break | empty | none in flight | 1 | 0 | 0 |

## Ledger rows advanced

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0458` | `US-0018-0004` | E2E | falsifiability | [TDD-0458](#tdd-0458) |
| `TDD-0459` | `US-0018-0005` | E2E | falsifiability | [TDD-0459](#tdd-0459) |
| `TDD-0460` | `US-0018-0006` | E2E | falsifiability | [TDD-0460](#tdd-0460) |
| `TDD-0462` | `US-0018-0008` | E2E | falsifiability | [TDD-0462](#tdd-0462) |
| `TDD-0463` | `US-0018-0009` | E2E | falsifiability | [TDD-0463](#tdd-0463) |
| `TDD-0464` | `US-0018-0010` | E2E | falsifiability | [TDD-0464](#tdd-0464) |

### TDD-0458

- TDD-ID: TDD-0458
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts
- Selector: US-0018-0004 (TDD-0458)
- US-ref: US-0018-0004
- Branch: falsifiability — the test passed on its first run, because TDD-0104 (a material risk opens one question and waits) and TDD-0354 (a stop cancels at once) already implement the story
- Predicate to break: packages/qfai/src/core/workflow/decide.ts:2770, `decide` (routing-result accept) — a routing result with an open question leaves the run `awaiting_input`
- Mutation: `state: "awaiting_input"` to `state: "ready"` in `run: { ...run, state: "awaiting_input", sequence: run.sequence + questions.length + 1 }` at line 2770
- Why it fails: the routed run reports `ready` instead of waiting, and `recordsOf` writes that final state into the journal, so the run no longer waits either.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018StopForMyDecisionE2E.test.ts:67` fails as an assertion,
  `AssertionError: expected { routed: 'ready', … } to deeply equal { routed: 'awaiting_input', … }`; `unanswered` and `status` no longer read `awaiting_input` either, and `stopped` stays `cancelled`
- Type check: the run's `state` is typed `string`, so another string literal in the same object literal type-checks

The test runs `qfai init` into a temp git repository through the built CLI, then drives `qfai workflow start`, `next`,
`accept` with a discovery routing result carrying the `data-loss` risk signal and one decision question, `next`,
`status`, and `decision` with `stop: true`. It checks AC-0018-0019 (a material risk ends routing in `awaiting_input`
with the question named, and `next` issues no work order while it waits) and AC-0018-0021 (a `stop` ends the run
`cancelled`). The mutation takes AC-0018-0019, the story's core clause.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --testNamePattern='US-0018-0004 \(TDD-0458\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018StopForMyDecisionE2E.test.ts > US-0018-0004 (TDD-0458): a material question waits unanswered, then a stop cancels the run 15859ms
 ↓ |e2e| tests/e2e/spec0018StopForMyDecisionE2E.test.ts > US-0018-0004, discussion variant (spec-0010 TDD-0033): the discussion stage gets what is settled and returns the run to routing
 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/workflow/decide.ts, `decide`, the routing-result accept that leaves a run with an open question `awaiting_input`
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --testNamePattern='US-0018-0004 \(TDD-0458\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on
  `AssertionError: expected { routed: 'ready', …(4) } to deeply equal { routed: 'awaiting_input', …(4) }`
  at `tests/e2e/spec0018StopForMyDecisionE2E.test.ts:67:6`

The edit:

```diff
diff --git a/packages/qfai/src/core/workflow/decide.ts b/packages/qfai/src/core/workflow/decide.ts
index 56e7a7ecd..ee385059b 100644
--- a/packages/qfai/src/core/workflow/decide.ts
+++ b/packages/qfai/src/core/workflow/decide.ts
@@ -2767,7 +2767,7 @@ export function decide(
   return {
     verdict: {
       ok: true,
-      run: { ...run, state: "awaiting_input", sequence: run.sequence + questions.length + 1 },
+      run: { ...run, state: "ready", sequence: run.sequence + questions.length + 1 },
       questions,
       ...(plan ? { plan } : {}),
     },
```

- Round 1: Falsifiability revision: working-tree+eaa8daf3400066f414e73a6eab3ea091981bbbfab0db6c9af061067e675e68de
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 33df5982a132ef7fe5cd4bec6418caad9cca893007a0673c4b6503b87143c20e
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --testNamePattern='US-0018-0004 \(TDD-0458\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 2 passed (2). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

### TDD-0459

- TDD-ID: TDD-0459
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts
- Selector: US-0018-0005 (TDD-0459)
- US-ref: US-0018-0005
- Branch: falsifiability — the test passed on its first run, because TDD-0327 already makes `resume` return the outstanding work order from the smallest valid checkpoint
- Predicate to break: packages/qfai/src/core/workflow/decide.ts:1738, `checkpointOf` — `resume` restarts at the first accepted stage whose receipt does not hold, or nowhere
- Mutation: `validity !== "valid"` to `validity === "valid"` at line 1738
- Why it fails: every accepted receipt is valid, so the mutated `checkpointOf` returns the first accepted stage instead of `-1`.
  `resumeRunning` then takes `resumeFromCheckpoint`, which drops the outstanding implement work order and re-issues the run from that earlier stage.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts:50` fails as an assertion,
  `AssertionError: expected { …, resumed: <an earlier stage kind>, sameOrder: false, … } to deeply equal { …, resumed: 'implement', sameOrder: true, … }`
- Type check: `validity` is typed `"valid" | "stale" | "unknown"`, so comparing it to `"valid"` with `===` type-checks as `!==` did

The test runs `qfai init`, writes spec-0001's pack, its ledger, a test file and a production file, commits, and drives
a feature run through the built CLI's `qfai workflow` to a recorded RED receipt, leaving the implement work order
outstanding. It then calls `qfai workflow resume --run <id>` as a new session would. It checks AC-0018-0027 (resume
returns the pending ledger item's work order, and no SDD or discussion stage reruns), AC-0018-0028 in its unchanged
case (the RED receipt stays `valid`), and that resume leaves the ledger byte-identical.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts --testNamePattern='US-0018-0005 \(TDD-0459\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts > US-0018-0005 (TDD-0459): resume returns the pending ledger row's implement work order and no SDD work order 22766ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/receiptRun.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/workflow/decide.ts, `checkpointOf`, `resume` restarts at the first accepted stage whose receipt does not hold, or nowhere
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts --testNamePattern='US-0018-0005 \(TDD-0459\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on
  `AssertionError: expected { interrupted: 'implement', …(5) } to deeply equal { interrupted: 'implement', …(5) }`
  at `tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts:50:6`; the diff shows `resumed: 'sdd'`, `rows: undefined` and `sameOrder: false`

The edit:

```diff
diff --git a/packages/qfai/src/core/workflow/decide.ts b/packages/qfai/src/core/workflow/decide.ts
index 56e7a7ecd..ec6667a1d 100644
--- a/packages/qfai/src/core/workflow/decide.ts
+++ b/packages/qfai/src/core/workflow/decide.ts
@@ -1735,7 +1735,7 @@ function checkpointOf(
   receipts: readonly WorkflowReceiptClass[],
 ): number {
   return accepted.findIndex((stage) =>
-    receipts.some(({ ref, validity }) => ref === stage.receiptRef && validity !== "valid"),
+    receipts.some(({ ref, validity }) => ref === stage.receiptRef && validity === "valid"),
   );
 }
```

- Round 1: Falsifiability revision: working-tree+5705bf6dcfb18e806b1728dc74066652cbb0a2540dbfde8eba70c2c134b4939b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fb67b16c149aa727dfbcbbb0bb252dac0bd719647c736ce80818ce8ca0f69f34
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/receiptRun.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts --testNamePattern='US-0018-0005 \(TDD-0459\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ContinueAnInterruptedRunE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

### TDD-0460

- TDD-ID: TDD-0460
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018AskWithoutStartingE2E.test.ts
- Selector: US-0018-0006 (TDD-0460)
- US-ref: US-0018-0006
- Branch: falsifiability — the test passed on its first run, because TDD-0322 and TDD-0328 already implement `status` as a read of the runtime tree that writes nothing
- Predicate to break: packages/qfai/src/cli/commands/workflow.ts:698, `runWorkflow` — `status` is answered outside the run lock, so asking reads and never writes
- Mutation: `return status(options.root, path.join(options.root, RUNS_DIR), options.runId);` to
  `return underLock(options, null, () => status(options.root, path.join(options.root, RUNS_DIR), options.runId));` at line 698
- Why it fails: `acquireLock` creates `.qfai/runs/` to write its lock file, and `releaseLock` removes the file but not the directory.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018AskWithoutStartingE2E.test.ts:39` fails as an assertion,
  `AssertionError: expected { exit: 0, run: null, mode: 'active', runs: true, unchanged: true } to deeply equal { …, runs: false, … }`
- Type check: `underLock` takes `(options: WorkflowOptions, runId: string | null, body: () => Promise<number>)` and returns
  `Promise<number>`, and `status` returns `Promise<number>`, so the wrapped call type-checks and `runWorkflow` keeps its return type

The test runs `qfai init` into a temp git repository and calls the built CLI's `qfai workflow status` with no `--run`,
the call the entry makes to answer a question about the repository. It checks AC-0018-0033 as the CLI can observe it:
the answer names no run and the mode in force, exits 0, no `.qfai/runs/` directory appears, and the tree digest is unchanged.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018AskWithoutStartingE2E.test.ts --testNamePattern='US-0018-0006 \(TDD-0460\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018AskWithoutStartingE2E.test.ts > US-0018-0006 (TDD-0460): the entry's status call leaves no run and a byte-identical tree 9803ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018AskWithoutStartingE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/workflow.ts, `runWorkflow`, `status` is answered outside the run lock, so asking reads and never writes
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018AskWithoutStartingE2E.test.ts --testNamePattern='US-0018-0006 \(TDD-0460\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on
  `AssertionError: expected { exit: +0, run: null, …(3) } to deeply equal { exit: +0, run: null, …(3) }`
  at `tests/e2e/spec0018AskWithoutStartingE2E.test.ts:39:6`; the diff shows `runs: true` where `runs: false` is expected

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/workflow.ts b/packages/qfai/src/cli/commands/workflow.ts
index 85652c9c2..85c818284 100644
--- a/packages/qfai/src/cli/commands/workflow.ts
+++ b/packages/qfai/src/cli/commands/workflow.ts
@@ -695,7 +695,7 @@ async function start(options: WorkflowOptions): Promise<number> {
 // One operation of `qfai workflow`, printing one JSON document and returning its exit code.
 export async function runWorkflow(options: WorkflowOptions): Promise<number> {
   if (options.operation === "status") {
-    return status(options.root, path.join(options.root, RUNS_DIR), options.runId);
+    return underLock(options, null, () => status(options.root, path.join(options.root, RUNS_DIR), options.runId));
   }
   if (options.operation === "start") return start(options);
   return writeOperation(options);
```

- Round 1: Falsifiability revision: working-tree+01b73c86b33d915c3e8a727b1ffe49615b6b87fd496980a00d019f0e58c9600d
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 4dd0ce8c58830daa474506f9287e06bd364f09020fe9c52d24345bd97fe32ae1
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018AskWithoutStartingE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018AskWithoutStartingE2E.test.ts --testNamePattern='US-0018-0006 \(TDD-0460\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018AskWithoutStartingE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

### TDD-0462

- TDD-ID: TDD-0462
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018ChooseTheModeE2E.test.ts
- Selector: US-0018-0008 (TDD-0462)
- US-ref: US-0018-0008
- Branch: falsifiability — the test passed on its first run, because TDD-0372, TDD-0373 (`off` and `shadow`) and TDD-0378 (an invalid mode) already implement the story
- Predicate to break: packages/qfai/src/cli/commands/workflow.ts:688, `start` — a mode other than `active` returns the mode with no run, before the lock is taken or the payload read
- Mutation: `if (mode !== "active") {` to `if (mode === "active") {` at line 688
- Why it fails: under `off` and under `shadow` the start goes on under the lock and creates a run, so the document carries no `mode`.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018ChooseTheModeE2E.test.ts:54` fails as an assertion,
  `AssertionError: expected { off: { …, mode: undefined, runDirs: [ 'run-…' ], unchanged: false }, … }`
  `to deeply equal { off: { …, mode: 'off', runDirs: [], unchanged: true }, … }`; `shadow` differs the same way and `invalid` is unchanged
- Type check: after the `mode === null` return, `mode` is `"active" | "shadow" | "off"`, so `=== "active"` type-checks as `!== "active"` did

For each of `off`, `shadow` and `always`, the test runs `qfai init`, appends `workflow.mode` to `qfai.config.yaml`,
commits, writes a start input into the inbox, and calls the built CLI's `qfai workflow start --in`, then
`qfai workflow status`. It checks AC-0018-0037 (`off` and `shadow` return the mode, create no run and write nothing)
and AC-0018-0038 (a value outside the three is refused `fail-closed` with cause `invalid-mode` and exit 2, and no run
exists). The mutation takes AC-0018-0037, the story's core clause.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ChooseTheModeE2E.test.ts --testNamePattern='US-0018-0008 \(TDD-0462\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018ChooseTheModeE2E.test.ts > US-0018-0008 (TDD-0462): off and shadow write nothing, and an invalid mode is refused fail-closed 37034ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018ChooseTheModeE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/workflow.ts, `start`, a mode other than `active` returns the mode with no run, before the lock is taken
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ChooseTheModeE2E.test.ts --testNamePattern='US-0018-0008 \(TDD-0462\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on
  `AssertionError: expected { off: { exit: +0, …(4) }, …(2) } to deeply equal { off: { exit: +0, …(4) }, …(2) }`
  at `tests/e2e/spec0018ChooseTheModeE2E.test.ts:54:6`; under `off` and `shadow` the diff shows `mode: undefined`,
  one run directory and `unchanged: false`, and `invalid` is unchanged

The edit:

```diff
diff --git a/packages/qfai/src/cli/commands/workflow.ts b/packages/qfai/src/cli/commands/workflow.ts
index 85652c9c2..1f83469c0 100644
--- a/packages/qfai/src/cli/commands/workflow.ts
+++ b/packages/qfai/src/cli/commands/workflow.ts
@@ -685,7 +685,7 @@ async function startUnderLock(options: WorkflowOptions): Promise<number> {
 async function start(options: WorkflowOptions): Promise<number> {
   const mode = await modeOf(options.root);
   if (mode === null) return refuse(null, INVALID_MODE);
-  if (mode !== "active") {
+  if (mode === "active") {
     emit({ ok: true, run: null, mode });
     return EXIT_CODES.ok;
   }
```

- Round 1: Falsifiability revision: working-tree+383d6887d0ffd9fea4af1446a0d1dff65ca760f9247f591311478c8194b28b4e
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: e958a4d50c9bf7f2e6d480f1cc5f9c4d9f5a08ab386dd5a784b0621eec6a6b9a
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018ChooseTheModeE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ChooseTheModeE2E.test.ts --testNamePattern='US-0018-0008 \(TDD-0462\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ChooseTheModeE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

### TDD-0463

- TDD-ID: TDD-0463
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018HostCapabilityE2E.test.ts
- Selector: US-0018-0009 (TDD-0463)
- US-ref: US-0018-0009
- Branch: falsifiability — the test passed on its first run, because TDD-0232 (a capability gap is refused at `start`) and TDD-0240 (a failed first delegation blocks) already implement the story
- Predicate to break: packages/qfai/src/core/workflow/decide.ts:1334, `decideDelegation` — an unavailable first delegation halts with cause `unsupported-capability`
- Mutation: `const first = (snapshot.acceptedStages ?? []).length === 0;` to `const first = (snapshot.acceptedStages ?? []).length !== 0;` at line 1334
- Why it fails: the run is still `blocked`, but its halt becomes `{ blocker: "delegation-unavailable", owner: "operator", subjects: ["delegateSubAgent"] }`.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018HostCapabilityE2E.test.ts:68` fails as an assertion,
  `AssertionError: expected { …, halt: { blocker: 'delegation-unavailable', … } } to deeply equal { …, halt: { cause: 'unsupported-capability', … } }`
- Type check: `first` is a `boolean` either way, and both branches of the conditional already build a `WorkflowHalt`

The test runs `qfai init`, calls the built CLI's `qfai workflow start` with a capability report that lacks
`delegateSubAgent`, then starts a run with a full report, routes it, takes the discussion work order with `next` and
accepts a result whose delegation is `unavailable`. It checks AC-0018-0040 (the gap is refused `fail-closed` with cause
`unsupported-capability` and no run directory exists) and AC-0018-0041 (the failed first delegation leaves the run
`blocked`, naming `delegateSubAgent`). The mutation takes AC-0018-0041. A break of AC-0018-0040's predicate
(`unsupportedHarness`, `decide.ts:2077`) lets the gap start a run, and the test's next `start` is then refused
`run-active`, which the `startRun` helper throws on before the assertion runs.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018HostCapabilityE2E.test.ts --testNamePattern='US-0018-0009 \(TDD-0463\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018HostCapabilityE2E.test.ts > US-0018-0009 (TDD-0463): a capability gap is refused at start, and a failed first delegation blocks 18378ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018HostCapabilityE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/workflow/decide.ts, `decideDelegation`, an unavailable first delegation halts with cause `unsupported-capability`
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018HostCapabilityE2E.test.ts --testNamePattern='US-0018-0009 \(TDD-0463\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on
  `AssertionError: expected { refused: [ 2, …(2) ], …(4) } to deeply equal { refused: [ 2, …(2) ], …(4) }`
  at `tests/e2e/spec0018HostCapabilityE2E.test.ts:68:6`; the diff shows the halt as `blocker: "delegation-unavailable"`
  where `cause: "unsupported-capability"` is expected

The edit:

```diff
diff --git a/packages/qfai/src/core/workflow/decide.ts b/packages/qfai/src/core/workflow/decide.ts
index 56e7a7ecd..3b461c4c8 100644
--- a/packages/qfai/src/core/workflow/decide.ts
+++ b/packages/qfai/src/core/workflow/decide.ts
@@ -1331,7 +1331,7 @@ function decideDelegation(
     // SIMPLIFIED: every plan stage is taken to need a real delegation, so the first delegation
     // is the one of a run with no accepted stage.
     // Lift when: a plan or work order marks which stages need a real delegation.
-    const first = (snapshot.acceptedStages ?? []).length === 0;
+    const first = (snapshot.acceptedStages ?? []).length !== 0;
     const halt: WorkflowHalt = first
       ? { cause: "unsupported-capability", owner: "operator", subjects }
       : { blocker: "delegation-unavailable", owner: "operator", subjects };
```

- Round 1: Falsifiability revision: working-tree+715cc1373d3cda5c4f41c320adfe897036ceee2880891a67c3daf49e3412b16b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 4bc1b315e8299dbeb7b2ae5f90c91965072a339eabe8b4dfc88418b183276e8c
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018HostCapabilityE2E.test.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018HostCapabilityE2E.test.ts --testNamePattern='US-0018-0009 \(TDD-0463\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018HostCapabilityE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

### TDD-0464

- TDD-ID: TDD-0464
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0018ClaimAHostE2E.test.ts
- Selector: US-0018-0010 (TDD-0464)
- US-ref: US-0018-0010
- Branch: falsifiability — the test passed on its first run, because TDD-0428 (the eval record's shape) and TDD-0440 to TDD-0442 (the claim check) already implement the story
- Predicate to break: packages/qfai/README.md:763, the published README's `### Supported hosts` claim — no host is claimed before the release commit
- Mutation: replace line 763, `No host is declared supported in this release.`, with ``- Codex (`codex`)``
- Why it fails: the test substitutes its claim for that sentence, so with the sentence gone the published README keeps claiming `codex` alone.
  The claim check reports `codex` as claimed with no passing record and `claude-code` as recorded but not claimed.
  `expect({...}).toEqual({...})` at `tests/e2e/spec0018ClaimAHostE2E.test.ts:123` fails as an assertion,
  `AssertionError: expected { problems: [], blocked: false, recorded: [ …(2) ], unrecorded: [ …(3) ] } to deeply equal { …, recorded: [], unrecorded: [ …(2) ] }`
- Type check: the README is Markdown that the test reads as text; the build does not read it, so no type check is involved

The test starts no CLI. It builds a passing eval record for `claude-code` from the tracked routing seeds, as the manual
eval runner writes one, and writes it into a temp tree beside copies of both READMEs. It then runs the release's claim
check twice: with the READMEs claiming `claude-code`, and with them claiming `claude-code` and `codex`. It checks
AC-0018-0043's record (the record passes the eval-record check and its verdict is not blocked) and AC-0018-0044 (the
claimed hosts equal the hosts with a passing record for the current version, and no host is claimed before the
release commit). The claim check itself, `claimProblems` in `packages/qfai/tests/helpers/readmeClaim.ts`, is
test-side code that never ships, so the published README's claim is the only production artifact this row reads
that carries the story.

First run:

```text
cwd: packages/qfai
NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ClaimAHostE2E.test.ts --testNamePattern='US-0018-0010 \(TDD-0464\)' --reporter=verbose
 ✓ |e2e| tests/e2e/spec0018ClaimAHostE2E.test.ts > US-0018-0010 (TDD-0464): an eval record is written, the claim check passes, then fails on a claim with no record 73ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit 0
```

RED test manifest (proposed):

```text
packages/qfai/tests/e2e/spec0018ClaimAHostE2E.test.ts
packages/qfai/tests/fixtures/workflow/routing-seeds.jsonl
packages/qfai/tests/fixtures/workflow/token-vocabulary.json
packages/qfai/tests/helpers/readmeClaim.ts
packages/qfai/tests/helpers/routingEval.ts
packages/qfai/tests/helpers/tempTree.ts
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/README.md, `### Supported hosts`, the published claim that no host is declared supported before the release commit
- Round 1: Falsifiability command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ClaimAHostE2E.test.ts --testNamePattern='US-0018-0010 \(TDD-0464\)' --reporter=verbose
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on
  `AssertionError: expected { problems: [], blocked: false, …(2) } to deeply equal { problems: [], blocked: false, …(2) }`
  at `tests/e2e/spec0018ClaimAHostE2E.test.ts:123:79`; `recorded` holds two problems for `packages/qfai/README.md`
  and `unrecorded` holds three, the extra one reporting `claude-code` as recorded but not claimed

The edit:

```diff
diff --git a/packages/qfai/README.md b/packages/qfai/README.md
index e31adb6a2..edf9e84ce 100644
--- a/packages/qfai/README.md
+++ b/packages/qfai/README.md
@@ -760,7 +760,7 @@ that link. Your `.qfai/assistant/skills/` entry is untouched; re-create the link
 ### Supported hosts
 
 A host is declared supported for quality-gated automation once its adapter test passes and its routing eval is recorded for this release.
-No host is declared supported in this release.
+- Codex (`codex`)
 
 ### Cross-AI rules and the writing reminder
```

- Round 1: Falsifiability revision: working-tree+f080b3f6abaa5e2aaf79806ba980e15be1f642f9ab1b622d592686a1e6c69b41
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 04d2096d9ec5dd0ed86b2fe936b0e1cbbe57c0a8aeeaf03f6cb37af0dd9821c6
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0018ClaimAHostE2E.test.ts
packages/qfai/tests/fixtures/workflow/routing-seeds.jsonl
packages/qfai/tests/fixtures/workflow/token-vocabulary.json
packages/qfai/tests/helpers/readmeClaim.ts
packages/qfai/tests/helpers/routingEval.ts
packages/qfai/tests/helpers/tempTree.ts
```

- Round 1: Revision: 040df779f969c686b4691293753df01714598fce
- Round 1: GREEN command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ClaimAHostE2E.test.ts --testNamePattern='US-0018-0010 \(TDD-0464\)' --reporter=verbose
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1)

- Refactor verify command: cwd packages/qfai: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018ClaimAHostE2E.test.ts --reporter=verbose
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor
- Refactor verify revision: 040df779f969c686b4691293753df01714598fce

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | - | n/a | grilling(-@2026-09-25T16:12:02.339Z/none): none | - | - | PASS |
| 2 | acceptance-test-engineer | acceptance-test-engineer#1 | P1b-P4b: classify the six rows and hand each over on the falsifiability branch | the six test files; `02_User-stories.md`; `03_Acceptance-Criteria.md` | #tdd-0458 to #tdd-0464 | PASS |
| 3 | acceptance-test-engineer | acceptance-test-engineer#1 | grilling(S1@2026-09-25T16:25:34.799Z/agents): take the TDD-0464 mutation in `packages/qfai/README.md` | #tdd-0464 | #tdd-0464; the claim check is test-side code, so a mutation there would edit a test this stage does not own. No position disagreed | PASS |

## Final status (PASS/FAIL) + who confirmed

Pending.
