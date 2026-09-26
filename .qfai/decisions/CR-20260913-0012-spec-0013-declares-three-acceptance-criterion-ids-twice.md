# Change Request

- ID: `CR-20260913-0012`
- Title: `spec-0013 declares three acceptance criterion ids twice, and the second of each has no test case`
- Raised by: `qfai-implement`
- Raised at: `2026-09-18T03:05:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user` (2026-09-24 reply; Claude Code selected option 1 on 2026-09-22)
- Approved at: `2026-09-24T08:55:00Z`
- Approved option: `1`
- Applied at: `2026-09-24T09:46:00Z`
- Superseded by: `-`

## Context

`.qfai/specs/spec-0013/03_Acceptance-Criteria.md` declares `AC-0013-0008`,
`AC-0013-0009` and `AC-0013-0010` twice each, in one contiguous block.

| Id             | First heading                  | Second heading                                  |
| -------------- | ------------------------------ | ----------------------------------------------- |
| `AC-0013-0008` | Business Flow Mermaid          | Missing Markdown Blocks Preflight               |
| `AC-0013-0009` | Delta Rejected Guardrails      | Optional Side Artifact Does Not Block Preflight |
| `AC-0013-0010` | Test Case Type Column Required | Design Contract Normalization                   |

**Every reference in the pack means the first heading.** `TC-0013-0008` is
"Business Flow Mermaid", `TC-0013-0009` is "Delta Rejected Guardrails", and
`BR-0013-0008`, `EX-0013-0008` and `TC-0013-0013` are the Type-column rule.
Nothing in the pack cites the second heading of any pair, so the first heading
keeps each number.

**The duplicate hides three criteria with no test case.** A test case citing
the first heading also counts as coverage for the second. Give the second
headings free ids and `QFAI-COV-201` reports all three uncovered, and the
dogfooding ratchet holds `spec-0013`'s `06_Test-Cases.md` at zero. So a bare
renumbering cannot land. Each of the three needs a test case or has to go.

Read against the rest of the pack, each second heading lands differently:

| Second heading                                  | Read against                                                                                                                                                     | Reading                                                                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing Markdown Blocks Preflight               | `AC-0013-0003`, restated by the approved `CR-20260903-0001`: a pack that exists but is incomplete does not stop SDD                                              | Contradicted. `CR-20260903-0001` restated `AC-0013-0003`, `BR-0013-0003`, `EX-0013-0003` and `TC-0013-0003` and did not reach this one, because it shares an id with a criterion about something else |
| Optional Side Artifact Does Not Block Preflight | `AC-0013-0003`, `REQ-0015`, `US-0013-0008`                                                                                                                       | Consistent, and live                                                                                                                                                                                  |
| Design Contract Normalization                   | `AC-0013-0016` and `AC-0013-0017`: `exploration-brief.yaml`, `evaluation-rubric.yaml` and `evaluator-calibration.yaml` are not in the active design-contract set | Superseded                                                                                                                                                                                            |

The requirements under the two that go are in the same state. `REQ-0014`
states the markdown stop. `REQ-0016`, `REQ-0017` and `REQ-0018` require the
three normalized files. The scope list in the same `01_Spec.md` already says
"drop legacy design contracts" and names all three.

## Reproduction

From `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`:

```text
31: ## AC-0013-0008: Business Flow Mermaid
35: ## AC-0013-0009: Delta Rejected Guardrails
39: ## AC-0013-0010: Test Case Type Column Required
43: ## AC-0013-0008: Missing Markdown Blocks Preflight
47: ## AC-0013-0009: Optional Side Artifact Does Not Block Preflight
51: ## AC-0013-0010: Design Contract Normalization
```

From `.qfai/specs/spec-0013/06_Test-Cases.md`:

```text
45: ## TC-0013-0008: Business Flow Mermaid
48: - AC-Refs: AC-0013-0008
51: ## TC-0013-0009: Delta Rejected Guardrails
54: - AC-Refs: AC-0013-0009
75: ## TC-0013-0013: Test Case Type Column Presence
78: - AC-Refs: AC-0013-0010
```

From `.qfai/specs/spec-0013/01_Spec.md`:

```text
31:   - discussion-pack markdown readiness gate
32:   - optional side artifacts are ignored by preflight
34:   - drop legacy design contracts (`exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, …)
76: - REQ-0014: Discussion-Pack Markdown Gate — SDD preflight は discussion-pack の必須 markdown readiness を検証し、欠落・未完成時のみブロックする
77: - REQ-0015: Optional Side Artifact Neutrality — SDD preflight は optional side artifact の欠落や旧形式の補助 prototyping artifact だけではブロックしない
78: - REQ-0016: Exploration-brief normalization — …
```

`.qfai/evidence/coverage-depth-spec-0013.md` already records the three
duplicates.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                     | Cost                                                                       | Risk                                                                                                                                                                             | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Keep the side-artifact criterion under a new id with its own chain; remove the other two and the requirements beneath them | One new chain of five ids; four requirement lines and two criteria removed | None found. What is removed restates a stop an approved Change Request retired, and files `AC-0013-0016` removed                                                                 | ✅          |
| 2   | Keep all three under new ids and write test cases for each                                                                 | Three new chains                                                           | Two of the chains specify behaviour the pack already rejects: a test case for the markdown stop contradicts `TC-0013-0003`, and one for normalization contradicts `TC-0013-0023` |             |
| 3   | Renumber all three and leave them uncovered                                                                                | Smallest                                                                   | Cannot land: `QFAI-COV-201` fails the ratchet on `06_Test-Cases.md`                                                                                                              |             |

## Proposed change

Option 1.

1. The first heading of each pair keeps its id. None of the six references
   above moves.
2. **Optional Side Artifact Does Not Block Preflight** takes the next free
   criterion id, `AC-0013-0028` in the current tree. It gains the
   chain `REQ-0011` requires of every criterion:
   - one business rule, `BR-0013-0021`, stating that the preflight's result
     does not depend on whether an optional side artifact is present, absent,
     malformed or in the old format;
   - one example, `EX-0013-0021`, with a pack whose markdown is complete and
     whose `prototyping.yaml` is absent;
   - two test cases, as `BR-0013-0008` requires a non-normal case beside the
     normal one:
     - `TC-0013-0036`, `normal`: the file is absent and the preflight is ready;
     - `TC-0013-0037`, `error`: the file is present with an invalid schema, or
       in the legacy format with no `prototyping` namespace, and the preflight
       is still ready.

   The behaviour is already tested. `packages/qfai/tests/core/sddPreflight.test.ts`
   holds "does not block when latest UI-bearing discussion pack is missing
   prototyping.yaml", "does not block when prototyping.yaml exists but
   namespaced schema is invalid" and "does not block when prototyping.yaml uses
   legacy-only schema (no prototyping namespace)".

3. **Missing Markdown Blocks Preflight** is removed, with `REQ-0014` and the
   scope line "discussion-pack markdown readiness gate". `AC-0013-0003`,
   `BR-0013-0003`, `EX-0013-0003` and `TC-0013-0003` already state the rule for
   an incomplete pack. `US-0013-0008` is restated without its first clause, "to
   block only on discussion-pack markdown readiness", leaving the side-artifact
   clause, which is what `AC-0013-0028` answers.
4. **Design Contract Normalization** is removed, with `REQ-0016`, `REQ-0017`
   and `REQ-0018`. `AC-0013-0016` and `AC-0013-0017` already state the active
   design-contract set.
5. `09_delta.md` records the removals. That file is where `AC-0013-0016` keeps
   the history of removed design contracts.

**The product is not edited.** The preflight still stops on a pack missing a
required file, which `AC-0013-0003` says SDD continues past. That contradiction
predates this record and is not caused by the removal, so it is a defect of
its own against the product rather than a step here. So is the missing check:
`QFAI-ID-001` reports an id defined in two files, never one defined twice in
the same file, which is how this duplicate went unreported.

## Blocked downstream items

| Item                                                               | Kind         | Why it depends on the artifact                                                           |
| ------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| The `spec-0013` rows Phase 2b seeds for `TC-0013-0036` and `-0037` | `ledger-row` | They do not exist until this record is applied, and they cite the criterion it renumbers |

- Not blocked by this CR: every existing `spec-0013` row. The test cases that
  cite `AC-0013-0008`, `AC-0013-0009` and `AC-0013-0010` mean the first
  headings, which keep their ids, and no row carries a test case for a second
  heading.
- Overlapping open CRs:
  - `CR-20260912-0003` names "the side-artifact `AC-0013-0009`", and says its
    option `2B` cannot be approved until this repair lands. Once this record is
    applied, that criterion is `AC-0013-0028`, and `CR-20260912-0003` is read
    with that id.
  - The other open records that edit `spec-0013`'s upstream files name none of
    the ids this record removes, renumbers or allocates. **This record is
    applied before all of them**, so the ids in step 2 are the next free ones
    when it runs. If one of them is applied first and allocates an id in the
    same range, this record takes the next free id instead, and its chain is
    otherwise unchanged.

## Impact scope

- Specs: `spec-0013`
- Plans: `.qfai/specs/spec-0013/10_Plan.md` — remove only the stale duplicate-ID pin and pending-application wording
- Tests: the rows Phase 2b seeds for `TC-0013-0036` and `TC-0013-0037`,
  against `packages/qfai/tests/core/sddPreflight.test.ts`; and, through the
  `/qfai-atdd spec-0013` pass in action 3, every other ATDD-owned `spec-0013`
  row still owed that no open Change Request blocks when that pass runs, with
  `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

