# Coverage Depth Matrix — spec-0009

## Scope

This matrix scores the five user stories `02_User-stories.md` declares — `US-0009-0001` through
`US-0009-0005` — and the nine test cases `06_Test-Cases.md` declares — `TC-0009-0001` through
`TC-0009-0009`. The obligation set is read from those two files in full, not from the rows of
`.qfai/specs/spec-0009/tdd/test-list.md`. No story carries a `- x-qfai-status: planned` meta line,
so all five are active and own a row. No test case declares a `Level`, so none is exempt as a
unit or component case, and all nine own a row. The business rule table carries all five
`BR-0009-*` of `04_Business-Rules.md`; none carries a `Status:` retiring it.

The spec references no `CON-API-*` and no `CON-DB-*`: no `Contract-Refs` line in
`04_Business-Rules.md`, no `QFAI-CONTRACT-REF` line in `01_Spec.md`, and the ledger's
`CON-API-Refs` column is `-` on every row. No contract-derived failure is scored.

spec-0009 specifies `/qfai-configure`, a shipped skill document
(`packages/qfai/assets/init/.qfai/assistant/skills/qfai-configure/SKILL.md`). The behaviour it
specifies — analysing a repository, proposing globs, writing config and steering, sampling
matches — is carried out by an agent following that document. The document is therefore the
production artifact every oracle below is measured against.

Every test case has a passing annotated case, and almost every category cell is still `❌`. The
reason: all twelve cases read `SKILL.md` or `src/core/config.ts` and assert that a substring or a
regular expression is present. None supplies a repository, a config file or a set of matches to
anything. A category column asks how thoroughly a behaviour is exercised; where the only case
reads a document about the behaviour, no category beyond `Normal path` has anything to score.
Ten of the fourteen measured mutations that remove a row's own obligation from `SKILL.md` leave
the whole file green.

The `❌` cells below are **recorded gaps, not accepted waivers**. The ledger closes `TDD-0001` …
`TDD-0008` as `exception` under `DR-0009-0001`, but that record decides to close the rows as a
one-shot GREEN backfill; it does not decide to leave any category uncovered, and its claim that
the existing cases "cover all TC requirements" is contradicted by the mutation results. It is
therefore not cited as the justification carrier for any `❌`. `TDD-0009` cites `DR-0009-0002`,
which does not exist (see Findings).

## What was measured, and how

### Test runs

One file carries a `QFAI:SPEC-0009:` annotation that declares a test. It was run on its own:

| File (relative to `packages/qfai`)                 | Command                                                                                  | Result    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------- |
| `tests/integration/configureSkillSpec0009.test.ts` | `pnpm -C packages/qfai exec vitest run tests/integration/configureSkillSpec0009.test.ts` | 12 passed |

Two further files carry the annotations and declare no test, and are excluded:
`tests/integration/qfai-traceability.md` (all nine `TC-0009-*`) and `tests/e2e/qfai-traceability.md`
(all five `US-0009-*`) at the repository root. Each opens by stating it is an annotation carrier,
not a test. Nothing else under `packages/qfai/tests/**` or `tests/**` carries a spec-0009
annotation; that was searched for directly.

`node packages/qfai/dist/cli/index.mjs validate --profile atdd` agrees: its `QFAI-ATDD-119` list of
obligations covered only by a carrier names `US-0009-0001` … `US-0009-0005` and none of the nine
`TC-0009-*`.

The twelve cases, by row:

| Row          | Case(s) and what they assert                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| TC-0009-0001 | `SKILL.md` matches `/[Aa]nalyze.*repositor/` and contains `qfai.config.yaml`; `config.ts` contains `testFileGlobs`     |
| TC-0009-0002 | `config.ts` contains `testFileGlobs` and `testFileExcludeGlobs`; `SKILL.md` contains `testFileGlobs`                   |
| TC-0009-0003 | `SKILL.md` matches `/minimal.*diff/i` and contains `traceability globs`                                                |
| TC-0009-0004 | `SKILL.md` contains `product.md`, `tech.md`, `structure.md`, `manifest.md` and matches `/Fill.*verifiable.*evidence/i` |
| TC-0009-0005 | `SKILL.md` matches `/sample.*matched.*files/i`                                                                         |
| TC-0009-0006 | `SKILL.md` matches `/stop.*escalat/i`                                                                                  |
| TC-0009-0007 | `SKILL.md` matches `/[Tt]ool selection rationale/`; `SKILL.md` matches `/chosen tools per layer/i`                     |
| TC-0009-0008 | `config.ts` contains `QfaiValidationConfig`, `traceability`, `testFileGlobs`, `testFileExcludeGlobs`                   |
| TC-0009-0009 | `SKILL.md` matches `/evidence.*configure-<run-id>\.md/i` and contains `Evidence (MANDATORY)`                           |

### Mutations

Each mutation below was applied alone to `SKILL.md`, the test file was run with the JSON reporter,
and the file was restored from the bytes read before the run. The restore was checked
byte-for-byte after every run, and `git status --short packages/qfai` was empty afterwards.

| ID  | Mutation to `qfai-configure/SKILL.md`                                                                                        | Row it targets | Result                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| M1  | Delete the "Step 1 - Identify test frameworks and locations" heading and its three steps                                     | TC-0009-0001   | 12 passed — survived                           |
| M2  | Delete "Provide 3-10 include globs …" and both "Avoid overly broad globs" bullets                                            | TC-0009-0002   | 12 passed — survived                           |
| M3a | Delete "Keep all other config keys unchanged."                                                                               | TC-0009-0003   | 12 passed — survived                           |
| M3b | Reword the success criterion "updated with a minimal diff focused on traceability globs" to "`qfai.config.yaml` is updated." | TC-0009-0003   | 11 passed, the TC-0009-0003 case failed        |
| M4  | Drop the three `TBD` clauses, keeping "Fill steering from verifiable repository evidence first."                             | TC-0009-0004   | 12 passed — survived                           |
| M4b | Delete the Stage 0 bullet "Fill steering from verifiable repository evidence first; …"                                       | TC-0009-0004   | 11 passed, the TC-0009-0004 case failed        |
| M5  | Replace every `5-15` with `1-2`                                                                                              | TC-0009-0005   | 12 passed — survived                           |
| M5b | Delete both "sample matched files" lines                                                                                     | TC-0009-0005   | 11 passed, the TC-0009-0005 case failed        |
| M6  | Delete Step 5's zero-match stop paragraph and the `hard-required` entry that names it                                        | TC-0009-0006   | 12 passed — survived                           |
| M7a | Delete the mandatory check "Tool selection rationale is recorded (per layer if applicable)."                                 | TC-0009-0007   | 12 passed — survived                           |
| M7b | Delete "chosen tools per layer (E2E/API/Integration/Component/Unit)" from the evidence list                                  | TC-0009-0007   | 11 passed, the second TC-0009-0007 case failed |
| M8  | Delete the minimum-runnable-path mandatory check, its not-done line and its template heading                                 | TC-0009-0008   | 12 passed — survived                           |
| M9  | Delete the three `validation.require.specSections` opt-in lines                                                              | TC-0009-0009   | 12 passed — survived                           |
| M10 | Delete the three "exclude globs only when needed" lines                                                                      | BR-0009-0002   | 12 passed — survived                           |

M7a survives because the not-done line "Tool selection rationale missing." still matches the
regular expression. No mutation was applied to `packages/qfai/src/core/config.ts`: three cases read
it, but it is the shared config loader, not code belonging only to spec-0009, and none of the
three rows' obligations lives in it.

### How the cells are scored

- **A row is scored against the tests that carry its annotation.** Coverage elsewhere in the tree
  without a spec-0009 annotation is named beside the row it would serve, and not scored into it.
