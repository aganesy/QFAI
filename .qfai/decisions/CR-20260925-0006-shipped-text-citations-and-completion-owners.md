# Change Request

- ID: `CR-20260925-0006`
- Title: `Drop internal citations from shipped-text cases and settle three completion statements`
- Raised by: `workflow implementation orchestrator` — findings from the spec-0011, spec-0013 and spec-0018 implementation lanes
- Raised at: `2026-09-25T02:33:12Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — four answers through the structured question tool, each selecting the recommended option 1
- Approved at: `2026-09-25T02:35:05Z` (recorded at; reply timestamp unavailable)
- Approved option: `1` — for each of parts A, B, C and D
- Applied at: `2026-09-25T02:36:35Z`
- Superseded by: `-`

## Context

Four statements in the specs and in CLI-WF cannot be met as written. The user
approved one change for each, as parts A to D.

**A. Shipped-text citations.** Six test cases require shipped skill text to cite
a reference only this repository holds.

| Test case      | Ledger row           | Required citation                              |
| -------------- | -------------------- | ---------------------------------------------- |
| `TC-0011-0021` | `spec-0011/TDD-0029` | `DR-0297`                                      |
| `TC-0013-0038` | `spec-0013/TDD-0112` | CLI-WF `## Authorizations`                     |
| `TC-0013-0039` | `spec-0013/TDD-0113` | CLI-WF, for the staleness conditions           |
| `TC-0013-0042` | `spec-0013/TDD-0116` | CLI-VAL `## Triage authorization reference`    |
| `TC-0013-0043` | `spec-0013/TDD-0117` | `DR-0297`                                      |
| `TC-0013-0047` | `spec-0013/TDD-0121` | CLI-WF `### Work order` and `### Stage result` |

The distributed-surface guards refuse a `DR-NNNN` ID in a shipped file
(`.agents/rules/distributed-surface.local.md`). The contracts under
`.qfai/contracts/cli/` do not ship. An adopter would get a pointer to a
document they do not have. `AC-0011-0020`, `BR-0011-0017`, `EX-0011-0018` and
`EX-0013-0026` carry the same citation requirement.

**B. `TC-0018-0031`.** Its input is "a result whose receipt for a gate declares
the trust level `host_observed`". No such result can be built. CLI-WF
`### Stage result` defines each `gateResults` entry as `{ gateId, verdict }`,
and an unknown key is refused `invalid-input` with reason `schema`. The expected
outcome, recorded `agent_reported` and deciding no gate, is reachable from a
claimed PASS.

**C. `unmet[]` owners.** CLI-WF `## Completion` lists every unmet condition as
`{ condition, subject, owner }`, but fixes the owner only for `debt-open`: the
debt's `resolvingOwner`. `## State machine` already says a blocked run names
`operator` or the skill that owns the work. Nothing says which applies to the
other thirteen conditions, or whether a missing verify stage is reported once
or twice.

**D. `TC-0018-0043`.** Its expected result lists `debt-open` "with that spec as
owner". CLI-WF makes the owner the debt's `resolvingOwner`, which is a skill or
`operator`, never a spec. The input also names the other spec as
`resolvingOwner`, which CLI-WF `### Stage result` does not admit.
`EX-0018-0026` carries the same owner statement.

## Proposed change

- **A.** Rewrite each case, and each AC, BR and EX carrying the same
  requirement, to assert the behaviour the shipped text states, with no internal
  citation.
- **B.** Rewrite the input of `TC-0018-0031` to "a result whose `gateResults`
  claims a PASS for a gate". Keep the expected outcome. No schema change.
- **C.** Add the owner rule to CLI-WF `## Completion`:
  - `work-order-outstanding`, `stage-unaccepted`, `verify-missing` and
    `verify-foreign` name the skill that owns that stage;
  - `debt-open` keeps the debt's `resolvingOwner`;
  - every other condition names `operator`;
  - the verify stage is reported by `verify-missing` only, never also by
    `stage-unaccepted`.

  Align any spec-0018 BR or AC that contradicts it.

- **D.** `TC-0018-0043` expects `debt-open` with the debt's `resolvingOwner` as
  owner and the other spec in `subject`, and the run not completing until that
  spec repairs it. Align `EX-0018-0026`.

