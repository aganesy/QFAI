# Coverage Depth Matrix — spec-0005

## Scope

This matrix scores the eight user stories `02_User-stories.md` declares — `US-0005-0001` through `US-0005-0008` — and the ten
test cases `06_Test-Cases.md` declares — `TC-0005-0001` through `TC-0005-0010`. The obligation set is read from those two files
in full, not from `.qfai/specs/spec-0005/tdd/test-list.md`.

- No story carries a `- x-qfai-status: planned` meta line, so all eight are active and each owns a row.
- Every test case declares `Level` `integration`. None is unit or component, so all ten own a row.
- No test case declares a `Type`, so every `TC-*` row owes the normal path.
- The business rule table carries all four `BR-0005-*` of `04_Business-Rules.md`. None carries a `Status:` retiring it.
- No file of this pack references a `CON-API-*` or `CON-DB-*` contract, so no contract-derived failure is scored.

**No test in the tree carries a `QFAI:SPEC-0005:` annotation.** The only files that name spec-0005 are two annotation
carriers, `tests/e2e/qfai-traceability.md` and `tests/integration/qfai-traceability.md`, and each says in its opening line that it
is a carrier and not a test. The file the ledger names for `TDD-0001` … `TDD-0009`,
`packages/qfai/tests/integration/reportSpec0005.test.ts`, no longer exists. `TDD-0010` names no file.

The behaviour itself is tested, without annotations, by `packages/qfai/tests/cli/report.test.ts`. That is the file the ledger's
own evidence strings (`+ existing cli/report.test.ts`) and `DR-0005-0002` name as the coverage basis for these rows. It drives
`runReport` against a real `qfai init` tree in a temporary directory, with real `runValidate` runs, which is the integration layer
the test cases declare.

How the cells are scored:

- **`US-*` rows** are scored against the files that declare the story, as the spec-0008 matrix does. The only such file is the
  E2E carrier, which supplies no input and asserts nothing. The integration coverage underneath a story is scored on its `TC-*`
  row, not read a second time into the story.
- **`TC-*` rows** are scored against the unannotated cases of `tests/cli/report.test.ts` that exercise each row's obligation,
  plus one case of `tests/cli/usageExitCodes.test.ts` for `TC-0005-0005`. Each row's section below names its cases.
- **`Status`** on a `TC-*` row is at best `⚠️`. The depth may be real, but no annotation links it to the row, so the ATDD scan
  sees only the carrier and the traceability chain from `TC-*` to test is broken.
- **`n/a`** is used only where the category's obligation is absent for the row. An `Error path` `n/a` names the failure the row
  does not own.
- **Oracle strength** is `✅` only where a named production mutation was applied and the row's own case failed. Otherwise the
  mutation is named and the cell is `⚠️`, or `❌` where the row has no case at all.
- **`tests/cli/args.test.ts`** tests `parseArgs` at the unit layer. Its cases are named where they bear on a row, but they do not
  score an integration row.

## What was measured, and how

Annotated tests. Searched `packages/qfai/tests/**` and `tests/**` for `QFAI:SPEC-0005:`. Result: 18 hits, all in the two carrier
files. No `.test.ts` file carries one, so no annotated file exists to run.

Unannotated tests, run one file at a time with `pnpm -C packages/qfai exec vitest run <file>`:

| File                               | Result     | Used for                                                           |
| ---------------------------------- | ---------- | ------------------------------------------------------------------ |
| `tests/cli/report.test.ts`         | 31 passed  | `TC-0005-0001` … `TC-0005-0007`, `TC-0005-0009`                    |
| `tests/cli/usageExitCodes.test.ts` | 28 passed  | One case, `rejects a corrupt validate.json`, for `TC-0005-0005`    |
| `tests/cli/args.test.ts`           | 181 passed | Unit layer. Read for `--base-url`, `--out`, `--in`, `--phase` only |

Oracle mutations. Each was applied to one production file, one named case was run with `-t`, and the file was restored byte for
byte from a copy taken before the edit. `git status --short packages/qfai/src` was empty afterwards.