- **`Normal path`** is `✅` where the case pins the instruction that states the row's normal
  behaviour, `⚠️` where it pins a nearby statement but not that one, and `❌` where it pins nothing
  the row states. No case drives the behaviour itself.
- **The other category columns** are `❌` wherever the obligation exists and no case supplies an
  input in that category. A substring assertion over the document supplies none.
- **`Oracle strength`** is measured against mutations that remove the row's own obligation. `✅`
  needs every such mutation to fail the row's case; `⚠️` means one did and another survived; `❌`
  means the obligation mutation survived and only a mutation of unrelated text could fail the case.
- **`n/a`** is used only where the category's obligation is absent for the row, and names the
  failure it does not own where that is the reason.
- **`Status`** is the row verdict and is not counted in any total.

### Kept failures and the rows that own them

No `TC-*` in this pack declares a `Type`, so every test-case row owes `Normal path`. These are the
failures the pack's active `BR-*`, `AC-*` and `EX-*` declare. Ownership follows each row's
`AC-Refs` and `EX-Ref`, and a rule's `AC-Refs` and the examples' `BR-Ref`:

| ID   | Kept failure                                                             | Declared by                | Owning rows                                                                        |
| ---- | ------------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------- |
| KF-A | A test or source file is modified                                        | BR-0009-0001               | TC-0009-0001, TC-0009-0002, TC-0009-0003, TC-0009-0005, TC-0009-0008, TC-0009-0009 |
| KF-B | An exclude glob is added where the default exclusions already suffice    | BR-0009-0002               | TC-0009-0001, TC-0009-0002, TC-0009-0005, TC-0009-0008                             |
| KF-C | `validation.require.specSections` is changed without an explicit request | BR-0009-0003               | TC-0009-0003, TC-0009-0009                                                         |
| KF-D | Steering content cannot be verified and must be written as `TBD`         | BR-0009-0004, AC-0009-0004 | TC-0009-0004, TC-0009-0007                                                         |
| KF-E | Zero files match the proposed globs, and the skill must stop and ask     | BR-0009-0005, AC-0009-0005 | TC-0009-0005, TC-0009-0006                                                         |
| KF-F | An overly broad include glob such as `**/*` is proposed                  | AC-0009-0002               | TC-0009-0002                                                                       |
| KF-G | The config diff touches a key other than the two traceability glob keys  | AC-0009-0003               | TC-0009-0003                                                                       |

No story carries an `AC-Refs` line, so no chain reaches a story and every story's `Error path` is
`n/a` (see Findings). No case in the file exercises or even names any of KF-A … KF-G: the one
failure-shaped assertion, TC-0009-0006's, reads a different stop.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0009-0001 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| US-0009-0002 | ❌                     | ❌          | n/a        | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0009-0003 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0009-0004 | ❌                     | ❌          | n/a        | ❌         | ❌              | n/a            | ❌                | n/a           | ❌              | ❌     |
| US-0009-0005 | ❌                     | ❌          | n/a        | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0009-0001 | ❌                     | ⚠️          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0009-0002 | ❌                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0009-0003 | ❌                     | ✅          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ⚠️              | ❌     |
| TC-0009-0004 | ❌                     | ✅          | ❌         | ❌         | n/a             | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| TC-0009-0005 | ❌                     | ✅          | ❌         | ❌         | ❌              | ❌             | n/a               | n/a           | ⚠️              | ❌     |
| TC-0009-0006 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | n/a           | ❌              | ❌     |
| TC-0009-0007 | ❌                     | ✅          | ❌         | ❌         | n/a             | ❌             | n/a               | n/a           | ⚠️              | ❌     |
| TC-0009-0008 | ❌                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |
| TC-0009-0009 | ❌                     | ❌          | ❌         | ❌         | n/a             | ❌             | n/a               | ❌            | ❌              | ❌     |

### Business rule coverage

