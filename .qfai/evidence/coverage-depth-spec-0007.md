# Coverage Depth Matrix — spec-0007

## Scope

This matrix scores every acceptance obligation of spec-0007, the `qfai guardrails` command (`list`, `extract`,
`check`), against the tests that carry a `QFAI:SPEC-0007:` annotation. The obligation set is read in full from
`02_User-stories.md` and `06_Test-Cases.md`, not from the rows of `tdd/test-list.md`.

- **Stories.** `US-0007-0001`, `US-0007-0002` and `US-0007-0003`. None carries a `- x-qfai-status: planned` meta
  line, so all three are active and each owns a row.
- **Test cases.** `06_Test-Cases.md` declares eleven. Ten declare `Level` `integration` and each owns a row.
  `TC-0007-0008` declares `Level` `unit`, so it owes no acceptance test and has no matrix row. Its rule,
  `BR-0007-0008`, still owns a row in the business rule table.
- **Business rules.** `04_Business-Rules.md` carries ten `BR-ID` rows in its Rule Table and no retiring
  `Status:`, so all ten are active and each owns a row.
- **Contracts.** No file of this pack references a `CON-API-*` or `CON-DB-*`, so no contract-derived failure is
  scored.

The ledger agrees with this set: eleven `TC-*` rows (`TDD-0001` … `TDD-0011`) and one `Layer = E2E` row per
story (`TDD-0012` … `TDD-0014`, all `todo`). No obligation was dropped from it.

Three files carry `QFAI:SPEC-0007:` lines and declare no test, so none of them is scored:

- `tests/integration/qfai-traceability.md` lists `TC-0007-0001` … `TC-0007-0011`, and its opening line says it
  is an annotation carrier, not a test.
- `tests/e2e/qfai-traceability.md` lists the three stories on the same terms.
- `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md` uses `QFAI:SPEC-0007:US-0007-0001` and
  `US-0007-0004` inside an illustrative code sample about E2E test counts (see Findings).

One executable file carries the annotations: `packages/qfai/tests/integration/guardrailsSpec0007.test.ts`. It
annotates `TC-0007-0001` … `TC-0007-0009` and holds one case per test case. No executable test anywhere in the
repository annotates a story, `TC-0007-0010` or `TC-0007-0011`.

That file sits in the package's own integration layer directory, which the ATDD scan reads, so the scan already
counts it as an executable test. The marks below score what the file actually exercises.

### How the cells are scored

- **Every case in the annotated file reads a source file and matches a substring.** Each case reads
  `src/cli/commands/guardrails.ts` or `src/core/decisionGuardrails.ts` and checks for a word such as `list`,
  `max`, `check` or `paths`. None calls `runGuardrails`, none builds a fixture, and none reads an exit code or an
  output line. These cases are scored the way the spec-0008 matrix scores its substring cases: the case exists, so
  `Normal path` is ✅, and every other category that has an obligation is ❌ because nothing exercises it.
  `Oracle strength` is ❌ because a measured production mutation of the row's own behaviour left the case green.
- **`Normal path`** is owed by every row. No `TC-*` declares a `Type`, so no row can mark it `n/a`.
- **`Error path`** is scored for the kept failures a row owns. A test case owns a failure its `AC-Refs` or
  `EX-Ref` reach, including a failure declared by a rule whose `AC-Refs` name the test case's AC. The stories
  carry no `AC-Refs`, so a story owns the failures its own text names: `US-0007-0002` the invalid `--max`, and
  `US-0007-0003` the exit 1 on violations. `US-0007-0001` names none.
- The kept failures of this pack are:

  | Failure                                    | Declared by                                    | Owning rows                                                         |
  | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- |
  | Violations reported, exit 1                | `AC-0007-0006`, `BR-0007-0007`, `EX-0007-0007` | `TC-0007-0007`, `TC-0007-0006` (via `AC-0007-0005`), `US-0007-0003` |
  | `--max` not a non-negative integer, exit 2 | `BR-0007-0004`                                 | `TC-0007-0005`, `US-0007-0002`                                      |
  | Action missing, exit 2                     | `AC-0007-0007`, `BR-0007-0008`, `EX-0007-0008` | `TC-0007-0008` (unit, no matrix row)                                |
  | Guardrail source cannot be loaded, exit 2  | `AC-0007-0008`, `BR-0007-0009`, `EX-0007-0009` | `TC-0007-0009`                                                      |