| ID  | File                         | Mutation                                          | Case run                                                  | Result                                                         |
| --- | ---------------------------- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| M1  | `src/cli/commands/report.ts` | Missing input returns `1` instead of `2`          | `guides when validate.json is missing`                    | Failed: `expected 1 to be 2`                                   |
| M2  | `src/cli/commands/report.ts` | `--base-url` not passed to `formatReportMarkdown` | `links file paths with --base-url`                        | Failed: the root link line is absent                           |
| M3  | `src/cli/commands/report.ts` | `writeSpecPackReports` call removed               | `scopes input, output and spec-pack artifacts to --spec`  | Failed                                                         |
| M4  | `src/core/report.ts`         | `## Canonical Issues` heading removed             | `runs init -> validate(json) -> report(md)`               | **Passed** — the issue-list heading is not pinned by that case |
| M5  | `src/cli/commands/report.ts` | `--out` ignored (`const out = scopedOut`)         | `still writes the report artifact when the gate fails`    | Failed: `ENOENT` on the `--out` path                           |
| M6  | `src/core/report.ts`         | `### prototyping.lifecycle` heading removed       | `includes v2.0 prototyping summary from prototyping.json` | Failed: heading absent                                         |

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0005-0001 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| US-0005-0002 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| US-0005-0003 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0005-0004 | ❌                     | ❌          | n/a        | ❌         | n/a             | n/a            | ❌                | ❌            | ❌              | ❌     |
| US-0005-0005 | ❌                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0005-0006 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0005-0007 | ❌                     | ❌          | n/a        | ❌         | ❌              | n/a            | n/a               | n/a           | ❌              | ❌     |
| US-0005-0008 | ❌                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0005-0001 | ✅                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0005-0002 | ✅                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | ✅            | ⚠️              | ⚠️     |
| TC-0005-0003 | ⚠️                     | ✅          | n/a        | ❌         | n/a             | ⚠️             | n/a               | ❌            | ✅              | ⚠️     |
| TC-0005-0004 | ✅                     | ✅          | n/a        | ✅         | n/a             | n/a            | ⚠️                | ⚠️            | ⚠️              | ⚠️     |
| TC-0005-0005 | ✅                     | ✅          | ✅         | ✅         | n/a             | ✅             | n/a               | ✅            | ✅              | ⚠️     |
| TC-0005-0006 | ⚠️                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | ⚠️            | ✅              | ⚠️     |
| TC-0005-0007 | ⚠️                     | ✅          | n/a        | ❌         | ⚠️              | n/a            | ⚠️                | ✅            | ✅              | ⚠️     |
| TC-0005-0008 | ❌                     | ❌          | ❌         | ❌         | n/a             | n/a            | n/a               | ❌            | ❌              | ❌     |
| TC-0005-0009 | ⚠️                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ✅              | ❌     |
| TC-0005-0010 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |

### Business rule coverage

