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

**One authoritative artifact outside this pack takes the opposite position.**
The mirror is the only writer of the aggregate directories. The iterate
contract names what it writes as the SSOT; `spec-0012` requires the write and
says nothing about what a required-path check reads:

| Artifact                                          | Statement                                                                                                                                      | Takes a position on reading the aggregate directories |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md` | on convergence, iterate "mirrors the accepted-iter content into the **aggregate-dir SSOT**", and the screenshot copy is "Required for handoff" | **yes — it names them the SSOT**                      |
| `spec-0012` `REQ-0012-0066`                       | on convergence, `iterate` **MUST** mirror accepted-iter content into `screenshots/<screen-id>.png` and `html/<screen-id>.html`                 | no — it requires the write, not a read                |
| `spec-0012` `AC-0012-0064` → `TC-0012-0448`       | the chain below that requirement, resolving `OQ-0110` as its Option A; `TC-0012-0448`'s row `TDD-0484` is `done`                               | no, for the same reason                               |

So the criterion does not contradict a leftover the product forgot to remove.
The directories are a handoff output `spec-0012` requires, the iterate contract
names them the SSOT, and the lookup that reads them first reads what that
contract says is there.

## Proposed change

Settle whether the aggregate directories are an evidence source a required-path
check may read, and make the pack and the contract state the same answer.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                                                                                   | Cost                                                                                                                                                                                                                                                                                                                        | Risk                                                                                                                                                                                                                             | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The criterion is right. The required-path check reads `iter-NN/` only. **The mirror keeps writing** the aggregate directories, as `spec-0012` requires, for handoff; verify stops treating them as an evidence source                                    | A product change to the lookup and its documented path, with the two aggregate-only cases inverted; the iterate contract's "aggregate-dir SSOT" re-scoped to a handoff copy, since a contract calling it the SSOT contradicts a gate that does not read it; and `TDD-0033` reset for the new cycle. No spec statement moves | A project whose screenshots exist only in the aggregate directories — placed there by hand rather than produced by `iterate` — fails the gate after upgrade, with the files still on disk                                        |             |
| 2   | The code is right. Narrow `AC-0014-0005` and `TC-0014-0033` to what the iterate contract already says: the aggregate directories are the handoff copy, a required-path check may read them, and evidence read through them does not record its iteration | Two statements, and the delta row that records them. No product change, no contract change and no new test: the two aggregate-only cases already discriminate the narrowed criterion                                                                                                                                        | The pack stops asserting that the aggregate directories are rejected. Evidence satisfying the gate through them does not say which iteration produced it, and nothing at the gate notices                                        | ✅          |
| 3   | Withdraw the layout criterion and its chain. Retire `AC-0014-0005` and `TC-0014-0033` — and `BR-0014-0005` and `EX-0014-0026` with them, because `AC-0014-0005` is that rule's only parent and a rule cannot stand without one                           | Four statements, the ledger row and its reservation                                                                                                                                                                                                                                                                         | No rule a case can discharge then says where prototyping evidence lives: `01_Spec.md`'s Scope.In still names `iter-NN/` as the active layout, in prose no case reads. The next change to the lookup contradicts no testable rule |             |

**Stopping the mirror is not offered.** Nothing in the criterion requires it:
the criterion is about what verify accepts as a source, not about what
`iterate` writes. Stopping it would withdraw `spec-0012`'s `MUST` chain and the
contract's handoff output to settle a question neither of them is party to.

Option 2 is recommended because it edits two statements and changes nothing an
adopter relies on. The iterate contract names the aggregate directories the
SSOT and requires them for handoff, and the product reads them first; option 2
brings the criterion into line with both. Option 1 edits the product and
re-scopes the contract to follow one criterion that cites neither, and a project
whose evidence exists only in those directories starts failing the gate.
`spec-0012` takes no side: it requires the mirror to be written under every
option.

What option 2 costs is worth naming rather than discounting. The aggregate
directories hold one file per screen, so a screen captured in two iterations
keeps only the last accepted one, and evidence accepted through that path
cannot say which iteration produced it. That is the substance the criterion was
reaching for, and option 1 is the answer that keeps it. The narrowed criterion
should state the limitation in as many words, so the next reader meets it
rather than discovering it.

## Blocked downstream items

| Item                                              | Kind         | Why it depends on the artifact                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `spec-0014/TDD-0033`                              | `ledger-row` | Its `TC-Refs` is `TC-0014-0033`, whose `Expected` is the clause in dispute. The two aggregate-only cases in `uiEvidenceArtifacts.test.ts` discriminate it, and they pass under option 2 and fail under option 1, so the row can record nothing until one is chosen |
| `spec-0014/TC-0014-0033`                          | `spec`       | The test case restates the criterion, so it moves with whatever the criterion becomes                                                                                                                                                                              |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md` | `contract`   | Option 1 re-scopes its "aggregate-dir SSOT" wording, so no other contract rerun may advance that wording while the choice is open                                                                                                                                  |

- Not blocked by this CR: every other `spec-0014` row. `TDD-0034` is held by a
  separate obstacle recorded with it — its selector names one case asserting
  five outcomes — and `TDD-0028` and `TDD-0029` sit at `exception` and owe no
  completed evidence. None of the three turns on which layout is a source.