- **Three of these are safety-floor failures.** An invalid `--max`, a missing action and an unloadable `--path`
  are all command-line input crossing the process-entry trust boundary. Under the depth checklist a cell whose kept
  failures include one of them is ✅ or the row is a REVISE. Neither ⚠️ nor ❌ with a decision record discharges
  it.
- **`n/a`** marks a category whose obligation is absent for the row, never one that is unmet. `State transitions`
  is `n/a` on every row: each action is one read or one check with no state machine and no multi-step process.
- **The two placeholder test cases.** `TC-0007-0010` and `TC-0007-0011` declare only "verify that migrated example
  EX-0007-0010 (EX-0007-0011) is covered by at least one test case". Their examples are placeholders for
  `BR-0007-0005` (the LLM format of `extract`) and `BR-0007-0010` (normalize and sort). Their rows are scored
  against the rule each example stands for, since that is the only behaviour the chain reaches.
- **Business rule table.** `Covering TC` is `06_Test-Cases.md` `EX-Ref` joined to `05_Examples.md` `BR-Ref`. A
  test case reaching the rule only through the rule's `AC-Refs` is named in parentheses. A positive or negative
  cell is ⚠️ where a covering annotated case exists whose subject is that side of the rule but which only reads
  source text, and ❌ where no covering case addresses it. `Negative case` is `n/a` where the rule declares no
  failure, or where the rule's whole content is a failure, which is then its positive case.

## What was measured, and how

All runs used `pnpm -C packages/qfai exec vitest run <file>` (vitest v4.1.11) in this worktree, one file at a
time. The whole suite was not run.

| File                                           | Carries spec-0007 annotations | Result   |
| ---------------------------------------------- | ----------------------------- | -------- |
| `tests/integration/guardrailsSpec0007.test.ts` | yes, `TC-0007-0001` … `-0009` | 9 passed |
| `tests/cli/guardrails.test.ts`                 | no — run for contrast only    | 9 passed |

`tests/cli/guardrails.test.ts` and `tests/core/decisionGuardrails.test.ts` are the files `DR-0007-0002` names as
the command's existing coverage. Neither carries an annotation, so neither scores a cell. The first was run beside
each mutation below to show which mutations a behavioural test catches.

### Mutations

Each mutation was applied alone to a production file of the command, both files above were run, and the file was
restored byte for byte from a copy held in memory. Afterwards `git status --short packages/qfai/src` printed
nothing.

| ID  | Row            | Production mutation                                                                      | Annotated file | `tests/cli/guardrails.test.ts` |
| --- | -------------- | ---------------------------------------------------------------------------------------- | -------------- | ------------------------------ |
| M1  | `TC-0007-0001` | `loadDecisionGuardrails` discards every parsed entry (`entries.push(...parsed)` removed) | 9 passed       | 6 failed, 3 passed             |
| M2  | `TC-0007-0002` | `list` prints `- <text>` instead of `- [ID][type] text (file:line)`                      | 9 passed       | 9 passed                       |
| M3  | `TC-0007-0003` | `list` prints an empty line instead of `- (none)` when nothing is found                  | 9 passed       | 9 passed                       |
| M4  | `TC-0007-0004` | the keyword is no longer lower-cased, so matching becomes case-sensitive                 | 9 passed       | 9 passed                       |
| M5  | `TC-0007-0005` | `DEFAULT_EXTRACT_MAX` changed from 20 to 5                                               | 9 passed       | 9 passed                       |
| M6  | `TC-0007-0006` | text-mode `check` returns 1 whatever the error count                                     | 9 passed       | 9 passed                       |
| M7  | `TC-0007-0007` | text-mode `check` returns 0 whatever the error count                                     | 9 passed       | 2 failed, 7 passed             |
| M8  | `TC-0007-0009` | a load error returns 0 instead of 2                                                      | 9 passed       | 3 failed, 6 passed             |

No mutation of behaviour fails any annotated case. The only edit that could is deleting the matched word from the
source file, which is not a change of behaviour.

### Observations of the built command

The built CLI (`packages/qfai/dist/cli/index.mjs`) was run against the commands the spec names, from a scratch
directory with a three-entry `18_delta.md` fixture. These are observations, not tests, and support the Findings.

