# Coverage Depth Matrix — spec-0014

## Scope

This matrix scores fourteen obligations: the five user stories of `02_User-stories.md` —
`US-0014-0013`, `-0014`, `-0018`, `-0019` and `-0020` — and the nine test cases of
`06_Test-Cases.md` — `TC-0014-0009`, `-0018`, `-0019`, `-0028`, `-0029`, `-0033`, `-0034`, `-0035`
and `-0036`. Both obligation sets are read from their own file in full, not from the rows of
`.qfai/specs/spec-0014/tdd/test-list.md`. A `US-*` seeds no ledger row at all, and a `TC-*` whose
row had been dropped would be invisible to a reading that starts from the ledger.

All five user stories are active. A story deferred out of the slice carries an
`- x-qfai-status: planned` meta line inside its own `US-*` block; no block in `02_User-stories.md`
carries one, and the string occurs nowhere under `.qfai/specs/spec-0014/`.

Four of the nine test-case rows are `Level: unit` (`-0028`, `-0029`, `-0033`, `-0034`) and five are
`Level: integration`; the split matters and is stated under "Annotation coverage" below. The
business rule table carries all seven `BR-0014-*` headings of `04_Business-Rules.md` — `-0001` …
`-0006` and `-0025`. None carries a status retiring it, so all seven are active and all seven own a
row.

**Four obligations are undischarged, and in none of them is thin testing the whole reason.**
`TC-0014-0009` names behaviour that exists only as a shipped skill contract, which no test reads.
`TC-0014-0028` and `TC-0014-0029` name a slice that is absent from the product. `TC-0014-0033` names
a layout rule the product contradicts. Only the first can be repaired by writing a test.

- `TC-0014-0009` declares `AC-0014-0002` and `EX-0014-0002`: feed `/qfai-verify` a `REVISE` review
  artifact, and verify blocks completion. The behaviour exists. `/qfai-verify` is a shipped skill,
  and its SKILL.md requires the reviewer to return only `PASS` or `REVISE` and forbids DONE or
  handoff until every routed blocking reviewer returns `PASS`. No test reads those clauses, and no
  case anywhere feeds a `REVISE` artifact to anything. The two `describe` blocks named
  `TC-0014-0009` in `verifySemanticsSpec0014.test.ts` pass, and they test stale sidecar migration
  errors — a different subject with a different emission. See Findings 1.
- `TC-0014-0028` and `TC-0014-0029` declare `AC-0014-0004` and `EX-0014-0025`: a prototyping
  design-system compliance slice reading `designSystemCompliance` out of a legacy scoring artifact.
  Neither `PROT-DS01` nor `designSystemCompliance` occurs anywhere in `packages/qfai/src/**` or
  `packages/qfai/tests/**`. `01_Spec.md` REQ-0028 states the obligation conditionally — "`PROT-DS01`
  remains a validator for design-system compliance artifacts **when that slice exists**" — and the
  slice does not exist.
- `TC-0014-0033` declares `AC-0014-0005`, whose deciding clause is that the legacy `screenshots/` /
  `html/` directory layout "is no longer accepted as the active SSOT". The product requires that
  layout: `uiEvidenceArtifacts.ts` builds `screenshotRoot` as `<prototyping root>/screenshots` and
  checks it before it scans for an `iter-NN` file, `validate.ts` documents that path as the required
  location of screenshot evidence, and `prototypingIterate.ts` mirrors every accepted iteration into
  `screenshots/` and `html/` so the first lookup finds something. Two passing cases in
  `uiEvidenceArtifacts.test.ts` require a project carrying only the legacy layout to produce zero
  issues. See Findings 4.

`TC-0014-0009`, `TC-0014-0028` and `TC-0014-0029` carry 27 of the matrix's 65 `❌` depth cells
between them.

The rest of the pack ranges widely. `TC-0014-0036` is the strongest work here: sixteen passing cases
drive the scope-upgrade re-gating end to end with five distinct refusal causes, and two more seal
the scope-limited certificate. `US-0014-0020` names the same subject, and no case that runs is bound
to it, so its row is capped in every column — see "Crediting a user-story row". `US-0014-0014` is
enforced by a strong suite that no live chain binds to it.
`TC-0014-0018`, `TC-0014-0019`, `US-0014-0013` and `TC-0014-0035` are narrow, `TC-0014-0034` is a
single well-oracled case with no boundary or error direction, and `US-0014-0018` has one incidental
gate and no case on the claim that distinguishes it.

Section "Every `❌` cell, named" enumerates all 79 of them — 70 scored, 9 in the non-scored `Status`
columns — so that "one justification per `❌`" is checkable rather than asserted, and section
"Every `⚠️` cell, named" does the same for all 73 partial scores, 61 of which are scored cells the
PASS criterion also requires a rationale for.

## What was measured, and how

Every score below rests on a test run, not on a reading of a ledger. The ledger is a usable starting
point for this pack — all seven `done` rows name a file that exists on disk — but three of its rows
point somewhere the obligation is not discharged, and six of the files that carry coverage appear
in no row at all. The files below were located by reading the tests and the source, then executed:

| File                                                                      | Result        |
| ------------------------------------------------------------------------- | ------------- |
| `tests/integration/verifySemanticsSpec0014.test.ts`                       | 5 passed      |
| `tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts`   | 2 passed      |
| `tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts`  | 16 passed     |
| `tests/cli/commands/prototypingIterate.test.ts`                           | 103 passed    |
| `tests/cli/prototypingCertify.test.ts`                                    | 40 passed     |
| `tests/validators/uiEvidenceArtifacts.test.ts`                            | 7 passed      |
| `tests/core/prototyping/iterationPaths.test.ts`                           | 8 passed      |
| `tests/core/renderEvidence.test.ts`                                       | 28 passed     |
| `tests/integration/reviewArtifactsProfileWiring.test.ts`                  | 4 passed      |
| `tests/integration/validatorConvergenceIntegration.test.ts`               | 7 passed      |
| `tests/integration/specAutoDiscovery.test.ts`                             | 38 passed     |
| `tests/integration/spec0014SaasPackageCertify.test.ts`                    | 2 **skipped** |
| `tests/e2e/spec0014SaasPackageCertifyE2E.test.ts`                         | 2 **skipped** |

Six of those files carry no ledger row and are scored anyway, because the obligation is read from
`06_Test-Cases.md` and `02_User-stories.md`: `uiEvidenceArtifacts.test.ts` and `iterationPaths.test.ts`
hold the reader-side coverage for `TC-0014-0033`, `prototypingCertify.test.ts` holds the
`reviewerGate` refusal that `BR-0014-0002` is scored against, `renderEvidence.test.ts` is the suite
that enforces `US-0014-0014`'s subject, `reviewArtifactsProfileWiring.test.ts` is the only file
that drives a verify-profile validate run, and `validatorConvergenceIntegration.test.ts` holds the
repeat-run determinism case that `BR-0014-0003`'s positive direction is scored against. That case
is collected and passes: the file runs 7 of 7 with nothing skipped.

Five negative results are load-bearing and were checked directly rather than inferred:

1. **`packages/qfai/tests/validators/prototypingDesignSystem.test.ts` does not exist.** Both
   exception rows, `TDD-0028` and `TDD-0029`, name it as their `Test file`.
2. **`PROT-DS01` and `designSystemCompliance` occur nowhere in `packages/qfai/src/**` or
   `packages/qfai/tests/**`.** The identifiers appear only in spec prose, and `spec-0012`'s own
   `09_delta.md` records the `designSystemCompliance` slice as purged.
3. **No CLI surface blocks on a `REVISE` verdict in a verify path; the gate `AC-0014-0002` names is
   a skill contract.** The token appears in three source files.
   `gitignore.ts` and `tddList.ts` are the TDD ledger's own reviewer-verdict handling.
   `renderCritique.ts` requires an evidence file to carry a `verdict: (PASS|REVISE)` field, and a
   `REVISE` satisfies that presence check exactly as a `PASS` does. The one command that refuses is
   `prototypingCertify.ts`, which exits non-zero unless `prototyping.json#reviewerGate.result ===
   "PASS"` — a different command reading a different artifact from the one `AC-0014-0002` names. The
   gate the criterion is about is stated in the shipped `/qfai-verify` skill instead; see Findings 1.
4. **No test in `packages/qfai/tests/**` reads the `/qfai-verify` reviewer-gate clauses.** The
   shipped copy under `packages/qfai/assets/init/` and the installed copy under `.qfai/assistant/`
   carry them at the same two lines. The tests that do assert a reviewer gate over a skill file —
   `skillRoster.test.ts`, `implementationReviewerBlocking.test.ts`,
   `finalChecklistGateParity.test.ts` — assert `qfai-implement`'s.
5. **`saas-package`, `SaaS` and `--upgrade-scope` do not occur in `/qfai-prototyping` SKILL.md.**
   `BR-0014-0025`'s fourth clause requires the delivery mode to be documented there.

### Annotation coverage

The repository's ATDD scan reads two files and no tests. `.qfai/report/atdd-traceability/summary.json`
records `scan.matchedFileCount: 2`, and both matches are annotation carriers —
`tests/integration/qfai-traceability.md` and `tests/e2e/qfai-traceability.md` — under the repo-root
`tests/` tree, while the package's real suite lives at `packages/qfai/tests/**` and is not scanned
at all. Every integration obligation in this pack is therefore reported `coveredByCarrierOnly`:
`TC-0014-0009`, `-0018`, `-0019`, `-0035`, `-0036`, and all five `US-0014-*`. This is a repo-wide
condition that no work inside this pack can clear, and it is stated once here rather than repeated
per row. It caps the `Status` of every row it names — the five integration test-case rows and all
five user-story rows — at `⚠️`, exactly as it did for spec-0002. Two of those rows sit below the cap
on their own merits, and the reasons are given per row.

It does **not** cap the four unit rows. `catalog/test-layers.md` places the ATDD annotation
obligation on L3 only, and the summary agrees: `TC-0014-0028`, `-0029`, `-0033` and `-0034` sit
under `excludedUnitComponentTc`, not under `missing`. Their scores below reflect their tests, and
no cell is marked down for a missing annotation they do not owe.

### Skipped tests