## Options (at least 3) and recommendation

Each part carried its own option set, and the user selected option 1 in each.
Part A was put to the user with three options. Parts B, C and D were put with
options 1 and 2 only; their option 3 is recorded here to meet the template
minimum and was not presented.

**Part A**

| #   | Option                                                             | Cost                                           | Risk                                                               | Recommended |
| --- | ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| 1   | Assert the stated behaviour, with no internal citation             | Six cases and four AC, BR or EX lines reworded | The shipped text restates a rule the contract also states          | ✅          |
| 2   | Drop only the two `DR-0297` citations; keep `CLI-WF` and `CLI-VAL` | Two cases reworded                             | Shipped skills name contract files an adopter does not have        |             |
| 3   | Leave the six cases as they are                                    | None now                                       | The six rows stay open and `QFAI-ATDD-112` keeps the merge blocked |             |

**Part B**

| #   | Option                                                        | Cost                               | Risk                                                                | Recommended |
| --- | ------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- | ----------- |
| 1   | Rewrite the input to a claimed PASS in `gateResults`          | One cell                           | The case no longer names `host_observed`; `TC-0018-0097` still does | ✅          |
| 2   | Add a trust-level key to `gateResults` so the input can exist | Schema, parser and contract change | Widens a payload to carry a claim the core must then ignore         |             |
| 3   | Retire the case                                               | A retirement and a tombstone       | The L1 check that a submitted gate decides nothing is lost          |             |

**Part C**

| #   | Option                                                                                         | Cost                | Risk                                                             | Recommended |
| --- | ---------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- | ----------- |
| 1   | Stage conditions name the stage's skill, `debt-open` its `resolvingOwner`, the rest `operator` | One table in CLI-WF | None found against the existing blocked-owner rule               | ✅          |
| 2   | Every condition but `debt-open` names `operator`                                               | One sentence        | A missing stage points the operator at nobody who can produce it |             |
| 3   | Leave the owner to the implementation                                                          | None now            | Owners drift between the command and the completion report       |             |

**Part D**

| #   | Option                                                                 | Cost                       | Risk                                                               | Recommended |
| --- | ---------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ | ----------- |
| 1   | Owner is the debt's `resolvingOwner`; the other spec goes in `subject` | One case and one example   | None; matches CLI-WF                                               | ✅          |
| 2   | Widen `owner` to admit a spec ID                                       | Contract and schema change | Two kinds of value in one field; the report mixes skills and specs |             |
| 3   | Drop the owner assertion from the case                                 | One cell                   | The cross-spec owner is no longer tested                           |             |

## Blocked downstream items

| Item                                   | Kind         | Why it depends on the artifact |
| -------------------------------------- | ------------ | ------------------------------ |
| `spec-0011/TDD-0029`                   | `ledger-row` | `TC-Refs` names `TC-0011-0021` |
| `spec-0013/TDD-0112`                   | `ledger-row` | `TC-Refs` names `TC-0013-0038` |
| `spec-0013/TDD-0113`                   | `ledger-row` | `TC-Refs` names `TC-0013-0039` |
| `spec-0013/TDD-0116`                   | `ledger-row` | `TC-Refs` names `TC-0013-0042` |
| `spec-0013/TDD-0117`                   | `ledger-row` | `TC-Refs` names `TC-0013-0043` |
| `spec-0013/TDD-0121`                   | `ledger-row` | `TC-Refs` names `TC-0013-0047` |
| `spec-0018/TDD-0035`                   | `ledger-row` | `TC-Refs` names `TC-0018-0031` |
| `spec-0018/TDD-0055`                   | `ledger-row` | `TC-Refs` names `TC-0018-0043` |
| `.qfai/contracts/cli/qfai-workflow.md` | `contract`   | Part C changes `## Completion` |

- Not blocked by this CR: the rows whose cases assert an `unmet[]` owner without
  naming it — `spec-0018/TDD-0036` (`TC-0018-0033`), `TDD-0038` to `TDD-0049`
  (`TC-0018-0035`), `TDD-0204` (`TC-0018-0150`), and `TDD-0303` and `TDD-0304`
  (`TC-0018-0030`, `TC-0018-0032`). Their cases do not change and none
  contradicts the owner rule. Their tests read the owner the contract now fixes.
