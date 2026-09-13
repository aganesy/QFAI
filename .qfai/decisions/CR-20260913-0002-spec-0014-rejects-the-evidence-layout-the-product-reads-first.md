# Change Request

- ID: `CR-20260913-0002`
- Title: `spec-0014 rejects the prototyping evidence layout the product reads first`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T20:29:34Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`AC-0014-0005` says the legacy `screenshots/` / `html/` directory layout "is no
longer accepted as the active SSOT", and `TC-0014-0033` compresses that to
"active layout uses `.qfai/evidence/prototyping/iter-NN/` only".

The product accepts it, reads it first, documents it as the required path, and
keeps writing it.

| File                                                       | What it does                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts` | `hasEvidenceFile` tests `<prototyping root>/screenshots/<screen-id>.png` before it scans for an `iter-NN` file     |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts` | The issue's location and its suggested action both name the legacy path first                                      |
| `packages/qfai/src/cli/commands/validate.ts`               | Documents `.qfai/evidence/prototyping/screenshots/<screen-id>.png` as where a declared screen's screenshot lives   |
| `packages/qfai/src/cli/commands/prototypingIterate.ts`     | `mirrorAcceptedIterToAggregateDirs` copies each accepted iteration into `screenshots/` and `html/` after every run |

Two cases in `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`
require a project carrying only the legacy layout to report no issue.

**Two statements take a position, and both are the ones the product
contradicts.** The rest of the pack holds under either reading:

| Layer                 | What it states                                                                | Takes a position on the aggregate directories |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| `01_Spec.md` Scope.In | the legacy layout "is no longer **the** active SSOT"                          | no — true of a derived copy as well           |
| `AC-0014-0005`        | the legacy layout "is no longer **accepted as** the active SSOT"              | **yes — it rejects them as a source**         |
| `BR-0014-0005`        | legacy paths "MUST not be **required**"                                       | no — rejecting them does not require them     |
| `EX-0014-0026`        | an `iter-03` capture is accepted and no legacy required-path lookup is raised | no — true whether the directories are read    |
| `TC-0014-0033`        | the active layout uses `iter-NN` "**only**"                                   | **yes — it restates the criterion**           |

**Two authoritative artifacts outside this pack take the opposite position.**
The mirror is the only writer of the aggregate directories. The iterate
contract names what it writes as the SSOT, the shared policy defines the
mandatory evidence by those paths, and `spec-0012` requires the write and says
nothing about what a required-path check reads:

| Artifact                                            | Statement                                                                                                                                      | Takes a position on reading the aggregate directories |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md`   | on convergence, iterate "mirrors the accepted-iter content into the **aggregate-dir SSOT**", and the screenshot copy is "Required for handoff" | **yes — it names them the SSOT**                      |
| `_policies/06_Glossary.md`, "mandatory UI evidence" | the term is defined as `screenshots/<screen-id>.png` and `html/<screen-id>.html`, both required for every declared screen                      | **yes — it defines the evidence by those paths**      |
| `_policies/07_Constraints.md` `TC-07`               | a declared screen's screenshot and HTML snapshot are both mandatory, as the blocking condition of `QFAI-UIE-001/002`                           | **yes, through the glossary term it gates on**        |
| `spec-0012` `REQ-0012-0066`                         | on convergence, `iterate` **MUST** mirror accepted-iter content into `screenshots/<screen-id>.png` and `html/<screen-id>.html`                 | no — it requires the write, not a read                |
| `spec-0012` `AC-0012-0064` → `TC-0012-0448`         | the chain below that requirement, resolving `OQ-0110` as its Option A; `TC-0012-0448`'s row `TDD-0484` is `done`                               | no, for the same reason                               |

So the criterion does not contradict a leftover the product forgot to remove.
The directories are a handoff output `spec-0012` requires, the iterate contract
and the shared policy name them the evidence, and the lookup that reads them
first reads what both say is there.

**A reset leaves the aggregate copies in place.** `iterate --cycle 0 --force`
backs up `iter-00/` and removes every `iter-NN/` directory
(`packages/qfai/src/cli/commands/prototypingIterate.ts:867`, which calls the
helper whose name filter is at `:2405`), and the aggregate directories are
written only by a capture pass (`:1504`). A loop restarted without `--capture`
therefore keeps the previous loop's accepted files there, and `hasEvidenceFile`
(`packages/qfai/src/core/validators/uiEvidenceArtifacts.ts:39-42`) accepts them
before it looks at any `iter-NN/` directory. A required-path check that reads
the aggregate directories can pass a new loop on the old loop's evidence.

## Proposed change

Settle whether the aggregate directories are an evidence source a required-path
check may read, and make the pack, the contract and the shared policy state the
same answer.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                                                                                                                                                                | Cost                                                                                                                                                                                                                                                                                                                                                                                  | Risk                                                                                                                                                                                                                                                                                    | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The criterion is right. The required-path check reads `iter-NN/` only. **The mirror keeps writing** the aggregate directories, as `spec-0012` requires, for handoff; verify stops treating them as an evidence source                                                                                                                                 | A product change to the lookup and its documented path, with the two aggregate-only cases inverted; the iterate contract's "aggregate-dir SSOT" re-scoped to a handoff copy; the glossary's "mandatory UI evidence" and `TC-07` re-scoped to the `iter-NN/` paths through a policy rerun; `TDD-0033` reset and re-pointed through a `spec-0014` rerun. No `spec-0014` statement moves | A project whose screenshots exist only in the aggregate directories — placed there by hand rather than produced by `iterate` — fails the gate after upgrade, with the files still on disk. The shared evidence definition changes for every spec, not only this one                     |             |
| 2   | The code is right. Narrow `AC-0014-0005` and `TC-0014-0033` to what the iterate contract and the policy already say: the aggregate directories are the handoff copy a required-path check may read, and evidence read through them does not record its iteration. **A cycle-0 reset moves the aggregate directories into its backup** with `iter-00/` | Two statements and the delta row that records them; the reset path in `prototypingIterate.ts` and a case pinning that a restarted loop carries no aggregate file while the backup keeps it; the contract's cycle-0 reset clause, which names what a reset removes, through a contract rerun. The two aggregate-only cases already discriminate the narrowed criterion                 | The pack stops asserting that the aggregate directories are rejected, and evidence satisfying the gate through them does not say which iteration produced it. A loop restarted without `--capture` fails the gate until it captures, where today it passes on the previous loop's files | ✅          |
| 3   | Withdraw the layout criterion and its chain. Retire `AC-0014-0005` and `TC-0014-0033` — and `BR-0014-0005` and `EX-0014-0026` with them, because `AC-0014-0005` is that rule's only parent and a rule cannot stand without one                                                                                                                        | Four statements, the ledger row and its reservation                                                                                                                                                                                                                                                                                                                                   | No rule a case can discharge then says where prototyping evidence lives: `01_Spec.md`'s Scope.In still names `iter-NN/` as the active layout, in prose no case reads. A restarted loop keeps passing on the previous loop's aggregate files, and no rule says it must not               |             |

Under every option the `spec-0014` rerun runs Phase 2b, which also migrates
the pack's eight-column ledger to the template's columns and seeds one `E2E`
row at `todo` for each of its five stories, none of which has one: this
repository declares no UI-bearing spec, so every story is active. Those rows
are owed whatever is chosen, and they are listed so the approval covers them.

**Stopping the mirror is not offered.** Nothing in the criterion requires it:
the criterion is about what verify accepts as a source, not about what
`iterate` writes. Stopping it would withdraw `spec-0012`'s `MUST` chain and the
contract's handoff output to settle a question neither of them is party to.

Option 2 is recommended because it keeps what every other authoritative
artifact already says. The iterate contract names the aggregate directories the
SSOT and requires them for handoff, the shared policy defines the mandatory
evidence by those paths, and the product reads them first; option 2 brings the
criterion into line with all three. Option 1 edits the product, the contract and
a definition every spec shares to follow one criterion that cites none of them,
and a project whose evidence exists only in those directories starts failing
the gate. `spec-0012` takes no side: it requires the mirror to be written under
every option.

Option 2 also moves the aggregate directories aside on a cycle-0 reset,
because without that it would keep a gate that passes a restarted loop on the
previous loop's files. Moving them into the reset's backup rather than deleting
them keeps what may be the only copy of the previous loop's accepted handoff:
the backup holds `iter-00/` alone, and the later `iter-NN/` directories are
removed. It is what makes "the handoff copy of the current loop" true of what
the check reads.

What option 2 costs is worth naming rather than discounting. The aggregate
directories hold one file per screen, so a screen captured in two iterations
keeps only the last accepted one, and evidence accepted through that path
cannot say which iteration produced it. That is the substance the criterion was
reaching for, and option 1 is the answer that keeps it. The narrowed criterion
should state the limitation in as many words, so the next reader meets it
rather than discovering it.

## Blocked downstream items

| Item                                                                                       | Kind         | Why it depends on the artifact                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `spec-0014/TDD-0033`                                                                       | `ledger-row` | Its `TC-Refs` is `TC-0014-0033`, whose `Expected` is the clause in dispute. The two aggregate-only cases in `uiEvidenceArtifacts.test.ts` discriminate it, and they pass under option 2 and fail under option 1, so the row can record nothing until one is chosen |
| `spec-0014/TC-0014-0033`                                                                   | `spec`       | The test case restates the criterion, so it moves with whatever the criterion becomes                                                                                                                                                                              |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md`                                          | `contract`   | Option 1 re-scopes its "aggregate-dir SSOT" wording and option 2 its cycle-0 reset clause, so no other contract rerun may advance either while the choice is open                                                                                                  |
| `_policies/06_Glossary.md`, "mandatory UI evidence"; `_policies/07_Constraints.md` `TC-07` | `spec`       | Option 1 re-scopes the evidence they define, so no other policy rerun may reword them while the choice is open                                                                                                                                                     |