- Not blocked either: `spec-0012/TDD-0484` and `TDD-0493`. No option stops the
  mirror, so the obligations those rows carry hold under every outcome.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0014`
- Plans: `none`
- Tests: `spec-0014/TDD-0033` — `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`
- Contracts: `none` under options 2 and 3; under option 1 the iterate command's
  contract, `.qfai/contracts/cli/qfai-prototyping-iterate.md`
- Schema: `none`
- Upstream paths edited under this CR, by outcome:

  | Path                                              | Kept under      |
  | ------------------------------------------------- | --------------- |
  | `.qfai/specs/spec-0014/03_Acceptance-Criteria.md` | options 2 and 3 |
  | `.qfai/specs/spec-0014/04_Business-Rules.md`      | option 3        |
  | `.qfai/specs/spec-0014/05_Examples.md`            | option 3        |
  | `.qfai/specs/spec-0014/06_Test-Cases.md`          | options 2 and 3 |
  | `.qfai/specs/spec-0014/09_delta.md`               | options 2 and 3 |
  | `.qfai/specs/spec-0014/tdd/test-list.md`          | every option    |
  | `.qfai/contracts/cli/qfai-prototyping-iterate.md` | option 1        |
  | `.qfai/specs/spec-0012/09_delta.md`               | option 1        |

  **This section is reduced to the approved outcome before `Status: approved` is
  written**: `QFAI-DRIFT-001` reads the spec and contract paths here and not
  the outcome beside them.

  `spec-0012/09_delta.md` is there because the iterate contract is indexed to
  `spec-0012`, the one spec that references it, and a contract rerun records
  its Change Request in the delta of every referencing spec.

  **Product paths, under option 1 only**, listed so an approval of that option
  says what it covers: `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`,
  `packages/qfai/src/cli/commands/validate.ts`, and
  `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`.
  `packages/qfai/src/cli/commands/prototypingIterate.ts` is **not** among them:
  no option changes what the mirror writes. Neither are
  `packages/qfai/src/core/validators/skill/prototypingSkill.ts` and the shipped
  `qfai-prototyping` skill: the skill-text check already accepts the `iter-NN/`
  pair, and the skill already carries it.

  `01_Spec.md` is **not** here under any option. Its Scope.In line holds under
  every reading, so no approved action edits it.

## Decision needed from user

Is a prototyping evidence file that exists only in the aggregate `screenshots/`
/ `html/` directories acceptable to a required-path check — so the pack narrows
its criterion to match the iterate contract (option 2) — or not,
so verify reads `iter-NN/` only while the mirror keeps writing for handoff
(option 1)? Or should the pack withdraw its layout obligation altogether
(option 3)?

## Approved actions (owner skill rerun plan)

1. Owner rerun, by outcome:

   | Option | Rerun                                                                                                                                                                                                                                                                                                                |
   | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1      | `/qfai-sdd --contract .qfai/contracts/cli/qfai-prototyping-iterate.md`, mode `re-derive`: "aggregate-dir SSOT" is re-scoped to the handoff copy it is. The contract declares no ID, so the path form names it. No spec statement moves, so no pack is re-derived; the product change follows under `/qfai-implement` |
   | 2      | `/qfai-sdd spec-0014`, mode `re-derive`: `AC-0014-0005` says the aggregate directories are the handoff copy a required-path check may read and that evidence read through them does not record its iteration; `TC-0014-0033` follows it                                                                              |
   | 3      | `/qfai-sdd spec-0014`, mode `re-derive`: `AC-0014-0005`, `BR-0014-0005`, `EX-0014-0026` and `TC-0014-0033` are withdrawn together, so no rule is left citing a withdrawn criterion                                                                                                                                   |

   Every option writes one `09_delta.md` row for what it did: `spec-0012`'s
   under option 1, and `spec-0014`'s under options 2 and 3.

2. Downstream ledger sweep for `spec-0014/TDD-0033`.
   - **Option 1: reset to `todo`** with this CR's ID in `DR-ID`. No statement
     moves, but the product beneath the row and its test both change, so the
     row needs a new RED and GREEN, and a `done` row enters that cycle only
     through an approved reset. It is re-pointed in the same step: its
     `Selector`, `iter-NN path layout`, occurs in no runnable case name.
   - **Option 2: reset to `todo`** with this CR's ID in `DR-ID`, because the
     criterion it carries is re-derived, and re-pointed in the same rerun to
     the two aggregate-only cases in `uiEvidenceArtifacts.test.ts`.
   - **Option 3: retired**, with its `Evidence` cell verbatim —
     `current iterate path-layout suite pass`. Its test disposition is "none to
     dispose of": the selector resolves to no case, so no surviving assertion is
     left behind and the stale selector goes with the row. The id is reserved in
     that ledger's `## TDD-ID reservations` before the row is deleted.

3. Under option 1, invert the two aggregate-only cases in
   `uiEvidenceArtifacts.test.ts` under `/qfai-implement`: each creates only
   aggregate files and requires no issue, which option 1 makes a failure. Under
   option 2 no test is written: those two cases already discriminate the
   narrowed criterion.

## Resolution

Not yet resolved.
