# Change Request

- ID: `CR-20260925-0004`
- Title: `Type route proposal references before checking their targets`
- Raised by: `qfai-implement`
- Raised at: `2026-09-24T17:49:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — explicit answer: "1. 各参照を種類付きオブジェクトにする（推奨：値と種類を一緒に保持）"
- Approved at: `2026-09-24T18:13:52Z`
- Approved option: `1 — tagged reference entries`
- Applied at: `2026-09-24T19:00:08Z`
- Superseded by: `-`

## Context

CLI-WF `### Route proposal` defines `expectedBehaviorRefs` and `observedRefs`
as normative and observed references without a machine-readable reference
kind. CLI-WF also promises `unknown-path` when a referenced path does not
exist. The pending route-check implementation uses `string[]` for both fields
and infers paths from punctuation or an existing `pathExistence` fact. An
absent extensionless root file such as `Dockerfile` with no fact is
indistinguishable from a symbolic reference such as `request`. In the sealed
TDD-0015 Round 3 review, `observedRefs: ["Dockerfile"]` and an empty
`pathExistence` map reached the CREATE question. Treating every bare string
as a path would reject the valid symbolic `request` reference. The source
contract must choose a reference representation before the route checker can
meet both promises.

## Proposed change

Keep normative and observed references in separate fields. Give each
reference an explicit, validated kind before `accept` checks it. A reference
declared as a path requires a project-relative path and a current existence
observation. Both `false` and a missing observation refuse the proposal with
`unknown-path`, naming that path, leaving `routing` unchanged and emitting no
events. Symbolic `request` and valid spec or contract IDs retain their own
semantics; a string's punctuation or its accidental presence in an observer
map is never its kind. Specify the selected representation in CLI-WF and
CLI-WFFILE before changing parsers, route proposal schemas, fixtures or the
shipped routing skill.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                            | Cost                                                                                       | Risk                                                                                                  | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Replace each string with a tagged entry such as `{ kind: "path", ref: "Dockerfile" }`; use closed kinds for path, request, spec ID, contract ID and observed evidence references. | Migrate both arrays, parser/schema, route producer and fixtures once.                      | Existing string payloads need an explicit compatibility decision; the kind enum must stay closed.     | ✅          |
| 2   | Retain string arrays and add a complete sidecar kind map keyed by field and array position, with a parser check that every reference has exactly one kind.                        | Keep parallel arrays and map synchronized across serialization, replay and test fixtures.  | An index change can attach the wrong kind to a string; validation and reviews carry more state.       |             |
| 3   | Retain string arrays but require a reserved `path:` prefix for every path and a closed grammar for non-path strings, including `request` and IDs.                                 | Migrate path strings in the route producer, fixtures and schema; parse and strip prefixes. | A producer that omits the prefix is refused only if the closed symbolic grammar is enforced strictly. |             |

