# Coverage Depth Matrix — spec-0013

## Scope

This matrix scores every active obligation this pack declares: the **14 user stories** of
`02_User-stories.md` (`US-0013-0001` … `US-0013-0014`) and the **35 test cases** of
`06_Test-Cases.md` (`TC-0013-0001` … `TC-0013-0035`, one `## TC-0013-NNNN:` heading each). Both sets
are read from the pack in full, not from the rows of `.qfai/specs/spec-0013/tdd/test-list.md`. The
business rule table below carries all **20** `BR-0013-*` headings of `04_Business-Rules.md`. None
carries a status retiring it, so all twenty are active and all twenty own a row.

`Status` is a row verdict, not a mark, and is excluded from every total below. The scored cells are
the nine depth columns of the matrix and the `Positive case` / `Negative case` /
`Conditional branches` columns of the business rule table.

**What credits a cell.** A cell is credited only to a case that runs and that this pack owns. A test
existing somewhere in the repository is not coverage here. Ownership is read in two steps:

1. **An annotation binds.** A case carrying `QFAI:SPEC-0013:TC-0013-NNNN` is bound to that
   obligation. A case carrying an annotation for another spec is bound to that spec, not to this
   one, whatever it exercises — and where a plan assigns the surface to that spec, the split is
   deliberate rather than a gap here. That is the case under "The `auditProfile.ts` entrypoint".
2. **An unannotated case is owned where the obligation has no annotated one.** A case with no
   annotation at all is claimed by no other spec. Where an obligation has no annotated case
   anywhere, every unannotated case that produces its outcome is scored, and the record names all
   of them rather than the first one found. Three files are in this position, for the same two
   obligations, and the inventory below lists each with its run. What it selects is a case that
   RUNS the preflight, not one that describes it. Other unannotated cases name the surface without
   producing either outcome — asserting the wording of a shipped playbook or skill document, or
   parsing the `sdd preflight` argv without invoking it — and none of those is scored.
   `tests/cli/args.test.ts` and `tests/assets/sddStage0PrototypingOptional.test.ts` are two of them.
   The set is open and the rule decides it, so this is a rule rather than a census.

The two steps do not overlap: the first turns on an annotation pointing elsewhere, the second on
there being no annotation to point anywhere. Neither admits a case that another spec owns.

**Twenty-four of the forty-nine obligations are discharged by nothing, or by a test about something
else.** Eleven have no test at all: `US-0013-0001`, `-0002`, `-0004`, `-0005`, `-0006`, `-0007`,
`-0009`, `-0010`, and `TC-0013-0022`, `-0023`, `-0024`. Five more are discharged by substring
assertions over the shipped `qfai-sdd/SKILL.md` that carry none of the obligation they are annotated
to. Two are self-referential coverage placeholders whose annotated `describe` tests the diff
detector. Those eighteen rows carry 162 of the matrix's 287 `❌` cells between them. Six further
wording rows carry another 44.

The remaining twenty-five rows are scored on their merits and range widely. `US-0013-0014`,
`TC-0013-0035`, `TC-0013-0033` and `TC-0013-0026` are the strongest work in the pack: a closed-schema
rejection suite naming the offending field and item in every message, a ceiling exercised on both
sides with the SUT's own constant imported into the assertion, and a lane refusal required to name the
file, the screen and the rule token. `US-0013-0008` is the best-covered user story and carries no
spec-0013 annotation anywhere. `US-0013-0011` and `TC-0013-0025` are narrow, and `TC-0013-0014` …
`-0021` are a mixed group where three rows rest partly on source-text reads.

**Four obligations are fixed to the opposite of what they declare.** `TC-0013-0032`, `TC-0013-0033`,
`TC-0013-0027` and `US-0013-0013` are scored against what their tests actually do, and their `Status`
records the disagreement. A fifth, `US-0013-0003`, is covered by tests that fix its direction while
contradicting its own acceptance criterion. See Findings 1, 2, 3 and 8.

Section "Every `❌` cell, named" accounts for all 312 of them in named groups whose coordinates are
fully enumerated, so that "one justification per `❌`" is checkable rather than asserted, and section
"Every `⚠️` cell, named" does the same for all 105 partial scores, which the PASS criterion also
requires a rationale for.

## What was measured, and how

Every score below rests on a test run, not on a reading of a ledger. The sixteen files that carry
spec-0013 coverage were located by reading the tests and the source, then executed. All sixteen pass:

| File                                                          | Result     |
| ------------------------------------------------------------- | ---------- |
| `tests/integration/sddSkillSpec0013.test.ts`                  | 11 passed  |
| `tests/integration/specAutoDiscovery.test.ts`                 | 38 passed  |
| `tests/core/traceabilityIntegrity.test.ts`                    | 24 passed  |
| `tests/core/sddTriage.test.ts`                                | 46 passed  |
| `tests/core/sddPreflight.test.ts`                             | 26 passed  |
| `tests/integration/sddUiTemplate.test.ts`                     | 2 passed   |
| `tests/integration/sddPrimaryTasksLane.test.ts`               | 4 passed   |
| `tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts`         | 3 passed   |
| `tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`       | 6 passed   |
| `tests/core/activeDiscussionPack.test.ts`                     | 4 passed   |
| `tests/core/surfaceTypePopulate.test.ts`                      | 6 passed   |
| `tests/integration/primaryTasksBand.test.ts`                  | 8 passed   |
| `tests/integration/primaryTasksStructured.test.ts`            | 6 passed   |
| `tests/integration/spec0013ActivePointerSurfaceType.test.ts`  | 8 passed   |
| `tests/cli/commands/sddPreflight.test.ts`                     | 12 passed  |
| `tests/validators/importLite.test.ts`                         | 94 passed  |
|                                                               | **298**    |

Two sets are counted here and they are not the same set. Thirteen files carry a `QFAI:SPEC-0013`
annotation, and every one of them is in the table. Three carry none and are scored under step 2 of
"What credits a cell": `US-0013-0003` and `US-0013-0008` have no annotated case anywhere, and these
three are where their outcome is produced.

| File                                        | Drives                                      |
| ------------------------------------------- | ------------------------------------------- |
| `tests/core/sddPreflight.test.ts`           | `runSddPreflight` over seeded packs         |
| `tests/cli/commands/sddPreflight.test.ts`   | `runSddPreflightCommand`, the command around it |
| `tests/validators/importLite.test.ts`       | `runSddPreflight` from the import-lite entrypoint |

Their scores together are the whole of what those two stories have, which the rows for them state.
The last two files hold coverage for other packs as well; only their preflight cases bear on this
one.

Counting all three moves no cell. Every down-marked cell on the two rows was read again against
the added cases, and none rises. What the two additional files add is a second and third entry
path — the command around the function, and the import-lite entrypoint — rather than new input
shapes. Most of the down-marks turn on a shape none of the three supplies: a pack that is
incomplete and on which generation continues, an empty pack directory, a required name present as
a directory, a zero-byte required file, an unreadable `discussion-*` pack — the discussion root
being unreadable is supplied, the pack directory is not — and a sixteenth required file. The rest
turn on reasons an entry path cannot reach, chiefly these: the pairs left uncrossed under
`Combinatorial`, the required-file lists the two preflight suites declare for themselves instead of
importing the source constant, the absent incomplete-to-ready progression under `State
transitions`, and the oracle caps named below.

Six of the sixteen carry no ledger row, and are likewise scored from the pack:

- `sddTriage.test.ts` holds the whole of `TC-0013-0018` and `TC-0013-0019`.
- `spec0013ActivePointerSurfaceTypeE2E.test.ts` holds the acceptance layer of `US-0013-0012`,
  `US-0013-0013` and `US-0013-0014`, two cases each.
- Three files hold all the coverage `US-0013-0003` and `US-0013-0008` have, and the ledger names
  none of them. `tests/core/sddPreflight.test.ts` drives `runSddPreflight` over seeded discussion
  packs, `tests/cli/commands/sddPreflight.test.ts` drives the command around it, and
  `tests/validators/importLite.test.ts` drives the same function from the import-lite entrypoint.
  Neither story has an annotated case anywhere, which is what puts all three under step 2.
- `spec0013ActivePointerSurfaceType.test.ts` carries eight annotations, `TC-0013-0028` … `-0035`, and
  one case for each. It is the integration acceptance layer for all eight, and the ledger names it
  nowhere, so eight obligations draw coverage from a file no ledger row reaches. Its cases are scored
  alongside the sibling files that hold the same eight ids.

**The ledger's shape.** Thirty rows: fifteen at `exception` (`TDD-0001` … `-0015`), three at `todo`
(`TDD-0016` … `-0018`), twelve at `done` (`TDD-0019` … `-0030`). Coverage below is scored from the
test tree; an `exception` row records that an obligation was parked, which bears on the row's `Status`
and is not itself coverage. Six of the thirty selectors do not resolve — see Findings 6.

Seven negative results are load-bearing and were checked directly rather than inferred:

1. **`TC-0013-0022`, `-0023` and `-0024` have no test file.** Their ledger rows carry `—` in the
   `Test file` column, and the three ids appear nowhere in `packages/qfai/tests/**`. Their only
   occurrence in a `tests/` tree is as three annotation lines in `tests/integration/qfai-traceability.md`.
   The same holds for `US-0013-0001` … `-0010`: their only occurrence is in
   `tests/e2e/qfai-traceability.md`.
2. **`templates/contracts/ui-spec.yaml` does not exist.** `TC-0013-0032`, `BR-0013-0019`,
   `EX-0013-0019`, `AC-0013-0024`, `US-0013-0014`, `REQ-0164` and `10_Plan.md` all name it as the
   artifact the count guidance must live in. A search of `packages/qfai/assets/**` returns no file of
   that name. The guidance lives in `templates/contracts/ui-contract.sample.yaml` and in
   `references/ui-contract-guide.md`.
3. **The string `3..7` occurs nowhere in the shipped `qfai-sdd` skill.** `PRIMARY_TASKS_MAX = 7` is
   declared in `src/core/validators/designAudit.ts` with no companion minimum, and the guide states
   "no lower bound" explicitly. The band the spec declares has no implementation and no documentation.
4. **`populateSurfaceTypeIfUiCompanion` has no caller in `packages/qfai/src/**`.** The helper
   `TC-0013-0030` and `US-0013-0013` are scored against exists and is exported, and nothing invokes
   it. `surface_type` occurs once in the shipped `qfai-sdd/SKILL.md`, in a resolution sentence, and
   never as an authoring instruction. The ledger's own closing note records the same gap.
5. **`validateSurfaceTypeDrift` hard-codes `const severity = "error"`.** `TC-0013-0031`,
   `AC-0013-0023` and `BR-0013-0018` all require `warning` during the deprecation window.
6. **Neither `DO NOT` nor `Temptation` occurs anywhere in the shipped `qfai-sdd/SKILL.md`.**
   `TC-0013-0009` and `US-0013-0007` require rejected entries to include both. The
   `## Delta Rejected Guard (Mandatory)` section the covering test asserts the presence of is a single
   line delegating to `constitution/shared-skill-operating-baseline.md`, which no test reads.
7. **The shipped `ui-contract.sample.yaml` ships filled `primary_tasks`, not `primary_tasks: []`.**
   `TC-0013-0025`, `BR-0013-0015` and `EX-0013-0015` require the literal empty-array slot. The
   template ships two structured `{id, label, acceptance}` entries per screen, and
   `primaryTasksBand.test.ts` separately requires `screen.primaryTasks.length` to be greater than
   zero on that same file. An empty slot would fail the `QFAI-AUD-001` lane the same pack mandates.

### The `auditProfile.ts` entrypoint

Four obligations name a module no spec-0013 case imports. `US-0013-0014`, `TC-0013-0034`,
`TC-0013-0035` and `BR-0013-0020` each require **`auditProfile.ts`** to accept both the legacy
string-only and the structured `{id, label, acceptance}` `primary_tasks` item shapes during the
deprecation window; `AC-0013-0025` and `01_Spec.md` REQ-0164 use the same name. Every
spec-0013-annotated case that scores those four rows calls `validateDesignAudit` from
`designAudit.ts` instead. `auditProfile.ts` re-exports that function and adds `runAuditProfile` as a
pass-through; two test files in the repository import it, and neither carries a spec-0013 annotation.