`QFAI-TEST-003` reports 16 skipped tests in the recorded validate run. Two of the 16 sit in files
that carry a spec-0014 annotation, and each is a `describe.skip` covering two `it` cases — four
skipped cases in all:

| File                                                   | Annotations                   | Cases |
| ------------------------------------------------------ | ----------------------------- | ----- |
| `tests/integration/spec0014SaasPackageCertify.test.ts` | `TC-0014-0035`, `TC-0014-0036` | 2     |
| `tests/e2e/spec0014SaasPackageCertifyE2E.test.ts`      | `US-0014-0020`                 | 2     |

**No cell in this matrix is credited to a skipped case.** Both files were authored red, ahead of the
implementation, and the two test-case obligations were superseded by live suites that were never
removed: `TC-0014-0035` is discharged by two passing cases in
`prototypingCertify.saasPackage.test.ts`, and `TC-0014-0036` by sixteen in
`prototypingCertify.upgradeScope.test.ts`.

`US-0014-0020` is not in that position. `spec0014SaasPackageCertifyE2E.test.ts` holds the only
`US-0014-0020` annotation in the package, and a direct run of the file collects 2 cases and runs
none. The two live suites carry `TC-0014-0035` and `TC-0014-0036`, not the story's annotation, so
the story has no case bound to it that runs. See "Crediting a user-story row" below, and Findings 5.

### Crediting a user-story row

A cell is credited only to a case that runs and that the pack binds to the row's story. The two
halves rule out different things.

- A skipped case is not coverage, whatever it asserts.
- A test case's coverage is not its story's. An annotation naming `TC-0014-0035` binds a case to that
  test-case row, not to `US-0014-0020`.

The live pack records no `US-*` → `AC-*` link for any of the five stories — the only `US-*` chains
written down anywhere are the stale ones in `09_delta.md`, which give those identifiers a different
subject (Findings 6). Every story row is therefore bound to its cases by subject: by the criterion
the story's wording matches, or by the cascade that introduced the story and the test cases
together. The cap `US-0014-0014` already carried applies to all five. A case the pack does not bind
to the story can hold a cell at `⚠️`; no cell reaches `✅`.

| Story        | Cases credited                                                                 | Carrying the story's annotation |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------- |
| US-0014-0013 | 3 in `verifySemanticsSpec0014.test.ts`                                         | none                            |
| US-0014-0014 | 28 in `renderEvidence.test.ts`                                                 | none                            |
| US-0014-0018 | 4 in `reviewArtifactsProfileWiring.test.ts`                                    | none                            |
| US-0014-0019 | 1 in `verifySemanticsSpec0014.test.ts`                                         | none                            |
| US-0014-0020 | 18 across `prototypingCertify.saasPackage.test.ts` and `…upgradeScope.test.ts` | 2, both skipped                 |

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0014-0013 | ⚠️                     | ⚠️          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| US-0014-0014 | ⚠️                     | ⚠️          | ⚠️         | ⚠️         | ⚠️              | ⚠️             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| US-0014-0018 | ⚠️                     | ❌          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0014-0019 | ❌                     | ⚠️          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| US-0014-0020 | ⚠️                     | ⚠️          | ⚠️         | ⚠️         | ⚠️              | ⚠️             | ⚠️                | ⚠️            | ⚠️              | ⚠️     |
| TC-0014-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0018 | ⚠️                     | ⚠️          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0019 | ❌                     | ⚠️          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0028 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0029 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0033 | ⚠️                     | ⚠️          | ⚠️         | ⚠️         | ⚠️              | ⚠️             | ⚠️                | ⚠️            | ⚠️              | ❌     |
| TC-0014-0034 | ⚠️                     | ✅          | ❌         | ⚠️         | ❌              | ❌             | ✅                | ⚠️            | ✅              | ⚠️     |
| TC-0014-0035 | ⚠️                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0036 | ✅                     | ⚠️          | ✅         | ✅         | ⚠️              | ⚠️             | ✅                | ✅            | ⚠️              | ⚠️     |

14 rows × the 9 depth columns = **126 scored cells: ✅ 8 / ⚠️ 53 / ❌ 65**.

`Status` is the row verdict, not a mark, so it is outside the scored population. For reference, its
14 cells read **✅ 0 / ⚠️ 9 / ❌ 5**.

No user-story row carries a `✅` in any column, because no case that runs is bound to any of the
five stories; the crediting rule is stated above and the evidence behind each capped cell is named
in "Every `⚠️` cell, named".

No row reaches `Status = ✅`. The five integration test-case rows and all five user-story rows are
capped by the carrier-only condition described above. The four unit rows are not capped by it;
`TC-0014-0034` is held at `⚠️` on its own merits, `TC-0014-0033` is `❌` because the clause that
decides its criterion is contradicted by the product, and `TC-0014-0028` and `TC-0014-0029` have no
test.

### Business rule coverage

One row per active `BR-0014-*`. All seven headings in `04_Business-Rules.md` are active, so none is
omitted. `Covering TC` is derived from each rule's `AC-Refs` and from the `BR-Ref` of the examples
the test cases cite, not from the rule's number.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                  | Status |
| ------------ | ------------- | ------------- | -------------------- | ---------------------------- | ------ |
| BR-0014-0001 | ❌            | ❌            | n/a                  | TC-0014-0018                 | ❌     |
| BR-0014-0002 | ⚠️            | ⚠️            | n/a                  | TC-0014-0009                 | ❌     |
| BR-0014-0003 | ⚠️            | ❌            | n/a                  | TC-0014-0018, TC-0014-0019   | ❌     |
| BR-0014-0004 | ❌            | ❌            | ⚠️                   | TC-0014-0028, TC-0014-0029   | ❌     |
| BR-0014-0005 | ✅            | ✅            | ⚠️                   | TC-0014-0033                 | ⚠️     |
| BR-0014-0006 | ✅            | ⚠️            | ⚠️                   | TC-0014-0034                 | ⚠️     |
| BR-0014-0025 | ⚠️            | ✅            | ✅                   | TC-0014-0035, TC-0014-0036   | ⚠️     |

7 rows × the 3 scored columns — `Positive case`, `Negative case`, `Conditional branches` — =
**21 scored cells: ✅ 5 / ⚠️ 8 / ❌ 5, with `n/a` 3**. `Covering TC` holds identifiers and `Status`
holds the row verdict, so neither is scored; the 7 `Status` cells read **✅ 0 / ⚠️ 3 / ❌ 4**.

`n/a` is used three times, for `BR-0014-0001`, `-0002` and `-0003`, each of which states its rule
unconditionally — "always full-scan", "is part of the completion gate", "remains the source" — so
there is no branch to cover. It is not used anywhere an obligation exists and is unmet.

### Both tables together

The scored population is 147 cells: 126 matrix depth cells plus 21 business rule cells.

| Mark | Matrix depth | Business rule | Scored total |
| ---- | ------------ | ------------- | ------------ |
| ✅   | 9            | 5             | 14           |
| ⚠️   | 52           | 8             | 60           |
| ❌   | 65           | 5             | 70           |
| n/a  | 0            | 3             | 3            |
| Sum  | 126          | 21            | 147          |

## Every ❌ cell, named

The matrix carries 65 `❌` depth cells plus 5 in `Status`; the business rule table carries 5 in its
scored columns plus 4 in its `Status` column — 79 in all, of which 70 are scored. Each is named
below with its own reason. A row's `Status` is `❌` when the obligation is not discharged at the
depth the row describes; that verdict is stated once per row and is not repeated per cell.

### US-0014-0013 — verify to use the canonical validator path

The live pack records no chain from this story, so the matrix reads it against `AC-0014-0003`, the
criterion its wording matches, and against the two test cases that cite that criterion. Its whole
coverage is those rows' three passing cases in `verifySemanticsSpec0014.test.ts`, every one
annotated `TC-0014-0018` or `TC-0014-0019` rather than the story. Nothing else in the suite
addresses it, and no cell reaches `✅`. This row has **five `❌` depth cells** and no `❌` in
`Status`.

- **Edge cases** — the one case that builds a fixture seeds exactly one discussion pack, and the two
  source reads cover three `src/` files between them. A repo root with no discussion directory, with
  an empty one, and with two packs where the older must be ignored are untested, and a legacy
  namespace re-entering through a re-export in `src/index.ts`, through a retained `dist/` artifact,
  or through a path listed in `package.json#files` is invisible to a read of three named files.
- **Boundary values** — the story's one ordered domain is the pack timestamp that decides "latest",
  and no case exercises it at any edge. Its other half has no ordered domain at all: a namespace is
  present or it is not, with no edge between.
- **Special values** — no empty, absent or unreadable `01_Context.md` is supplied, and no empty or
  truncated source file is constructed. Every fixture writes a well-formed context file with an
  explicit surface.
- **State transitions** — reaching a validator from an entrypoint is a single step, and no
  removal-to-return progression of a compatibility namespace is observed.
- **Combinatorial** — the story's two halves are never crossed. The source-text read, the
  reach-through run and the package-surface read share no fixture, and no input violates two
  predicates at once.

### US-0014-0014 — truthful evidence and placeholder rejection to remain enforced

The live pack declares no `AC-*`, `BR-*`, `EX-*` or `TC-*` for this story. The one chain written for
the identifier sits in `09_delta.md`, states its earlier subject, and names four ids the pack no
longer carries; see Findings 6. The suite that enforces the story's current subject is
`packages/qfai/tests/core/renderEvidence.test.ts`, 28 passing cases over
`core/uiux/renderEvidence.ts`: a bundle claiming `captured` must carry real file paths rather than a
data URI, inline HTML or an oversized single-line blob, and a top-level status must agree with the
per-screen statuses. Because the pack binds those cases to no criterion of this story, no cell in
the row reaches `✅` — a reader has no artifact saying which enforcement the story means. This row
has **one `❌` depth cell** and no `❌` in `Status`.

- **State transitions** — `runRenderCapture` produces all three terminal statuses under three
  conditions, and each is required to carry its evidence or its reason: a real capture yields
  `captured` with files on disk, an unavailable adapter yields `skipped` with a reason, and a
  throwing adapter yields `failed` with a reason. No progression between statuses is observed —
  nothing re-runs a capture over a bundle that already records `skipped` and requires the stored
  state to move — and no invalid transition is attempted and rejected.

