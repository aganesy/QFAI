# Coverage Depth Matrix — spec-0014

## Scope

This matrix scores the nine test cases `06_Test-Cases.md` declares — `TC-0014-0009`, `-0018`,
`-0019`, `-0028`, `-0029`, `-0033`, `-0034`, `-0035` and `-0036` — against the tests that actually
discharge them in `packages/qfai/tests/**`. The obligation set is read from `06_Test-Cases.md` in
full, not from the rows of `.qfai/specs/spec-0014/tdd/test-list.md`. Four of the nine rows are
`Level: unit` (`-0028`, `-0029`, `-0033`, `-0034`) and five are `Level: integration`; the split
matters and is stated under "Annotation coverage" below. The business rule table carries all seven
`BR-0014-*` headings of `04_Business-Rules.md` — `-0001` … `-0006` and `-0025`. None carries a
status retiring it, so all seven are active and all seven own a row.

**Three of the nine obligations have no test at all, and in each case the reason is that the
behaviour the row names is absent from the product rather than that the testing is thin.**

- `TC-0014-0009` declares `AC-0014-0002` and `EX-0014-0002`: feed `/qfai-verify` a `REVISE` review
  artifact, and verify blocks completion. There is no verify command in
  `packages/qfai/src/cli/commands/`, and no code anywhere blocks on a `REVISE` verdict in a verify
  path. The two `describe` blocks named `TC-0014-0009` in `verifySemanticsSpec0014.test.ts` pass,
  and they test stale sidecar migration errors — a different subject, adopted by `09_delta.md`
  under a chain whose `AC`, `BR` and `EX` were never written into the pack. See Findings 1.
- `TC-0014-0028` and `TC-0014-0029` declare `AC-0014-0004` and `EX-0014-0025`: a prototyping
  design-system compliance slice reading `designSystemCompliance` out of a legacy scoring artifact.
  Neither `PROT-DS01` nor `designSystemCompliance` occurs anywhere in `packages/qfai/src/**` or
  `packages/qfai/tests/**`. `01_Spec.md` REQ-0028 states the obligation conditionally — "`PROT-DS01`
  remains a validator for design-system compliance artifacts **when that slice exists**" — and the
  slice does not exist.

Those three rows carry 27 of the matrix's 47 `❌` depth cells between them.

The remaining six rows are scored on their merits and range widely. `TC-0014-0036` and
`TC-0014-0033` are the strongest work in the pack: 16 passing cases driving the scope-upgrade
re-gating end to end, and a three-way partition of the prototyping evidence layout with a
discriminating control. `TC-0014-0018`, `-0019` and `-0035` are narrower, and `-0034` is a single
well-oracled case with no boundary or error direction.

Committed, because it is a governance record. Section "Every `❌` cell, named" enumerates all 58 of
them so that "one justification per `❌`" is checkable rather than asserted, and section "Every `⚠️`
cell, named" does the same for all 33 partial scores, which the PASS criterion also requires a
rationale for.

## What was measured, and how

Every score below rests on a test run, not on a reading of a ledger. The ledger is a usable starting
point for this pack — all seven `done` rows name a file that exists on disk — but three of its rows
point somewhere the obligation is not discharged, and three of the files that do carry coverage
appear in no row at all. The files below were located by reading the tests and the source, then
executed:

| File                                                                      | Result        |
| ------------------------------------------------------------------------- | ------------- |
| `tests/integration/verifySemanticsSpec0014.test.ts`                       | 5 passed      |
| `tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts`   | 2 passed      |
| `tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts`  | 16 passed     |
| `tests/cli/commands/prototypingIterate.test.ts`                           | 103 passed    |
| `tests/cli/prototypingCertify.test.ts`                                    | 40 passed     |
| `tests/validators/uiEvidenceArtifacts.test.ts`                            | 7 passed      |
| `tests/core/prototyping/iterationPaths.test.ts`                           | 8 passed      |
| `tests/integration/specAutoDiscovery.test.ts`                             | 38 passed     |
| `tests/integration/spec0014SaasPackageCertify.test.ts`                    | 2 **skipped** |
| `tests/e2e/spec0014SaasPackageCertifyE2E.test.ts`                         | 2 **skipped** |