| Command                                                     | Exit | Output                                                                                     |
| ----------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------ |
| `qfai guardrails`                                           | 2    | `qfai guardrails: unknown or missing subcommand. Expected: list\|extract\|check` and usage |
| `qfai guardrails list --paths /nonexistent`                 | 2    | `qfai: unknown option: --paths` and usage                                                  |
| `qfai guardrails list --path /nonexistent`                  | 2    | `guardrails: …/nonexistent: Path does not exist`                                           |
| `qfai guardrails extract --path <fixture> --max 2.5`        | 0    | two entries                                                                                |
| `qfai guardrails extract --path <fixture> --max 2abc`       | 0    | two entries                                                                                |
| `qfai guardrails extract --path <fixture> --max -1`         | 2    | `guardrails: --max must be a non-negative number`                                          |
| `qfai guardrails extract --path <fixture> --max 0`          | 0    | `- (none)`                                                                                 |
| `qfai guardrails extract --path <fixture> --keyword LAYOUT` | 0    | the one entry containing `Layout`                                                          |
| `qfai guardrails list`, run at the repository root          | 0    | `# Decision Guardrails (list)` then `- (none)`                                             |

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0007-0001 | ❌                     | ❌          | n/a        | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0007-0002 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0007-0003 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0001 | ❌                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0002 | ❌                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| TC-0007-0003 | ❌                     | ✅          | n/a        | ❌         | ❌              | ❌             | n/a               | n/a           | ❌              | ❌     |
| TC-0007-0004 | ❌                     | ✅          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0005 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0006 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0007 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0009 | ❌                     | ✅          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0007-0010 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | n/a           | ❌              | ❌     |
| TC-0007-0011 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |

`US/TC ID` and `Status` hold an identifier and the row verdict and are not counted. Every row's verdict is ❌: each
has at least one ❌ cell and an `Oracle strength` of ❌.

### Business rule coverage

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                           | Status |
| ------------ | ------------- | ------------- | -------------------- | ----------------------------------------------------- | ------ |
| BR-0007-0001 | ⚠️            | n/a           | ❌                   | TC-0007-0001                                          | ❌     |
| BR-0007-0002 | ⚠️            | n/a           | ⚠️                   | TC-0007-0002, TC-0007-0003                            | ⚠️     |
| BR-0007-0003 | ⚠️            | n/a           | n/a                  | TC-0007-0004                                          | ⚠️     |
| BR-0007-0004 | ⚠️            | ❌            | ❌                   | TC-0007-0005                                          | ❌     |
| BR-0007-0005 | ❌            | n/a           | n/a                  | TC-0007-0010                                          | ❌     |
| BR-0007-0006 | ⚠️            | n/a           | n/a                  | TC-0007-0006                                          | ⚠️     |
| BR-0007-0007 | ⚠️            | ❌            | ⚠️                   | TC-0007-0007 (with TC-0007-0006 through AC-0007-0005) | ❌     |
| BR-0007-0008 | ⚠️            | n/a           | n/a                  | TC-0007-0008 (unit, no matrix row)                    | ❌     |
| BR-0007-0009 | ❌            | n/a           | n/a                  | TC-0007-0009                                          | ❌     |
| BR-0007-0010 | ❌            | n/a           | ❌                   | TC-0007-0011                                          | ❌     |

`BR ID`, `Covering TC` and `Status` are not counted. `BR-0007-0008` has status ❌ although no cell is ❌: its
positive case is a safety-floor failure, and a ⚠️ cannot discharge one.

`n/a` in `Negative case` means the rule declares no failure (`BR-0007-0001`, `-0002`, `-0003`, `-0005`, `-0006`,
`-0010`), or the rule's whole content is a failure that is scored as its positive case (`BR-0007-0008`, `-0009`).
`n/a` in `Conditional branches` means the rule states no condition.

## Every ❌ cell, named

Each ❌ cell is named below with its reason. The five ❌ cells marked **safety floor** cannot be discharged by any
justification: each needs a case, and until one exists its row is a REVISE. One ⚠️ cell of the business rule
table, `BR-0007-0008` Positive, carries the same mark for the same reason.