### US-0014-0018 — verify to depend on contract-first validate gates

The live pack declares no `AC-*`, `BR-*`, `EX-*` or `TC-*` for this story either, and the one chain
`09_delta.md` writes for the identifier belongs to its earlier subject; see Findings 6. The same
file records the architecture decision as `AD-0014-0007`, with `AD-0014-0008` retaining
`runCanonicalUixValidators` for direct discussion-pack validation only. The story's coverage is
`reviewArtifactsProfileWiring.test.ts`, whose four passing cases drive `validateProject` under
`profile: "verify"` over a project root and require one contract-first gate to report there and not
under the partial `tdd` profile. None carries an annotation, so no cell reaches `✅`. This row has
**six `❌` depth cells** and `Status = ❌`.

- **Normal path** — the story's own direction is a verify run whose completion decision comes from
  specs and contracts. Every case in the covering file seeds a review pack whose `summary.json` is
  not JSON, so the only direction exercised is a failing one. No case requires a well-formed project
  to pass the verify profile clean.
- **Edge cases** — a project with contracts and no discussion pack, and a project with a discussion
  pack and no contracts, are the two states that separate the two architectures. Neither is
  constructed.
- **Boundary values** — the story has no numeric, date, length or ordered domain, and no gate count
  or profile size is measured at any edge.
- **Special values** — no empty, absent or malformed `.qfai/contracts/` tree is supplied to a
  verify-profile run.
- **State transitions** — nothing observes downstream completion, so the pass-to-non-pass
  progression the story's "so that" clause is about has no case.
- **Combinatorial** — the profile is never crossed with the artifact source. No run pairs a
  contracts-bearing root with a discussion pack present and states which one drives the result.
- **Status** — one contract-first gate is reached through the verify profile, and the half that
  distinguishes the story has no case: nothing establishes that verify does not depend on a
  discussion-pack runner, and the one case in the pack that drives `runCanonicalUixValidators`
  drives it over a seeded discussion pack, which is the direct-pack path `AD-0014-0008` retains.
  Downstream completion is observed nowhere.

### US-0014-0019 — legacy compatibility namespaces to remain removed

The live pack records no chain from this story, so the matrix reads it against `AC-0014-0003` and
the one test case that cites it: a single passing case reading `src/core/validators/index.ts` and
`src/core/types.ts`, annotated `TC-0014-0019` rather than the story. The story adds a consequence
clause — verify guidance matching the actual package surface — that no case reads. No cell reaches
`✅`. This row has **six `❌` depth cells** and no `❌` in `Status`.

- **Equivalence partitions** — the tree is read as it stands and no input is constructed, so the
  compliant and violating partitions of the package surface are not represented as inputs. The case
  observes one state of one artifact rather than classifying two.
- **Edge cases** — the case's own text names the package surface, and the assertions read two `src/`
  files. A legacy namespace re-entering through a re-export in `src/index.ts`, through a retained
  `dist/` artifact, or through a path listed in `package.json#files` is invisible to it, and no case
  reads verify's own guidance text at all.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain; a namespace
  is present or it is not, with no edge between, and the `IssueCategory` member count is pinned by
  enumeration rather than counted.
- **Special values** — no empty, truncated or absent source file is constructed. An absent file
  would throw out of `readFile` rather than pass, which is a guard, not a supplied special value.
- **State transitions** — reading a source surface has no state machine, and no removal-to-return
  progression is observed.
- **Combinatorial** — the two files and the four predicates are asserted independently and never
  crossed; no input violates two at once, and the guidance half is never crossed with the surface
  half.

### US-0014-0020 — saas-package certify scope seal and upgrade path

The pack introduced this story, `AC-0014-0022` and `TC-0014-0035` / `TC-0014-0036` in one cascade
under `REQ-0166`, and its coverage is 18 passing cases across
`prototypingCertify.saasPackage.test.ts` and `prototypingCertify.upgradeScope.test.ts`. All 18 are
annotated to the two test cases. The only case bound to the story is in
`spec0014SaasPackageCertifyE2E.test.ts` and does not run, so no cell reaches `✅` however wide the
subject coverage is. This row has **no `❌` cell** in any column; all nine depth cells and its
`Status` are `⚠️` and are stated below.

### TC-0014-0009 — REVISE review artifact blocks completion

`Status = done` in the ledger under `DR-0014-0001`, naming
`tests/integration/verifySemanticsSpec0014.test.ts` with the bare TC id as its `Selector`. The
selector resolves, because two `describe` names begin with that string. Neither resolved case is
about this obligation: they assert that a legacy strategy-style filename and legacy evaluation
content are rejected with exploration-first migration guidance, which is a different subject with a
different emission. Resolution is not discharge.

The gate the obligation names exists, in `/qfai-verify`'s SKILL.md, and no test reads it. Nothing
feeds a `REVISE` review artifact to anything. Every cell is `❌`, and each is named so the count is
checkable:

- **Equivalence partitions** — the `PASS` and `REVISE` partitions of a reviewer verdict are
  represented by no case. `validateReviewArtifacts` does run under the verify profile and does read
  reviewer status, but in a review pack's `PASS|FAIL|NA` roster vocabulary, so no case feeds a
  `REVISE` to it either.
- **Normal path** — the case's own direction is a block produced from a `REVISE` artifact. Nothing
  produces one, and no case reads the skill clause that states the block. The two passing cases
  annotated to this row address the migration-error subject instead.
- **Error path** — the block _is_ the error direction, and it is never exercised.
- **Edge cases** — a review artifact with no verdict field, one carrying both verdicts, and one
  whose verdict is a third value are all untested.
- **Boundary values** — the verdict domain has exactly two members and no ordered or numeric
  dimension; no count of blocking reviewers is exercised, because no reviewer roster is read against
  this obligation.
- **Special values** — no empty, absent or malformed review artifact is supplied.
- **State transitions** — a `REVISE`-to-`PASS` progression across review rounds is the clearest
  state obligation this row has, and no case observes any transition.
- **Combinatorial** — the reviewer verdict is never crossed with validate's result, with scan scope,
  or with anything else.
