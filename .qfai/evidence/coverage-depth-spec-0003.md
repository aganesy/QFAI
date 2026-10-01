# Coverage Depth Matrix — spec-0003

## Scope

This matrix scores every active obligation this pack declares: the **27 user stories** of
`02_User-stories.md` (`US-0003-0001` … `US-0003-0028`, one `## US-0003-NNNN:` heading each) and the
**59 test cases** of `06_Test-Cases.md` (`TC-0003-0001` … `TC-0003-0059`, one row each in the Test
Case Table). `US-0003-0014` is not in the pack: its catalog line and heading are gone, so it owes
nothing and has no row. No remaining story carries a `- x-qfai-status: planned` line, so all 27 owe an
acceptance test. Both sets are read from the pack in full, not from the rows of
`.qfai/specs/spec-0003/tdd/test-list.md`.

The business rule table below carries all **49** `BR-0003-*` rows of the Rule Table in
`04_Business-Rules.md`. None carries a status retiring it, so all 49 are active and all 49 own a row.

`TC-0003-0059` and `BR-0003-0049` were added to the pack by `CR-20260925-0011`. Their two rows were
read at a later revision than the others; see "The two rows added for the Copilot instructions".

`Status` is a row verdict, not a mark, and is excluded from every total below. The scored cells are
the nine depth columns of the matrix and the `Positive case` / `Negative case` /
`Conditional branches` columns of the business rule table.

**What credits a cell.** A cell is credited only to a case that runs and that this pack owns. A test
existing somewhere in the repository is not coverage here. Ownership is read in two steps:

1. **An annotation binds.** A case carrying `QFAI:SPEC-0003:<ID>` is bound to that obligation and to
   no other. A case annotated for one ID of this pack cannot answer a sibling ID of the same pack, so
   a `TC-*` case does not answer the `US-*` its criterion names, and the reverse. A case annotated for
   another spec is bound to that spec.
2. **An unannotated case is owned where the obligation has no annotated one.** Where an obligation
   has no annotated case anywhere, every unannotated case that produces its outcome is scored. Three
   obligations are in that position — `TC-0003-0028`, `TC-0003-0032` and `TC-0003-0033` — and each is
   scored on an unannotated `describe` named for its ID.

Two readings of step 1 decide many cells, so they are stated here once:

- **An annotation above a `describe` binds the whole `describe`; one above an `it` binds that `it`.**
  `codexAgentWrappers.test.ts` annotates the `describe`, so every case in it answers `TC-0003-0055`.
  `shippedWorkflowCheckIndependence.test.ts` annotates four named `it`s, so its three `it.each`
  blocks — the ones that execute the delivered aggregate bodies — are unannotated. `TC-0003-0056` and
  `-0057` have annotated cases, so step 2 does not reach those blocks either, and they credit nothing.
- **A file-level annotation block binds the cases named for each ID.**
  `tests/integration/initSpec0003.test.ts` opens with 24 annotation lines and holds one `describe`
  per ID that reads `src/cli/commands/init.ts` as text. Those are the annotated cases for
  `TC-0003-0001` … `-0026` less `-0016` / `-0017`. `tests/cli/init.test.ts` holds real runtime cases
  for most of the same behaviour and annotates only `TC-0003-0011` … `-0014` and `-0021` … `-0026`,
  so its other runtime cases are unreachable under step 2. That is Finding 1, and it is the largest
  single cause of `❌` in this matrix.

**How `n/a` is read.** A column is `n/a` only where its obligation does not exist for the row, per
`test-case-depth-checklist.md`: no kept failure owned through the row's `AC-Refs` / `EX-Ref` chain
(`Error path`), no ordered or sized domain (`Boundary values`), no special value the row's input
admits beyond its declared partitions (`Special values`), no multi-step or re-run sequence
(`State transitions`), no interacting conditions (`Combinatorial`). A `TC-*` row declaring `Type`
`error`, `boundary` or `edge` marks `Normal path` `n/a`. A row that reads only the packaged asset tree
reads a fixed artifact, so `Special values` and `Boundary values` there are `n/a` unless the row plants
an input or the rule names a count.

**How `Status` is set.** `❌` when any of these hold: `Normal path` is `❌`, `Oracle strength` is `❌`,
a safety-floor cell is anything but `✅`, or the row's test fixes the opposite of what the row declares.
`✅` only when every scored cell is `✅` or `n/a`. `⚠️` otherwise. A business-rule row is `❌` when any
scored cell is `❌` or when its test fixes the opposite of the rule.

**Twenty of the eighty-six matrix obligations are discharged by nothing their pack owns, or by a
case about something else.** Five stories have no test at all (`US-0003-0016` … `-0020`). Two
test cases are coverage placeholders with no test (`TC-0003-0016`, `-0017`). Thirteen test cases
are answered only by source-text reads of `init.ts` (`TC-0003-0001` … `-0010`, `-0015`, `-0018`,
`-0019`). Those twenty rows carry 93 of the matrix's 150 `❌` cells. The remaining rows are scored on
their merits.

The shipped-workflow half of the pack (`TC-0003-0027` … `-0058`, `US-0003-0021` … `-0028`) is the
strongest work here: planted-negative controls beside every clean acceptance, executed shell bodies
rather than text scans, and closed-set equality rather than presence. `TC-0003-0044`, `-0055`,
`-0036`, `-0051` and `-0053` are exemplary. The init half (`TC-0003-0001` … `-0026`,
`US-0003-0001` … `-0020`) is where the gaps sit.

**Five obligations are fixed to the opposite of what they declare.** `US-0003-0001`, `US-0003-0015`,
`TC-0003-0022`, `TC-0003-0026` and `TC-0003-0037` are scored against what their tests actually do,
and their `Status` records the disagreement. In each the product moved and the pack did not. See
Findings 2.

Section "Every ❌ cell, named" accounts for all 176 of them in named groups whose coordinates are
fully enumerated, so that "one justification per `❌`" is checkable rather than asserted. Section
"Every ⚠️ cell, named" does the same for all 130 partial scores, which the PASS criterion also
requires a rationale for.

## What was measured, and how

**No test was run to produce this matrix.** The instruction for this stage was to read the tests,
not to run the suite, so every score rests on reading the case bodies, the helpers they call and the
source they exercise, at revision `d842484798a82f6de425bf892e17e7b36d2e196e`. A mark here says what a
case asserts and whether the assertion can fail; it does not say the case passes today. The ledger's
`Evidence` column and `.qfai/evidence/implement-spec-0003.md` record the runs that exist.

The files that carry spec-0003 cases, and what each drives:

| File | Carries | Drives |
| --- | --- | --- |
| `tests/e2e/initE2E.test.ts` | `US-0003-0001` … `-0010`, `-0015` | `runInit` into a temp dir |
| `tests/e2e/spec0003CopilotInstructionsE2E.test.ts` | `US-0003-0011` … `-0013` | `runInit`, re-runs, `--force` |
| `tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts` | `US-0003-0021` … `-0028` | the delivered tree; step bodies under bash |
| `tests/integration/initSpec0003.test.ts` | `TC-0003-0001` … `-0026` less `-0016`/`-0017` | reads `init.ts` as text; imports two modules |
| `tests/cli/init.test.ts` | `TC-0003-0011` … `-0014`, `-0021` … `-0026` | `runInit` into a temp dir |
| `tests/integration/shippedWorkflows.test.ts` | `TC-0003-0027`, `-0029`; unannotated `-0028` | the packaged tree, parsed |
| `tests/integration/shippedWorkflowPins.test.ts` | `TC-0003-0030`, `-0031`; unannotated `-0032`, `-0033` | parsed tree; guard and hygiene lane spawned |
| `tests/integration/shippedWorkflowTopology.test.ts` | `TC-0003-0034`, `-0035` | planted temp copies |
| `tests/integration/shippedWorkflowInertness.test.ts` | `TC-0003-0036`, `-0037` | `runInit`; probe bodies under bash |
| `tests/integration/shippedWorkflowDetection.test.ts` | `TC-0003-0038` … `-0040` | detection and verdict bodies over git fixtures |
| `tests/integration/shippedWorkflowRunners.test.ts` | `TC-0003-0041`, `-0042` | planted replicas of file bodies |
| `tests/integration/shippedWorkflowPortability.test.ts` | `TC-0003-0043`, `-0044`, `-0053`, `-0058` | resolution and install bodies under bash |
| `tests/integration/shippedWorkflowOwnership.test.ts` | `TC-0003-0045` … `-0048`, `-0051`, `-0052`, `-0054` | `runInit` over provenance fixtures; `init.ts` source |
| `tests/integration/shippedWorkflowShapeGate.test.ts` | `TC-0003-0049`, `-0050` | the declared-shape differ over planted copies |
| `tests/integration/codexAgentWrappers.test.ts` | `TC-0003-0055` | `runInit`, `--force`, `--dry-run` |
| `tests/integration/shippedWorkflowCheckIndependence.test.ts` | `TC-0003-0056`, `-0057` | the delivered tree; aggregate bodies under bash |
| `tests/integration/initCopilotLegacyWindow.test.ts` | `TC-0003-0059` | `runInit` into a temp dir; the generated Copilot instructions |

Paths are relative to `packages/qfai/`.

### The two rows added for the Copilot instructions

`TC-0003-0059` and `BR-0003-0049` were read at revision `22afc279e`, from
`tests/integration/initCopilotLegacyWindow.test.ts` and the `TDD-0094` entry of
`.qfai/evidence/atdd-spec-0003.md`. The file carries `// QFAI:SPEC-0003:TC-0003-0059` above its one
`describe`, so all four `it`s answer the test case and no other obligation.

