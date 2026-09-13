# Change Request

- ID: `CR-20260913-0005`
- Title: `spec-0014 ledger rows name cases that do not reach their obligations`
- Raised by: `qfai-implement`
- Raised at: `2026-09-13T01:15:15Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Three `done` rows of `.qfai/specs/spec-0014/tdd/test-list.md` name a `Test file`
whose cases pass, and none of those cases reaches the obligation the row's
`TC-Refs` states. One of the rows also packs two boundaries behind one id. The
ledger declares each obligation discharged by what the row names, and what it
names contradicts that declaration on its own terms.

| Row        | Obligation                                                                                                  | What the named case does                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TDD-0009` | `TC-0014-0009`: feed `/qfai-verify` a `REVISE` review artifact; verify blocks completion                    | Two `describe` blocks titled `TC-0014-0009` in `verifySemanticsSpec0014.test.ts` assert stale sidecar migration guidance                         |
| `TDD-0035` | `TC-0014-0035`: run `qfai prototyping certify --scope saas-package`                                         | `runPrototypingCertify` is called with the scope passed as an argument, so the command line is never parsed. The `Selector` matches no case name |
| `TDD-0036` | `TC-0014-0036`: run `certify --scope saas-package --upgrade-scope full` while gates are missing, then after | The same bypass, a `Selector` that matches no case name, and one row for two boundaries: the refusal and the promotion                           |

The two boundaries of `TC-0014-0036` fail independently.
`.qfai/assistant/skills/qfai-implement/references/selector-granularity.md` puts
one independently observable boundary on a row, and gives the split to
`/qfai-sdd` rather than to evidence time.

`09_delta.md` also carries four story chains whose identifiers the live pack
reuses for other subjects. They sit under a slice recorded as migration
history, and they are the only `US-* -> AC-*` links the pack records for those
stories:

| Chain start    | Subject in that slice                                      | Subject in `02_User-stories.md` today                       |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `US-0014-0013` | a Trend Scan field check                                   | verify uses the canonical validator path                    |
| `US-0014-0014` | rejecting dangling `evaluation_connection` references      | truthful evidence and placeholder rejection remain enforced |
| `US-0014-0018` | mandatory sections in a discussion-time design-system file | verify depends on the contract-first validate gates         |
| `US-0014-0019` | a `designSystemCompliance` score                           | legacy compatibility namespaces remain removed              |

A reader following the only chains that exist arrives at obligations the pack
no longer holds.

## Reproduction

Ledger cells on the default branch, all three rows at `done`:

```text
TDD-0009  Test file  packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts
          Selector   TC-0014-0009
TDD-0035  Test file  packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts
          Selector   TC-0014-0035: certify --scope saas-package seals certificate w/ scope + notes:
TDD-0036  Test file  packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
          Selector   TC-0014-0036: --upgrade-scope full rejected while gates missing; accepted once they PASS
```

`verifySemanticsSpec0014.test.ts` lines 44 and 173:

```text
describe("TC-0014-0009: stale sidecar migration guidance", () => {
describe("TC-0014-0009: stale sidecar migration errors", () => {
```

The command-line bypass, measured. Removing the two lines of
`packages/qfai/src/cli/main.ts` that forward `--scope` and `--upgrade-scope` to
`runPrototypingCertify`, then running both function-level suites and the
command-line suite:

```text
npx vitest run tests/integration/spec0014SaasPackageCertify.test.ts \
  tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts \
  tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
-> Test Files  1 failed | 2 passed (3)
-> Tests  3 failed | 18 passed (21)
```

The three failures are the three command-line cases. The 18 function-level
cases pass with neither flag forwarded.

## Proposed change

The cases each obligation needs exist in this change, so the rows are pointed at
them and `TDD-0036` is split at its boundary:

| Row        | `Test file`                                                          | `Selector`                                                                                                                       | `Status` |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `TDD-0009` | `packages/qfai/tests/integration/spec0014VerifyReviewerGate.test.ts` | `[shipped: the reviewer answers only PASS or REVISE, shipped: a REVISE from a routed blocking reviewer blocks DONE and handoff]` | `done`   |
| `TDD-0035` | `packages/qfai/tests/integration/spec0014SaasPackageCertify.test.ts` | `seals a certificate scoped to saas-package whose notes name every skipped gate`                                                 | `done`   |
| `TDD-0036` | `packages/qfai/tests/integration/spec0014SaasPackageCertify.test.ts` | `refuses the upgrade while the skipped gates are missing, naming them`                                                           | `done`   |
| `TDD-0037` | `packages/qfai/tests/integration/spec0014SaasPackageCertify.test.ts` | `promotes the certificate to full once the skipped gates pass`                                                                   | `todo`   |

`TDD-0037` carries `TC-0014-0036` and enters at `todo`: it names a boundary no
row has recorded evidence for. The three existing rows keep their obligations
and their status.

In `09_delta.md`, one sentence directly above the `v1.7.16` traceability block
states that those chain identifiers were reassigned and bind nothing in the
live pack. The chains stay as recorded.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                       |
| -------------------- | ------------ | -------------------------------------------------------------------- |
| `spec-0014/TDD-0009` | `ledger-row` | Its `Test file` and `Selector` are what this Change Request corrects |
| `spec-0014/TDD-0035` | `ledger-row` | Same                                                                 |
| `spec-0014/TDD-0036` | `ledger-row` | Same, and its `Selector` loses the promotion boundary to `TDD-0037`  |

- Not blocked: every other `spec-0014` row. This record changes no pointer of
  `TDD-0018`, `TDD-0019`, `TDD-0033` or `TDD-0034`, and `TDD-0028` and
  `TDD-0029` sit at `exception`.
- Overlapping open CRs: `CR-20260913-0006` holds `spec-0014/TDD-0034`; the two
  blocked sets do not intersect.

## Impact scope

- Specs: `spec-0014`
- Plans: `none`
- Tests: `spec-0014/TDD-0009`, `TDD-0035`, `TDD-0036`, `TDD-0037` —
  `packages/qfai/tests/integration/spec0014VerifyReviewerGate.test.ts`,
  `packages/qfai/tests/integration/spec0014SaasPackageCertify.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0014/tdd/test-list.md`,
  `.qfai/specs/spec-0014/09_delta.md`

## Decision needed from user

Point `TDD-0009`, `TDD-0035` and `TDD-0036` at the cases that reach their
obligations, split `TDD-0036`'s promotion into `TDD-0037`, and record in
`09_delta.md` that the `v1.7.16` chain identifiers bind nothing in the live
pack?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0014`, mode `confirm-only`. The edits are the ones under
   `## Proposed change`, applied by hand under this approval: the three row
   pointers, the new `TDD-0037` row, and the sentence in `09_delta.md`. The
   rerun confirms that each row names a case that exists and passes, and writes
   this Change Request's row in `09_delta.md`'s `## Change Requests` table.
2. Downstream ledger sweep: no reset and no retirement. `TDD-0009`, `TDD-0035`
   and `TDD-0036` keep `done` and take this Change Request in `DR-ID`; their
   obligations do not move, only the case each one names. Their evidence is
   recorded against the new cases under `/qfai-implement`, where the
   implementation predates the record and the falsifiability path applies.
   `TDD-0037` is added at `todo` with this Change Request in `DR-ID`.

## Resolution

Not yet resolved.