- Not blocked by this CR: every other `spec-0014` row. `TDD-0034` is held by a
  separate obstacle recorded with it — its selector names one case asserting
  five outcomes — and `TDD-0028` and `TDD-0029` sit at `exception` and owe no
  completed evidence. None of the three turns on which layout is a source.
- Not blocked either: `spec-0012/TDD-0484` and `TDD-0493`. No option stops the
  mirror, so the obligations those rows carry hold under every outcome.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0014`; and `_policies` under option 1
- Plans: `none`
- Tests: `spec-0014/TDD-0033` — `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`;
  and under option 2 `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Contracts: `none` under option 3; under options 1 and 2 the iterate command's
  contract, `.qfai/contracts/cli/qfai-prototyping-iterate.md`
- Schema: `none`
- Upstream paths edited under this CR, by outcome:

  | Path                                              | Kept under      |
  | ------------------------------------------------- | --------------- |
  | `.qfai/specs/spec-0014/03_Acceptance-Criteria.md` | options 2 and 3 |
  | `.qfai/specs/spec-0014/04_Business-Rules.md`      | option 3        |
  | `.qfai/specs/spec-0014/05_Examples.md`            | option 3        |
  | `.qfai/specs/spec-0014/06_Test-Cases.md`          | options 2 and 3 |
  | `.qfai/specs/spec-0014/09_delta.md`               | every option    |
  | `.qfai/specs/spec-0014/tdd/test-list.md`          | every option    |
  | `.qfai/contracts/cli/qfai-prototyping-iterate.md` | options 1 and 2 |
  | `.qfai/specs/spec-0012/09_delta.md`               | options 1 and 2 |
  | `.qfai/specs/_policies/06_Glossary.md`            | option 1        |
  | `.qfai/specs/_policies/07_Constraints.md`         | option 1        |
  | `.qfai/specs/_policies/10_delta.md`               | option 1        |

  **This section is reduced to the approved outcome before `Status: approved` is
  written**: `QFAI-DRIFT-001` reads the spec and contract paths here and not
  the outcome beside them.

  `spec-0012/09_delta.md` is there because the iterate contract is indexed to
  `spec-0012`, the one spec that references it, and a contract rerun records
  its Change Request in the delta of every referencing spec.

  **Product paths**, listed so an approval says what it covers. Under option 1:
  `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`,
  `packages/qfai/src/cli/commands/validate.ts`, and
  `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`. Under option 2:
  `packages/qfai/src/cli/commands/prototypingIterate.ts`, for what a cycle-0
  reset moves aside, and `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`.
  No option changes what the mirror writes. Neither
  `packages/qfai/src/core/validators/skill/prototypingSkill.ts` nor the shipped
  `qfai-prototyping` skill is among them: the skill-text check already accepts
  the `iter-NN/` pair, and the skill already carries it.

  `01_Spec.md` is **not** here under any option. Its Scope.In line holds under
  every reading, so no approved action edits it.