One row per active `BR-0009-*`. `Covering TC` joins each test case's `EX-Ref` in
`06_Test-Cases.md` to that example's `BR-Ref` in `05_Examples.md`. `Negative case` is scored where
the rule names a failure distinct from the behaviour it asserts; a rule whose whole content is
"on X, do Y" has Y as its positive case and `n/a` as its negative.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                                          | Status |
| ------------ | ------------- | ------------- | -------------------- | -------------------------------------------------------------------- | ------ |
| BR-0009-0001 | ⚠️            | ❌            | n/a                  | TC-0009-0001, TC-0009-0002, TC-0009-0003, TC-0009-0005, TC-0009-0008 | ❌     |
| BR-0009-0002 | ❌            | ❌            | ❌                   | TC-0009-0001, TC-0009-0002, TC-0009-0005, TC-0009-0008               | ❌     |
| BR-0009-0003 | ❌            | ❌            | ❌                   | TC-0009-0009                                                         | ❌     |
| BR-0009-0004 | ❌            | n/a           | ⚠️                   | TC-0009-0004, TC-0009-0007                                           | ❌     |
| BR-0009-0005 | ❌            | n/a           | ❌                   | TC-0009-0006                                                         | ❌     |

## Every ❌ cell, named

Grouped by row. Each bullet names the cell and why it is `❌`. No `DR-*` or `CR-*` carries any of
them: `DR-0009-0001` decides how the ledger rows were closed, not that these categories go
uncovered.

### US-0009-0001 — Repository Analysis

The story's only annotation is in `tests/e2e/qfai-traceability.md`, a carrier. The ledger's E2E
row `TDD-0010` is `todo` with no test file. No running case exists at any depth.

- **Equivalence partitions** — repositories differ by stack (the skill lists Python, Go, JVM, Rust,
  JS/TS, Ruby, PHP markers) and by test layout (dedicated directory, colocated); none is supplied.
- **Normal path** — no case analyses any repository.
- **Edge cases** — a monorepo with several test roots, and a repository with colocated tests, are
  untested.
- **Special values** — a repository whose tests exist but that has no runner config file is not
  supplied.
- **Combinatorial** — several frameworks in one repository (unit runner plus browser runner) are
  never combined.
- **Oracle strength** — no case exists, so nothing can fail.
- `n/a`: **Error path** (no chain reaches a story; KF-A and KF-B are owned by TC-0009-0001),
  **Boundary values** (identification has no ordered domain), **State transitions** (a single
  analysis step).

### US-0009-0002 — Config Glob Tuning

Carrier only; ledger row `TDD-0011` is `todo`.

- **Equivalence partitions** — explicit versus broad globs, include versus exclude, are never
  supplied.
- **Normal path** — no case updates any `qfai.config.yaml`.
- **Edge cases** — a config that already holds tuned globs is untested.
- **Boundary values** — the proposal's declared domain is 3-10 include globs (REQ-0003,
  AC-0009-0002); neither 3 nor 10 is exercised.
- **Special values** — the empty `testFileGlobs` that `qfai init` ships is never the starting state
  of a case.
- **State transitions** — unset globs to set globs, with `QFAI-TRACE-124` going away, is never
  observed.
- **Combinatorial** — include globs, exclude globs and the `specSections` opt-in are never crossed.
- **Oracle strength** — no case exists.
- `n/a`: **Error path** (no chain reaches a story; KF-B, KF-C, KF-F and KF-G are owned by test-case
  rows).

### US-0009-0003 — Steering Population

Carrier only; ledger row `TDD-0012` is `todo`.

- **Equivalence partitions** — verifiable and unverifiable facts are never supplied.
- **Normal path** — no case populates any steering file.
- **Edge cases** — a steering file already accurate, which the skill says to keep, is untested.
- **Special values** — `TBD` for an unverifiable field is never produced.
- **State transitions** — template to filled, and stale to refreshed, are never observed.
- **Combinatorial** — the four files crossed with evidence present or absent are never combined.
- **Oracle strength** — no case exists.
- `n/a`: **Error path** (no chain reaches a story; KF-D is owned by TC-0009-0004 and
  TC-0009-0007), **Boundary values** (no ordered domain).