One row per active `BR-0005-*`. `Covering TC` is `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                 | Status |
| ------------ | ------------- | ------------- | -------------------- | --------------------------- | ------ |
| BR-0005-0001 | ✅            | ⚠️            | ✅                   | TC-0005-0001 … TC-0005-0008 | ⚠️     |
| BR-0005-0002 | ⚠️            | ❌            | ⚠️                   | TC-0005-0009, TC-0005-0010  | ❌     |
| BR-0005-0003 | ❌            | ❌            | ❌                   | TC-0005-0009, TC-0005-0010  | ❌     |
| BR-0005-0004 | ❌            | ❌            | ❌                   | TC-0005-0009                | ❌     |

- `BR-0005-0001` reaches `TC-0005-0001` … `TC-0005-0008` through `EX-0005-0004`.
- `BR-0005-0002` and `BR-0005-0003` reach `TC-0005-0009` through `EX-0005-0001` and `EX-0005-0002`, and `TC-0005-0010` through
  `EX-0005-0005`.
- `BR-0005-0004` reaches `TC-0005-0009` through `EX-0005-0003`.

## Every ❌ cell, named

No `❌` below is carried by a Decision Record or a Change Request. The one decision record a ledger row cites for an uncovered row,
`DR-0005-0100`, is declared nowhere (see Findings). Each `❌` is an open gap, and the ones marked DRIFT need an upstream decision
before a test can be written.

### US-0005-0001 … US-0005-0008 — no test at the story's layer

The only file declaring any of the eight stories is `tests/e2e/qfai-traceability.md`, a carrier. It supplies no input, takes no
path and carries no assertion that can fail, so every cell whose obligation exists is `❌` rather than `⚠️`. The ledger holds a
`todo` E2E row for each story (`TDD-0011` … `TDD-0018`) with no test file. `Status` is `❌` on all eight.

Cells present on every story row, 32 in all:

- **Equivalence partitions** (8) — no input of any partition reaches `qfai report` at the E2E layer.
- **Normal path** (8) — no end-to-end run of the story exists.
- **Edge cases** (8) — no edge is exercised: an empty issue set, a large report, a spec tree with findings in every section.
- **Oracle strength** (8) — the carrier holds no assertion, so no mutation can make it fail.

Cells particular to a story, 15 in all:

- **US-0005-0001 × Special values** — no issue without a `file`, and no message with Markdown-significant characters, is rendered.
- **US-0005-0002 × Special values** — no input with absent optional sections is rendered to JSON and read back.
- **US-0005-0003 × Special values** — no URL with and without a trailing slash is supplied.
- **US-0005-0003 × Combinatorial** — `--base-url` is never crossed with `--format json` or `--spec`.
- **US-0005-0004 × State transitions** — the story's AC says `validate.json` is updated; no run observes a file before and after.
- **US-0005-0004 × Combinatorial** — the story says `--in` is ignored under `--run-validate`; the pair is never run.
- **US-0005-0005 × Error path** — the story's own Notes name the missing-file failure (message and exit 2), and reading
  `validate.json` is a trust boundary, so malformed input is a safety-floor failure. Neither is exercised at this layer. The
  integration row `TC-0005-0005` covers both; this cell stays `❌` because the story's layer has no test, and under the checklist's
  safety-floor rule it keeps this row a REVISE.
- **US-0005-0005 × Special values** — no absent, empty or corrupt file is supplied.
- **US-0005-0005 × Combinatorial** — `--in` against `output.validateJsonPath` precedence is never run.
- **US-0005-0006 × Special values** — an absent `--out`, which falls back to `outDir` plus `report.md` or `report.json`, is never run.
- **US-0005-0006 × Combinatorial** — the default output name is chosen by `--format`; the pair is never run.
- **US-0005-0007 × Boundary values** — the number of specs is a sized domain (none, one, several); no count is exercised.
- **US-0005-0008 × Error path** — `EX-0005-0001` and `EX-0005-0002` name the `QFAI-UIE-001` and `QFAI-UIE-002` findings as the
  condition that must turn into rerun guidance. No run supplies either.
- **US-0005-0008 × Special values** — absent or empty prototyping evidence is never supplied.
- **US-0005-0008 × Combinatorial** — the story's four areas (mode, obligations, evidence coverage, runtime details) are never
  crossed with evidence present and absent.

`n/a` on the story rows, for the record:

- **Error path** is `n/a` on `US-0005-0001`, `-0002`, `-0003`, `-0006` and `-0007`: no AC, BR or EX reached from them names a
  failure. The missing and malformed input failures belong to `US-0005-0005`. On `US-0005-0004` it is `n/a` too: the phase-guard
  failure is declared by `AC-0005-0008`, which names no story, and is owned by `TC-0005-0008`. The legacy-path refusal the
  `--run-validate` path also exercises is the migration gate's, not this story's.
- **Boundary values** is `n/a` everywhere except `US-0005-0007`: no other story has a numeric, date, length or ordered domain.
- **Special values** is `n/a` on `US-0005-0004` (a flag with no value) and `US-0005-0007` (the input is the spec tree, whose only
  special case is its size, scored under Boundary values).
- **State transitions** is `n/a` everywhere except `US-0005-0004`: generating a report is a single step.
- **Combinatorial** is `n/a` on `US-0005-0001`, `-0002` and `-0007`: each names one condition.

### TC-0005-0001 — Markdown report

Cases: `runs init -> validate(json) -> report(md)`, and every other Markdown case of the file.

- **Edge cases** — no case renders an input with zero issues, or a large one, and reads the Markdown.
- **Special values** — no issue without a `file` (rendered `(unknown)`), and no message with a `|` or other Markdown-significant
  character, is rendered and read.

### TC-0005-0002 — JSON report

Cases: `reads validate-<profile>.json when --profile is given without --run-validate`,
`keeps sibling specs out of the scoped report body`, `scopes prototyping spec coverage to the primary prototyping spec`, and the
`--run-validate` sunset case, all of which parse `report.json`.

- **Edge cases** — no empty or large issue set is read back from `report.json`.
- **Special values** — no input with absent optional fields is read back: the absence of a `prototyping` key is never asserted.

### TC-0005-0003 — `--base-url`

Case: `links file paths with --base-url`.

- **Edge cases** — the case asserts the root and config links only. The links the AC is mostly about, issue file paths rendered
  through `formatPathWithLine`, are never read.
- **Combinatorial** — `--base-url` is crossed with neither `--format json` nor `--spec`.

### TC-0005-0006 — `--out`

Cases that pass a custom `--out` and read it: `still writes the report artifact when the gate fails` (`gated.md`),
`writes validate-<profile>.json on the --run-validate path too` (`report-follow-up.json`), and
`keeps sibling specs out of the scoped report body` (`all.json`, `scoped.json`).

- **Edge cases** — every `--out` sits in a directory that already exists. An `--out` whose parent directory does not exist is never
  supplied.
- **Special values** — a relative `--out` and a path with spaces are never supplied. `tests/cli/args.test.ts` refuses a missing
  value at the unit layer, which does not score this row.

### TC-0005-0007 — spec-pack reports

Case: `scopes input, output and spec-pack artifacts to --spec`.

- **Edge cases** — no spec directory without a `06_Test-Cases.md`, and no pack with no test cases, is reported on.

### TC-0005-0008 — phase guard (DRIFT)

`AC-0005-0008` requires `qfai report --run-validate --phase refinement` in CI to print a phase-guard error and exit 1. The tree
does the opposite on both counts. `parseArgs` refuses `--phase` with `--phase is not supported`, and a narrow profile in CI exits
`0` with a `QFAI-VALIDATE-017` warning, which `reports a narrow profile in CI without failing the run` asserts on purpose. No case
exercises the AC's behaviour, and a test pins its reverse. The ledger row `TDD-0008` is `exception` under `DR-0005-0002`, whose
record describes a backfill over a working implementation and says nothing about this conflict.

- **Equivalence partitions** — no phase value reaches a guard.
- **Normal path** — the declared scenario never runs.
- **Error path** — the phase-guard error is a failure the AC declares, so it is kept whatever the parser now does. No case
  produces it.
- **Edge cases** — no phase guard runs outside CI or with no phase.
- **Combinatorial** — `--run-validate` × `--phase` × CI, the AC's own combination, is never run.
- **Oracle strength** — no case exists to make fail.

This row needs an upstream decision, not a test: a Change Request that retires or rewrites `AC-0005-0008`.

### TC-0005-0009 — incomplete or legacy prototyping evidence

Cases: `includes v2.0 prototyping summary from prototyping.json` and
`scopes prototyping spec coverage to the primary prototyping spec`.

- **Error path** — the TC's `EX-0005-0001` and `EX-0005-0002` supply `QFAI-UIE-001` and `QFAI-UIE-002` and require rerun guidance.
  No case supplies either. The only rerun line in the report, under `## Guidance`, is keyed on `QFAI-PROT-*` codes and not on
  these two (see Findings).