`DR-0007-0002` is the decision the ledger cites for `TDD-0001` … `TDD-0009`. It records the backfill as one-shot
GREEN over an existing implementation and states that the command is already broadly covered by
`tests/cli/guardrails.test.ts` and `tests/core/decisionGuardrails.test.ts`. It records why no RED was run. It does
not record a decision to leave any category below uncovered, and the mutation table shows five of eight named
behaviours left untested even by those two files. It is therefore not cited as the justification of any cell.

### US-0007-0001 — Guardrail list

No executable test annotates this story. Its ledger row, `TDD-0012`, is `todo` with no test file, and
`tests/e2e/qfai-traceability.md` lists it only as a carrier.

- **Equivalence partitions** — the two declared sources (`_policies/` and spec constraints) and the declared
  keyword classes are never fed to the command.
- **Normal path** — no case runs `qfai guardrails list`.
- **Edge cases** — the empty result that `AC-0007-0002` declares is never exercised end to end.
- **Boundary values** — the entry count moves the output from `- (none)` at 0 to one line per entry at 1; neither
  side is exercised.
- **Special values** — lower-case keywords (case-insensitive under `DR-0007-0001`) and a zero-byte source file are
  never supplied.
- **Combinatorial** — both sources holding guardrails in one run is never exercised.
- **Oracle strength** — there is no assertion that could fail.

`Error path` is `n/a`: the story's text names no failure. The unloadable-path failure is owned by `TC-0007-0009`
and the missing-action failure by `TC-0007-0008`.

### US-0007-0002 — Guardrail extract

No executable test annotates this story. `TDD-0013` is `todo` with no test file.

- **Equivalence partitions** — matching and non-matching keywords, and set and unset `--max`, are never
  exercised.
- **Normal path** — no case runs `qfai guardrails extract`.
- **Error path** (**safety floor**) — the story's Notes declare that a `--max` that is not a non-negative integer
  is an error. No case supplies one. The observations above also show `--max 2.5` and `--max 2abc` accepted with
  exit 0, so the failure is partly unimplemented (see Findings).
- **Edge cases** — a keyword matching nothing, and fewer entries than `--max`, are never exercised.
- **Boundary values** — `--max 0`, the default of 20 against 20 and 21 entries, and `--max -1` are never supplied.
- **Special values** — keyword case variants and an unset `--max` are never supplied.
- **Combinatorial** — `--keyword` together with `--max` (filter, then limit) is never exercised.
- **Oracle strength** — there is no assertion that could fail.

### US-0007-0003 — Guardrail consistency check

No executable test annotates this story. `TDD-0014` is `todo` with no test file.

- **Equivalence partitions** — clean guardrails, guardrails with warnings only, and guardrails with errors are
  never fed to the command.
- **Normal path** — no case runs `qfai guardrails check`.
- **Error path** — the story's Goal declares exit 1 when errors are found. No case produces a violation.
- **Edge cases** — a `check` with no guardrails at all, and an entry carrying several violations, are never
  exercised.
- **Boundary values** — the exit code turns on an error count of 0 against 1; neither side is exercised.
- **Special values** — an issue with no ID or no line, which the story's field list admits, is never produced.
- **Combinatorial** — errors crossed with warnings, which together decide the summary and the exit code, are
  never exercised.
- **Oracle strength** — there is no assertion that could fail.

### TC-0007-0001 — Guardrail detection source coverage

One case: `decisionGuardrails.ts` contains the text `loadDecisionGuardrails`.

- **Equivalence partitions** — no partition of the input (source directory, keyword class) is represented. No
  guardrail is loaded.
- **Edge cases** — text with no keyword, a keyword inside a longer word, and an empty source directory are never
  supplied.
- **Special values** — lower-case and mixed-case keywords, which `DR-0007-0001` requires to be detected, are never
  supplied. Neither is text holding both `MUST` and `MUST NOT`.
- **Combinatorial** — guardrails in both `_policies/` and a spec, loaded together, are never exercised.
- **Oracle strength** — M1 made the loader discard every entry. The case stayed green; six cases of
  `tests/cli/guardrails.test.ts` failed.

`Error path`, `Boundary values` and `State transitions` are `n/a`: `AC-0007-0001`, `BR-0007-0001` and
`EX-0007-0001` declare no failure, the count of 3 in the example is a representative rather than a limit, and
loading is one step.

### TC-0007-0002 — list output format

One case: `guardrails.ts` matches `/list/`.