### US-0009-0004 — Evidence Sampling Confirmation

Carrier only; ledger row `TDD-0013` is `todo`.

- **Equivalence partitions** — match sets inside and outside the 5-15 range are never supplied.
- **Normal path** — no case samples matches for any glob.
- **Edge cases** — more than 15 available matches, where the sample must be cut, is untested.
- **Boundary values** — the story names 5-15; neither 5 nor 15 is exercised.
- **State transitions** — proposed, then confirmed, then proceeding is never observed.
- **Oracle strength** — no case exists.
- `n/a`: **Error path** and **Special values** (the empty match set is KF-E, owned by TC-0009-0005
  and TC-0009-0006; no chain reaches this story), **Combinatorial** (the story states one
  condition, the count of matches).

### US-0009-0005 — Tool Selection Documentation

Carrier only; ledger row `TDD-0014` is `todo`.

- **Equivalence partitions** — projects with and without a dev server, a database or environment
  setup are never supplied.
- **Normal path** — no case records a tool selection or a runnable path.
- **Edge cases** — a library with no server to start is untested.
- **Special values** — a layer the project does not have, recorded as not applicable, is never
  produced.
- **Combinatorial** — dev server, database and environment are never combined in one path.
- **Oracle strength** — no case exists.
- `n/a`: **Error path** (no chain reaches a story), **Boundary values** (no ordered domain),
  **State transitions** (recording is a single step).

### TC-0009-0001 — Repository Analysis Identifies Frameworks

Owns KF-A and KF-B.

- **Equivalence partitions** — no stack or config file (`vitest.config.*`, `pytest.ini`, `go.mod`)
  is supplied.
- **Error path** — neither KF-A nor KF-B is exercised or asserted.
- **Edge cases** — colocated `src/**/*.spec.ts` tests, which EX-0009-0001 names, are never
  supplied.
- **Special values** — a repository with tests and no runner config is not supplied.
- **Combinatorial** — EX-0009-0001 combines two naming conventions (`*.test.ts`, `*.spec.ts`); no
  case combines anything.
- **Oracle strength** — M1 deletes the framework-identification step and the case stays green. The
  regular expression matches the front-matter description and the Goal line, and `testFileGlobs`
  in `config.ts` is unrelated to identification. Only deleting that unrelated text could fail it.
- `n/a`: **Boundary values** (no ordered domain in AC-0009-0001), **State transitions** (single
  step).

### TC-0009-0002 — Glob Patterns Cover Test Locations

Owns KF-A, KF-B and KF-F.

- **Equivalence partitions** — no explicit, broad, colocated or dedicated glob is supplied.
- **Error path** — none of KF-A, KF-B, KF-F is exercised; M2 and M10 delete the breadth ban and the
  exclude rule and the case stays green.
- **Edge cases** — src-colocated tests, which the skill says to include, are never supplied.
- **Boundary values** — 3 and 10 include globs are never exercised; M2 deletes the range and the
  case stays green although its title says it checks it.
- **Special values** — the default-exclusions-only case (no exclude glob added) is not supplied.
- **Combinatorial** — an exclude glob that removes an included location is never constructed.
- **Oracle strength** — M2 and M10 survive. The assertions pin the key name `testFileGlobs`, which
  appears throughout both files.
- `n/a`: **State transitions** (proposing globs is a single step).

### TC-0009-0003 — Config Update Is Minimal

Owns KF-A, KF-C and KF-G.

- **Equivalence partitions** — configs with and without `testFileGlobs`, and with other keys set,
  are never supplied.
- **Error path** — no diff touching another key (KF-G), no `specSections` change (KF-C) and no
  source write (KF-A) is exercised.
