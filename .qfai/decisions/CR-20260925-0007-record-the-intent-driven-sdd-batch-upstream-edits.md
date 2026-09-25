# Change Request

- ID: `CR-20260925-0007`
- Title: `Record the upstream edits the intent-driven SDD batch made on its own branch`
- Raised by: `/qfai-implement orchestrator`
- Raised at: `2026-09-25T02:43:23Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user` — Option 1 selected through the structured question tool
- Approved at: `2026-09-25T02:43:23Z`
- Approved option: `1`
- Applied at: `2026-09-25T02:43:23Z`
- Superseded by: `-`

## Context

The intent-driven SDD batch and its implementation share one branch.
`QFAI-DRIFT-001` compares the branch with the base branch in the `tdd` profile
and reports every protected upstream file that changed without an approved
Change Request naming it. It does not run in the `sdd` profile, because
`/qfai-sdd` owns those files.

Five files the SDD batch itself wrote are reported, because no approved Change
Request names them. Every other upstream file the batch changed is already
named by one.

## Proposed change

None to the files. This request records that the five edits below are the
SDD batch's own, made by the owning stage under the batch's approved triage,
so the downstream guard reads them as sanctioned.

## Options (at least 3) and recommendation

| #   | Option                                                                    | Cost                               | Risk                                                                  | Recommended |
| --- | ------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | ----------- |
| 1   | Record the batch's own edits in an approved request naming the five paths | One record                         | None; the files are unchanged by it                                   | ✅          |
| 2   | Split the SDD artifacts into a pull request merged first                  | A second pull request and a rebase | The same guard runs on that pull request, so a request is owed anyway |             |
| 3   | Leave the findings                                                        | None now                           | The `tdd` lane stays red and the pull request cannot merge            |             |

Option 3 was not presented; it is recorded to meet the template minimum.

## Blocked downstream items

None.

## Impact scope

- `.qfai/contracts/cli/qfai-validate.md`
- `.qfai/specs/spec-0001/07_Decisions.md`
- `.qfai/specs/spec-0008/07_Decisions.md`
- `.qfai/specs/spec-0011/07_Decisions.md`
- `.qfai/specs/spec-0018/07_Decisions.md`

## Decision needed from user

Whether to record the batch's own edits so the guard reads them as sanctioned.

## Approved actions (owner skill rerun plan)

None. The edits were made by `/qfai-sdd` during the batch and are recorded in
each spec's `09_delta.md`.

## Resolution

The user selected Option 1. Nothing was rerun, and no file other than this
record changed.