The entrypoint is exercised, by a sibling pack. Two suites drive `runAuditProfile` over eight cases
and all eight pass:

```text
$ cd packages/qfai && npx vitest run \
    tests/unit/core/validators/auditProfileDualShape.test.ts \
    tests/unit/core/validators/auditProfileBandReject.test.ts --reporter=verbose
 ✓ |unit| tests/unit/core/validators/auditProfileBandReject.test.ts > TC-0004-0070: QFAI-AUD-020 ceiling warn + missing acceptance reject (error/boundary) > 9 primary_tasks fires QFAI-AUD-020 (warning) naming the ceiling
 ✓ |unit| tests/unit/core/validators/auditProfileBandReject.test.ts > TC-0004-0070: QFAI-AUD-020 ceiling warn + missing acceptance reject (error/boundary) > structured primary_task missing 'acceptance' is rejected (QFAI-AUD-021 error)
 ✓ |unit| tests/unit/core/validators/auditProfileBandReject.test.ts > TC-0004-0070: QFAI-AUD-020 ceiling warn + missing acceptance reject (error/boundary) > count exactly 7 (the ceiling) does NOT trigger QFAI-AUD-020
 ✓ |unit| tests/unit/core/validators/auditProfileBandReject.test.ts > TC-0004-0070: QFAI-AUD-020 ceiling warn + missing acceptance reject (error/boundary) > a single primary_task does NOT trigger QFAI-AUD-020
 ✓ |unit| tests/unit/core/validators/auditProfileDualShape.test.ts > TC-0004-0069: auditProfile accepts string-only AND structured primary_tasks (normal) > string-only primary_tasks (legacy) pass during the deprecation window
 ✓ |unit| tests/unit/core/validators/auditProfileDualShape.test.ts > TC-0004-0069: auditProfile accepts string-only AND structured primary_tasks (normal) > structured {id,label,acceptance} primary_tasks (closed schema) pass
 ✓ |unit| tests/unit/core/validators/auditProfileDualShape.test.ts > TC-0004-0069: auditProfile accepts string-only AND structured primary_tasks (normal) > mixed sibling contracts (one string-only + one structured) both pass simultaneously
 ✓ |unit| tests/unit/core/validators/auditProfileDualShape.test.ts > TC-0004-0069: auditProfile accepts string-only AND structured primary_tasks (normal) > auditProfile.runAuditProfile delegates to validateDesignAudit (same observable behavior)

 Test Files  2 passed (2)
      Tests  8 passed (8)
```

They carry `QFAI:SPEC-0004:TC-0004-0069` and `QFAI:SPEC-0004:TC-0004-0070`, so the crediting rule
binds them to spec-0004 and they raise no cell here. That is the split `10_Plan.md` writes down:
"Validator-implementation side is shared with spec-0004 (Source REQ-0164); this slice owns the SDD
authoring + doc + template surface." The last of the eight is the seam itself — it feeds one contract
to both entrypoints and requires the same finding codes back — so the two surfaces are held together
by a spec-0004 case, not by a spec-0013 one.

Read against those eight cases, **every scored cell of the four rows keeps its mark**. Each mark turns
on something none of the eight changes: either a fixture shape none of them supplies — a `null` item,
an empty map, a field present but not a string, a count of 0, one list carrying a legacy string, a
complete structured item and an incomplete one at once, a second state in one workspace — or a
discriminator that a sibling row of this pack owns rather than the scored row. None turns on which
module the fixture is fed to. No cell here is `❌` or `⚠️` for want of a run against
`auditProfile.ts`, and none is raised because one exists elsewhere.

### Annotation coverage

The repository's ATDD scan reads two prose files and no tests. Its report lands under `.qfai/report/`,
which the repository ignores in full, so the commands that produce the numbers stand in place of a
path nobody can open.

The scan's globs are `tests/{e2e,api,integration}/**/*.{feature,markdown,md,ts}`. The repo-root
`tests/` tree holds two files in all, and both are annotation carriers:

```text
$ find tests -type f
tests/e2e/qfai-traceability.md
tests/integration/qfai-traceability.md
```

The package's real suite lives at `packages/qfai/tests/**`, which no glob reaches, so none of its 700
test files is scanned. Every obligation in this pack is therefore reported `coveredByCarrierOnly`,
and none is reported missing:

```text
$ node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on never
$ node -e 'const s=require("./.qfai/report/atdd-traceability/summary.json");
  const p=i=>i.startsWith("SPEC-0013:");
  console.log(JSON.stringify({matchedFileCount:s.scan.matchedFileCount,
    carrierOnlyTc:s.coveredByCarrierOnly.tc.filter(p).length,
    carrierOnlyUs:s.coveredByCarrierOnly.us.filter(p).length,
    missingTc:s.missing.tc.filter(p).length, missingUs:s.missing.us.filter(p).length,
    excludedUnitComponentTc:s.excludedUnitComponentTc.filter(p).length,
    tcCensus:s.tcCensus.find(e=>e.spec==="0013")},null,1))'
{
 "matchedFileCount": 2,
 "carrierOnlyTc": 35,
 "carrierOnlyUs": 14,
 "missingTc": 0,
 "missingUs": 0,
 "excludedUnitComponentTc": 0,
 "tcCensus": {
  "spec": "0013",
  "declared": 35,
  "exempt": 0,
  "owed": 35
 }
}
```

All thirty-five `TC-0013-*` and all fourteen `US-0013-*` sit under `coveredByCarrierOnly`, `missing`
holds nothing from this spec, and `tcCensus` records `{declared: 35, exempt: 0, owed: 35}`.

`excludedUnitComponentTc` holds no spec-0013 entry, so no row in this pack is exempt from the
annotation obligation — the eleven rows that declare `Level: integration` owe it explicitly, and the
twenty-four rows that declare no `Level` at all are treated as owing it too. This is a repo-wide
condition that no work inside this pack can clear. It is stated once here rather than repeated per
row, and it caps every row's `Status` at `⚠️`.

### Skipped tests

`QFAI-TEST-003` reports **16 skipped tests** in this pack's recorded scope. The report of a
spec-scoped run lands under the ignored `.qfai/report/` as well, so the finding is reproduced here by
the run that raises it. `tdd` is the profile that carries the stub gate over the package suite; the
sixteen sit in eight files, all `describe.skip`:

```text
$ node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec 0013 --fail-on never \
    | grep -oP '^\[error\] QFAI-TEST-003 Skipped test found: \K\S+ at [^:]+' | sort | uniq -c
      3 describe.skip at packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts
      3 describe.skip at packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts
      1 describe.skip at packages/qfai/tests/e2e/spec0008AtddScaffoldE2E.test.ts
      1 describe.skip at packages/qfai/tests/e2e/spec0014SaasPackageCertifyE2E.test.ts
      3 describe.skip at packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts
      3 describe.skip at packages/qfai/tests/integration/spec0006DoctorRemediation.test.ts
      1 describe.skip at packages/qfai/tests/integration/spec0008AtddScaffold.test.ts
      1 describe.skip at packages/qfai/tests/integration/spec0014SaasPackageCertify.test.ts
```

**No spec-0013 obligation depends on a skipped test.** All sixteen belong to spec-0004, spec-0006,
spec-0008 and spec-0014. None of the sixteen files that carry spec-0013 coverage contains a `.skip`,
`.only` or `.todo` modifier of any kind, and all 298 of their cases ran. The sixteen findings are
in this pack's *report* scope because the validator scans the whole test tree; they are not in its
*coverage* scope, and they contribute to no cell in this matrix.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0013-0001 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0002 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0003 | ⚠️                     | ✅          | ✅         | ⚠️         | ⚠️              | ⚠️             | ⚠️                | ⚠️            | ⚠️              | ❌     |
| US-0013-0004 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0005 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0006 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0007 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0008 | ✅                     | ✅          | ✅         | ⚠️         | ⚠️              | ✅             | ⚠️                | ⚠️            | ⚠️              | ⚠️     |
| US-0013-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0010 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0013-0011 | ✅                     | ✅          | ✅         | ⚠️         | ⚠️              | ❌             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| US-0013-0012 | ⚠️                     | ✅          | ✅         | ⚠️         | ❌              | ❌             | ❌                | ⚠️            | ✅              | ⚠️     |
| US-0013-0013 | ✅                     | ✅          | ✅         | ⚠️         | ⚠️              | ❌             | ✅                | ⚠️            | ⚠️              | ❌     |
| US-0013-0014 | ✅                     | ✅          | ✅         | ⚠️         | ⚠️              | ⚠️             | ❌                | ⚠️            | ✅              | ❌     |
| TC-0013-0001 | ❌                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0002 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0003 | ⚠️                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| TC-0013-0004 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0005 | ❌                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0006 | ❌                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0007 | ❌                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| TC-0013-0008 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0009 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0010 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0011 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0012 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0013 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0014 | ⚠️                     | ✅          | ⚠️         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0015 | ✅                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ✅              | ⚠️     |
| TC-0013-0016 | ✅                     | ✅          | ❌         | ❌         | ❌              | ⚠️             | ❌                | ❌            | ✅              | ⚠️     |
| TC-0013-0017 | ⚠️                     | ✅          | ❌         | ❌         | ⚠️              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0018 | ⚠️                     | ✅          | ❌         | ✅         | ❌              | ⚠️             | ❌                | ⚠️            | ✅              | ⚠️     |
| TC-0013-0019 | ⚠️                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0020 | ⚠️                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0021 | ⚠️                     | ✅          | ⚠️         | ❌         | ⚠️              | ❌             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| TC-0013-0022 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0023 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0024 | ❌                     | ❌          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| TC-0013-0025 | ⚠️                     | ✅          | ❌         | ⚠️         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0026 | ✅                     | ✅          | ✅         | ⚠️         | ✅              | ⚠️             | ❌                | ⚠️            | ✅              | ⚠️     |
| TC-0013-0027 | ✅                     | ✅          | ❌         | ⚠️         | ⚠️              | ⚠️             | ❌                | ⚠️            | ⚠️              | ❌     |
| TC-0013-0028 | ⚠️                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ⚠️     |
| TC-0013-0029 | ⚠️                     | ✅          | ✅         | ⚠️         | ❌              | ❌             | ❌                | ⚠️            | ✅              | ⚠️     |
| TC-0013-0030 | ✅                     | ✅          | ❌         | ⚠️         | ⚠️              | ❌             | ✅                | ⚠️            | ⚠️              | ❌     |
| TC-0013-0031 | ✅                     | ✅          | ✅         | ⚠️         | ❌              | ❌             | ❌                | ⚠️            | ⚠️              | ❌     |
| TC-0013-0032 | ⚠️                     | ⚠️          | ❌         | ❌         | ❌              | ❌             | ❌                | ⚠️            | ⚠️              | ❌     |
| TC-0013-0033 | ✅                     | ✅          | ✅         | ⚠️         | ⚠️              | ⚠️             | ❌                | ⚠️            | ✅              | ❌     |
| TC-0013-0034 | ✅                     | ✅          | ❌         | ❌         | ❌              | ❌             | ❌                | ⚠️            | ⚠️              | ⚠️     |
| TC-0013-0035 | ✅                     | ✅          | ✅         | ✅         | ⚠️              | ⚠️             | ❌                | ⚠️            | ✅              | ⚠️     |

Totals across the nine scored depth columns, 441 cells (49 rows × 9): **✅ 64 / ⚠️ 90 / ❌ 287**.

`Status` is the row verdict and is not a scored cell, so it is excluded from that total and from the
grand total at the end. Its distribution across the 49 rows, for reading only, is ✅ 0 / ⚠️ 17 /
❌ 32. No row reaches `Status = ✅`; every row is capped by the carrier-only condition described
above.

Per scored depth column, 49 cells each:

| Column                 | ✅  | ⚠️  | ❌  |
| ---------------------- | --- | --- | --- |
| Equivalence partitions | 13  | 13  | 23  |
| Normal path            | 25  | 6   | 18  |
| Error path             | 11  | 3   | 35  |
| Edge cases             | 2   | 13  | 34  |
| Boundary values        | 1   | 11  | 37  |
| Special values         | 1   | 8   | 40  |
| State transitions      | 2   | 2   | 45  |
| Combinatorial          | 0   | 17  | 32  |
| Oracle strength        | 9   | 18  | 22  |