## Decision needed from user

Is a prototyping evidence file that exists only in the aggregate `screenshots/`
/ `html/` directories acceptable to a required-path check — so the pack narrows
its criterion to match the iterate contract and the shared policy, and a
cycle-0 reset moves those directories into its backup (option 2) — or not, so verify reads
`iter-NN/` only while the mirror keeps writing for handoff, and the shared
evidence definition moves with it (option 1)? Or should the pack withdraw its
layout obligation altogether (option 3)?

## Approved actions (owner skill rerun plan)

1. Owner reruns, by outcome:

   | Option | Reruns                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
   | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | 1      | `/qfai-sdd --contract .qfai/contracts/cli/qfai-prototyping-iterate.md`, mode `re-derive`: "aggregate-dir SSOT" is re-scoped to the handoff copy it is; the contract declares no ID, so the path form names it. `/qfai-sdd`, mode `re-derive`: the glossary's "mandatory UI evidence" and `TC-07` name the `iter-NN/` paths. `/qfai-sdd spec-0014`, mode `re-derive`: no statement moves, and Phase 2b re-points `TDD-0033`. The product change follows under `/qfai-implement` |
   | 2      | `/qfai-sdd spec-0014`, mode `re-derive`: `AC-0014-0005` says the aggregate directories are the handoff copy a required-path check may read and that evidence read through them does not record its iteration; `TC-0014-0033` follows it. `/qfai-sdd --contract .qfai/contracts/cli/qfai-prototyping-iterate.md`, mode `re-derive`: the cycle-0 reset clause says a reset moves the aggregate directories into the same backup as `iter-00/`                                    |
   | 3      | `/qfai-sdd spec-0014`, mode `re-derive`: `AC-0014-0005`, `BR-0014-0005`, `EX-0014-0026` and `TC-0014-0033` are withdrawn together, so no rule is left citing a withdrawn criterion                                                                                                                                                                                                                                                                                             |

   Each rerun writes one delta row for what it did: `spec-0014`'s under every
   option, `spec-0012`'s for the contract rerun under options 1 and 2, and
   `_policies/10_delta.md` for the policy rerun under option 1. Every
   `spec-0014` rerun's Phase 2b also migrates that ledger's columns and seeds
   the five `E2E` rows named under the options table.

2. Downstream ledger sweep for `spec-0014/TDD-0033`.
   - **Option 1: reset to `todo`** with this CR's ID in `DR-ID`. No statement
     moves, but the product beneath the row and its test both change, so the
     row needs a new RED and GREEN, and a `done` row enters that cycle only
     through an approved reset. The `spec-0014` rerun's Phase 2b re-points it
     in the same step, to the inverted cases in `uiEvidenceArtifacts.test.ts`:
     its `Test file` names `prototypingIterate.test.ts` and its `Selector`,
     `iter-NN path layout`, occurs in no runnable case name, and only Phase 2b
     may write a row's identity.
   - **Option 2: reset to `todo`** with this CR's ID in `DR-ID`, because the
     criterion it carries is re-derived, and re-pointed in the same rerun to
     the two aggregate-only cases in `uiEvidenceArtifacts.test.ts`.
   - **Option 3: retired**, with its `Evidence` cell verbatim —
     `current iterate path-layout suite pass`. Its test disposition is "none to
     dispose of": the selector resolves to no case, so no surviving assertion is
     left behind and the stale selector goes with the row. The id is reserved in
     that ledger's `## TDD-ID reservations` before the row is deleted.

3. Product and test work under `/qfai-implement`, by outcome. Under option 1,
   invert the two aggregate-only cases in `uiEvidenceArtifacts.test.ts`: each
   creates only aggregate files and requires no issue, which option 1 makes a
   failure. Under option 2, make a cycle-0 reset move the aggregate
   `screenshots/` and `html/` directories into its backup, and add a case that
   restarts a captured loop without `--capture` and requires the required-path
   check to fail while the backup still holds the moved files. Under option 2 the lookup's cases need no change: the two
   aggregate-only cases already discriminate the narrowed criterion.

## Resolution

Not yet resolved.