Three of those files carry no ledger row and are scored anyway, because the obligation is read from
`06_Test-Cases.md`: `uiEvidenceArtifacts.test.ts` and `iterationPaths.test.ts` hold the reader-side
coverage for `TC-0014-0033`, and `prototypingCertify.test.ts` holds the `reviewerGate` refusal that
`BR-0014-0002` is scored against.

Four negative results are load-bearing and were checked directly rather than inferred:

1. **`packages/qfai/tests/validators/prototypingDesignSystem.test.ts` does not exist.** Both
   exception rows, `TDD-0028` and `TDD-0029`, name it as their `Test file`.
2. **`PROT-DS01` and `designSystemCompliance` occur nowhere in `packages/qfai/src/**` or
   `packages/qfai/tests/**`.** The identifiers appear only in spec prose, and `spec-0012`'s own
   `09_delta.md` records the `designSystemCompliance` slice as purged.
3. **`src/**` blocks on a `REVISE` verdict in exactly one place, and it is not a verify path.**
   The token appears in three source files. `gitignore.ts` and `tddList.ts` are the TDD ledger's own
   reviewer-verdict handling. `renderCritique.ts` requires an evidence file to carry a
   `verdict: (PASS|REVISE)` field, and a `REVISE` satisfies that presence check exactly as a `PASS`
   does. The one gate that refuses is `prototypingCertify.ts`, which exits non-zero unless
   `prototyping.json#reviewerGate.result === "PASS"` — a different command reading a different
   artifact from the one `AC-0014-0002` names.
4. **`saas-package`, `SaaS` and `--upgrade-scope` do not occur in `/qfai-prototyping` SKILL.md.**
   `BR-0014-0025`'s fourth clause requires the delivery mode to be documented there.

### Annotation coverage

The repository's ATDD scan reads two files and no tests. `.qfai/report/atdd-traceability/summary.json`
records `scan.matchedFileCount: 2`, and both matches are annotation carriers —
`tests/integration/qfai-traceability.md` and `tests/e2e/qfai-traceability.md` — under the repo-root
`tests/` tree, while the package's real suite lives at `packages/qfai/tests/**` and is not scanned
at all. Every integration obligation in this pack is therefore reported `coveredByCarrierOnly`:
`TC-0014-0009`, `-0018`, `-0019`, `-0035`, `-0036`, and all five `US-0014-*`. This is a repo-wide
condition that no work inside this pack can clear, and it is stated once here rather than repeated
per row. It caps every integration row's `Status` at `⚠️`, exactly as it did for spec-0002.

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

**No obligation depends on a skipped case.** Both files were authored red, ahead of the
implementation, and both were superseded by live suites that were never removed: `TC-0014-0035` is
discharged by two passing cases in `prototypingCertify.saasPackage.test.ts` and `TC-0014-0036` by
sixteen in `prototypingCertify.upgradeScope.test.ts`. The four skipped cases contribute to no cell
in this matrix, and they are duplicates rather than gaps — but they are also the only files in the
package that carry the `TC-0014-0035` / `TC-0014-0036` annotation in a `describe` a reader would
take for the covering suite. See Findings 5.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| TC-0014-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0018 | ⚠️                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0019 | ❌                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0028 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0029 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0014-0033 | ✅                     | ✅          | ✅         | ✅         | ✅              | ⚠️             | ⚠️                | ⚠️            | ✅              | ⚠️     |
| TC-0014-0034 | ⚠️                     | ✅          | ❌         | ⚠️         | ❌              | ❌             | ✅                | ⚠️            | ✅              | ⚠️     |
| TC-0014-0035 | ⚠️                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0014-0036 | ✅                     | ✅          | ✅         | ✅         | ⚠️              | ⚠️             | ✅                | ✅            | ✅              | ⚠️     |