- **Edge cases** — no legacy artifact with design-system or Lighthouse findings (`EX-0005-0003`) is supplied, and no malformed
  `prototyping.json` is.
- **Boundary values** — the iteration count is exercised at 1 only. Zero iterations, where the collector adds its own warning, is
  never supplied.
- **Special values** — no `prototyping.json` with a missing `specsCovered` or a non-array `iterations` is supplied.
- **Combinatorial** — the three conditions the TC names (incomplete evidence, validator findings, legacy summaries) are never
  combined, and none but the first is exercised at all.

### TC-0005-0010 — no prototyping evidence

No case exists. The ledger row `TDD-0010` has no test file and is `exception` under `DR-0005-0100` with the evidence string
`deferred — no impl yet`. `DR-0005-0100` is not declared in `07_Decisions.md` or anywhere else, so it carries no rationale for
these cells. The implementation renders `- (none)` under `## Prototyping` when evidence is absent; the `missing` or `no-pack`
status `AC-0005-0010` requires is not produced (see Findings).

- **Equivalence partitions**, **Normal path**, **Edge cases**, **Special values**, **Combinatorial**, **Oracle strength** — six
  cells, each `❌` because the row has no case. The obligations exist: absent evidence is itself the special value, a present
  evidence directory with no `prototyping.json` is the edge, and the AC's `missing` versus `no-pack` is a surface-type × absence
  combination.
