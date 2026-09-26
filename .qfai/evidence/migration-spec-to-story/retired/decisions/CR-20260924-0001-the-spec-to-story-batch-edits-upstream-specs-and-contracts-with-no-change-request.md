# Change Request

- ID: `CR-20260924-0001`
- Title: `The spec-to-story batch edits upstream specs and contracts with no change request on record`
- Raised by: `architecture-reviewer` (Reviewer Gate cycle 1 of the `/qfai-sdd` batch `sdd-batch-20260923100952585`, finding 2)
- Raised at: `2026-09-24T01:58:37Z`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga` — the user, in chat on 2026-09-24 (answer U1 in `.qfai/evidence/sdd-batch-20260923100952585.md`)
- Approved at: `2026-09-24T02:27:15Z` — when the answer was recorded; the chat carries no earlier stamp
- Approved option: `1`
- Applied at: `-` — set when the batch is committed (see Approved actions)
- Superseded by: `-`

## Context

The `/qfai-sdd` batch `sdd-batch-20260923100952585` restates 16 specs, the
`_policies` layer and eight CLI contracts for the story-tree layout. It is the
owner run of those files, so it writes them without a change request.

The pull request that carries the edits (the P2–P8 pull request) also runs
`/qfai-atdd` and `/qfai-implement` (user answer P3-C1). Their completion gate is
`qfai validate --profile tdd`, and until P7 that profile runs `QFAI-DRIFT-001`.
The check reports every changed file under `paths.specsDir` or
`paths.contractsDir` that no approved `.qfai/decisions/CR-*.md` names in its
`## Impact scope`. The owner run and the downstream run share one diff, so the
check cannot tell them apart.

The qa-gatekeeper measured the `tdd` lane on a scratch commit of the change:
five unpinned `QFAI-DRIFT-001` errors, on
`.qfai/contracts/cli/qfai-atdd-scaffold.md`,
`.qfai/contracts/cli/qfai-migration-spec-to-story.md`,
`.qfai/contracts/cli/qfai-validate.md`,
`.qfai/contracts/cli/worklog-entry.schema.md` and
`.qfai/specs/spec-0018/07_Decisions.md`. The other edited files passed only
because older approved requests name a file of the same base name, which
authorises them by accident.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                   | Cost                                           | Risk                                                                                                        | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | One approved change request whose Impact scope names every spec and contract path the batch edits, committed before the first `tdd` gate | One record; the path list re-derived at commit | A path added after the list is written is unauthorised until the list is re-derived                         | ✅          |
| 2   | Pin the `QFAI-DRIFT-001` findings in `scripts/dogfood-backlog.json` under `tdd`                                                          | One pin per file                               | Masks a real downstream edit to the same files until P7 retires the check; the ratchet only moves down      |             |
| 3   | State the findings as an expected failure of the P2–P8 pull request                                                                      | None in the tree                               | The `tdd` gate and the dogfood lane stay red, so the in-PR `/qfai-implement` pass cannot reach its own gate |             |

## Proposed change

Option 1. This record authorises the batch's edits to every path in
`## Impact scope`. It changes no obligation of its own: what each file states is
the batch's, recorded in each spec's `09_delta.md` and in the batch record.

## Blocked downstream items

| Item                                                | Kind  | Why it depends on the artifact                                                      |
| --------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| The `tdd` gate of the P2–P8 pull request            | gate  | `QFAI-DRIFT-001` clears the edited paths only through this record's scope           |
| The in-PR `/qfai-atdd` and `/qfai-implement` passes | stage | They start once `Applied at` is set, as an approved record is unresolved until then |

- Not blocked by this CR: every ledger row. No row is reset. Two rows this run
  added and then withdrew, `spec-0004/TDD-0140` and `spec-0017/TDD-0105`, never
  reached the base branch, so their removal retires nothing on record.
- Overlapping open CRs: none changed by this record. The open and
  approved-but-unapplied requests on the same specs keep their own blocked sets,
  for example `CR-20260913-0012` on spec-0013 and `CR-20260923-0001` on
  spec-0012, whose reserved IDs this run skipped.

## Impact scope

The list is the output of `git status --porcelain -uall -- .qfai/specs
.qfai/contracts` on 2026-09-24 against base `e9f93e2c1`: 148 paths, 135
modified and 13 new. Re-derive it at commit time with the same command and
replace the list if any path was added or dropped.

- Specs: `spec-0001`, `spec-0003`, `spec-0004`, `spec-0005`, `spec-0006`,
  `spec-0007`, `spec-0008`, `spec-0009`, `spec-0010`, `spec-0011`,
  `spec-0012`, `spec-0013`, `spec-0014`, `spec-0015`, `spec-0017`,
  `spec-0018`, and `_policies`
- Plans: the `10_Plan.md` of each spec above, listed below
- Tests: `none`
- Ledgers: the 13 `tdd/test-list.md` paths below are included for a complete
  record of this batch. The upstream-edit guard does not protect them.