Totals across the nine depth columns, 81 cells (9 rows × 9): **✅ 19 / ⚠️ 15 / ❌ 47**.

Totals by `Status`, 9 cells: **✅ 0 / ⚠️ 6 / ❌ 3**.

No row reaches `Status = ✅`. The five integration rows are capped by the carrier-only condition
described above. The four unit rows are not capped by it; `TC-0014-0033` and `TC-0014-0034` are held
at `⚠️` on their own merits, and `TC-0014-0028` and `TC-0014-0029` have no test.

### Business rule coverage

One row per active `BR-0014-*`. All seven headings in `04_Business-Rules.md` are active, so none is
omitted. `Covering TC` is derived from each rule's `AC-Refs` and from the `BR-Ref` of the examples
the test cases cite, not from the rule's number.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                  | Status |
| ------------ | ------------- | ------------- | -------------------- | ---------------------------- | ------ |
| BR-0014-0001 | ❌            | ❌            | n/a                  | TC-0014-0018                 | ❌     |
| BR-0014-0002 | ⚠️            | ⚠️            | n/a                  | TC-0014-0009                 | ❌     |
| BR-0014-0003 | ⚠️            | ❌            | n/a                  | TC-0014-0018, TC-0014-0019   | ❌     |
| BR-0014-0004 | ⚠️            | ❌            | ⚠️                   | TC-0014-0028, TC-0014-0029   | ❌     |
| BR-0014-0005 | ✅            | ✅            | ⚠️                   | TC-0014-0033                 | ⚠️     |
| BR-0014-0006 | ✅            | ⚠️            | ⚠️                   | TC-0014-0034                 | ⚠️     |
| BR-0014-0025 | ⚠️            | ✅            | ✅                   | TC-0014-0035, TC-0014-0036   | ⚠️     |

Totals across the three scored columns, 21 cells: **✅ 5 / ⚠️ 9 / n/a 3 / ❌ 4**.

Totals by `Status`, 7 cells: **✅ 0 / ⚠️ 3 / ❌ 4**.

`n/a` is used three times, for `BR-0014-0001`, `-0002` and `-0003`, each of which states its rule
unconditionally — "always full-scan", "is part of the completion gate", "remains the source" — so
there is no branch to cover. It is not used anywhere an obligation exists and is unmet.

## Every ❌ cell, named

The matrix carries 47 `❌` depth cells plus 3 in `Status`; the business rule table carries 4 in its
scored columns plus 4 in its `Status` column — 58 in all. Each is named below with its own reason.
A row's `Status` is `❌` when the obligation is not discharged at the depth the case describes; that
verdict is stated once per row and is not repeated per cell.

### TC-0014-0009 — REVISE review artifact blocks completion

`Status = done` in the ledger under `DR-0014-0001`, naming
`tests/integration/verifySemanticsSpec0014.test.ts` with the bare TC id as its `Selector`. The
selector resolves, because two `describe` names begin with that string. Neither resolved case is
about this obligation: they assert that a legacy strategy-style filename and legacy evaluation
content are rejected with exploration-first migration guidance, which is a different subject with a
different emission. Resolution is not discharge.

Nothing feeds a `REVISE` review artifact to anything in a verify path, and no verify path exists to
feed. Every cell is `❌`, and each is named so the count is checkable:

- **Equivalence partitions** — no review artifact is classified as `PASS` or `REVISE` by anything in
  the verify path, so neither partition of the input is represented.
- **Normal path** — the case's own direction is a block produced from a `REVISE` artifact. Nothing
  produces one. The two passing cases annotated to this row address the migration-error subject the
  delta redefined it to, and that subject has no `AC`, `BR` or `EX` in the pack for the direction to
  be scored against.
- **Error path** — the block *is* the error direction, and it is never exercised.
- **Edge cases** — a review artifact with no verdict field, one carrying both verdicts, and one
  whose verdict is a third value are all untested.
- **Boundary values** — the verdict domain has exactly two members and no ordered or numeric
  dimension; no count of blocking reviews is exercised, because no review is read.