- **Edge cases** — a config with no `validation.traceability` block at all is not supplied.
- **Special values** — EX-0009-0004's absent `testFileGlobs` is never the starting state.
- **Combinatorial** — the `specSections` opt-in (BR-0009-0003, reached through AC-0009-0003) is never
  crossed with the glob update.
- `n/a`: **Boundary values** (no ordered domain), **State transitions** (one before-and-after).

### TC-0009-0004 — Steering Populated from Evidence

Owns KF-D.

- **Equivalence partitions** — verifiable and unverifiable fields are never supplied.
- **Error path** — KF-D, the `TBD` half of the case's own text, is not asserted even as a phrase; M4
  removes it and the case stays green.
- **Edge cases** — a steering file already accurate is untested.
- **Special values** — EX-0009-0003's version specifiers (`^3.0.0` to `vitest 3.x`, `>=22` to
  `Node.js >= 22`) and the `TBD` value are never produced.
- **State transitions** — REQ-0005 names populate and refresh; neither transition is observed.
- **Combinatorial** — four files crossed with evidence present or absent are never combined.
- `n/a`: **Boundary values** (no ordered domain).

### TC-0009-0005 — Evidence Sampling Produces Valid Matches

Owns KF-A, KF-B and KF-E.

- **Equivalence partitions** — no match set is supplied.
- **Error path** — KF-E is owned through AC-0009-0005 and never exercised; KF-A and KF-B, reached
  through EX-0009-0001, are not either.
- **Edge cases** — more than 15 available matches is untested.
- **Boundary values** — M5 replaces 5-15 with 1-2 and the case stays green; 5 and 15 are pinned by
  nothing.
- **Special values** — the empty match set is never supplied.
- `n/a`: **State transitions** (sampling is a single step), **Combinatorial** (AC-0009-0005 states one
  condition).

### TC-0009-0006 — Zero Match Triggers Stop

Owns KF-E.

- **Equivalence partitions** — no glob set with and without matches is supplied.
- **Normal path** — no `Type` is declared, so the row owes a normal case: with matches found, the
  skill proceeds. Nothing asserts it.
- **Error path** — `/stop.*escalat/i` matches the ambiguous-tooling stop in CRITICAL CONSTRAINTS,
  not the zero-match stop. M6 deletes the zero-match stop and the case stays green.
- **Edge cases** — one glob matching nothing among several that do match is untested.
- **Boundary values** — the edge between 0 and 1 match is never exercised.
- **Special values** — EX-0009-0002's `tests/**/*.spec.py` in a TypeScript-only project is never
  supplied.
- **State transitions** — the stop is a terminal state, and resuming after clarification is its exit;
  neither is reached.
- **Oracle strength** — M6 survives. Only deleting the unrelated ambiguity stop could fail the case.
- Beside the row, without a spec-0009 annotation: `tests/cli/doctor.test.ts` drives
  `traceability.testGlobs` to `error` for globs that match nothing, and to `ok` once they match;
  `tests/core/testFileGlobsConfiguration.test.ts` covers zero-match reporting; and
  `tests/assets/clarificationBudget.test.ts` and `tests/assets/askUserQuestionAutoMode.test.ts` pin
  the Step 5 text. Those files were not run for this matrix and are not scored here.
- `n/a`: **Combinatorial** (AC-0009-0005 states one condition).

### TC-0009-0007 — Tool Selection Rationale Exists

Owns KF-D through EX-0009-0003 (see Findings).

- **Equivalence partitions** — the five layers are never supplied as inputs.
- **Error path** — KF-D is not exercised or asserted on this row.
- **Edge cases** — one tool serving several layers is untested.
- **Special values** — a layer the project does not have is never recorded.
- `n/a`: **Boundary values** (no ordered domain), **State transitions** (recording is a single step),
  **Combinatorial** (AC-0009-0006 states one condition).

### TC-0009-0008 — Coverage Placeholder for AC-0009-0007