- **Equivalence partitions** — no entry of any type is rendered, so no type partition is represented.
- **Edge cases** — a guardrail text spanning several lines, which the parser joins with a newline inside a
  one-line list format, is never supplied.
- **Special values** — guardrail text containing `[`, `]` or `(`, which collide with the `[ID][type]` and
  `(file:line)` delimiters, and a source path with spaces, are never supplied.
- **Oracle strength** — M2 replaced the line format with `- <text>`. The case stayed green, and so did all nine
  cases of `tests/cli/guardrails.test.ts`.

`Error path`, `Boundary values`, `State transitions` and `Combinatorial` are `n/a`: the format rule declares no
failure and no ordered domain, rendering is one step, and each line is built from its own entry alone. The order
of lines belongs to `TC-0007-0011`.

### TC-0007-0003 — list empty result handling

One case: `decisionGuardrails.ts` contains the text `loadDecisionGuardrails`, the same assertion as
`TC-0007-0001`.

- **Equivalence partitions** — the three ways to have no guardrail (no source file, a file with no
  `Decision Guardrails` section, a section whose entries are all incomplete) are never supplied.
- **Edge cases** — a section whose every entry is dropped by normalization is never supplied.
- **Boundary values** — 0 entries against 1 entry, where the output changes shape, is never exercised.
- **Special values** — a zero-byte source file and a whitespace-only section are never supplied.
- **Oracle strength** — M3 replaced `- (none)` with an empty line. The case stayed green, and so did all nine cases
  of `tests/cli/guardrails.test.ts`. The assertion does not concern the empty result at all.

`Error path`, `State transitions` and `Combinatorial` are `n/a`: an empty result is a valid outcome, the list is
one step, and `AC-0007-0002` names a single condition.

### TC-0007-0004 — extract keyword filtering

One case: `guardrails.ts` matches `/extract/`. The case title says "with keyword"; the assertion does not mention
the keyword.

- **Equivalence partitions** — matching and non-matching guardrails are never compared.
- **Edge cases** — a keyword matching nothing, an empty keyword, and a match found only in the rationale or the
  keywords field are never supplied.
- **Special values** — keyword case variants, which are the rule's own clause, a keyword padded with spaces and
  non-ASCII text are never supplied.
- **Combinatorial** — the keyword filter together with `--max` is never exercised.
- **Oracle strength** — M4 made matching case-sensitive. The case stayed green, and so did all nine cases of
  `tests/cli/guardrails.test.ts`.

`Error path`, `Boundary values` and `State transitions` are `n/a`: the rule declares no failure, a substring match
has no ordered domain, and filtering is one step.

### TC-0007-0005 — extract --max limit

One case: `guardrails.ts` matches `/max/`.

- **Equivalence partitions** — unset `--max`, an integer `--max`, a negative value and a non-integer are never
  supplied.
- **Error path** (**safety floor**) — `BR-0007-0004` declares exit 2 for a value that is not a non-negative
  integer. No case supplies one. `tests/cli/guardrails.test.ts` does check `max: -1` against the JSON envelope,
  but carries no annotation. The non-integer half is observed unimplemented (see Findings).
- **Edge cases** — fewer entries than the limit is never supplied.
- **Boundary values** — `--max 0`, `--max -1`, the default of 20 against 20 and 21 entries, and the example's 30
  entries with `--max 10` are never exercised.
- **Special values** — an unset `--max`, `0` and a non-numeric string are never supplied.
- **Combinatorial** — `--max` with `--keyword` is never exercised.
- **Oracle strength** — M5 changed the default from 20 to 5. The case stayed green, and so did all nine cases of
  `tests/cli/guardrails.test.ts`.

### TC-0007-0006 — check normal (error=0, exit 0)

One case: `guardrails.ts` matches `/check/`.

- **Equivalence partitions** — clean entries, entries with warnings only, and no entries all end in exit 0 and are
  never supplied.
- **Error path** — `BR-0007-0007` names `AC-0007-0005` in its `AC-Refs`, so this row owns its failure side: errors
  found, exit 1. No case produces it.
- **Edge cases** — warnings present with zero errors, where the summary is non-zero but the exit code is 0, is
  never supplied.
