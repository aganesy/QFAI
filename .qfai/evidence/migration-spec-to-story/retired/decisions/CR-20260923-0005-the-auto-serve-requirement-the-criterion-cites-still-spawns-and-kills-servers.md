# Change Request

- ID: `CR-20260923-0005`
- Title: `The auto-serve requirement the criterion cites still spawns and kills servers`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T07:30:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T07:31:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T07:32:21Z` — see Resolution
- Superseded by: `-`

## Context

`CR-20260923-0002` restated the auto-serve chain as a runner contract with an
in-process default runner. It restated `REQ-0012-0076`, `AC-0012-0060`,
`BR-0012-0048`, `EX-0012-0169` (by adding an example) and `TC-0012-0442`.

The criterion and the case cite a different requirement, and three statements
still describe the product before that restatement:

| Artifact                      | What it says                                                                                                                    | What the restated chain says                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `REQ-0012-0062`               | iterate spawns the server, kills child processes with `tree-kill`, force-kills a stale earlier iterate, reports PID and command | iterate calls a runner, invokes its teardown, continues on a recovered owner, exits 2 on a refusal |
| `US-0012-0126`                | iterate can "spawn / teardown" a server "with safe foreign-process detection"                                                   | iterate starts a server through a runner, and the default runner refuses a held port               |
| `EX-0012-0169`, first example | iterate detects the foreign owner, reports its PID and owning command, and force-kills an earlier iterate                       | the runner reports the refusal, and iterate exits 2 with the runner's reason                       |

`AC-0012-0060` names `REQ-0012-0062` in its `REQ-Refs`, and `TC-0012-0442`
verifies it. So every row on those two cases answers a requirement that
contradicts the criterion they pin.

## Options (at least 3) and recommendation

| #   | Option                                                                                | Cost                           | Risk                                                                        | Recommended |
| --- | ------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- | ----------- |
| 1   | Restate the three statements as the runner contract `CR-20260923-0002` approved       | Three statements               | None found; no product or test change                                       | ✅          |
| 2   | Point `AC-0012-0060` and `TC-0012-0442` at `REQ-0012-0076` and retire `REQ-0012-0062` | Two references, one retirement | `REQ-0012-0062` is the requirement other artifacts cite for the flag itself |             |
| 3   | Leave the statements and record the contradiction as accepted                         | None                           | The rows pin a contract their own requirement contradicts                   |             |

## Proposed change

Option 1, as `/qfai-sdd spec-0012` re-derive.

1. `REQ-0012-0062` states the opt-in flag, default off, and the runner contract:
   iterate calls the runner once, invokes the teardown it returns at cycle end
   and on SIGINT, continues when the runner reports a recovered owner, and exits
   2 with the runner's reason when it refuses.
2. `US-0012-0126` wants iterate to start and tear down a local server through a
   runner that refuses a port another process holds.
3. `EX-0012-0169`'s first example has a runner refuse a foreign owner, and
   iterate exit 2 with the runner's reason on stderr.

`TC-0012-0462`, which also cites `REQ-0012-0062` for the SIGINT path, is outside
this record: restating it reopens a completed row of its own.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact      |
| -------------------- | ------------ | ----------------------------------- |
| `spec-0012/TDD-0469` | `ledger-row` | Its case verifies `REQ-0012-0062`   |
| `spec-0012/TDD-0561` | `ledger-row` | Its criterion cites `REQ-0012-0062` |
| `spec-0012/TDD-0562` | `ledger-row` | Its case verifies `REQ-0012-0062`   |
| `spec-0012/TDD-0563` | `ledger-row` | Its case verifies `REQ-0012-0062`   |
| `spec-0012/TDD-0564` | `ledger-row` | Its case verifies `REQ-0012-0062`   |

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/02_User-stories.md`,
  `.qfai/specs/spec-0012/05_Examples.md`, `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: restate `REQ-0012-0062`, `US-0012-0126` and the first example
of `EX-0012-0169` as the runner contract?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, makes the edits in
   `## Proposed change` and records this request in `09_delta.md`.
2. `/qfai-implement spec-0012` re-runs the refactor verify of the five rows on
   the restated tree and asks both reviewers again.

## Resolution

Applied under option 1.

- `REQ-0012-0062` states the flag and the runner contract.
- `US-0012-0126` asks for a server started through a runner that refuses a held port.
- `EX-0012-0169`'s first example has a runner refuse and iterate exit 2 with its reason.
- `09_delta.md` records this request.