## Decision needed from user

Approve option 1: keep the side-artifact criterion under a new id with a chain
of its own, and remove the markdown-stop and normalization criteria with the
requirements beneath them?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `re-derive`, over the three second headings. It
   records this Change Request as one row in `spec-0013/09_delta.md`'s
   `## Change Requests` table — `CR ID`, `Upstream artifact`, `Mode`,
   `Approved by`, `Applied at` — not as a `## Triage` row. It makes the edits in
   `## Proposed change`, steps 1 to 5. It also removes the now-stale
   duplicate-ID pin and pending-application wording from `10_Plan.md`; this
   is a direct consequence of the selected option and adds no obligation.

2. Phase 2b of that rerun seeds one `Integration` row per new test case, at
   `todo`, recording this CR's ID in `DR-ID`. It resets no existing row: no
   obligation an existing row carries moves.

3. **In this order**, once the rerun above has written the ledger:
   1. `/qfai-implement spec-0013` runs its Change Request preflight. It
      advances neither new row; their handover for this cycle is the next
      step's to record. It makes no product edit.
   2. `/qfai-atdd spec-0013` takes up the two new rows. Their tests exist
      already, so the stage binds each row to the tests named in step 2 of
      `## Proposed change` and records the handover. **That invocation is not
      limited to these rows**: it takes up every ATDD-owned `spec-0013` row
      still owed when it runs that no open Change Request blocks, as that
      stage's ordinary forward work. It writes their tests under
      `packages/qfai/tests/**`, their entries in
      `.qfai/evidence/atdd-spec-0013.md`, and a refreshed
      `.qfai/evidence/coverage-depth-spec-0013.md` through its reviewer gate.
      None of that edits an upstream path.
   3. `/qfai-implement spec-0013` resumes from that handover. This record makes
      no product edit.

## Resolution

Approved under option 1, the recommendation. It removes the two criteria the
rest of the pack already contradicts or supersedes, and keeps the one that is
live, so it adds the least of the three and restores nothing an approved record
retired. The user explicitly ratified this option on 2026-09-24. The owner
rerun applied it on 2026-09-24, after the ledger repair.

At application, `AC-0013-0026` and `AC-0013-0027` already exist. The
approved next-free-ID rule therefore selects `AC-0013-0028`.

The intent-driven work applied the same option a second time, on a line that
had not seen this application. The user selected option 1 again, recorded at
`2026-09-24T19:43:11Z`, and that rerun applied it at `2026-09-24T19:55:40Z` as
`AC-0013-0042` with rows `spec-0013/TDD-0061` and `TDD-0062`. When the two
lines were merged on 2026-09-25, this application stood and the second was
withdrawn. No approved decision changed:

- `AC-0013-0042` is removed from `03_Acceptance-Criteria.md`, and its ID stays reserved.
  `AC-0013-0028` states the same criterion.
- Its rows, renumbered to `spec-0013/TDD-0129` and `TDD-0130` by the merge, are
  retired with tombstones in `tdd/test-list.md`.
- Its test file, `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`,
  is deleted. Its two checks that this application's test lacked moved into
  `packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts`: the
  command's exit code and JSON report, and the same verdict with a valid
  artifact present.

One precondition for action 3.2, found when approving. `packages/qfai/tests/core/sddPreflight.test.ts`
is the file the two new rows bind to, and `.qfai/evidence/atdd-spec-0002.md`
records a hash of that whole file as spec-0002 `TDD-0001`'s RED test hash. An
annotation added there moves the hash, and `--profile tdd` then reports
`QFAI-TDDLIST-008` on that row. The pass that binds the new rows re-records that
evidence in the same run, or binds them to a test in another file.
