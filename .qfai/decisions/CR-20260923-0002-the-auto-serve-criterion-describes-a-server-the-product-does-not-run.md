# Change Request

- ID: `CR-20260923-0002`
- Title: `The auto-serve criterion describes a server the product does not run`
- Raised by: `claude-code`
- Raised at: `2026-09-23T01:30:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T01:30:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T06:43:33Z` — see Resolution
- Superseded by: `-`

## Context

`spec-0012` states the `--auto-serve` obligation as a spawned server:

| Artifact        | What it requires                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REQ-0012-0076` | A default spawn runner torn down with `tree-kill` or `taskkill /F /T`                                                                             |
| `AC-0012-0060`  | Spawn a local server, tear it down with `tree-kill` / `taskkill /F /T`, force-kill a stale prior-iterate owner, refuse a foreign one with its PID |
| `BR-0012-0048`  | The same teardown, recovery and refusal                                                                                                           |
| `EX-0012-0169`  | A foreign owner of port 3000 refused with `PID=12345 owning command=…`                                                                            |
| `TC-0012-0442`  | Blocks (b), (c) and (d) verify that teardown, recovery and refusal                                                                                |

The product ships an in-process Node HTTP server as the default runner.
`packages/qfai/src/core/prototyping/defaultServerRunner.ts` says why in its
own docblock: there is no child PID to track and no process tree to kill. On
`EADDRINUSE` it refuses and says the port is already in use, and names no PID.

The teardown, recovery and refusal the criterion names are real behaviour of
the runner contract, not of the default runner. `iterate` accepts an injected
`ServerRunnerFn`, and
`packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts`
verifies what `iterate` does with a runner's teardown, its recovery answer and
its refusal. No statement describes the default runner the operator actually
gets.

## Reproduction

```text
$ grep -n "IN-PROCESS\|already in use" packages/qfai/src/core/prototyping/defaultServerRunner.ts
33: * spawn an EXTERNAL server subprocess. The default ships an
34: * IN-PROCESS Node HTTP server instead: no child PID to track, no
45: * It returns `{ ok: false, reason: "...already in use; refusing to
```

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                           | Cost                                                                         | Risk                                                                                                                    | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Restate the chain in two parts: the runner contract `iterate` holds any runner to, and the default runner, which is in-process and refuses a port already in use | Five statements restated, one case added. No product change                  | None found. Every clause the tests verify keeps a statement, and the default runner gains one                           | ✅          |
| 2   | Make the product match the criterion: ship a default runner that spawns a server subprocess and kills its tree                                                   | A new runner, a process-tree dependency, and tests for it on three platforms | It reverses the reason the default is in-process, and leaves a process tree to clean up when the operator's run crashes |             |
| 3   | Withdraw the teardown, recovery and refusal clauses                                                                                                              | Five statements narrowed                                                     | The runner contract the tests verify loses its statement, and the refusal NFR-0106 names has nothing to rest on         |             |

## Proposed change

Option 1.

1. `REQ-0012-0076` is restated in English: `--auto-serve` starts a local server
   through a server runner. The default runner is an in-process Node HTTP
   server. A runner is torn down at the end of the cycle and on SIGINT within
   the NFR-0106 bound.
2. `AC-0012-0060` keeps its default-off clause and restates the rest in two
   parts:
   - `iterate` MUST call the runner once, invoke the teardown it returns at
     cycle end and on SIGINT, continue when the runner reports a recovered
     prior owner, and exit 2 reporting the runner's reason when the runner
     refuses;
   - the default runner MUST serve in-process and MUST refuse a port another
     process holds, naming the port, rather than pick another one.
3. `BR-0012-0048` is restated the same way. A runner that spawns a server
   subprocess tears down its tree with `tree-kill` or `taskkill /F /T` and
   never kills a process it did not start; that clause stays, scoped to such a
   runner.
4. `EX-0012-0169` gains a second example for the default runner: port 3000 in
   use, `iterate --auto-serve` exits 2 and names the port.
5. `TC-0012-0442` is restated so its four blocks name what they verify: the
   runner contract. One case is added for the default runner's refusal of a
   port in use.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                             |
| -------------------- | ------------ | -------------------------------------------------------------------------- |
| `spec-0012/TDD-0469` | `ledger-row` | Its case is `TC-0012-0442`, which this record restates                     |
| `spec-0012/TDD-0515` | `ledger-row` | It binds `REQ-0012-0076`, which `CR-20260923-0001` also puts on a new case |

- Overlapping open records: `CR-20260923-0001` puts `TDD-0515` on a new case
  under `AC-0012-0060`. Applied first, that case is restated with the criterion
  here. Applied second, this record's restatement is the criterion that case is
  written under.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `spec-0012/TDD-0469` and the new case's row, against
  `packages/qfai/tests/integration/cli/commands/prototypingIterate.autoServe.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md`,
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: restate the auto-serve chain as a runner contract plus an
in-process default runner, with no product change?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, over the five artifacts above. It
   records this Change Request in `spec-0012/09_delta.md`'s
   `## Change Requests` table and makes the edits in `## Proposed change`, and
   no other upstream edit. Its Phase 2b seeds one `Integration` row at `todo`
   for the default runner's refusal case.
2. Downstream ledger sweep: `spec-0012/TDD-0469` is re-verified against the
   restated `TC-0012-0442` by `/qfai-implement`. Its tests are unchanged, so the
   falsifiability path applies.
3. `/qfai-atdd spec-0012` binds the new row to a test of the default runner's
   refusal.

## Resolution

Approved under option 1, the recommendation. It adds no product code and keeps
a statement for every clause the tests verify, where option 2 reverses the
reason the default runner is in-process and option 3 drops the runner contract.

Applied under option 1.

- `REQ-0012-0076`, `AC-0012-0060` and `BR-0012-0048` state the runner contract
  `iterate` holds a runner to, and the in-process default runner that refuses a
  port another process holds, naming the port.
- `BR-0012-0048` keeps the `tree-kill` / `taskkill /F /T` teardown, scoped to a
  runner that spawns a server subprocess.
- `EX-0012-0169` carries a second example: port 3000 in use, and
  `iterate --auto-serve` exits 2 naming the port.
- `TC-0012-0442` names the runner contract its four blocks verify.
  `TC-0012-0489` is the case for the default runner's refusal.
- `TDD-0561` is seeded for `TC-0012-0489`, at `todo`, with this record in
  `DR-ID`.
- `spec-0012/09_delta.md` records this request.