The case runs `runInit` into an empty temporary directory, reads the generated
`.github/copilot-instructions.md`, and takes the one top-level list item that mentions
`D-DEPRECATED-PATH`, with its continuation lines joined. Each verify bullet has its own `it`:

| Verify bullet | `it` | What it asserts |
| --- | --- | --- |
| 1 | line 40 | the item names both legacy surfaces and says `past its compatibility window` |
| 2 | line 46 | the item says `` `qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error `` |
| 3 | line 50 | the item names `` `qfai init --upgrade-assistant-tree` `` |
| 4 | line 54 | the whole file does not match `/read-compatible/i`; the item does not match `/warning/i` |

The `TDD-0094` entry records a RED against the old wording, with bullets 1, 2 and 4 failing, and a
mutation that deletes the item, with bullets 1 to 3 failing. Every `it` has therefore been seen to
fail. The negative assertions of bullet 4 are not vacuous: bullets 1 to 3 fail when no item is found.

How each cell of the two rows was scored:

| Coordinate | Mark | Why |
| --- | --- | --- |
| `TC-0003-0059` × EP | ✅ | The row declares one input, an empty directory with no flag, and two output partitions: the statements that must appear and the wordings that must not. Both are asserted. |
| `TC-0003-0059` × NP | ✅ | `Type` is `normal`, and all four verify bullets are asserted. |
| `TC-0003-0059` × ER | n/a | `AC-0003-0039` and `EX-0003-0052` declare no failure outcome, so the row owns no kept failure. |
| `TC-0003-0059` × ED | ✅ | The statement is wrapped across three source lines; the item is read with its continuation lines joined, so a phrase split by a line break still matches. Both forbidden words are matched case-insensitively, and `read-compatible` is checked across the whole file. |
| `TC-0003-0059` × BV | n/a | No ordered or sized domain: the generated text is fixed and the row names no count. |
| `TC-0003-0059` × SV | n/a | The row plants no input; `buildCopilotInstructions` takes no argument. |
| `TC-0003-0059` × ST | n/a | One run. A re-run and `--force` are not part of the row's scenario. |
| `TC-0003-0059` × CO | n/a | No interacting conditions: the generated text does not vary with any option. |
| `TC-0003-0059` × OS | ✅ | Exact-phrase containment against the product's own output, and every `it` has been seen to fail. |
| `BR-0003-0049` × Positive | ✅ | The four assertions are the outcome `EX-0003-0052` states, word for word. |
| `BR-0003-0049` × Negative | n/a | The rule forbids two wordings but has no rejection mechanism, so, like the other prohibitions in this table, it is scored as its positive case. |
| `BR-0003-0049` × Conditional | n/a | The rule states one outcome. |

`AC-0003-0039` also names `US-0003-0010` and `US-0003-0020` in its `US-Refs`. The annotation binds this
case to the test case, so it cannot answer either story, and neither story row was rescored.

### The four cases moved into an integration module

The cases that were ledger rows `TDD-0058` … `TDD-0061` now live in
`tests/integration/shippedWorkflowCheckIndependence.test.ts`, annotated `TC-0003-0056` and `-0057`.
They are gone from `tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`, which now carries no case for
the independent-check half of `AC-0003-0038`. `AC-0003-0038` names `US-0003-0023` in its `US-Refs`, so
that story's `Normal path` and `Error path` lose the half they drew from those cases; the `TC-*`
bindings answer the two test cases and not the story. The three `TC-0003-0058` cases in
`tests/integration/shippedWorkflowPortability.test.ts` carry their annotation on each `it`.

### Annotation coverage

The ATDD profile was run over this pack:

```text
$ node packages/qfai/dist/cli/index.mjs validate --profile atdd --spec spec-0003 --fail-on never --format github --root .
```

Before this file existed it reported `QFAI-ATDD-131` for the missing matrix, `QFAI-ATDD-117`
(`14 exempt / 44 owed`: fourteen rows declare `Level: unit`) and `QFAI-ATDD-119` naming ten
obligations covered by an annotation carrier alone: `US-0003-0016` … `-0020`, `TC-0003-0016`,
`-0017`, `-0028`, `-0032`, `-0033`. The scan matched 189 files, so the package suite is reached and
no global carrier-only condition caps the rows.

The scan and this matrix disagree in two places, and the reason matters. The scan counts
`TC-0003-0001` … `-0010`, `-0015`, `-0018` and `-0019` as covered, because
`initSpec0003.test.ts` carries their annotations; this matrix finds those cases assert nothing the
rows declare. The scan counts `TC-0003-0032` and `-0033` as carrier-only; this matrix credits them
through step 2, because a real, unannotated `describe` produces each outcome. The traceability gate
answers whether an obligation is annotated. This matrix answers whether it is tested, and how deeply.

### Skipped tests and early returns

No spec-0003 file contains a `.skip`, `.only` or `.todo` modifier. The `QFAI-TEST-003` findings in the
same run belong to spec-0004 and spec-0006 files.

One pattern acts like a skip. Six executed cases in `spec0003ShippedWorkflowSetE2E.test.ts` begin
with `if (x.skipped) return;`, and `runStep` sets `skipped` when `bash` is absent. On such a runner
those cases pass having asserted nothing. `shippedWorkflowCheckIndependence.test.ts` asserts
`executed.skipped` is `false` instead, which is the stronger form. This caps `Oracle strength` at `⚠️`
on `US-0003-0023`, `-0024` and `-0026`.

## The matrix

| US/TC ID | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US-0003-0001 | ⚠️ | ⚠️ | n/a | ❌ | n/a | n/a | n/a | n/a | ⚠️ | ❌ |
| US-0003-0002 | ⚠️ | ⚠️ | n/a | ❌ | n/a | ❌ | ⚠️ | n/a | ⚠️ | ⚠️ |
| US-0003-0003 | ⚠️ | ⚠️ | n/a | ❌ | n/a | n/a | ⚠️ | ❌ | ⚠️ | ⚠️ |
| US-0003-0004 | ⚠️ | ⚠️ | n/a | ❌ | n/a | n/a | n/a | ❌ | ⚠️ | ⚠️ |
| US-0003-0005 | ❌ | ❌ | n/a | ❌ | n/a | n/a | ❌ | ❌ | ❌ | ❌ |
| US-0003-0006 | ⚠️ | ⚠️ | ❌ | ❌ | n/a | n/a | ❌ | ❌ | ⚠️ | ❌ |
| US-0003-0007 | ⚠️ | ✅ | n/a | ❌ | n/a | n/a | ✅ | ❌ | ✅ | ⚠️ |
| US-0003-0008 | ✅ | ✅ | n/a | ⚠️ | n/a | n/a | ✅ | ⚠️ | ✅ | ⚠️ |
| US-0003-0009 | ⚠️ | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ | ❌ | ❌ |
| US-0003-0010 | ❌ | ⚠️ | n/a | ❌ | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0003-0011 | ✅ | ✅ | n/a | ⚠️ | n/a | ❌ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| US-0003-0012 | ⚠️ | ✅ | ❌ | ❌ | n/a | n/a | ✅ | n/a | ✅ | ❌ |
| US-0003-0013 | ✅ | ✅ | n/a | ⚠️ | ⚠️ | n/a | ⚠️ | n/a | ✅ | ⚠️ |
| US-0003-0015 | ✅ | ⚠️ | n/a | ❌ | ⚠️ | ❌ | ✅ | ❌ | ✅ | ❌ |
| US-0003-0016 | ❌ | ❌ | n/a | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ❌ |
| US-0003-0017 | ❌ | ❌ | n/a | ❌ | n/a | ❌ | ❌ | ❌ | ❌ | ❌ |
| US-0003-0018 | ❌ | ❌ | n/a | ❌ | n/a | n/a | ❌ | n/a | ❌ | ❌ |
| US-0003-0019 | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0003-0020 | ❌ | ❌ | n/a | ❌ | ❌ | n/a | ❌ | n/a | ❌ | ❌ |
| US-0003-0021 | ⚠️ | ✅ | ❌ | ⚠️ | n/a | n/a | n/a | n/a | ✅ | ❌ |
| US-0003-0022 | ⚠️ | ✅ | ⚠️ | ❌ | ❌ | n/a | n/a | n/a | ⚠️ | ⚠️ |
| US-0003-0023 | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | n/a | ⚠️ | ⚠️ | ⚠️ |
| US-0003-0024 | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | n/a | ⚠️ | ⚠️ | ⚠️ |
| US-0003-0025 | ⚠️ | ✅ | ❌ | ❌ | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| US-0003-0026 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | n/a | ⚠️ | ⚠️ | ⚠️ |
| US-0003-0027 | ⚠️ | ✅ | ❌ | ✅ | n/a | ❌ | ✅ | ⚠️ | ✅ | ❌ |
| US-0003-0028 | ✅ | ⚠️ | ✅ | ⚠️ | n/a | n/a | n/a | ❌ | ✅ | ⚠️ |
| TC-0003-0001 | ❌ | ❌ | n/a | n/a | n/a | ❌ | n/a | n/a | ❌ | ❌ |
| TC-0003-0002 | ❌ | ❌ | n/a | n/a | n/a | n/a | ❌ | n/a | ❌ | ❌ |
| TC-0003-0003 | ❌ | ❌ | n/a | n/a | n/a | n/a | ❌ | ❌ | ❌ | ❌ |
| TC-0003-0004 | ❌ | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| TC-0003-0005 | ❌ | ❌ | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ | ❌ |
| TC-0003-0006 | ❌ | ❌ | n/a | ❌ | n/a | n/a | n/a | ❌ | ❌ | ❌ |
| TC-0003-0007 | ❌ | ❌ | n/a | n/a | n/a | n/a | ❌ | n/a | ❌ | ❌ |
| TC-0003-0008 | ❌ | ❌ | n/a | ❌ | n/a | n/a | ❌ | ❌ | ❌ | ❌ |
| TC-0003-0009 | ❌ | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| TC-0003-0010 | ❌ | n/a | ❌ | n/a | n/a | n/a | n/a | ❌ | ❌ | ❌ |
| TC-0003-0011 | ✅ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0012 | ✅ | n/a | n/a | ✅ | n/a | ✅ | n/a | ✅ | ✅ | ✅ |
| TC-0003-0013 | ⚠️ | n/a | ❌ | ⚠️ | n/a | n/a | ✅ | n/a | ⚠️ | ❌ |
| TC-0003-0014 | ✅ | ✅ | n/a | n/a | ⚠️ | n/a | ✅ | n/a | ✅ | ⚠️ |
| TC-0003-0015 | ❌ | n/a | n/a | ❌ | ❌ | n/a | ❌ | n/a | ❌ | ❌ |
| TC-0003-0016 | ❌ | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| TC-0003-0017 | ❌ | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| TC-0003-0018 | ❌ | ❌ | n/a | n/a | ❌ | n/a | n/a | n/a | ❌ | ❌ |
| TC-0003-0019 | ❌ | n/a | n/a | ❌ | ❌ | n/a | ❌ | ❌ | ❌ | ❌ |
| TC-0003-0020 | ⚠️ | n/a | n/a | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0021 | ⚠️ | ⚠️ | n/a | ⚠️ | ⚠️ | ❌ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0022 | ✅ | ⚠️ | n/a | ✅ | n/a | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| TC-0003-0023 | ✅ | ⚠️ | n/a | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| TC-0003-0024 | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | ✅ | n/a | ⚠️ | ⚠️ |
| TC-0003-0025 | ⚠️ | ⚠️ | ❌ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0026 | ⚠️ | n/a | n/a | ✅ | ❌ | n/a | ❌ | n/a | ✅ | ❌ |
| TC-0003-0027 | ⚠️ | ✅ | n/a | ⚠️ | n/a | n/a | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0028 | ⚠️ | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ❌ |
| TC-0003-0029 | ✅ | n/a | n/a | ✅ | ⚠️ | n/a | n/a | ⚠️ | ⚠️ | ⚠️ |
| TC-0003-0030 | ⚠️ | ✅ | n/a | ✅ | ❌ | n/a | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0031 | ⚠️ | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0032 | ✅ | n/a | ✅ | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0003-0033 | ✅ | n/a | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0034 | ✅ | n/a | ⚠️ | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ | ⚠️ |
| TC-0003-0035 | ⚠️ | ✅ | n/a | ✅ | ✅ | n/a | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0036 | ✅ | ✅ | n/a | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |
| TC-0003-0037 | ⚠️ | n/a | n/a | ✅ | ❌ | n/a | n/a | ⚠️ | ✅ | ❌ |
| TC-0003-0038 | ✅ | ⚠️ | n/a | ✅ | n/a | ✅ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0039 | ✅ | n/a | ✅ | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0003-0040 | ✅ | n/a | ✅ | ✅ | ✅ | ⚠️ | n/a | ⚠️ | ✅ | ⚠️ |
| TC-0003-0041 | ✅ | n/a | ✅ | ✅ | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0042 | ⚠️ | ✅ | n/a | ✅ | n/a | ✅ | n/a | n/a | ✅ | ⚠️ |
| TC-0003-0043 | ✅ | n/a | n/a | ✅ | ✅ | ❌ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0044 | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |
| TC-0003-0045 | ✅ | ⚠️ | n/a | ✅ | n/a | ⚠️ | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0046 | ✅ | n/a | ✅ | ⚠️ | n/a | ✅ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0047 | ✅ | n/a | n/a | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| TC-0003-0048 | ✅ | ✅ | n/a | ✅ | n/a | n/a | n/a | ✅ | ⚠️ | ⚠️ |
| TC-0003-0049 | ✅ | n/a | ✅ | ✅ | ⚠️ | ✅ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0050 | ✅ | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0003-0051 | ✅ | n/a | n/a | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ |
| TC-0003-0052 | ⚠️ | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0003-0053 | ✅ | ✅ | n/a | ✅ | ✅ | n/a | n/a | ✅ | ✅ | ✅ |
| TC-0003-0054 | ✅ | ⚠️ | n/a | ✅ | n/a | n/a | ✅ | n/a | ✅ | ⚠️ |
| TC-0003-0055 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TC-0003-0056 | ✅ | ✅ | ❌ | ✅ | n/a | ❌ | n/a | ❌ | ✅ | ⚠️ |
| TC-0003-0057 | ✅ | ✅ | ❌ | ✅ | n/a | ❌ | n/a | ✅ | ✅ | ⚠️ |
| TC-0003-0058 | ⚠️ | n/a | ⚠️ | ✅ | n/a | ✅ | n/a | ⚠️ | ⚠️ | ⚠️ |
| TC-0003-0059 | ✅ | ✅ | n/a | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ |

Totals across the nine scored depth columns, 774 cells (86 rows × 9): **✅ 199 / ⚠️ 113 / ❌ 150**,
with `n/a` 312.

`Status` is the row verdict and is not a scored cell, so it is excluded from that total and from the
grand total at the end. Its distribution across the 86 rows, for reading only, is ✅ 10 / ⚠️ 42 / ❌ 34.

Per scored depth column, 86 cells each:

| Column | ✅ | ⚠️ | ❌ | n/a |
| --- | --- | --- | --- | --- |
| Equivalence partitions | 37 | 27 | 22 | 0 |
| Normal path | 27 | 17 | 19 | 23 |
| Error path | 10 | 5 | 14 | 57 |
| Edge cases | 34 | 12 | 22 | 18 |
| Boundary values | 11 | 9 | 9 | 57 |
| Special values | 13 | 3 | 12 | 58 |
| State transitions | 13 | 4 | 13 | 56 |
| Combinatorial | 15 | 12 | 16 | 43 |
| Oracle strength | 39 | 24 | 23 | 0 |

The shape of that table is the pack's central fact. The `❌` cells in `Normal path` and
`Oracle strength` sit almost entirely on the twenty rows named in Scope; outside them, twenty-seven rows
have a passing normal path and thirty-nine a strong oracle. `Error path` is `n/a` on 57 rows because
most rows own no kept failure, and twelve of the fourteen `Error path` `❌` cells are on rows with a
credited case.

### Business rule coverage

One row per active `BR-0003-*`. All 49 rows of the Rule Table are active, so none is omitted.

`Covering TC` is derived from the `BR-Ref` of the example each test case cites — that is, from
`06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`. `TC-0003-0009` and `TC-0003-0055` cite no
example, so they appear under no rule; `TC-0003-0009` reaches `BR-0003-0007` through `AC-0003-0009`,
which the placeholder `TC-0003-0017` is the example route for.

| BR ID | Positive case | Negative case | Conditional branches | Covering TC | Status |
| --- | --- | --- | --- | --- | --- |
| BR-0003-0001 | ❌ | n/a | ❌ | TC-0003-0001, TC-0003-0002 | ❌ |
| BR-0003-0002 | ❌ | n/a | ❌ | TC-0003-0003 | ❌ |
| BR-0003-0003 | ❌ | n/a | n/a | TC-0003-0004 | ❌ |
| BR-0003-0004 | ❌ | n/a | n/a | TC-0003-0005 | ❌ |
| BR-0003-0005 | ❌ | n/a | n/a | TC-0003-0016 | ❌ |
| BR-0003-0006 | ❌ | n/a | ❌ | TC-0003-0006 | ❌ |
| BR-0003-0007 | ❌ | n/a | ❌ | TC-0003-0017 | ❌ |
| BR-0003-0008 | ❌ | ❌ | n/a | TC-0003-0010 | ❌ |
| BR-0003-0009 | ✅ | ❌ | ⚠️ | TC-0003-0011, -0012, -0013 | ❌ |
| BR-0003-0010 | ✅ | n/a | ⚠️ | TC-0003-0014 | ⚠️ |
| BR-0003-0011 | ❌ | n/a | n/a | TC-0003-0007, TC-0003-0008 | ❌ |
| BR-0003-0012 | ❌ | n/a | ❌ | TC-0003-0015 | ❌ |
| BR-0003-0013 | ⚠️ | n/a | n/a | TC-0003-0018, TC-0003-0020 | ❌ |
| BR-0003-0014 | ❌ | n/a | ❌ | TC-0003-0019 | ❌ |
| BR-0003-0015 | ⚠️ | n/a | n/a | TC-0003-0021 | ⚠️ |
| BR-0003-0016 | ⚠️ | n/a | ⚠️ | TC-0003-0022 | ❌ |
| BR-0003-0017 | ✅ | n/a | ✅ | TC-0003-0023 | ✅ |
| BR-0003-0018 | ✅ | n/a | n/a | TC-0003-0024 | ✅ |
| BR-0003-0019 | ⚠️ | ❌ | n/a | TC-0003-0025 | ❌ |
| BR-0003-0020 | ⚠️ | n/a | ❌ | TC-0003-0026 | ❌ |
| BR-0003-0021 | ✅ | n/a | n/a | TC-0003-0027 | ✅ |
| BR-0003-0022 | ✅ | ❌ | ✅ | TC-0003-0028 | ❌ |
| BR-0003-0023 | ✅ | n/a | ⚠️ | TC-0003-0029 | ⚠️ |
| BR-0003-0024 | ✅ | n/a | n/a | TC-0003-0030 | ✅ |
| BR-0003-0025 | ✅ | n/a | n/a | TC-0003-0031 | ✅ |
| BR-0003-0026 | ✅ | ✅ | n/a | TC-0003-0032 | ✅ |
| BR-0003-0027 | ✅ | ✅ | ❌ | TC-0003-0033 | ❌ |
| BR-0003-0028 | ✅ | ⚠️ | n/a | TC-0003-0034 | ⚠️ |
| BR-0003-0029 | ✅ | n/a | n/a | TC-0003-0035 | ✅ |
| BR-0003-0030 | ✅ | n/a | ✅ | TC-0003-0036 | ✅ |
| BR-0003-0031 | ⚠️ | n/a | ❌ | TC-0003-0037 | ❌ |
| BR-0003-0032 | ⚠️ | n/a | n/a | TC-0003-0038 | ⚠️ |
| BR-0003-0033 | ✅ | ✅ | ✅ | TC-0003-0039 | ✅ |
| BR-0003-0034 | ✅ | n/a | ✅ | TC-0003-0040 | ✅ |
| BR-0003-0035 | ✅ | ⚠️ | n/a | TC-0003-0041 | ⚠️ |
| BR-0003-0036 | ✅ | n/a | n/a | TC-0003-0042 | ✅ |
| BR-0003-0037 | ✅ | n/a | ✅ | TC-0003-0043, TC-0003-0053 | ✅ |
| BR-0003-0038 | ✅ | ✅ | ✅ | TC-0003-0044 | ✅ |
| BR-0003-0039 | ⚠️ | n/a | n/a | TC-0003-0045 | ⚠️ |
| BR-0003-0040 | ⚠️ | ✅ | ✅ | TC-0003-0046 | ⚠️ |
| BR-0003-0041 | ✅ | n/a | ✅ | TC-0003-0047 | ✅ |
| BR-0003-0042 | ✅ | n/a | n/a | TC-0003-0048 | ✅ |
| BR-0003-0043 | ⚠️ | ✅ | n/a | TC-0003-0049 | ⚠️ |
| BR-0003-0044 | ✅ | n/a | n/a | TC-0003-0050 | ✅ |
| BR-0003-0045 | ✅ | n/a | ✅ | TC-0003-0051, TC-0003-0054 | ✅ |
| BR-0003-0046 | ✅ | n/a | n/a | TC-0003-0052 | ✅ |
| BR-0003-0047 | ✅ | n/a | ✅ | TC-0003-0056, TC-0003-0057 | ✅ |
| BR-0003-0048 | ❌ | ⚠️ | ❌ | TC-0003-0058 | ❌ |
| BR-0003-0049 | ✅ | n/a | n/a | TC-0003-0059 | ✅ |

Totals across the three scored columns, 147 cells: **✅ 44 / ⚠️ 17 / ❌ 26**, with `n/a` 60.

`Status` here is likewise a row verdict and is not counted. Its distribution across the 49 rows is
✅ 20 / ⚠️ 9 / ❌ 20.

`Negative case` is scored only where the rule or its example declares a failure outcome — a
rejection, an exit 1, an error, a refusal, a closed stop. A rule stated as a prohibition with no
rejection mechanism ("leaves no floating reference", "is never pruned") is scored as its positive
case, which is why 36 of the 49 rows are `n/a` in that column. `Conditional branches` is scored only
where the rule states two or more branches with different outcomes; 24 rules state one.

## Every ❌ cell, named

The matrix carries **150** `❌` scored cells and the business rule table carries **26** — **176 in
all**. They are accounted for below in six groups. Every group names every coordinate it covers and
states its count, and the six counts sum to 176:

| Group | Cells |
| --- | --- |
| 1. Five stories with no test at all | 30 |
| 2. Thirteen test cases answered only by source-text reads | 57 |
| 3. Two coverage placeholders with no test | 6 |
| 4. Remaining cells of the stories that have a case | 42 |
| 5. Remaining cells of the test cases that have a case | 15 |
| 6. Business rule scored columns | 26 |
| **Total** | **176** |

Column abbreviations in the tables below: EP equivalence partitions, NP normal path, ER error path,
ED edge cases, BV boundary values, SV special values, ST state transitions, CO combinatorial, OS
oracle strength.

### Group 1 — five stories with no test at all (30 cells)

| Row | `❌` columns | Count |
| --- | --- | --- |
| `US-0003-0016` | EP, NP, ED, BV, SV, ST, OS | 7 |
| `US-0003-0017` | EP, NP, ED, SV, ST, CO, OS | 7 |
| `US-0003-0018` | EP, NP, ED, ST, OS | 5 |
| `US-0003-0019` | EP, NP, ER, ED, OS | 5 |
| `US-0003-0020` | EP, NP, ED, BV, ST, OS | 6 |
| | | **30** |

Each story's only occurrence in the test tree is one annotation line in
`tests/e2e/qfai-traceability.md`, and `QFAI-ATDD-119` names all five as carrier-only. Their ledger
rows `TDD-0064` … `TDD-0068` are `todo` with `-` in `Test file`. The behaviour each story names is
exercised by the `TC-0003-0021` … `-0026` cases in `tests/cli/init.test.ts`, which are bound to those
test cases by their annotations and cannot answer the story; no E2E case runs the behaviour as a
user journey. Per column, stated once for all five:

- **EP, NP** — no fresh project, legacy project or already-upgraded project is initialised under a
  story annotation, so neither the partitions nor the normal outcome of any story is observed.
- **ER** (`US-0003-0019`) — `EX-0003-0022` declares a hard-coded `.qfai/assistant/...` literal to be a
  lint failure. No case plants one.
- **ED** — re-initialising a seeded steering surface, upgrading an already-upgraded project,
  re-running with the memo present, a literal hidden in a template string, and running an older
  release over a newer layout are each the story's edge, and none is supplied.
- **BV** — `US-0003-0016`'s closed four-layer set and `US-0003-0020`'s one-minor window
  (`v1.9.x` in, `v1.10.0` out) are ordered domains with edges no case touches.
- **SV** — an empty layer (the one place a `.gitkeep` is written) and an empty legacy `steering/`
  directory are special values of `US-0003-0016` and `-0017`, unsupplied.
- **ST** — seed then re-init, legacy then migrated then re-migrated, memo written then untouched, and
  in-window then past-sunset are the sequences these stories exist for; none is observed.
- **CO** (`US-0003-0017`) — user-edited files crossed with seeded templates in one legacy tree.
- **OS** — there is no assertion whose mutation could redden these rows.

### Group 2 — thirteen test cases answered only by source-text reads (57 cells)

| Row | `❌` columns | Count |
| --- | --- | --- |
| `TC-0003-0001` | EP, NP, SV, OS | 4 |
| `TC-0003-0002` | EP, NP, ST, OS | 4 |
| `TC-0003-0003` | EP, NP, ST, CO, OS | 5 |
| `TC-0003-0004` | EP, NP, OS | 3 |
| `TC-0003-0005` | EP, NP, CO, OS | 4 |
| `TC-0003-0006` | EP, NP, ED, CO, OS | 5 |
| `TC-0003-0007` | EP, NP, ST, OS | 4 |
| `TC-0003-0008` | EP, NP, ED, ST, CO, OS | 6 |
| `TC-0003-0009` | EP, NP, OS | 3 |
| `TC-0003-0010` | EP, ER, CO, OS | 4 |
| `TC-0003-0015` | EP, ED, BV, ST, OS | 5 |
| `TC-0003-0018` | EP, NP, BV, OS | 4 |
| `TC-0003-0019` | EP, ED, BV, ST, CO, OS | 6 |
| | | **57** |

Every annotated case for these rows is a `describe` in `tests/integration/initSpec0003.test.ts` that
reads `src/cli/commands/init.ts` as a string and matches a token: `toContain("runInit")`,
`toMatch(/exist|skip/i)`, `toMatch(/force/)`, `toMatch(/dryRun|dry.?run/)`, `toMatch(/symlink/i)`,
`toMatch(/legacy|prune|remove|obsolet/i)`, `toMatch(/core\.symlinks|git.*config/i)`,
`toMatch(/EPERM|Developer Mode|Windows/i)`, `toContain("ensureRootGitignoreEntries")`,
`toContain("QFAI_GITIGNORE_LEGACY_LINES")`. The file's own header calls the fifteen early ones an
"Exception-pattern backfill", and ledger rows `TDD-0001` … `TDD-0015` are `exception` under
`DR-0003-0006`. No token carries the obligation it is annotated to: `init.ts` would still contain
"force", "symlink" and "skip" if every behaviour these rows name were broken.

Runtime cases for most of these behaviours exist in `tests/cli/init.test.ts` and carry no
annotation — among them "removes legacy 10_workflow.md from skills when --force is provided"
(line 1459), "previews and reports the core.symlinks write to .git/config" (1531), "uses relative
symlink targets" (2237), "skips valid symlinks on re-run without --force (idempotent)" (2255),
"recreates broken symlinks without --force" (2275), "appends QFAI entries to root .gitignore on first
init" (2909) and "strips legacy review-*/ negation lines when migrating from old managed block"
(2957). Step 2 of "What credits a cell" reaches an unannotated case only where the obligation has no
annotated one, and each of these rows has one. They are uncreditable as the tree stands; Finding 1
names the repair. `TC-0003-0010` has no runtime case anywhere: `EPERM` appears in `init.test.ts` only
in comments.

Per column, for all thirteen rows:

- **EP** — no input of the row's partition is constructed: no empty directory, existing tree,
  `skills.local/`, git repository, Windows `EPERM`, legacy block or symlink set.
- **NP** (the ten `normal` rows) — the asserted token does not address the direction the row declares.
- **ER** (`TC-0003-0010`) — the row is the `EPERM` failure itself, and nothing raises one.
- **ED** — `TC-0003-0006` (a `README.md` left a regular file), `-0008` (a project's own file left in
  place), `-0015` (a broken link recreated), `-0019` (an unknown line stopping the strip) are each the
  row's edge.
- **BV** — `TC-0003-0015`'s three consecutive runs, `-0018`'s required entry count and `-0019`'s marker
  count of exactly one are counts no case takes.
- **SV** (`TC-0003-0001`) — the empty directory is the row's input and none is created.
- **ST** — every one of these rows is a before-and-after on disk (`-0002`, `-0003`, `-0007`, `-0008`,
  `-0015`, `-0019`); no run happens.
- **CO** — `--force` crossed with `skills.local/` (`-0003`), four integration directories (`-0005`),
  two agent directories (`-0006`), commands with prompts (`-0008`), platform with error code (`-0010`),
  legacy with current lines (`-0019`).
- **OS** — no mutation of the behaviour any row names can redden a token match over the source file.

### Group 3 — two coverage placeholders with no test (6 cells)

Coordinates: `TC-0003-0016` and `TC-0003-0017`, each × EP, NP, OS. 2 × 3 = **6**.

Both are "Coverage Placeholder" rows whose stated direction is that a migrated example is covered by
a test case: `EX-0003-0014` for `BR-0003-0005` (skill links created as `type: 'dir'`) and
`EX-0003-0015` for `BR-0003-0007` (git config only inside a repository). Their only occurrence in the
test tree is `tests/integration/qfai-traceability.md`; ledger rows `TDD-0016` and `TDD-0017` are
`exception` under `DR-0003-0100` with `—` in `Test file`, and `QFAI-ATDD-119` names both.

- **EP, NP** — neither the link type nor the repository condition is constructed as an input.
- **OS** — there is no assertion of any kind.

The other six columns are `n/a` for these rows: each placeholder declares one normal scenario with no
failure, boundary, special value, sequence or combination of its own.

### Group 4 — remaining cells of the stories that have a case (42 cells)

| Row | Column | Why `❌` |
| --- | --- | --- |
| `US-0003-0001` | ED | Running init on an existing project, which the story's note names, has no case. |
| `US-0003-0002` | ED | No tree with a file edited between runs; the preserved config is the one init just wrote. |
| `US-0003-0002` | SV | An existing zero-byte or empty file treated as present is not supplied. |
| `US-0003-0003` | ED | `skills.local/` holding a project skill is never created, so protection is unobserved. |
| `US-0003-0003` | CO | `--force` crossed with a populated `skills.local/` is the story's claim; not run. |
| `US-0003-0004` | ED | `--dry-run` over an existing project, where the preview differs from a fresh one, is absent. |
| `US-0003-0004` | CO | `--dry-run` crossed with `--force` is absent. |
| `US-0003-0005` | EP | The only case asserts four directories exist; `.github` exists for other assets anyway. |
| `US-0003-0005` | NP | No case checks a link, its type or its relative target. The link check under `US-0003-0008` is bound there. |
| `US-0003-0005` | ED | An existing correct link and a broken link (`BR-0003-0012`) are not supplied. |
| `US-0003-0005` | ST | No re-run is observed. |
| `US-0003-0005` | CO | Four integration directories × shipped skills are not checked together. |
| `US-0003-0005` | OS | A directory-exists check cannot fail on any link defect. |
| `US-0003-0006` | ER | `AC-0003-0037` (whose `US-Refs` is this story) requires an agent with no resolvable `kind` to get no profile and a message. No case at this layer; `TC-0003-0055` covers it and is bound there. Safety floor: an unclassified agent must not receive a writable profile. |
| `US-0003-0006` | ED | An existing profile kept on a plain run and regenerated under `--force` is not observed here. |
| `US-0003-0006` | ST | Plain run → `--force` is not observed here. |
| `US-0003-0006` | CO | Claude, GitHub and Codex surfaces × reviewer and worker kinds are not crossed here. |
| `US-0003-0007` | ED | The non-`--force` run that must leave `10_workflow.md` in place has no case here. |
| `US-0003-0007` | CO | `--force` × `--dry-run` (reported, kept) has no case here. |
| `US-0003-0009` | NP | No case runs inside a git repository, so `core.symlinks true` is never observed. |
| `US-0003-0009` | ER | The Windows `EPERM` message and abort the story names have no case anywhere. |
| `US-0003-0009` | ED | An already-true setting, and a directory that does not exist yet, are not supplied. |
| `US-0003-0009` | CO | Git repository × platform is not crossed. |
| `US-0003-0009` | OS | `resolves.toBeDefined()` on `captureStdout` passes whenever `runInit` does not throw. |
| `US-0003-0010` | EP | One fresh project only. |
| `US-0003-0010` | ED | An existing `copilot-instructions.md` (the non-goal says it is not rewritten) is absent. |
| `US-0003-0010` | OS | Every assertion sits inside `if (await pathExists(copilotPath))`, so a run that writes no file passes. |
| `US-0003-0011` | SV | The zero-byte existing file `BR-0003-0009` says counts as present is not supplied at this layer. |
| `US-0003-0012` | ER | `BR-0003-0009` forbids `--force` from overwriting an entry that resolves outside the project. No case at this layer; `tests/cli/init.test.ts` line 2509 covers it and is unannotated. Safety floor: a write outside the project is data loss. |
| `US-0003-0012` | ED | A symlinked instructions entry replaced rather than written through is not supplied here. |
| `US-0003-0015` | ED | Existing user entries preserved, and the strip stopping at an unknown line, are absent. |
| `US-0003-0015` | SV | An existing empty `.gitignore`, or one with CRLF endings, is not supplied. |
| `US-0003-0015` | CO | Legacy lines interleaved with user lines is not supplied. |
| `US-0003-0021` | ER | `AC-0003-0025`'s failure — the hygiene lane exits 1 on a checkout that persists credentials — has no case at this layer. Safety floor: security. |
| `US-0003-0022` | ED | Marginal reference shapes (a job-level `uses:`, a tag that looks like a SHA) are not supplied. |
| `US-0003-0022` | BV | The 40-hex pin is never probed at 39 or 41 characters. |
| `US-0003-0023` | ER | `AC-0003-0029`'s planted `actions/` throw and `AC-0003-0038`'s failing aggregate have no case at this layer since the four cases moved. |
| `US-0003-0025` | ER | A planted organization-private label (`AC-0003-0032`) is not rejected at this layer. |
| `US-0003-0025` | ED | Array and `group:` selector forms are not supplied at this layer. |
| `US-0003-0027` | ER | A malformed, keyless or absent provenance record read as empty without throwing (`AC-0003-0034`) has no case at this layer; `TC-0003-0046` covers it and is bound there. Safety floor: input crossing a trust boundary. |
| `US-0003-0027` | SV | The same three record shapes are the story's special values. |
| `US-0003-0028` | CO | `EX-0003-0046` plants profile and threshold together; this layer plants the profile alone. |
| | | **42** |

### Group 5 — remaining cells of the test cases that have a case (15 cells)

| Row | Column | Why `❌` |
| --- | --- | --- |
| `TC-0003-0013` | ER | The out-of-project refusal `BR-0003-0009` names is covered only by the unannotated case at `tests/cli/init.test.ts` line 2509. Safety floor: data loss. |
| `TC-0003-0021` | SV | An empty layer — the one case where a `.gitkeep` is written — is never produced. |
| `TC-0003-0023` | SV | An empty legacy `steering/` directory is not supplied. |
| `TC-0003-0025` | ER | `EX-0003-0022`'s lint failure on a planted literal has no case; the regex only reads the shipped `init.ts`. |
| `TC-0003-0026` | BV | Only the past-sunset side (`toolVersionOverride: "1.10.0"`) is run; the in-window side the row declares is not. |
| `TC-0003-0026` | ST | In-window → past-sunset is not observed. |
| `TC-0003-0028` | ER | The row's scenario — the hygiene lane exits 1 on a planted removal and names the file, job and rule — has no case; `TDD-0028` is `todo`, blocked on a spec-0017 surface. Safety floor: security. |
| `TC-0003-0030` | BV | No 39- or 41-character reference is planted against the anchored pattern. |
| `TC-0003-0037` | BV | The row's boundary is "exactly two installing declarations, four and three instances". The case asserts three declarations and nine and eight instances. |
| `TC-0003-0043` | SV | An empty `.nvmrc` or `.node-version` is not supplied. |
| `TC-0003-0056` | ER | `AC-0003-0038` requires the aggregate to fail on every non-success result. The executing cases are the unannotated `it.each` at lines 101 and 123 of `shippedWorkflowCheckIndependence.test.ts`. |
| `TC-0003-0056` | SV | The empty and unknown results are in the same unannotated `it.each`. |
| `TC-0003-0056` | CO | Result × scope output — the one exception `BR-0003-0048` states — is in the unannotated `it.each` at line 123. |
| `TC-0003-0057` | ER | The executing verdict cases are the unannotated `it.each` at line 202. |
| `TC-0003-0057` | SV | The empty and unknown results are in the same unannotated `it.each`. |
| | | **15** |

### Group 6 — the 26 ❌ cells of the business rule scored columns

**`Positive case`, 12 cells** — `BR-0003-0001`, `-0002`, `-0003`, `-0004`, `-0005`, `-0006`, `-0007`,
`-0008`, `-0011`, `-0012`, `-0014`, `-0048`.

- `BR-0003-0001` … `-0004`, `-0006`, `-0008`, `-0011`, `-0012`, `-0014` — every covering test case is a
  Group 2 row answered by a source-text read, so the rule's stated behaviour is produced by no
  credited case.
- `BR-0003-0005`, `-0007` — the covering test cases are the Group 3 placeholders.
- `BR-0003-0048` — the positive case is "succeeds only when the result is `success`". The annotated
  `TC-0003-0058` cases run only non-success results through the aggregate, and the success run is in
  the unannotated `it.each` of `shippedWorkflowCheckIndependence.test.ts`.

**`Negative case`, 4 cells** — `BR-0003-0008`, `-0009`, `-0019`, `-0022`.

- `BR-0003-0008` — the `EPERM` message and abort; nothing raises the error.
- `BR-0003-0009` — the refusal to overwrite an entry resolving outside the project under `--force`.
  The case exists unannotated at `tests/cli/init.test.ts` line 2509. Safety floor.
- `BR-0003-0019` — a hard-coded literal failing the lint (`EX-0003-0022`); no literal is planted.
- `BR-0003-0022` — the hygiene lane's exit 1 on a planted `persist-credentials` removal
  (`EX-0003-0025`); `TDD-0028` is `todo`. Safety floor.

**`Conditional branches`, 10 cells** — `BR-0003-0001`, `-0002`, `-0006`, `-0007`, `-0012`, `-0014`,
`-0020`, `-0027`, `-0031`, `-0048`.

- `BR-0003-0001` (exists → skip, absent → create), `-0002` (skills overwritten, `skills.local`
  protected), `-0006` (agents linked, `README.md` not), `-0007` (inside a repository → set, outside →
  skip), `-0012` (correct link skipped, broken link recreated), `-0014` (known line stripped, unknown
  line stops) — no credited case takes either branch.
- `BR-0003-0020` — in-window versus past-sunset; only the past side runs.
- `BR-0003-0027` — "a change to the pattern set moves three code sites and the rule document in one
  pull request, with no template edit in the same diff". The branch is a property of a change, not of
  a tree, and no test at this layer can take it. It is held by review and by the shipped-surface rule
  `.agents/rules/distributed-surface.local.md`, which states the same lockstep.
- `BR-0003-0031` — pull request versus push counts. The case asserts nine and eight where the rule
  states four and three.
- `BR-0003-0048` — the change-scoped exception: a skipped document lane is green only when the scope
  output is exactly `false`. The cases that cross result with scope are the unannotated `it.each` at
  line 123 of `shippedWorkflowCheckIndependence.test.ts`; the annotated `TC-0003-0058` runs leave the
  scope output unset.

## Every ⚠️ cell, named

113 scored depth cells in the matrix and 17 scored cells in the business rule table are `⚠️` —
**130 in all**. The PASS criterion requires a documented rationale for each, so each is named here.

### Matrix depth cells (113)

| Coordinate | Rationale |
| --- | --- |
| `US-0003-0001` × EP | The empty-directory partition only; the existing-project partition has no case. |
| `US-0003-0001` × NP | `qfai.config.yaml` and `.qfai/assistant/` are asserted; the six other directories `AC-0003-0001` requires are asserted absent (Findings 2). |
| `US-0003-0001` × OS | `pathExists` on `.qfai/assistant` passes with any content; the absence assertions are strong. |
| `US-0003-0002` × EP | The existing-file partition only; "only missing files are added" is never set up. |
| `US-0003-0002` × NP | The skip and a "skipped" token are asserted; adding a missing file is not. |
| `US-0003-0002` × ST | Fresh → initialised → re-run is observed; no edit in between. |
| `US-0003-0002` × OS | The preserved config is compared with bytes init itself wrote, so an unconditional rewrite passes; only the "skipped" token discriminates. |
| `US-0003-0003` × EP | `skills/` is exercised; `skills.local/` appears only as absent. |
| `US-0003-0003` × NP | The overwrite is asserted; the protection is not. |
| `US-0003-0003` × ST | Init → edit → `--force` is observed for `skills/` only. |
| `US-0003-0003` × OS | `not.toBe("custom content")` accepts any other bytes. |
| `US-0003-0004` × EP | The empty-directory partition only. |
| `US-0003-0004` × NP | "Nothing written" is asserted for `.qfai` only; the preview list is reduced to the token "dry-run". |
| `US-0003-0004` × OS | A dry run that wrote `.github/` or `.claude/` passes. |
| `US-0003-0006` × EP | Claude and GitHub partitions; the Codex partition `AC-0003-0037` adds is absent at this layer. |
| `US-0003-0006` × NP | File links are asserted; their targets are not, and no Codex profile is checked. |
| `US-0003-0006` × OS | `isSymbolicLink()` is true for a link to anything. |
| `US-0003-0007` × EP | The `--force` partition only. |
| `US-0003-0008` × ED | A project's own `qfai-*` files kept is asserted; a run without `--force` keeping the wrappers is not. |
| `US-0003-0008` × CO | Commands and prompts are pruned in one run; the combination without `--force` is absent. |
| `US-0003-0009` × EP | The non-git partition only, and only as "does not throw". |
| `US-0003-0010` × NP | Content is checked when the file exists; that it is generated is never asserted. |
| `US-0003-0011` × ED | Both files edited is covered; a partially existing set is not at this layer. |
| `US-0003-0011` × CO | Both files together; one of two existing is not at this layer. |
| `US-0003-0011` × OS | The template's first line via `toContain` is weak; the preserved-edit `toBe` is strong. |
| `US-0003-0012` × EP | Edited regular files only; symlinked and out-of-project entries are absent at this layer. |
| `US-0003-0013` × ED | One of the two files newly created is not supplied. |
| `US-0003-0013` × BV | Zero and two created are run; one — the rule's threshold — is not. |
| `US-0003-0013` × ST | The silent case seeds files instead of running init twice. |
| `US-0003-0015` × NP | Marker and three entries are asserted; the discussion entry is asserted opposite to `AC-0003-0015` (Findings 2). |
| `US-0003-0015` × BV | Marker count of exactly one after migration is asserted; the block's length is not. |
| `US-0003-0021` × EP | The delivered compliant tree only. |
| `US-0003-0021` × ED | The upload rules are vacuous (no upload step ships); the verdict's empty map is not asserted at this layer. |
| `US-0003-0022` × EP | A planted trailer is judged by a copy of the guard's regex, not by the guard. |
| `US-0003-0022` × ER | No unsanctioned third party is planted; the trailer is matched by the test's own regex. |
| `US-0003-0022` × OS | The guard is never spawned, so a change to it moves no assertion. |
| `US-0003-0023` × NP | Lanes, inertness and self-containment are asserted; the independent-check legs and aggregate of `AC-0003-0038` are not at this layer. |
| `US-0003-0023` × BV | Zero and two declared scripts; all five is not. |
| `US-0003-0023` × CO | Scripts × lanes is asserted as text here; the executed intersection is at the TC layer. |
| `US-0003-0023` × OS | Executed cases return early and pass when `bash` is absent. |
| `US-0003-0024` × ER | An unreachable and a missing base fail open; the shallow clone is not at this layer. |
| `US-0003-0024` × ED | The missing base is covered; the shallow clone and an unrecognised path are not. |
| `US-0003-0024` × CO | Five result × selection pairs; `timed_out` and an empty result are not. |
| `US-0003-0024` × OS | Executed cases return early when `bash` is absent. |
| `US-0003-0025` × EP | The clean tree only. |
| `US-0003-0025` × OS | The fallback pattern accepts any `macos-`, `ubuntu-` or `windows-` label, `macos-acme` included. |
| `US-0003-0026` × BV | Version present or absent; the integrity-algorithm forms are not at this layer. |
| `US-0003-0026` × SV | An empty version file is not supplied. |
| `US-0003-0026` × CO | Node and package manager are degraded separately; both at once is not at this layer. |
| `US-0003-0026` × OS | Executed cases return early when `bash` is absent. |
| `US-0003-0027` × EP | Adopter-owned and modified partitions; declined is not at this layer. |
| `US-0003-0027` × CO | Two fixtures; declined × `--force` is not. |
| `US-0003-0028` × NP | Invocation values and drift routing are asserted; the `pnpm ci:lint` placement `AC-0003-0035` names is not at this layer. |
| `US-0003-0028` × ED | Profile drift only; threshold drift is not. |
| `TC-0003-0011` × OS | `applyTo:` and `excludeAgent:` are matched as substrings, not read from parsed frontmatter. |
| `TC-0003-0013` × EP | Stale regular files and a dotted in-project link; the out-of-project partition is only unannotated. |
| `TC-0003-0013` × ED | The dotted-directory link is covered; replacing a symlinked entry is only in unannotated line 2475. |
| `TC-0003-0013` × OS | `toContain("[BLOCKER]")` rather than equality with the template. |
| `TC-0003-0014` × BV | Zero and two created; exactly one is not. |
| `TC-0003-0020` × EP | Reads the block constant; the `.gitignore` a run writes is not read. |
| `TC-0003-0020` × BV | Both negations absent is asserted; the ignore pattern for the review directory, which the first bullet requires, is not. |
| `TC-0003-0020` × OS | A writer that ignored the constant passes. |
| `TC-0003-0021` × EP | Populated layers only. |
| `TC-0003-0021` × NP | The fourth bullet, `.qfai/assistant/steering/` absent, is not asserted. |
| `TC-0003-0021` × ED | The dry run is covered; a project with existing layers is not. |
| `TC-0003-0021` × BV | Four fixed names are iterated; a fifth layer written would not redden. |
| `TC-0003-0022` × NP | `.gitkeep` and the entry template are asserted; `README.md` is asserted absent where the row requires it seeded (Findings 2). |
| `TC-0003-0022` × CO | Edit × drift report is covered; CRLF × edit is not. |
| `TC-0003-0023` × NP | Content reaches the new layers; exit 0 is implicit, and the `W-USER-EDIT-PRESERVED` note on a first migration with user edits (`AC-0003-0020`) is asserted only on a re-run. |
| `TC-0003-0024` × EP | A fresh upgrade only. |
| `TC-0003-0024` × NP | The memo exists and carries two phrases; the four sections `AC-0003-0021` lists are not asserted. |
| `TC-0003-0024` × OS | Two substrings. |
| `TC-0003-0025` × EP | The shipped `init.ts` only. |
| `TC-0003-0025` × NP | The regex looks for `path.join(... ".qfai", "assistant", "<layer>"`, not the row's `"\.qfai/assistant/<layer>` literal, and asserts helper names other than the exports the row lists. |
| `TC-0003-0025` × OS | A literal written as one string passes. |
| `TC-0003-0026` × EP | The past-sunset partition only. |
| `TC-0003-0027` × EP | The compliant tree only; no violation is planted. |
| `TC-0003-0027` × ED | String-form permissions are rejected; the upload rule has no subject today. |
| `TC-0003-0028` × EP | The clean tree only. |
| `TC-0003-0028` × OS | The static half is strong; the lane half has no case. |
| `TC-0003-0029` × BV | Five branches are present as text; `EX-0003-0026` asks each to resolve for its lockfile. |
| `TC-0003-0029` × CO | Lockfile × Yarn availability is checked for the cache step only. |
| `TC-0003-0029` × OS | A branch with a wrong condition and the right command text passes. |
| `TC-0003-0030` × EP | The compliant set only. |
| `TC-0003-0031` × EP | The compliant set only. |
| `TC-0003-0033` × ER | Two of three bullets; the pre-build rule ordering (`TDD-0056`, `todo`) has no case. |
| `TC-0003-0033` × ED | A trailer on a `uses:` line only; the own-line trailer the third bullet names is not. |
| `TC-0003-0034` × ER | The rejection comes from a predicate the test defines; the pack's own throw is pinned as three source strings. |
| `TC-0003-0034` × ED | Non-file entries are handled by the same test-owned predicate. |
| `TC-0003-0034` × CO | The two plants run one at a time. |
| `TC-0003-0034` × OS | Only a change to those three strings in `scripts/verify-pack.mjs` reddens the planted legs. |
| `TC-0003-0035` × EP | The compliant set only. |
| `TC-0003-0037` × EP | The scriptless tree only. |
| `TC-0003-0037` × CO | Both events are expanded; the values contradict the row (Findings 2). |
| `TC-0003-0038` × NP | The full-history bullet is asserted in a widened form that also sanctions the document `scope` job and the validate lane's conditional depth. |
| `TC-0003-0040` × SV | An unset selection is covered only in the E2E suite. |
| `TC-0003-0040` × CO | `cancelled` and an unknown result are covered only in the E2E suite. |
| `TC-0003-0041` × OS | Plants exercise the test's own predicate; the product half is the clean-set assertion. |
| `TC-0003-0042` × EP | Compliant headers only; the controls exercise the detector, not a header. |
| `TC-0003-0045` × NP | The write set equals the list; the prune set is checked as a subset; the predicate bullet is deferred to `TC-0003-0052`. |
| `TC-0003-0045` × SV | `RETIRED_WORKFLOW_NAMES` is empty, so the prune half runs on the empty set only. |
| `TC-0003-0045` × OS | Subset rather than equality for the prune set. |
| `TC-0003-0046` × ED | The tracked-record bullet is asserted as a re-include line in the block, against the row's "not in the block" (Findings 2). |
| `TC-0003-0047` × ST | States are seeded directly; no run moves a file from one state to another. |
| `TC-0003-0048` × OS | A source-text regex; an aliased call evades it. |
| `TC-0003-0049` × BV | Ten dimensions are asserted; the row and `BR-0003-0043` say nine. |
| `TC-0003-0052` × EP | Source slices only. |
| `TC-0003-0052` × OS | Source-text slicing; a renamed variable breaks it without a defect. |
| `TC-0003-0054` × NP | The fourth bullet, absent and declined separated in copy-set construction, is asserted under `TC-0003-0051`. |
| `TC-0003-0058` × EP | The document aggregate only; the validation `summary` and orchestrator `verdict` are not run. |
| `TC-0003-0058` × ER | Every non-success result fails the document aggregate; the other two aggregates are not exercised. |
| `TC-0003-0058` × CO | The scope output is unset in every run, so the scope exception is not crossed. |
| `TC-0003-0058` × OS | The checker is test-owned; the product half is the unmodified document body. |

### Business rule table (17)

| Coordinate | Rationale |
| --- | --- |
| `BR-0003-0013` × Positive | `TC-0003-0020` reads the constant and asserts the review negations absent; the nine lines the rule lists are no longer the block (Findings 2). |
| `BR-0003-0015` × Positive | Four layers are asserted populated; closure (nothing else written) is not. |
| `BR-0003-0016` × Positive | `.gitkeep` and the entry template are seeded; `README.md` is asserted absent. |
| `BR-0003-0016` × Conditional | Create-only for the template is covered; the `.gitkeep` overwrite branch is not. |
| `BR-0003-0019` × Positive | Helper imports are asserted; a literal written as one string is not caught. |
| `BR-0003-0020` × Positive | The label comes from the shared source; the window the rule states has closed. |
| `BR-0003-0031` × Positive | Zero secrets and uninstalling detection and verdict are asserted; the install count is asserted opposite. |
| `BR-0003-0032` × Positive | Name-only diff and JSON output are asserted; full history is sanctioned in two jobs besides detection. |
| `BR-0003-0039` × Positive | The write set equals the list; the prune set runs on an empty list. |
| `BR-0003-0040` × Positive | The reader's empty reading is asserted; the record's tracked status is asserted as a re-include negation. |
| `BR-0003-0043` × Positive | The shape pins ten dimensions; the rule says nine. |
| `BR-0003-0028` × Negative | The rejection is by a test-owned predicate; the pack throw is pinned as source strings. |
| `BR-0003-0035` × Negative | The rejection is by a test-owned predicate over replicas. |
| `BR-0003-0048` × Negative | Non-success fails the document aggregate; the validation and test aggregates are not run. |
| `BR-0003-0009` × Conditional | `--force` versus create-only is covered; the out-of-project branch is not credited. |
| `BR-0003-0010` × Conditional | None created and two created; one is not. |
| `BR-0003-0023` × Conditional | The branches exist as text in existing and new files; they are not resolved per lockfile. |

## Findings

Ten things were found while producing this matrix that the reviewing stage should act on. None of
them is repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **`initSpec0003.test.ts` holds the annotations for thirteen rows whose real tests carry none.**
   Its header annotates 24 test cases, and each matching `describe` reads `init.ts` as text. The
   runtime cases for `TC-0003-0001` … `-0009`, `-0015`, `-0018` and `-0019` sit unannotated in
   `tests/cli/init.test.ts` (Group 2 names seven of them). The ATDD scan reads the header and reports
   those rows covered; the crediting rule reads the cases and credits nothing. Annotating the runtime
   cases, and removing the header block and the token-match `describe`s, would move most of the 57
   Group 2 cells. `TC-0003-0010` has no runtime case to annotate.
2. **Five obligations are fixed to the opposite of what they declare, and several more disagree in
   part.** In each the product changed deliberately and the tests follow the product.
   - `AC-0003-0001` / `US-0003-0001` require `specs/`, `contracts/`, `discussion/`, `evidence/`,
     `review/` and `report/` under `.qfai/`. `initE2E.test.ts` asserts none of the six exists.
   - `BR-0003-0013`, `AC-0003-0015`, `EX-0003-0016`, `TC-0003-0018` and `US-0003-0015` list a nine-line
     block with `.qfai/discussion/discussion-*/` and four README negations. `src/core/gitignore.ts`
     now lists all five in `QFAI_GITIGNORE_LEGACY_LINES` — stripped on migration — and writes
     `.qfai/discussion/*` plus governance negations. Both `initE2E.test.ts` cases assert the new form.
   - `TC-0003-0022`, `AC-0003-0018`, `BR-0003-0016` and `REQ-0019` seed `.qfai/steering/README.md`.
     The case asserts it is absent.
   - `TC-0003-0026`, `AC-0003-0023`, `AC-0003-0024`, `BR-0003-0020` and `US-0003-0020` describe an open
     window: a warning on stdout and exit 0. The window has closed; the case asserts the finding on
     stderr as an error. Ledger row `TDD-0026` already names the new behaviour.
   - `TC-0003-0037`, `AC-0003-0030`, `BR-0003-0031` and `NFR-C0016` state two installing job
     declarations and four and three instances. The case asserts three declarations (`checks`,
     `tests`, `validate`) and nine and eight, because the test lane now installs.
   - Partial: `TC-0003-0046` and `BR-0003-0040` keep the provenance record out of the block; the case
     requires the block to re-include it, and explains why. `TC-0003-0038` and `BR-0003-0032` keep full
     history to the detection job; the case sanctions two more. `TC-0003-0049`, `AC-0003-0035` and
     `BR-0003-0043` count nine dimensions; the shape and the contract hold ten. `REQ-0028` fixes one
     runner variable; the set reads two. `US-0003-0006` keeps `README.md` a regular file; no README is
     written.
   `CR-20260923-0006` restated every statement named above to what the product does and the tests
   assert, and changed no test. `CR-20260923-0011` restated the other statements that carried the
   same contradictions, and reset `TDD-0001`. The matrix has not been rescored against the
   restated statements.
3. **Eight safety-floor cells are not `✅`, and a written reason cannot open them.**
   `US-0003-0006` × ER, `US-0003-0012` × ER, `US-0003-0021` × ER, `US-0003-0027` × ER,
   `TC-0003-0013` × ER, `TC-0003-0028` × ER, `BR-0003-0009` × Negative, `BR-0003-0022` × Negative.
   They fall into three causes:
   - `US-0003-0006` and `US-0003-0027` — tested at the `TC-*` layer (`TC-0003-0055`, `-0046`) and
     not at the story's own.
   - `US-0003-0012`, `TC-0003-0013` and `BR-0003-0009` — the refusal is tested by the unannotated
     case at `tests/cli/init.test.ts` line 2509.
   - `US-0003-0021`, `TC-0003-0028` and `BR-0003-0022` — wait on the workflow-hygiene lane rows that
     depend on spec-0017 (`TDD-0028`).
4. **The strongest cases in the new integration module carry no annotation.** In
   `shippedWorkflowCheckIndependence.test.ts` the four annotated `it`s assert structure. The three
   `it.each` blocks at lines 101, 123 and 202 execute the delivered aggregates over seven results and
   four scope pairs, and credit nothing. Annotating them would raise `TC-0003-0056` × ER, SV, CO,
   `TC-0003-0057` × ER, SV, and `BR-0003-0048` × Positive and Conditional.
5. **Three rows are credited only through unannotated `describe`s.** `TC-0003-0028` (the static half in
   `shippedWorkflows.test.ts`), `TC-0003-0032` and `TC-0003-0033` (in `shippedWorkflowPins.test.ts`)
   each have a real `describe` named for the row and no annotation, which is why `QFAI-ATDD-119`
   reports them carrier-only.
6. **Three planted-negative controls test the suite's own predicate.** `TC-0003-0034`
   (`scanShippedGithubTopology`), `TC-0003-0041` (`scanRunnerSelectors`) and `TC-0003-0058`
   (`aggregateFailureViolations`) plant into replicas and assert that a function defined in the test
   file rejects them. The product is reached only by the clean-tree assertion beside each.
7. **Six executed E2E cases pass silently when `bash` is absent.** See "Skipped tests and early
   returns". The integration module's `expect(executed.skipped).toBe(false)` is the form to copy.
8. **`RETIRED_WORKFLOW_NAMES` is empty.** Every prune assertion in `TC-0003-0045`, `-0047` and `-0052`
   runs against the empty set, which each case discloses. The prune path becomes testable only when a
   name retires.
9. **`TC-0003-0058` covers one of three aggregates, from the packaged tree.** `EX-0003-0051` asks for
   each delivered aggregate. The cases run the document aggregate's body out of `assets/init/**`; the
   validation `summary` and the orchestrator `verdict` are not run under this row.
10. **Row titles in `06_Test-Cases.md` disagree with their headings.** `TC-0003-0047` is titled
    "declined ファイルの再作成 / prune / stale 抑止" in the table and "closed 5-state enum の判定" in
    its heading; `TC-0003-0048` names a "refresh 経路" in the table and a "write / removal 経路" in its
    heading. The heading is what the cases implement.

Two smaller observations. `TC-0003-0009` and `TC-0003-0055` cite no example, so no rule's
`Covering TC` reaches them by the example route. Ledger row `TDD-0023`'s selector names the case at
`tests/cli/init.test.ts` line 4180, which is unannotated; the annotated `TC-0003-0023` cases are the
six above it.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
to this file and restates the counted totals beside it. Those totals are:

**✅ 243 / ⚠️ 130 / ❌ 176**, with `n/a 372`, across all 921 scored cells — 774 matrix depth cells and
147 business rule scored cells. `Status` is a row verdict, not a mark, and is excluded from all four
counts.

Three kinds of work would move the `❌` cells, and they are different in kind:

- **Annotation only.** Findings 1, 4 and 5. The behaviour is tested; the cases do not carry the
  annotation the crediting rule reads. This is the cheapest and largest movement available.
- **Tests at the story layer.** `US-0003-0016` … `-0020` have no E2E case, and four stories carry a
  safety-floor `Error path` their own layer does not exercise (Finding 3). A story row cannot borrow a
  `TC-*` case.
- **A Change Request before any test.** The five obligations in Finding 2 declare behaviour the
  product changed on purpose. No test can satisfy them and the product at once, so their `❌` cells
  and `Status` stay as recorded until the pack is reconciled.

`BR-0003-0027` × Conditional is the one `❌` no test can raise: it governs how a change to the guard's
pattern set is made, and is held by review.

## Rows added by the work-log surface removal

`CR-20260925-0010` withdrew every row this section scored, with its ledger rows and its tests:
the test cases this branch numbered `TC-0003-0059` … `TC-0003-0061`, carried by `TDD-0094` …
`TDD-0099`, and the business rules they covered, numbered `BR-0003-0049` and `BR-0003-0050`.

The first test case, the first business rule and the first ledger row never merged under those
numbers. Main assigned `TC-0003-0059`, `BR-0003-0049` and `TDD-0094` to the closed-legacy-window
statement in the generated Copilot text, and the matrix above scores them. This section scores no
row.

**Relation to the matrix above.** Every other obligation of the pack is scored above, by a run that
credits only a case that runs. Its totals are the ones that run's stage evidence restates, so they
are left as computed. Two of its rows score obligations the work-log removal deleted, `TC-0003-0022`
and `BR-0003-0016` (ledger row `TDD-0022` is tombstoned); the next full recompute drops them.

### Totals for these rows

**✅ 0 / ⚠️ 0 / ❌ 0**, `n/a` 0, across 0 scored cells.

## Shared-artifact re-verify

The work-log removal edited `packages/qfai/tests/integration/initSpec0003.test.ts`, which the
`done` row `spec-0003/TDD-0001` names. No live row of this change carries the edit: the
spec-0003 row it belonged to, `TDD-0022`, is deleted, and this change's `TDD-0095` … `TDD-0099`
are withdrawn by `CR-20260925-0010`, so the record is stage-level. The completion gate reads
it only once this file's `## Final status` names the stage review pack and a seal that still
recomputes. That section and its stage review do not exist yet.

### spec-0003/TDD-0001

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 03762f3cfe0d4233beafb427462d58116ad8b5de
- Selector: TC-0003-0001: Empty directory initialization
- Re-verify command: cd tmp/cross-spec-mutations-qa/repo/packages/qfai && node node_modules/vitest/vitest.mjs run --reporter=verbose -t "TC-0003-0001: Empty directory initialization|TC-0003-0025: assistantPaths\.ts SSOT module|TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window|TC-0012-0434: Tailwind contract convergence within 3 cycles|TC-0012-0471: --emit-skeletons cross-spec frozenSurfaceUnion coverage|TC-0012-0472: opt-in default \+ --skeleton-mode full escalation|TC-0012-0479: mutation-log appends a JSONL entry per destructive iter-NN mutation" tests/integration/initCopilotLegacyWindow.test.ts tests/integration/initSpec0003.test.ts tests/integration/prototyping/emitSkeletonsCoverage.test.ts tests/integration/prototyping/mutationLog.test.ts tests/integration/prototyping/tailwindContractConvergence.test.ts, on the clean clone at that revision (batch 13 of the cross-spec re-run, recorded in tmp/xspec/selector-results2.json).
- Re-verify result: PASS — exit 0; Test Files 5 passed (5); Tests 29 passed | 21 skipped (50). The row's one case, "writes .qfai/assistant/ and qfai.config.yaml, none of the six artifact directories, and a link to every skill in each of the four skills/ directories", is named as passed; captured in tmp/xspec/logs2/selector-13.log.
- Proof command: cd tmp/cross-spec-mutations-qa/repo/packages/qfai && node node_modules/vitest/vitest.mjs run --reporter=verbose "tests/integration/initSpec0003.test.ts" "-t" "TC-0003-0001: Empty directory initialization", with the empty file packages/qfai/assets/init/.qfai/specs/.gitkeep created, the mutation the row's Round 1 Falsifiability command records. Run on the clean clone at 25d42885388fd1ab6a428adc7a3b8132c7acdb89; the test file (sha256 58827ca29a39ccbf0a858b6988031359f39a14a1c22c19fea59bc82de8f4ec09) and the mutated path (absent) are the same at 03762f3cfe0d4233beafb427462d58116ad8b5de.
- Proof result: FAIL — exit 1; Tests 1 failed | 22 skipped (23). AssertionError at tests/integration/initSpec0003.test.ts:74:72, inside the row's own case: "init wrote an artifact directory under .qfai/: expected [ 'specs' ] to deeply equal []", the recorded failure. `qa-gatekeeper` passed the observation; captured in tmp/xspec/logs/0003-TDD-0001-artifact-dir-shipped-mutant.log.
- Restored GREEN command: cd tmp/cross-spec-mutations-qa/repo/packages/qfai && node node_modules/vitest/vitest.mjs run --reporter=verbose "tests/integration/initSpec0003.test.ts" "-t" "TC-0003-0001: Empty directory initialization", after the created file and directory were removed and the tree was clean again.
- Restored GREEN result: PASS — exit 0; Tests 1 passed | 22 skipped (23); captured in tmp/xspec/logs/0003-TDD-0001-artifact-dir-shipped-green.log.
- RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initSpec0003.test.ts
```

- RED test hash: 67095c7c430df9bbc07c22d874566e9c8f2dfe399172747e07c60569474f784c