- `Error path` is `n/a`: absent evidence is the row's normal scenario, not a failure. `Boundary values` and `State transitions`
  are `n/a`: absence has no ordered domain and the render is one step.

### The seven ❌ cells of the business rule table

- **BR-0005-0002 × Negative case** — the rule says the section must not tell users to run `qfai prototyping`. No case asserts the
  absence of that instruction.
- **BR-0005-0003 × Positive case** — no case produces the `/qfai-prototyping` rerun line from incomplete evidence.
- **BR-0005-0003 × Negative case** — the rule forbids presenting missing evidence as an optional note. No case checks it.
- **BR-0005-0003 × Conditional branches** — neither the incomplete branch nor the complete branch is exercised for the guidance.
- **BR-0005-0004 × Positive case** — no case supplies a legacy prototyping artifact.
- **BR-0005-0004 × Negative case** — no case asserts that a legacy summary presents no removed CLI command.
- **BR-0005-0004 × Conditional branches** — neither the legacy-present branch nor the legacy-absent branch is asserted.

## Every ⚠️ cell, named

### Matrix (14)

- **TC-0005-0001 × Oracle strength** — M4 removed the `## Canonical Issues` heading and the case stayed green. The AC names three
  parts: an executive summary, an issue list and a traceability matrix. The case pins `## SC Coverage` and
  `## SC → Referenced Tests` but not `## Dashboard` or the issue list. Removing `## Hotspots` would fail it; that was not run.
- **TC-0005-0002 × Oracle strength** — the assertions compare exact values (`summary.counts`, `profile`, `specsCoverage`), so a
  format switch from JSON to Markdown would fail `JSON.parse` in the profile case. Named, not run.
- **TC-0005-0003 × Equivalence partitions** — the with-URL partition is asserted. The without-URL partition runs in every other
  Markdown case, but no case asserts that it carries no links.
- **TC-0005-0003 × Special values** — a trailing slash is supplied and asserted to be normalised. A URL without one, or with a
  query or fragment, is not.
- **TC-0005-0004 × State transitions** — `validate-sdd.json` written by `--run-validate` is read by a follow-up report run. An
  existing `validate.json` being overwritten, which is what the AC's "updated" means, is never observed: `qfai init` writes none.
- **TC-0005-0004 × Combinatorial** — `--run-validate` is crossed with `--profile`, `--spec`, CI and a legacy config. The pair
  the story names, `--run-validate` with `--in` (ignored), is parsed in `tests/cli/args.test.ts` and never run at this layer.
- **TC-0005-0004 × Oracle strength** — named mutation: `runValidateForReport` skips writing the validate result, which fails the
  `readFile` of `validate.json` in `runs report with --run-validate`. Not run.
- **TC-0005-0006 × Equivalence partitions** — an explicit absolute `--out` inside the project and the scoped default are
  exercised. An `--out` outside the project, which is the AC's `/tmp/custom-report.md`, is not, and the unscoped default
  `report.md` is written by several cases but never read back.
- **TC-0005-0006 × Combinatorial** — `--out` is crossed with both formats. `--out` with `--spec`, where the explicit path
  overrides the scoped name, is never run.
- **TC-0005-0007 × Equivalence partitions** — the scoped run writes its own pack and leaves a sibling's untouched. The TC's own
  step, an unscoped run over several specs, writes every pack, but no case reads a pack after it.
- **TC-0005-0007 × Boundary values** — one spec in scope out of several is exercised. Zero specs is not, and the all-packs case is
  unread.
- **TC-0005-0007 × State transitions** — a sibling's pre-existing `coverage.md` is shown unchanged. The in-scope pack being
  rewritten over a pre-existing file is not.
- **TC-0005-0009 × Equivalence partitions** — evidence present and complete is exercised twice. Incomplete evidence (a missing
  spec), validator findings and legacy artifacts are not.