The shape of that table is the pack's central fact: twenty-five rows have a passing normal path, two
rows in the whole pack observe a state transition, one row exercises a boundary in both directions,
and no row reaches `✅` on combinatorial coverage. Coverage here is wide at the happy path and thin
everywhere the checklist asks for depth.

### Business rule coverage

One row per active `BR-0013-*`. All twenty headings in `04_Business-Rules.md` are active, so none is
omitted.

`Covering TC` is derived from the `BR-Ref` of the example each test case cites — that is, from
`06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`. That route is stated by the pack itself
and is exactly one-to-one: each of the twenty `BR-0013-*` owns one `EX-0013-*`, and every `EX-0013-*`
is cited by at least one `TC-0013-*`. The other derivation route, each rule's own `AC-Refs`, is
**broken for five of the twenty rules** and is not used here; see Findings 7.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                     | Status |
| ------------ | ------------- | ------------- | -------------------- | ----------------------------------------------- | ------ |
| BR-0013-0001 | ⚠️            | ❌            | n/a                  | TC-0013-0001, -0002, -0005, -0007, -0008, -0021 | ❌     |
| BR-0013-0002 | ⚠️            | ❌            | ⚠️                   | TC-0013-0004, TC-0013-0006                      | ❌     |
| BR-0013-0003 | ⚠️            | ⚠️            | ⚠️                   | TC-0013-0003                                    | ❌     |
| BR-0013-0004 | ❌            | ❌            | n/a                  | TC-0013-0011                                    | ❌     |
| BR-0013-0005 | ❌            | ❌            | ❌                   | TC-0013-0012                                    | ❌     |
| BR-0013-0006 | ❌            | ❌            | n/a                  | TC-0013-0009                                    | ❌     |
| BR-0013-0007 | ❌            | ❌            | n/a                  | TC-0013-0010                                    | ❌     |
| BR-0013-0008 | ❌            | ❌            | n/a                  | TC-0013-0013                                    | ❌     |
| BR-0013-0009 | ✅            | ✅            | n/a                  | TC-0013-0018, TC-0013-0019                      | ⚠️     |
| BR-0013-0010 | ✅            | ⚠️            | ⚠️                   | TC-0013-0014, -0015, -0016, -0017               | ⚠️     |
| BR-0013-0011 | ✅            | ❌            | n/a                  | TC-0013-0020                                    | ❌     |
| BR-0013-0012 | ❌            | ❌            | ❌                   | TC-0013-0022                                    | ❌     |
| BR-0013-0013 | ❌            | ❌            | ❌                   | TC-0013-0023                                    | ❌     |
| BR-0013-0014 | ❌            | ❌            | ❌                   | TC-0013-0024                                    | ❌     |
| BR-0013-0015 | ✅            | ❌            | ❌                   | TC-0013-0025                                    | ❌     |
| BR-0013-0016 | ✅            | ✅            | ❌                   | TC-0013-0026, TC-0013-0027                      | ❌     |
| BR-0013-0017 | ✅            | ✅            | ⚠️                   | TC-0013-0028, TC-0013-0029                      | ⚠️     |
| BR-0013-0018 | ⚠️            | ✅            | ❌                   | TC-0013-0030, TC-0013-0031                      | ❌     |
| BR-0013-0019 | ⚠️            | ⚠️            | ❌                   | TC-0013-0032, TC-0013-0033                      | ❌     |
| BR-0013-0020 | ✅            | ✅            | ⚠️                   | TC-0013-0034, TC-0013-0035                      | ⚠️     |

Totals across the three scored columns, 60 cells: **✅ 12 / ⚠️ 13 / n/a 7 / ❌ 28**.

`Status` here is likewise a row verdict and is not counted. Its distribution across the 20 rows is
✅ 0 / ⚠️ 4 / ❌ 16.

`n/a` is used seven times in the `Conditional branches` column, for `BR-0013-0001`, `-0004`, `-0006`,
`-0007`, `-0008`, `-0009` and `-0011`. Each states its rule unconditionally — "MUST follow",
"MUST happen after", "MUST include", "is SSOT", "MUST include a `Type` column", "MUST agree", "MUST be
exported … AND MUST be imported" — so there is no branch to cover. It is not used anywhere an
obligation exists and is unmet. The remaining thirteen rules each state at least one condition and
are scored.

`BR-0013-0019` was in that list and is not unconditional. "The recommended band is 3..7" names two
boundaries and the rule has a direction on each side, which is why the `⚠️` census for this row
records the over-ceiling direction firing while the under-floor direction is exercised with the
opposite verdict. An `n/a` there read a rule with an unmet branch as a rule with no branch.

A row's `Status` is `❌` whenever either scored direction is `❌`, and may be `❌` with both at `⚠️`
when the reason is stated. No row reaches `✅`.

## Every ❌ cell, named

The matrix carries **287** `❌` scored cells and the business rule table carries **28** — **315 in
all**. They are accounted for below in six groups. Every group names every coordinate it covers and
states its count, and the six counts sum to 312:

| Group                                                             | Cells   |
| ----------------------------------------------------------------- | ------- |
| 1. Eleven obligations with no test at all                         | 99      |
| 2. Five wording rows whose assertion carries none of the obligation | 45    |
| 3. Two placeholder rows whose test has another subject            | 18      |
| 4. Six wording rows that address their direction and nothing else  | 45     |
| 5. Remaining scored cells of the twenty-five tested rows           | 80     |
| 6. Business rule scored columns                                   | 28      |
| **Total**                                                         | **315** |

### Group 1 — eleven obligations with no test at all (99 cells)

Coordinates: `US-0013-0001`, `US-0013-0002`, `US-0013-0004`, `US-0013-0005`, `US-0013-0006`,
`US-0013-0007`, `US-0013-0009`, `US-0013-0010`, `TC-0013-0022`, `TC-0013-0023` and `TC-0013-0024`,
each × all nine scored columns (`Equivalence partitions`, `Normal path`, `Error path`, `Edge cases`,
`Boundary values`, `Special values`, `State transitions`, `Combinatorial`, `Oracle strength`).
11 × 9 = **99**.

The eight user stories appear only in `tests/e2e/qfai-traceability.md`, the annotation carrier. The
three test cases are `todo` in the ledger under `DR-NOTE-3` with `—` in their `Test file` column.
Nothing in `packages/qfai/tests/**` names any of the eleven.

The cause is one with several faces:

- `US-0013-0001`, `-0002`, `-0004`, `-0005` and `-0007` name outcomes of running `/qfai-sdd`: layered
  artifacts produced from a pack, contracts written before slices, a no-argument invocation
  processing every capability, required-edge completeness enforced, and a delta carrying `DO NOT` and
  `Temptation`. No test invokes the skill or reads its output.
- `US-0013-0006` names a gate: validate passing with `error = 0` before SDD completion. `runValidate`
  is driven once in the repository under a spec-0013 annotation, in the `US-0013-0011` e2e, and that
  case requires a **non-zero** exit; its sibling explicitly allows other validators to error while
  filtering for one code. No case anywhere requires an overall error count of zero, and nothing
  observes an SDD completion.
- `US-0013-0009`, `TC-0013-0022` name a Phase 0 step performed by an agent following `SKILL.md`, not
  by any function a test can call. The lock file's reader, `readDesignMdLockSha` in
  `src/core/design/designMdLock.ts`, exists and is exercised by other specs' tests; the writer is
  prose. The obligation also names fields the product does not use — see Findings 5.
- `US-0013-0010`, `TC-0013-0023`, `TC-0013-0024` assert properties of `_policies/05_Contracts.md`, a
  document in this repository's own tree. Nothing reads that document in any test.

Per column, the reason each cell is `❌` rather than `⚠️`, stated once for all eleven rows:

- **Equivalence partitions** — no artifact, pack or invocation is classified by anything, so the
  compliant and violating partitions each row names are both unrepresented as inputs.
- **Normal path** — each row's own direction is an artifact produced, a gate passed, a lock written,
  a legacy set absent, or an index matching a closed set. None is produced or read. Unlike the wording
  rows in Groups 2 and 4, there is not even an assertion addressing the direction.
- **Error path** — each row has a failure direction and none is exercised: a pack that cannot produce
  artifacts, contracts written after slices, a capability list that cannot be processed, an incomplete
  edge chain, a rejection missing its guardrails, a non-zero validate error count, a missing
  `DESIGN.md` halting Phase 0, and an extra active row triggering a contract-index finding.
- **Edge cases** — an unreadable `DESIGN.md`, a legacy contract named only in `09_delta.md` (which
  `BR-0013-0013` explicitly tolerates), an empty capability list, and an active index missing a
  required member are all untested.
- **Boundary values** — the ordered and enumerated domains here are real and none is exercised at an
  edge: the sha256 hex domain, the six-member legacy set, the five-member active set, the
  five-link edge chain `US->AC->BR->EX->TC`, and the capability count that `BR-0013-0007` makes SSOT
  for `spec-0001..N` assignment.
- **Special values** — no empty, absent or malformed `DESIGN.md`, lock yaml, contract index,
  capability list or discussion pack is supplied.
- **State transitions** — the SDD stage sequence is this pack's central state machine, and the
  freeze-then-drift progression `US-0013-0009` exists to enable and the legacy-present to
  legacy-absent migration `US-0013-0010` describes are its sharpest instances. None is observed.
- **Combinatorial** — nothing is crossed with anything, because nothing runs.
- **Oracle strength** — there is no assertion of any kind whose mutation could redden these rows.

### Group 2 — five wording rows whose assertion carries none of the obligation (45 cells)

Coordinates: `TC-0013-0002`, `TC-0013-0004`, `TC-0013-0008`, `TC-0013-0009` and `TC-0013-0010`, each
× all nine scored columns. 5 × 9 = **45**.

All five are discharged by `tests/integration/sddSkillSpec0013.test.ts`, which reads the shipped
`assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md` and asserts substrings against it. All five
ledger rows are `exception` under `DR-0013-0001`, whose rationale is that the requirements "exist as
structure in SKILL.md". They are separated from Group 4 because in these five the asserted string
names an artifact without carrying the obligation, so not even the `Normal path` cell can be `⚠️`:

- `TC-0013-0002` — asserts `SKILL.md` contains `"Contract Index"` and `"05_Contracts.md"`. The
  obligation is that every indexed ID maps to a declared file. Two artifact names are not a mapping
  rule, and nothing maps anything.
- `TC-0013-0004` — asserts `/[Ss]lice gate/`. The obligation is the five required edges
  `US->AC->BR->EX->TC`. A two-word regular expression carries none of them; not one edge name appears
  in any assertion.
- `TC-0013-0008` — asserts `SKILL.md` contains `"04_Business-Flow.md"` and matches `/[Mm]ermaid/`.
  The obligation is that `_policies/04_Business-Flow.md` contains a Mermaid diagram. That file exists
  in this repository and carries four Mermaid blocks, and no case opens it. The test reads the wrong
  document.
- `TC-0013-0009` — asserts `SKILL.md` contains `"Delta Rejected Guard"` and matches `/rejected/i`.
  The obligation is that rejected entries include `DO NOT` and `Temptation` sections. Neither token
  occurs anywhere in that document, and the section the assertion finds is one line delegating to a
  constitution file no case reads.
- `TC-0013-0010` — asserts `SKILL.md` contains `"qfai-sdd"`. The document is that skill's own
  `SKILL.md`; the assertion is satisfied by the file's identity and by nothing else.

Per column, for all five rows:

- **Equivalence partitions** — the document is read as it stands; no input is classified, so neither
  partition of any obligation has a representative.
- **Normal path** — see the per-row reasons above: the assertion does not address the direction.
- **Error path** — an indexed contract ID with no file, a slice missing a required edge, a Business
  Flow with no Mermaid block, a rejection missing its guardrails, and a capability reordering treated
  as a Change Request are all unexercised.
- **Edge cases** — no artifact is supplied in a marginal shape; every assertion reads one shipped
  document in one state.
- **Boundary values** — no count, length, date or ordered position is exercised at any edge.
- **Special values** — no empty, absent, truncated or unreadable artifact is supplied.
- **State transitions** — no stage sequence, no migration and no multi-step process is observed.
- **Combinatorial** — each assertion stands alone; no two conditions are crossed, and the five
  describes share no fixture.
- **Oracle strength** — each assertion is a token or short regular expression over prose with no tie
  to any code path, constant or artifact, and `TC-0013-0010`'s is satisfied by the file's own path
  component. No mutation of the behaviour any row names could redden any of them.