- **Boundary values** — an error count of 0 against 1 is never exercised.
- **Special values** — an empty guardrail set is never supplied.
- **Combinatorial** — error and warning counts crossed are never exercised.
- **Oracle strength** — M6 made text-mode `check` return 1 always. The case stayed green, and so did all nine cases
  of `tests/cli/guardrails.test.ts`.

### TC-0007-0007 — check violation (error>0, exit 1)

One case: `guardrails.ts` matches `/exit|return/i`. Any function with a `return` satisfies it.

- **Equivalence partitions** — the five error kinds the checker emits (missing ID, missing type, invalid type,
  missing guardrail, duplicate ID) are never supplied.
- **Error path** — `AC-0007-0006` and `EX-0007-0007` declare `[error]` issue lines and exit 1. No case produces a
  violation.
- **Edge cases** — one entry with several violations is never supplied.
- **Boundary values** — one error against none, and the example's two errors, are never exercised.
- **Special values** — an entry with no ID, whose issue line carries no `id=`, is never supplied.
- **Combinatorial** — errors together with warnings, and violations spread across two files, are never exercised.
- **Oracle strength** — M7 made text-mode `check` return 0 always. The case stayed green; two cases of
  `tests/cli/guardrails.test.ts` failed.

### TC-0007-0009 — path read error (exit 2)

One case: `guardrails.ts` matches `/paths/`. The case title is "CLI accepts paths parameter".

- **Equivalence partitions** — a missing path, an unsupported path type, an unreadable file, a directory and a
  valid file are never supplied.
- **Error path** (**safety floor**) — `AC-0007-0008`, `BR-0007-0009` and `EX-0007-0009` declare exit 2 with every
  load error shown. No case supplies a bad path. `tests/cli/guardrails.test.ts` does, but carries no annotation.
- **Edge cases** — a directory holding no delta file is never supplied.
- **Special values** — relative against absolute paths, and paths with spaces, are never supplied.
- **Combinatorial** — several bad paths in one run, where `BR-0007-0009` requires all errors to be shown, are
  never exercised.
- **Oracle strength** — M8 made a load error return 0. The case stayed green; three cases of
  `tests/cli/guardrails.test.ts` failed.

`Boundary values` and `State transitions` are `n/a`: a path has no ordered domain, and loading is one step.

### TC-0007-0010 — Coverage placeholder for EX-0007-0010 (BR-0007-0005)

No test carries this annotation. The ledger row `TDD-0010` records `Test file` `—`, `Status` `exception`, and cites
`DR-0007-0100` with the evidence "deferred — no impl yet". **`DR-0007-0100` is declared nowhere**: `07_Decisions.md`
holds `DR-0007-0001` and `DR-0007-0002`, and the identifier appears only in the two ledger rows. It is recorded
here as the identifier the row names, not as a justification. The "no impl yet" note is also inaccurate:
`formatGuardrailsForLlm` exists and `extract` calls it.

- **Equivalence partitions** — entries with and without the optional rationale, reconsider and related lines are
  never rendered.
- **Normal path** — no case exists.
- **Edge cases** — an empty result, which `extract` renders as `- (none)`, is never exercised.
- **Special values** — entries missing optional fields are never supplied.
- **Oracle strength** — there is no assertion that could fail.

`Error path`, `Boundary values`, `State transitions` and `Combinatorial` are `n/a`: `BR-0007-0005` declares no
failure, the limit belongs to `TC-0007-0005`, formatting is one step, and each optional line is emitted
independently of the others.

### TC-0007-0011 — Coverage placeholder for EX-0007-0011 (BR-0007-0010)

No test carries this annotation. `TDD-0011` has the same recorded state as `TDD-0010` and cites the same undeclared
`DR-0007-0100`. `normalizeDecisionGuardrails` and `sortDecisionGuardrails` both exist and both actions call them.

- **Equivalence partitions** — complete entries against entries missing an ID, a type or a guardrail, which
  normalization drops, are never supplied.
- **Normal path** — no case exists.
- **Edge cases** — two entries with the same type, and an empty list, are never sorted.
- **Special values** — a type spelled `Not Now` or `not_now`, which normalization maps to `not-now`, is never
  supplied.
- **Combinatorial** — the two sort keys (type, then ID) and the two actions the rule names (`list`, `extract`) are
  never crossed.
- **Oracle strength** — there is no assertion that could fail.