Option 1 keeps classification next to the value it qualifies. It avoids the
parallel-state cost of Option 2 and the encoding convention of Option 3. The
SDD rerun must settle the exact closed kind names and compatibility behavior
before a shipped schema or parser is written.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                         |
| -------------------- | ------------ | ---------------------------------------------------------------------- |
| `spec-0018/TDD-0001` | `ledger-row` | Its completed route-accept test uses symbolic `request`.               |
| `spec-0018/TDD-0004` | `ledger-row` | Its completed route-accept test uses symbolic `request`.               |
| `spec-0018/TDD-0014` | `ledger-row` | Its checked-plan route result uses the proposal shape.                 |
| `spec-0018/TDD-0015` | `ledger-row` | Its `unknown-path` review exposes the untyped reference gap.           |
| `spec-0018/TDD-0016` | `ledger-row` | `unknown-id` must distinguish IDs from paths and `request`.            |
| `spec-0018/TDD-0017` | `ledger-row` | `inactive-spec` depends on the spec-ID reference kind.                 |
| `spec-0018/TDD-0018` | `ledger-row` | `broken-reference` depends on the referenced item's kind.              |
| `spec-0018/TDD-0019` | `ledger-row` | Its route-accept test shares the proposal fixture.                     |
| `spec-0018/TDD-0020` | `ledger-row` | Its route-accept test shares the proposal fixture.                     |
| `spec-0018/TDD-0021` | `ledger-row` | Its route-accept test shares the proposal fixture.                     |
| `spec-0018/TDD-0022` | `ledger-row` | Its route-accept test shares the proposal fixture.                     |
| `spec-0018/TDD-0023` | `ledger-row` | Its combined route checks share the proposal fixture.                  |
| `spec-0018/TDD-0024` | `ledger-row` | Its combined route checks share the proposal fixture.                  |
| `spec-0018/TDD-0025` | `ledger-row` | It checks the normative and observed reference split.                  |
| `spec-0018/TDD-0104` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0105` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0106` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0107` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0108` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0109` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0110` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0111` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0131` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0212` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0213` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0214` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0215` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0216` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0217` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0260` | `ledger-row` | It reads the route-accept proposal shape.                              |
| `spec-0018/TDD-0261` | `ledger-row` | Its shipped `qfai-run` text must produce the selected reference shape. |
| `spec-0018/TDD-0268` | `ledger-row` | Its shipped `qfai-run` text must produce the selected reference shape. |
| `spec-0018/TDD-0447` | `ledger-row` | Its asset budget reads the changed shipped schema.                     |
| `spec-0018/TDD-0448` | `ledger-row` | Its payload schema check must accept the selected reference shape.     |
| `spec-0018/TDD-0452` | `ledger-row` | Its payload parser must accept the selected reference shape.           |
| `spec-0018/TDD-0453` | `ledger-row` | Its payload parser must refuse an invalid reference shape.             |
| `spec-0018/TDD-0455` | `ledger-row` | Its E2E feature journey begins with the checked route proposal.        |
| `spec-0018/TDD-0456` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0457` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0458` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0459` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0461` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0462` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0463` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0464` | `ledger-row` | Its E2E journey begins with the checked route proposal.                |
| `spec-0018/TDD-0470` | `ledger-row` | Its route-accept journey uses the checked proposal shape.              |
| `spec-0018/TDD-0502` | `ledger-row` | Its shipped `qfai-run` text must produce the selected reference shape. |
| `spec-0018/TDD-0503` | `ledger-row` | Its route-accept journey uses the checked proposal shape.              |
| `spec-0018/TDD-0504` | `ledger-row` | Its route-accept journey uses the checked proposal shape.              |
| `spec-0018/TDD-0505` | `ledger-row` | Its route-accept journey uses the checked proposal shape.              |
| `spec-0018/TDD-0506` | `ledger-row` | Its route-accept journey uses the checked proposal shape.              |

- A row in this blocked set is not automatically reset. Route-accept rows
  sharing payload fixtures need migration and re-verification, while unchanged
  TC/US/CON-API obligations retain their status and evidence. `TDD-0001` and
  `TDD-0004` remain `done` unless the SDD rerun changes their obligations.
- Not blocked by this CR: `TDD-0002` shares the completed `TDD-0001` test
  file but does not read a route proposal in its own selector; re-verify it
  if the shared file changes. `TDD-0013` is decision-only, but its completed
  selector and oracle need re-verification after the shared `decide.ts` changes.
  `TDD-0026` to `TDD-0030` start from a checked plan and test stage order
  without reading reference fields. `TDD-0460` is read-only. The impact audit
  screened 526 ledger rows and found no direct row in another spec.
- Related CRs: `CR-20260924-0006` and `CR-20260925-0003` were applied
  before this rerun. Neither authorized this reference representation decision.
- The schema/parser rows and shipped-skill rows above are included for every
  option: each option changes the producer and the shipped reference schema.
- Parking at detection: `TDD-0014` was blocked by CR3 and `TDD-0455` by
  CR2, so neither blocker cell was overwritten then. `TDD-0001` and
  `TDD-0004` stayed `done`, and `TDD-0015` stayed `review-fix`. The other
  46 rows were parked under this CR. After CR2 and CR3 applied, `TDD-0014`
  returned to `todo` and was parked under this CR; `TDD-0455` remained
  blocked under this CR.

## Impact scope

- Specs: `spec-0018` `AC-0018-0004`, `BR-0018-0008` and `BR-0018-0009`,
  `EX-0018-0008`, `EX-0018-0009`, `EX-0018-0155`, `TC-0018-0012` to
  `TC-0018-0015`, and `TC-0018-0269`; contract delta references in the nine
  other specs that bind CLI-WF and in `_policies`
- Plans: `.qfai/specs/spec-0018/10_Plan.md` (parser and schema agreement)
- Tests: the `spec-0018` blocked rows enumerated above;
  `packages/qfai/tests/unit/workflow/theRouteProposalIsCheckedAtAccept.test.ts`,
  `packages/qfai/tests/unit/workflow/normativeAndObservedReferencesStayApart.test.ts`,
  planned integration schema and parser tests, and the completed selectors
  in `oneCreateQuestionAtRouting.test.ts`, `oneApprovalPerCapability.test.ts`
  and `aDeclineIsAStopWithNothingTracked.test.ts` for re-verification
- Contracts: CLI-WF — `.qfai/contracts/cli/qfai-workflow.md`; CLI-WFFILE —
  `.qfai/contracts/cli/workflow-files.schema.md`
