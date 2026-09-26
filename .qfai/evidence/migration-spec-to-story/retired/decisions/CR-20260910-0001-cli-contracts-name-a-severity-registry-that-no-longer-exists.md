# Change Request

- ID: `CR-20260910-0001`
- Title: `CLI contracts describe closed retirements as open windows, and name a module that is gone`
- Raised by: `claude-code`
- Raised at: `2026-09-10T00:00:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Severity no longer depends on the running version. `packages/qfai/src/core/sunset.ts` held two
registries and every windowed finding read its severity from them; the module is deleted and
each finding now carries the severity its pin named.

Three contracts under `.qfai/contracts/cli/` still describe the mechanism:

| File               | What it states                                                                                                         | What the code does                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `qfai-validate.md` | `D-DEPRECATED-PATH` and `W-SKILL-DOC-BROKEN-REF` are "warning (during window) / error (after sunset version)"          | each reports `error`, from a literal                                                |
| `qfai-validate.md` | a writer emits `D-DEPRECATED-PATH` when it writes `.qfai/output/validate.json` "during the deprecation window"         | nothing writes that path; the pre-sunset writer is deleted                          |
| `qfai-doctor.md`   | `browserTool: "playwright-cli"` is accepted "during the deprecation window" and the probe is a warning                 | the config loader rejects the value and the probe reports `error`                   |
| `qfai-init.md`     | the sunset is `SUNSETS.legacyAssistantSteering` in `core/sunset.ts`, and every surface "computes its severity from it" | the module does not exist; the label is a literal in `core/paths/assistantPaths.ts` |

Both retirements closed at 1.10.0, so the first three rows were already stale before this change. The fourth names a file the change deletes.

## Proposed change

Rewrite the four passages to state the current behaviour: one severity each, no window, and the
retirement named as a release that has passed rather than one that is coming. `qfai-init.md`'s
pointer moves to `core/paths/assistantPaths.ts#legacyAssistantSteeringSunsetLabel`, which is
where the label lives now.

## Options (at least 3) and recommendation

| #   | Option                                               | Cost                          | Risk                                                                                      | Recommended |
| --- | ---------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| 1   | Rewrite the four passages to the current behaviour   | four edits across three files | none identified; the contracts then match the code                                        | ✅          |
| 2   | Leave them as a record of what was true when written | none now                      | a reader takes the contract as current and expects a warning where the gate stops the run |             |
| 3   | Delete the retired-window sections outright          | three sections removed        | the retirement stops being written down anywhere a reader of the contract would look      |             |

Option 2 is the status quo and is what makes this a Change Request rather than a note: a
contract nobody can trust is worse than one that is missing. Option 3 loses the record that
`playwright-cli` and the pre-recut layout were ever accepted, which is what an adopter arriving
on an old tree needs.

## Blocked downstream items

| Item                                   | Kind       | Why it depends on the artifact                              |
| -------------------------------------- | ---------- | ----------------------------------------------------------- |
| `.qfai/contracts/cli/qfai-validate.md` | `contract` | states the severity of two codes and the legacy write path  |
| `.qfai/contracts/cli/qfai-doctor.md`   | `contract` | states the accepted `browserTool` values and the probe rule |
| `.qfai/contracts/cli/qfai-init.md`     | `contract` | names the module the severity was computed from             |

- Not blocked by this CR: every spec pack and ledger row. No `TC-Refs` names these contracts,
  the code they describe is already correct, and the finding is about the description rather than
  the behaviour, so nothing downstream is completing against an obligation under revision.
- Overlapping open CRs: none

## Impact scope

- Specs: `none`
- Plans: `none`
- Tests: `none`
- Contracts: `CLI-VALIDATE`, `CLI-DOCTOR`, `CLI-INIT` — `.qfai/contracts/cli/qfai-validate.md`, `.qfai/contracts/cli/qfai-doctor.md`, `.qfai/contracts/cli/qfai-init.md`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/contracts/cli/qfai-validate.md`, `.qfai/contracts/cli/qfai-doctor.md`, `.qfai/contracts/cli/qfai-init.md`

## Decision needed from user

Approve option 1, so the three CLI contracts can be rewritten to describe the retirements as closed?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: rewrite the four passages named in **Context** under the paths in **Impact scope**. No spec pack, capability or ID is touched.
2. Downstream ledger sweep: none. No `tdd/test-list.md` row names these contracts, so no row is reset and none is retired.

## Resolution

<!-- Filled in when Status leaves `open`. -->
