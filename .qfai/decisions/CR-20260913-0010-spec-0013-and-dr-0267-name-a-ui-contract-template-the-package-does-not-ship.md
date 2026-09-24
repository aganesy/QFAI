# Change Request

- ID: `CR-20260913-0010`
- Title: `spec-0013 and DR-0267 name a UI contract template the package does not ship`
- Raised by: `qfai-implement`
- Raised at: `2026-09-13T10:50:48Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Nine statements say where the `primary_tasks` count guidance is documented,
and name a file the package does not ship: `templates/contracts/ui-spec.yaml`,
or `ui-spec.yaml` alone. Eight are in `spec-0013`: `REQ-0164`,
`US-0013-0014`, `AC-0013-0024`, `BR-0013-0019`, `EX-0013-0019`,
`TC-0013-0032`, `DR-0013-0003` and the band item of `10_Plan.md`. The ninth is
the shared decision `DR-0267` in `_policies/08_Decisions.md`.

The UI contract template the package ships is
`packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`,
which the skill calls `templates/contracts/ui-contract.sample.yaml`. **The same
pack names it.** `REQ-0115`, `AC-0013-0018`, `BR-0013-0015`, `EX-0013-0015`,
`TC-0013-0025` and step 1 of `10_Plan.md`'s `CHG-005` give that file as the
shipped template, and `REQ-0116` requires the prose of seven of the eight files
above to name it. So the pack names two files for one template, and only one of
them exists.

`TC-0013-0032` asks for the band to appear in that file's comments, so nothing
the repository contains can check it. Its ledger row stands at `done` all the
same: `spec-0013/TDD-0027` carries the test case and names
`packages/qfai/tests/integration/primaryTasksBand.test.ts`, and that test reads
`ui-contract.sample.yaml`. The row certifies an obligation naming a file its
test never reads. `.qfai/evidence/coverage-depth-spec-0013.md` already records
the missing file among its findings.

What the statements say the file documents is a separate question. They state a
band of 3..7, and the shipped template states a ceiling of 7 with no lower
bound. `CR-20260913-0001` puts that question to the user. This record corrects
only the file name, which is wrong whatever the answer is.

## Reproduction

The specs mention the name twelve times. `01_Spec.md:85` is `REQ-0116`, which
names it twice as the path it replaces, and `09_delta.md:148` is a delta note.
The other nine lines are the nine statements.

```text
$ grep -rno "ui-spec\.yaml" .qfai/specs
.qfai/specs/spec-0013/01_Spec.md:85:ui-spec.yaml
.qfai/specs/spec-0013/01_Spec.md:85:ui-spec.yaml
.qfai/specs/spec-0013/01_Spec.md:88:ui-spec.yaml
.qfai/specs/spec-0013/02_User-stories.md:74:ui-spec.yaml
.qfai/specs/spec-0013/03_Acceptance-Criteria.md:135:ui-spec.yaml
.qfai/specs/spec-0013/04_Business-Rules.md:141:ui-spec.yaml
.qfai/specs/spec-0013/05_Examples.md:137:ui-spec.yaml
.qfai/specs/spec-0013/06_Test-Cases.md:230:ui-spec.yaml
.qfai/specs/spec-0013/07_Decisions.md:21:ui-spec.yaml
.qfai/specs/spec-0013/09_delta.md:148:ui-spec.yaml
.qfai/specs/spec-0013/10_Plan.md:48:ui-spec.yaml
.qfai/specs/_policies/08_Decisions.md:1799:ui-spec.yaml
```

No tracked file has that name. The contract templates the `qfai-sdd` skill
ships are these four:

```text
$ git ls-files | grep -c "ui-spec"
0
$ git ls-files packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts
packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/api-contract.sample.yaml
packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/db-contract.sample.sql
packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/design-md-lock.sample.yaml
packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml
```

The same pack names the shipped template in `REQ-0115` and `REQ-0116`, on lines
84 and 85, and in `AC-0013-0018`, `BR-0013-0015`, `EX-0013-0015`,
`TC-0013-0025` and step 1 of `CHG-005`:

```text
$ grep -rno "templates/contracts/ui-contract\.sample\.yaml" .qfai/specs/spec-0013
.qfai/specs/spec-0013/01_Spec.md:84:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/01_Spec.md:85:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/03_Acceptance-Criteria.md:93:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/04_Business-Rules.md:111:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/05_Examples.md:107:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/06_Test-Cases.md:174:templates/contracts/ui-contract.sample.yaml
.qfai/specs/spec-0013/10_Plan.md:39:templates/contracts/ui-contract.sample.yaml
```

The file `TDD-0027`'s test reads in its `TC-0013-0032` cases:

```text
$ grep -n -m4 'const TEMPLATE_PATH\|"ui-contract.sample.yaml"\|TC-0013-0032:\|readFile(TEMPLATE_PATH' packages/qfai/tests/integration/primaryTasksBand.test.ts
31:const TEMPLATE_PATH = path.resolve(
41:  "ui-contract.sample.yaml",
99:describe("TC-0013-0032: the primary_tasks ceiling is documented and named in the warning", () => {
101:    const template = await readFile(TEMPLATE_PATH, "utf-8");
```

## Proposed change

Correct the file name in each of the nine statements. Each keeps the form it
uses, so a skill-relative path stays a path and a bare file name stays a file
name. Nothing else in the statements changes.

| Statement      | Where                                     | Names today                        | Names after                                   |
| -------------- | ----------------------------------------- | ---------------------------------- | --------------------------------------------- |
| `REQ-0164`     | `spec-0013/01_Spec.md:88`                 | `templates/contracts/ui-spec.yaml` | `templates/contracts/ui-contract.sample.yaml` |
| `US-0013-0014` | `spec-0013/02_User-stories.md:74`         | `ui-spec.yaml`                     | `ui-contract.sample.yaml`                     |
| `AC-0013-0024` | `spec-0013/03_Acceptance-Criteria.md:135` | `ui-spec.yaml`                     | `ui-contract.sample.yaml`                     |
| `BR-0013-0019` | `spec-0013/04_Business-Rules.md:141`      | `templates/contracts/ui-spec.yaml` | `templates/contracts/ui-contract.sample.yaml` |
| `EX-0013-0019` | `spec-0013/05_Examples.md:137`            | `ui-spec.yaml`                     | `ui-contract.sample.yaml`                     |
| `TC-0013-0032` | `spec-0013/06_Test-Cases.md:230`          | `templates/contracts/ui-spec.yaml` | `templates/contracts/ui-contract.sample.yaml` |
| `DR-0013-0003` | `spec-0013/07_Decisions.md:21`            | `templates/contracts/ui-spec.yaml` | `templates/contracts/ui-contract.sample.yaml` |
| Band item      | `spec-0013/10_Plan.md:48`                 | `templates/contracts/ui-spec.yaml` | `templates/contracts/ui-contract.sample.yaml` |
| `DR-0267`      | `_policies/08_Decisions.md:1799`          | `ui-spec.yaml`                     | `ui-contract.sample.yaml`                     |

Two other mentions of the old name are not corrected:

- `REQ-0116`, on `01_Spec.md:85`, names it as the path it replaces, beside the
  shipped file.
- `09_delta.md:148` is a note in the delta entry that added these statements,
  and a delta records a change as it was made.

No `spec-0004` statement names either file.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                     |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0027` | `ledger-row` | The former `TC-0013-0032` aggregate row keeps the template documentation boundary whose path this record corrects. |
| `spec-0013/TDD-0043` | `ledger-row` | The `US-0013-0014` E2E row now keeps the template documentation boundary and reads the same path.                  |

The old→new mapping is `TDD-0027 → TDD-0027/0068/0069` and the previously
unallocated `US-0013-0014` E2E row → `TDD-0043/0098/0099/0100/0101/0102/0103/0104/0105/0106/0107/0108/0109`.
Only `TDD-0027` and `TDD-0043` verify the template path this record changes.

- Not blocked by this CR:
  - `spec-0013/TDD-0028`. It carries `TC-0013-0033`, which states the count
    boundary and names no file. `EX-0013-0019` and `AC-0013-0024` sit above it
    too, but the clause corrected in them is the documentation clause, which
    only `TC-0013-0032` verifies.
  - `spec-0013/TDD-0068` and `TDD-0069`. They carry the guide and warning-text
    boundaries of `TC-0013-0032`, neither of which names the template path.
  - `spec-0013/TDD-0019`. Its `TC-0013-0025` already names the shipped template.
  - Every other row of `spec-0013` and of `spec-0004`. None carries a statement
    this record corrects.
- Overlapping open CRs:
  - `CR-20260913-0001` names every statement this record corrects, and blocks
    `TDD-0027` and `TDD-0043` too. **This record is applied first**, and `CR-20260913-0001` is
    written against the statements as this one leaves them. The correction
    holds under each of its options: options 1 and 2 rewrite what the
    statements say the file documents and keep the file named here, and option
    3 edits no statement. `TDD-0027` and `TDD-0043` resume only once both
    records have released them.

## Impact scope

- Specs: `spec-0013`, and `_policies` for `DR-0267`
- Plans: `.qfai/specs/spec-0013/10_Plan.md`, its band item only
- Tests: `spec-0013/TDD-0027` and the rows the second line of the blocked set
  selects — `packages/qfai/tests/integration/primaryTasksBand.test.ts`, re-run
  and not edited, since it already reads the shipped template; and, through the
  `/qfai-atdd spec-0013` pass in action 4, the tests for `TDD-0016` to
  `TDD-0018`, with `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`. Action 4 runs over the ledger
  `CR-20260913-0009` leaves, so the pass also takes the rows that record seeds:
  the `Integration` rows for `TC-0013-0014` to `TC-0013-0019`, with tests for
  `TC-0013-0018` and `TC-0013-0019` and a handoff and evidence for all six, and
  the `E2E` rows, with a new test under `packages/qfai/tests/e2e/**` for each of
  the ten stories no test annotates, `US-0013-0001` to `US-0013-0010`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/07_Decisions.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`,
  `.qfai/specs/_policies/08_Decisions.md`,
  `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Approve correcting `ui-spec.yaml` to the shipped `ui-contract.sample.yaml` in the
nine statements that name it, with nothing else in them changing, and resetting
the ledger rows that carry those statements?

## Approved actions (owner skill rerun plan)

1. **Hand edits, first.** Edit the nine statements as the table under
   `## Proposed change` gives them, and nothing else in their files. The edits
   are made by hand so that the owner reruns confirm them rather than derive
   them.

2. **Two owner reruns, both `confirm-only`, after the hand edits.** The
   statements span two artifact classes, and the Drift Protocol gives each its
   own invocation.

   | Invocation            | Confirms                                    | CR reference lands in                                                                         |
   | --------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
   | `/qfai-sdd spec-0013` | The eight `spec-0013` statements, as edited | A row of `spec-0013/09_delta.md`'s `## Change Requests` table, and `DR-0013-0003`'s `Related` |
   | `/qfai-sdd`           | `DR-0267`, as edited                        | A row of `_policies/10_delta.md`'s `## Change Requests` table, and `DR-0267`'s `Related`      |

   Each delta row carries `CR ID`, `Upstream artifact`, `Mode`, `Approved by`
   and `Applied at`, and is not a `## Triage` row. Neither delta file has that
   table yet, so each rerun adds it from its delta template. Neither decision
   record has a `Related` line either, so each gains one naming this Change
   Request: both records' text is amended, and `Related` is the field both
   Decisions templates define for the reference.

   **`confirm-only`, not `re-derive`.** A `re-derive` of `spec-0013` runs Phase
   2b over its ledger, which has nine of the template's fifteen columns and one
   `E2E` row for fourteen stories. This repository declares no UI-bearing spec,
   so every story is active, and Phase 2b would add the six missing columns and
   seed an `E2E` row for each story without one. Those writes are owed, but a file-name correction does not authorise them.

3. **Downstream ledger sweep, after the reruns.** `/qfai-implement spec-0013`'s
   Change Request preflight resets these rows to `todo`, recording this Change
   Request's ID in `DR-ID`: `spec-0013/TDD-0027`, and every other `spec-0013`
   row whose `TC-Refs` names `TC-0013-0032` or whose `US-Refs` names
   `US-0013-0014` when the sweep runs. Each carries a statement whose file name
   changes. No row is retired, because every obligation survives.

   `TDD-0027` keeps `DR-0013-0003` beside this ID. Its `Selector`,
   `primary_tasks band documented + named in warning`, matches nothing in its
   test file today. While that holds, the run that re-executes the row rewrites
   the cell under the Drift Protocol's whitelist, so neither rerun writes a row
   cell.

4. **`/qfai-atdd spec-0013`, after the sweep, over the rows the ledger holds.**
   `TDD-0027`'s test is an ATDD-owned `Integration` test, so that stage writes
   the evidence for re-executing it, in `.qfai/evidence/atdd-spec-0013.md`. The
   test needs no edit. The pass takes up the ATDD-owned rows the ledger carries
   and still owes — `TDD-0016` to `TDD-0018` today — and refreshes
   `.qfai/evidence/atdd-spec-0013.md` and
   `.qfai/evidence/coverage-depth-spec-0013.md`, whose findings name the missing
   file, through that stage's reviewer gate.

   **It writes no `E2E` test for a story the ledger has no row for.** Action 2
   leaves the thirteen missing `E2E` rows unseeded, because a file-name
   correction does not authorise a Phase 2b re-derivation, and `/qfai-atdd`
   reads `test-list.md` and never writes it — so a pass told to cover those
   stories would have to author rows it may not write, and would stop instead.

   **So this pass waits on the ledger repair rather than passing over what it
   cannot cover.** Every story of this pack is active, and an uncovered one is
   this spec's own `QFAI-ATDD-111`, not another spec's — the stage admits
   `PASS with cross-spec obligations` only for attributable `QFAI-ATDD-113`,
   `QFAI-ATDD-115` or `QFAI-TEST-001` residue, so recording these as a
   cross-spec obligation would ask the reviewer gate to pass something it may
   not. The repair is `CR-20260913-0009`: a `/qfai-sdd` Phase 2b re-derivation
   that seeds the missing `Integration` and `E2E` rows and splits the
   progressed rows it stops at. Action 4 runs after it lands, over the ledger
   it leaves, and so takes the rows it seeds as well, writing the tests and
   handoffs the impact scope lists.

5. **`/qfai-implement spec-0013`, last.** It advances each reset row from the
   handoff that pass recorded.

**Actions 1 and 2 do not wait on anything**, but this record is not applied
until actions 3 to 5 have run. This record changes the obligation `TDD-0027`
certifies, so its reset and re-execution are this record's own work, whatever
`CR-20260913-0001` decides: that record may be rejected, or approve an option
that resets nothing, and neither would re-execute the row. `Applied at` is
written once action 5 has advanced `TDD-0027` from the handoff. Where the other
record is approved first with a sweep that already covers the row, actions 3
to 5 run once, under whichever record reaches them first, and both records name
that run when they are applied.

## Resolution

<!-- Filled in when Status leaves `open`. -->