- **Special values** — no empty, absent or malformed review artifact is supplied.
- **State transitions** — a `REVISE`-to-`PASS` progression across review rounds is the clearest
  state obligation this row has, and no case observes any transition.
- **Combinatorial** — the reviewer verdict is never crossed with validate's result, with scan scope,
  or with anything else.
- **Oracle strength** — there is no production code whose mutation could redden this row. The
  nearest gate, `prototypingCertify.ts`'s `reviewerGate.result !== "PASS"` refusal, belongs to a
  different command and a different artifact, and is covered by a case scored under `BR-0014-0002`
  rather than here.
- **Status** — the obligation names a block that nothing in the product produces. This row should be
  reconciled with the delta or rewritten rather than covered; see Findings 1.

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

`Status = done` under `DR-0014-0001`. Discharged by three files: the writer side in
`prototypingIterate.test.ts`, the reader side in `uiEvidenceArtifacts.test.ts`, and the path helpers
in `iterationPaths.test.ts`. This row has **no `❌` cell** in any column. Its three `⚠️` cells are
stated below, and its `Status` is `⚠️` for the reason given there.

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
`prototypingCertify.upgradeScope.test.ts`. This row has **no `❌` cell** in any column. Its two `⚠️`
cells are stated below.

### The four ❌ cells of the business rule table

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

### The four ❌ cells of the business rule Status column

- **BR-0014-0001 × Status** — both scored cells are `❌`. The rule is stated in the spec and rejected
  alternatives are recorded, and nothing in the suite can tell a full scan from a partial one.
- **BR-0014-0002 × Status** — the rule's own covering case, `TC-0014-0009`, has no test. What does
  exercise a reviewer verdict is a gate in a different command over a different artifact, which is
  why both scored cells are `⚠️` rather than `❌` and why the row's verdict is still `❌`: the rule as
  its `AC` scopes it, verify inspecting review artifacts, is unenforced.
- **BR-0014-0003 × Status** — the positive direction rests partly on a substring read of
  `validate.ts` and the negative direction has no case. The rule is documented and half-measured.
- **BR-0014-0004 × Status** — both covering cases, `TC-0014-0028` and `TC-0014-0029`, have no test
  at all, and the rule's prohibition half is unverified. The rule's permissive half is exercised
  incidentally by one slice that deletes the vocabulary rather than reading it.

## Every ⚠️ cell, named

15 depth cells and 6 `Status` cells in the matrix, and 9 scored cells and 3 `Status` cells in the
business rule table, are `⚠️` — 33 in all. The PASS criterion requires a documented rationale for
each, so each is named here.

### Matrix depth cells

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
  no case.
- **TC-0014-0033 × Combinatorial** — one combination is constructed deliberately and one fixture is
  genuinely dense: the custom-`contractsDir` case crosses a non-default config with the legacy
  layout, and the `findIterationReviewFiles` fixture crosses two specs, two screens, three file
  extensions and two iteration indices with an exact expected set. What is never crossed is the one
  pair the rule creates: a project carrying the legacy `screenshots/`+`html/` layout **and** an
  iter-NN layout at once, with a stated winner. The custom `contractsDir` is also never crossed with
  the iter-NN layout, only with the legacy one, and no case declares more than one screen.
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
- **TC-0014-0035 × Oracle strength** — the row is strong in two respects and weak in one. `cert.scope`
  is pinned to the exact literal, and the notes assertion iterates `SAAS_PACKAGE_SKIPPED_GATES`
  imported from `core/saasPackage/skippedGates.ts`, so a gate added to the SSOT and omitted from
  `notes` reddens rather than passing on a stale literal list. The default case pins the absence of
  both markers, so a scope marker leaking into an unscoped seal reddens too. Against that,
  `expect(cert.scope).not.toBe("full")` — the assertion carrying the "MUST NOT claim full DONE"
  clause — sits sixteen lines after `expect(cert.scope).toBe("saas-package")` and cannot fail while
  that line passes. The clause's real content, that no other field asserts full completion, is
  checked by nothing.
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