### Group 3 — two placeholder rows whose test has another subject (18 cells)

Coordinates: `TC-0013-0011` and `TC-0013-0012`, each × all nine scored columns. 2 × 9 = **18**.

Each has a `describe` in `tests/integration/specAutoDiscovery.test.ts` named for its id and carrying
its `QFAI:SPEC-0013` annotation. In both cases the describe's subject is the traceability validator,
and in both the ledger selector fails to resolve because it quotes the spec's title rather than the
describe's:

| Obligation     | What `06_Test-Cases.md` declares                          | What the annotated describe asserts                      |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `TC-0013-0011` | migrated example `EX-0013-0006` is covered by a test case | spec BR changed + impl changed emits no `QFAI-TRACE-001` |
| `TC-0013-0012` | migrated example `EX-0013-0007` is covered by a test case | a missing traceability ledger emits `QFAI-TRACE-002`     |

Both are self-referential coverage placeholders: their stated direction is that an example is
covered, which the pack satisfies by declaring them and which no test can observe.
`06_Test-Cases.md` states the standard against itself in its own retracted-placeholder comment — "a
coverage placeholder without an actual test does not legitimately satisfy the BR (it would weaken the
rule by precedent)" — and these two rows are exactly that.

Per column, for both rows:

- **Equivalence partitions** — no input of the declared kind is constructed; the inputs the annotated
  describes classify belong to the traceability validator.
- **Normal path** — the direction each declares is a property of the specification pack, and nothing
  evaluates the pack.
- **Error path** — neither declares a failure direction that any case produces.
- **Edge cases**, **Boundary values**, **Special values**, **State transitions**, **Combinatorial** —
  none of the five is reachable for an obligation whose subject is untested; no input is supplied at
  an edge, at a limit, as a special value, across a transition, or in combination.
- **Oracle strength** — the passing assertions in each annotated describe are sensitive to the
  traceability validator and to nothing these rows name. No mutation of the obligation's own subject
  reddens either.

### Group 4 — six wording rows that address their direction and nothing else (44 cells)

These six have a `Normal path` or `Error path` cell above `❌` because the asserted string is the
sentence that carries the obligation, rather than a token naming an artifact. Everything else is
`❌` for the reasons that follow.

| Row            | `❌` columns                              | Count |
| -------------- | ----------------------------------------- | ----- |
| `TC-0013-0001` | EP, ER, ED, BV, SV, ST, CO, OS            | 8     |
| `TC-0013-0003` | ED, BV, SV, ST, CO                        | 5     |
| `TC-0013-0005` | EP, ER, ED, BV, SV, ST, CO, OS            | 8     |
| `TC-0013-0006` | EP, ER, ED, BV, SV, ST, CO, OS            | 8     |
| `TC-0013-0007` | EP, ER, ED, BV, SV, ST, CO                | 7     |
| `TC-0013-0013` | EP, NP, ER, ED, BV, SV, ST, CO, OS        | 9     |
|                |                                           | **45** |

- **`Normal path`** (1 cell: `TC-0013-0013`) — the row's only credit was an assertion in
  `tests/assets/testCaseLevelColumn.test.ts`, a file written for the `Level` column that carries no
  spec-0013 annotation. It cannot be credited: step 2 of "What credits a cell" reaches an
  unannotated case only where the obligation has no annotated one anywhere, and `TC-0013-0013` has
  one — `specAutoDiscovery.test.ts` carries `QFAI:SPEC-0013:TC-0013-0013`. The file is also absent
  from the run inventory, so nothing established it passes in this measurement either. With that
  credit withdrawn the row has no case at all, and its second clause — each AC having at least one
  non-normal case — was already asserted by nothing.
- **`Equivalence partitions`** (5 cells: `TC-0013-0001`, `-0005`, `-0006`, `-0007`, `-0013`) — the
  documents are read as they stand, so the compliant and violating partitions each obligation implies
  have no representative on either side.
- **`Error path`** (5 cells: the same five rows) — an out-of-order phase run, a plan finalized before
  the gate, an upper-to-lower reference detected and reported, a non-zero validate error count, and a
  template lacking the `Type` column are each the failure direction of a row and none is produced.
- **`Edge cases`** (6 cells, all six rows) — no pack, artifact, slice or template is supplied in a
  marginal shape.
- **`Boundary values`** (6 cells, all six rows) — the ordered domains are real and untouched. Phase
  order is a sequence of five and no assertion checks ordering. The required-edge chain has five
  links and none is exercised at its ends. The validate error count is never counted.
- **`Special values`** (6 cells, all six rows) — the shipped `SKILL.md` is read as it stands in every
  case; no empty, absent, truncated or unreadable artifact is supplied.
- **`State transitions`** (6 cells, all six rows) — this is the group's sharpest gap.
  `TC-0013-0001` and `TC-0013-0005` both state an ordering obligation and neither observes an order;
  `TC-0013-0003`'s pack-incomplete to pack-ready progression is observed by nothing.
- **`Combinatorial`** (6 cells, all six rows) — each assertion stands alone; no two conditions are
  crossed anywhere in the file, and the eleven cases share no fixture.
- **`Oracle strength`** (4 cells: `TC-0013-0001`, `-0005`, `-0006`, `-0013`) — no mutation of the
  behaviour the row names could redden the assertion. `SKILL.md` does state the phase order in one
  line, and `TC-0013-0001`'s six assertions are `/phase order/i` plus five independent `toContain`
  calls; deleting or scrambling that line leaves all six green, because the five words occur
  throughout a document of several hundred lines. `TC-0013-0005`'s `/slice.*plan|Plan.*finalize/i`
  passes on any line containing "Plan" before "finalize". `TC-0013-0006`'s `/lower-to-upper/` and
  `TC-0013-0013`'s describe are the same shape.

### Group 5 — remaining scored cells of the twenty-five tested rows (80 cells)

**5a. `State transitions`, 21 cells.** Coordinates: `US-0013-0011`, `US-0013-0012`, `US-0013-0014`,
`TC-0013-0014`, `-0015`, `-0016`, `-0017`, `-0018`, `-0019`, `-0020`, `-0021`, `-0025`, `-0026`,
`-0027`, `-0028`, `-0029`, `-0031`, `-0032`, `-0033`, `-0034`, `-0035`.

One cause, four faces:

1. **Single-evaluation obligations.** `TC-0013-0014`, `-0015`, `-0016`, `-0017`, `-0020`, `-0028`,
   `-0032`, `-0034` each evaluate one input once. A diff result, a policy predicate, a config read, a
   wiring check, a pointer resolution, a documentation read and a shape acceptance have no state
   machine, and none is established by any fixture.
2. **Transitions the obligation names and no case observes.** `US-0013-0011`, `TC-0013-0026` and
   `TC-0013-0027` rest on `EX-0013-0016`, which states the progression explicitly: the lane refuses,
   then "populating `primary_tasks: [...]` passes the lane and unblocks `/qfai-prototyping`". The two
   states are two separate `mkdtemp` workspaces; no case mutates one workspace and re-runs.
   `TC-0013-0031` names the deprecation-window sunset and no case sits on either side of it as a
   transition. `US-0013-0012` and `TC-0013-0029` name the recovery path `qfai discussion use <id>`
   and no case runs it and re-resolves. `US-0013-0014`, `TC-0013-0033` and `TC-0013-0035` never cross
   the ceiling or the window boundary within one workspace; each count is a fresh directory.
3. **Round trips treated as one step.** `TC-0013-0018` and `TC-0013-0019` perform render → parse once
   per case. The idempotency property that would make it a transition — `render(parse(render(x)))`
   equalling `render(x)` — is asserted nowhere.
4. **Artifact states never sequenced.** `TC-0013-0021` reads one evidence file in one format;
   `TC-0013-0025` reads one template in one state. Neither observes the old-to-new progression its
   own text is written around.

**5b. `Special values`, 16 cells.** Coordinates: `US-0013-0011`, `US-0013-0012`, `US-0013-0013`,
`TC-0013-0014`, `-0015`, `-0017`, `-0019`, `-0020`, `-0021`, `-0025`, `-0028`, `-0029`, `-0030`,
`-0031`, `-0032`, `-0034`.

One cause across all sixteen: every fixture writes well-formed input, and no `null`, empty, absent,
zero-byte or wrong-typed value is fed to any SUT.

- `TC-0013-0014`, `TC-0013-0017`, `TC-0013-0021` — no empty or malformed evidence file; a git throw is
  arranged by the mock rather than supplied as data.
- `TC-0013-0015` — no empty git output, no `null`, no output with only a trailing newline.
- `TC-0013-0019`, `TC-0013-0020` — no empty string cell; no empty or absent source file. An absent
  `validate.ts` would throw out of `readFile`, which is a guard, not a supplied special value.
- `US-0013-0011`, `TC-0013-0025`, `TC-0013-0032` — the shipped artifacts are read as they stand, and
  no null, empty, absent or non-YAML UI contract is fed to the lane.
- `US-0013-0012`, `TC-0013-0028`, `TC-0013-0029` — no empty `state.json`, no malformed JSON, no
  `currentId: ""`, no `currentId: null`.
- `US-0013-0013`, `TC-0013-0030`, `TC-0013-0031` — no empty `01_Spec.md`, no file without frontmatter
  delimiters, no companion that is not valid YAML. `validateSurfaceTypeDrift`'s own
  `body.length === 0` skip branch and its `specId === "0000"` skip branch are both unreachable from
  any fixture in the pack.
- `TC-0013-0034` — no `null` item, no empty map, no field present but not a string.

**5c. `Boundary values`, 13 cells.** Coordinates: `US-0013-0012`, `TC-0013-0014`, `-0015`, `-0016`,
`-0018`, `-0019`, `-0020`, `-0025`, `-0028`, `-0029`, `-0031`, `-0032`, `-0034`.

- `TC-0013-0014`, `-0015`, `-0016`, `-0020`, `-0028` — the obligations have no numeric, date, length
  or ordered domain under test, and the counts they do carry are never exercised at an edge.
  `TC-0013-0014` asserts `entries: expect.any(Array)`, which is satisfied at every length including
  zero.
- `TC-0013-0018`, `TC-0013-0019` — no empty cell, no single-character cell, no cell that is exactly
  the escape character, and no maximum-length cell. The string domain's edges are untouched on both.
- `TC-0013-0025` — the row's only count is "≥ 1 primary_task per screen", asserted as a regular
  expression over the agent guide's prose rather than as a count over the template.
- `US-0013-0012`, `TC-0013-0029` — the candidate count is an ordered domain exercised at 3, at 2 and
  at 1, and never at 0, which is the value at which "name the candidate dirs" has nothing to name and
  the message's construction would break. All three counts sit in the interior; the one edge that
  changes the message's shape has no case.
- `TC-0013-0031` — the deprecation window is a temporal boundary and the case asserts one hard-coded
  severity on one side of it.
- `TC-0013-0032` — the row is the documentation half; nothing in it sits at a limit.
- `TC-0013-0034` — every fixture for this row, the mixed list included, carries exactly three entries
  and so sits mid-range by construction. One case's own name calls that "within band", a band that no
  longer exists in the product.

**5d. `Error path`, 12 cells.** Coordinates: `TC-0013-0015`, `-0016`, `-0017`, `-0018`, `-0019`,
`-0020`, `-0025`, `-0027`, `-0028`, `-0030`, `-0032`, `-0034`.

- `TC-0013-0015`, `TC-0013-0016` — both drive their SUT with a working mock or a well-formed yaml. No
  case supplies a git failure to `detectPolicyChanges`, and none supplies a malformed, absent or
  unreadable `qfai.config.yaml` to `loadConfig`. The `false` and `undefined` results that are
  asserted are the negative *partition*, not an error.
- `TC-0013-0017` — the row is the forward-compat direction; nothing supplies evidence the parser
  genuinely cannot read and requires a report rather than a throw.
- `TC-0013-0018`, `TC-0013-0019` — `BR-0013-0009`'s prohibition ("re-introducing `\` doubling … is
  forbidden") has no planted violation. No case constructs a malformed row, a cell-count mismatch, or
  any input required to be rejected.
- `TC-0013-0020` — no fixture removes the barrel export or the call site and requires the assertion to
  fire. Both halves are read from the real tree in its compliant state.