The case text reads "Verify that migrated traceability includes AC-0009-0007". The row's
obligation is AC-0009-0007, a documented minimum runnable path. Owns KF-A and KF-B.

- **Equivalence partitions** — projects with and without a server or database are never supplied.
- **Normal path** — the case reads type names in `config.ts`, which say nothing about a runnable
  path or about traceability.
- **Error path** — KF-A and KF-B are not exercised.
- **Edge cases** — a library with nothing to start is untested.
- **Special values** — a path with no database or environment step is never produced.
- **Combinatorial** — dev server, database and environment are never combined.
- **Oracle strength** — M8 deletes every runnable-path statement and the case stays green.
- `n/a`: **Boundary values** (no ordered domain), **State transitions** (single step).

### TC-0009-0009 — Coverage Placeholder for EX-0009-0005

The case text reads "Verify that migrated example EX-0009-0005 is covered by at least one test
case". EX-0009-0005 cites BR-0009-0003, the `specSections` opt-in, which is scored as the row's
behaviour. Owns KF-A and KF-C.

- **Equivalence partitions** — requested and unrequested runs are never supplied.
- **Normal path** — the case asserts the evidence-file requirement, unrelated to `specSections`.
- **Error path** — KF-C and KF-A are not exercised.
- **Edge cases** — a request for strict headings over specs whose headings differ is untested.
- **Special values** — the empty `specSections` list the skill keeps by default is never produced.
- **Combinatorial** — the opt-in is never crossed with the glob update of the same run.
- **Oracle strength** — M9 deletes the opt-in rule and the case stays green.
- `n/a`: **Boundary values** (no ordered domain), **State transitions** (single step).

### The ten ❌ cells of the business rule table

- **BR-0009-0001 × Negative case** — nothing supplies a test or source write and requires it to be
  refused. No case asserts even the "Do not modify tests or source code" constraint.
- **BR-0009-0002 × Positive case** — no case asserts the rule; M10 deletes it and the file stays
  green. The `testFileExcludeGlobs` key name in `config.ts` is not the rule.
- **BR-0009-0002 × Negative case** — no unnecessary exclude glob is supplied.
- **BR-0009-0002 × Conditional branches** — neither the necessary nor the unnecessary branch has a
  case.
- **BR-0009-0003 × Positive case** — the only covering case, TC-0009-0009's, asserts the evidence
  file; M9 survives.
- **BR-0009-0003 × Negative case** — no run without a request is checked for an unchanged
  `specSections`.
- **BR-0009-0003 × Conditional branches** — neither branch has a case.
- **BR-0009-0004 × Positive case** — the rule's content is the `TBD` written for unverifiable content;
  M4 removes every `TBD` clause and both covering cases stay green.
- **BR-0009-0005 × Positive case** — the covering case reads a different stop; M6 survives.
- **BR-0009-0005 × Conditional branches** — neither the zero-match branch nor the non-zero branch has
  a case among the covering test cases.

## Every ⚠️ cell, named

### Matrix

- **TC-0009-0001 × Normal path** — the case pins that the skill's goal is to analyse the repository,
  not the step that identifies frameworks, directories, naming conventions and package manager.
- **TC-0009-0002 × Normal path** — the case pins the key the globs are written into, not the rule
  that they cover all known test locations.
- **TC-0009-0003 × Oracle strength** — M3b rewords the success criterion and fails the case. M3a
  deletes "Keep all other config keys unchanged." and it stays green.
- **TC-0009-0004 × Oracle strength** — M4b deletes the "fill from verifiable evidence" bullet and
  fails the case. M4 deletes every `TBD` clause and it stays green.
- **TC-0009-0005 × Oracle strength** — M5b deletes the sample-listing lines and fails the case. M5
  changes the range to 1-2 and it stays green.
- **TC-0009-0007 × Oracle strength** — M7b deletes "chosen tools per layer" from the evidence list and
  fails the second case. M7a deletes the mandatory rationale check and both stay green, because
  the not-done line still matches.