- **TC-0014-0018 × Status** — one half of the obligation is genuinely discharged: the canonical
  entrypoint is reached from a repo root and produces a real emission. Three things cap it.
  `AC-0014-0001`'s full-scan posture is not exercised at all. `EX-0014-0001`'s consequence, verify
  remaining non-pass, is observed by nothing. And the obligation is reported carrier-only, with the
  discharging file at `packages/qfai/tests/integration/`, outside the scanned root.
- **TC-0014-0019 × Status** — the direction the row names is asserted over the real artifacts and
  would redden on the re-introduction it exists to prevent, which is more than most rows in this
  pack can say. It is capped at `⚠️` because the case's own subject is the package surface and the
  assertions read two `src/` files, and because the obligation is reported carrier-only.
- **TC-0014-0033 × Status** — both directions are covered with mutation-sensitive oracles across
  three files, and this row owes no ATDD annotation, so the carrier-only condition does not apply to
  it. Two things cap it. `AC-0014-0005` names the layout as
  `iter-NN/{<screen>.png, <screen>.html, review.json}`, and no case requires a per-iter `review.json`
  to be present for the layout to be accepted — `validateUiEvidenceArtifacts` checks only the two
  media extensions. And the row's `Expected` says the active layout is iter-NN "only", while
  `prototypingIterate.ts` still writes the legacy aggregate mirror under
  `.qfai/evidence/prototyping/screenshots/` and `html/` on every accepted iteration. See Findings 4.
- **TC-0014-0034 × Status** — the behaviour the `AC` states is exercised end to end on the live
  artifact with a strong oracle, and no annotation is owed. It is capped at `⚠️` because the cycle
  boundary is unguarded — nothing requires cycle ≥ 1 to leave the block alone — and because the
  `AC`'s consequence clause, that the evolution loop never re-reads stale `full-harness` /
  `perfect-100` / `weighted-total` state, is a claim about later reads that no case observes.
- **TC-0014-0035 × Status** — the positive direction is discharged with a real run against a real
  fixture and an SSOT-derived oracle. It is capped by the six `❌` depth cells named above — no error
  direction, no edge, no boundary, no combination — and by the carrier-only condition.
- **TC-0014-0036 × Status** — this is the strongest row in the pack: seven depth columns at `✅`,
  sixteen cases, five distinct refusal causes, each refusal additionally required to leave the
  certificate scope-limited, and stderr assertions that pin the recovery message away from an
  infinite loop. It is capped at `⚠️` for one reason only, and it is not about this row's work: the
  obligation is reported `coveredByCarrierOnly`, because the configured scan root is the repo-root
  `tests/` and the discharging file sits at `packages/qfai/tests/integration/cli/commands/`.

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
  *remains the source* of these findings, rather than a parallel runner — rests on a substring read
  of `validate.ts`, and because the case carrying the determinism assertion is annotated
  `TC-0014-0004`, an id absent from the active test-case table.
- **BR-0014-0004 × Positive case** — the rule permits legacy slices to keep referring to
  `full-harness` artifact semantics where the code remains. Exactly one slice that handles the
  vocabulary is exercised, and it is the one that removes it: `delete body.fullHarness` in the
  cycle-0 reset, pinned by `TC-0014-0034`. The two slices that actually read the vocabulary —
  `prototypingCertify.ts`'s legacy `fullHarness.runId` fallback and `report.ts`'s
  `prototyping.fullHarness` rendering — have no case in `packages/qfai/tests/**` at all.
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
  *the* active SSOT while the product writes the legacy aggregate mirror on every accepted
  iteration, so the artifact state the rule describes is not the artifact state the product
  produces.
- **BR-0014-0006 × Status** — the `MUST` is exercised on the live artifact with an oracle that a
  one-line source mutation reddens. It is capped at `⚠️` because the condition that scopes the
  deletion to cycle 0 is unverified, and because the rule's stated purpose — that stale runtime
  state is never re-read afterwards — is asserted by nothing.