`Error path`, `Boundary values` and `State transitions` are `n/a`: dropping an incomplete entry is not a declared
failure (reporting it is `check`'s job), the sort has no numeric limit, and normalization is one step.

### The eight ❌ cells of the business rule table

- **BR-0007-0001 × Conditional branches** — the rule has a branch per source (`_policies/`, spec constraints) and
  per keyword. No case exercises any of them. The product also implements neither (see Findings).
- **BR-0007-0004 × Negative case** (**safety floor**) — no annotated case supplies a `--max` that is not a
  non-negative integer. Non-integers are observed accepted.
- **BR-0007-0004 × Conditional branches** — the default-of-20 branch and the explicit-value branch have no case of
  their own.
- **BR-0007-0005 × Positive case** — the only covering test case, `TC-0007-0010`, has no test.
- **BR-0007-0007 × Negative case** — nothing produces a violation and requires exit 1 (M7 survived).
- **BR-0007-0009 × Positive case** (**safety floor**) — the rule's whole content is the load failure. The covering
  case asserts that `guardrails.ts` contains `paths` and never supplies a bad path (M8 survived).
- **BR-0007-0010 × Positive case** — the only covering test case, `TC-0007-0011`, has no test.
- **BR-0007-0010 × Conditional branches** — the rule names two actions, `list` and `extract`. Neither is exercised.

## Every ⚠️ cell, named

The matrix has no ⚠️ cell. The business rule table has nine. Each is a covering annotated case that reads source
text for a word tied to the rule's subject and exercises nothing.

- **BR-0007-0001 × Positive case** — `TC-0007-0001` asserts that `loadDecisionGuardrails` exists. That function
  reads `## Decision Guardrails` sections of `18_delta.md`, not RFC 2119 keywords in `_policies/` and spec
  constraints, so even a behavioural test of it would not exercise this rule (see Findings).
- **BR-0007-0002 × Positive case** — `TC-0007-0002` asserts `guardrails.ts` matches `/list/`. The line format is
  never rendered (M2 survived).
- **BR-0007-0002 × Conditional branches** — both branches, zero entries and some entries, have a covering test
  case (`TC-0007-0003`, `TC-0007-0002`), and neither case exercises its branch (M2, M3 survived).
- **BR-0007-0003 × Positive case** — `TC-0007-0004` asserts `guardrails.ts` matches `/extract/`. Case-insensitive
  matching is never exercised (M4 survived).
- **BR-0007-0004 × Positive case** — `TC-0007-0005` asserts `guardrails.ts` matches `/max/`. Neither the default
  nor an explicit limit is exercised (M5 survived).
- **BR-0007-0006 × Positive case** — `TC-0007-0006` asserts `guardrails.ts` matches `/check/`. The summary line
  and the issue lines are never produced.
- **BR-0007-0007 × Positive case** — `TC-0007-0006` covers the exit-0 side through `AC-0007-0005` with the same
  `/check/` assertion (M6 survived).
- **BR-0007-0007 × Conditional branches** — both branches, `error = 0` and `error > 0`, have a covering case, and
  neither case exercises its branch (M6, M7 survived).
- **BR-0007-0008 × Positive case** (**safety floor**) — the rule's whole content is the missing-action refusal. The
  annotated case in `guardrailsSpec0007.test.ts` is titled "CLI handles missing action" and asserts only that
  `guardrails.ts` matches `/action/`, which the type declaration `action?: "list" | "extract" | "check"` satisfies
  alone. This cell is ⚠️ because the case's subject is the refusal. A safety-floor cell is not discharged by ⚠️, so
  the row's status is ❌. `tests/cli/args.test.ts` ("marks guardrails without action as invalid") exercises the
  parser's refusal but carries no annotation.

## Findings

None of these is repaired here. This file scores coverage and does not edit tests, ledgers or specs.

1. **DRIFT: the command does not implement the detection the spec declares.** `BR-0007-0001`, `DR-0007-0001`, the
   Notes of `US-0007-0001` and `EX-0007-0001` declare detection from `_policies/` and spec constraints by RFC 2119
   keywords. `EX-0007-0002` shows a `[MUST]` type. The implementation reads only `## Decision Guardrails` sections
   of `18_delta.md` files, entries `DG-NNNN` with the types `non-goal`, `not-now` and `trade-off`. A test cannot
   close this. It needs a Change Request to the spec or a change to the product, routed to the spec owner.
2. **The default guardrail source matches no current spec pack.** With no `--path`, the command reads
   `.qfai/specs/**/18_delta.md`. The constitution calls `18_delta.md` the legacy spec-pack layout, and the current
   template writes `09_delta.md`. `qfai guardrails list` at this repository's root was observed to print
   `- (none)` with exit 0.
3. **The `--paths` flag the spec names does not exist.** `REQ-0044`, `AC-0007-0008` and `EX-0007-0009` use
   `--paths`. The CLI has a repeatable `--path`. `qfai guardrails list --paths /nonexistent` exits 2 with
   `unknown option: --paths`, so the AC's exit code is met for a different reason than the one it states.
4. **DRIFT: non-integer `--max` is accepted.** `BR-0007-0004` and the Notes of `US-0007-0002` require an error
   (exit 2) for a value that is not a non-negative integer. The parser uses `Number.parseInt`, and
   `runGuardrails` floors the value, so `--max 2.5` and `--max 2abc` were observed to exit 0 and return two
   entries. Only negative values are refused. This is input validation at a trust boundary, a safety-floor
   failure.
5. **The missing-action message differs from the spec.** `AC-0007-0007` and `EX-0007-0008` require
   `action is required (list|extract|check)`. From the CLI the argument parser refuses first and prints
   `qfai guardrails: unknown or missing subcommand. Expected: list|extract|check`. The literal in `runGuardrails`
   is reached only by calling the function directly.
6. **`DR-0007-0100` is not declared.** `TDD-0010` and `TDD-0011` park their rows as `exception` citing it.
   `07_Decisions.md` declares only `DR-0007-0001` and `DR-0007-0002`, and the identifier appears nowhere else.
   Their evidence text, "no impl yet", is also wrong: `formatGuardrailsForLlm`, `normalizeDecisionGuardrails` and
   `sortDecisionGuardrails` exist and are called.
7. **`DR-0007-0002`'s coverage claim does not hold for the annotated tests, and holds only in part for the files it
   names.** No annotated case fails under any of the eight mutations. `tests/cli/guardrails.test.ts` catches three
   (M1, M7, M8) and misses five: the list format, the empty marker, case-insensitive matching, the default of 20
   and exit 0 on a clean check.
8. **`TC-0007-0008` is a unit test case recorded at the integration layer.** `06_Test-Cases.md` declares
   `Level` `unit`. The ledger row `TDD-0008` records `Layer` `integration`, and the annotation sits in
   `tests/integration/guardrailsSpec0007.test.ts`.
9. **`07_Decisions.md` says "1 item." and declares two decisions.**
10. **The placeholder examples leave two rules with no concrete example.** `EX-0007-0010` and `EX-0007-0011` state
    only that an example exists for `BR-0007-0005` and `BR-0007-0010`. Neither gives an input or an expected
    output, so `TC-0007-0010` and `TC-0007-0011` have nothing concrete to verify.
11. **A shipped catalog sample uses this spec's ID shape.** `catalog/test-layers.md` illustrates E2E annotations
    with `QFAI:SPEC-0007:US-0007-0001` and `QFAI:SPEC-0007:US-0007-0004`. The second story does not exist in this
    pack. The sample is not a test, but a repository search for spec-0007 annotations finds it.
12. **The annotated test file is already counted by the ATDD scan.** It sits in
    `packages/qfai/tests/integration/`, the package's own integration layer directory, which the scan reads. A
    behavioural replacement belongs in the same directory; no second suite under the root `tests/` is needed.

## Totals

Counted by a script over the mark cells only. `US/TC ID`, `BR ID`, `Covering TC` and `Status` are excluded.

| Table                 | Rows | Cells | ✅  | ⚠️  | ❌  | n/a |
| --------------------- | ---- | ----- | --- | --- | --- | --- |
| Matrix (nine columns) | 13   | 117   | 8   | 0   | 80  | 29  |
| Business rule table   | 10   | 30    | 0   | 9   | 8   | 13  |
| Combined              | 23   | 147   | 8   | 9   | 88  | 42  |

**✅ 8 / ⚠️ 9 / ❌ 88**, `n/a` 42, across 147 scored cells: 117 matrix cells and 30 business rule cells.