### Business rule table

- **BR-0009-0001 × Positive case** — TC-0009-0003 pins the minimal-diff criterion, the config-scope
  half of "only config, steering and evidence are modified". The steering and evidence halves, and
  the prohibition itself, are not asserted.
- **BR-0009-0004 × Conditional branches** — the verifiable branch is pinned (M4b fails the case); the
  unverifiable branch is not (M4 survives).

## Findings

None of these is repaired here; this file scores coverage and edits no test, ledger or spec.

1. **`DR-0009-0002` does not exist.** Ledger row `TDD-0009` is `exception` citing it.
   `07_Decisions.md` declares one item, `DR-0009-0001`, scoped to `TDD-0001..0008`. Outside that
   ledger row and this file, the identifier appears nowhere in the repository.
2. **`DR-0009-0001`'s rationale is contradicted by measurement.** It records that `config.ts` and
   `SKILL.md` "cover all TC requirements". Ten of the fourteen obligation mutations above survive
   the file. The record decides how the rows were closed; it cannot carry any `❌` here.
3. **The test file's header miscounts.** It says "All 8 TDD items are Exception-pattern backfill
   (DR-0009-0001)", annotates nine test cases, and the ledger splits them across two records.
4. **TC-0009-0006 reads the wrong clause.** Its pattern matches the ambiguous-tooling stop; the
   zero-match stop it is named for can be deleted without failing it. Behavioural cases for the
   same condition exist in `tests/cli/doctor.test.ts`, without a spec-0009 annotation.
5. **TC-0009-0008 and TC-0009-0009 are placeholders with unrelated cases.** AC-0009-0007 (minimum
   runnable path) and BR-0009-0003 (`specSections` opt-in) have no real test case, and
   EX-0009-0005 states a coverage fact rather than an example of BR-0009-0003.
6. **Several `EX-Ref` links put obligations on unrelated rows.** TC-0009-0007 (tool selection) cites
   EX-0009-0003 (steering), which gives it KF-D. TC-0009-0005 and TC-0009-0008 cite EX-0009-0001
   (glob proposal). TC-0009-0009 cites AC-0009-0001 while BR-0009-0003 hangs off AC-0009-0003. The
   chain was scored as written.
7. **No test case declares a `Type`.** TC-0009-0006 is a failure scenario and is therefore read as
   owing a normal path. Declaring it `error` would move that obligation to TC-0009-0005.
8. **AC-0009-0005 leaves 1-4 matches unspecified.** It lists 5-15 and stops on zero.
9. **No story links to an acceptance criterion.** No chain reaches a story, so every story's `Error
path` is `n/a`. Linked to AC-0009-0005, US-0009-0004 would own the zero-match stop.
10. **No story has a test.** The five E2E rows `TDD-0010` … `TDD-0014` are `todo`, and
    `validate --profile atdd` reports all five stories under `QFAI-ATDD-119` as carrier-only.
11. **KF-A is not a safety-floor failure.** `BR-0009-0001` limits which files the skill may write. It
    is not validation at a trust boundary, error handling that prevents data loss, security or
    accessibility, and no code path handles it. It is kept because the rule declares it, so its ❌
    cells stand with the reasons given above, and no row of this pack is held by the safety floor.
12. **A case title claims more than it checks.** TC-0009-0002's "SKILL.md specifies 3-10 include
    globs requirement" asserts only that `SKILL.md` contains `testFileGlobs` (M2).

## Totals

Counted with a script over the mark cells only; `Status` is excluded.

- **Matrix** (14 rows × 9 category columns, 126 cells): **✅ 4 / ⚠️ 6 / ❌ 88**, and n/a 28
- **Business rule table** (5 rows × 3 scored columns, 15 cells): **✅ 0 / ⚠️ 2 / ❌ 10**, and n/a 3
- **Combined** (141 cells): **✅ 4 / ⚠️ 8 / ❌ 98**, and n/a 31