- **BR-0014-0025 × Status** — the behavioural clauses are the best-covered obligation in this pack:
  real CLI-level runs, five refusal causes, an SSOT-derived gate list, mtime freshness gates in both
  directions, and a recovery message pinned against the loop it used to create. It is capped at `⚠️`
  by the undocumented fourth clause, and by the "MUST NOT claim full DONE" clause being carried by a
  tautological assertion rather than by a check over the certificate's other fields.

## Findings

Five things were found while producing this matrix that the reviewing stage should act on. None of
them is repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **`TC-0014-0009`'s declared obligation and its adopted redefinition disagree, and neither is
   testable as written.** Under the v1.7.15 semantics-audit correction, `09_delta.md` adopts a
   redefinition of `TC-0014-0009` to stale sidecar migration errors, together with
   `US-0014-0012`, `AC-0014-0014`, `BR-0014-0015` and `EX-0014-0015`, and records the chain
   `US-0014-0012 → AC-0014-0014 → BR-0014-0015 → EX-0014-0015 → TC-0014-0009`.
   **None of those four upstream ids exists in the pack**: `02_User-stories.md` has
   no `US-0014-0012`, `03_Acceptance-Criteria.md` no `AC-0014-0014`, `04_Business-Rules.md` no
   `BR-0014-0015`, `05_Examples.md` no `EX-0014-0015`. Meanwhile `06_Test-Cases.md` still records
   `TC-0014-0009` against `AC-0014-0002` and `EX-0014-0002`, the original `REVISE` gate. The test
   that carries the annotation implements the redefinition; the active table declares the original;
   the redefinition's upstream chain is absent. The row needs the table and the delta reconciled
   before any test can discharge it.
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
4. **The legacy evidence layout is still written by the product, which contradicts
   `TC-0014-0033`'s "only".** `mirrorAcceptedIterToAggregateDirs` in `prototypingIterate.ts` copies
   the accepted iteration's files into `.qfai/evidence/prototyping/screenshots/` and
   `.qfai/evidence/prototyping/html/`, and `validate.ts`'s operator-facing text still names
   `screenshots/<screen-id>.png` as the expected location. `BR-0014-0005` survives this — it says
   only that the legacy paths must not be *required*, and `hasEvidenceFile` accepts either layout —
   but the test case's `Expected` says the active layout is iter-NN "only", and the product writes
   both. One of the two needs a Change Request.
5. **Two test files carrying spec-0014 annotations are entirely `describe.skip` and have been
   superseded.** `tests/integration/spec0014SaasPackageCertify.test.ts` (`TC-0014-0035`,
   `TC-0014-0036`) and `tests/e2e/spec0014SaasPackageCertifyE2E.test.ts` (`US-0014-0020`) were
   authored red ahead of the implementation, and their bodies shell out to a built CLI that now
   implements everything they assert. The live suites that replaced them
   (`prototypingCertify.saasPackage.test.ts` and `prototypingCertify.upgradeScope.test.ts`) are
   stronger in every dimension. The four skipped cases discharge nothing, they are two of the 16
   `QFAI-TEST-003` findings in the recorded validate run, and their `describe` blocks are what a
   reader scanning for the covering suite finds first. They should be unskipped or retired.

## Follow-up this matrix does not discharge

There is no `.qfai/evidence/atdd-spec-0014.md`. `QFAI-ATDD-133` requires the stage evidence to carry
a `## Coverage Depth Matrix` section that links to this file and restates the counted totals beside
it. Those totals are:

**✅ 24 / ⚠️ 33 / ❌ 58**, with `n/a 3`, across all 118 scored cells — 81 matrix depth cells, 9
matrix `Status` cells, 21 business rule scored cells and 7 business rule `Status` cells.

Three obligations in this pack cannot be moved by testing alone. `TC-0014-0009` needs its table row
and its adopted redefinition reconciled; `TC-0014-0028` and `TC-0014-0029` name a validator slice
that does not exist, and `01_Spec.md` REQ-0028 already makes their obligation conditional on its
existence. Until those are settled, the honest verdict for all three is the one recorded above.
