# Change Request

- ID: `CR-20260913-0030`
- Title: `The aggregate mirror is specified on convergence and runs after every capture pass`
- Raised by: `Claude Code`
- Raised at: `2026-09-13T08:03:53Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Every upstream statement about the aggregate mirror places it on convergence,
and names what it copies as the accepted iteration.

| Artifact                                          | Statement                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `spec-0012` `REQ-0012-0066`                       | "On convergence (exit 64), `iterate` MUST mirror accepted-iter content" into `screenshots/<screen-id>.png` and `html/<screen-id>.html` |
| `spec-0012` `US-0012-0130`                        | accepted-iter content mirrored "on convergence"                                                                                        |
| `spec-0012` `AC-0012-0064`                        | "Given a converged iter with N declared screens, When `iterate` mirrors accepted-iter content", both files exist for every screen      |
| `spec-0012` `BR-0012-0052`                        | "On convergence (exit 64), iterate MUST mirror the accepted-iter content"                                                              |
| `spec-0012` `EX-0012-0173`                        | "Given a converged iter with declared `screens[].id`", the four aggregate files exist                                                  |
| `spec-0012` `TC-0012-0448`                        | a "converged iter" mirrors to both directories                                                                                         |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md` | § Convergence + handoff: "On convergence (exit 64 path with `stopReason: \"converged\"`), iterate mirrors the accepted-iter content"   |
| `.qfai/contracts/cli/qfai-prototyping.md`         | § Screen-id casing: "Aggregate-dir mirror on convergence"                                                                              |

The product mirrors at a different point.

| File                                                                                      | What it does                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/src/cli/commands/prototypingIterate.ts`                                    | `runCapturePath` ends with `mirrorAcceptedIterToAggregateDirs(options.root, options.cycle)`: every capture pass copies the iteration it has just captured, before that iteration is reviewed                                                  |
| `packages/qfai/src/cli/commands/prototypingIterate.ts`                                    | The converged stop is decided by a later invocation, which reads the recorded iterations and exits 64 without capturing. Nothing is mirrored on that path                                                                                     |
| `packages/qfai/tests/integration/cli/commands/prototypingIterate.aggregateMirror.test.ts` | Runs `--cycle 0 --capture`, which cannot have converged, and requires both directories to hold that capture. The file carries `TC-0012-0448`, and its row `spec-0012/TDD-0484` is `done` with evidence naming the call at the end of the pass |

The two readings agree once a loop converges, because the accepted iteration
is the last one captured. They part in two states:

| State                                   | Upstream reading                 | Product                                     |
| --------------------------------------- | -------------------------------- | ------------------------------------------- |
| A loop still running                    | Nothing mirrored yet             | The latest capture, which review may reject |
| A loop stopped at max iterations (`65`) | Nothing mirrored — none accepted | The last capture, which was never accepted  |

The helper's own name, `mirrorAcceptedIterToAggregateDirs`, and the comment at
its call describe the upstream reading. The argument it is given is the cycle
being captured.

## Proposed change

Settle when the aggregate directories are written, and make the spec chain,
both contracts, the product and `TC-0012-0448`'s test say the same.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                               | Cost                                                                                                                                                                                                                                                | Risk                                                                                                                                                                                                                                            | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The product is right. Reword the chain and both contracts: each capture pass mirrors the iteration it captured, so the directories hold the loop's latest capture, which is the accepted one once the loop converges | `REQ-0012-0066`, `US-0012-0130`, `AC-0012-0064`, `BR-0012-0052`, `EX-0012-0173` and `TC-0012-0448` through a `spec-0012` re-derive; both contract clauses through a contract rerun; `spec-0012/TDD-0484` re-taken against the reworded case         | The directories stop meaning "accepted". A handoff reader has to check `stopReason` first, and after a max-iterations stop it finds an unaccepted capture where the directories used to promise an accepted one                                 |             |
| 2   | The statements are right. The capture pass stops mirroring, and the converged stop copies the iteration `acceptedIterationIndex` names into both directories                                                         | `runCapturePath` and the converged stop path in `prototypingIterate.ts`; `prototypingIterate.aggregateMirror.test.ts` rebuilt to reach a converged stop before asserting; `spec-0012/TDD-0484` reset and re-taken. No spec or contract text changes | The converged stop, which only reports today, gains a write, and a loop stopped at max iterations leaves the directories empty. While the loop runs the required-path check finds the captures in `iter-NN/` instead, so no gate result changes | ✅          |
| 3   | Keep the mirror on every capture pass and reword the chain as in option 1, and have a max-iterations stop move the directories aside, so a stopped loop leaves them holding only an accepted iteration               | Option 1's rewording, plus a rule, an example, a test case and a ledger row for the stop, and the move in `prototypingIterate.ts`                                                                                                                   | Two writers decide what the directories hold. Moving the last capture away at a stop hides it from an operator working out why the loop did not converge                                                                                        |             |

Option 2 is recommended. Eight statements across the spec chain and two
contracts say the same thing, and the helper's name and its call-site comment
say it too; the call passes the wrong iteration. Option 2 corrects one call and
its test, and leaves the directories meaning what every document already says
they mean: the accepted handoff, and nothing before there is one. Option 1 is
the smallest change to the product but rewrites the chain to describe a state
the handoff never wanted. Option 3 keeps option 1's cost and adds a second
writer.

## Blocked downstream items

| Item                                                                                                                                                        | Kind         | Why it depends on the artifact                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `spec-0012/TDD-0484`                                                                                                                                        | `ledger-row` | Its case and its evidence name the mirror at the end of the capture pass, which options 1–3 change |
| `spec-0012/REQ-0012-0066`; `spec-0012/US-0012-0130`; `spec-0012/AC-0012-0064`; `spec-0012/BR-0012-0052`; `spec-0012/EX-0012-0173`; `spec-0012/TC-0012-0448` | `spec`       | Options 1 and 3 reword them                                                                        |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md` § Convergence + handoff                                                                                   | `contract`   | Options 1 and 3 reword it                                                                          |
| `.qfai/contracts/cli/qfai-prototyping.md` § Screen-id casing, the aggregate mirror bullet                                                                   | `contract`   | Options 1 and 3 reword it                                                                          |