- **Oracle strength** — the obligation does have a surface a mutation could redden. Deleting "Do not
  declare DONE or handoff until all routed blocking reviewers return `PASS`" from
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md`, the copy `qfai init`
  writes into a consuming project, changes the gate for every adopter. No case reads that file, so
  there is nothing for the mutation to redden. The nearest executable gate,
  `prototypingCertify.ts`'s `reviewerGate.result !== "PASS"` refusal, belongs to a different command
  and a different artifact, and is scored under `BR-0014-0002` rather than here.
- **Status** — the obligation is undischarged by testing. The behaviour it names is carried by the
  shipped skill's reviewer gate, no test in `packages/qfai/tests/**` reads those clauses, and no
  case anywhere feeds a `REVISE` artifact. See Findings 1.

### TC-0014-0018 — full-scan verify depends on canonical validate groups

`Status = done` under `DR-0014-0001`. Two passing cases. The first reads `src/core/validate.ts` and
asserts it contains `runCanonicalUixValidators` and `from "./validators/index.js"` and matches
neither legacy aggregator name. The second seeds a temp repo root with one discussion pack carrying
the forbidden legacy sidecar `12_design_system.md`, runs `runCanonicalUixValidators`, and requires
`UIX-VAL-3LAYER-FORBIDDEN-FILE` to be present. This row has **five `❌` depth cells** and no `❌` in
`Status`.

- **Edge cases** — the second case's own title says the validator "reaches the latest pack from a
  repo root", and the fixture seeds exactly one pack, so any selection rule at all passes it. A repo
  root with no discussion directory, with an empty one, and with two packs where the older must be
  ignored are all untested.
- **Boundary values** — the obligation's one ordered domain is the pack timestamp that decides
  "latest", and no case exercises it at any edge. `AC-0014-0001`'s full-scan posture has no numeric
  or ordered dimension under test either, because no scan scope is ever measured.
- **Special values** — no empty, absent or unreadable `01_Context.md` is supplied; every fixture
  writes a well-formed context file with an explicit surface.
- **State transitions** — reaching a validator from an entrypoint is a single step; no transition
  exists to cover, and none is established.
- **Combinatorial** — `EX-0014-0001` crosses two conditions, a UI-bearing repo and a validate error,
  and requires a third state, verify remaining non-pass. No case constructs the pair, and nothing
  observes the third state. The two cases in the row are never combined either: the source-text
  check and the reach-through run share no fixture.

### TC-0014-0019 — removed compatibility namespace does not reappear

`Status = done` under `DR-0014-0001`. One passing case, reading `src/core/validators/index.ts` and
`src/core/types.ts` and requiring that neither contains `validators/legacy`,
`runLegacyUixCompatibilityValidators` or `"compatibility"`, and that `IssueCategory` is the exact
two-member union. This row has **six `❌` depth cells** and no `❌` in `Status`.

- **Equivalence partitions** — the tree is read as it stands and no input is constructed, so the
  compliant and violating partitions of the package surface are not represented as inputs. The case
  observes one state of one artifact rather than classifying two.
- **Edge cases** — the case's own text names the "package surface", and the assertions read two
  `src/` files. A legacy namespace re-entering through a re-export in `src/index.ts`, through a
  retained `dist/` artifact, or through a path listed in `package.json#files` is invisible to it.
- **Boundary values** — the obligation has no numeric, date, length or ordered domain; a namespace
  is present or it is not, with no edge between, and the `IssueCategory` member count is pinned by
  enumeration rather than counted.
- **Special values** — no empty, truncated or absent source file is constructed. An absent file
  would throw out of `readFile` rather than pass, which is a guard, not a supplied special value.
- **State transitions** — reading a source surface has no state machine, and no removal-to-return
  progression is observed.
- **Combinatorial** — the two files and the four predicates are asserted independently and never
  crossed; no input violates two at once, and the `validators/index.ts` and `types.ts` conditions
  are never evaluated together against a single planted change.

### TC-0014-0028 — prototyping design-system compliance happy path

`Status = exception` citing `DR-0014-0002`, with `packages/qfai/tests/validators/prototypingDesignSystem.test.ts`
as its `Test file`. **That file does not exist.** `PROT-DS01`, the `Selector`'s subject, occurs
nowhere in `packages/qfai/src/**` or `packages/qfai/tests/**`, and neither does
`designSystemCompliance`, the field `EX-0014-0025` is written around.

Two `describe` blocks in `tests/integration/specAutoDiscovery.test.ts` are named for this TC and its
sibling. They pass, and neither is about the obligation: this one asserts that `validateProject` is
importable and `typeof` it is `"function"`. Every cell is `❌`, and each is named so the count is
checkable:

- **Equivalence partitions** — no design-system scoring artifact is fed to anything, so the valid,
  invalid and legacy partitions `EX-0014-0025` implies are all unrepresented.
- **Normal path** — the case's own direction is a compliance slice running on a present artifact and
  reading only artifact vocabulary. Nothing runs. An `import` succeeding and a `typeof` check are
  not statements about that direction, so unlike a wording check they do not even address it.
- **Error path** — no case supplies an artifact the slice cannot read.
- **Edge cases** — an artifact present but empty, and one carrying `designSystemCompliance` under an
  unexpected nesting, are both untested.
- **Boundary values** — `08_Open-questions.md` records the score's domain as `[0, 100]`. No case
  exercises 0, 100, or a value outside the range, because no score is produced or read.
- **Special values** — no null, absent or non-numeric compliance value is supplied.
- **State transitions** — a single compliance evaluation has no state machine, and none is
  established.
- **Combinatorial** — the slice's presence is never crossed with the artifact's presence, which is
  the one condition `REQ-0028` states.
- **Oracle strength** — `expect(typeof validateProject).toBe("function")` stays green under every
  possible implementation of design-system compliance, including its complete absence, which is the
  current state.
- **Status** — the obligation's premise, that the slice exists, is false, and its cited decision
  record does not govern it. `DR-0014-0002` reads "removed compatibility surfaces remain removed",
  which is `TC-0014-0019`'s subject. `DR-0014-0003` — "legacy validator slices may persist as
  artifact-specific checks without reintroducing a public prototyping runtime" — is the record this
  row's subject matches, and it is not the one cited. See Findings 2.

### TC-0014-0029 — prototyping design-system compliance failure path

Identical recorded state: `exception`, `DR-0014-0002`, the same non-existent `Test file`, the
selector `PROT-DS01 failure path`. The `describe` named for it in `specAutoDiscovery.test.ts` reads
the integration test directory and asserts it holds at least five `.test.ts` files, one of which is
the file the assertion is written in.

- **Equivalence partitions** — no artifact is classified as compliant or failing, because nothing
  classifies one.
- **Normal path** — the row's direction is a failure that stays scoped to validator semantics, and
  no failure is produced.
- **Error path** — this row's entire subject is the error direction, and it is never exercised.
- **Edge cases** — a failure whose message leaks a CLI entrypoint name, which is the specific
  scoping risk `AC-0014-0004` names, is untested.
- **Boundary values** — no score, count or threshold is exercised at an edge, because none is
  produced.
- **Special values** — no empty, null or malformed scoring artifact is supplied.
- **State transitions** — no compliant-to-failing progression is observed.
- **Combinatorial** — the failure condition is never crossed with anything.
- **Oracle strength** — the assertion is self-satisfying: the file it counts is one of the files
  being counted, so the threshold of five could only fail by deleting four sibling files. No
  production mutation of any kind reddens it.
- **Status** — undischarged, under a decision record whose text addresses a different subject.

### TC-0014-0033 — iter-NN evidence path layout

`Status = done` under `DR-0014-0001`. Three files carry work on it: the writer side in
`prototypingIterate.test.ts`, the reader side in `uiEvidenceArtifacts.test.ts`, and the path helpers
in `iterationPaths.test.ts`. This row has **no `❌` depth cell**; every depth cell is `⚠️`, and the
reason each stops short of `✅` is the same one that puts its `Status` at `❌`.

- **Status** — the obligation has two halves and only one of them is coverable. `AC-0014-0005`
  states that the active layout is `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html,
  review.json}` **and** that the legacy `screenshots/` / `html/` layout "is no longer accepted as
  the active SSOT"; the row's `Expected` compresses both into iter-NN "only". The first half is
  covered. The second is contradicted by the product: `validateUiEvidenceArtifacts` builds
  `screenshotRoot` as `<prototyping root>/screenshots` and `htmlRoot` as `<prototyping root>/html`,
  tests those paths before it scans for an `iter-NN` file, reports the legacy path as the issue's
  location, and names it first in the operator guidance; `validate.ts` documents
  `.qfai/evidence/prototyping/screenshots/<screen-id>.png` as the required location; and
  `mirrorAcceptedIterToAggregateDirs` in `prototypingIterate.ts` copies every accepted iteration
  into both directories, so the first lookup finds something. Two passing cases in
  `uiEvidenceArtifacts.test.ts` require a project carrying only the legacy layout to produce zero
  issues, so a test that discharged the second half would have to redden them. See Findings 4.

### TC-0014-0034 — full-harness block drop on cycle 0

`Status = done` under `DR-0014-0001`. Discharged by
`it("re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0")`
in `prototypingIterate.test.ts`, with the five sibling cases in the same `describe` as its context.
This row has **three `❌` depth cells** and no `❌` in `Status`.

- **Error path** — the rule is a deletion, and its error direction is a cycle-0 run that cannot
  rewrite `prototyping.json`. No case supplies an unparseable or unwritable `prototyping.json` at
  cycle 0 and requires the stale `fullHarness` to be reported rather than silently retained. The
  file's malformed-input cases (`rejects corrupt iterations history`, `returns 0 instead of throwing
  when the latest prior iter is malformed`) all sit at cycle ≥ 1, where the reset does not run.
- **Boundary values** — the one ordered domain the rule has is the cycle index, and the rule applies
  at exactly one value of it. The neighbouring value is never supplied: no case runs cycle 1 against
  a `prototyping.json` carrying `fullHarness` and requires the block to survive. `delete
  body.fullHarness` could be hoisted out of the cycle-0 guard and every case in the file would stay
  green.
- **Special values** — the fixture always writes `fullHarness` as a populated object with three
  keys. A `null`, an empty object, a scalar and an array are the values a delete-on-reset most needs
  to be indifferent to, and none is supplied.

### TC-0014-0035 — saas-package certify scope seal

`Status = done` under `DR-0014-0004`. Discharged by two passing cases in
`prototypingCertify.saasPackage.test.ts`: `--scope saas-package` seals with the scope marker and a
`notes` array covering every member of `SAAS_PACKAGE_SKIPPED_GATES`, and the default invocation
leaves both markers undefined. This row has **six `❌` depth cells** and no `❌` in `Status`.

- **Error path** — both cases seed the same happy-path fixture. No case runs `--scope saas-package`
  against a project whose certify prerequisites fail — a non-`PASS` `reviewerGate`, a `validate.json`
  with a non-zero error count, a missing `DESIGN.md` — and requires a refusal. The technique is
  available two files away: `prototypingCertify.scopePrototyping.test.ts` refuses four distinct
  scope values with exit 2 and asserts the scope is named on stderr. It is applied to
  `verify.json#scope` and not to the `--scope` flag this row is about.
- **Edge cases** — re-sealing over an existing certificate under `--scope saas-package`, a project
  with no skipped gates, and an empty `SAAS_PACKAGE_SKIPPED_GATES` are all untested.
- **Boundary values** — the only count in the obligation is the length of `notes`, asserted with
  `toBeGreaterThan(0)`. The exact count is never pinned, and the empty-`notes` boundary the rule
  forbids is never produced by any input, so the `MUST` that `notes` be non-empty is verified only
  against a fixture that could not have emptied it.
- **Special values** — no empty, null or absent gate list is supplied. `expect(cert.notes).toBeUndefined()`
  in the default case is an assertion about output, not a special value fed to the command.
- **State transitions** — sealing is a single step here. The scope-limited-to-full transition is
  `TC-0014-0036`'s subject and no case in this row observes any transition, including the
  seal-then-reseal path the command permits.
- **Combinatorial** — `--scope` is never crossed with `--check`, with an already-sealed certificate,
  with a failing prerequisite, or with a non-default config. Each of those crosses exists in sibling
  files for other flags and none is constructed for this one.

### TC-0014-0036 — upgrade-scope gating

`Status = done` under `DR-0014-0004`. Discharged by 16 passing cases in
`prototypingCertify.upgradeScope.test.ts`. This row has **no `❌` cell** in any column. Its three
`⚠️` depth cells and its `⚠️` `Status` are stated below.

### The five ❌ cells of the business rule table

- **BR-0014-0001 × Positive case** — the rule states that verify is always full-scan. Nothing
  measures the scope of any run. The covering case reads `validate.ts` for an identifier and drives
  `runCanonicalUixValidators` over a single seeded pack; neither observes how much was scanned, so
  the rule's own property has no positive case at all.
- **BR-0014-0001 × Negative case** — the negative is a diff-only or incremental run required to be
  refused. `09_delta.md` records the prohibition as `RJ-0014-0001`. Nothing supplies an incremental
  invocation, and there is no incremental path for anything to supply.
- **BR-0014-0003 × Negative case** — the rule states validate remains the source of deterministic
  schema and evidence findings. Its negative is a finding produced outside validate, or the same
  input producing different findings, required to be caught. No case constructs either; the
  determinism case asserts `second).toEqual(first)` and would pass under any implementation that is
  merely consistent, including one that always returns the same wrong answer.
- **BR-0014-0004 × Negative case** — the rule's prohibition is that legacy `full-harness` wording
  must not be read as restoring a removed runtime or CLI entrypoint. Its negative is an attempt to
  reach such an entrypoint, required to fail. `init.ts` carries `qfai-prototyping-full-harness` in
  `RETIRED_SKILL_IDS`, which is the one place in the product where the prohibition is enforced, and
  no test in `packages/qfai/tests/**` references that set.

- **BR-0014-0004 × Positive case** — the rule permits legacy slices to keep referring to
  `full-harness` artifact semantics where the code remains, so its positive direction is a reader
  that tolerates the vocabulary. The two slices that read it — `prototypingCertify.ts`'s legacy
  `fullHarness.runId` fallback and `report.ts`'s `prototyping.fullHarness` rendering — have no case
  in `packages/qfai/tests/**` at all. The one case that touches the vocabulary removes it:
  `delete body.fullHarness` in the cycle-0 reset, pinned by `TC-0014-0034`. Removing the vocabulary
  is the opposite direction, so the rule's own has nothing behind it.

### The four ❌ cells of the business rule Status column

- **BR-0014-0001 × Status** — both scored cells are `❌`. The rule is stated in the spec and rejected
  alternatives are recorded, and nothing in the suite can tell a full scan from a partial one.
- **BR-0014-0002 × Status** — the rule's own covering case, `TC-0014-0009`, has no test. What does
  exercise a reviewer verdict is a gate in a different command over a different artifact, which is
  why both scored cells are `⚠️` rather than `❌` and why the row's verdict is still `❌`: the rule as
  its `AC` scopes it, verify inspecting review artifacts, is enforced only by skill prose that no
  test reads.
- **BR-0014-0003 × Status** — the positive direction rests partly on a substring read of
  `validate.ts` and the negative direction has no case. The rule is documented and half-measured.
- **BR-0014-0004 × Status** — both covering cases, `TC-0014-0028` and `TC-0014-0029`, have no test
  at all, and the rule's prohibition half is unverified. The rule's permissive half is exercised
  incidentally by one slice that deletes the vocabulary rather than reading it.

## Every ⚠️ cell, named

53 depth cells and 9 `Status` cells in the matrix, and 8 scored cells and 3 `Status` cells in the
business rule table, are `⚠️` — 73 in all, of which 61 are scored. The PASS criterion requires a
documented rationale for each, so each is named here.

### Matrix depth cells

- **US-0014-0013 × Equivalence partitions** — one partition of the discussion-pack input is
  represented with a real input and a required emission: a UI-bearing pack carrying the forbidden
  legacy sidecar `12_design_system.md`. The complementary clean pack is never fed, and the
  package-surface half of the story constructs no input at all, so the story's discriminating power
  is established in one direction on one of its two halves.
- **US-0014-0013 × Normal path** — the direction is covered by two running cases:
  `src/core/validate.ts` is read and required to name `runCanonicalUixValidators` and import from
  `./validators/index.js`, and that entrypoint is then called over a seeded repo root and required
  to emit a real issue. Both carry the `TC-0014-0018` annotation, and no case that runs is bound to
  the story, so the cell is held at `⚠️`.
- **US-0014-0013 × Error path** — a real error-severity issue is produced from the canonical
  entrypoint, and the negative predicates over the real tree would redden if `validators/legacy` or
  `runLegacyUixCompatibilityValidators` were re-introduced. What the story's consequence clause
  needs — verify itself remaining non-pass when validate returns an error — is observed by nothing,
  because no verify run is driven anywhere in the pack.
- **US-0014-0013 × Oracle strength** — two of the three cases carry real oracles: removing the
  forbidden-file rule reddens the reach-through case, and re-adding `"compatibility"` to the
  category union reddens the surface case. The third is `expect(validateSrc).toContain("runCanonicalUixValidators")`,
  which the import statement alone satisfies, and the `IssueCategory` regex has no end anchor, so a
  third union member passes both of its assertions.
- **US-0014-0014 × Equivalence partitions** — the valid partition is fed as a real file and required
  to produce zero issues, and each invalid partition has its own representative: `skipped` without
  `skippedReason`, `captured` without `imagePath`/`htmlPath`, `failed` without `error`, three inline
  payload shapes, and three top-level/per-screen status contradictions. Held at `⚠️` because no
  criterion in the pack says these are this story's partitions.
- **US-0014-0014 × Normal path** — `it("reads and validates canonical render bundle")` writes a real
  bundle to disk, reads it back through `readRenderEvidenceBundle`, and requires
  `validateRenderEvidenceBundle` to return `[]`. Held at `⚠️` for the same binding reason.
- **US-0014-0014 × Error path** — the rejection cases pin specific codes — `QFAI-PROT-251` for an
  inline payload, `QFAI-PROT-252` for a captured screen with no paths, `QFAI-PROT-253` for a status
  contradiction — rather than "some issue was raised". Held at `⚠️` for the same binding reason.
- **US-0014-0014 × Edge cases** — four edges are covered: a `captured` top level with no captured
  screen, a `skipped` top level with a captured screen, a `failed` top level with a captured screen,
  and a null bundle summarized as zeros rather than throwing. A capture run with no adapter is
  additionally required to return `skipped` rather than `captured` with placeholder paths, which is
  the story's own failure mode. Held at `⚠️` for the same binding reason.
- **US-0014-0014 × Boundary values** — the one numeric limit is exercised on both sides:
  `looksLikeOversizedInlinePayload` must be `true` at 501 characters and `false` at 500, and `false`
  for a 501-character string containing a newline. Held at `⚠️` for the same binding reason.
- **US-0014-0014 × Special values** — data URIs in two media types, a bare `;base64,` fragment,
  `<!doctype html>`, `<body>`, a null bundle and absent fields are all supplied. Not supplied: a
  zero-byte bundle file, a bundle whose top level is an array, and a path containing control
  characters.
- **US-0014-0014 × Combinatorial** — the top-level status is crossed with the per-screen status in
  three combinations, each required to report a contradiction, and `looksLikeInlineRenderPayload` is
  crossed over all four payload shapes plus a valid path. Not crossed: two defects at once — an
  inline payload inside a bundle that already contradicts its own status — so nothing establishes
  that both are reported rather than the first one short-circuiting.
- **US-0014-0014 × Oracle strength** — the assertions pin issue codes and exact booleans rather than
  truthiness, and the boundary pair would redden on an off-by-one in the limit. Held at `⚠️` because
  the largest claim the row makes — that this suite is what "enforced" means for this story — rests
  on no criterion, and because the only elaboration the story ever carried, five canonical evidence
  states, does not match this module's three.
- **US-0014-0018 × Equivalence partitions** — the profile input is partitioned with opposite
  expectations over one fixture: the full-scan `verify` profile must report `QFAI-REVIEW-*` and the
  partial `tdd` profile must report none. The partition the story is about — a contract-first input
  against a discussion-pack input — is not represented.
- **US-0014-0018 × Error path** — a real error direction is exercised: a review pack whose
  `summary.json` is not JSON produces `QFAI-REVIEW-*` under the verify profile. It is the covering
  validator's error direction rather than the story's, which would be a verify run refusing to take
  its completion decision from a discussion-pack runner.
- **US-0014-0018 × Oracle strength** — the wiring cases are real oracles: removing
  `validateReviewArtifacts` from the verify profile reddens the first, adding it to the `tdd` profile
  reddens the third, and the fourth pins the shipped layout doc against the profiles that actually
  report. None of them can fail on the story's own claim, because no case observes where verify's
  completion decision comes from.
- **US-0014-0019 × Normal path** — the story's own direction is the removed namespaces staying
  removed, and one running case asserts it over the real tree: `src/core/validators/index.ts` and
  `src/core/types.ts` must carry neither `validators/legacy` nor
  `runLegacyUixCompatibilityValidators` nor `"compatibility"`. The case carries the `TC-0014-0019`
  annotation, and no case that runs is bound to the story, so the cell is held at `⚠️`.
- **US-0014-0019 × Error path** — the obligation is negative in shape and the assertions are
  negative over the real tree, which is the right shape for "remain removed": re-introducing
  `validators/legacy` or `runLegacyUixCompatibilityValidators` into either file reddens the case.
  It is `⚠️` rather than `✅` because no fixture plants a re-introduction and requires the same
  predicate to fire, so a predicate that had stopped matching anything would pass silently.
- **US-0014-0019 × Oracle strength** — one assertion is a real oracle:
  `toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/)` against a `types.ts` whose
  union is exactly those two members. Two weaknesses keep it off `✅`. The regex has no end anchor,
  so a third member added to the union still matches the prefix; only the literal `"compatibility"`
  is separately excluded. And the scan covers two `src/` files while the story's subject is the
  package surface, which `package.json#files` defines and nothing here reads.
- **US-0014-0020 × Equivalence partitions** — the input is partitioned in three dimensions, each
  with a real CLI run on both sides: `--scope saas-package` against the default invocation, an
  upgrade requested while a gate is still missing against one requested after the gates pass, and a
  canonical signal against a legacy one. The partitioning is the widest in the pack. Every case
  carries a `TC-0014-0035` or `TC-0014-0036` annotation, so the cell is held at `⚠️`.
- **US-0014-0020 × Normal path** — both directions the story names run end to end. `--scope
  saas-package` seals a certificate carrying `scope: "saas-package"` and a `notes` array covering
  every member of `SAAS_PACKAGE_SKIPPED_GATES`, and `--upgrade-scope full` upgrades that certificate
  once the previously-skipped gates pass. Held at `⚠️` because neither case is bound to the story.
- **US-0014-0020 × Error path** — five distinct refusal causes are exercised across eight cases: a
  signal still naming a missing gate, a saas-package-profile signal where a fuller profile is
  required, a malformed or empty signal, a fuller-profile run carrying an error finding, and a
  signal older than the certificate it would upgrade. Each pins the exit code, four re-read the
  certificate and require it to be scope-limited still, and one requires every still-missing gate to
  be named on stderr. Held at `⚠️` because no case that runs is bound to the story.
- **US-0014-0020 × Edge cases** — four edges have their own case: the legacy `.qfai/output/` signal
  path, which must still be read and must emit a deprecation note; a signal path derived from a
  non-default `config.output.validateJsonPath`; a full-profile signal recovering an upgrade that a
  stale canonical signal would have blocked; and a full-profile signal read as the source when the
  canonical file is absent. Held at `⚠️` because none of those cases is bound to the story.
- **US-0014-0020 × Boundary values** — the ordered domain is mtime, and `TC-0014-0036`'s cases
  exercise it on both sides of two distinct freshness gates. The exact boundary — equal mtimes — is
  never supplied, and `TC-0014-0035`'s only count, the length of `notes`, is asserted with
  `toBeGreaterThan(0)` against a fixture that could not have emptied it.
- **US-0014-0020 × Special values** — one special value is supplied and is required to refuse rather
  than default to success: a parseable but empty `{}` canonical signal. Not supplied: an unparseable
  non-JSON signal, a zero-byte file, a non-numeric `counts.error`, a `null` body, and an empty or
  absent skipped-gate list.
- **US-0014-0020 × State transitions** — the scope-limited-to-full progression is driven on one
  artifact: a certificate is sealed carrying `scope: "saas-package"`, an upgrade is refused while a
  gate is still missing and the certificate is required to stay scope-limited afterwards, and the
  same certificate is upgraded once the gates pass. Held at `⚠️` because the cases carry
  `TC-0014-0035` and `TC-0014-0036`. The only case the pack binds to the story names this transition
  in its own title, and it does not run.
- **US-0014-0020 × Combinatorial** — four crosses are constructed: a canonical and a legacy signal
  present at once with a stated winner, a full-profile signal against a canonical one in both
  freshness directions, a non-default config crossed with the signal path, and gate status crossed
  with signal freshness. Held at `⚠️` because no case that runs is bound to the story.
- **US-0014-0020 × Oracle strength** — the covered directions carry real oracles. `cert.scope` is
  pinned to the exact literal, the notes assertion iterates the shipped `SAAS_PACKAGE_SKIPPED_GATES`
  rather than a stale literal list, and raising the refusal threshold in `prototypingCertify.ts`
  kills every refusal case. The acceptance direction's recorded mutation — `stripScopeMarkers(cert)`
  replaced by `cert` in the upgrade branch — kills seven of the file's eight acceptance cases and
  leaves one green: `prefers the canonical path when BOTH canonical and legacy signals exist`
  asserts only the exit code and which signal path won, and never reads the sealed certificate back,
  so it would not notice an upgrade that silently left the certificate scope-limited. Two further
  weaknesses: the story's "never overstates completion" clause rests on
  `expect(cert.scope).not.toBe("full")`, which cannot fail while
  `expect(cert.scope).toBe("saas-package")` passes in the same case; and every oracle named here
  belongs to a case the pack binds to a test case rather than to this story.
- **TC-0014-0018 × Normal path** — the row's `Steps` are "run repo-root verify flow against the
  canonical validate entrypoint", and no case runs one. The first credited case reads
  `src/core/validate.ts` as text and asserts it names `runCanonicalUixValidators`; the second calls
  that function directly against a seeded temp root. Those establish the wiring and one emission,
  which is why the cell is not `❌`, and neither is the verify flow the row describes.
- **TC-0014-0036 × Oracle strength** — the two selector entries each have a production mutation that
  reddens them on their own, run separately, which is what the row's own coverage needs. The cell is
  held off `✅` by a third case in the same file: `prefers the canonical path when BOTH canonical and
  legacy signals exist` drives a successful upgrade and survives the acceptance-direction mutation,
  because it asserts only the exit code and which signal path won and never reads the sealed
  certificate back. The matrix credits the file's sixteen cases to this row, so a case with no
  killing mutation caps it.
- **TC-0014-0018 × Equivalence partitions** — one partition of the discussion-pack input is
  represented with a real input and a required emission: a UI-bearing pack carrying the forbidden
  legacy sidecar `12_design_system.md`. The complementary partition — a pack with a clean canonical
  family, required to produce no `UIX-VAL-3LAYER-FORBIDDEN-FILE` — is never fed to this entrypoint
  in this row, so the rule's discriminating power is established in one direction only.
- **TC-0014-0018 × Error path** — the error direction is half covered. The emission half is genuine:
  a real pack produces a real error-severity issue from the canonical entrypoint. The consequence
  half that `EX-0014-0001` states, that verify remains non-pass when validate returns an error, is
  observed by nothing, because no verify run is driven anywhere in the pack.
- **TC-0014-0018 × Oracle strength** — the two cases sit at opposite ends. The reach-through case is
  a real oracle: removing the forbidden-file rule reddens it. The entrypoint case is
  `expect(validateSrc).toContain("runCanonicalUixValidators")`, which the import statement alone
  satisfies — deleting every call while leaving the import keeps it green. The `not.toMatch`
  half is stronger, since re-adding either legacy aggregator name reddens it.
- **TC-0014-0019 × Normal path** — the compliant direction is exercised, but over a proxy for
  the surface the obligation names. The case reads `src/core/validators/index.ts` and
  `src/core/types.ts`; the package surface is what `package.json#exports` publishes, which is
  `dist/index.mjs`, `dist/index.cjs` and `dist/index.d.ts`. A legacy namespace re-entering through
  a re-export in `src/index.ts`, through a retained `dist/` artifact, or through any other shipped
  path leaves the case green — the same blind spot this row carries `❌` in `Edge cases` for. The
  direction does run and its assertions are real, so the cell is capped rather than empty.
- **TC-0014-0019 × Error path** — the obligation is negative in shape and the assertions are
  negative over the real tree, which is the right shape for "does not reappear": re-introducing
  `validators/legacy` or `runLegacyUixCompatibilityValidators` into either file reddens the case.
  It is `⚠️` rather than `✅` because no fixture plants a re-introduction and requires the same
  predicate to fire, so a predicate that had stopped matching anything would pass silently.
- **TC-0014-0019 × Oracle strength** — one assertion is a real oracle:
  `toMatch(/type\s+IssueCategory\s*=\s*"canonical"\s*\|\s*"change"/)` against a `types.ts` whose
  union is exactly those two members. Two weaknesses keep it off `✅`. The regex has no end anchor,
  so a third member added to the union still matches the prefix; only the literal `"compatibility"`
  is separately excluded, and any other new member passes both assertions. And the scan covers two
  `src/` files while the case's own text names the package surface, which `package.json#files`
  defines and nothing here reads.
- **TC-0014-0033 × Equivalence partitions** — three partitions of the evidence layout are fed with
  stated expectations: no evidence at all, required to produce `QFAI-UIE-001` and `QFAI-UIE-002` at
  error severity; an `iter-03` layout, required to produce zero issues; and a legacy
  `screenshots/`+`html/` layout, also required to produce zero issues. The partitioning is complete
  as input, and the third partition's expectation is the one the criterion denies.
- **TC-0014-0033 × Normal path** — the iter-NN half has a real normal case:
  `iter-03/orders-dashboard.png` and `.html`, matching `EX-0014-0026`'s shape, required to produce
  zero issues. The clause that makes the criterion true has no normal case — no run requires a
  project whose only evidence is the legacy layout to be treated as lacking an active SSOT.
- **TC-0014-0033 × Error path** — the validator's error direction is real and specific: declared
  screens with no evidence produce `QFAI-UIE-001` and `QFAI-UIE-002` at error severity, an unsafe
  screen id produces `QFAI-UIE-003` with the offending contract reference in `file`, and a custom
  `contractsDir` is required to be named in the suggested action rather than the default path. The
  error the criterion implies — a required-path lookup raised against the legacy directories — is
  produced by nothing, because those directories are the validator's own first choice.
- **TC-0014-0033 × Edge cases** — three edges are covered on the covered half: an absent
  `contracts/ui` skips the check rather than failing, an absent prototyping evidence root produces
  zero issues rather than an error, and `parseIterationReviewPath` returns `null` on five malformed
  inputs rather than throwing. The edge that decides the criterion — both layouts present at once,
  which is the state `mirrorAcceptedIterToAggregateDirs` creates on every accepted iteration — has
  no case and no stated winner.
- **TC-0014-0033 × Boundary values** — the iteration-index domain is exercised at its edges by
  `iterationPaths.test.ts`: `0`, `9`, `14`, `99` and `123` compose and round-trip correctly, while
  `iter-1` and `iter-bad` are excluded from the stale-directory match and `iter-2` in a review path
  parses to `null`. The criterion's other half has no edge to exercise because no case approaches it.
- **TC-0014-0033 × Special values** — two special inputs are supplied and both are required to
  produce zero issues rather than an error: an absent `contracts/ui` directory, and an absent
  prototyping evidence root. `parseIterationReviewPath` is also required to return `null` on
  malformed input rather than throw. What is not supplied is an evidence file that exists but is
  not evidence: `hasEvidenceFile` decides on extension and directory name and never reads content,
  so a zero-byte `.png` or an HTML file renamed to `.png` counts as a satisfied screenshot, and no
  case establishes whether that is intended.
- **TC-0014-0033 × State transitions** — the stale-to-fresh transition of the iter tree is covered
  in both directions that matter: `deleteStaleIterDirs` removes every matching directory and the
  post-delete `readdir` is required to equal the exact residual set, and the cycle-0 reset is
  required to preserve non-iter siblings. No invalid transition is attempted, and no partial state
  is constructed — a delete interrupted midway, leaving some iter directories and not others, has
  no case. The transition the criterion would need, a project moving off the legacy layout onto
  iter-NN, is neither constructed nor required.
- **TC-0014-0033 × Combinatorial** — one combination is constructed deliberately and one fixture is
  genuinely dense: the custom-`contractsDir` case crosses a non-default config with the legacy
  layout, and the `findIterationReviewFiles` fixture crosses two specs, two screens, three file
  extensions and two iteration indices with an exact expected set. What is never crossed is the one
  pair the criterion creates: a project carrying the legacy `screenshots/`+`html/` layout **and** an
  iter-NN layout at once, with a stated winner. The custom `contractsDir` is also never crossed with
  the iter-NN layout, only with the legacy one, and no case declares more than one screen.
- **TC-0014-0033 × Oracle strength** — the covered half has a named mutation: removing the
  `ITERATION_DIR_PATTERN` branch of `hasEvidenceFile` reddens the `iter-03` case, and
  `deleteStaleIterDirs` is pinned by an exact residual `readdir` set rather than a count. The
  oracles that bear on the criterion's other half point the wrong way — removing the canonical
  `screenshotRoot` branch, which is what making the criterion true would require, reddens two
  passing cases in the same file.
- **TC-0014-0034 × Equivalence partitions** — two partitions of the prior `prototyping.json` are
  represented with opposite expectations: one carrying the three per-loop blocks that must be
  deleted, and one carrying operator-defined keys (`mode`, `surface`) that must survive the same
  reset. The partition the rule's own wording implies — a `prototyping.json` with no `fullHarness`
  key — is exercised only incidentally by sibling cases that assert nothing about it.
- **TC-0014-0034 × Edge cases** — one edge is covered, and it is the edge that matters: the reset
  must not be a truncation, so `mode` and `surface` are required to survive byte-for-byte while
  three sibling keys are deleted, and `runId` is required to be regenerated rather than preserved.
  Untested: a `fullHarness` key nested under another key, and a `prototyping.json` whose top level
  is an array rather than an object.
- **TC-0014-0034 × Combinatorial** — one combination is constructed: three legacy per-loop keys
  present at once, all required to be gone after a single run, alongside two fields required to be
  re-seeded to specific values rather than deleted. Not crossed: the legacy block with a stale
  `iter-NN` tree and a stale completion certificate in the same fixture — each of those is a
  separate case in a separate `describe` — and the legacy block with a cycle ≥ 1 request.
- **TC-0014-0035 × Equivalence partitions** — two partitions of the `--scope` input are represented
  with opposite expectations: `saas-package`, which must write both markers, and the default, which
  must write neither. The invalid partition is not represented: no unrecognised `--scope` value is
  supplied to `runPrototypingCertify` in this row, so nothing establishes what the command does with
  one.
- **TC-0014-0035 × Normal path** — the happy path runs end to end and the seal is read back from
  disk, but it is entered by calling `runPrototypingCertify` with `scope: "saas-package"` as an
  argument. The obligation names the command, and the argument parsing and dispatch that turn
  `--scope saas-package` into that argument are exercised by nothing that runs: the only case
  invoking `runCli(["prototyping", "certify", "--scope", "saas-package"])` sits in
  `spec0014SaasPackageCertify.test.ts`, whose block is skipped. A parser that stopped forwarding the
  flag would leave both credited cases green.
- **TC-0014-0035 × Oracle strength** — the row is strong in two respects and weak in one. `cert.scope`
  is pinned to the exact literal, and the notes assertion iterates `SAAS_PACKAGE_SKIPPED_GATES`
  imported from `core/saasPackage/skippedGates.ts`, so a gate added to the SSOT and omitted from
  `notes` reddens rather than passing on a stale literal list. The default case pins the absence of
  both markers, so a scope marker leaking into an unscoped seal reddens too. Against that,
  `expect(cert.scope).not.toBe("full")` — the assertion carrying the "MUST NOT claim full DONE"
  clause — sits sixteen lines after `expect(cert.scope).toBe("saas-package")` and cannot fail while
  that line passes. The clause's real content, that no other field asserts full completion, is
  checked by nothing.
- **TC-0014-0036 × Normal path** — both directions the obligation names run end to end and the
  certificate is read back, but every one of the sixteen cases enters by calling
  `runPrototypingCertify` with `upgradeScopeFull` as an argument. The obligation names the command
  line, and the parsing and dispatch that turn `--upgrade-scope full` into that argument are
  exercised by nothing that runs: the only case invoking the flag sits in a skipped block. A
  dispatch that stopped mapping the flag would leave all sixteen green.
- **TC-0014-0036 × Boundary values** — the ordered domain is mtime, and it is exercised on both
  sides of two distinct freshness gates: a full-profile signal older than the certificate refuses, a
  full-profile signal newer than the certificate but older than the canonical signal refuses, and a
  full-profile signal newer than both allows. The exact boundary — equal mtimes — is never supplied,
  and the gaps are chosen for robustness across filesystem clock resolutions (±1s, +60s, +120s,
  −10min) rather than to sit at the limit, which the test says in its own comments.
- **TC-0014-0036 × Special values** — one special value is supplied and is required to refuse rather
  than default to success: a parseable but empty `{}` canonical signal, with a comment naming the
  fail-open it exists to prevent. Not supplied: an unparseable non-JSON signal, a zero-byte file, a
  `counts.error` that is present but non-numeric, and a `null` body.

### Matrix Status cells

- **US-0014-0013 × Status** — the canonical entrypoint is reached from a repo root with a real
  emission, and the removed namespaces are asserted over the real tree. Three things cap it. No
  verify run is driven anywhere, so the story's own subject is reached only through `validate.ts`
  read as text. The five `❌` depth cells named above are unaddressed. And the obligation is
  reported carrier-only, with every discharging file under `packages/qfai/tests/`, outside the
  scanned root.
- **US-0014-0014 × Status** — the story's subject is enforced by a suite whose oracles are specific
  and whose categories are nearly complete, which is more than most rows in this pack can say. It is
  capped at `⚠️` because the live pack binds that suite to the story by nothing — no `AC`, `BR`,
  `EX` or `TC`, and the one chain carrying the identifier states an earlier subject — because no
  state progression is observed, and because the obligation is reported carrier-only.
- **US-0014-0019 × Status** — the direction the story names is asserted over the real artifacts and
  would redden on the re-introduction it exists to prevent. It is capped at `⚠️` because the story's
  subject is the package surface while the assertions read two `src/` files, because its consequence
  clause about verify guidance is read by nothing, and because the obligation is reported
  carrier-only.
- **US-0014-0020 × Status** — the story's subject carries the widest coverage of any row here: 18
  passing cases across two files, five distinct refusal causes, an SSOT-derived gate list, mtime
  freshness gates in both directions, and stderr assertions that pin the recovery message away from
  an infinite loop. It is capped at `⚠️` because the only file carrying the story's annotation is
  entirely `describe.skip`, which is also why no depth cell in the row reaches `✅`, because the
  obligation is reported carrier-only, and because the "never overstates completion" clause is
  carried by a tautological assertion.
- **TC-0014-0018 × Status** — one half of the obligation is genuinely discharged: the canonical
  entrypoint is reached from a repo root and produces a real emission. Three things cap it.
  `AC-0014-0001`'s full-scan posture is not exercised at all. `EX-0014-0001`'s consequence, verify
  remaining non-pass, is observed by nothing. And the obligation is reported carrier-only, with the
  discharging file at `packages/qfai/tests/integration/`, outside the scanned root.
- **TC-0014-0019 × Status** — the direction the row names is asserted over the real artifacts and
  would redden on the re-introduction it exists to prevent, which is more than most rows in this
  pack can say. It is capped at `⚠️` because the case's own subject is the package surface and the
  assertions read two `src/` files, and because the obligation is reported carrier-only.
- **TC-0014-0034 × Status** — the behaviour the `AC` states is exercised end to end on the live
  artifact with a strong oracle, and no annotation is owed. It is capped at `⚠️` because the cycle
  boundary is unguarded — nothing requires cycle ≥ 1 to leave the block alone — and because the
  `AC`'s consequence clause, that the evolution loop never re-reads stale `full-harness` /
  `perfect-100` / `weighted-total` state, is a claim about later reads that no case observes.
- **TC-0014-0035 × Status** — the positive direction is discharged with a real run against a real
  fixture and an SSOT-derived oracle. It is capped by the six `❌` depth cells named above — no error
  direction, no edge, no boundary, no combination — and by the carrier-only condition.
- **TC-0014-0036 × Status** — this is the strongest test-case row in the pack: sixteen cases, five
  distinct refusal causes, four of the eight refusals additionally required to leave the certificate
  scope-limited, and stderr assertions that pin the recovery message away from an infinite loop. It
  is capped at `⚠️` by the carrier-only condition — the configured scan root is the repo-root
  `tests/` and the discharging file sits at `packages/qfai/tests/integration/cli/commands/` — and by
  the successful-upgrade direction's mutation leaving one of the file's acceptance cases green:
  `prefers the canonical path when BOTH canonical and legacy signals exist` reads no field of the
  sealed certificate, so an upgrade that silently left it scope-limited would still pass there.

### Business rule table

- **BR-0014-0002 × Positive case** — a completion gate does observe a reviewer verdict and permits
  the seal only on `PASS`: `prototypingCertify.ts` requires `prototyping.json#reviewerGate.result`
  to be `PASS`, and that precondition is satisfied and exercised by every passing case in the two
  certify suites. It is `⚠️` because `AC-0014-0002` scopes the rule to verify inspecting reviewer
  artifacts, and the gate that exists is a different command reading a different artifact.
- **BR-0014-0002 × Negative case** — the negative direction is genuinely present:
  `it("exits 2 when reviewerGate is not PASS")` in `prototypingCertify.test.ts` seeds
  `reviewerGate: { result: "REVISE" }` and requires exit 2. It is `⚠️` for the same scoping reason,
  and because the case asserts only the exit code — nothing requires the refusal to name the verdict
  or the artifact, so an operator-facing message that regressed to silence would still pass.
- **BR-0014-0003 × Positive case** — determinism is directly exercised:
  `validatorConvergenceIntegration.test.ts` runs `validateThreeLayerModel` twice over the same
  fixture and requires `second).toEqual(first)`, and the canonical entrypoint is separately reached
  from a repo root with a real emission. It is `⚠️` because the rule's other half — that validate
  _remains the source_ of these findings, rather than a parallel runner — rests on a substring read
  of `validate.ts`, and because the case carrying the determinism assertion carries no spec-0014
  annotation, so nothing binds it to this pack.
- **BR-0014-0004 × Conditional branches** — the rule is explicitly conditional: the vocabulary may
  persist "if corresponding code remains". The branch where code remains is established for one
  slice, by a passing case that depends on that code. The complementary branch — vocabulary
  surviving in a document or artifact with no code behind it, which must not be read as a live
  contract — is never constructed, so the condition is never used to discriminate.
- **BR-0014-0005 × Conditional branches** — the rule has two clauses and both have real cases: the
  iter-NN layout is accepted as the active SSOT (`iter-03`, matching `EX-0014-0026` verbatim, zero
  issues), and the legacy `screenshots/`+`html/` layout is still accepted rather than required, so
  neither is imposed on the other. The branch that is not constructed is both layouts present at
  once, which is the state the product itself produces — `mirrorAcceptedIterToAggregateDirs` writes
  the legacy dirs from the accepted iteration — and no case states which one wins.
- **BR-0014-0006 × Negative case** — the reset's scope boundary is exercised in the negative
  direction: operator-defined keys (`mode`, `surface`) must survive the same run that deletes three
  siblings, and non-iter files in the evidence directory must be preserved, so "delete the per-loop
  state" is distinguished from "empty the file". The rule's own negative — that the post-1.8.9 loop
  never re-reads stale `full-harness` / `perfect-100` / `weighted-total` state — has no case,
  because nothing observes a read.
- **BR-0014-0006 × Conditional branches** — the rule is conditional on cycle 0 and the cycle-0
  branch is exercised thoroughly. The complementary branch has no case: nothing runs a cycle ≥ 1
  against a `prototyping.json` carrying `fullHarness` and requires it to survive, so the guard that
  scopes the deletion to cycle 0 is unverified.
- **BR-0014-0025 × Positive case** — three of the rule's four clauses have real positive cases and
  they are covered well: the scope seal, the `notes` enumeration drawn from the shipped SSOT, and
  the sanctioned upgrade after every gate passes. The fourth clause requires the `--scope
  saas-package` delivery mode to be documented in `/qfai-prototyping` SKILL.md as a SaaS-tenant
  delivery mode. It has no case, and the artifact it names contains no occurrence of `saas-package`,
  `SaaS` or `--upgrade-scope`. See Findings 3.

### Business rule Status cells

- **BR-0014-0005 × Status** — positive, negative and one branch of the condition are all genuinely
  present, exercised against real fixtures, and the accepting cases fail if the `iter-NN` branch of
  `hasEvidenceFile` is removed. It is capped at `⚠️` because the rule names the iter-NN layout as
  _the_ active evidence layout while the product writes the legacy aggregate mirror on every
  accepted iteration and looks there first, so the artifact state the rule describes is not the
  artifact state the product produces.
- **BR-0014-0006 × Status** — the `MUST` is exercised on the live artifact with an oracle that a
  one-line source mutation reddens. It is capped at `⚠️` because the condition that scopes the
  deletion to cycle 0 is unverified, and because the rule's stated purpose — that stale runtime
  state is never re-read afterwards — is asserted by nothing.
- **BR-0014-0025 × Status** — the behavioural clauses are the best-covered obligation in this pack:
  five refusal causes, an SSOT-derived gate list, mtime freshness gates in both directions, and a
  recovery message pinned against the loop it used to create. Every one of those runs enters through
  the function rather than the command line, which both test cases name. It is capped at `⚠️`
  by the undocumented fourth clause, and by the "MUST NOT claim full DONE" clause being carried by a
  tautological assertion rather than by a check over the certificate's other fields.

## Findings

Six things were found while producing this matrix that the reviewing stage should act on. None of
them is repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **`TC-0014-0009`'s obligation is implemented in a shipped skill and observed by no test.**
   `AC-0014-0002` reads "Verify inspects reviewer artifacts and blocks on `REVISE`". `/qfai-verify`
   is a skill, not a CLI command, so the gate lives in
   `packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md`: under "Stage Minimum
   Roles (MUST)", "Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`";
   under "Reviewer Gate (MUST)", "Do not declare DONE or handoff until all routed blocking reviewers
   return `PASS`". The inspection half has an executable counterpart as well —
   `validateReviewArtifacts` is wired into the full-scan verify profile, which
   `reviewArtifactsProfileWiring.test.ts` pins — though it reads a review pack's `PASS|FAIL|NA`
   roster rather than a `REVISE` verdict. What is missing is a test. No file in
   `packages/qfai/tests/**` reads either clause, and the two `describe` blocks carrying the
   `TC-0014-0009` annotation assert stale sidecar migration guidance, a different subject, so the
   annotation resolves without discharging anything. The gap is coverage over behaviour that exists.
2. **Two exception rows cite a decision record that addresses a different subject, and name a file
   that does not exist.** `TDD-0028` and `TDD-0029` are parked citing `DR-0014-0002`, whose text
   reads "removed compatibility surfaces remain removed" — that is `TC-0014-0019`'s subject.
   `DR-0014-0003`, "legacy validator slices may persist as artifact-specific checks without
   reintroducing a public prototyping runtime", is the record their subject matches and is not
   cited by any row. Both rows also name `packages/qfai/tests/validators/prototypingDesignSystem.test.ts`
   as their `Test file`, and that path does not exist. An exception is only as good as the record
   behind it; here the record exists but governs something else.
3. **`BR-0014-0025`'s documentation clause is unmet in the product.** The rule requires the
   `--scope saas-package` delivery mode to be documented in `/qfai-prototyping` SKILL.md as a
   SaaS-tenant delivery mode. Neither the working-tree skill nor the shipped copy under
   `packages/qfai/assets/init/` contains `saas-package`, `SaaS` or `--upgrade-scope` anywhere. The
   behaviour is implemented and well tested; an operator reading the skill has no way to learn the
   mode exists.
4. **The legacy evidence layout is the product's first choice, which contradicts `AC-0014-0005`.**
   The criterion states that the legacy `screenshots/` / `html/` layout "is no longer accepted as
   the active SSOT", and `TC-0014-0033`'s `Expected` compresses it to iter-NN "only".
   `validateUiEvidenceArtifacts` builds `screenshotRoot` as `<prototyping root>/screenshots` and
   `htmlRoot` as `<prototyping root>/html`, tests those paths before it scans for an `iter-NN` file,
   reports the legacy path as the issue's location, and names it first in the suggested action.
   `validate.ts` documents `.qfai/evidence/prototyping/screenshots/<screen-id>.png` as the required
   location of screenshot evidence. `mirrorAcceptedIterToAggregateDirs` in `prototypingIterate.ts`
   copies every accepted iteration into both directories, so the first lookup finds something. Two
   passing cases in `uiEvidenceArtifacts.test.ts` require a project carrying only the legacy layout
   to produce zero issues. `BR-0014-0005` survives this — it says only that the legacy paths must
   not be _required_, and `hasEvidenceFile` accepts either layout — but `AC-0014-0005` and
   `TC-0014-0033` say otherwise, and one of the two needs a Change Request.
5. **Two test files carrying spec-0014 annotations are entirely `describe.skip` and have been
   superseded.** `tests/integration/spec0014SaasPackageCertify.test.ts` (`TC-0014-0035`,
   `TC-0014-0036`) and `tests/e2e/spec0014SaasPackageCertifyE2E.test.ts` (`US-0014-0020`) were
   authored red ahead of the implementation, and their bodies shell out to a built CLI that now
   implements everything they assert. The live suites that replaced them
   (`prototypingCertify.saasPackage.test.ts` and `prototypingCertify.upgradeScope.test.ts`) are
   stronger in every dimension. The four skipped cases discharge nothing, they are two of the 16
   `QFAI-TEST-003` findings in the recorded validate run, and their `describe` blocks are what a
   reader scanning for the covering suite finds first. They should be unskipped or retired. For
   `US-0014-0020` the skip also sets the row's ceiling: the story's only annotation sits in the
   skipped file, so no running case is bound to the story and no cell in its row can reach `✅`
   until that file runs or the annotation moves to a suite that does.
6. **Four story identifiers were reused, and the chains written for their earlier subject still
   stand.** `09_delta.md` records a chain for `US-0014-0013`, `-0014`, `-0018` and `-0019` in its
   v1.7.16 section — among them `US-0014-0014 → AC-0014-0016 → BR-0014-0017 → EX-0014-0019 →
   TC-0014-0023` and `US-0014-0018 → AC-0014-0020 → BR-0014-0021 → EX-0014-0023 → TC-0014-0027`.
   None of the four describes the story that now carries the identifier. The same section's own
   table states the earlier subjects: `US-0014-0014` was "Reject dangling evaluation_connection
   references", `US-0014-0018` "require mandatory sections in the legacy discussion-time
   design-system file", `US-0014-0013` a Trend Scan field check and `US-0014-0019` a
   `designSystemCompliance` score. `02_User-stories.md` now reads "truthful evidence and placeholder
   rejection to remain enforced", "verify to depend on contract-first validate gates", "verify to
   use the canonical validator path" and "legacy compatibility namespaces to remain removed". Of the
   downstream ids those chains name, only `EX-0014-0025`, `TC-0014-0028` and `TC-0014-0029` still
   exist, and the pack now files them under `AC-0014-0004` rather than the `AC-0014-0021` the chain
   gives them.

   The defect is identifier reuse and stale traceability, not absence. The pack records no `US-*` →
   `AC-*` link for the current subject of any of the four — `US-0014-0013` and `US-0014-0019` match
   `AC-0014-0003` by subject alone, `US-0014-0014` and `US-0014-0018` match nothing — so a reader
   following the only chains written down arrives at a different obligation. The v1.7.16 section is
   marked as retained migration history, which explains how the chains survived but not what a
   reader should do with them. They need reconciling or retiring, not new chains written beside
   them. Until that happens the story rows above are scored against the wording in
   `02_User-stories.md`, and no cell is credited to a story on the strength of a chain in
   `09_delta.md`.

   `TC-0014-0009` carries the same defect from the other end. `06_Test-Cases.md` records it against
   `AC-0014-0002` and `EX-0014-0002`, and `09_delta.md` records a second chain, `US-0014-0012 →
   AC-0014-0014 → BR-0014-0015 → EX-0014-0015 → TC-0014-0009`, whose four upstream ids the pack does
   not carry. The test currently annotated to the row implements the second chain's subject, which
   is why its annotation resolves against work that discharges nothing of the first.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
to this file and restates the counted totals beside it. Those totals are:

**✅ 13 / ⚠️ 61 / ❌ 70**, with `n/a` 3, across all 147 scored cells — 126 matrix depth cells (14
rows × 9 columns) and 21 business rule cells (7 rows × 3 columns). The `Status` columns of both
tables hold row verdicts rather than marks and are outside that population; for reference the
matrix's 14 read `⚠️ 9 / ❌ 5` and the business rule table's 7 read `⚠️ 3 / ❌ 4`.

Four obligations are stuck, and each needs a different kind of work. `TC-0014-0009` needs a test
over the shipped skill's reviewer gate: the behaviour is there and only the coverage is missing.
`TC-0014-0028` and `TC-0014-0029` name a validator slice that does not exist, and `01_Spec.md`
REQ-0028 already makes their obligation conditional on its existence. `TC-0014-0033` states a layout
rule the product contradicts, and a Change Request has to settle which side is current before any
case can discharge it. Until each is addressed, the honest verdict for all four is the one recorded
above.