- `TC-0013-0025` — no slot-less template is constructed and required to fail the per-screen loop.
- `TC-0013-0027` — the row declares its own error direction as *non-blocking*: "Pre-existing UI
  contracts that predate the slot are treated under deprecation-window semantics (informational,
  non-blocking) — covered as a boundary sub-case within the same test file". The sub-case exists and
  requires the opposite: it is named "legacy slot-less contracts emit QFAI-AUD-001 at severity=error
  (past sunset)" and asserts `audit001.filter((issue) => issue.severity === "info")).toEqual([])`.
  The declared direction is contradicted, not covered. See Findings 3.
- `TC-0013-0028` — the failure direction belongs to `TC-0013-0029`; within this row nothing fails.
- `TC-0013-0030` — no unwritable `01_Spec.md`, no absent spec file, and no spec with no frontmatter
  fence is supplied to `populateSurfaceTypeIfUiCompanion`.
- `TC-0013-0032` — nothing plants a document missing the sentence and requires the assertion to fire,
  and no count on the declared floor side is required to warn.
- `TC-0013-0034` — the rejection direction belongs to `TC-0013-0035`; within this row nothing fails,
  in either covering file. The mixed list is asserted accepted, not rejected.

**5e. `Edge cases`, 10 cells.** Coordinates: `TC-0013-0014`, `-0015`, `-0016`, `-0017`, `-0019`,
`-0020`, `-0021`, `-0028`, `-0032`, `-0034`.

- `TC-0013-0014` — a repository with no `.qfai/specs` at all, one with a spec directory carrying no
  files, and one where git succeeds rather than throws are all untested.
- `TC-0013-0015` — a path containing `_policies` as a substring elsewhere (`docs/_policies-notes.md`),
  a `_policies` path under a non-default `specsDir`, and an empty git output are untested.
- `TC-0013-0016` — `baseBranch:` present but empty, present as a non-string, and a config file absent
  entirely are untested.
- `TC-0013-0017` — a zero-byte evidence file, an evidence file naming a spec that does not exist, and
  a Diff Context heading with an empty body are untested.
- `TC-0013-0019` — the happy-path case supplies one plain ASCII pair. An empty cell, a
  whitespace-only cell and a cell of other punctuation are untested.
- `TC-0013-0020` — a renamed export reached through an aliased import, a re-export through a second
  barrel, and a call inside a disabled branch are all invisible to a substring read of two files.
- `TC-0013-0021` — a zero-byte evidence file, an absent ledger alongside old-format evidence, and a
  spec directory with no `01_Spec.md` are untested.
- `TC-0013-0028` — a `currentId` with a trailing separator, a pack name outside the `discussion-*`
  shape, and a `state.json` carrying unrelated keys are untested.
- `TC-0013-0032` — the artifact the row names, `templates/contracts/ui-spec.yaml`, does not exist, and
  no case observes its absence; the test silently reads a differently named file instead.
- `TC-0013-0034` — an item that is neither string nor map (a number, a nested list), an empty-string
  item, and a structured item whose `acceptance` is the empty string are untested. The mixed list
  adds a shape, not an edge: both of its member kinds are well-formed.

**5f. `Combinatorial`, 8 cells.** Coordinates: `TC-0013-0014`, `-0015`, `-0016`, `-0017`, `-0019`,
`-0020`, `-0025`, `-0028`.

- `TC-0013-0014`, `TC-0013-0017` — `EX-0013-0010` crosses four conditions at once: a modified
  `_policies` file, a configured `baseBranch` of `origin/develop`, a `SpecDiffResult` with all three
  fields populated, and old-style evidence still parsing. No case constructs the pair, let alone the
  four.
- `TC-0013-0015`, `TC-0013-0016` — the policy predicate is never crossed with the configured
  `baseBranch`, which is the one cross `AC-0013-0013` names. Every case that reaches
  `detectSpecChanges` forces git to throw, so the configured base is never used as a diff base.
- `TC-0013-0019` — a single case crosses nothing.
- `TC-0013-0020` — the export half and the import half are asserted in two separate `it` blocks and
  never evaluated together against one planted change. `BR-0013-0011` states that failure of either
  half collapses to the same outcome, and no fixture constructs that collapse.
- `TC-0013-0025` — the template half and the agent-guide half are asserted in two separate `it`
  blocks; nothing requires the guide's instruction and the template's slot to agree, which is the
  row's actual subject.
- `TC-0013-0028` — exactly one pack exists in the fixture and exactly one pointer; nothing is crossed.
  Both covering cases build that same single-pack fixture.

**Group 5 count check.** 21 + 16 + 13 + 12 + 10 + 8 = **80**. No cell of any tested row is `❌` in
`Equivalence partitions`, `Normal path` or `Oracle strength`, so those three columns contribute
nothing to this group.

### Group 6 — the 28 ❌ cells of the business rule scored columns

**`Conditional branches`, 1 cell** — `BR-0013-0019`.

- `BR-0013-0019` — the rule names a band, so it has a direction on each side of it. The over-ceiling
  direction fires and is pinned; the under-floor direction is exercised with the opposite verdict,
  because the validator's lower bound was removed and counts of one and two are now required to stay
  silent. So one branch is covered, the other is covered backwards, and no case distinguishes the
  band the rule states. This cell read `n/a` until it was noticed that an unconditional rule and a
  rule with an unmet branch are not the same thing.

**`Positive case`, 8 cells** — `BR-0013-0004`, `-0005`, `-0006`, `-0007`, `-0008`, `-0012`, `-0013`, `-0014`.

- `BR-0013-0008` — the rule's first bullet, the shipped template's `Type` legend, was credited to an
  assertion in a file written for the `Level` column that carries no spec-0013 annotation, and the
  obligation it covers has an annotated case elsewhere, so the crediting rule does not reach it. The
  rule's second bullet — every AC needing both a normal and a non-normal case — has no case at all.
  With the first credit withdrawn the positive direction is empty rather than partial.

- `BR-0013-0004` (Plan After Slice) and `BR-0013-0005` (Contract Stub Validity) are covered by
  `TC-0013-0011` and `TC-0013-0012`, the two coverage placeholders that have no test of their own
  subject. Nothing grounds a slice before a plan, and nothing parses a contract stub as OpenAPI YAML,
  UI YAML or an SQL skeleton.
- `BR-0013-0006` (Delta Rejected Section) — the covering case asserts the `Delta Rejected Guard`
  heading exists in `SKILL.md`. Neither `DO NOT` nor `Temptation` occurs anywhere in that document,
  so not even the wording the rule requires is pinned.
- `BR-0013-0007` (Batch Mode Stable Mapping) — the covering case asserts `SKILL.md` contains
  `"qfai-sdd"`. No capability order is read, and no `spec-0001..N` assignment is produced.
- `BR-0013-0012`, `-0013`, `-0014` — covered by `TC-0013-0022`, `-0023`, `-0024`, which have no test.

**`Negative case`, 12 cells** — `BR-0013-0001`, `-0002`, `-0004`, `-0005`, `-0006`, `-0007`, `-0008`,
`-0011`, `-0012`, `-0013`, `-0014`, `-0015`.

- `BR-0013-0001` — the negative is an out-of-order execution required to be refused. No stage is run.
- `BR-0013-0002` — the negative is an upper-to-lower reference required to be detected.
  `EX-0013-0002` describes exactly such an artifact, and no case constructs it.
- `BR-0013-0004` — the negative is a plan finalized before any slice is grounded, and the prohibition
  on creating `specs/plan.md`. Neither is exercised, and nothing checks for that path's absence.
- `BR-0013-0005` — the negative is a syntactically invalid stub, or a `none` with no rationale.
  Neither is supplied.
- `BR-0013-0006` — the negative is a rejection missing `DO NOT` or `Temptation`, required to be
  reported. Nothing reads a delta document.
- `BR-0013-0007` — the negative is a reordering of `_policies/03_Capabilities.md` treated as a Change
  Request. Nothing observes an order or a reorder.
- `BR-0013-0008` — the negative is an AC with normal-path-only coverage, required to be reported as
  incomplete. Nothing detects one. This pack's own `06_Test-Cases.md` declares no `Type` on twelve of
  its thirty-five rows (`TC-0013-0001` … `-0012`), which the rule's first bullet forbids outright.
- `BR-0013-0011` — the rule forbids a half-wired validator and names renaming an export without
  updating the import as breakage. No fixture constructs either half-state.
- `BR-0013-0012`, `-0013`, `-0014` — no test of any kind.
- `BR-0013-0015` — the negative is a template with the slot removed or renamed. No such template is
  constructed, so the per-screen assertion's discriminating power is unestablished.

**`Conditional branches`, 7 cells** — `BR-0013-0005`, `-0012`, `-0013`, `-0014`, `-0015`, `-0016`,
`-0018`.

- `BR-0013-0005` — the condition is that `none` is allowed only with no contract impact and a written
  rationale. Neither branch is exercised.
- `BR-0013-0012` — the condition is a missing or unreadable `DESIGN.md` halting Phase 0. No test.
- `BR-0013-0013` — the condition is that `09_delta.md` history annotations are tolerated while active
  rows are not. No test reads either surface, so the branch that distinguishes them is never taken.
- `BR-0013-0014` — the condition is that new design contracts enter only through an explicit slice
  change. No test.
- `BR-0013-0015` — the same shape: removing or renaming the slot must go through an explicit slice
  change. Nothing exercises the branch, and nothing would observe the removal.
- `BR-0013-0016` — the condition is the deprecation-window treatment of pre-existing slot-less UI
  contracts, which the rule requires to be informational rather than blocking. The product emits
  `error` and the covering case pins `error`, so the branch is implemented and tested inverted.
- `BR-0013-0018` — the condition is the severity of `D-SURFACE-TYPE-MISSING`: warning during the
  window, error at close. `validateSurfaceTypeDrift` hard-codes `error` with no window logic at all,
  so there is no branch in the product for a case to take.

## Every ⚠️ cell, named

90 scored depth cells in the matrix and 13 scored cells in the business rule table are `⚠️` —
**105 in all**. The PASS criterion requires a documented rationale for each, so each is named here,
grouped by column with a per-coordinate reason.

### Matrix depth cells (91)

**`Equivalence partitions`, 13 cells** — `US-0013-0003`, `US-0013-0012`, `TC-0013-0003`, `-0014`,
`-0017`, `-0018`, `-0019`, `-0020`, `-0021`, `-0025`, `-0028`, `-0029`, `-0032`.

- `US-0013-0003` — four partitions of the pack input have a representative with a distinct outcome:
  ready, pack absent, blocking OQ present, required markdown missing. Counting the import-lite
  entrypoint adds a fifth, the import-lite source that `AC-0013-0003` names beside the pack, with
  representatives at distinct outcomes. The partition
  `AC-0013-0003` requires — a pack that is incomplete or contradictory and on which SDD **continues**
  — is unrepresented, and the blocking-OQ partition is fixed with the outcome the AC forbids.