- Not blocked by this CR: `spec-0012/TDD-0487` and the underscore casing it
  checks, which hold whenever the mirror runs; `spec-0012/TDD-0485` and the
  cycle-0 backup, which do not read the mirror.
- Overlapping open CRs: `CR-20260913-0002`. Its option 2 describes the
  directories as the loop's latest capture and has each capture pass replace
  what they hold, which is option 1 here; under option 2 here that part of it
  would name the converged stop instead. Both block
  `.qfai/contracts/cli/qfai-prototyping-iterate.md`.

## Impact scope

- Specs: `spec-0012`
- Plans: `-`
- Tests: `packages/qfai/tests/integration/cli/commands/prototypingIterate.aggregateMirror.test.ts` / `spec-0012/TDD-0484`
- Contracts: `-` — `.qfai/contracts/cli/qfai-prototyping-iterate.md`, `.qfai/contracts/cli/qfai-prototyping.md`
- Schema: `-`
- Upstream paths edited under this CR, by outcome:

  | Path                                              | Kept under      |
  | ------------------------------------------------- | --------------- |
  | `.qfai/specs/spec-0012/01_Spec.md`                | options 1 and 3 |
  | `.qfai/specs/spec-0012/02_User-stories.md`        | options 1 and 3 |
  | `.qfai/specs/spec-0012/03_Acceptance-Criteria.md` | options 1 and 3 |
  | `.qfai/specs/spec-0012/04_Business-Rules.md`      | options 1 and 3 |
  | `.qfai/specs/spec-0012/05_Examples.md`            | options 1 and 3 |
  | `.qfai/specs/spec-0012/06_Test-Cases.md`          | options 1 and 3 |
  | `.qfai/specs/spec-0012/tdd/test-list.md`          | every option    |
  | `.qfai/contracts/cli/qfai-prototyping-iterate.md` | options 1 and 3 |
  | `.qfai/contracts/cli/qfai-prototyping.md`         | options 1 and 3 |

## Decision needed from user

When should `qfai prototyping iterate` write the aggregate `screenshots/` and
`html/` directories: after every capture pass, with the documents reworded to
match (option 1); only when the loop converges, copying the accepted iteration
as the documents already say (option 2); or after every capture pass with a
max-iterations stop moving them aside (option 3)?

## Approved actions (owner skill rerun plan)

1. Owner skill rerun scope:
   - Option 1: `/qfai-sdd spec-0012`, mode `re-derive`, over `REQ-0012-0066`,
     `US-0012-0130`, `AC-0012-0064`, `BR-0012-0052`, `EX-0012-0173` and
     `TC-0012-0448`; `/qfai-sdd --contract` for
     `.qfai/contracts/cli/qfai-prototyping-iterate.md` § Convergence + handoff
     and the aggregate mirror bullet of `.qfai/contracts/cli/qfai-prototyping.md`.
   - Option 2: `/qfai-implement spec-0012` on `TDD-0484`: move the mirror from
     `runCapturePath` to the converged stop, copying the iteration
     `acceptedIterationIndex` names, and rebuild
     `prototypingIterate.aggregateMirror.test.ts` to reach that stop.
   - Option 3: option 1's reruns, with `/qfai-sdd spec-0012` also adding the
     rule, example and test case for the max-iterations stop, then
     `/qfai-implement spec-0012` on the rows it seeds.
2. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `spec-0012/TDD-0484`, under every option.
   - Retire: none.

## Resolution