- Contracts: the eight files under `.qfai/contracts/cli/` listed below
- Schema: `none`
- Upstream paths edited under this CR:
  - `.qfai/contracts/cli/qfai-atdd-scaffold.md`
  - `.qfai/contracts/cli/qfai-doctor.md`
  - `.qfai/contracts/cli/qfai-init.md`
  - `.qfai/contracts/cli/qfai-migration-spec-to-story.md`
  - `.qfai/contracts/cli/qfai-prototyping-iterate.md`
  - `.qfai/contracts/cli/qfai-prototyping.md`
  - `.qfai/contracts/cli/qfai-validate.md`
  - `.qfai/contracts/cli/worklog-entry.schema.md`
  - `.qfai/specs/_policies/03_Capabilities.md`
  - `.qfai/specs/_policies/05_Contracts.md`
  - `.qfai/specs/_policies/06_Glossary.md`
  - `.qfai/specs/_policies/07_Constraints.md`
  - `.qfai/specs/_policies/09_Open-questions.md`
  - `.qfai/specs/_policies/10_delta.md`
  - `.qfai/specs/_policies/11_Slice-Policy.md`
  - `.qfai/specs/spec-0001/01_Spec.md`
  - `.qfai/specs/spec-0001/02_User-stories.md`
  - `.qfai/specs/spec-0001/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0001/04_Business-Rules.md`
  - `.qfai/specs/spec-0001/05_Examples.md`
  - `.qfai/specs/spec-0001/06_Test-Cases.md`
  - `.qfai/specs/spec-0001/09_delta.md`
  - `.qfai/specs/spec-0001/10_Plan.md`
  - `.qfai/specs/spec-0001/tdd/test-list.md`
  - `.qfai/specs/spec-0003/01_Spec.md`
  - `.qfai/specs/spec-0003/02_User-stories.md`
  - `.qfai/specs/spec-0003/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0003/04_Business-Rules.md`
  - `.qfai/specs/spec-0003/05_Examples.md`
  - `.qfai/specs/spec-0003/06_Test-Cases.md`
  - `.qfai/specs/spec-0003/09_delta.md`
  - `.qfai/specs/spec-0003/10_Plan.md`
  - `.qfai/specs/spec-0003/tdd/test-list.md`
  - `.qfai/specs/spec-0004/01_Spec.md`
  - `.qfai/specs/spec-0004/02_User-stories.md`
  - `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0004/04_Business-Rules.md`
  - `.qfai/specs/spec-0004/05_Examples.md`
  - `.qfai/specs/spec-0004/06_Test-Cases.md`
  - `.qfai/specs/spec-0004/09_delta.md`
  - `.qfai/specs/spec-0004/10_Plan.md`
  - `.qfai/specs/spec-0004/tdd/test-list.md`
  - `.qfai/specs/spec-0005/01_Spec.md`
  - `.qfai/specs/spec-0005/02_User-stories.md`
  - `.qfai/specs/spec-0005/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0005/04_Business-Rules.md`
  - `.qfai/specs/spec-0005/05_Examples.md`
  - `.qfai/specs/spec-0005/06_Test-Cases.md`
  - `.qfai/specs/spec-0005/09_delta.md`
  - `.qfai/specs/spec-0005/10_Plan.md`
  - `.qfai/specs/spec-0005/tdd/test-list.md`
  - `.qfai/specs/spec-0006/01_Spec.md`
  - `.qfai/specs/spec-0006/02_User-stories.md`
  - `.qfai/specs/spec-0006/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0006/04_Business-Rules.md`
  - `.qfai/specs/spec-0006/05_Examples.md`
  - `.qfai/specs/spec-0006/09_delta.md`
  - `.qfai/specs/spec-0006/10_Plan.md`
  - `.qfai/specs/spec-0007/01_Spec.md`
  - `.qfai/specs/spec-0007/04_Business-Rules.md`
  - `.qfai/specs/spec-0007/05_Examples.md`
  - `.qfai/specs/spec-0007/06_Test-Cases.md`
  - `.qfai/specs/spec-0007/09_delta.md`
  - `.qfai/specs/spec-0007/10_Plan.md`
  - `.qfai/specs/spec-0007/tdd/test-list.md`
  - `.qfai/specs/spec-0008/01_Spec.md`
  - `.qfai/specs/spec-0008/02_User-stories.md`
  - `.qfai/specs/spec-0008/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0008/04_Business-Rules.md`
  - `.qfai/specs/spec-0008/05_Examples.md`
  - `.qfai/specs/spec-0008/06_Test-Cases.md`
  - `.qfai/specs/spec-0008/09_delta.md`
  - `.qfai/specs/spec-0008/10_Plan.md`
  - `.qfai/specs/spec-0008/tdd/test-list.md`
  - `.qfai/specs/spec-0009/01_Spec.md`
  - `.qfai/specs/spec-0009/02_User-stories.md`
  - `.qfai/specs/spec-0009/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0009/04_Business-Rules.md`
  - `.qfai/specs/spec-0009/05_Examples.md`
  - `.qfai/specs/spec-0009/06_Test-Cases.md`
  - `.qfai/specs/spec-0009/09_delta.md`
  - `.qfai/specs/spec-0009/10_Plan.md`
  - `.qfai/specs/spec-0009/tdd/test-list.md`
  - `.qfai/specs/spec-0010/01_Spec.md`
  - `.qfai/specs/spec-0010/02_User-stories.md`
  - `.qfai/specs/spec-0010/09_delta.md`
  - `.qfai/specs/spec-0010/10_Plan.md`
  - `.qfai/specs/spec-0011/01_Spec.md`
  - `.qfai/specs/spec-0011/02_User-stories.md`
  - `.qfai/specs/spec-0011/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0011/04_Business-Rules.md`
  - `.qfai/specs/spec-0011/05_Examples.md`
  - `.qfai/specs/spec-0011/06_Test-Cases.md`
  - `.qfai/specs/spec-0011/09_delta.md`
  - `.qfai/specs/spec-0011/10_Plan.md`
  - `.qfai/specs/spec-0011/tdd/test-list.md`
  - `.qfai/specs/spec-0012/01_Spec.md`
  - `.qfai/specs/spec-0012/02_User-stories.md`
  - `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0012/04_Business-Rules.md`
  - `.qfai/specs/spec-0012/09_delta.md`
  - `.qfai/specs/spec-0012/10_Plan.md`
  - `.qfai/specs/spec-0013/01_Spec.md`
  - `.qfai/specs/spec-0013/02_User-stories.md`
  - `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0013/04_Business-Rules.md`
  - `.qfai/specs/spec-0013/05_Examples.md`
  - `.qfai/specs/spec-0013/06_Test-Cases.md`
  - `.qfai/specs/spec-0013/09_delta.md`
  - `.qfai/specs/spec-0013/10_Plan.md`
  - `.qfai/specs/spec-0013/tdd/test-list.md`
  - `.qfai/specs/spec-0014/01_Spec.md`
  - `.qfai/specs/spec-0014/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0014/04_Business-Rules.md`
  - `.qfai/specs/spec-0014/05_Examples.md`
  - `.qfai/specs/spec-0014/06_Test-Cases.md`
  - `.qfai/specs/spec-0014/09_delta.md`
  - `.qfai/specs/spec-0014/10_Plan.md`
  - `.qfai/specs/spec-0014/tdd/test-list.md`
  - `.qfai/specs/spec-0015/01_Spec.md`
  - `.qfai/specs/spec-0015/02_User-stories.md`
  - `.qfai/specs/spec-0015/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0015/04_Business-Rules.md`
  - `.qfai/specs/spec-0015/05_Examples.md`
  - `.qfai/specs/spec-0015/06_Test-Cases.md`
  - `.qfai/specs/spec-0015/09_delta.md`
  - `.qfai/specs/spec-0015/10_Plan.md`
  - `.qfai/specs/spec-0015/tdd/test-list.md`
  - `.qfai/specs/spec-0017/01_Spec.md`
  - `.qfai/specs/spec-0017/02_User-stories.md`
  - `.qfai/specs/spec-0017/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0017/04_Business-Rules.md`
  - `.qfai/specs/spec-0017/05_Examples.md`
  - `.qfai/specs/spec-0017/06_Test-Cases.md`
  - `.qfai/specs/spec-0017/09_delta.md`
  - `.qfai/specs/spec-0017/10_Plan.md`
  - `.qfai/specs/spec-0017/tdd/test-list.md`
  - `.qfai/specs/spec-0018/01_Spec.md`
  - `.qfai/specs/spec-0018/02_User-stories.md`
  - `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`
  - `.qfai/specs/spec-0018/04_Business-Rules.md`
  - `.qfai/specs/spec-0018/05_Examples.md`
  - `.qfai/specs/spec-0018/06_Test-Cases.md`
  - `.qfai/specs/spec-0018/07_Decisions.md`
  - `.qfai/specs/spec-0018/08_Open-questions.md`
  - `.qfai/specs/spec-0018/09_delta.md`
  - `.qfai/specs/spec-0018/10_Plan.md`
  - `.qfai/specs/spec-0018/tdd/test-list.md`

## Decision needed from user

Approve option 1: one change request, approved by you, whose Impact scope names
every spec and contract path the batch edits, committed before the first `tdd`
gate of the P2–P8 pull request?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` batch `sdd-batch-20260923100952585`, mode `re-derive`: the
   edits already written by the batch and its review-fix round are the rerun.
   Nothing is written under this record beyond them.
2. At commit time, re-derive `## Impact scope` with the command it names and
   commit this record in the first commit that carries the edits, before any
   `tdd` gate runs.
3. Downstream ledger sweep: none. No `tdd/test-list.md` row is reset or
   retired.
4. Set `Applied at` and write `## Resolution` in the same commit.

## Resolution

Filled when the batch is committed.