- Schema: planned shipped source
  `packages/qfai/assets/schemas/workflow/route-proposal.schema.json`; no
  schema file exists yet
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-workflow.md`,
  `.qfai/contracts/cli/workflow-files.schema.md`,
  `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0018/04_Business-Rules.md`,
  `.qfai/specs/spec-0018/05_Examples.md`,
  `.qfai/specs/spec-0018/06_Test-Cases.md`,
  `.qfai/specs/spec-0018/09_delta.md`,
  `.qfai/specs/spec-0018/10_Plan.md`,
  `.qfai/specs/spec-0018/tdd/test-list.md`, and the `09_delta.md` files of
  `spec-0001`, `spec-0003`, `spec-0008`, `spec-0010`, `spec-0011`, `spec-0012`,
  `spec-0013`, `spec-0014`, `spec-0015`, plus `.qfai/specs/_policies/10_delta.md`

## Decision needed from user

Choose a reference representation for the route proposal. Option 1 is
recommended because its kind travels with each reference and a path without
an existence observation can be refused without guessing from its spelling.

## Approved actions (owner skill rerun plan)

1. After `CR-20260924-0006` is applied, run
   `/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md` and
   `/qfai-sdd --contract .qfai/contracts/cli/workflow-files.schema.md` in
   `re-derive` mode for the
   selected route reference representation and `unknown-path` observation
   rule. Record the CR in the referencing specs' `09_delta.md` files and
   `_policies/10_delta.md`; reconcile the two CLI contracts together.
2. After `CR-20260925-0003` is applied or reconciled, run
   `/qfai-sdd spec-0018` in `re-derive` mode for AC/BR/EX/TC/Plan and ledger
   seed.
   Preserve the normative-versus-observed split and one independently
   observable boundary per TDD row.
3. At detection, park the 51 rows in the blocked set as described above:
   leave `TDD-0001`, `TDD-0004`, `TDD-0014`, `TDD-0015` and `TDD-0455`
   exactly as they are, including the two existing `Blocked-By` cells. The
   open CR's blocked set and Change-Request preflight halt them. Move the
   remaining 46 rows from `todo` to `blocked` with this CR in `Blocked-By`.
4. Sweep the spec-0018 ledger after the owner reruns. Reset to `todo` with
   this CR in `DR-ID` only a row whose `TC-Refs` names one of
   `TC-0018-0012` to `TC-0018-0015` and whose independently observable
   obligation the selected rewrite changes. This can include
   `spec-0018/TDD-0015` to `TDD-0025`; it does not authorize a reset of any
   other row or any retirement. A shared fixture or code change alone is
   re-verification work, not an upstream reset. Re-verify completed
   `TDD-0001`, `TDD-0002`, `TDD-0004` and `TDD-0013` after the shared
   `decide.ts` change. Their selectors, oracles, restored GREEN, hashes and
   review evidence must remain current.
5. Resume the blocked set after the owner reruns and sweep. Migrate route
   producer, parser, future shipped schema and fixtures to the chosen shape.
   Prove absent `Dockerfile` without a path fact refuses `unknown-path` with
   unchanged state and no events, while symbolic `request` remains valid.

## Resolution

The user selected Option 1: each reference is a tagged entry that keeps its kind
and value together. The approval timestamp above records when the answer was
entered; the answer's original timestamp is unavailable. After CR2 and CR3,
`/qfai-sdd --contract .qfai/contracts/cli/qfai-workflow.md`, `/qfai-sdd
--contract .qfai/contracts/cli/workflow-files.schema.md`, and `/qfai-sdd
spec-0018` ran in `re-derive` mode. Both contracts require exact `{ kind, ref }`
entries. The closed kinds are `request`, `spec-id`, `contract-id`, `path` and
`evidence`; normative references allow the first four, and observed references
allow `path` and `evidence`. The latter two require a current project-relative
path-existence fact. A false or missing fact yields `unknown-path`; a bare
legacy string fails `invalid-input` / `schema`. The SDD owner added
`EX-0018-0155`, `TC-0018-0269` and `TDD-0528/0529` to cover the legacy shape in
both arrays.

The ledger sweep released 48 CR4-blocked rows to `todo`. It reset `TDD-0015`
from `review-fix` to `todo`, and tagged `TDD-0015`, `TDD-0016` and `TDD-0025`
with this CR in `DR-ID` because their observable reference obligations changed.
No row was retired. `TDD-0001` and `TDD-0004` remain `done` with prior evidence;
shared-file re-verification and the implementation of tagged producer, parser,
schema, fixtures and skill text remain downstream work. The CR3 release of
`TDD-0014` was parked under CR4 before this rerun and released with the other
blocked rows.
