# Change Request

- ID: `CR-20260925-0006`
- Title: `Three spec-0003 workflow ownership tests pass with the guard they prove removed`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-25T00:20:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0003` `TDD-0045`, `TDD-0048` and `TDD-0054` are `done`. All three name
`packages/qfai/tests/integration/shippedWorkflowOwnership.test.ts`, and each
row's recorded proof breaks one guard in `packages/qfai/src/cli/commands/init.ts`.
On the current tree, breaking that guard leaves the row's own selector green. The
test cannot fail on the predicate the row claims to prove.

The cross-spec re-review replayed each proof in an isolated clone at `848174196`.
The test there is SHA-256
`6a14f8e6fc4a676895fffa2d7b618e2230bdde4e519f19e69e1d66b02344d304`, the same
bytes as at the merge base `f52301317` and on `origin/main`, so the defect is on
`main` as well. The source is SHA-256
`a500a0332f802120f22078a7f59e2e5c8bbbb1fc45aec46c3bbc9127eb5bad58`.

Each test misses its guard for a different reason:

| Row        | Guard the proof names                                                          | Why the test does not reach it                                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TDD-0045` | The prune predicate is retired-name membership, not a `qfai-` prefix match     | The orphan fixture is small enough to be digested. The prune's second check, the digest re-read after the move, then refuses it on its own, so the name predicate never decides.                                                                                                        |
| `TDD-0048` | `recordInstalledWorkflows` makes no filesystem mutation call of its own        | The test extracts a function body by taking the first `{` after `function <name>(`. In `recordInstalledWorkflows` that brace opens the type literal of the `settled` parameter (`init.ts` line 7591), so the test reads `dev: number; ino: number` and never sees the body.             |
| `TDD-0054` | The pre-init snapshot counts a name as absent only when no record entry exists | The declined fixture is also excluded from the copy set by the check `TDD-0051` owns, added in `abccaca33`. With the record check removed, the declined name still never reaches the copy, so no fresh entry is written and the assertion that the declined entry is kept still passes. |

## Reproduction

Each mutation was applied to `packages/qfai/src/cli/commands/init.ts` in the
isolated clone and the row's own selector was run. The source was restored
byte-identically after each run. The verbose logs of these runs were overwritten
by later runs, so the run records are what remains. Each excerpt below is quoted
from the named file under `tmp/cross-spec-mutations-qa/`.

`TDD-0045`, mutation from `cases16.json`:

```json
"from": "(entry) => entry.isFile() && prunableRetiredNames.has(entry.name)",
"to": "(entry) => entry.isFile() && entry.name.startsWith(\"qfai-\")"
```

`TDD-0054`, mutation from `cases16.json`:

```json
"from": "if (record.workflows[name] === undefined && !onDisk) {",
"to": "if (!onDisk) {"
```

Both, run from `packages/qfai` in the clone, with the row's own `-t` selector:

```text
node node_modules/vitest/vitest.mjs run tests/integration/shippedWorkflowOwnership.test.ts -t "TC-0003-0045 \(TDD-0045\): write and prune sets equal the shipped and retired name lists, not a glob" --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/integration/shippedWorkflowOwnership.test.ts -t "TC-0003-0054 \(TDD-0054\): an absent \(never-installed\) name is written and recorded, unlike declined" --reporter=verbose
```

Result from `runs16.json`, the same for both rows:

```json
"beforeSha256": "a500a0332f802120f22078a7f59e2e5c8bbbb1fc45aec46c3bbc9127eb5bad58",
"restored": true,
"mutantExit": 0,
"mutantOwnSelector": true,
"mutantAssertion": false,
"greenExit": 0,
"verdict": "REVISE"
```

`TDD-0048`, the recorded mutation from `cases8.json`. It plants one `rm(` call
at the top of the `recordInstalledWorkflows` body, so the mutated source reads:

```ts
  settled: Array<{ dev: number; ino: number } | null> | undefined,
): Promise<void> {
  await rm(path.join(destRoot, ".github", "workflows", ".qfai-mutation-probe"), { force: true });
  if (dryRun) {
```

```text
node node_modules/vitest/vitest.mjs run tests/integration/shippedWorkflowOwnership.test.ts -t "TC-0003-0048 \(TDD-0048\): write and removal path contains no filesystem call of its own" --reporter=verbose
```

Result from `runs8.json`:

```json
"restored": true,
"mutantExit": 0,
"mutantOwnSelector": true,
"mutantAssertion": false,
"greenExit": 0,
"verdict": "REVISE"
```

The extractor that causes the `TDD-0048` miss, at
`packages/qfai/tests/integration/shippedWorkflowOwnership.test.ts` lines 1107
and 1111:

```ts
const idx = source.indexOf(`function ${name}(`);
const braceStart = source.indexOf("{", idx);
```

The three mutations were replayed again on the head this record is reviewed
against, `03762f3cf`. There the source is SHA-256
`6465aa79efecadcabbdce3fd04303d987dda48a93313c04e7a081e4a3e054658` and the test
is still `6a14f8e6`. Each mutant survives with exit `0` and the source is
restored byte-identically (`tmp/xspec/runs2-replay.json`, labels
`0003-TDD-0045-prune-prefix-match`, `0003-TDD-0048-planted-rm` and
`0003-TDD-0054-record-check-removed`). The defect holds on both sources,
`a500a033` and `6465aa79`.

## Proposed change

Correct the three oracles so each fails when its guard is removed. No test
case, acceptance criterion or business rule changes.

1. `TDD-0045`: make the orphan fixture larger than the digest limit
   (`MAX_WORKFLOW_BYTES`, 1,048,576 bytes), so the digest re-check cannot refuse
   it and name membership is the only protection left.
2. `TDD-0048`: read the named function's body through the TypeScript parser
   instead of the first `{` after its name, so the whole executable body is
   searched whatever its parameter types contain.
3. `TDD-0054`: assert the record check where it alone decides, which is the
   pre-init snapshot. `captureShippedWorkflowPreInitState` computes the absent
   names and is not exported, so export it the way `resolveWorkflowCopySet` is
   exported for `TDD-0051`, and assert that a declined name is not absent. The
   copy-set exclusion then no longer masks the removed check.

Items 1 and 2 are drafted, and both fail on their recorded mutations
(`runs26.json`, test SHA-256
`9e49861577ebedd15a0703adcc7fa77b295901437ebaa8e3a72516fc18e076d9`).

A test edit that keeps each row's obligation is not an upstream reset.
`qfai-implement/references/checkpoint-verification.md` sends it to the in-place
re-verification of every `done` row the edit touches. So this record approves the
oracle repair and names the rows. It resets no row.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                                           |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `spec-0003/TDD-0045` | ledger-row | Its prefix-prune mutation survives: the digest re-check refuses the orphan on its own.   |
| `spec-0003/TDD-0048` | ledger-row | Its planted `rm(` survives: the extractor reads a parameter type, not the function body. |
| `spec-0003/TDD-0054` | ledger-row | Its record-check removal survives: the copy-set exclusion keeps the declined entry.      |

- Not blocked by this CR: `spec-0003` `TDD-0046`, `TDD-0047`, `TDD-0051` and
  `TDD-0052`, which name the same test file. The proofs of `TDD-0047`,
  `TDD-0051` and `TDD-0052` fail on the current test as recorded. The
  `TDD-0046` proof was taken on the drafted test; its `describe` block is the
  same in both, and it is re-run on the current test by the cross-spec review.
  The repair moves the file all four share, so they are re-verified under
  approved action 3, but they are not held.
- A row the cross-spec review later finds with the same defect is added to this
  table while the record is `open`. After approval it takes a record of its own.
- Overlapping open CRs: none names these three rows.

## Impact scope

- Specs: `spec-0003` (records this CR only)
- Plans: none
- Tests: `packages/qfai/tests/integration/shippedWorkflowOwnership.test.ts`, plus
  the export item 3 adds to `packages/qfai/src/cli/commands/init.ts`
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0003/09_delta.md`

## Decision needed from user

Approve the oracle repair for `spec-0003` `TDD-0045`, `TDD-0048` and `TDD-0054`,
with in-place re-verification of the seven `done` rows that name the test file?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver and time here. Run
   `/qfai-sdd spec-0003` in `confirm-only` mode. It records this CR in the
   `## Change Requests` table of `spec-0003/09_delta.md` and writes nothing else.
2. Repair the oracles as `## Proposed change` states. `/qfai-implement spec-0003`
   edits the parts of the test that belong to the `Unit` rows `TDD-0045` and
   `TDD-0048`, and makes the export in item 3. `/qfai-atdd spec-0003` edits the
   `describe` of the `Integration` row `TDD-0054`.
3. Re-verify in place every `done` row that names the file:
   `spec-0003/TDD-0045`, `TDD-0046`, `TDD-0047`, `TDD-0048`, `TDD-0051`,
   `TDD-0052` and `TDD-0054`. Follow `checkpoint-verification.md`: the row's
   selector re-run, its recorded mutation re-taken and reverted, the restored
   GREEN, the new test manifest and hash, and fresh `implementation-reviewer` and
   `completion-reviewer` verdicts. The three corrected rows also take
   falsifiability evidence for the corrected assertion, audited by
   `qa-gatekeeper`.
4. Fill `Resolution` and `Applied at` once every row in step 3 is re-verified.

## Resolution

Pending explicit approval and the owner rerun.