- Overlapping open CRs: none.

## Impact scope

- Specs: `spec-0011` `AC-0011-0020`, `BR-0011-0017`, `EX-0011-0018`,
  `TC-0011-0021`; `spec-0013` `EX-0013-0026`, `TC-0013-0038`, `TC-0013-0039`,
  `TC-0013-0042`, `TC-0013-0043`, `TC-0013-0047`; `spec-0018` `EX-0018-0026`,
  `TC-0018-0031`, `TC-0018-0043`; the contract delta record in every spec that
  references CLI-WF, and in `_policies`
- Plans: none
- Tests: the eight ledger rows in the blocked set
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`
- Schema: none
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/specs/spec-0011/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0011/04_Business-Rules.md`,
  `.qfai/specs/spec-0011/05_Examples.md`,
  `.qfai/specs/spec-0011/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0018/05_Examples.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`, the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, `spec-0018`, and
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Approve each of parts A to D with option 1, or name another option for a part.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` in `re-derive`
   mode for part C. Record this CR in the `09_delta.md` of every spec that
   references CLI-WF and in `_policies/10_delta.md`, because the change is
   cross-spec.
2. `/qfai-sdd spec-0011`, `/qfai-sdd spec-0013` and `/qfai-sdd spec-0018` in
   `re-derive` mode for parts A, B and D: the AC, BR, EX and TC text named in
   `## Impact scope`. No ID is added, removed or renumbered.
3. Downstream ledger sweep:
   - Reset to `todo`, recording this CR's ID in their `DR-ID` column:
     `spec-0011/TDD-0029`, `spec-0013/TDD-0112`, `spec-0013/TDD-0113`,
     `spec-0013/TDD-0116`, `spec-0013/TDD-0117`, `spec-0013/TDD-0121`,
     `spec-0018/TDD-0035`, `spec-0018/TDD-0055`. Each is at `todo` already, so
     only the `DR-ID` cell changes.
   - Retire: none.

## Resolution

The user selected option 1 for all four parts. The owner reruns ran in
`re-derive` mode and changed no ID.

- **A.** `TC-0011-0021`, `EX-0011-0018`, `AC-0011-0020` and `BR-0011-0017`
  require the two scope-gap lines to name `/qfai-sdd` as the skill that appends
  the row, instead of citing `DR-0297`. `TC-0013-0038` requires the check to be
  stated: the record exists, matches the row's operation and capability, and is
  not stale. `TC-0013-0039` requires the three staleness conditions to be
  stated, and that the clock alone never makes an approval stale.
  `TC-0013-0042` and `EX-0013-0026` require the value form
  `run-<17 digits>/<authorizationId>` to be stated. `TC-0013-0043` requires the
  row to be for behaviour the spec already states, with no Change Request.
  `TC-0013-0047` drops its citation clause. The spec-0013 ACs and BRs cite the
  contracts as their own source, which is traceability inside the repository,
  and stand unchanged.
- **B.** `TC-0018-0031` takes "a result whose `gateResults` claims a PASS for a
  gate", and expects the claim recorded `agent_reported`, deciding no gate.
  `EX-0018-0019` already describes a submitted PASS and is unchanged.
- **C.** CLI-WF `## Completion` gains an owner table after the debt paragraph,
  citing the blocked-owner rule in `## State machine`. No spec-0018 BR or AC
  contradicted it: `BR-0018-0022`, `AC-0018-0006` and `EX-0018-0022` require
  each condition listed with its owner and name no owner value.
- **D.** `TC-0018-0043` and `EX-0018-0026` name `qfai-sdd` as the debt's
  `resolvingOwner` and the other spec as `owningSpec`. `finish` lists
  `debt-open` with `qfai-sdd` as owner and that spec in `subject`, and the run
  does not complete until that spec repairs it.

Ledger sweep: all eight rows were at `todo` and never executed, so no status
changed and no row was retired. Writing this CR's ID into their `DR-ID` cells is
handed to the agent that holds the ledgers in this worktree.