- **TC-0005-0009 × Normal path** — the section renders `lifecycle`, `mode` and `evidence`. `AC-0005-0009` also names `render`,
  `browserQa` and `calibration` subsections, which the collector never populates and so can never render (see Findings).

### Business rule table (3)

- **BR-0005-0001 × Negative case** — the missing-input and malformed-input failures reached through `AC-0005-0005` are covered.
  The phase-guard failure reached through `AC-0005-0008` is contradicted by the tree (see `TC-0005-0008`).
- **BR-0005-0002 × Positive case** — the section renders, with mode and evidence coverage. Screenshot and HTML readiness,
  validator findings and rerun guidance inside the section are not asserted.
- **BR-0005-0002 × Conditional branches** — "may include": the evidence-present branch is exercised, the absent branch is
  `TC-0005-0010`, which has no case.

## Findings

1. **No test is annotated for spec-0005, and the ledger's test file is gone.** `TDD-0001` … `TDD-0009` name
   `packages/qfai/tests/integration/reportSpec0005.test.ts`, which does not exist. The only files naming spec-0005 are the two carriers, and they are what puts the spec under
   `QFAI-ATDD-131`. The real coverage, `packages/qfai/tests/cli/report.test.ts`, carries no annotation and sits outside every layer
   directory the ATDD scan reads: `tests/cli/` is neither an e2e, an api nor an integration directory. The ledger rows need a live test file,
   selector and annotation.
2. **`DR-0005-0002` cites a file that no longer exists.** It names `tests/cli/report.test.ts` and `tests/core/report.test.ts` as
   the existing coverage. The second does not exist.
3. **`DR-0005-0100` is declared nowhere.** `TDD-0010` is parked as an exception citing it. `07_Decisions.md` declares
   `DR-0005-0001` and `DR-0005-0002` only, and `qfai validate` reports the missing record.
4. **`07_Decisions.md` says `1 item` and declares two.**
5. **DRIFT: `AC-0005-0008` is contradicted by the tree.** `--phase` is refused as unsupported, and a narrow profile in CI exits
   `0` with a warning, which a passing test asserts. Route to the spec owner as a Change Request.
6. **DRIFT: `AC-0005-0009` names subsections the implementation cannot produce.** `collectPrototypingSummary` in
   `src/core/report.ts` never sets `render`, `browserQa` or `calibration`, so those headings never appear.
7. **DRIFT: `AC-0005-0010`'s `missing` / `no-pack` status is not implemented.** With no evidence the section renders `- (none)`,
   and `recommendationArtifact` appears nowhere in `src/core/report.ts`. This matches `TDD-0010`'s `no impl yet`.
8. **DRIFT: the rerun guidance does not follow `EX-0005-0001`, `EX-0005-0002` or `BR-0005-0002`.** The `recover:` line is keyed
   on `QFAI-PROT-101`, `-244`, `-245` and `-251` … `-254`, not on `QFAI-UIE-001` or `QFAI-UIE-002`. It sits under `## Guidance`,
   not in the prototyping section the rule places it in.
9. **Ten of the 31 cases in `tests/cli/report.test.ts` serve no row of this pack.** The three CI and profile-mismatch warnings,
   the relocated scoped `--in`, the unresolvable `--spec` refusal and five `--fail-on` / `--strict` exit-code cases test
   behaviour no `TC-0005-*` declares.
10. **No story has an E2E test.** `TDD-0011` … `TDD-0018` are `todo` with no file, and the carrier is the only file naming the
    stories.

## Totals

Counted over mark cells only, by a node script reading the two tables above. `US/TC ID`, `BR ID`, `Covering TC` and `Status` are
excluded.

| Table                                 | Cells | ✅  | ⚠️  | ❌  | n/a |
| ------------------------------------- | ----- | --- | --- | --- | --- |
| Matrix (18 rows × 9 columns)          | 162   | 24  | 14  | 73  | 51  |
| Business rule table (4 rows × 3 cols) | 12    | 2   | 3   | 7   | 0   |
| Combined                              | 174   | 26  | 17  | 80  | 51  |

**✅ 26 / ⚠️ 17 / ❌ 80**, `n/a` 51.

Of the 73 matrix `❌`, 47 sit on the eight story rows, which have no test at their layer, and 12 on `TC-0005-0008` and
`TC-0005-0010`, which have no case at all.