- `US-0013-0012` — resolvable, absent-pointer and pointer-to-missing-pack each have a representative
  across two files. Duplicate, which the story names in its own sentence ("missing/duplicate
  ambiguity"), has none.
- `TC-0013-0003` — both partitions of the source input, "no usable source at all" and "a pack that is
  incomplete or contradictory", are named by exact sentences required to be present, with opposite
  stated outcomes. Neither is supplied as an input to anything.
- `TC-0013-0014` — the git-unavailable partition has a representative and produces a real result. The
  git-available partition is never fed to `detectSpecChanges` in this row.
- `TC-0013-0017` — the old-format evidence partition is supplied. The new-format partition is not, so
  nothing shows the parser distinguishes the two rather than ignoring evidence entirely.
- `TC-0013-0018` — four escape-relevant classes have a representative: literal `\`, `|` reached
  through `\|`, the `\`+`|` adjacency, and line breaks. The line-break class is incomplete: the row's
  own text names `\r\n` / `\r` / `\n`, and only the first two are supplied. Bare `\n`, the most
  common member, has no case.
- `TC-0013-0019` — the one plain-ASCII partition has a representative. ASCII carrying other
  punctuation, and non-ASCII text, are unrepresented, though `BR-0013-0009`'s allowed character set is
  defined by exclusion and so admits them.
- `TC-0013-0020` — the wired partition is represented by the real tree. The unwired partitions —
  export removed, import present but call removed — are never constructed.
- `TC-0013-0021` — old-format evidence is supplied. New-format evidence and absent evidence are not
  supplied in this row.
- `TC-0013-0025` — the compliant template is read as it stands. A template without the slot is never
  constructed, so only one partition of the artifact input has a representative.
- `TC-0013-0028` — the resolvable partition has a representative and the exact path is asserted. The
  fixture creates exactly one pack directory, so the partition does not discriminate: a helper that
  ignored `currentId` and returned the only `discussion-*` directory passes it unchanged.
- `TC-0013-0029` — two of the three failure partitions the row names have a case, absent and missing.
  **Duplicate has none**, though `AC-0013-0021` and `BR-0013-0017` both name it explicitly.
- `TC-0013-0032` — the warning half has one real input, a nine-task screen that produces a live
  `QFAI-AUD-020`. The documentation half reads two shipped files as they stand, so its compliant and
  violating partitions are unrepresented.

**`Normal path`, 5 cells** — `TC-0013-0001`, `-0005`, `-0006`, `-0007`, `-0032`.

- `TC-0013-0001` — `/phase order/i` pins the concept and the five phase names are each required to be
  present, so a document that lost the vocabulary reddens. The property the row names, the order, is
  pinned by nothing.
- `TC-0013-0005` — `/slice.*plan/i`, the first branch of the alternation, encodes the ordering as text
  adjacency on one line, which addresses the row's direction. The alternation's second branch removes
  the adjacency requirement, so the assertion passes without it.
- `TC-0013-0006` — `/lower-to-upper/` pins the permitted direction, which is half the rule. The
  forbidden direction is not named in any assertion, and `SKILL.md` does state both on one line.
- `TC-0013-0007` — the exact command literal `qfai validate --profile sdd --fail-on error` is pinned,
  which is a real wording oracle. It is `⚠️` because the row's direction is that the command
  *produces* `error = 0`, and no run is made; and because the pinned literal carries `--profile sdd`,
  which the row's own text does not.
- `TC-0013-0032` — all three assertions pass and pin `at most 7` in three places, one of them the live
  warning message. It is `⚠️` because the property the row declares is the **band 3..7**, which
  appears in none of the three artifacts and in no assertion; what is pinned is a ceiling with no
  floor, in a file the row does not name.

**`Error path`, 3 cells** — `TC-0013-0003`, `-0014`, `-0021`.

- `TC-0013-0003` — the stop direction is pinned as an exact sentence
  (`"Stop only when there is no usable source at all"`), which is the right shape for a documentation
  obligation. No pack is fed to `sddPreflight.ts` and no stop is produced under this row.
- `TC-0013-0014` — the git-unavailable path is driven for real and the code falls back rather than
  throwing, which is a genuine error path. It is `⚠️` because the fallback's own result is not pinned:
  `fullScan: expect.any(Boolean)` is satisfied by `true` and by `false` alike, so the fallback could
  stop falling back and the case stays green.
- `TC-0013-0021` — the row's direction is that no error is raised, and that is asserted over a whole
  result set. The discriminating control — an input that *must* produce `QFAI-TRACE-001` — exists in
  the same file under `TDD-0011` and belongs to a different obligation. No case plants an
  evidence-format fault and requires a report.

**`Edge cases`, 13 cells** — `US-0013-0003`, `-0008`, `-0011`, `-0012`, `-0013`, `-0014`,
`TC-0013-0025`, `-0026`, `-0027`, `-0029`, `-0030`, `-0031`, `-0033`.

- `US-0013-0003`, `US-0013-0008` — real edges are covered in `sddPreflight.test.ts`: a pack directory
  present only under a non-canonical name, reported with the naming detail; a deferred OQ with no
  entry in `13_Deferred.md`; unscoped disposition guidance lines in the OQ register that must be
  ignored; and a Mermaid blocker required **not** to be reported twice for an absent Story Workshop.
  Untested on both: an empty pack directory, a required name present as a directory, a zero-byte
  required file, and an unreadable `discussion-*` pack directory — the discussion root being
  unreadable is supplied, the pack directory is not.
- `US-0013-0011`, `TC-0013-0025` — one edge is guarded deliberately:
  `expect((parsed.screens ?? []).length).toBeGreaterThan(0)` stops an empty `screens` list passing the
  per-screen loop vacuously. No other edge is identified: a `primary_tasks` that is `null` or a
  string, or a `screens` entry that is not a map, is never supplied.
- `TC-0013-0026`, `TC-0013-0027` — one edge has its own case and its own expectation: the key-absent
  legacy contract. Untested on both rows: a contract with no `screens` key, an empty `screens: []`,
  two screens where only one is empty, and `primary_tasks: null` rather than `[]`.
- `US-0013-0012`, `TC-0013-0029` — the three-candidate fixture is a real non-trivial edge and all three
  names are required in the message. Untested: zero candidates, exactly one candidate, and a
  `.qfai/discussion` directory that does not exist at all.
- `US-0013-0013`, `TC-0013-0030` — the idempotency edge is covered and covered well: a second run must
  return `changed: false`, the file must be byte-identical, and the key must occur exactly once.
  Untested: a spec with no frontmatter fence, a frontmatter already carrying `surface_type: cli-only`,
  and a companion whose filename does not match the `<spec>-*` shape.
- `TC-0013-0031` — one edge has a case: a frontmatter already declaring the key must produce no
  finding. Untested: a spec numbered `0000`, which the validator skips explicitly; an empty
  `01_Spec.md`, which it also skips; and `surface_type: ui-bearing` written outside the frontmatter
  block, which suppresses the finding because the validator's regular expression is applied to the
  whole document (see Findings 9).
- `US-0013-0014`, `TC-0013-0033` — the count-1 case is a deliberate edge and the test's own comment
  explains why it is there; the e2e adds a two-task screen required to produce no count finding while
  a shape finding fires. Untested: count 0, where nothing establishes whether `QFAI-AUD-001` fires
  instead of `QFAI-AUD-020` or alongside it; a screen with no `primary_tasks` key; and two screens
  where only one is over the ceiling.

**`Boundary values`, 11 cells** — `US-0013-0003`, `-0008`, `-0011`, `-0013`, `-0014`,
`TC-0013-0017`, `-0021`, `-0027`, `-0030`, `-0033`, `-0035`.

- `US-0013-0003`, `US-0013-0008` — the required-file count is exercised at its two adjacent values:
  a complete pack is `ready`, and a pack with one required markdown file removed reports the
  missing-file blocker. That is the boundary that matters. Two gaps keep both off `✅`: a sixteenth
  file is never supplied, and both preflight suites declare their own literal list of required names
  rather than importing the source constant, so a requirement **removed** from the source stays invisible.
- `US-0013-0011`, `TC-0013-0027` — the 0-versus-1 `primary_tasks` boundary is exercised in both
  directions. Nothing sits at the ceiling, the e2e asserts `not.toBe(0)` rather than a specific exit
  code, and the deprecation-window boundary is pinned only as the literal `1.10.0` inside a message
  string, with no case on either side of that version.
- `TC-0013-0017`, `TC-0013-0021` — the old-format side of the forward-compatibility boundary is
  supplied on both rows and is the side that matters. The new-format side is supplied on neither, so
  nothing establishes that the tolerance is a tolerance rather than an unconditional skip.
- `US-0013-0013`, `TC-0013-0030` — the companion-count boundary is exercised at 0 and at 1, in both
  directions, which is the boundary the rule turns on. Two or more companions for one spec is never
  supplied, and the deprecation-window boundary has no case.
- `US-0013-0014`, `TC-0013-0033` — the ceiling is exercised on both sides at exactly 7 and 8, which is
  the best boundary work in the pack. Both are `⚠️` because the **floor the obligation declares is
  exercised with the opposite verdict**: counts 1 and 2 are required to be silent and the obligation
  requires them to warn.
- `TC-0013-0035` — two of the three required fields have a missing-field case (`acceptance`, `id`).
  `label` has none, and neither does an item with zero keys or an item carrying two extra keys.

**`Special values`, 8 cells** — `US-0013-0003`, `US-0013-0014`, `TC-0013-0016`, `-0018`, `-0026`,
`-0027`, `-0033`, `-0035`.

- `US-0013-0003` — malformed, scalar, null and legacy-only `prototyping.yaml`, plus absent, are each
  supplied and each required not to block. That is five special shapes of one artifact, and counting
  the import-lite entrypoint supplies a sixth: a required markdown file present but below the
  minimum-content threshold, seeded as a five-character `06_REQ.md`. It is `⚠️` rather than `✅`
  because that case's only oracle is that the pack comes back `blocked`, which the fourteen absent
  files already produce — so nothing in it shows the minimum-content check fired at all.
- `US-0013-0014` — count 1, a two-task screen, and an all-malformed list whose parsed result is empty
  are all supplied. No `null` item, no empty map, no non-string field.
- `TC-0013-0016` — the omitted-key case is a genuine special value: `baseBranch` absent must yield
  `undefined` rather than a throw or an injected default, and that is pinned exactly. Not supplied: an
  empty string value, a `null`, a non-string, and an absent config file.
- `TC-0013-0018` — `path\\|file` is a real special adjacency, chosen so that "two literal backslashes
  then a pipe" cannot be confused with an escape sequence. Not supplied: a cell that is exactly `\`,
  exactly `|`, or empty.
- `TC-0013-0026`, `TC-0013-0027` — the key-absent contract is a genuine special value with its own
  case and its own severity expectation, distinct from key-present-but-empty. Not supplied:
  `primary_tasks: null`, `primary_tasks: ""`, a `screens` entry that is a string, a zero-byte
  contract, and a file that is not YAML.
- `TC-0013-0033` — count 1 is supplied deliberately and is the shape the ceiling exists to protect.
  Not supplied: `primary_tasks: []`, a non-list value, and a list containing `null`.
- `TC-0013-0035` — the all-entries-malformed fixture is a strong special input: `extractPrimaryTasks`
  records shape findings while the parsed list ends up empty, and the case requires the `QFAI-AUD-021`
  detail to survive alongside the `QFAI-AUD-001` empty signal. Not supplied: `null`, an empty map, a
  field present but empty, and a field present but not a string.

**`State transitions`, 2 cells** — `US-0013-0003`, `US-0013-0008`.

Both are `⚠️` for the same reason and it is worth stating precisely, because they are two of the four
cells above `❌` in this column across the whole pack. `sddPreflight.test.ts` does exercise a genuine
multi-step process with five cases: a summary written into a run-scoped directory and mirrored to the
latest pointer, an earlier run's summary still readable after a later preflight, an older run not
overwriting a newer run's pointer, the pointer's own run id read when the newer directory is gone, and
the pointer still refreshed when this run is the newest. That is real state-transition work. It is
over the **summary artifact**, not over the pack-readiness verdict the two stories name: the
incomplete-to-ready progression each story exists to gate has no case, and no invalid transition is
attempted or rejected.

**`Combinatorial`, 17 cells** — `US-0013-0003`, `-0008`, `-0011`, `-0012`, `-0013`, `-0014`,
`TC-0013-0018`, `-0021`, `-0026`, `-0027`, `-0029`, `-0030`, `-0031`, `-0032`, `-0033`, `-0034`,
`-0035`.

- `US-0013-0003`, `US-0013-0008` — two crosses are deliberate: a missing required file crossed with
  the Story Workshop Mermaid check, with the second required **not** to fire so that one defect is not
  reported under two headings; and a contradictory non-ui classification crossed with an absent
  `prototyping.yaml`. Not crossed: a blocking OQ with a missing file, a deferred OQ with a naming
  fault, or a malformed side artifact with missing required markdown.
- `US-0013-0011`, `TC-0013-0026`, `TC-0013-0027` — the e2e crosses the lane with the full
  `runValidate` pipeline and a real config file and requires the process exit code as well as the
  finding, which is the cross the story is about. Not crossed: an empty `primary_tasks` together with
  a shape fault, together with an over-ceiling count on a second screen, or with
  `uiux.audit.enabled: false` — nothing establishes the lane is gated by the config it is handed. The
  template is parsed in the same file and never fed to validate.
- `US-0013-0012`, `TC-0013-0029` — the missing-pack case crosses a present `currentId` with a
  non-matching candidate on disk, which is a real pair and the sharper of the two failure modes. Not
  crossed: a duplicate with an absent pointer, or a valid pointer with an unreadable pack directory.
- `US-0013-0013`, `TC-0013-0030`, `TC-0013-0031` — companion presence against frontmatter presence is
  a two-by-two grid and three of its four cells have a case. `TC-0013-0031` adds a second cross: two
  specs in one fixture, one with a UI companion and one without, with the finding required to name the
  first and to be absent for the second. That establishes the finding names the right spec among
  several, which a single-spec fixture cannot. The grid's fourth cell — no companion, key already
  present, which must be left alone and must emit nothing — still has no case, and `TC-0013-0030`
  crosses nothing beyond the grid.
- `TC-0013-0018` — two crosses are constructed on purpose: `a\|b` and `path\\|file` each cross a
  literal backslash with a pipe at a different adjacency, and every case populates two cells of the
  row at once. Not crossed: a line break with a pipe, a line break with a backslash, and more than two
  populated cells in a seven-column row.
- `TC-0013-0021` — the fixture is genuinely dense: a layered spec, old-format evidence, a present
  ledger, and a git diff naming both the spec and its implementation, all required to yield zero
  errors together. Not crossed: old-format evidence with a *missing* ledger, or with an implementation
  absent from the diff, where a finding must still fire and the tolerance must not suppress it.
- `US-0013-0014`, `TC-0013-0032`, `TC-0013-0033`, `TC-0013-0035` — three crosses are constructed and
  one is unusual and valuable: the shipped `ui-contract.sample.yaml` is copied verbatim into a
  workspace and required to emit neither `QFAI-AUD-020` nor `QFAI-AUD-021`, so the document that
  teaches the rule is run against the validator that enforces it; a valid item sits beside a faulty
  one in the same list; and the e2e crosses a two-task count with a shape fault, requiring the count
  finding to be absent while the shape finding fires. Not crossed on any of the four: an over-ceiling
  count with a shape fault, a missing field with an extra key on the same item, the guide's wording
  with the warning's wording, and any of them with `uiux.audit.enabled: false`.
- `TC-0013-0034` — the cross the row's own example names is constructed: one list carrying a legacy
  string item and two complete structured items together, required to emit neither `QFAI-AUD-021` nor
  `QFAI-AUD-020`. That is the shape `EX-0013-0020` writes out, and it discriminates a validator that
  handles each item kind only when the list is uniform. It stays `⚠️` because `EX-0013-0020` puts a
  third kind in that same list — an item missing `acceptance` — and no case anywhere mixes an accepted
  and a rejected shape in one list. The mixed list is also never crossed with an over-ceiling count or
  with `uiux.audit.enabled: false`.

**`Oracle strength`, 18 cells** — `US-0013-0003`, `-0008`, `-0011`, `-0013`, `TC-0013-0003`, `-0007`,
`-0014`, `-0017`, `-0019`, `-0020`, `-0021`, `-0025`, `-0027`, `-0028`, `-0030`, `-0031`, `-0032`,
`-0034`.

- `US-0013-0003`, `US-0013-0008` — blockers are asserted by content (`OQ-0009`, the missing-file
  blocker text `sddPreflight.ts` builds,
  `Blocking OQ`) and the summary file is read back and checked, which is a real oracle that a
  one-line change to the emission reddens. Three things cap both. The positive case asserts
  `blockers` is empty, which certifies "nothing blocks" rather than "this check passed". The
  missing-file assertion matches only that message's fixed prefix and never the file removed, while
  the emission joins the missing names into it. And one case pairs its runtime verdict with an
  assertion on the shipped Stage 0 playbook's wording, so half of what it proves is that two
  documents agree with the code rather than that the code behaves.
- `US-0013-0011` — **the two directions are not equally supported, and this is the clearest instance
  in the pack.** A mutation that removes the empty-`primary_tasks` check reddens the refusal case in
  three ways at once: the exit code, the `QFAI-AUD-001` match and the `order_create` match. The
  acceptance case asserts that a filtered list of stdout lines is empty, and that same mutation leaves
  it empty too, so no named production mutation kills it. The filter additionally requires each line
  to start with `[error]`, so any change to the output prefix empties it silently. The refusal
  direction has an oracle; the acceptance direction does not.
- `US-0013-0013` — the populator's oracle is strong. The validator's severity assertion is the literal
  `"error"` under a comment claiming it is version-computed, the story's clause about
  `resolveAllUiBearingSpecs()` is asserted by no case in either covering file, and the story's first
  clause — `/qfai-sdd` setting the frontmatter — has no caller in `src/**` for any mutation to reach.
- `TC-0013-0003` — three exact sentences are required to be present, including
  `"Do NOT edit, repair or re-run a pack"`. These are strong wording pins: deleting or rewording any
  of them reddens. They certify no behaviour, and `sddPreflight.ts` is driven by nothing under this
  row.
- `TC-0013-0007` — an exact command literal is pinned, so renaming a flag reddens. No run is made, so
  no error count is ever observed.
- `TC-0013-0014` — `objectContaining` with `expect.any(Array)` and `expect.any(Boolean)` certifies
  presence and type, which is what the row's own title asks for. Values are unconstrained:
  `entries: []` and `fullScan: false` both pass. The one value assertion,
  `allSpecs).toContain("spec-0001")`, is real.
- `TC-0013-0017` — the real oracle is implicit and genuine: the `await` does not throw, and a parser
  regression that threw would redden the case. The two explicit assertions are weak —
  `toBeDefined()` cannot fail for a non-throwing call returning an object, and
  `entries.length).toBeGreaterThanOrEqual(0)` is true of every array.
- `TC-0013-0019` — `toBe` on both recovered cells is exact, and that is the whole of its strength.
  The input contains no `|`, no `\` and no line break, so **no mutation of the escape or un-escape
  path can redden it**: deleting `escapeTableCell`'s body and returning its argument verbatim leaves
  this case green. It fails only if the renderer or the parser breaks the row's column structure,
  which is a different obligation. The acceptance case has no named production mutation in its own
  subject; the mutations that exist all kill `TC-0013-0018`'s cases instead.
- `TC-0013-0020` — `typeof validatorIndex.validateTraceabilityIntegrity === "function"` is a real
  oracle over a real import; removing the barrel export reddens it. The source-text half asserts the
  full call expression `"await validateTraceabilityIntegrity(root, config)"` rather than the bare
  name, so the import alone does not satisfy it, which is stronger than a name-presence check. It
  remains a substring over source and cannot tell a live call from dead code, which is exactly the
  clause `EX-0013-0011` names.
- `TC-0013-0021` — `issues.filter((i) => i.severity === "error")).toEqual([])` is a whole-result check
  and would catch any new error. It cannot distinguish "tolerated the old format" from "returned
  nothing at all": a validator mutated to return `[]` unconditionally stays green on this case, and
  the sibling cases that would catch that belong to other obligations.
- `TC-0013-0025` — the per-screen loop over a real YAML parse is a real oracle: removing the slot from
  any one screen reddens it. The guide assertion is a permissive alternation over prose, and nothing
  pins the `[]` literal the row actually names.
- `TC-0013-0027` — `expect(audit001Errors).toEqual([])` is a whole-set check and strong. The same
  asymmetry as `US-0013-0011` applies: the mutation that reddens the row's refusal sub-cases leaves
  its acceptance case green. `toMatch(/1\.10\.0/)` pins a version literal inside a message, which is a
  documentation pin rather than a behaviour pin.
- `TC-0013-0028` — `expect(resolved).toBe(expected)` pins the exact absolute path, which is precise.
  With exactly one pack on disk it does not discriminate: an implementation that ignored `currentId`
  entirely and returned the sole `discussion-*` directory passes. The strongest guard the pair has
  against that is a source grep in the sibling row, not a behavioural discriminator.
- `TC-0013-0030` — `changed` is pinned in both directions, the written key is matched, and the
  idempotency case pins byte equality plus an exact occurrence count of one. That is strong for the
  helper. It is `⚠️` because the row's obligation is about `/qfai-sdd`, and the helper has no caller
  anywhere in `src/**`, so no mutation to any driver could redden this row.
- `TC-0013-0031` — the finding code, the severity and two message contents (`0090`, `surface_type`)
  are all pinned, and deleting the validator reddens the case. It is `⚠️` because the severity
  assertion is the literal `"error"` while the case's own comment beside it says the value is
  "Version-computed, not a literal" and explains that comparing against `deprecationSeverity` is what
  would hold on both sides of the sunset. The comment describes an assertion the file does not
  contain.
- `TC-0013-0032` — the warning assertion is a real oracle: the message is built from
  `PRIMARY_TASKS_MAX_LABEL`, which is derived from `PRIMARY_TASKS_MAX`, so changing the constant
  reddens it. The two documentation assertions are `toMatch(/at most 7/)` over prose with no tie to
  that constant, so a ceiling change reddens one assertion and leaves two documents silently wrong.
- `TC-0013-0034` — three finding codes are required absent, which is a whole-lane check and would
  catch a regression that started rejecting any accepted shape. Absence assertions over hand-written
  fixtures cannot establish that the shape checker ran at all: a mutation making `extractPrimaryTasks`
  return no findings for every input keeps all three cases green, and the discriminating evidence
  lives in `TC-0013-0035`. The mixed-list case widens the input and inherits the same limit.

**Depth `⚠️` count check.** 13 + 6 + 3 + 13 + 11 + 8 + 2 + 17 + 18 = **91**.

### Business rule table (14)

**`Positive case`, 5 cells** — `BR-0013-0001`, `-0002`, `-0003`, `-0018`, `-0019`.

- `BR-0013-0001` — the shipped `SKILL.md` does state the fixed order, and the covering wording checks
  require the phrase "phase order" and each phase name, so a document that lost the vocabulary
  reddens. No run observes a phase sequence and no assertion pins an order.
- `BR-0013-0002` — `/lower-to-upper/` pins the permitted direction in shipped guidance. No artifact is
  evaluated and found compliant.
- `BR-0013-0003` — the stop condition is pinned as an exact sentence under `TC-0013-0003`, and
  `runSddPreflight` genuinely returns `ready` for a complete pack under `US-0013-0003`. It is `⚠️`
  because the rule's own positive is that SDD **continues** on an incomplete or contradictory pack,
  and no case supplies one and requires the run to proceed.
- `BR-0013-0018` — the helper and the validator are both exercised against real fixtures with real
  assertions. The rule's first clause is that `/qfai-sdd` MUST set the frontmatter, and
  `populateSurfaceTypeIfUiCompanion` has no caller in `src/**` and no instruction in the skill, so the
  clause's subject is a library function nothing calls.
- `BR-0013-0019` — a ceiling is documented in two artifacts and named in the live warning, and the
  warning assertion is derived from the SUT's own constant. The rule states a *band*, which is
  documented nowhere, and names `templates/contracts/ui-spec.yaml` as one of its two documentation
  surfaces, which does not exist.

**`Negative case`, 3 cells** — `BR-0013-0003`, `-0010`, `-0019`.

- `BR-0013-0003` — the negative direction is genuinely present in shape and is the sharper half of the
  rule: two exact sentences require that an incomplete or contradictory pack does not stop the stage
  and that the pack is not to be edited to make the gate pass. Both are wording assertions. The one
  place the runtime is driven, `sddPreflight.test.ts`, blocks on a blocking OQ, which is the outcome
  the rule forbids — so the negative direction is asserted in prose and contradicted in code. See
  Findings 8.
- `BR-0013-0010` — the `false` direction of `detectPolicyChanges` and the `undefined` result of an
  omitted `baseBranch` are both exercised with exact assertions. The rule's own negative —
  configuration MUST NOT block discovery when absent — is approximated by a config read rather than by
  a discovery run with no configured base.
- `BR-0013-0019` — the over-ceiling direction fires and is pinned. The under-floor direction the rule
  states is exercised with the opposite verdict: counts 1 and 2 are required to stay silent.

**`Conditional branches`, 5 cells** — `BR-0013-0002`, `-0003`, `-0010`, `-0017`, `-0020`.

- `BR-0013-0002` — the rule distinguishes two reference directions with opposite verdicts. Both are
  named on the one line the assertion matches, and neither is evaluated against an artifact.
- `BR-0013-0003` — both branches, "no usable source" and "merely incomplete", have an exact-sentence
  assertion, and the runtime branch that produces `blocked` has four cases. The branch the rule
  actually turns on — an incomplete pack on which the stage must continue — is constructed by nothing.
- `BR-0013-0010` — the present-versus-absent branch of `baseBranch` has both sides with opposite
  expectations. The branch that matters downstream, the configured base actually used as the diff
  base, is exercised by nothing: every case reaching `detectSpecChanges` forces git to throw.
- `BR-0013-0017` — the rule branches on absent, missing and duplicate. Absent and missing each have a
  case with a distinct fixture and a pinned message, in two files. Duplicate has none.
- `BR-0013-0020` — the rule is conditioned on the deprecation window, and the in-window branch is
  exercised thoroughly on all three accepted shapes: string-only, structured, and the two mixed in one
  list. The window's other side has no case, and nothing in the product or the tests states what
  closes it.

## Findings

Nine things were found while producing this matrix that the reviewing stage should act on. None of
them is repaired here; this artifact scores coverage and does not edit tests, ledgers or specs.

1. **The `primary_tasks` count band in this pack is stale, and the pack states it in nine places.**
   The validator's lower bound was removed. `designAudit.ts` declares `PRIMARY_TASKS_MAX = 7` with no
   companion minimum; the shipped template comment reads "There is no lower bound: a screen that does
   one thing lists one task"; `references/ui-contract-guide.md` reads "Recommended ceiling: at most 7"
   and states "no lower bound"; and `primaryTasksBand.test.ts` asserts "above 7 warns; 1 through 7 do
   not", with a case named `count == 1 emits nothing`. The specification still declares a band of
   `3..7` in `01_Spec.md` REQ-0164 (twice), `02_User-stories.md` US-0013-0014,
   `03_Acceptance-Criteria.md` AC-0013-0024, `04_Business-Rules.md` BR-0013-0019, `05_Examples.md`
   EX-0013-0019, `06_Test-Cases.md` TC-0013-0032 and TC-0013-0033, `07_Decisions.md` DR-0013-0003,
   `08_Open-questions.md` OQ-0158 and `10_Plan.md`. The implementation, the tests, the skill documents
   and the templates were all updated together; the spec pack was not. `TC-0013-0033` and its test fix
   opposite outcomes for counts 1 and 2. The spec is the stale side and needs a Change Request; the
   tests do not need changing.
2. **`D-SURFACE-TYPE-MISSING` is emitted at `error` and specified at `warning`.**
   `validateSurfaceTypeDrift` sets `const severity = "error" as const` with no deprecation-window
   logic. `AC-0013-0023`, `BR-0013-0018`, `TC-0013-0031` and `US-0013-0013` all require `warning`
   during the window, sunsetting to `error` at window close. All three covering cases pin `error`, and
   the comment beside each describes a version-computed comparison the files do not perform — it says
   "Comparing against `deprecationSeverity` breaks if the validator hard-codes again", beside a
   hard-coded literal, in `surfaceTypePopulate.test.ts`, `spec0013ActivePointerSurfaceType.test.ts`
   and `spec0013ActivePointerSurfaceTypeE2E.test.ts`. No identifier named `deprecationSeverity` exists
   anywhere in `packages/qfai/src/**`. Either the window closed and four spec layers are stale, or the
   escalation happened early. The comments should be corrected in either case.
3. **`TC-0013-0027` and `BR-0013-0016` specify slot-less UI contracts as non-blocking; the product
   blocks them.** Both state that pre-existing contracts predating the slot are "informational rather
   than blocking" under deprecation-window semantics. The covering case is named "legacy slot-less
   contracts emit QFAI-AUD-001 at severity=error (past sunset)" and asserts that no `info`-severity
   finding is produced. The test file's own header comment still describes the old behaviour
   ("slot-absent (legacy) UI contracts -> QFAI-AUD-001 at severity=info"), contradicting the case
   further down the same file.
4. **Two case names describe coverage the case does not have.**
   - `primaryTasksStructured.test.ts` has a case named
     `string-only items pass (legacy shape, three string entries — within band)`. Its behaviour does
     not depend on a band; only the name is stale. A reader scanning for the band's remaining
     enforcement finds it here first.
   - `spec0013ActivePointerSurfaceType.test.ts` names its `TC-0013-0033` case
     `boundary: count 8 warns; 2, 3 and 7 do not` and supplies counts 2, 3 and 8 only. Count 7, the
     ceiling itself and the sharper half of the boundary, is named in the title and absent from the
     body. It is covered in `primaryTasksBand.test.ts`, so the obligation is not uncovered; the name
     is what overstates. A reader auditing the ceiling from case names alone would record 7 as
     exercised twice and would not notice if the sibling file dropped it.
5. **Three obligations name artifacts or fields the product does not have.**
   - `TC-0013-0025`, `BR-0013-0015` and `EX-0013-0015` require every `screens[]` entry in the shipped
     template to carry a literal `primary_tasks: []`. The template ships two structured entries per
     screen, deliberately: an empty slot would fail the `QFAI-AUD-001` lane the same pack mandates,
     and `primaryTasksBand.test.ts` separately requires that sample's `primaryTasks.length` to exceed
     zero. The requirement is self-contradictory as written.
   - `TC-0013-0022`, `US-0013-0009`, `BR-0013-0012` and `EX-0013-0012` require the lock file to carry
     `sha256` and `lockedAt`. The shipped `qfai-sdd/SKILL.md` instructs Phase 0 to write
     `designMdPath`, `designMdSha256`, `frozenAt` and `schemaTokens`, and `readDesignMdLockSha` reads
     `designMdSha256`. Neither `sha256` as a bare key nor `lockedAt` exists anywhere in the product.
   - `TC-0013-0032`, `BR-0013-0019`, `AC-0013-0024`, `EX-0013-0019`, `US-0013-0014`, REQ-0164 and
     `10_Plan.md` name `templates/contracts/ui-spec.yaml`. No file of that name exists under
     `packages/qfai/assets/**`.
6. **Six of the twenty-seven runnable ledger selectors do not resolve.** Twenty-seven of the thirty
   rows name a test file; the three `todo` rows carry `—` there, so no selector can be run against
   them. Each of the twenty-seven was checked by running vitest with the selector as `-t`; six match
   zero cases.

   | Row        | Status    | Selector quotes                                                          | The describe is named                                                              |
   | ---------- | --------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
   | `TDD-0011` | exception | `TC-0013-0011: Coverage Placeholder for EX-0013-0006`                    | `TC-0013-0011: spec BR changed + impl changed → PASS`                              |
   | `TDD-0012` | exception | `TC-0013-0012: Coverage Placeholder for EX-0013-0007`                    | `TC-0013-0012: missing traceability ledger → QFAI-TRACE-002 warning`               |
   | `TDD-0013` | exception | `TC-0013-0013: Test Case Type Column Presence`                           | `TC-0013-0013: --full flag bypasses diff detection`                                |
   | `TDD-0022` | done      | `US-0013-0011: UI contract primary_tasks slot per screen + validate lane` | `US-0013-0011: UI contract primary_tasks slot + QFAI-AUD-001 aligned validate lane` |
   | `TDD-0027` | done      | `primary_tasks band documented + named in warning`                       | `TC-0013-0032: the primary_tasks ceiling is documented and named in the warning`    |
   | `TDD-0028` | done      | `primary_tasks count below 3 / above 7 warns (boundary)`                 | `TC-0013-0033: primary_tasks above 7 warns; 1 through 7 do not`                     |

   The three `exception` rows quote the spec's test-case title over a describe about a different
   behaviour, which is the same defect as Group 3 above. `TDD-0022` quotes a describe name that was
   later reworded; its test does discharge `US-0013-0011` and only the selector string is stale.
   `TDD-0027` and `TDD-0028` are the ledger half of Finding 1: the band change reworded both describes
   and left the ledger behind. A `done` over a selector that cannot be run records a completion nobody
   can re-execute.
7. **Five business rules point at an acceptance criterion about a different subject.** `AC-Refs` on
   `BR-0013-0002` … `BR-0013-0007` appear to have been written when the AC numbering was different:

   | Rule           | Its subject               | `AC-Refs` points at                | The AC that states its subject |
   | -------------- | ------------------------- | ---------------------------------- | ------------------------------ |
   | `BR-0013-0002` | upper-to-lower forbidden  | AC-0013-0002 (Contract Index)      | AC-0013-0006                   |
   | `BR-0013-0004` | plan after slice          | AC-0013-0004 (Slice Gate)          | AC-0013-0005                   |
   | `BR-0013-0005` | contract stub validity    | AC-0013-0005 (Plan After Slice)    | none exists                    |
   | `BR-0013-0006` | delta rejected sections   | AC-0013-0006 (Reference Direction) | AC-0013-0009                   |
   | `BR-0013-0007` | batch mode stable mapping | AC-0013-0007 (Validate Gate)       | none exists                    |

   `BR-0013-0005` and `BR-0013-0007` name a subject no AC states at all. The `EX-Ref` → `BR-Ref`
   route is coherent for all twenty rules, which is why this matrix uses it. Separately,
   `03_Acceptance-Criteria.md` declares **three duplicate AC ids**: `AC-0013-0008`, `AC-0013-0009` and
   `AC-0013-0010` each appear twice under different headings. Any consumer resolving an `AC-Ref` by id
   gets whichever one it reaches first.
8. **`US-0013-0003` and `AC-0013-0003` require opposite behaviour, and the runtime implements the
   story.** The story reads "I want SDD to validate the latest discussion pack and **stop if
   incomplete or has blocking OQs**". Its acceptance criterion reads "SDD MUST NOT stop on a pack that
   is merely incomplete, contradictory, or carrying a blocking OQ", and `BR-0013-0003` repeats it.
   `runSddPreflight` returns `status: "blocked"` with an `OQ-0009` blocker for a pack carrying one
   open, sdd-gated OQ, and `sddPreflight.test.ts` pins that. Meanwhile `TC-0013-0003` asserts that
   `SKILL.md` states the criterion's wording verbatim. The story, the runtime and the skill guidance
   do not agree, and the pack contains both halves of the contradiction.
9. **Two regular expressions match the frontmatter key anywhere in the document, and they are loose
   in the same direction.** `validateSurfaceTypeDrift`'s `SURFACE_TYPE_FRONTMATTER_RE` is
   `/^\s*surface_type\s*:\s*ui-bearing\s*$/im`, and `resolveAllUiBearingSpecs()`'s
   `UI_BEARING_MARKER_RE` is the unanchored `/surface_type:\s*ui-bearing/im`. Both are tested against
   the whole of `01_Spec.md` rather than its frontmatter block.

   A spec that mentions `surface_type: ui-bearing` in prose, in a fenced example or in a migration
   note therefore suppresses the drift finding **and** is accepted as UI-bearing by the resolver the
   same spec layer calls the strict signal. Tightening one without the other leaves the false
   positive in place. No case in the pack supplies such a document.

Two smaller observations that belong with the above but do not need their own numbered entry. First,
`06_Test-Cases.md` declares no `Type` on twelve of its thirty-five rows (`TC-0013-0001` …
`TC-0013-0012`), which `BR-0013-0008`'s own first bullet forbids; the pack breaks the rule it
introduces. Second, no `Level` is declared on twenty-four of the thirty-five rows (`TC-0013-0001` …
`TC-0013-0024`), so layer ownership for two thirds of this pack is settled by the default routing
rather than by the spec.

## Follow-up this matrix does not discharge

`QFAI-ATDD-133` requires the stage evidence to carry a `## Coverage Depth Matrix` section that links
to this file and restates the counted totals beside it. Those totals are:

**✅ 76 / ⚠️ 103 / ❌ 315**, with `n/a 7`, across all 501 scored cells — 441 matrix depth cells and
60 business rule scored cells. `Status` is a row verdict, not a mark, and is excluded from all four
counts.

Seven obligations in this pack cannot be moved by testing alone. `US-0013-0009`, `TC-0013-0022`,
`-0023` and `-0024` name artifacts and fields the product does not carry and have never had a test.
`TC-0013-0032`, `TC-0013-0033` and `TC-0013-0027` declare behaviour the product deliberately changed,
and their tests already fix the current behaviour correctly. All seven need the spec reconciled with
the code through a Change Request before any test can raise their scores. `US-0013-0003` needs its own
acceptance criterion reconciled with it before either can be scored honestly at all. Until those are
settled, the honest verdict for all of them is the one recorded above.
